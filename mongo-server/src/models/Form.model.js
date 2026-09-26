// mongo-server/src/models/Form.model.js
const mongoose = require("mongoose");

const FormSchema = new mongoose.Schema(
  {
    form_id: { type: String, trim: true },
    form_code: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    table_name: { type: String, trim: true },
    description: { type: String, default: "" },
    parent_form_id: { type: String, default: null },
    is_master: { type: Boolean, default: false },
    is_draft: { type: Boolean, default: false },
    is_published: { type: Boolean, default: true },
    is_editable: { type: Boolean, default: true },
    enable_approval: { type: Boolean, default: false },
    approval_workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowDef", default: null },
    status: { type: String, enum: ["draft", "published", "archived"], default: "published" },
    version: { type: Number, default: 1 },
    modal_size: { type: String, default: "1400" },
    root_entity: {
      table: { type: String, default: "" },
      modal_size: { type: String, default: "1400" },
      primary_key: { type: String, default: "id" },
    },
    view_name: { type: String, default: null },
    view_slug: { type: String, default: null },
    enable_action_tabs: { type: Boolean, default: false },
    action_tabs: { type: Array, default: [] },
    actions: { type: mongoose.Schema.Types.Mixed, default: [] },
    triggers: { type: Array, default: [] },
    relation_with_parent: { type: mongoose.Schema.Types.Mixed, default: null },
    relation_with_children: { type: Array, default: [] },
    table_columns: [
      {
        key: { type: String },
        label: { type: String },
        type: { type: String, default: "text" },
        checked: { type: Boolean, default: true },
        sortable: { type: Boolean, default: true },
        filterable: { type: Boolean, default: true },
      },
    ],
    sections: [
      {
        section_id: { type: String },
        section_label: { type: String },
        type: { type: String, enum: ["general", "add_more", "table", "custom"], default: "general" },
        slug: { type: String },
        table: { type: String },
        table_name: { type: String },
        primary_key: { type: String, default: "id" },
        relation: {
          foreign_key: { type: String, default: "parent_id" },
          parent_table: { type: String, default: "" },
        },
        context: { type: mongoose.Schema.Types.Mixed, default: null },
        fields: [
          {
            id: { type: String },
            label: { type: String },
            type: { type: String },
            db_field: { type: String },
            column_name: { type: String },
            data_type: { type: String },
            required: { type: Boolean, default: false },
            visible: { type: Boolean, default: true },
            options: [{ label: String, value: mongoose.Schema.Types.Mixed }],
            data_source: { type: mongoose.Schema.Types.Mixed, default: null },
            options_source: { type: String, default: null },
            options_source_table: { type: String, default: null },
            ui: { type: mongoose.Schema.Types.Mixed, default: {} },
            validation: { type: mongoose.Schema.Types.Mixed, default: {} },
            conditions: { type: mongoose.Schema.Types.Mixed, default: null },
            add_to_query: { type: Boolean, default: true },
            add_to_list: { type: Boolean, default: true },
            multiple: { type: Boolean, default: false },
            allow_multiple: { type: Boolean, default: false },
          },
        ],
      },
    ],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strict: false,
  }
);

FormSchema.index({ slug: 1, deleted_at: 1 });
FormSchema.index({ is_master: 1, deleted_at: 1 });

module.exports = mongoose.models.Form || mongoose.model("Form", FormSchema);

