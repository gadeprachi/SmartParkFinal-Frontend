// backend/routes/parkingRoutes.js
// Maps HTTP routes to controller functions

const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/parkingController");

// GET all parking slots
router.get("/slots", getAllSlots);

// GET stats (available, occupied, reserved, waiting, queue, stack activity)
router.get("/stats", getStats);

// GET aggregated availability (Smart Journey feature — backward-compatible)
router.get("/availability", getAvailability);

// POST park a vehicle
router.post("/park", parkVehicle);

// POST exit a vehicle
router.post("/exit", exitVehicle);

// GET waiting queue
router.get("/queue", getQueue);

// GET parking history
router.get("/history", getHistory);

// GET specific vehicle details
router.get("/vehicle/:vehicleNumber", getVehicleDetails);

router.post("/remember", saveParkingLocation);
router.get("/remember/:sessionId", getSavedParkingLocation);
router.post("/wait", waitForSlot);

// SSE real-time stream — must be registered BEFORE the generic
// /notifications/:sessionId REST route to avoid route conflicts.
router.get("/notifications/stream/:sessionId", sseStream);

router.get("/notifications/:sessionId", getNotifications);
router.get("/preferences/:sessionId", getPreferences);
router.put("/preferences/:sessionId", updatePreferences);
router.post("/push/subscribe", savePushSubscription);

module.exports = router;
