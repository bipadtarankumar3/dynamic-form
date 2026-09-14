// mongo-server/src/models/Role.model.js
const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  slug:             { type: String, required: true, unique: true, lowercase: true, trim: true },
  description:      { type: String, default: "" },
  is_active:        { type: Boolean, default: true },
  is_configurator:  { type: Boolean, default: false },
  deleted_at:       { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

RoleSchema.index({ slug: 1 });

module.exports = mongoose.model("Role", RoleSchema);
