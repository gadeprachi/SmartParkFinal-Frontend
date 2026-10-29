// backend/models/ParkingHistory.js
// Mongoose schema for completed parking records (vehicle has exited)

const mongoose = require("mongoose");

const parkingHistorySchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      default: "Car",
    },
    slotId: {
      type: String,
      required: true,
    },
    entryTime: {
      type: Date,
      required: true,
    },
    exitTime: {
      type: Date,
      default: Date.now,
    },
    // Duration in minutes (calculated on exit)
    duration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ParkingHistory", parkingHistorySchema);
