// backend/controllers/parkingController.js
// ============================================================
// MAIN BUSINESS LOGIC for the Smart Parking System
// ============================================================
// This file uses:
//   - Queue (DSA) → manage waiting vehicles
//   - Stack (DSA) → track recent activity
//   - Array linear scan → find first available slot
//   - SSE (Server-Sent Events) → real-time notifications
// ============================================================

const ParkingSlot = require("../models/ParkingSlot");
const Vehicle = require("../models/Vehicle");
const ParkingHistory = require("../models/ParkingHistory");
const SavedParkingLocation = require("../models/SavedParkingLocation");
const NotificationPreference = require("../models/NotificationPreference");
const SlotWaiter = require("../models/SlotWaiter");
const { waitingQueue } = require("../dsa/Queue");
const { activityStack } = require("../dsa/Stack");
const sseManager = require("../sse/sseManager");

let webPush;
try {
  webPush = require("web-push");
} catch (err) {
  webPush = null;
}

const getSlotLocation = (slotId) => ({
  level: "Level 1",
  zone: `Zone ${slotId.charAt(0)}`,
});

const sendSlotNotifications = async (slot) => {
  const waiters = await SlotWaiter.find({ slotId: slot.slotId, notified: false });
  const location = getSlotLocation(slot.slotId);

  for (const waiter of waiters) {
    const preferences = await NotificationPreference.findOne({ sessionId: waiter.sessionId });
    if (!preferences || preferences.availabilityEnabled) {
      const notification = {
        type: "SLOT_AVAILABLE",
        title: "Parking Slot Available",
        message: `Slot ${slot.slotId} is now available.`,
        slotId: slot.slotId,
        ...location,
        createdAt: new Date().toISOString(),
      };

      // ── Persist notification for fallback REST polling ──
      const savedPreferences = await NotificationPreference.findOneAndUpdate(
        { sessionId: waiter.sessionId },
        { sessionId: waiter.sessionId, lastNotification: notification },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      // ── Push via SSE (real-time, zero-latency) ──────────
      sseManager.sendToSession(waiter.sessionId, "notification", notification);

      // ── Push via Web Push (background / tab closed) ─────
      if (webPush && savedPreferences.pushSubscription && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        try {
          webPush.setVapidDetails(
            process.env.VAPID_SUBJECT || "mailto:admin@example.com",
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );
          await webPush.sendNotification(savedPreferences.pushSubscription, JSON.stringify(notification));
        } catch (pushError) {
          console.error("Push notification failed:", pushError.message);
        }
      }
    }
    waiter.notified = true;
    await waiter.save();
  }
};

// ─────────────────────────────────────────────
// GET /api/parking/notifications/stream/:sessionId
// SSE endpoint — keeps the connection open and
// pushes events in real-time via sseManager.
// ─────────────────────────────────────────────
const sseStream = (req, res) => {
  const { sessionId } = req.params;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering if proxied
  res.flushHeaders();

  // Send an initial heartbeat so the client knows it's connected
  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);

  // Register this connection
  sseManager.addClient(sessionId, res);
  console.log(`📡 SSE client connected: ${sessionId}`);

  // Send a heartbeat every 25 s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 25000);

  // Clean up when the client closes the tab / navigates away
  req.on("close", () => {
    clearInterval(heartbeat);
    sseManager.removeClient(sessionId, res);
    console.log(`📡 SSE client disconnected: ${sessionId}`);
  });
};

// ─────────────────────────────────────────────
// GET /api/parking/slots
// Returns all parking slots
// ─────────────────────────────────────────────
const getAllSlots = async (req, res) => {
  try {
    const slots = await ParkingSlot.find().sort({ slotId: 1 });
    res.json({ success: true, data: slots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/parking/stats
// Returns counts + queue + stack activity
// ─────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const slots = await ParkingSlot.find();

    // Count slots by status using simple array iteration
    const available = slots.filter((s) => s.status === "AVAILABLE").length;
    const occupied = slots.filter((s) => s.status === "OCCUPIED").length;
    const reserved = slots.filter((s) => s.status === "RESERVED").length;
    const total = slots.length;

    // Get waiting queue contents
    const queueList = waitingQueue.toArray();

    // Get recent activity from stack (most recent first)
    const recentActivity = activityStack.toArray().slice(0, 10);

    res.json({
      success: true,
      data: {
        total,
        available,
        occupied,
        reserved,
        waiting: waitingQueue.size(),
        queue: queueList,
        recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/parking/park
// Park a vehicle
// ─────────────────────────────────────────────
const parkVehicle = async (req, res) => {
  try {
    const { vehicleNumber, vehicleType = "Car" } = req.body;

    // --- Input validation ---
    if (!vehicleNumber || vehicleNumber.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Vehicle number is required." });
    }

    const cleanVehicleNumber = vehicleNumber.trim().toUpperCase();

    // --- Check if vehicle is already parked or waiting ---
    const existingVehicle = await Vehicle.findOne({
      vehicleNumber: cleanVehicleNumber,
      status: { $in: ["PARKED", "WAITING"] },
    });

    if (existingVehicle) {
      if (existingVehicle.status === "PARKED") {
        return res.status(400).json({
          success: false,
          message: `Vehicle ${cleanVehicleNumber} is already parked in slot ${existingVehicle.slotId}.`,
        });
      }
      if (existingVehicle.status === "WAITING") {
        // Find its position in queue
        const queuePosition =
          waitingQueue
            .toArray()
            .findIndex((v) => v.vehicleNumber === cleanVehicleNumber) + 1;
        return res.status(400).json({
          success: false,
          message: `Vehicle ${cleanVehicleNumber} is already in the waiting queue at position #${queuePosition}.`,
        });
      }
    }

    // ============================================================
    // DSA: ARRAY LINEAR SCAN — Find first available slot
    // ============================================================
    // We simply go through the sorted slot array and pick the
    // first one that has status === "AVAILABLE". Simple and clear.
    // ============================================================
    const availableSlot = await ParkingSlot.findOne({ status: "AVAILABLE" }).sort(
      { slotId: 1 }
    );

    if (availableSlot) {
      // --- Slot is available: assign it ---

      // 1. Update the slot in the database
      availableSlot.status = "OCCUPIED";
      availableSlot.vehicleNumber = cleanVehicleNumber;
      await availableSlot.save();

      // 2. Create a vehicle record in the database
      const vehicle = new Vehicle({
        vehicleNumber: cleanVehicleNumber,
        vehicleType,
        slotId: availableSlot.slotId,
        entryTime: new Date(),
        status: "PARKED",
      });
      await vehicle.save();

      // ============================================================
      // DSA: STACK — Push park activity to the top of the stack
      // ============================================================
      activityStack.push({
        type: "PARKED",
        vehicleNumber: cleanVehicleNumber,
        slotId: availableSlot.slotId,
        vehicleType,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: `Vehicle ${cleanVehicleNumber} has been assigned slot ${availableSlot.slotId}.`,
        data: {
          status: "PARKED",
          slotId: availableSlot.slotId,
          vehicleNumber: cleanVehicleNumber,
          vehicleType,
          entryTime: vehicle.entryTime,
          slot: availableSlot,
          location: getSlotLocation(availableSlot.slotId),
        },
      });
    } else {
      // ============================================================
      // DSA: QUEUE — No slot available, add vehicle to waiting queue
      // ============================================================
      // FIFO: Vehicle that arrives first will get a slot first.
      // ============================================================

      const queueEntry = {
        vehicleNumber: cleanVehicleNumber,
        vehicleType,
        entryTime: new Date().toISOString(),
      };

      // Enqueue the vehicle (add to END of queue)
      waitingQueue.enqueue(queueEntry);

      // Save to database with status WAITING
      const vehicle = new Vehicle({
        vehicleNumber: cleanVehicleNumber,
        vehicleType,
        slotId: null,
        entryTime: new Date(),
        status: "WAITING",
      });
      await vehicle.save();

      // Push to activity stack
      activityStack.push({
        type: "QUEUED",
        vehicleNumber: cleanVehicleNumber,
        slotId: null,
        vehicleType,
        timestamp: new Date().toISOString(),
      });

      const queuePosition = waitingQueue.size(); // Position in queue

      return res.json({
        success: true,
        message: `No slots available. Vehicle ${cleanVehicleNumber} added to waiting queue at position #${queuePosition}.`,
        data: {
          status: "WAITING",
          queuePosition,
          vehicleNumber: cleanVehicleNumber,
          vehicleType,
          queue: waitingQueue.toArray(),
        },
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/parking/exit
// Exit a vehicle from its slot
// ─────────────────────────────────────────────
const exitVehicle = async (req, res) => {
  try {
    const { vehicleNumber } = req.body;

    if (!vehicleNumber || vehicleNumber.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Vehicle number is required." });
    }

    const cleanVehicleNumber = vehicleNumber.trim().toUpperCase();

    // --- Find the parked vehicle ---
    const vehicle = await Vehicle.findOne({
      vehicleNumber: cleanVehicleNumber,
      status: "PARKED",
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `Vehicle ${cleanVehicleNumber} is not currently parked. Please check the vehicle number.`,
      });
    }

    // --- Free the parking slot ---
    const slot = await ParkingSlot.findOne({ slotId: vehicle.slotId });
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: `Slot ${vehicle.slotId} not found in database.`,
      });
    }

    const freedSlotId = slot.slotId;

    // --- Calculate duration ---
    const exitTime = new Date();
    const durationMs = exitTime - new Date(vehicle.entryTime);
    const durationMinutes = Math.round(durationMs / 60000);

    // --- Save to parking history ---
    const historyRecord = new ParkingHistory({
      vehicleNumber: cleanVehicleNumber,
      vehicleType: vehicle.vehicleType,
      slotId: freedSlotId,
      entryTime: vehicle.entryTime,
      exitTime,
      duration: durationMinutes,
    });
    await historyRecord.save();

    // --- Update vehicle record ---
    vehicle.exitTime = exitTime;
    vehicle.status = "EXITED";
    await vehicle.save();
    await SavedParkingLocation.updateMany(
      { vehicleNumber: cleanVehicleNumber, active: true },
      { $set: { active: false } }
    );

    // ============================================================
    // DSA: STACK — Push exit activity
    // ============================================================
    activityStack.push({
      type: "EXITED",
      vehicleNumber: cleanVehicleNumber,
      slotId: freedSlotId,
      vehicleType: vehicle.vehicleType,
      timestamp: new Date().toISOString(),
      duration: durationMinutes,
    });

    let assignedQueueVehicle = null;

    // ============================================================
    // DSA: QUEUE — Check if any vehicle is waiting
    // ============================================================
    // If queue is not empty, the first waiting vehicle (FIFO)
    // gets the freed slot immediately.
    // ============================================================
    if (!waitingQueue.isEmpty()) {
      const nextVehicle = waitingQueue.dequeue(); // Remove from FRONT

      // Assign the freed slot to the next vehicle in queue
      slot.status = "OCCUPIED";
      slot.vehicleNumber = nextVehicle.vehicleNumber;
      await slot.save();

      // Update the vehicle record in DB from WAITING → PARKED
      await Vehicle.findOneAndUpdate(
        { vehicleNumber: nextVehicle.vehicleNumber, status: "WAITING" },
        {
          status: "PARKED",
          slotId: freedSlotId,
          entryTime: new Date(), // Reset entry time to now
        }
      );

      // Push assignment to stack
      activityStack.push({
        type: "PARKED",
        vehicleNumber: nextVehicle.vehicleNumber,
        slotId: freedSlotId,
        vehicleType: nextVehicle.vehicleType,
        timestamp: new Date().toISOString(),
        note: "Assigned from waiting queue",
      });

      assignedQueueVehicle = {
        vehicleNumber: nextVehicle.vehicleNumber,
        slotId: freedSlotId,
      };
    } else {
      // No vehicles waiting — mark slot as AVAILABLE
      slot.status = "AVAILABLE";
      slot.vehicleNumber = null;
      await slot.save();
      await sendSlotNotifications(slot);
    }

    return res.json({
      success: true,
      message: `Vehicle ${cleanVehicleNumber} has exited. Slot ${freedSlotId} is now ${
        assignedQueueVehicle ? "assigned to " + assignedQueueVehicle.vehicleNumber : "available"
      }.`,
      data: {
        exitedVehicle: cleanVehicleNumber,
        freedSlot: freedSlotId,
        duration: durationMinutes,
        assignedQueueVehicle,
        remainingQueue: waitingQueue.size(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/parking/queue
// Get current waiting queue
// ─────────────────────────────────────────────
const getQueue = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        queue: waitingQueue.toArray(),
        size: waitingQueue.size(),
        front: waitingQueue.peek(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/parking/history
// Get parking history (completed sessions)
// ─────────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const history = await ParkingHistory.find()
      .sort({ exitTime: -1 }) // Most recent first
      .limit(50);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/parking/vehicle/:vehicleNumber
// Get details for a specific vehicle
// ─────────────────────────────────────────────
const getVehicleDetails = async (req, res) => {
  try {
    const vehicleNumber = req.params.vehicleNumber.toUpperCase();
    const vehicle = await Vehicle.findOne({
      vehicleNumber,
      status: { $in: ["PARKED", "WAITING"] },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: `No active session found for vehicle ${vehicleNumber}.`,
      });
    }

    let slot = null;
    if (vehicle.slotId) {
      slot = await ParkingSlot.findOne({ slotId: vehicle.slotId });
    }

    let queuePosition = null;
    if (vehicle.status === "WAITING") {
      queuePosition =
        waitingQueue
          .toArray()
          .findIndex((v) => v.vehicleNumber === vehicleNumber) + 1;
    }

    res.json({
      success: true,
      data: { vehicle, slot, queuePosition },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const saveParkingLocation = async (req, res) => {
  try {
    const { sessionId, vehicleNumber } = req.body;
    if (!sessionId || !vehicleNumber) {
      return res.status(400).json({ success: false, message: "Session and vehicle number are required." });
    }
    const vehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber.trim().toUpperCase(), status: "PARKED" });
    if (!vehicle || !vehicle.slotId) {
      return res.status(404).json({ success: false, message: "No active parked vehicle found." });
    }
    const saved = await SavedParkingLocation.findOneAndUpdate(
      { sessionId, vehicleNumber: vehicle.vehicleNumber, active: true },
      {
        sessionId,
        vehicleNumber: vehicle.vehicleNumber,
        slotId: vehicle.slotId,
        ...getSlotLocation(vehicle.slotId),
        mallName: "Pavilion Mall",
        parkedAt: vehicle.entryTime,
        active: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSavedParkingLocation = async (req, res) => {
  try {
    const saved = await SavedParkingLocation.findOne({ sessionId: req.params.sessionId, active: true }).sort({ parkedAt: -1 });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const waitForSlot = async (req, res) => {
  try {
    const { sessionId, slotId } = req.body;
    if (!sessionId || !slotId) return res.status(400).json({ success: false, message: "Session and slot are required." });
    const slot = await ParkingSlot.findOne({ slotId: slotId.toUpperCase() });
    if (!slot) return res.status(404).json({ success: false, message: "Parking slot not found." });
    if (slot.status === "AVAILABLE") return res.status(400).json({ success: false, message: `Slot ${slot.slotId} is already available.` });
    const waiter = await SlotWaiter.findOneAndUpdate(
      { sessionId, slotId: slot.slotId },
      { sessionId, slotId: slot.slotId, ...getSlotLocation(slot.slotId), notified: false },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: waiter, message: `You will be notified when slot ${slot.slotId} is available.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const preferences = await NotificationPreference.findOne({ sessionId: req.params.sessionId });
    res.json({ success: true, data: preferences?.lastNotification || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPreferences = async (req, res) => {
  try {
    const preferences = await NotificationPreference.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { $setOnInsert: { sessionId: req.params.sessionId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const { availabilityEnabled, carReminderEnabled, preferredSlot } = req.body;
    const preferences = await NotificationPreference.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { $set: { availabilityEnabled, carReminderEnabled, preferredSlot }, $setOnInsert: { sessionId: req.params.sessionId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const savePushSubscription = async (req, res) => {
  try {
    const { sessionId, subscription } = req.body;
    if (!sessionId || !subscription) return res.status(400).json({ success: false, message: "Session and subscription are required." });
    await NotificationPreference.findOneAndUpdate(
      { sessionId },
      { sessionId, pushSubscription: subscription },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/parking/availability
// Returns aggregated availability data for Smart Journey.
// ─────────────────────────────────────────────────────────────
// DATA SOURCE: This system's own MongoDB database.
// No physical sensors, ESP32, or external parking API is connected.
// Data reflects slots manually managed via the Parking/Dashboard pages.
//
// FUTURE INTEGRATION:
// To connect a real parking data source, implement a provider in:
//   backend/services/parkingDataProvider.js
// and replace ParkingSlot.find() below with the provider call.
// Supported provider types: "system-db" | "manual" | "test" | "external-api" | "mqtt-sensor"
// ─────────────────────────────────────────────────────────────
const getAvailability = async (req, res) => {
  try {
    const slots = await ParkingSlot.find().sort({ slotId: 1 });

    // ── Linear scan: group slots by zone (first char of slotId) ──
    // Time complexity: O(n) where n = number of slots
    const byZone = {};
    for (const slot of slots) {
      const zone = slot.slotId.charAt(0); // e.g. "A", "B", "C", "D"
      if (!byZone[zone]) byZone[zone] = { zone, total: 0, available: 0, occupied: 0, reserved: 0 };
      byZone[zone].total++;
      if (slot.status === "AVAILABLE") byZone[zone].available++;
      else if (slot.status === "OCCUPIED") byZone[zone].occupied++;
      else if (slot.status === "RESERVED") byZone[zone].reserved++;
    }

    const available = slots.filter((s) => s.status === "AVAILABLE").length;
    const occupied  = slots.filter((s) => s.status === "OCCUPIED").length;
    const reserved  = slots.filter((s) => s.status === "RESERVED").length;

    res.json({
      success: true,
      data: {
        facility: {
          // NOTE: These coordinates are illustrative for this demo system.
          // They do NOT represent a real parking facility at this location.
          name: "SmartPark Demo Facility",
          location: { lat: 18.5209, lng: 73.8567 },
          entranceLocation: { lat: 18.5209, lng: 73.8567 },
        },
        total: slots.length,
        available,
        occupied,
        reserved,
        byZone: Object.values(byZone),
        // ── Data source metadata ─────────────────────────────────
        // dataSource: identifies where this data comes from
        // dataMode: "system" = managed slots in this app (no sensors)
        //           "manual" = operator-entered data
        //           "test"   = test/development data
        //           "external-api" = connected authorized API
        //           "mqtt-sensor" = connected ESP32/MQTT sensors
        dataSource: "system-db",
        dataMode: "system",
        sensorConnected: false,  // No physical sensors configured
        externalApiConnected: false, // No external parking API connected
        lastUpdated: new Date().toISOString(),
        note: "Data reflects slots managed by this application only. No physical sensors or external parking API is connected.",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllSlots,
  getStats,
  parkVehicle,
  exitVehicle,
  getQueue,
  getHistory,
  getVehicleDetails,
  saveParkingLocation,
  getSavedParkingLocation,
  waitForSlot,
  getNotifications,
  getPreferences,
  updatePreferences,
  savePushSubscription,
  sseStream,
  getAvailability,
};
