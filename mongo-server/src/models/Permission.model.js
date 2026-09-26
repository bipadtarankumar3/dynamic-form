// mongo-server/src/models/Permission.model.js
const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

PermissionSchema.index({ module: 1, type: 1 });
PermissionSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);
