// mongo-server/src/models/CustomDashboardWidget.model.js
const mongoose = require("mongoose");

const CustomDashboardWidgetSchema = new mongoose.Schema(
  {
    dashboard_id: { type: mongoose.Schema.Types.ObjectId, ref: "CustomDashboard", index: true },
    title: { type: String, required: true, trim: true },
    widget_type: { type: String, enum: ["counter", "bar", "pie", "line", "table", "doughnut", "radar"], required: true },
    data_source: {
      type: { type: String, enum: ["form", "view", "master", "custom"], default: "form" },
      target: { type: String, required: true },
      aggregation: { type: String, default: "count" },
      group_by: { type: String, default: null },
      value_field: { type: String, default: null },
      filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    grid_position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 6 },
      h: { type: Number, default: 4 },
    },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.models.CustomDashboardWidget || mongoose.model("CustomDashboardWidget", CustomDashboardWidgetSchema);
