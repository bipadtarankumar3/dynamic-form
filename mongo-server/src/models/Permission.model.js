// mongo-server/src/models/Permission.model.js
const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema({
  module:     { type: String, required: true, trim: true },
  type:       { type: String, required: true, trim: true }, // add, edit, list, delete, view, export
  key:        { type: String, required: true, trim: true }, // e.g. "csr_form.add"
  label:      { type: String, default: "" },
  deleted_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

PermissionSchema.index({ module: 1, type: 1 });
PermissionSchema.index({ key: 1 });

module.exports = mongoose.model("Permission", PermissionSchema);
