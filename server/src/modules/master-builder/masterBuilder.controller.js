// server/src/modules/master-builder/masterBuilder.controller.js
// ============================================================
// Configurator-only controller.
// Handles CRUD for t_master_schemas (schema definitions).
// When a schema is saved, DDL Service auto-creates the DB table.
// When a schema is updated with new fields, DDL Service adds columns.
// ============================================================

const db = require("../../config/db");
const ddlService = require("../../services/ddlService");
const masterEngine = require("../../services/masterEngine");

const TABLE_PREFIX = "t_mst_";   // All master data tables live under t_mst_{slug}

// -------------------------------------------------------
// Helper: slugify a string
// -------------------------------------------------------
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// -------------------------------------------------------
// GET ALL SCHEMAS — list all master schemas (Configurator)
// -------------------------------------------------------
const getAllSchemas = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, page) - 1) * parseInt(limit, 10);

    let whereClause = "deleted_at IS NULL";
    const params = [];
    let idx = 1;

    if (search?.trim()) {
      whereClause += ` AND (name ILIKE $${idx} OR slug ILIKE $${idx})`;
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM t_master_schemas WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(parseInt(limit, 10), offset);
    const dataResult = await db.query(
      `SELECT id AS msc_id, name AS msc_name, slug AS msc_slug, table_name AS msc_table_name,
              label_field AS msc_label_field, is_active AS msc_is_active, allow_search AS msc_allow_search,
              allow_export AS msc_allow_export, fields AS msc_fields, created_at AS msc_created_at,
              id, name, slug, table_name, label_field, is_active, allow_search, allow_export, fields, created_at
       FROM t_master_schemas
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.status(200).json({
      success: true,
      data:       dataResult.rows,
      total,
      page:       parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// GET SCHEMA BY ID
// -------------------------------------------------------
const getSchemaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id AS msc_id, name AS msc_name, slug AS msc_slug, table_name AS msc_table_name,
              label_field AS msc_label_field, is_active AS msc_is_active, allow_search AS msc_allow_search,
              allow_export AS msc_allow_export, fields AS msc_fields, created_at AS msc_created_at,
              *
       FROM t_master_schemas WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Schema not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// CREATE SCHEMA — also auto-creates the DB table
// -------------------------------------------------------
const createSchema = async (req, res, next) => {
  try {
    const {
      name,
      slug: inputSlug,
      fields = [],
      label_field,
      allow_search = true,
      allow_export = true,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Master name is required" });
    }

    const slug      = inputSlug ? slugify(inputSlug) : slugify(name);
    const tableName = `${TABLE_PREFIX}${slug}`;

    // Validate slug
    try {
      ddlService.validateIdentifier(slug, "slug");
      ddlService.validateIdentifier(tableName, "table name");
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    // Validate all field column names and types
    for (const field of fields) {
      if (!field.column_name) {
        return res.status(400).json({
          success: false,
          message: `Field "${field.label || "unknown"}" is missing column_name`,
        });
      }
      try {
        ddlService.validateIdentifier(field.column_name, "column name");
        ddlService.getPgType(field.type);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    // Check duplicate slug
    const existing = await db.query(
      `SELECT id FROM t_master_schemas WHERE slug = $1 AND deleted_at IS NULL`,
      [slug]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A master with slug "${slug}" already exists`,
      });
    }

    // Auto-create the PostgreSQL table (null prefix = clean column names)
    const tableAlreadyExists = await ddlService.tableExists(tableName);
    if (!tableAlreadyExists) {
      await ddlService.createTable(tableName, null, fields);
    }

    // Save schema to t_master_schemas
    const result = await db.query(
      `INSERT INTO t_master_schemas
         (name, slug, fields, table_name, label_field,
          is_active, allow_search, allow_export,
          created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8, $8)
       RETURNING id AS msc_id, name AS msc_name, slug AS msc_slug, fields AS msc_fields,
                 table_name AS msc_table_name, label_field AS msc_label_field,
                 is_active AS msc_is_active, allow_search AS msc_allow_search,
                 allow_export AS msc_allow_export, created_at AS msc_created_at, *`,
      [
        name.trim(),
        slug,
        JSON.stringify(fields),
        tableName,
        label_field || null,
        allow_search,
        allow_export,
        req.user?.user_id || null,
      ]
    );

    // Save master config
    await db.query(
      `INSERT INTO t_master_configs (slug, table_name, primary_key, label_key, is_active_key)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET
         table_name = EXCLUDED.table_name,
         primary_key = EXCLUDED.primary_key,
         label_key = EXCLUDED.label_key,
         is_active_key = EXCLUDED.is_active_key,
         updated_at = NOW()`,
      [slug, tableName, "id", label_field || "name", "is_active"]
    );

    return res.status(201).json({
      success: true,
      message: `Master "${name}" created and table "${tableName}" provisioned`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// UPDATE SCHEMA — adds new columns, updates schema JSONB
// NOTE: Existing columns are NOT modified (data safety).
//       Rename/delete columns must be done explicitly.
// -------------------------------------------------------
const updateSchema = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, fields, label_field, allow_search, allow_export, is_active } = req.body;

    // Fetch existing schema
    const existing = await db.query(
      `SELECT * FROM t_master_schemas WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Schema not found" });
    }

    const schema    = existing.rows[0];
    const tableName = schema.table_name;
    const existingFields  = Array.isArray(schema.fields) ? schema.fields : [];
    const existingColNames = new Set(existingFields.map((f) => f.column_name));

    // If new fields provided, add only truly new columns to the DB table
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (!field.column_name) continue;
        try {
          ddlService.validateIdentifier(field.column_name, "column name");
          ddlService.getPgType(field.type);
        } catch (e) {
          return res.status(400).json({ success: false, message: e.message });
        }

        if (!existingColNames.has(field.column_name)) {
          await ddlService.addColumn(tableName, field);
        }
      }
    }

    // Build update query dynamically
    const setClauses = [];
    const values     = [];
    let idx = 1;

    if (name?.trim())            { setClauses.push(`name = $${idx++}`);         values.push(name.trim()); }
    if (Array.isArray(fields))   { setClauses.push(`fields = $${idx++}`);       values.push(JSON.stringify(fields)); }
    if (label_field !== undefined){ setClauses.push(`label_field = $${idx++}`); values.push(label_field); }
    if (allow_search !== undefined){ setClauses.push(`allow_search = $${idx++}`); values.push(allow_search); }
    if (allow_export !== undefined){ setClauses.push(`allow_export = $${idx++}`); values.push(allow_export); }
    if (is_active !== undefined)  { setClauses.push(`is_active = $${idx++}`);   values.push(is_active); }

    setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(req.user?.user_id || null);

    values.push(id);
    const result = await db.query(
      `UPDATE t_master_schemas SET ${setClauses.join(", ")}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id AS msc_id, name AS msc_name, slug AS msc_slug, *`,
      values
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      await db.query(
        `INSERT INTO t_master_configs (slug, table_name, primary_key, label_key, is_active_key)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET
           table_name = EXCLUDED.table_name,
           primary_key = EXCLUDED.primary_key,
           label_key = EXCLUDED.label_key,
           is_active_key = EXCLUDED.is_active_key,
           updated_at = NOW()`,
        [
          row.msc_slug || row.slug,
          row.msc_table_name || row.table_name,
          "id",
          row.msc_label_field || row.label_field || "name",
          (row.msc_is_active || row.is_active) ? "is_active" : null
        ]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Master schema updated",
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// DELETE SCHEMA — soft delete only (data table is kept)
// -------------------------------------------------------
const deleteSchema = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch the master schema to identify the target database table name
    const schemaRow = await db.query(
      `SELECT name, slug, table_name FROM t_master_schemas WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (schemaRow.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Schema not found" });
    }

    const { name, slug, table_name } = schemaRow.rows[0];

    // 2. Drop the PostgreSQL table physically if table name exists
    if (table_name) {
      await db.query(`DROP TABLE IF EXISTS "${table_name}" CASCADE`);
    }

    // 3. Soft-delete the master schema entry in t_master_schemas
    await db.query(
      `UPDATE t_master_schemas
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.user?.user_id || null, id]
    );

    if (slug) {
      await db.query(`DELETE FROM t_master_configs WHERE slug = $1`, [slug]);
    }

    return res.status(200).json({
      success: true,
      message: `Master schema "${name}" and its database table "${table_name}" dropped and deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// GENERIC MASTER DATA ROUTES (called from frontend list/form pages)
// -------------------------------------------------------

// GET /data/:slug — list records (any user with access)
const listRecords = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { page, limit, search, sortBy, sortOrder, ...filters } = req.query;

    const result = await masterEngine.list(slug, { page, limit, search, sortBy, sortOrder, filters });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// GET /data/:slug/:id — single record
const getRecord = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const record = await masterEngine.getOne(slug, id);

    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// POST /data/:slug — create record
const createRecord = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const record = await masterEngine.create(slug, req.body, req.user?.user_id);
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// PUT /data/:slug/:id — update record
const updateRecord = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const record = await masterEngine.update(slug, id, req.body, req.user?.user_id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// DELETE /data/:slug/:id — soft delete record
const deleteRecord = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const deleted = await masterEngine.softDelete(slug, id, req.user?.user_id);
    if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
    return res.status(200).json({ success: true, message: "Record deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /data/:slug/dropdown — lightweight value+label list
const getDropdown = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const data = await masterEngine.dropdown(slug, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Schema management (Configurator only)
  getAllSchemas,
  getSchemaById,
  createSchema,
  updateSchema,
  deleteSchema,
  // Data CRUD (role-based access)
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getDropdown,
};
