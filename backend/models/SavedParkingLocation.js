const mongoose = require("mongoose");

const savedParkingLocationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
    slotId: { type: String, required: true },
    level: { type: String, default: "Level 1" },
    zone: { type: String, default: "Zone A" },
    mallName: { type: String, default: "Pavilion Mall" },
    parkedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedParkingLocation", savedParkingLocationSchema);
