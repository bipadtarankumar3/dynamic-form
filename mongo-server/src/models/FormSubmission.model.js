// mongo-server/src/models/FormSubmission.model.js
const mongoose = require("mongoose");

const FormSubmissionSchema = new mongoose.Schema(
  {
    formSlug: { type: String, required: true, index: true },
    formVersion: { type: Number, required: true, default: 1 },
    submittedBy: { type: String, default: "anonymous" },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "draft"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FormSubmission", FormSubmissionSchema);
