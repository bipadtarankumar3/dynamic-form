// mongo-server/src/models/MasterData.model.js
const mongoose = require("mongoose");

const MasterDataSchema = new mongoose.Schema(
  {
    master_slug: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
  }
);

MasterDataSchema.index({ master_slug: 1, deleted_at: 1 });

module.exports = mongoose.models.MasterData || mongoose.model("MasterData", MasterDataSchema);
