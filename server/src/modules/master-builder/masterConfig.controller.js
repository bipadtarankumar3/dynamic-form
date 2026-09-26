// server/src/modules/master-builder/masterConfig.controller.js
// ============================================================
// Configurator Controller — CRUD for t_master_configs
// Supports auto-populating fields by inspecting database table columns.
// ============================================================

const db = require("../../config/db");

async function ensureMasterConfigsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS t_master_configs (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        primary_key VARCHAR(255) NOT NULL,
        label_key VARCHAR(255) NOT NULL,
        is_active_key VARCHAR(255) DEFAULT NULL,
        foreign_key VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.query(`ALTER TABLE t_master_configs ADD COLUMN IF NOT EXISTS is_active_key VARCHAR(255);`).catch(() => {});
    await db.query(`ALTER TABLE t_master_configs ADD COLUMN IF NOT EXISTS foreign_key VARCHAR(255);`).catch(() => {});
  } catch (e) {
    console.warn("[MasterConfig] Error ensuring t_master_configs table:", e.message);
  }
}

// Helper to clean slug from table name
function slugifyTableName(tableName = "") {
  return tableName
    .replace(/^t_mst_|^t_frm_|^t_/, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_");
}

// -------------------------------------------------------
// GET ALL MASTER CONFIGS
// -------------------------------------------------------
const getAllMasterConfigs = async (req, res, next) => {
  try {
    await ensureMasterConfigsTable();
    const { search = "", page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let where = "1=1";
    const params = [];
    let idx = 1;

    if (search && search.trim() !== "") {
      where += ` AND (
        slug ILIKE $${idx} OR 
        table_name ILIKE $${idx} OR 
        label_key ILIKE $${idx} OR 
        primary_key ILIKE $${idx} OR 
        COALESCE(foreign_key, '') ILIKE $${idx} OR 
        COALESCE(is_active_key, '') ILIKE $${idx}
      )`;
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const countRes = await db.query(`SELECT COUNT(*) AS total FROM t_master_configs WHERE ${where}`, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    const queryParams = [...params, limitNum, offset];
    const dataRes = await db.query(
      `SELECT * FROM t_master_configs
       WHERE ${where}
       ORDER BY id DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      queryParams
    );

    return res.status(200).json({
      success: true,
      data: dataRes.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET DATABASE TABLES LIST
// -------------------------------------------------------
const getDatabaseTables = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name ASC`
    );
    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => r.table_name),
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET TABLE COLUMNS & AUTO-POPULATE FIELDS
// -------------------------------------------------------
const getTableColumns = async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const result = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND LOWER(table_name) = LOWER($1)
       ORDER BY ordinal_position`,
      [tableName]
    );

    const columns = result.rows.map((r) => ({
      column_name: r.column_name,
      data_type: r.data_type,
    }));

    const colNames = columns.map((c) => c.column_name);

    // Auto-detection logic
    const suggested_slug = slugifyTableName(tableName);

    // Primary Key: column named 'id' or ending with '_id' / '_pk'
    const pkCol = colNames.find((c) => c === "id" || c.endsWith("_id") || c.endsWith("_pk")) || colNames[0] || "id";

    // Label Key: column containing name, title, label, desc, code or first string column
    const labelCol = colNames.find((c) =>
      c.toLowerCase().includes("name") ||
      c.toLowerCase().includes("title") ||
      c.toLowerCase().includes("label") ||
      c.toLowerCase().includes("desc")
    ) || columns.find((c) => c.data_type.includes("char") || c.data_type.includes("text"))?.column_name || colNames[1] || colNames[0] || "name";

    // Active Key: column named is_active, status, active, enabled
    const activeCol = colNames.find((c) =>
      c.toLowerCase() === "is_active" ||
      c.toLowerCase() === "status" ||
      c.toLowerCase() === "active"
    ) || null;

    // Foreign Key: column ending with '_id' (excluding primary key)
    const fkCol = colNames.find((c) => c !== pkCol && c.endsWith("_id")) || null;

    return res.status(200).json({
      success: true,
      tableName,
      columns,
      autoPopulated: {
        slug: suggested_slug,
        primary_key: pkCol,
        label_key: labelCol,
        is_active_key: activeCol,
        foreign_key: fkCol,
      },
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET SINGLE MASTER CONFIG BY ID
// -------------------------------------------------------
const getMasterConfigById = async (req, res, next) => {
  try {
    await ensureMasterConfigsTable();
    const { id } = req.params;
    const result = await db.query(
      `SELECT * FROM t_master_configs WHERE id::text = $1 OR slug = $1 LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Master config not found" });

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// CREATE MASTER CONFIG
// -------------------------------------------------------
const createMasterConfig = async (req, res, next) => {
  try {
    await ensureMasterConfigsTable();
    const { slug, table_name, primary_key, label_key, is_active_key, foreign_key } = req.body;

    if (!slug?.trim() || !table_name?.trim() || !label_key?.trim()) {
      return res.status(400).json({ success: false, message: "Slug, table_name, and label_key are required" });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");

    const result = await db.query(
      `INSERT INTO t_master_configs (slug, table_name, primary_key, label_key, is_active_key, foreign_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET
         table_name = EXCLUDED.table_name,
         primary_key = EXCLUDED.primary_key,
         label_key = EXCLUDED.label_key,
         is_active_key = EXCLUDED.is_active_key,
         foreign_key = EXCLUDED.foreign_key,
         updated_at = NOW()
       RETURNING *`,
      [cleanSlug, table_name.trim(), primary_key?.trim() || "id", label_key.trim(), is_active_key?.trim() || null, foreign_key?.trim() || null]
    );

    return res.status(201).json({
      success: true,
      message: `Master config "${cleanSlug}" saved successfully`,
      data: result.rows[0],
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// UPDATE MASTER CONFIG
// -------------------------------------------------------
const updateMasterConfig = async (req, res, next) => {
  try {
    await ensureMasterConfigsTable();
    const { id } = req.params;
    const { slug, table_name, primary_key, label_key, is_active_key, foreign_key } = req.body;

    const result = await db.query(
      `UPDATE t_master_configs
       SET slug = COALESCE($1, slug),
           table_name = COALESCE($2, table_name),
           primary_key = COALESCE($3, primary_key),
           label_key = COALESCE($4, label_key),
           is_active_key = $5,
           foreign_key = $6,
           updated_at = NOW()
       WHERE id::text = $7 OR slug = $7
       RETURNING *`,
      [slug?.trim(), table_name?.trim(), primary_key?.trim(), label_key?.trim(), is_active_key?.trim() || null, foreign_key?.trim() || null, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Master config not found" });

    return res.status(200).json({
      success: true,
      message: "Master config updated successfully",
      data: result.rows[0],
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// DELETE MASTER CONFIG
// -------------------------------------------------------
const deleteMasterConfig = async (req, res, next) => {
  try {
    await ensureMasterConfigsTable();
    const { id } = req.params;
    const result = await db.query(
      `DELETE FROM t_master_configs WHERE id::text = $1 OR slug = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Master config not found" });

    return res.status(200).json({
      success: true,
      message: "Master config deleted successfully",
    });
  } catch (err) { next(err); }
};

module.exports = {
  getAllMasterConfigs,
  getDatabaseTables,
  getTableColumns,
  getMasterConfigById,
  createMasterConfig,
  updateMasterConfig,
  deleteMasterConfig,
};
