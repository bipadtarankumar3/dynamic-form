// mongo-server/src/models/RolePermission.model.js
const mongoose = require("mongoose");

const RolePermissionSchema = new mongoose.Schema(
  {
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true, index: true },
    permission_id: { type: mongoose.Schema.Types.ObjectId, ref: "Permission", required: true, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

RolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

module.exports = mongoose.models.RolePermission || mongoose.model("RolePermission", RolePermissionSchema);
