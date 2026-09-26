// mongo-server/src/models/CustomDashboard.model.js
const mongoose = require("mongoose");

const CustomDashboardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    layout: { type: Array, default: [] },
    roles: [{ type: String }],
    is_default: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

CustomDashboardSchema.index({ slug: 1 });
CustomDashboardSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.CustomDashboard || mongoose.model("CustomDashboard", CustomDashboardSchema);
