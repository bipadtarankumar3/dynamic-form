// mongo-server/src/models/NgoDueDiligenceVersion.model.js
const mongoose = require("mongoose");

const NgoDueDiligenceVersionSchema = new mongoose.Schema(
  {
    ngo_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    dd_record_id: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    version_number: { type: Number, default: 1 },
    status: { type: String, default: "draft" },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    approval_history: { type: Array, default: [] },
    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

NgoDueDiligenceVersionSchema.index({ ngo_id: 1, version_number: 1 });

module.exports = mongoose.models.NgoDueDiligenceVersion || mongoose.model("NgoDueDiligenceVersion", NgoDueDiligenceVersionSchema);
