// mongo-server/src/models/PivotReport.model.js
const mongoose = require("mongoose");

const PivotReportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    description: { type: String, default: "" },
    table_name: { type: String, required: true },
    chart_type: { type: String, default: "kpi_card" },
    configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
    zones: { type: mongoose.Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    roles: [{ type: String }],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

PivotReportSchema.index({ table_name: 1 });
PivotReportSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.PivotReport || mongoose.model("PivotReport", PivotReportSchema);
