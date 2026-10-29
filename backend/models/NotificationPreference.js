const mongoose = require("mongoose");

const notificationPreferenceSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    availabilityEnabled: { type: Boolean, default: true },
    carReminderEnabled: { type: Boolean, default: true },
    preferredSlot: { type: String, default: "ANY" },
    pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
    lastNotification: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema);
