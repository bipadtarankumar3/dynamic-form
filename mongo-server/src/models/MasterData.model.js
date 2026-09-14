// mongo-server/src/models/MasterData.model.js
// All master records share one collection, differentiated by master_slug
const mongoose = require("mongoose");

const MasterDataSchema = new mongoose.Schema({
  master_slug: { type: String, required: true, index: true },
  data:        { type: mongoose.Schema.Types.Mixed, required: true },
  is_active:   { type: Boolean, default: true },
  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updated_by:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleted_at:  { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

MasterDataSchema.index({ master_slug: 1, deleted_at: 1 });

module.exports = mongoose.model("MasterData", MasterDataSchema);
