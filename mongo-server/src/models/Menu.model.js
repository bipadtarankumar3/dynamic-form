// mongo-server/src/models/Menu.model.js
const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
  parent_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Menu", default: null },
  label:           { type: String, required: true, trim: true },
  icon:            { type: String, default: null },
  image:           { type: String, default: null },
  url:             { type: String, default: null },
  order:           { type: Number, default: 0 },
  is_active:       { type: Boolean, default: true },
  module_key:      { type: String, default: null }, // maps to form_slug or module name
  is_configurator: { type: Boolean, default: false }, // only shown to configurators
  // Role-based permission — which roles can see this menu item
  allowed_roles:   { type: [String], default: [] }, // empty = all roles
  created_by:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updated_by:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleted_at:      { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

MenuSchema.index({ parent_id: 1 });
MenuSchema.index({ is_configurator: 1 });

module.exports = mongoose.model("Menu", MenuSchema);
