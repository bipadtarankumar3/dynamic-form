// mongo-server/src/models/MasterSchema.model.js
const mongoose = require("mongoose");

const MasterSchemaDef = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    label_field: { type: String, default: "name" },
    value_field: { type: String, default: "_id" },
    is_active: { type: Boolean, default: true },
    fields: [
      {
        name: { type: String, required: true },
        key: { type: String, required: true },
        type: { type: String, default: "text" },
        required: { type: Boolean, default: false },
        options: [{ label: String, value: mongoose.Schema.Types.Mixed }],
        default_value: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

MasterSchemaDef.index({ deleted_at: 1 });

module.exports = mongoose.models.MasterSchema || mongoose.model("MasterSchema", MasterSchemaDef);
