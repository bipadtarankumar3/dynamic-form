// mongo-server/src/models/FormSubmission.model.js
const mongoose = require("mongoose");

const FormSubmissionSchema = new mongoose.Schema(
  {
    form_slug: { type: String, required: true, index: true },
    record_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, default: "submitted" },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.models.FormSubmission || mongoose.model("FormSubmission", FormSubmissionSchema);
