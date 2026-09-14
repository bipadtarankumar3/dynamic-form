// mongo-server/src/models/WorkflowInstance.model.js
const mongoose = require("mongoose");

const ApprovalTrackSchema = new mongoose.Schema({
  step_number:  { type: Number, required: true },
  step_name:    { type: String, default: "" },
  action:       { type: String, enum: ["pending", "approved", "rejected", "sent_back"], default: "pending" },
  comment:      { type: String, default: "" },
  actioned_by:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actioned_at:  { type: Date, default: null },
}, { _id: false });

const WorkflowInstanceSchema = new mongoose.Schema({
  workflow_id:      { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowDef", required: true },
  form_slug:        { type: String, required: true },
  record_id:        { type: mongoose.Schema.Types.ObjectId, ref: "FormData", required: true },
  current_step:     { type: Number, default: 1 },
  status:           { type: String, default: "pending", enum: ["pending", "approved", "rejected", "sent_back"] },
  initiated_by:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  tracks:           { type: [ApprovalTrackSchema], default: [] },
  deleted_at:       { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

WorkflowInstanceSchema.index({ form_slug: 1, record_id: 1 });
WorkflowInstanceSchema.index({ status: 1 });

module.exports = mongoose.model("WorkflowInstance", WorkflowInstanceSchema);
