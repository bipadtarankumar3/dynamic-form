// mongo-server/src/models/WorkflowInstance.model.js
const mongoose = require("mongoose");

const WorkflowInstanceSchema = new mongoose.Schema(
  {
    workflow_def_id: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowDef", required: true, index: true },
    form_slug: { type: String, required: true, index: true },
    record_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    current_step: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "approved", "rejected", "returned", "cancelled"],
      default: "pending",
      index: true,
    },
    history: [
      {
        step: { type: Number },
        action: { type: String, enum: ["submitted", "approved", "rejected", "returned", "reassigned"] },
        actor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actor_name: { type: String },
        comments: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

WorkflowInstanceSchema.index({ form_slug: 1, record_id: 1 });

module.exports = mongoose.models.WorkflowInstance || mongoose.model("WorkflowInstance", WorkflowInstanceSchema);
