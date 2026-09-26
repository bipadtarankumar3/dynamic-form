// mongo-server/src/utils/formCollection.util.js
const mongoose = require('mongoose');
const Form = require('../models/Form.model');

const EXCLUDED_SYSTEM_NAMES = new Set([
  'system.views',
  'system.buckets',
  'fs.files',
  'fs.chunks',
  'database_views',
  'databaseviews',
  'forms',
  'masterschemas',
  'masterdatas',
  'users',
  'roles',
  'permissions',
  'rolepermissions',
  'role_permissions',
  'settings',
  'tokens',
  'otps',
  'auditlogs',
  'audit_logs',
  'quicklogs',
  'menus',
  'workflowdefs',
  'workflowinstances',
  'documents',
  'volunteeringstories',
  'volunteeringstorycomments',
  'volunteeringstorylikes',
  'notifications',
  'ngoduediligenceversions',
]);

/**
 * Returns the MongoDB collection name for a given form or form slug.
 * Prioritizes form.root_entity.table or table_name, falling back to form.slug.
 * Automatically prefixes if the name conflicts with system collections.
 */
function getFormCollectionName(formOrSlug, customTable = null) {
  if (!formOrSlug) return 'form_default';

  let slug = typeof formOrSlug === 'string' ? formOrSlug : formOrSlug?.slug;
  let targetTable =
    customTable ||
    (typeof formOrSlug === 'object'
      ? formOrSlug?.root_entity?.table || formOrSlug?.table_name
      : null);

  if (targetTable && typeof targetTable === 'string' && targetTable.trim()) {
    const cleanTable = targetTable.trim().toLowerCase();
    if (!EXCLUDED_SYSTEM_NAMES.has(cleanTable)) {
      return cleanTable;
    }
    return `form_${cleanTable}`;
  }

  const cleanSlug = (slug || '').trim().toLowerCase();
  if (cleanSlug.startsWith('form_') || cleanSlug.startsWith('t_frm_')) {
    return cleanSlug;
  }
  if (EXCLUDED_SYSTEM_NAMES.has(cleanSlug)) {
    return `form_${cleanSlug}`;
  }
  return cleanSlug || 'form_default';
}

/**
 * Returns or creates a Mongoose Model for a dedicated form collection.
 * Maintains full schema flexibility while offering Mongoose CRUD, indexes, and population.
 */
function getFormModel(formOrSlug, customTable = null) {
  const collectionName = getFormCollectionName(formOrSlug, customTable);

  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }

  const DynamicFormSchema = new mongoose.Schema(
    {
      form_slug: { type: String, required: false, index: true },
      form_version: { type: Number, default: 1 },
      parent_id: { type: mongoose.Schema.Types.Mixed, default: null },
      status: { type: String, default: 'draft', index: true },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      deleted_at: { type: Date, default: null, index: true },
    },
    {
      collection: collectionName,
      timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
      strict: false,
    }
  );

  DynamicFormSchema.index({ deleted_at: 1, created_at: -1 });
  DynamicFormSchema.index({ form_slug: 1, deleted_at: 1 });
  DynamicFormSchema.index({ status: 1, deleted_at: 1 });
  DynamicFormSchema.index({ parent_id: 1 });

  return mongoose.model(collectionName, DynamicFormSchema);
}

/**
 * Helper to retrieve the Form definition and its dedicated Mongoose model.
 */
async function resolveFormAndModel(formSlug) {
  if (!formSlug) return { form: null, model: null, Model: null, collectionName: null };

  const cleanSlug = String(formSlug).trim();
  const form = await Form.findOne({
    $or: [
      { slug: cleanSlug },
      { slug: cleanSlug.toLowerCase() },
      { form_code: cleanSlug },
      { form_code: cleanSlug.toLowerCase() },
      { 'root_entity.table': cleanSlug },
      { 'root_entity.table': cleanSlug.toLowerCase() },
      { table_name: cleanSlug },
      { table_name: cleanSlug.toLowerCase() }
    ],
    deleted_at: null,
  }).lean();

  const collectionName = getFormCollectionName(form || cleanSlug);
  const model = getFormModel(form || cleanSlug);

  return { form, model, Model: model, collectionName };
}

/**
 * getFormCollection alias for convenience across controllers
 */
async function getFormCollection(formSlug) {
  return resolveFormAndModel(formSlug);
}

module.exports = {
  EXCLUDED_SYSTEM_NAMES,
  getFormCollectionName,
  getFormModel,
  resolveFormAndModel,
  getFormCollection,
};
