// mongo-server/src/models/MasterConfig.model.js
const mongoose = require("mongoose");

const MasterConfigSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    table_name: { type: String, required: true, trim: true },
    primary_key: { type: String, default: "_id" },
    label_key: { type: String, required: true, trim: true },
    is_active_key: { type: String, default: null },
    foreign_key: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

MasterConfigSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.MasterConfig || mongoose.model("MasterConfig", MasterConfigSchema);
