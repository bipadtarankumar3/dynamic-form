// mongo-server/src/models/AuditLog.model.js
const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    record_id: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    old_data: { type: mongoose.Schema.Types.Mixed, default: null },
    new_data: { type: mongoose.Schema.Types.Mixed, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

AuditLogSchema.index({ module: 1, created_at: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
