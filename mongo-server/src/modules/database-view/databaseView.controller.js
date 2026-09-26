// mongo-server/src/modules/database-view/databaseView.controller.js
const DatabaseView = require("../../models/DatabaseView.model");
const Form = require("../../models/Form.model");
const mongoose = require("mongoose");
const { getFormCollectionName, getFormModel } = require("../../utils/formCollection.util");

const getTables = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const allCollections = await db.listCollections().toArray();

    const EXCLUDED = new Set([
      "system.views", "system.buckets", "fs.files", "fs.chunks",
      "database_views", "databaseviews", "formdatas",
      "forms", "formschemas", "masterschemas", "masterdatas",
      "users", "roles", "permissions", "rolepermissions",
      "settings", "tokens", "otps", "auditlogs", "quicklogs",
      "menus", "workflowdefs", "workflowinstances",
    ]);

    const forms = await Form.find({ deleted_at: null })
      .select("title slug table_columns sections root_entity")
      .sort({ title: 1 })
      .lean();

    const formTables = forms.map((f) => ({
      table_name: f.slug,
      display_name: f.title,
      table_type: "FORM",
      description: `Form data (stored in dedicated collection "${getFormCollectionName(f)}")`,
      column_count: (f.sections || []).reduce((n, s) => n + (s.fields || []).length, 0) || (f.table_columns || []).length,
      fk_count: 0,
      _form_slug: f.slug,
    }));

    const formSlugs = new Set(forms.map((f) => f.slug));

    const realCollections = allCollections
      .filter((c) => {
        if (EXCLUDED.has(c.name)) return false;
        if (c.name.startsWith("system.")) return false;
        if (c.options?.viewOn === "formdatas") return false;
        if (formSlugs.has(c.name)) return false;
        return true;
      })
      .map((c) => ({
        table_name: c.name,
        display_name: c.name,
        table_type: c.options?.viewOn ? "VIEW" : "BASE TABLE",
        description: c.options?.viewOn ? `MongoDB view on "${c.options.viewOn}"` : "MongoDB collection",
        column_count: null,
        fk_count: 0,
      }));

    return res.json({
      success: true,
      data: [...formTables, ...realCollections],
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getTableRelationships = async (req, res) => {
  try {
    const { tableName } = req.params;
    const cleanSlug = (tableName || "").replace(/^v_/, "").replace(/^t_frm_/, "").replace(/^t_/, "");
    const db = mongoose.connection.db;

    let form = await Form.findOne({ slug: tableName, deleted_at: null }).lean();
    if (!form && cleanSlug && cleanSlug !== tableName) {
      form = await Form.findOne({ slug: cleanSlug, deleted_at: null }).lean();
    }

    if (form) {
      const columns = [];
      const seen = new Set();

      const envelope = [
        { column_name: "id", data_type: "objectId", is_primary_key: true, label: "ID" },
        { column_name: "_id", data_type: "objectId", is_primary_key: true, label: "ID" },
        { column_name: "form_slug", data_type: "string", is_primary_key: false, label: "Form Slug" },
        { column_name: "status", data_type: "string", is_primary_key: false, label: "Status" },
        { column_name: "created_at", data_type: "date", is_primary_key: false, label: "Created At" },
        { column_name: "updated_at", data_type: "date", is_primary_key: false, label: "Updated At" },
        { column_name: "created_by", data_type: "objectId", is_primary_key: false, label: "Created By" },
      ];
      envelope.forEach((e) => { columns.push({ ...e, is_nullable: "YES", column_default: null }); seen.add(e.column_name); });

      (form.sections || []).forEach((sec) => {
        (sec.fields || []).forEach((fld) => {
          const col = fld.db_field || fld.column_name || fld.id;
          if (!col || seen.has(col)) return;
          seen.add(col);
          columns.push({
            column_name: col,
            data_type: "string",
            is_nullable: fld.required ? "NO" : "YES",
            column_default: null,
            is_primary_key: false,
            label: fld.label || col,
            _mongo_path: `data.${col}`,
          });
        });
      });

      return res.json({
        success: true,
        data: {
          primary_key: "_id",
          base_collection: getFormCollectionName(form),
          form_slug: form.slug,
          columns,
          many_to_one: [],
          one_to_many: [],
          user_audit: [],
        },
      });
    }

    const col = db.collection(tableName);
    const samples = await col.aggregate([{ $sample: { size: 50 } }]).toArray();

    const fieldMap = {};
    for (const doc of samples) {
      for (const [key, val] of Object.entries(doc)) {
        if (!fieldMap[key]) fieldMap[key] = "string";
      }
    }

    const columns = Object.entries(fieldMap).map(([column_name, data_type]) => ({
      column_name,
      data_type,
      is_nullable: "YES",
      column_default: null,
      is_primary_key: column_name === "_id",
    }));

    return res.json({
      success: true,
      data: {
        primary_key: "_id",
        base_collection: tableName,
        columns,
        many_to_one: [],
        one_to_many: [],
        user_audit: [],
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getDependencies = async (req, res) => {
  try {
    const { viewName } = req.params;
    const dependent = await DatabaseView.find({
      source_collection: viewName,
      deleted_at: null,
    }).select("name slug source_collection");
    return res.json({ success: true, data: dependent });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const generateSQL = async (req, res) => {
  try {
    const config = req.body;
    const pipeline = buildPipelineFromConfig(config);
    const sql = JSON.stringify(pipeline, null, 2);
    return res.json({ success: true, sql, pipeline });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

const testSQL = async (req, res) => {
  try {
    const config = req.body;
    const pipeline = buildPipelineFromConfig(config);
    const db = mongoose.connection.db;
    const col = db.collection(config.base_table || config.base_collection || "formdatas");
    await col.aggregate(pipeline).explain();
    return res.json({ success: true, message: "Aggregation pipeline validated successfully!" });
  } catch (e) {
    return res.status(400).json({ success: false, message: `Pipeline Validation Error: ${e.message}` });
  }
};

const previewPipeline = async (req, res) => {
  try {
    const config = req.body;
    const pipeline = buildPipelineFromConfig(config);
    const db = mongoose.connection.db;
    const baseColName = (config.form_slug || config.base_table) ? getFormCollectionName(config.form_slug || config.base_table) : (config.base_collection || "formdatas");
    const col = db.collection(baseColName);
    const previewData = await col.aggregate([...pipeline, { $limit: 10 }]).toArray();

    return res.json({
      success: true,
      count: previewData.length,
      pipeline,
      data: previewData,
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: `Preview execution error: ${e.message}` });
  }
};

const preDeleteCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const view = await DatabaseView.findById(id).catch(() => null)
      || await DatabaseView.findOne({ slug: id });
    if (!view) return res.status(404).json({ success: false, message: "View not found" });
    return res.json({ success: true, can_delete: true, dependencies: [] });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const databaseViewController = {
  listViews: async (req, res) => {
    try {
      const views = await DatabaseView.find({ deleted_at: null }).sort({ created_at: -1 });
      return res.json({ success: true, count: views.length, data: views });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getView: async (req, res) => {
    try {
      const { slug } = req.params;
      const query = mongoose.isValidObjectId(slug)
        ? { $or: [{ _id: slug }, { slug: slug }], deleted_at: null }
        : { slug: slug, deleted_at: null };
      const view = await DatabaseView.findOne(query);
      if (!view) return res.status(404).json({ success: false, message: "View not found" });
      return res.json({ success: true, data: view });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  saveView: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const body = req.body || {};

      const name = (body.name || body.view_name || "").trim();
      const slug = (body.slug || body.view_slug || body.database_view_name || "").trim();
      const base_form_slug = body.base_form_slug || body.form_slug || body.base_table || slug.replace(/^v_/, "");
      const source_collection = body.source_collection || body.base_collection || getFormCollectionName(base_form_slug);
      const view_collection_name = body.view_collection_name || slug || `v_${base_form_slug}`;
      const description = body.description || "";

      if (!slug || !name) {
        return res.status(400).json({ success: false, message: "slug and name are required" });
      }

      let pipeline = body.pipeline;
      if (!Array.isArray(pipeline) || pipeline.length === 0) {
        pipeline = buildPipelineFromConfig(body);
      }

      const viewDoc = await DatabaseView.findOneAndUpdate(
        { slug, deleted_at: null },
        {
          name,
          slug,
          base_form_slug,
          source_collection,
          view_collection_name,
          description,
          pipeline,
          is_active: true,
          updated_by: userId,
        },
        { new: true, upsert: true }
      );

      const db = mongoose.connection.db;
      await applyMongoView(db, view_collection_name, source_collection, pipeline);

      return res.status(201).json({ success: true, message: `View "${slug}" saved and applied`, data: viewDoc });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  queryView: async (req, res) => {
    try {
      const { slug } = req.params;
      const { page = 1, limit = 50, search } = { ...(req.query || {}), ...(req.body || {}) };

      const query = mongoose.isValidObjectId(slug)
        ? { $or: [{ _id: slug }, { slug: slug }], deleted_at: null }
        : { slug: slug, deleted_at: null };
      const viewMeta = await DatabaseView.findOne(query);
      if (!viewMeta) return res.status(404).json({ success: false, message: "View not found" });

      const db = mongoose.connection.db;
      const skip = (Number(page) - 1) * Number(limit);

      const baseCollection = viewMeta.view_collection_name || slug;
      const col = db.collection(baseCollection);

      const [data, total] = await Promise.all([
        col.find({}).skip(skip).limit(Number(limit)).toArray(),
        col.countDocuments({}),
      ]);

      return res.json({
        success: true,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
        data,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteView: async (req, res) => {
    try {
      const { slug } = req.params;
      const query = mongoose.isValidObjectId(slug)
        ? { $or: [{ _id: slug }, { slug: slug }], deleted_at: null }
        : { slug: slug, deleted_at: null };
      const view = await DatabaseView.findOneAndUpdate(query, { deleted_at: new Date(), is_active: false });
      if (!view) return res.status(404).json({ success: false, message: "View not found" });

      try {
        const db = mongoose.connection.db;
        await db.dropCollection(view.view_collection_name || slug);
      } catch (_) {}

      return res.json({ success: true, message: `View "${slug}" deleted` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

async function applyMongoView(db, viewName, viewOn, pipeline) {
  try {
    const existing = await db.listCollections({ name: viewName }).toArray();
    if (existing.length > 0) {
      await db.dropCollection(viewName);
    }
    await db.createCollection(viewName, { viewOn, pipeline });
  } catch (e) {
    console.warn(`Warning creating Mongo view "${viewName}":`, e.message);
  }
}

function buildPipelineFromConfig(config) {
  const formSlug = config.base_form_slug || config.form_slug || config.base_table || "";
  const fields = config.selected_fields || config.fields || [];

  const pipeline = [{ $match: { deleted_at: null } }];
  const project = {
    _id: 1,
    id: "$_id",
    form_slug: 1,
    status: 1,
    created_at: 1,
    updated_at: 1,
    data: "$data",
  };

  fields.forEach((f) => {
    const key = f.key || f.column_name || f.field || String(f);
    if (key && !project[key]) {
      project[key] = `$data.${key}`;
    }
  });

  pipeline.push({ $project: project });
  return pipeline;
}

module.exports = {
  getTables,
  getTableRelationships,
  getDependencies,
  generateSQL,
  testSQL,
  previewPipeline,
  preDeleteCheck,
  listViews: databaseViewController.listViews,
  getView: databaseViewController.getView,
  saveView: databaseViewController.saveView,
  queryView: databaseViewController.queryView,
  deleteView: databaseViewController.deleteView,
};
