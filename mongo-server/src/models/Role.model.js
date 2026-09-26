// mongo-server/src/models/Role.model.js
const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    is_configurator: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

RoleSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Role || mongoose.model("Role", RoleSchema);
