// mongo-server/src/models/WorkflowDef.model.js
const mongoose = require("mongoose");

const WorkflowDefSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  slug:             { type: String, required: true, unique: true, trim: true },
  trigger_form:     { type: String, default: null }, // form_slug that triggers this workflow
  flow_type:        { type: String, default: "normal", enum: ["normal", "parallel", "conditional"] },
  has_conditions:   { type: Boolean, default: false },
  is_draft:         { type: Boolean, default: false },
  is_active:        { type: Boolean, default: true },
  conditions:       { type: [mongoose.Schema.Types.Mixed], default: [] },
  initiator_roles:  { type: [mongoose.Schema.Types.Mixed], default: [] },
  // Each step: { step_number, name, role_id/role_slug, approver_type, actions }
  steps:            { type: [mongoose.Schema.Types.Mixed], default: [] },
  created_by:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updated_by:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleted_at:       { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

WorkflowDefSchema.index({ slug: 1 });
WorkflowDefSchema.index({ trigger_form: 1 });

module.exports = mongoose.model("WorkflowDef", WorkflowDefSchema);
