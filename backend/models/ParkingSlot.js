// backend/models/ParkingSlot.js
// Mongoose schema for a single parking slot

const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      required: true,
      unique: true, // e.g. "A1", "B3", "D5"
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "OCCUPIED", "RESERVED"],
      default: "AVAILABLE",
    },
    vehicleNumber: {
      type: String,
      default: null, // null when no vehicle is parked
    },
    // Row and column position in the parking grid (used for map coordinates)
    row: {
      type: Number, // 0=A, 1=B, 2=C, 3=D
      required: true,
    },
    col: {
      type: Number, // 0=1, 1=2, ... 4=5
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ParkingSlot", parkingSlotSchema);
