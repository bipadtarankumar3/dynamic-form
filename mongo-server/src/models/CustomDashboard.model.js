// mongo-server/src/models/CustomDashboard.model.js
const mongoose = require("mongoose");

const CustomDashboardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    roles: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    widgets_layout: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    filters_config: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    data_scope: {
      type: String,
      default: "all",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

CustomDashboardSchema.index({ is_active: 1, deleted_at: 1, order: 1 });

module.exports =
  mongoose.models.CustomDashboard ||
  mongoose.model("CustomDashboard", CustomDashboardSchema);
