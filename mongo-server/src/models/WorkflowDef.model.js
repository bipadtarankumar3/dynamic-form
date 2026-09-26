// mongo-server/src/models/WorkflowDef.model.js
const mongoose = require("mongoose");

const WorkflowDefSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    form_slug: { type: String, default: null, index: true },
    description: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
    steps: [
      {
        step_number: { type: Number, required: true },
        step_name: { type: String, required: true },
        approver_role: { type: String, default: null },
        approver_user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        action_type: { type: String, enum: ["approve_reject", "review", "sign"], default: "approve_reject" },
        sla_hours: { type: Number, default: 48 },
        allow_return: { type: Boolean, default: true },
      },
    ],
    rules: { type: mongoose.Schema.Types.Mixed, default: [] },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

WorkflowDefSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.WorkflowDef || mongoose.model("WorkflowDef", WorkflowDefSchema);
