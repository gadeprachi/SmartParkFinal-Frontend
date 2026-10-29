// backend/models/Vehicle.js
// Mongoose schema for a vehicle currently in the system

const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ["Car", "Motorcycle", "Truck", "SUV", "Other"],
      default: "Car",
    },
    slotId: {
      type: String,
      default: null, // null if vehicle is in the waiting queue
    },
    entryTime: {
      type: Date,
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null, // null until vehicle exits
    },
    status: {
      type: String,
      enum: ["PARKED", "WAITING", "EXITED"],
      default: "PARKED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
