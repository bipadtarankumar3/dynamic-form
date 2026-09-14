// server/src/services/masterEngine.js
// ============================================================
// Generic Master Engine — handles CRUD for ANY master table
// created by the Configurator via the Master Builder.
//
// Pattern:
//   1. Configurator defines a master schema → saved in t_master_schemas
//   2. DDL Service creates t_mst_{slug} table automatically (no col prefix)
//   3. This engine handles list / getOne / create / update / softDelete
//      for ANY slug without any new code
//
// All queries use parameterized pg ($1, $2 …) — no SQL injection risk.
// Identifiers (table/column names) are validated via ddlService.validateIdentifier.
// ============================================================

const db = require("../config/db");
const { validateIdentifier } = require("./ddlService");

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/**
 * Load master schema from t_master_schemas by slug.
 * Returns null if not found or soft-deleted.
 */
async function getSchema(slug) {
  const result = await db.query(
    `SELECT id, name, slug, fields, table_name, label_field, is_active,
            id AS msc_id, name AS msc_name, slug AS msc_slug, fields AS msc_fields,
            table_name AS msc_table_name, label_field AS msc_label_field, is_active AS msc_is_active
     FROM t_master_schemas
     WHERE slug = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [slug]
  );
  return result.rows[0] || null;
}

/**
 * Build WHERE clause from filter object.
 * Only allows columns that exist in the master schema fields.
 * Returns { whereClause, params, nextIdx }
 */
function buildWhereClause(fields, filters = {}, startIdx = 1) {
  const conditions = [];
  const params = [];
  let idx = startIdx;

  const allowedColumns = new Set(fields.map((f) => f.column_name));

  for (const [key, value] of Object.entries(filters)) {
    if (!allowedColumns.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    conditions.push(`${key} = $${idx}`);
    params.push(value);
    idx++;
  }

  const whereClause = conditions.length > 0 ? conditions.join(" AND ") : "1=1";
  return { whereClause, params, nextIdx: idx };
}

// -------------------------------------------------------
// LIST — with pagination, search, filter, sort
// -------------------------------------------------------
async function list(slug, options = {}) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Master "${slug}" not found`);

  const tableName = schema.msc_table_name;
  validateIdentifier(tableName, "table name");

  const pkCol  = "id";
  const fields = Array.isArray(schema.msc_fields) ? schema.msc_fields : [];

  const {
    page      = 1,
    limit     = 20,
    search    = "",
    filters   = {},
    sortBy    = pkCol,
    sortOrder = "DESC",
  } = options;

  const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
  const safeLimit  = Math.min(Math.max(1, parseInt(limit, 10)), 500);
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  // Validate sort column
  const allowedSortCols = new Set([pkCol, ...fields.map((f) => f.column_name)]);
  const safeSortBy = allowedSortCols.has(sortBy) ? sortBy : pkCol;

  const params = [];
  let idx = 1;

  // Filter conditions
  const { whereClause, params: filterParams, nextIdx } = buildWhereClause(fields, filters, idx);
  params.push(...filterParams);
  idx = nextIdx;

  // Soft delete condition
  let baseWhere = `deleted_at IS NULL`;
  if (whereClause !== "1=1") baseWhere += ` AND ${whereClause}`;

  // Search condition — applies to label field + all text-like fields
  let searchClause = "";
  if (search?.trim()) {
    const textFields = fields
      .filter((f) => ["text", "short_text", "long_text", "email", "mobile", "textarea"].includes(f.type))
      .map((f) => f.column_name);

    if (schema.msc_label_field) textFields.unshift(schema.msc_label_field);

    if (textFields.length > 0) {
      const searchConditions = textFields.map((col) => {
        params.push(`%${search.trim()}%`);
        return `CAST(${col} AS TEXT) ILIKE $${idx++}`;
      });
      searchClause = `(${searchConditions.join(" OR ")})`;
    }
  }

  const fullWhere = searchClause
    ? `${baseWhere} AND ${searchClause}`
    : baseWhere;

  // Total count
  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${fullWhere}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query
  params.push(safeLimit, offset);
  const dataResult = await db.query(
    `SELECT * FROM ${tableName}
     WHERE ${fullWhere}
     ORDER BY ${safeSortBy} ${safeSortOrder}
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data:       dataResult.rows,
    total,
    page:       parseInt(page, 10),
    limit:      safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    schema: {
      name:       schema.msc_name,
      slug:       schema.msc_slug,
      fields,
      labelField: schema.msc_label_field,
    },
  };
}

// -------------------------------------------------------
// GET ONE by ID
// -------------------------------------------------------
async function getOne(slug, id) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Master "${slug}" not found`);

  const tableName = schema.msc_table_name;
  validateIdentifier(tableName, "table name");

  const pkCol = "id";

  const result = await db.query(
    `SELECT * FROM ${tableName}
     WHERE ${pkCol} = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

// -------------------------------------------------------
// CREATE — insert a new record
// -------------------------------------------------------
async function create(slug, data, userId) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Master "${slug}" not found`);

  const tableName = schema.msc_table_name;
  validateIdentifier(tableName, "table name");

  const fields = Array.isArray(schema.msc_fields) ? schema.msc_fields : [];
  const allowedColumns = new Set(fields.map((f) => f.column_name));

  // Filter to only allowed columns
  const insertColumns = [];
  const insertValues  = [];
  const placeholders  = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (!allowedColumns.has(key)) continue;
    insertColumns.push(key);
    insertValues.push(value ?? null);
    placeholders.push(`$${idx++}`);
  }

  // Audit columns
  insertColumns.push("created_by", "updated_by");
  insertValues.push(userId || null, userId || null);
  placeholders.push(`$${idx++}`, `$${idx++}`);

  if (insertColumns.length === 2) {
    throw new Error("No valid fields provided for insert");
  }

  const sql = `
    INSERT INTO ${tableName} (${insertColumns.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *
  `.trim();

  const result = await db.query(sql, insertValues);
  return result.rows[0];
}

// -------------------------------------------------------
// UPDATE — update an existing record
// -------------------------------------------------------
async function update(slug, id, data, userId) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Master "${slug}" not found`);

  const tableName = schema.msc_table_name;
  validateIdentifier(tableName, "table name");

  const pkCol  = "id";
  const fields = Array.isArray(schema.msc_fields) ? schema.msc_fields : [];
  const allowedColumns = new Set(fields.map((f) => f.column_name));

  const setClauses = [];
  const values     = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (!allowedColumns.has(key)) continue;
    setClauses.push(`${key} = $${idx++}`);
    values.push(value ?? null);
  }

  if (setClauses.length === 0) throw new Error("No valid fields to update");

  // Always update audit columns
  setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
  values.push(userId || null);

  // WHERE clause
  values.push(id);
  const wherePart = `${pkCol} = $${idx} AND deleted_at IS NULL`;

  const sql = `
    UPDATE ${tableName}
    SET ${setClauses.join(", ")}
    WHERE ${wherePart}
    RETURNING *
  `.trim();

  const result = await db.query(sql, values);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// -------------------------------------------------------
// SOFT DELETE
// -------------------------------------------------------
async function softDelete(slug, id, userId) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Master "${slug}" not found`);

  const tableName = schema.msc_table_name;
  validateIdentifier(tableName, "table name");

  const pkCol = "id";

  const result = await db.query(
    `UPDATE ${tableName}
     SET deleted_at = NOW(),
         updated_by = $1,
         updated_at = NOW()
     WHERE ${pkCol} = $2
       AND deleted_at IS NULL
     RETURNING ${pkCol}`,
    [userId || null, id]
  );

  return result.rows.length > 0;
}

// -------------------------------------------------------
// DROPDOWN — lightweight value+label list for selects
// -------------------------------------------------------
async function dropdown(slug, filterBy = {}) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Master "${slug}" not found`);

  const tableName  = schema.msc_table_name;
  const labelField = schema.msc_label_field || "id";
  validateIdentifier(tableName, "table name");
  validateIdentifier(labelField, "label field");

  const pkCol = "id";

  let whereClause = `deleted_at IS NULL`;
  const params = [];
  let idx = 1;

  const fields = Array.isArray(schema.msc_fields) ? schema.msc_fields : [];
  const allowedColumns = new Set(fields.map((f) => f.column_name));

  for (const [key, value] of Object.entries(filterBy)) {
    if (!allowedColumns.has(key) || value === undefined || value === null) continue;
    whereClause += ` AND ${key} = $${idx++}`;
    params.push(value);
  }

  // Active filter — if is_active column exists
  const hasActiveCol = fields.some((f) => f.column_name === "is_active");
  if (hasActiveCol) whereClause += ` AND is_active = TRUE`;

  const result = await db.query(
    `SELECT ${pkCol} AS value, ${labelField} AS label
     FROM ${tableName}
     WHERE ${whereClause}
     ORDER BY ${labelField} ASC`,
    params
  );

  return result.rows;
}

module.exports = { list, getOne, create, update, softDelete, dropdown, getSchema };
