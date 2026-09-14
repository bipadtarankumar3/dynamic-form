// server/src/modules/database-view/controllers/databaseViewController.js
// ============================================================
// PostgreSQL Database View Builder — Controller
// Handles metadata discovery, DDL execution (CREATE/DROP VIEW),
// view management CRUD, SQL testing, and data preview.
// ============================================================

const db = require("../../../config/db");
const discoveryService = require("../services/databaseViewDiscovery.service");
const sqlGeneratorService = require("../services/databaseViewSqlGenerator.service");

// Initialize app_database_views metadata table if not existing
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
  await db.query(sql);
}

// -------------------------------------------------------
// DISCOVERY ENDPOINTS
// -------------------------------------------------------

const getTables = async (req, res, next) => {
  try {
    const tables = await discoveryService.getTables();
    return res.status(200).json({ success: true, data: tables });
  } catch (err) {
    next(err);
  }
};

const getTableRelationships = async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const details = await discoveryService.getTableRelationships(tableName);
    return res.status(200).json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
};

const getDependencies = async (req, res, next) => {
  try {
    const { viewName } = req.params;
    const dependencies = await discoveryService.getViewDependencies(viewName);
    return res.status(200).json({ success: true, data: dependencies });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// SQL GENERATION & TESTING
// -------------------------------------------------------

const generateSQL = async (req, res, next) => {
  try {
    const config = req.body;
    const result = sqlGeneratorService.generateViewSQL(config);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const testSQL = async (req, res, next) => {
  try {
    const config = req.body;
    const { sql } = sqlGeneratorService.generateViewSQL(config);

    // Strip CREATE OR REPLACE VIEW prefix to test standard SELECT with EXPLAIN
    const selectQuery = sql.replace(/^CREATE OR REPLACE VIEW [a-zA-Z0-9_.]+\s+AS\s+/i, "").replace(/;$/, "");
    await db.query(`EXPLAIN ${selectQuery}`);

    return res.status(200).json({
      success: true,
      message: "SQL syntax and relationships validated successfully against PostgreSQL!"
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `SQL Validation Error: ${err.message}`
    });
  }
};

// -------------------------------------------------------
// VIEW CRUD & DDL OPERATIONS
// -------------------------------------------------------

const listViews = async (req, res, next) => {
  try {
    await ensureMetadataTable();
    const result = await db.query(
      `SELECT * FROM public.app_database_views WHERE is_active = TRUE ORDER BY created_at DESC`
    );

    // Fetch all active forms from t_form to map Admin Listing connections
    let formsMap = [];
    try {
      const formsCheck = await db.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_form' LIMIT 1`
      );
      if (formsCheck.rows.length > 0) {
        const formsRes = await db.query(
          `SELECT f.form_id AS id, f.title, f.slug,
                  COALESCE(to_jsonb(f)->>'view_name', '') AS configured_view_name,
                  COALESCE(to_jsonb(f)->>'view_slug', '') AS configured_view_slug,
                  COALESCE(f.root_entity->>'table', '') AS configured_table,
                  jsonb_array_length(COALESCE(to_jsonb(f)->'table_columns', '[]'::jsonb)) AS columns_count
           FROM t_form f
           WHERE f.deleted_at IS NULL`
        );
        formsMap = formsRes.rows;
      }
    } catch (e) {
      console.warn("[listViews] t_form lookup warning:", e.message);
    }

    const enrichedRows = result.rows.map((row) => {
      const dbViewName = discoveryService.sanitizeIdentifier(row.database_view_name);
      const viewSlug = row.view_slug;
      const viewName = row.view_name;
      const baseTable = row.base_table;

      const connectedForms = formsMap.filter((f) => {
        return (
          f.configured_view_slug === dbViewName ||
          f.configured_view_name === dbViewName ||
          f.configured_view_slug === viewSlug ||
          f.configured_view_name === viewSlug ||
          f.configured_view_slug === viewName ||
          f.configured_view_name === viewName ||
          (f.configured_table === baseTable &&
            (!f.configured_view_slug ||
              f.configured_view_slug === dbViewName ||
              f.configured_view_slug === viewSlug))
        );
      });

      return {
        ...row,
        connected_forms: connectedForms,
        connected_forms_count: connectedForms.length,
      };
    });

    return res.status(200).json({ success: true, data: enrichedRows });
  } catch (err) {
    next(err);
  }
};

const getViewDetails = async (req, res, next) => {
  try {
    await ensureMetadataTable();
    const { id } = req.params;
    const result = await db.query(
      `SELECT * FROM public.app_database_views WHERE id = $1 OR view_slug = $1 LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Database View not found" });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const createView = async (req, res, next) => {
  try {
    await ensureMetadataTable();
    const config = req.body;
    const { view_name, description = "", base_table = "", view_type = "detail" } = config;
    const isDraft = Boolean(config.is_draft || config.status === "DRAFT");

    if (!view_name?.trim()) {
      return res.status(400).json({ success: false, message: "View name is required" });
    }

    const slug = view_name.toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_");
    let sql = "";
    let database_view_name = config.database_view_name || `v_${slug}`;

    try {
      if (base_table) {
        const generated = sqlGeneratorService.generateViewSQL(config);
        sql = generated.sql;
        database_view_name = generated.database_view_name;
      }
    } catch (e) {
      if (!isDraft) throw e;
    }

    // 1. Execute CREATE OR REPLACE VIEW DDL in PostgreSQL if published (not draft)
    if (!isDraft && sql) {
      const safeView = discoveryService.sanitizeIdentifier(database_view_name);
      await db.query(`DROP VIEW IF EXISTS public.${safeView} CASCADE;`);
      await db.query(sql);
    }

    const viewStatus = isDraft ? "DRAFT" : "ACTIVE";

    // 2. Insert or Update metadata record in app_database_views
    const insertResult = await db.query(
      `INSERT INTO public.app_database_views
        (view_name, view_slug, schema_name, database_view_name, base_table, view_type, description, configuration_json, generated_sql, status, created_by, updated_by)
       VALUES ($1, $2, 'public', $3, $4, $5, $6, $7, $8, $9, $10, $10)
       ON CONFLICT (database_view_name) DO UPDATE SET
        view_name = EXCLUDED.view_name,
        base_table = EXCLUDED.base_table,
        view_type = EXCLUDED.view_type,
        description = EXCLUDED.description,
        configuration_json = EXCLUDED.configuration_json,
        generated_sql = EXCLUDED.generated_sql,
        status = EXCLUDED.status,
        updated_at = NOW()
       RETURNING *`,
      [
        view_name.trim(),
        slug,
        database_view_name,
        base_table || "pending",
        view_type,
        description,
        JSON.stringify({ ...config, status: viewStatus }),
        sql,
        viewStatus,
        req.user?.user_id || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: isDraft
        ? "Draft view configuration saved successfully!"
        : `PostgreSQL View "public.${database_view_name}" created successfully!`,
      data: insertResult.rows[0]
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `Failed to save database view: ${err.message}`
    });
  }
};

const updateView = async (req, res, next) => {
  try {
    await ensureMetadataTable();
    const { id } = req.params;
    const config = req.body;
    const { view_name, description = "", base_table, view_type = "detail" } = config;

    const { sql, database_view_name } = sqlGeneratorService.generateViewSQL(config);
    const safeView = discoveryService.sanitizeIdentifier(database_view_name);

    // 1. Execute DDL in PostgreSQL (Drop existing first to allow column reordering/renaming)
    await db.query(`DROP VIEW IF EXISTS public.${safeView} CASCADE;`);
    await db.query(sql);

    // 2. Update metadata
    const updateResult = await db.query(
      `UPDATE public.app_database_views SET
        view_name = $1,
        base_table = $2,
        view_type = $3,
        description = $4,
        configuration_json = $5,
        generated_sql = $6,
        updated_at = NOW()
       WHERE id = $7 OR database_view_name = $8
       RETURNING *`,
      [
        view_name.trim(),
        base_table,
        view_type,
        description,
        JSON.stringify(config),
        sql,
        isNaN(id) ? -1 : parseInt(id, 10),
        database_view_name
      ]
    );

    return res.status(200).json({
      success: true,
      message: `PostgreSQL View "public.${database_view_name}" updated successfully!`,
      data: updateResult.rows[0]
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `Failed to update PostgreSQL View: ${err.message}`
    });
  }
};

const refreshView = async (req, res, next) => {
  try {
    const { id } = req.params;
    const viewRes = await db.query(
      `SELECT * FROM public.app_database_views WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (viewRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "View configuration not found" });
    }

    const viewRecord = viewRes.rows[0];
    const config = viewRecord.configuration_json;
    const { sql, database_view_name } = sqlGeneratorService.generateViewSQL(config);
    const safeView = discoveryService.sanitizeIdentifier(database_view_name);

    // Re-execute DROP VIEW CASCADE then CREATE OR REPLACE VIEW
    await db.query(`DROP VIEW IF EXISTS public.${safeView} CASCADE;`);
    await db.query(sql);

    await db.query(
      `UPDATE public.app_database_views SET generated_sql = $1, updated_at = NOW() WHERE id = $2`,
      [sql, id]
    );

    return res.status(200).json({
      success: true,
      message: `Database View "public.${database_view_name}" refreshed and recreated successfully!`
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// Helper: Inspect View Dependencies (Connected Form Listing Columns + Database Views)
// -------------------------------------------------------
async function inspectViewDependencies(viewIdOrName) {
  const viewRes = await db.query(
    `SELECT * FROM public.app_database_views WHERE id::text = $1 OR database_view_name = $1 OR view_slug = $1 LIMIT 1`,
    [String(viewIdOrName)]
  );

  if (viewRes.rows.length === 0) {
    return null;
  }

  const viewRecord = viewRes.rows[0];
  const dbViewName = discoveryService.sanitizeIdentifier(viewRecord.database_view_name);
  const viewSlug = viewRecord.view_slug;
  const viewName = viewRecord.view_name;
  const baseTable = viewRecord.base_table;

  // 1. Check if connected to any active Form Schema Admin Listing Columns in t_form
  let connectedForms = [];
  try {
    const formsCheck = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_form' LIMIT 1`
    );
    if (formsCheck.rows.length > 0) {
      const formsRes = await db.query(
        `SELECT f.form_id AS id, f.title, f.slug,
                COALESCE(to_jsonb(f)->>'view_name', '') AS configured_view_name,
                COALESCE(to_jsonb(f)->>'view_slug', '') AS configured_view_slug,
                COALESCE(f.root_entity->>'table', '') AS configured_table,
                jsonb_array_length(COALESCE(to_jsonb(f)->'table_columns', '[]'::jsonb)) AS columns_count
         FROM t_form f
         WHERE f.deleted_at IS NULL
           AND (
             to_jsonb(f)->>'view_slug' = $1
             OR to_jsonb(f)->>'view_name' = $1
             OR to_jsonb(f)->>'view_slug' = $2
             OR to_jsonb(f)->>'view_name' = $2
             OR to_jsonb(f)->>'view_slug' = $3
             OR to_jsonb(f)->>'view_name' = $3
             OR (COALESCE(f.root_entity->>'table', '') = $4 AND (to_jsonb(f)->>'view_slug' IS NULL OR to_jsonb(f)->>'view_slug' = '' OR to_jsonb(f)->>'view_slug' = $1 OR to_jsonb(f)->>'view_slug' = $2))
           )`,
        [dbViewName, viewSlug, viewName, baseTable]
      );
      connectedForms = formsRes.rows;
    }
  } catch (e) {
    console.warn("[InspectViewDependencies] t_form lookup warning:", e.message);
  }

  // 2. Check PostgreSQL Database View Dependencies (other SQL views depending on this view)
  let dbDependencies = [];
  try {
    dbDependencies = await discoveryService.getViewDependencies(dbViewName);
  } catch (e) {
    console.warn("[InspectViewDependencies] getViewDependencies warning:", e.message);
  }

  const canDropDirectly = (connectedForms.length === 0 && dbDependencies.length === 0);

  return {
    view: viewRecord,
    canDropDirectly,
    summary: {
      connectedFormsCount: connectedForms.length,
      dbDependenciesCount: dbDependencies.length,
    },
    details: {
      connectedForms,
      dbDependencies,
    },
  };
}

// -------------------------------------------------------
// PRE-DELETE CHECK (Database Views)
// -------------------------------------------------------
const preDeleteCheck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const info = await inspectViewDependencies(id);
    if (!info) {
      return res.status(404).json({ success: false, message: "Database view not found" });
    }
    return res.status(200).json({
      success: true,
      ...info,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// DROP VIEW — Strictly blocked if connected to Form Admin Listing Columns
// -------------------------------------------------------
const dropView = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cascade = false } = req.query;

    const info = await inspectViewDependencies(id);
    if (!info) {
      return res.status(404).json({ success: false, message: "View not found" });
    }

    const { view, details } = info;
    const dbViewName = discoveryService.sanitizeIdentifier(view.database_view_name);

    // 1. Strict Blocker: Check if connected to any Form Admin Listing Columns
    if (details.connectedForms && details.connectedForms.length > 0) {
      const formLabels = details.connectedForms.map(f => `"${f.title}" (${f.slug})`).join(", ");
      return res.status(409).json({
        success: false,
        code: "CONNECTED_TO_ADMIN_LISTING_COLUMNS",
        message: `Cannot drop Database View "${view.view_name}" (public.${dbViewName}) because it is currently connected to Admin Listing Columns in form(s): ${formLabels}. Please disconnect or change the Database View Source in Form Actions & Listing Columns setup first.`,
        connectedForms: details.connectedForms,
        dependencies: details.dbDependencies,
      });
    }

    // 2. Check dependent database objects (other SQL views)
    if (details.dbDependencies && details.dbDependencies.length > 0 && !cascade) {
      return res.status(409).json({
        success: false,
        code: "HAS_DB_DEPENDENCIES",
        message: `Cannot drop view public.${dbViewName} because other database objects depend on it.`,
        dependencies: details.dbDependencies,
      });
    }

    const dropSql = `DROP VIEW IF EXISTS public.${dbViewName} ${cascade ? "CASCADE" : ""};`;
    await db.query(dropSql);

    await db.query(`DELETE FROM public.app_database_views WHERE id = $1`, [view.id]);

    return res.status(200).json({
      success: true,
      message: `PostgreSQL View "public.${dbViewName}" dropped successfully.`
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// PREVIEW DATA
// -------------------------------------------------------

const getPreviewData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    let dbViewName = "";
    let savedConfig = null;
    let viewStatus = "ACTIVE";

    if (id) {
      const isNum = !isNaN(id) && !isNaN(parseInt(id, 10));
      const viewRes = isNum
        ? await db.query(
            `SELECT database_view_name, configuration_json, status FROM public.app_database_views WHERE id = $1 OR database_view_name = $2 LIMIT 1`,
            [parseInt(id, 10), String(id)]
          )
        : await db.query(
            `SELECT database_view_name, configuration_json, status FROM public.app_database_views WHERE database_view_name = $1 OR view_slug = $1 LIMIT 1`,
            [String(id)]
          );

      if (viewRes.rows.length > 0) {
        dbViewName = viewRes.rows[0].database_view_name;
        savedConfig = viewRes.rows[0].configuration_json;
        viewStatus = viewRes.rows[0].status;
      } else {
        dbViewName = id;
      }
    }

    const safeView = discoveryService.sanitizeIdentifier(dbViewName);

    // If configuration exists, dynamically execute the updated query with ::text typecasting
    if (savedConfig) {
      try {
        const generated = sqlGeneratorService.generateViewSQL(savedConfig);
        
        // Re-execute DROP VIEW CASCADE then CREATE OR REPLACE VIEW in PostgreSQL to update stored view definition catalog
        try {
          await db.query(`DROP VIEW IF EXISTS public.${safeView} CASCADE;`);
          await db.query(generated.sql);
        } catch (createErr) {
          console.error("[DatabaseView] View recreate catalog error:", createErr.message);
        }

        const selectQuery = generated.sql.replace(/^CREATE OR REPLACE VIEW [a-zA-Z0-9_.]+\s+AS\s+/i, "").replace(/;$/, "");
        const previewRes = await db.query(`${selectQuery} LIMIT $1`, [limit]);

        const colRes = await db.query(
          `SELECT column_name, data_type
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
          [dbViewName]
        );

        return res.status(200).json({
          success: true,
          view_name: dbViewName,
          columns: colRes.rows,
          data: previewRes.rows,
          configuration_json: savedConfig
        });
      } catch (e) {
        console.error("[DatabaseView] Direct query preview error:", e.message);
        return res.status(400).json({
          success: false,
          message: `Failed to query PostgreSQL View data: ${e.message}`
        });
      }
    }

    // Fallback: Fetch column metadata from information_schema and query view
    const colSql = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1 
      ORDER BY ordinal_position ASC;
    `;
    const colRes = await db.query(colSql, [safeView]);

    const dataSql = `SELECT * FROM public.${safeView} LIMIT $1;`;
    const dataRes = await db.query(dataSql, [limit]);

    return res.status(200).json({
      success: true,
      view_name: safeView,
      columns: colRes.rows,
      data: dataRes.rows,
      total: dataRes.rows.length
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `Failed to query PostgreSQL View data: ${err.message}`
    });
  }
};

module.exports = {
  getTables,
  getTableRelationships,
  getDependencies,
  generateSQL,
  testSQL,
  listViews,
  getViewDetails,
  createView,
  updateView,
  refreshView,
  dropView,
  preDeleteCheck,
  getPreviewData
};
