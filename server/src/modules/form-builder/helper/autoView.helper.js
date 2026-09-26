// server/src/modules/form-builder/helper/autoView.helper.js
// ============================================================
// Auto-creates / registers a PostgreSQL Database View in `public.app_database_views`
// when a form schema is published for the first time.
// If the view already exists, it is NOT overwritten during updates,
// preserving any custom joins, filters, or modifications made from Database Views.
// ============================================================

const db = require("../../../config/db");
const { sanitizeIdentifier } = require("../../database-view/services/databaseViewDiscovery.service");

// PostgreSQL Reserved Words list for safe quoting
const RESERVED_WORDS = new Set([
  "user", "order", "group", "select", "where", "from", "limit", "offset",
  "join", "table", "column", "primary", "foreign", "key", "grant", "revoke", "status"
]);

function quoteCol(id) {
  const clean = sanitizeIdentifier(id);
  if (RESERVED_WORDS.has(clean.toLowerCase())) {
    return `"${clean}"`;
  }
  return clean;
}

/**
 * Ensure the metadata table public.app_database_views exists
 */
async function ensureMetadataTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.app_database_views (
      id SERIAL PRIMARY KEY,
      view_name VARCHAR(255) NOT NULL,
      view_slug VARCHAR(255) NOT NULL UNIQUE,
      schema_name VARCHAR(100) DEFAULT 'public',
      database_view_name VARCHAR(255) NOT NULL UNIQUE,
      base_table VARCHAR(255) NOT NULL,
      view_type VARCHAR(50) DEFAULT 'detail',
      description TEXT,
      configuration_json JSONB NOT NULL,
      generated_sql TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      is_active BOOLEAN DEFAULT TRUE,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.app_database_views ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
  `;
  await db.query(sql).catch((err) => {
    console.warn("[AutoView] Error creating metadata table:", err.message);
  });
}

/**
 * Auto-creates or refreshes a PostgreSQL Database View for a given form schema.
 * @param {Object} options
 * @param {string} options.slug - Form slug
 * @param {string} options.formName - Form display title
 * @param {string} options.tableName - Base database table name
 * @param {Object} options.formDefinition - Form fields & sections definition
 * @param {number} options.userId - Authenticated user ID
 * @param {boolean} options.onlyIfMissing - If true, skips recreation if view already exists
 */
async function ensureFormDatabaseView({ slug, formName, tableName, formDefinition, userId = 0, onlyIfMissing = false }) {
  if (!slug || !tableName) return null;

  try {
    await ensureMetadataTable();

    const safeSlug = sanitizeIdentifier(slug);
    const safeTable = sanitizeIdentifier(tableName);
    const viewName = `${formName || slug} View`;
    const viewSlug = `v_${safeSlug}`;
    const dbViewName = `v_${safeSlug}`;

    // Check if view already exists in metadata
    const checkView = await db.query(
      `SELECT id, view_name, view_slug, database_view_name, configuration_json, generated_sql 
       FROM public.app_database_views 
       WHERE view_slug = $1 OR database_view_name = $2 LIMIT 1`,
      [viewSlug, dbViewName]
    );

    // Also check if the view actually exists as a real database view in PostgreSQL
    const checkPgView = await db.query(
      `SELECT table_name FROM information_schema.views 
       WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
      [dbViewName]
    );

    const viewExistsInBoth = checkView.rows.length > 0 && checkPgView.rows.length > 0;

    // If view already exists in both metadata and PostgreSQL, and onlyIfMissing is true, PRESERVE IT!
    if (viewExistsInBoth && onlyIfMissing) {
      const existingRow = checkView.rows[0];
      const cfg = existingRow.configuration_json || {};
      console.log(`[AutoView] ℹ️ View "${dbViewName}" already exists. Skipping DDL recreation to preserve user customizations made in Database Views.`);
      return {
        view_slug: existingRow.view_slug || viewSlug,
        database_view_name: existingRow.database_view_name || dbViewName,
        view_name: existingRow.view_name || viewName,
        table_columns: cfg.fields || [],
      };
    }

    const def = typeof formDefinition === "string" ? JSON.parse(formDefinition) : (formDefinition || {});
    const sections = def.sections || def.tabs || [];

    // Clean naked base view definition without forced joins (configurator adds joins via Database Views)
    const selectCols = [`    m.*`];
    const configuredFields = [];

    // Base default columns
    configuredFields.push({ key: "id", label: "ID", checked: true, sortable: true, align: "left" });

    for (const sec of sections) {
      if (sec.type === "add_more") continue;

      const secFields = typeof sec.fields === "string" ? JSON.parse(sec.fields || "[]") : (sec.fields || []);

      for (const f of secFields) {
        const col = f.column_name || f.db_field;
        if (!col) continue;

        configuredFields.push({
          key: col,
          label: f.label || col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          checked: f.visible !== false && f.add_to_list !== false,
          sortable: true,
          align: "left",
        });
      }
    }

    // Audit fields in default columns
    configuredFields.push(
      { key: "status", label: "Status", checked: true, sortable: true, align: "left" },
      { key: "created_by", label: "Created By", checked: true, sortable: true, align: "left" },
      { key: "created_at", label: "Created At", checked: true, sortable: true, align: "left" }
    );

    // Build the clean SQL statement
    const viewSql = `CREATE OR REPLACE VIEW public.${dbViewName} AS\nSELECT\n${selectCols.join(",\n")}\nFROM public.${safeTable} m\nWHERE m.deleted_at IS NULL;\n`;

    // 1. Execute DDL in PostgreSQL
    console.log(`[AutoView] 🛠 Executing PostgreSQL View creation for "public.${dbViewName}"...`);
    try {
      await db.query(`DROP VIEW IF EXISTS public.${dbViewName} CASCADE;`);
      await db.query(viewSql);
      console.log(`[AutoView] ✅ PostgreSQL View "public.${dbViewName}" created successfully.`);
    } catch (ddlErr) {
      console.error(`[AutoView] ⚠️ Failed executing view DDL:`, ddlErr.message);
    }

    // 2. Upsert into public.app_database_views
    const configJson = JSON.stringify({
      view_name: viewName,
      database_view_name: dbViewName,
      base_table: safeTable,
      auto_generated: true,
      form_slug: slug,
      fields: configuredFields,
    });

    if (checkView.rows.length > 0) {
      await db.query(
        `UPDATE public.app_database_views
         SET view_name = $1, base_table = $2, configuration_json = $3::jsonb, generated_sql = $4,
             status = 'ACTIVE', is_active = TRUE, updated_by = $5, updated_at = NOW()
         WHERE id = $6`,
        [viewName, safeTable, configJson, viewSql, userId, checkView.rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO public.app_database_views
         (view_name, view_slug, schema_name, database_view_name, base_table, view_type, description, configuration_json, generated_sql, status, is_active, created_by, updated_by)
         VALUES ($1, $2, 'public', $3, $4, 'detail', $5, $6::jsonb, $7, 'ACTIVE', TRUE, $8, $8)`,
        [viewName, viewSlug, dbViewName, safeTable, `Auto-generated view for form "${formName}"`, configJson, viewSql, userId]
      );
    }

    return {
      view_slug: viewSlug,
      database_view_name: dbViewName,
      view_name: viewName,
      table_columns: configuredFields,
    };
  } catch (err) {
    console.error("[AutoView] Error in ensureFormDatabaseView:", err.message);
    return null;
  }
}

module.exports = {
  ensureFormDatabaseView,
  ensureMetadataTable,
};
