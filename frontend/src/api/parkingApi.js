// frontend/src/api/parkingApi.js
// ============================================================
// API Client — All communication with the backend happens here
// ============================================================
// Uses axios for HTTP requests.
// Base URL points to the Express backend.
// ============================================================

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/parking`
  : "http://localhost:5000/api/parking";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ─── REST endpoints ──────────────────────────────────────────

// GET all parking slots
export const fetchSlots = () => api.get("/slots");

// GET stats (counts, queue, recent activity)
export const fetchStats = () => api.get("/stats");

// POST park a vehicle
export const parkVehicle = (vehicleNumber, vehicleType) =>
  api.post("/park", { vehicleNumber, vehicleType });

// POST exit a vehicle
export const exitVehicle = (vehicleNumber) =>
  api.post("/exit", { vehicleNumber });

// GET waiting queue
export const fetchQueue = () => api.get("/queue");

// GET parking history
export const fetchHistory = () => api.get("/history");

// GET a specific vehicle's details
export const fetchVehicle = (vehicleNumber) =>
  api.get(`/vehicle/${vehicleNumber}`);

export const rememberParkingLocation = (sessionId, vehicleNumber) =>
  api.post("/remember", { sessionId, vehicleNumber });

export const fetchSavedParkingLocation = (sessionId) =>
  api.get(`/remember/${sessionId}`);

export const waitForSlot = (sessionId, slotId) =>
  api.post("/wait", { sessionId, slotId });

export const fetchNotifications = (sessionId) =>
  api.get(`/notifications/${sessionId}`);

export const fetchNotificationPreferences = (sessionId) =>
  api.get(`/preferences/${sessionId}`);

export const updateNotificationPreferences = (sessionId, preferences) =>
  api.put(`/preferences/${sessionId}`, preferences);

export const savePushSubscription = (sessionId, subscription) =>
  api.post("/push/subscribe", { sessionId, subscription });

// GET aggregated availability (for Smart Journey)
export const fetchAvailability = () => api.get("/availability");

// ─── SSE stream URL ──────────────────────────────────────────
// Used by NotificationWatcher to open a persistent EventSource.
export const getSSEStreamUrl = (sessionId) =>
  `${BASE_URL}/notifications/stream/${sessionId}`;

export default api;
