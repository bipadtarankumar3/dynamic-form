// mongo-server/src/models/CustomDashboardWidget.model.js
const mongoose = require("mongoose");

const CustomDashboardWidgetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    table_name: {
      type: String,
      required: true,
      trim: true,
    },
    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    chart_type: {
      type: String,
      default: "none",
    },
    query: {
      type: String,
      default: "",
    },
    raw_query: {
      type: String,
      default: "",
    },
    is_active: {
      type: Boolean,
      default: true,
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

CustomDashboardWidgetSchema.index({ is_active: 1, deleted_at: 1, order: 1 });

module.exports =
  mongoose.models.CustomDashboardWidget ||
  mongoose.model("CustomDashboardWidget", CustomDashboardWidgetSchema);
