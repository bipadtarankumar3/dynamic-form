// mongo-server/src/models/FormData.model.js
const mongoose = require("mongoose");

const FormDataSchema = new mongoose.Schema(
  {
    form_slug: { type: String, required: true, index: true },
    form_version: { type: Number, default: 1 },
    parent_id: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    status: { type: String, default: "draft", index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
  }
);

FormDataSchema.index({ form_slug: 1, deleted_at: 1 });

module.exports = mongoose.models.FormData || mongoose.model("FormData", FormDataSchema);
