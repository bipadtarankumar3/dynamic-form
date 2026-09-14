// mongo-server/src/modules/dynamic-form/dynamicForm.controller.js
// Core dynamic form engine — handles add, edit, list, details, view, schema-details, master-details
const Form = require("../../models/Form.model");
const FormData = require("../../models/FormData.model");
const MasterSchema = require("../../models/MasterSchema.model");
const MasterData = require("../../models/MasterData.model");
const AuditLog = require("../../models/AuditLog.model");
const DatabaseView = require("../../models/DatabaseView.model");
const mongoose = require("mongoose");

// ---- Helpers ----

function getFormSchema(form_slug) {
  return Form.findOne({ slug: form_slug, deleted_at: null });
}

// Resolve master dropdown options by field config
async function resolveMasterOptions(field) {
  if (!field.master_slug) return [];
  const masterData = await MasterData.find({ master_slug: field.master_slug, deleted_at: null, is_active: true }).lean();
  const masterSchema = await MasterSchema.findOne({ slug: field.master_slug, deleted_at: null }).lean();
  const labelField = masterSchema?.label_field || "name";
  return masterData.map(d => ({ value: d._id.toString(), label: d.data?.[labelField] || d.data?.name || String(d._id) }));
}

const dynamicFormController = {

  // ================================================================
  // SCHEMA DETAILS — return form definition for client renderer
  // ================================================================
  schemaDetails: async (req, res) => {
    try {
      const { form_slug } = req.body;
      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: `Form schema "${form_slug}" not found` });

      return res.json({ success: true, data: form });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // MASTER DETAILS — return master dropdown options for a given master_slug
  // ================================================================
  masterDetails: async (req, res) => {
    try {
      const { master_slug, search, page = 1, limit = 100 } = req.body;
      if (!master_slug) return res.status(400).json({ success: false, message: "master_slug is required" });

      const masterSchema = await MasterSchema.findOne({ slug: master_slug, deleted_at: null }).lean();
      if (!masterSchema) return res.status(404).json({ success: false, message: `Master "${master_slug}" not found` });

      const labelField = masterSchema.label_field || "name";

      const query = { master_slug, deleted_at: null, is_active: true };
      if (search) {
        query[`data.${labelField}`] = { $regex: search, $options: "i" };
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [records, total] = await Promise.all([
        MasterData.find(query).skip(skip).limit(Number(limit)).lean(),
        MasterData.countDocuments(query),
      ]);

      const data = records.map(r => ({
        value: r._id.toString(),
        label: r.data?.[labelField] || r.data?.name || String(r._id),
        ...r.data,
        _id: r._id,
      }));

      return res.json({ success: true, total, data });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // ADD — save a new form record
  // ================================================================
  add: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, ...formData } = req.body;

      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(400).json({ success: false, message: "Invalid form schema" });

      // Remove internal keys
      const { form_slug: _fs, form_id: _fi, ...cleanData } = formData;

      // Attach any uploaded files
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file) => {
          cleanData[file.fieldname] = file.filename || file.originalname;
        });
      }

      const record = await FormData.create({
        form_slug,
        form_version: form.version || 1,
        status: cleanData.status || "draft",
        data: cleanData,
        created_by: userId,
        updated_by: userId,
      });

      await AuditLog.create({ action: "create", module: form_slug, record_id: record._id, user_id: userId, new_data: cleanData });

      return res.status(201).json({ success: true, message: "Record created successfully", data: { id: record._id } });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // EDIT — update an existing form record
  // ================================================================
  edit: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, record_id, id, ...formData } = req.body;
      const targetId = record_id || id;

      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });
      if (!targetId) return res.status(400).json({ success: false, message: "record_id is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(400).json({ success: false, message: "Invalid form schema" });

      const existing = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null }).lean();
      if (!existing) return res.status(404).json({ success: false, message: "Record not found" });

      const { form_slug: _fs, ...cleanData } = formData;

      // Attach any uploaded files
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file) => {
          cleanData[file.fieldname] = file.filename || file.originalname;
        });
      }

      await FormData.findByIdAndUpdate(targetId, {
        data: { ...existing.data, ...cleanData },
        status: cleanData.status || existing.status,
        updated_by: userId,
      });

      await AuditLog.create({ action: "update", module: form_slug, record_id: targetId, user_id: userId, old_data: existing.data, new_data: cleanData });

      return res.json({ success: true, message: "Record updated successfully" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // GENERAL LIST VIEW — paginated list from MongoDB view or collection
  // ================================================================
  generalListView: async (req, res) => {
    try {
      const { form_slug, page = 1, limit = 20, search, sort_field, sort_order, filters = [] } = req.body;
      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const viewSlug = `v_${form_slug}`;
      const db = mongoose.connection.db;
      const skip = (Number(page) - 1) * Number(limit);

      // Build filter query
      const matchQuery = { deleted_at: null };
      if (search && form.table_columns?.length > 0) {
        const searchFields = form.table_columns
          .filter(c => c.checked !== false)
          .map(c => ({ [`data.${c.key}`]: { $regex: search, $options: "i" } }));
        if (searchFields.length > 0) matchQuery.$or = searchFields;
      }

      // Apply additional filters
      for (const f of filters) {
        if (f.field && f.value !== undefined) {
          matchQuery[`data.${f.field}`] = f.operator === "contains"
            ? { $regex: f.value, $options: "i" }
            : f.value;
        }
      }

      matchQuery.form_slug = form_slug;

      // Sort
      const sortObj = {};
      if (sort_field) {
        sortObj[sort_field === "created_at" ? "created_at" : `data.${sort_field}`] = sort_order === "desc" ? -1 : 1;
      } else {
        sortObj.created_at = -1;
      }

      // Try querying the MongoDB view first, fallback to direct FormData collection
      let viewExists = false;
      try {
        const views = await db.listCollections({ name: viewSlug }).toArray();
        viewExists = views.length > 0;
      } catch (_) {}

      let records, total;

      if (viewExists) {
        // Query the MongoDB view
        const viewCollection = db.collection(viewSlug);
        const [recs, cnt] = await Promise.all([
          viewCollection.find({}).skip(skip).limit(Number(limit)).sort(sortObj).toArray(),
          viewCollection.countDocuments({}),
        ]);
        records = recs.map((r) => ({
          id: r._id,
          ...(r.data || {}),
          ...r,
        }));
        total = cnt;
      } else {
        // Fallback: query FormData directly
        [records, total] = await Promise.all([
          FormData.find(matchQuery).skip(skip).limit(Number(limit)).sort(sortObj).lean(),
          FormData.countDocuments(matchQuery),
        ]);

        // Flatten data fields for response
        records = records.map((r) => ({
          id: r._id,
          ...r.data,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
      }

      // Ensure table_columns has columns if not specified
      let tableColumns = form.table_columns || [];
      if (tableColumns.length === 0 && form.sections?.length > 0) {
        tableColumns = [];
        form.sections.forEach((sec) => {
          (sec.fields || []).forEach((fld) => {
            const k = fld.db_field || fld.id;
            if (k && !tableColumns.some((c) => c.key === k)) {
              tableColumns.push({ key: k, label: fld.label || k, type: fld.type || "text" });
            }
          });
        });
      }

      return res.json({
        success: true,
        schema: {
          title: form.title,
          slug: form.slug,
          table_columns: tableColumns,
          actions: form.actions || {},
          enable_approval: form.enable_approval || false,
        },
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
        data: records,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // DETAILS — load single record for editing
  // ================================================================
  details: async (req, res) => {
    try {
      const { form_slug, record_id, id } = req.body;
      const targetId = record_id || id;

      if (!form_slug || !targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const record = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null }).lean();
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });

      return res.json({
        success: true,
        schema: form,
        data: { id: record._id, ...record.data, status: record.status, created_at: record.created_at },
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // VIEW — load single record for view-only (read mode)
  // ================================================================
  viewById: async (req, res) => {
    try {
      const { form_slug, record_id, id } = req.body;
      const targetId = record_id || id;

      if (!form_slug || !targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const form = await getFormSchema(form_slug);
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const record = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null })
        .populate("created_by", "name email")
        .lean();
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });

      return res.json({
        success: true,
        schema: form,
        data: {
          id: record._id,
          ...record.data,
          status: record.status,
          created_at: record.created_at,
          created_by: record.created_by,
        },
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // ACTIVE / INACTIVE — toggle record status
  // ================================================================
  activeInactive: async (req, res) => {
    try {
      const { form_slug, record_id, id, is_active } = req.body;
      const targetId = record_id || id;
      if (!form_slug || !targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const record = await FormData.findOne({ _id: targetId, form_slug, deleted_at: null });
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });

      const newStatus = is_active === false ? "inactive" : "active";
      await FormData.findByIdAndUpdate(targetId, { "data.is_active": is_active !== false, status: newStatus });

      return res.json({ success: true, message: `Record ${is_active !== false ? "activated" : "deactivated"}` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ================================================================
  // SOFT DELETE — mark record deleted
  // ================================================================
  deleteRecord: async (req, res) => {
    try {
      const { form_slug, record_id, id } = req.body;
      const targetId = record_id || id;
      if (!form_slug || !targetId) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      await FormData.findOneAndUpdate({ _id: targetId, form_slug, deleted_at: null }, { deleted_at: new Date(), updated_by: req.user?.user_id });

      await AuditLog.create({ action: "delete", module: form_slug, record_id: targetId, user_id: req.user?.user_id });

      return res.json({ success: true, message: "Record deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = dynamicFormController;
