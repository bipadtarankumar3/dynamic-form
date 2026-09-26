// mongo-server/src/models/DatabaseView.model.js
const mongoose = require("mongoose");

const DatabaseViewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    base_form_slug: { type: String, required: true, index: true },
    source_collection: { type: String, default: "formdatas" },
    view_collection_name: { type: String, required: true },
    selected_fields: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        source_field: { type: String, required: true },
        type: { type: String, default: "text" },
      },
    ],
    joins: [
      {
        from: { type: String },
        localField: { type: String },
        foreignField: { type: String },
        as: { type: String },
      },
    ],
    pipeline: { type: Array, default: [] },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

DatabaseViewSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.DatabaseView || mongoose.model("DatabaseView", DatabaseViewSchema);
