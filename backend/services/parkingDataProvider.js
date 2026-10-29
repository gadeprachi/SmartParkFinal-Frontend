// backend/services/parkingDataProvider.js
// ============================================================
// PARKING DATA PROVIDER — Architecture for Future Integration
// ============================================================
// This module defines the interface for connecting real parking
// data sources to the SmartPark backend.
//
// CURRENT STATUS: Software-only mode.
//   - Provider type: "system-db"
//   - No physical sensors connected.
//   - No external parking API connected.
//
// FUTURE INTEGRATION: To connect a real data source:
//   1. Set PARKING_DATA_PROVIDER in backend/.env to one of:
//      "system-db"   → Use this app's MongoDB (current default)
//      "manual"      → Operator-entered data (development use)
//      "test"        → Seeded test data (development only)
//      "external-api"→ Authorized external parking API
//      "mqtt-sensor" → ESP32/MQTT sensor network
//
//   2. Configure the required environment variables for your
//      chosen provider (see INTEGRATION GUIDE section below).
//
//   3. Call getAvailabilityData() from your controller.
//      The interface is provider-independent.
// ============================================================

const ParkingSlot = require("../models/ParkingSlot");

// ── Provider type from environment ───────────────────────────
// Defaults to "system-db" when not configured.
const PROVIDER_TYPE = process.env.PARKING_DATA_PROVIDER || "system-db";

// ── Provider status ───────────────────────────────────────────
// Reports whether the configured data source is connected.
function getProviderStatus() {
  switch (PROVIDER_TYPE) {
    case "system-db":
      return {
        connected: true,
        type: "system-db",
        mode: "system",
        description: "System database — slots managed by this application (no sensors)",
        sensorConnected: false,
        externalApiConnected: false,
      };

    case "manual":
      return {
        connected: true,
        type: "manual",
        mode: "manual",
        description: "Manual data — entered by operator (not sensor data)",
        sensorConnected: false,
        externalApiConnected: false,
      };

    case "test":
      return {
        connected: true,
        type: "test",
        mode: "test",
        description: "Test data — development use only. Do not use in production.",
        sensorConnected: false,
        externalApiConnected: false,
      };

    case "external-api":
      // Check if required config is present
      const apiConfigured = !!(
        process.env.PARKING_API_URL &&
        process.env.PARKING_API_KEY
      );
      return {
        connected: apiConfigured,
        type: "external-api",
        mode: "external-api",
        description: apiConfigured
          ? `External parking API: ${process.env.PARKING_API_URL}`
          : "External parking API: NOT CONFIGURED. Set PARKING_API_URL and PARKING_API_KEY in .env",
        sensorConnected: false,
        externalApiConnected: apiConfigured,
      };

    case "mqtt-sensor":
      // MQTT sensor connection status would be tracked by the MQTT client
      // This is a stub — implement when ESP32 hardware is available
      const mqttConfigured = !!(
        process.env.MQTT_BROKER_URL &&
        process.env.MQTT_TOPIC
      );
      return {
        connected: mqttConfigured,
        type: "mqtt-sensor",
        mode: "mqtt-sensor",
        description: mqttConfigured
          ? `MQTT sensor network: ${process.env.MQTT_BROKER_URL}`
          : "MQTT sensor network: NOT CONFIGURED. Set MQTT_BROKER_URL and MQTT_TOPIC in .env",
        sensorConnected: mqttConfigured,
        externalApiConnected: false,
      };

    default:
      return {
        connected: false,
        type: "none",
        mode: "none",
        description: `Unknown provider type: ${PROVIDER_TYPE}`,
        sensorConnected: false,
        externalApiConnected: false,
      };
  }
}

// ── Main provider function ────────────────────────────────────
// Returns availability data from the configured source.
// All providers return the same shape for compatibility.
async function getAvailabilityData() {
  const status = getProviderStatus();

  switch (PROVIDER_TYPE) {
    case "system-db":
    case "manual":
    case "test":
      // All these modes read from the local MongoDB database.
      // The difference is the dataMode label shown to the user.
      return await getFromSystemDB(status);

    case "external-api":
      if (!status.connected) {
        throw new Error(`External parking API not configured. ${status.description}`);
      }
      return await getFromExternalAPI(status);

    case "mqtt-sensor":
      if (!status.connected) {
        throw new Error(`MQTT sensor network not configured. ${status.description}`);
      }
      return await getFromMQTT(status);

    default:
      throw new Error(`Parking data provider not configured (PARKING_DATA_PROVIDER=${PROVIDER_TYPE})`);
  }
}

// ── System DB provider ────────────────────────────────────────
async function getFromSystemDB(status) {
  const slots = await ParkingSlot.find().sort({ slotId: 1 });

  // Linear scan: group by zone — O(n)
  const byZone = {};
  for (const slot of slots) {
    const zone = slot.slotId.charAt(0);
    if (!byZone[zone]) byZone[zone] = { zone, total: 0, available: 0, occupied: 0, reserved: 0 };
    byZone[zone].total++;
    if (slot.status === "AVAILABLE") byZone[zone].available++;
    else if (slot.status === "OCCUPIED") byZone[zone].occupied++;
    else if (slot.status === "RESERVED") byZone[zone].reserved++;
  }

  return {
    total: slots.length,
    available: slots.filter((s) => s.status === "AVAILABLE").length,
    occupied: slots.filter((s) => s.status === "OCCUPIED").length,
    reserved: slots.filter((s) => s.status === "RESERVED").length,
    byZone: Object.values(byZone),
    dataSource: status.type,
    dataMode: status.mode,
    sensorConnected: false,
    externalApiConnected: false,
    lastUpdated: new Date().toISOString(),
    note: status.description,
  };
}

// ── External API provider (STUB) ──────────────────────────────
// Implement this when an authorized parking API is available.
// Expected environment variables:
//   PARKING_API_URL   → Base URL of the parking API
//   PARKING_API_KEY   → API authentication key
//   PARKING_FACILITY_ID → Your facility identifier in the API
async function getFromExternalAPI(status) {
  // STUB: Replace with actual API call
  // Example implementation:
  //
  // const axios = require("axios");
  // const response = await axios.get(
  //   `${process.env.PARKING_API_URL}/facilities/${process.env.PARKING_FACILITY_ID}/availability`,
  //   { headers: { "Authorization": `Bearer ${process.env.PARKING_API_KEY}` }, timeout: 5000 }
  // );
  // const data = response.data;
  // return {
  //   total: data.total_spaces,
  //   available: data.available_spaces,
  //   occupied: data.occupied_spaces,
  //   reserved: data.reserved_spaces,
  //   byZone: data.zones.map(z => ({ zone: z.id, ...z })),
  //   dataSource: "external-api",
  //   dataMode: "external-api",
  //   sensorConnected: false,
  //   externalApiConnected: true,
  //   lastUpdated: data.timestamp,
  //   note: `Live data from ${process.env.PARKING_API_URL}`,
  // };

  throw new Error("External API provider not yet implemented. See parkingDataProvider.js for instructions.");
}

// ── MQTT Sensor provider (STUB) ───────────────────────────────
// Implement this when ESP32 sensors and an MQTT broker are deployed.
// Expected environment variables:
//   MQTT_BROKER_URL  → MQTT broker URL (e.g. mqtt://broker.local:1883)
//   MQTT_TOPIC       → Topic for slot status updates
//   MQTT_USERNAME    → Broker username (optional)
//   MQTT_PASSWORD    → Broker password (optional)
//
// Expected ESP32 message payload (JSON):
// {
//   "device_id": "sensor-A1",
//   "slot_id": "A1",
//   "status": "OCCUPIED",     // "OCCUPIED" | "AVAILABLE"
//   "timestamp": "2024-01-01T12:00:00Z",
//   "battery": 87             // Sensor battery percentage
// }
async function getFromMQTT(status) {
  // STUB: In production, the MQTT client should maintain a live
  // slot status cache updated by incoming sensor messages.
  // This function would read from that cache.
  //
  // Example:
  // const mqttCache = require("../mqtt/sensorCache");
  // const slots = mqttCache.getAllSlots();
  // if (mqttCache.isStale(30)) { // Data older than 30 seconds
  //   throw new Error("Sensor data is stale. Check sensor connectivity.");
  // }
  // return { total: slots.length, ... };

  throw new Error("MQTT sensor provider not yet implemented. See parkingDataProvider.js for instructions.");
}

module.exports = {
  getAvailabilityData,
  getProviderStatus,
  PROVIDER_TYPE,
};
