// mongo-server/src/modules/database-view/databaseView.controller.js
// MongoDB equivalent of PostgreSQL app_database_views
// Instead of SQL CREATE VIEW, we use db.createCollection with viewOn + pipeline
const DatabaseView = require("../../models/DatabaseView.model");
const Form = require("../../models/Form.model");
const mongoose = require("mongoose");

// -------------------------------------------------------
// SCHEMA DISCOVERY
// In MongoDB all form data lives in `formdatas` filtered by form_slug.
// We expose each Form schema as a virtual "table" so the wizard can
// pick "Project" as a base table and we build:
//   pipeline: [{ $match: { form_slug: "project" } }, ...]
//   viewOn: "formdatas"
// -------------------------------------------------------

/**
 * GET /schema/tables
 * Returns every Form schema as a virtual "table" (BASE TABLE) plus
 * any real MongoDB collections that are not formdatas-derived views.
 */
const getTables = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const allCollections = await db.listCollections().toArray();

    // Internal / system names to skip
    const EXCLUDED = new Set([
      "system.views", "system.buckets", "fs.files", "fs.chunks",
      "database_views", "databaseviews", "formdatas",
      "forms", "formschemas", "masterschemas", "masterdatas",
      "users", "roles", "permissions", "rolepermissions",
      "settings", "tokens", "otps", "auditlogs", "quicklogs",
      "menus", "workflowdefs", "workflowinstances",
    ]);

    // ── 1. Form schemas → virtual "tables" ─────────────────────────────
    const forms = await Form.find({ deleted_at: null })
      .select("title slug table_columns sections root_entity")
      .sort({ title: 1 })
      .lean();

    const formTables = forms.map((f) => ({
      table_name: f.slug,                        // wizard sends this as base_table
      display_name: f.title,
      table_type: "FORM",                        // custom marker so UI can label it
      description: `Form data (stored in formdatas, form_slug = "${f.slug}")`,
      column_count: countFormFields(f),
      fk_count: 0,
      _form_slug: f.slug,                        // used by getTableRelationships
    }));

    const formSlugs = new Set(forms.map((f) => f.slug));

    // ── 2. Real MongoDB collections (non-form, non-view) ───────────────
    const realCollections = allCollections
      .filter((c) => {
        if (EXCLUDED.has(c.name)) return false;
        if (c.name.startsWith("system.")) return false;
        // skip auto-generated form views (v_<slug>)
        if (c.options?.viewOn === "formdatas") return false;
        if (formSlugs.has(c.name)) return false;      // already listed as FORM
        return true;
      })
      .map((c) => ({
        table_name: c.name,
        display_name: c.name,
        table_type: c.options?.viewOn ? "VIEW" : "BASE TABLE",
        description: c.options?.viewOn
          ? `MongoDB view on "${c.options.viewOn}"`
          : "MongoDB collection",
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

/** Count fields across all sections of a form */
function countFormFields(form) {
  let n = 0;
  (form.sections || []).forEach((s) => { n += (s.fields || []).length; });
  return n || (form.table_columns || []).length;
}

/**
 * GET /schema/tables/:tableName
 *
 * If tableName matches a Form slug → return that form's fields derived from
 * its sections (accurate, zero sampling needed).
 * Otherwise → sample 50 docs from the raw collection and infer field types.
 *
 * The response shape is compatible with the PostgreSQL wizard so the same
 * Step2/Step3 components work unchanged.
 */
const getTableRelationships = async (req, res) => {
  try {
    const { tableName } = req.params;
    const cleanSlug = (tableName || "").replace(/^v_/, "").replace(/^t_frm_/, "").replace(/^t_/, "");
    const db = mongoose.connection.db;

    // ── Try to resolve as a Form schema first ──────────────────────────
    let form = await Form.findOne({
      slug: tableName,
      deleted_at: null,
    }).lean();

    if (!form && cleanSlug && cleanSlug !== tableName) {
      form = await Form.findOne({
        slug: cleanSlug,
        deleted_at: null,
      }).lean();
    }

    if (form) {
      // Build columns from the form's field definitions
      const columns = [];
      const seen = new Set();

      // Always include standard formdatas envelope fields
      const envelope = [
        { column_name: "id",         data_type: "objectId", is_primary_key: true, label: "ID"  },
        { column_name: "_id",        data_type: "objectId", is_primary_key: true, label: "ID"  },
        { column_name: "form_slug",  data_type: "string",   is_primary_key: false, label: "Form Slug" },
        { column_name: "status",     data_type: "string",   is_primary_key: false, label: "Status" },
        { column_name: "created_at", data_type: "date",     is_primary_key: false, label: "Created At" },
        { column_name: "updated_at", data_type: "date",     is_primary_key: false, label: "Updated At" },
        { column_name: "created_by", data_type: "objectId", is_primary_key: false, label: "Created By" },
      ];
      envelope.forEach((e) => { columns.push({ ...e, is_nullable: "YES", column_default: null }); seen.add(e.column_name); });

      // Add form-specific data fields (nested under `data.*` in formdatas)
      (form.sections || []).forEach((sec) => {
        (sec.fields || []).forEach((fld) => {
          const col = fld.db_field || fld.column_name || fld.id;
          if (!col || seen.has(col)) return;
          seen.add(col);
          columns.push({
            column_name: col,
            data_type: fldTypeToMongoType(fld.type || "text"),
            is_nullable: fld.required ? "NO" : "YES",
            column_default: null,
            is_primary_key: false,
            label: fld.label || col,
            // tag so the wizard knows to prefix with `data.` in the pipeline
            _mongo_path: `data.${col}`,
          });
        });
      });

      // Also add table_columns entries if sections are empty
      if (columns.length <= envelope.length) {
        (form.table_columns || []).forEach((col) => {
          const key = col.key || col.db_field;
          if (!key || seen.has(key)) return;
          seen.add(key);
          columns.push({
            column_name: key,
            data_type: "string",
            is_nullable: "YES",
            column_default: null,
            is_primary_key: false,
            label: col.label || key,
            _mongo_path: `data.${key}`,
          });
        });
      }

      const many_to_one = [];
      const one_to_many = [];
      const user_audit = [
        {
          key: "created_by",
          source_column: "created_by",
          target_table: "users",
          target_pk: "_id",
          relationship_type: "USER_AUDIT",
          label: "Created By User",
        },
      ];

      // 1. Parent Form Relationship
      if (form.parent_form_id) {
        const parentForm = await Form.findById(form.parent_form_id).lean();
        if (parentForm) {
          many_to_one.push({
            key: `parent_${parentForm.slug}`,
            source_column: "parent_id",
            target_table: parentForm.slug,
            target_pk: "_id",
            relationship_type: "PARENT",
            label: `${parentForm.title} (Parent)`,
          });
        }
      }

      // 2. Master / Foreign Key Select Fields
      (form.sections || []).forEach((sec) => {
        (sec.fields || []).forEach((fld) => {
          const col = fld.db_field || fld.column_name || fld.id;
          const isMaster =
            fld.type === "select" ||
            fld.data_source?.type === "master" ||
            fld.options_source === "master" ||
            fld.data_source?.name ||
            fld.data_source?.table_name ||
            fld.data_source?.slug;

          if (col && isMaster) {
            const targetTable =
              fld.data_source?.table_name ||
              fld.data_source?.name ||
              fld.data_source?.slug ||
              col;
            many_to_one.push({
              key: `${form.slug}_${col}`,
              source_column: col,
              target_table: targetTable,
              target_pk: fld.data_source?.primary_key || "_id",
              relationship_type: "MASTER",
              label: fld.label || col,
            });
          }
        });
      });

      // 3. One-to-Many: Child forms that reference this form as parent
      const childForms = await Form.find({ parent_form_id: form._id, deleted_at: null }).lean();
      childForms.forEach((cf) => {
        one_to_many.push({
          key: `child_${cf.slug}`,
          child_table: cf.slug,
          child_foreign_key: "parent_id",
          parent_primary_key: "_id",
          relationship_type: "CHILD",
          label: `${cf.title} (Child)`,
        });
      });

      // 4. One-to-Many: Add-More Sub-Tables
      (form.sections || []).forEach((sec) => {
        if (sec.type === "add_more" && sec.storage_type === "table") {
          const subTable = sec.table_name || sec.slug;
          if (subTable) {
            one_to_many.push({
              key: `sub_${subTable}`,
              child_table: subTable,
              child_foreign_key: "parent_id",
              parent_primary_key: "_id",
              relationship_type: "CHILD",
              label: `${sec.section_label || subTable} (Sub Table)`,
            });
          }
        }
      });

      return res.json({
        success: true,
        data: {
          primary_key: "_id",
          base_collection: "formdatas",   // actual MongoDB collection
          form_slug: form.slug,           // used by pipeline builder
          columns,
          many_to_one,
          one_to_many,
          user_audit,
        },
      });
    }

    // ── Fallback: sample raw collection ───────────────────────────────
    const col = db.collection(tableName);
    const samples = await col.aggregate([{ $sample: { size: 50 } }]).toArray();

    const fieldMap = {};
    for (const doc of samples) {
      for (const [key, val] of Object.entries(doc)) {
        if (!fieldMap[key]) fieldMap[key] = mongoTypeOf(val);
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

/** Map form field types → MongoDB data type labels */
function fldTypeToMongoType(type) {
  const map = {
    text: "string", textarea: "string", email: "string", url: "string",
    number: "double", integer: "int",
    date: "date", datetime: "date",
    boolean: "boolean", checkbox: "boolean",
    select: "string", radio: "string", multiselect: "array",
    file: "string", image: "string",
    object: "object", json: "object",
  };
  return map[type] || "string";
}

/**
 * GET /dependencies/:viewName
 * Returns which other views/collections reference this view.
 */
const getDependencies = async (req, res) => {
  try {
    const { viewName } = req.params;
    const dependent = await DatabaseView.find({
      base_collection: viewName,
      deleted_at: null,
    }).select("view_name view_slug base_collection");
    return res.json({ success: true, data: dependent });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /generate-sql
 * For MongoDB: "SQL" = pretty-printed aggregation pipeline JSON
 */
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

/**
 * POST /test-sql
 * Validate the aggregation pipeline by running an explain against the collection.
 */
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

/**
 * POST /preview-pipeline
 * Runs the aggregation pipeline derived from the wizard config and returns live preview records.
 */
const previewPipeline = async (req, res) => {
  try {
    const config = req.body;
    const pipeline = buildPipelineFromConfig(config);
    const db = mongoose.connection.db;
    const baseColName = (config.form_slug || config.base_table) ? "formdatas" : (config.base_table || config.base_collection || "formdatas");
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

/**
 * GET /pre-delete-check/:id
 */
const preDeleteCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const view = await DatabaseView.findById(id).catch(() => null)
      || await DatabaseView.findOne({ view_slug: id });
    if (!view) return res.status(404).json({ success: false, message: "View not found" });
    return res.json({ success: true, can_delete: true, dependencies: [] });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const databaseViewController = {

  // List all database views
  listViews: async (req, res) => {
    try {
      const views = await DatabaseView.find({ deleted_at: null })
        .select("-pipeline")
        .sort({ created_at: -1 });
      return res.json({ success: true, count: views.length, data: views });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getView: async (req, res) => {
    try {
      const { slug } = req.params;
      const query = mongoose.isValidObjectId(slug)
        ? { $or: [{ _id: slug }, { view_slug: slug }], deleted_at: null }
        : { view_slug: slug, deleted_at: null };
      const view = await DatabaseView.findOne(query);
      if (!view) return res.status(404).json({ success: false, message: "View not found" });
      return res.json({ success: true, data: view });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Create or update a database view
  saveView: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const body = req.body || {};

      const view_name = (body.view_name || "").trim();
      const view_slug = (body.view_slug || body.database_view_name || "").trim();
      const form_slug = body.form_slug || body.base_table || null;
      const base_collection = body.base_collection || (form_slug ? "formdatas" : body.base_table) || "formdatas";
      const description = body.description || "";

      if (!view_slug || !view_name || !base_collection) {
        return res.status(400).json({ success: false, message: "view_slug, view_name, and base_collection are required" });
      }

      // Auto-build aggregation pipeline from config if not provided directly
      let pipeline = body.pipeline;
      if (!Array.isArray(pipeline) || pipeline.length === 0) {
        pipeline = buildPipelineFromConfig(body);
      }

      const configuration = body.configuration || body;

      // Save metadata
      const viewDoc = await DatabaseView.findOneAndUpdate(
        { view_slug, deleted_at: null },
        {
          view_name,
          view_slug,
          base_collection,
          form_slug: form_slug || null,
          description,
          pipeline,
          configuration,
          is_active: true,
          status: "ACTIVE",
          auto_generated: false,
          updated_by: userId
        },
        { new: true, upsert: true }
      );

      // Apply MongoDB view
      const db = mongoose.connection.db;
      await applyMongoView(db, view_slug, base_collection, pipeline);

      return res.status(201).json({ success: true, message: `View "${view_slug}" saved and applied to MongoDB`, data: viewDoc });
    } catch (e) {
      console.error("[DatabaseView saveView Error]:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // Preview view results with optional filtering
  queryView: async (req, res) => {
    try {
      const { slug } = req.params;
      const { page = 1, limit = 20, search, search_fields = [] } = { ...(req.query || {}), ...(req.body || {}) };

      const query = mongoose.isValidObjectId(slug)
        ? { $or: [{ _id: slug }, { view_slug: slug }], deleted_at: null }
        : { view_slug: slug, deleted_at: null };
      const viewMeta = await DatabaseView.findOne(query);
      if (!viewMeta) return res.status(404).json({ success: false, message: "View not found" });

      const db = mongoose.connection.db;
      const skip = (Number(page) - 1) * Number(limit);

      let matchFilter = {};
      if (search && Array.isArray(search_fields) && search_fields.length > 0) {
        matchFilter.$or = search_fields.map(f => ({ [f]: { $regex: search, $options: "i" } }));
      }

      const aggPipeline = [
        ...(viewMeta.pipeline || []),
        ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
      ];

      const countPipeline = [...aggPipeline, { $count: "total" }];
      const dataPipeline = [...aggPipeline, { $skip: skip }, { $limit: Number(limit) }];

      const baseCollection = viewMeta.base_collection || "formdatas";
      const viewCollection = db.collection(baseCollection);
      const [countResult, data] = await Promise.all([
        viewCollection.aggregate(countPipeline).toArray(),
        viewCollection.aggregate(dataPipeline).toArray(),
      ]);

      const total = countResult[0]?.total || 0;

      // Extract columns metadata for UI discovery
      const columns = [];
      const seenCol = new Set();
      if (Array.isArray(viewMeta.configuration?.selected_fields) && viewMeta.configuration.selected_fields.length > 0) {
        viewMeta.configuration.selected_fields.forEach((f) => {
          const cName = f.alias || f.field;
          if (cName && !seenCol.has(cName)) {
            seenCol.add(cName);
            columns.push({
              column_name: cName,
              field: f.field,
              alias: f.alias,
              data_type: f.data_type || "string",
            });
          }
        });
      } else if (Array.isArray(viewMeta.configuration?.fields) && viewMeta.configuration.fields.length > 0) {
        viewMeta.configuration.fields.forEach((f) => {
          const cName = f.key || f.column_name || f.db_field;
          if (cName && !seenCol.has(cName)) {
            seenCol.add(cName);
            columns.push({
              column_name: cName,
              field: cName,
              alias: f.label || cName,
              data_type: "string",
            });
          }
        });
      } else if (data.length > 0) {
        Object.keys(data[0]).forEach((k) => {
          if (k !== "_id" && !seenCol.has(k)) {
            seenCol.add(k);
            columns.push({ column_name: k, field: k, alias: k, data_type: "string" });
          }
        });
      }

      return res.json({
        success: true,
        view_meta: { view_name: viewMeta.view_name, view_slug: viewMeta.view_slug, configuration: viewMeta.configuration },
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
        columns,
        data,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Refresh / reapply MongoDB view from saved pipeline
  refreshView: async (req, res) => {
    try {
      const { slug } = req.params;
      const query = mongoose.isValidObjectId(slug)
        ? { $or: [{ _id: slug }, { view_slug: slug }], deleted_at: null }
        : { view_slug: slug, deleted_at: null };
      const view = await DatabaseView.findOne(query);
      if (!view) return res.status(404).json({ success: false, message: "View not found" });

      const db = mongoose.connection.db;
      await applyMongoView(db, view.view_slug, view.base_collection, view.pipeline);

      return res.json({ success: true, message: `View "${view.view_slug}" refreshed in MongoDB` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Delete a database view
  deleteView: async (req, res) => {
    try {
      const { slug } = req.params;
      const query = mongoose.isValidObjectId(slug)
        ? { $or: [{ _id: slug }, { view_slug: slug }], deleted_at: null }
        : { view_slug: slug, deleted_at: null };
      const view = await DatabaseView.findOneAndUpdate(query, { deleted_at: new Date(), status: "INACTIVE", is_active: false });
      if (!view) return res.status(404).json({ success: false, message: "View not found" });

      // Drop MongoDB view
      try {
        const db = mongoose.connection.db;
        await db.dropCollection(view.view_slug);
      } catch (_) { /* view may not exist in MongoDB yet */ }

      return res.json({ success: true, message: `View "${view.view_slug}" deleted` });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Auto-generate a view for a form (based on its schema)
  autoGenerateView: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug } = req.body;
      if (!form_slug) return res.status(400).json({ success: false, message: "form_slug is required" });

      const Form = require("../../models/Form.model");
      const form = await Form.findOne({ slug: form_slug, deleted_at: null });
      if (!form) return res.status(404).json({ success: false, message: "Form schema not found" });

      const viewSlug = `v_${form_slug}`;
      const viewName = `${form.title} View`;

      // Build project stage from sections and table_columns
      const projectFields = { _id: 1, id: "$_id", form_slug: 1, status: 1, created_at: 1, updated_at: 1, data: "$data" };
      for (const sec of form.sections || []) {
        for (const fld of sec.fields || []) {
          const key = fld.db_field || fld.column_name || fld.id;
          if (key && !projectFields[key]) {
            projectFields[key] = `$data.${key}`;
          }
        }
      }
      for (const col of form.table_columns || []) {
        if (!col.key || col.checked === false) continue;
        if (col.key === "id") {
          projectFields["id"] = "$_id";
        } else if (["_id", "form_slug", "status", "created_at", "updated_at", "created_by", "updated_by"].includes(col.key)) {
          projectFields[col.key] = 1;
        } else if (!projectFields[col.key]) {
          projectFields[col.key] = `$data.${col.key}`;
        }
      }
      projectFields["submitted_by_name"] = { $arrayElemAt: ["$created_by_user.name", 0] };
      projectFields["submitted_by_email"] = { $arrayElemAt: ["$created_by_user.email", 0] };

      const pipeline = [
        { $match: { form_slug, deleted_at: null } },
        {
          $lookup: {
            from: "users",
            localField: "created_by",
            foreignField: "_id",
            as: "created_by_user",
          },
        },
        { $project: projectFields },
      ];

      const db = mongoose.connection.db;
      await applyMongoView(db, viewSlug, "formdatas", pipeline);

      const viewDoc = await DatabaseView.findOneAndUpdate(
        { view_slug: viewSlug },
        { view_name: viewName, view_slug: viewSlug, base_collection: "formdatas", form_slug, pipeline, configuration: { fields: form.table_columns || [] }, is_active: true, status: "ACTIVE", auto_generated: true, updated_by: userId },
        { new: true, upsert: true }
      );

      return res.json({ success: true, message: `View "${viewSlug}" generated`, data: viewDoc });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

// Helper: apply / replace a MongoDB view
async function applyMongoView(db, viewName, viewOn, pipeline) {
  const existing = await db.listCollections({ name: viewName }).toArray();
  if (existing.length > 0) {
    await db.dropCollection(viewName);
  }
  await db.createCollection(viewName, { viewOn, pipeline });
  console.log(`[DatabaseView] ✅ MongoDB View "${viewName}" on "${viewOn}" created`);
}

// Helper: map a JS value to a MongoDB-style type label
function mongoTypeOf(val) {
  if (val === null || val === undefined) return "null";
  if (val instanceof Date) return "date";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "number") return Number.isInteger(val) ? "int" : "double";
  if (typeof val === "object" && val._bsontype === "ObjectId") return "objectId";
  if (typeof val === "object" && !Array.isArray(val)) return "object";
  if (Array.isArray(val)) return "array";
  return typeof val; // "string" etc.
}

// Helper: build an aggregation pipeline from wizard config.
// When base_table is a form slug the pipeline targets `formdatas` and
// starts with a $match on form_slug so only that form's data is included.
function buildPipelineFromConfig(config) {
  const baseTable = config.base_table || config.base_collection || "";
  const formSlug  = config.form_slug  || config.base_table || null;
  const fields    = config.selected_fields || config.fields || [];

  const pipeline = [];

  // If this is a form-based view, scope to that form's data first
  if (formSlug && baseTable !== "formdatas") {
    pipeline.push({ $match: { form_slug: formSlug, deleted_at: null } });
  }

  // Detect related tables selected
  const joinedTables = new Set();
  fields.forEach((f) => {
    const table = f.table || f.source;
    if (table && table !== baseTable && table !== formSlug) {
      joinedTables.add(table);
    }
  });

  // Add $lookup stages for joined tables
  joinedTables.forEach((relTable) => {
    const cleanRel = relTable.replace(/^v_/, "").replace(/^t_frm_/, "").replace(/^t_/, "");
    const targetCollection = relTable === "users" ? "users" : `v_${cleanRel}`;
    const localRelKey = (relTable === "users") ? "created_by" : `data.${cleanRel}`;

    pipeline.push({
      $lookup: {
        from: targetCollection,
        let: { relVal: `$${localRelKey}` },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$_id", "$$relVal"] },
                  { $eq: ["$id", "$$relVal"] },
                  { $eq: [{ $toString: "$_id" }, { $toString: "$$relVal" }] },
                ],
              },
            },
          },
        ],
        as: `rel_${cleanRel}`,
      },
    });
  });

  // Build $project
  const project = {};
  for (const f of fields) {
    const alias = f.alias || f.field || String(f);
    const src   = f.field  || String(f);
    const tbl   = f.table || f.source;

    if (tbl && tbl !== baseTable && tbl !== formSlug) {
      const cleanRel = tbl.replace(/^v_/, "").replace(/^t_frm_/, "").replace(/^t_/, "");
      project[alias] = { $arrayElemAt: [`$rel_${cleanRel}.${src}`, 0] };
    } else if (src === "_id" || src === "form_slug" || src === "status" ||
        src === "created_at" || src === "updated_at" || src === "created_by" || src === "updated_by") {
      project[alias] = src === alias ? 1 : `$${src}`;
    } else if (src === "id") {
      project[alias] = "$_id";
    } else {
      // Form data fields live under data.<field> in formdatas
      const mongoPath = f._mongo_path || `data.${src}`;
      project[alias] = `$${mongoPath}`;
    }
  }

  if (Object.keys(project).length > 0) {
    pipeline.push({ $project: project });
  }

  return pipeline;
}

module.exports = {
  // Discovery
  getTables,
  getTableRelationships,
  getDependencies,
  generateSQL,
  testSQL,
  previewPipeline,
  preDeleteCheck,

  // CRUD (already existed as object methods — re-export them)
  listViews:        databaseViewController.listViews,
  getView:          databaseViewController.getView,
  saveView:         databaseViewController.saveView,
  queryView:        databaseViewController.queryView,
  refreshView:      databaseViewController.refreshView,
  deleteView:       databaseViewController.deleteView,
  autoGenerateView: databaseViewController.autoGenerateView,
};

