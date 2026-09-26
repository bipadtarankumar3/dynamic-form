// mongo-server/src/models/WorkflowInstance.model.js
const mongoose = require("mongoose");

const WorkflowInstanceSchema = new mongoose.Schema(
  {
    workflow_def_id: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowDef", default: null, index: true },
    form_slug: { type: String, required: true, index: true },
    record_table: { type: String, default: null, index: true },
    record_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    current_step: { type: Number, default: 0 },
    status: {
      type: String,
      default: "DRAFT",
      index: true,
    },
    remarks: { type: String, default: "" },
    wfi_step_assignments: { type: mongoose.Schema.Types.Mixed, default: [] },
    assignments: { type: mongoose.Schema.Types.Mixed, default: [] },
    history: { type: mongoose.Schema.Types.Mixed, default: [] },
    rule_id: { type: mongoose.Schema.Types.Mixed, default: null },
    rejection_info: { type: mongoose.Schema.Types.Mixed, default: null },
    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    deleted_at: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
  }
);

WorkflowInstanceSchema.index({ form_slug: 1, record_id: 1, deleted_at: 1 });
WorkflowInstanceSchema.index({ status: 1, deleted_at: 1 });

module.exports = mongoose.models.WorkflowInstance || mongoose.model("WorkflowInstance", WorkflowInstanceSchema);
