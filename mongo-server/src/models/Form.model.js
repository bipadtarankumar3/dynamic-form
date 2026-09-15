// mongo-server/src/models/Form.model.js
// Full form schema definition — mirrors t_form table from PostgreSQL server
const mongoose = require("mongoose");

const FormSchema = new mongoose.Schema({
  form_id:              { type: String, default: null },
  title:                { type: String, required: true, trim: true },
  slug:                 { type: String, required: true, unique: true, trim: true, index: true },
  description:          { type: String, default: "" },
  root_entity:          { type: mongoose.Schema.Types.Mixed, default: {} }, // { table, primary_key }
  context:              { type: mongoose.Schema.Types.Mixed, default: {} },
  api:                  { type: mongoose.Schema.Types.Mixed, default: {} },
  actions:              { type: mongoose.Schema.Types.Mixed, default: {} },
  enable_action_tabs:   { type: Boolean, default: false },
  action_tabs:          { type: [mongoose.Schema.Types.Mixed], default: [] },
  sections:             { type: [mongoose.Schema.Types.Mixed], default: [] }, // Full field definitions
  table_columns:        { type: [mongoose.Schema.Types.Mixed], default: [] },
  triggers:             { type: [mongoose.Schema.Types.Mixed], default: [] },
  enable_approval:      { type: Boolean, default: false },
  view_name:            { type: String, default: null },
  view_slug:            { type: String, default: null },
  relation_with_parent: { type: mongoose.Schema.Types.Mixed, default: {} },
  relation_with_children: { type: [mongoose.Schema.Types.Mixed], default: [] },
  parent_id:            { type: String, default: null },
  parent_form_id:       { type: String, default: null },
  is_draft:             { type: Boolean, default: false },
  is_master:            { type: Boolean, default: false },
  is_active:            { type: Boolean, default: true },
  modal_size:           { type: String, default: "1400" },
  created_by:           { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updated_by:           { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleted_at:           { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

FormSchema.index({ is_master: 1 });
FormSchema.index({ deleted_at: 1 });

module.exports = mongoose.model("Form", FormSchema);
