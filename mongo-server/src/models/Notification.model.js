// mongo-server/src/models/Notification.model.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: { type: String, default: "system" },
    link: { type: String, default: null },
    is_read: { type: Boolean, default: false, index: true },
    event_key: { type: String, default: null },
    ref_table: { type: String, default: null },
    ref_id: { type: mongoose.Schema.Types.Mixed, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

NotificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
