// mongo-server/src/models/WorkflowDef.model.js
const mongoose = require("mongoose");

const WorkflowDefSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true, lowercase: true, trim: true },
    form_slug: { type: String, default: null, index: true },
    trigger_form: { type: String, default: null, index: true },
    flow_type: { type: String, default: "linear" },
    description: { type: String, default: "" },
    is_active: { type: Boolean, default: true, index: true },
    has_conditions: { type: Boolean, default: false },
    initiator_roles: { type: mongoose.Schema.Types.Mixed, default: [] },
    conditions: { type: mongoose.Schema.Types.Mixed, default: [] },
    steps: { type: mongoose.Schema.Types.Mixed, default: [] },
    rules: { type: mongoose.Schema.Types.Mixed, default: [] },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
  }
);

WorkflowDefSchema.index({ deleted_at: 1, is_active: 1 });
WorkflowDefSchema.index({ form_slug: 1, deleted_at: 1 });
WorkflowDefSchema.index({ trigger_form: 1, deleted_at: 1 });

module.exports = mongoose.models.WorkflowDef || mongoose.model("WorkflowDef", WorkflowDefSchema);
