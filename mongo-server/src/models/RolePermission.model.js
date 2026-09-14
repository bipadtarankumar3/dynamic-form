// mongo-server/src/models/RolePermission.model.js
const mongoose = require("mongoose");

const RolePermissionSchema = new mongoose.Schema({
  role_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  permission_id: { type: mongoose.Schema.Types.ObjectId, ref: "Permission", required: true },
  deleted_at:    { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

RolePermissionSchema.index({ role_id: 1, permission_id: 1 });

module.exports = mongoose.model("RolePermission", RolePermissionSchema);
