// mongo-server/src/models/MasterSchema.model.js
const mongoose = require("mongoose");

const MasterSchemaSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  slug:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  label_field:   { type: String, default: "name" }, // which field is the display label
  fields:        { type: [mongoose.Schema.Types.Mixed], default: [] },
  is_active:     { type: Boolean, default: true },
  allow_search:  { type: Boolean, default: true },
  allow_export:  { type: Boolean, default: true },
  created_by:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updated_by:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleted_at:    { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

MasterSchemaSchema.index({ slug: 1 });

module.exports = mongoose.model("MasterSchema", MasterSchemaSchema);
