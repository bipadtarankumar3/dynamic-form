// mongo-server/src/models/DatabaseView.model.js
// Stores MongoDB aggregation view metadata (equivalent to PostgreSQL app_database_views table)
const mongoose = require("mongoose");

const DatabaseViewSchema = new mongoose.Schema({
  view_name:            { type: String, required: true, trim: true },
  view_slug:            { type: String, required: true, unique: true, trim: true },
  base_collection:      { type: String, required: true }, // source collection (e.g. "formdatas")
  form_slug:            { type: String, default: null },
  description:          { type: String, default: "" },
  status:               { type: String, default: "ACTIVE", enum: ["ACTIVE", "INACTIVE"] },
  is_active:            { type: Boolean, default: true },
  // MongoDB aggregation pipeline steps stored as JSON
  pipeline:             { type: [mongoose.Schema.Types.Mixed], default: [] },
  // Column display config for the frontend list view
  configuration:        { type: mongoose.Schema.Types.Mixed, default: {} },
  auto_generated:       { type: Boolean, default: true },
  created_by:           { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updated_by:           { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleted_at:           { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

DatabaseViewSchema.index({ view_slug: 1 });
DatabaseViewSchema.index({ form_slug: 1 });

module.exports = mongoose.model("DatabaseView", DatabaseViewSchema);
