// mongo-server/src/models/FormSchema.model.js
const mongoose = require('mongoose');

const FormSchemaDef = new mongoose.Schema(
  {
    form_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', default: null },
    form_code: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    table_name: { type: String, trim: true },
    description: { type: String, default: '' },
    is_master: { type: Boolean, default: false },
    is_published: { type: Boolean, default: true },
    enable_approval: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    version: { type: Number, default: 1 },
    table_columns: { type: Array, default: [] },
    sections: { type: Array, default: [] },
    root_entity: { type: mongoose.Schema.Types.Mixed, default: {} },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

FormSchemaDef.index({ form_id: 1 });
FormSchemaDef.index({ form_code: 1 });
FormSchemaDef.index({ deleted_at: 1 });

module.exports = mongoose.models.FormSchema || mongoose.model('FormSchema', FormSchemaDef);
