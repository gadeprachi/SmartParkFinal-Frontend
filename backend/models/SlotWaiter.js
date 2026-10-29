const mongoose = require("mongoose");

const slotWaiterSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    slotId: { type: String, required: true },
    level: { type: String, default: "Level 1" },
    zone: { type: String, default: "Zone A" },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

slotWaiterSchema.index({ sessionId: 1, slotId: 1 }, { unique: true });

module.exports = mongoose.model("SlotWaiter", slotWaiterSchema);
