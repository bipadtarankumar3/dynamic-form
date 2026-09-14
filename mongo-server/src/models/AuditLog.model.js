// mongo-server/src/models/AuditLog.model.js
const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  action:      { type: String, required: true }, // e.g. "create", "update", "delete", "login"
  module:      { type: String, required: true }, // form_slug or module name
  record_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  ip_address:  { type: String, default: null },
  old_data:    { type: mongoose.Schema.Types.Mixed, default: null },
  new_data:    { type: mongoose.Schema.Types.Mixed, default: null },
  description: { type: String, default: "" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

AuditLogSchema.index({ module: 1, record_id: 1 });
AuditLogSchema.index({ user_id: 1 });
AuditLogSchema.index({ created_at: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
