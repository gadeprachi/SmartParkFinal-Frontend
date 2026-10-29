// backend/server.js
// Entry point for the Express backend server

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const parkingRoutes = require("./routes/parkingRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Connect to MongoDB ───────────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"]
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json()); // Parse incoming JSON request bodies

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/parking", parkingRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "🚗 Smart Parking Management System API is running!",
    version: "1.0.0",
    endpoints: {
      slots: "GET /api/parking/slots",
      stats: "GET /api/parking/stats",
      park: "POST /api/parking/park",
      exit: "POST /api/parking/exit",
      queue: "GET /api/parking/queue",
      history: "GET /api/parking/history",
      vehicle: "GET /api/parking/vehicle/:vehicleNumber",
    },
  });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
