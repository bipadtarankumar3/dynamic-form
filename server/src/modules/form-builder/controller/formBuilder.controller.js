// server/src/modules/form-builder/controller/formBuilder.controller.js
// ============================================================
// Form Builder — Configurator manages form schemas (t_form_schemas)
// + generic data endpoints for all authenticated users.
// On schema save, DDL Service auto-creates t_frm_{slug} table.
// ============================================================

const db = require("../../../config/db");
const ddlService = require("../../../services/ddlService");
const formEngine = require("../../../services/formEngine");
const { syncFormToTFormAndTSection } = require("../helper/syncFormSchema.helper");
const { ensureFormDatabaseView } = require("../helper/autoView.helper");

const FORM_TABLE_PREFIX = "t_frm_";

async function ensureIsDraftColumn() {
  try {
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE`);
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS parent_form_id VARCHAR(255)`);
    await db.query(`ALTER TABLE t_form ALTER COLUMN parent_form_id TYPE VARCHAR(255) USING parent_form_id::text`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS table_columns JSONB DEFAULT '[]'::jsonb`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS view_name VARCHAR(255)`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS view_slug VARCHAR(255)`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS enable_approval BOOLEAN DEFAULT FALSE`).catch(() => {});
    await db.query(`ALTER TABLE t_form ADD COLUMN IF NOT EXISTS relation_with_parent JSONB`).catch(() => {});
  } catch (e) {
    // Ignore error if table doesn't exist
  }
}

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// -------------------------------------------------------
// Extract all field defs for parent table from definition JSONB
// -------------------------------------------------------
function extractFields(definition) {
  const def = typeof definition === "string" ? JSON.parse(definition) : (definition || {});
  const sections = Array.isArray(def) ? def : (def?.sections || def?.tabs || []);
  const fields = [];

  for (const sec of sections) {
    if (sec.type === "add_more") {
      if (sec.storage_type === "json") {
        const col = sec.slug || slugify(sec.section_label || "add_more");
        fields.push({ column_name: col, db_field: col, type: "jsonb", data_type: "jsonb", required: false });
      }
      continue;
    }
    const secFields = typeof sec.fields === "string" ? JSON.parse(sec.fields || "[]") : (sec.fields || []);
    for (const f of secFields) {
      const col = f.column_name || f.db_field || (f.label ? slugify(f.label) : null) || f.id;
      if (!col) continue;

      // Handle add_more / repeater / table_grid fields placed inside a section
      if (f.type === "add_more" || f.type === "repeater" || f.type === "table_grid") {
        const storageType = f.storage_type || (f.storage === "table" ? "table" : "jsonb");
        if (storageType === "table") {
          // Stored in a separate child table → skip adding as column in main table
          continue;
        } else {
          // Stored as JSONB column in main table
          fields.push({ column_name: col, db_field: col, type: "jsonb", data_type: "jsonb", required: false });
          continue;
        }
      }

      // Master-source fields store a foreign key (integer ID) → force INTEGER type
      const isMasterField = f.data_source?.type === "master" || f.dataSource?.type === "master";
      const resolvedType  = isMasterField ? "integer" : (f.data_type || f.type);

      fields.push({ ...f, column_name: col, db_field: col, type: resolvedType, data_type: resolvedType });
    }
  }
  return fields;
}

// -------------------------------------------------------
// Provision separate SQL tables for add_more sections & fields (storage_type === "table")
// -------------------------------------------------------
async function provisionAddMoreTables(slug, parentTableName, definition) {
  const def = typeof definition === "string" ? JSON.parse(definition) : (definition || {});
  const sections = def?.sections || [];

  // Collect all add_more entities (section-level or field-level inside general sections)
  const addMoreItems = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    if (sec.type === "add_more" && sec.storage_type !== "json") {
      addMoreItems.push({
        item: sec,
        rawSlug: sec.slug || slugify(sec.section_label || `add_more_${i + 1}`),
        customTable: sec.table || sec.table_name,
        fields: typeof sec.fields === "string" ? JSON.parse(sec.fields || "[]") : (sec.fields || []),
      });
    }

    const secFields = typeof sec.fields === "string" ? JSON.parse(sec.fields || "[]") : (sec.fields || []);
    for (const f of secFields) {
      if (
        (f.type === "add_more" || f.type === "repeater" || f.type === "table_grid") &&
        (f.storage_type === "table" || f.storage === "table")
      ) {
        addMoreItems.push({
          item: f,
          rawSlug: f.db_field || f.column_name || slugify(f.label || "add_more"),
          customTable: f.table_name || f.table,
          fields: typeof f.fields === "string" ? JSON.parse(f.fields || "[]") : (f.fields || []),
        });
      }
    }
  }

  for (let i = 0; i < addMoreItems.length; i++) {
    const { item, rawSlug, customTable, fields } = addMoreItems[i];

    let childTableName;
    if (customTable && String(customTable).trim()) {
      childTableName = String(customTable).trim();
    } else {
      const secSlug = rawSlug.startsWith(`${slug}_`) ? rawSlug : `${slug}_${rawSlug}`;
      childTableName = `${FORM_TABLE_PREFIX}${secSlug}`;
    }

    try {
      ddlService.validateIdentifier(childTableName, "add_more table name");
    } catch (e) {
      console.warn(`[DDL] Invalid table name "${childTableName}":`, e.message);
      continue;
    }

    // Build fields (parent_id foreign key + child fields)
    const childFields = [
      { column_name: "parent_id", type: "integer", required: true },
      ...(fields || []).map(f => {
        const col = f.column_name || f.db_field || (f.label ? slugify(f.label) : null) || f.id;
        const isMasterField = f.data_source?.type === "master" || f.dataSource?.type === "master";
        const resolvedType  = isMasterField ? "integer" : (f.data_type || f.type || "text");
        return { ...f, column_name: col, type: resolvedType, data_type: resolvedType };
      })
    ];

    console.log(`[DDL] 🛠 Provisioning add_more child table "${childTableName}"...`);
    if (!(await ddlService.tableExists(childTableName))) {
      await ddlService.createTable(childTableName, null, childFields);
    } else {
      await ddlService.syncTableColumns(childTableName, childFields);
    }

    // Sync master FK constraints for master-select fields inside this add_more section/field
    await ddlService.syncMasterForeignKeys(childTableName, [{ fields }]);

    // Update section/field metadata
    item.table = childTableName;
    item.table_name = childTableName;
    item.primary_key = "id";
    item.relation = { parent_table: parentTableName, foreign_key: "parent_id" };
  }
}

// -------------------------------------------------------
// GET ALL SCHEMAS (Configurator)
// -------------------------------------------------------
const getAllSchemas = async (req, res, next) => {
  try {
    await ensureIsDraftColumn();
    const { search = "", page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, page) - 1) * parseInt(limit, 10);

    let where = "f.deleted_at IS NULL";
    const params = [];
    let idx = 1;

    if (search?.trim()) {
      where += ` AND (f.title ILIKE $${idx} OR f.slug ILIKE $${idx})`;
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const countRes = await db.query(`SELECT COUNT(*) AS total FROM t_form f WHERE ${where}`, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    params.push(parseInt(limit, 10), offset);
    const dataRes = await db.query(
      `SELECT f.form_id AS id,
              f.title,
              f.slug,
              COALESCE(f.root_entity->>'table', '') AS table_name,
              f.is_active,
              f.is_master,
              CASE WHEN (to_jsonb(f)->>'is_draft') = 'true' THEN TRUE ELSE FALSE END AS is_draft,
              f.parent_form_id,
              pf.slug AS parent_form_slug,
              pf.title AS parent_form_name,
              f.actions,
              COALESCE((to_jsonb(f)->>'enable_approval')::boolean, f.enable_approval, FALSE) AS enable_approval,
              f.created_at
       FROM t_form f
       LEFT JOIN t_form pf ON pf.form_id::text = f.parent_form_id::text
       WHERE ${where}
       ORDER BY f.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.status(200).json({
      success: true,
      data: dataRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET SCHEMA BY ID (Configurator)
// -------------------------------------------------------
const getSchemaById = async (req, res, next) => {
  try {
    await ensureIsDraftColumn();
    const { id } = req.params;
    const result = await db.query(
      `SELECT f.form_id AS id,
              f.title,
              f.slug,
              COALESCE(f.root_entity->>'table', '') AS table_name,
              f.is_active,
              f.is_master,
              CASE WHEN (to_jsonb(f)->>'is_draft') = 'true' THEN TRUE ELSE FALSE END AS is_draft,
              f.parent_form_id,
              pf.slug AS parent_form_slug,
              pf.title AS parent_form_name,
              COALESCE(to_jsonb(f)->>'modal_size', f.root_entity->>'modal_size', '1400') AS modal_size,
              f.actions,
              COALESCE((to_jsonb(f)->>'enable_approval')::boolean, f.enable_approval, FALSE) AS enable_approval,
              COALESCE((to_jsonb(f)->>'enable_action_tabs')::boolean, FALSE) AS enable_action_tabs,
              COALESCE(to_jsonb(f)->'action_tabs', '[]'::jsonb) AS action_tabs,
              COALESCE(to_jsonb(f)->'table_columns', '[]'::jsonb) AS table_columns,
              COALESCE(to_jsonb(f)->>'view_name', '') AS view_name,
              COALESCE(to_jsonb(f)->>'view_slug', '') AS view_slug,
              COALESCE(to_jsonb(f)->'triggers', '[]'::jsonb) AS triggers,
              COALESCE(to_jsonb(f)->'relation_with_parent', '{}'::jsonb) AS relation_with_parent,
              f.created_at,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'id', s.section_id,
                    'section_id', s.section_id,
                    'section_label', s.section_label,
                    'title', s.section_label,
                    'type', s.type,
                    'slug', s.slug,
                    'table', s."table",
                    'table_name', s."table",
                    'primary_key', s.primary_key,
                    'relation', s.relation,
                    'fields', s.fields,
                    'context', s.context
                  )
                  ORDER BY s.section_id
                ) FILTER (WHERE s.section_id IS NOT NULL),
                '[]'::jsonb
              ) AS sections
       FROM t_form f
       LEFT JOIN t_form pf ON pf.form_id::text = f.parent_form_id::text
       LEFT JOIN t_section s ON s.section_form_id = f.form_id AND s.is_active = TRUE AND s.deleted_at IS NULL
       WHERE (f.form_id = $1 OR f.slug = $1) AND f.deleted_at IS NULL
       GROUP BY f.form_id, pf.form_id`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Form schema not found" });

    const row = result.rows[0];

    // Ensure section fields are parsed objects rather than raw JSON strings
    const parsedSections = (row.sections || []).map((sec) => {
      let fields = sec.fields;
      if (typeof fields === "string") {
        try {
          fields = JSON.parse(fields);
        } catch {
          fields = [];
        }
      }
      return {
        ...sec,
        fields: Array.isArray(fields) ? fields : [],
      };
    });

    row.sections = parsedSections;
    row.relation_with_parent = typeof row.relation_with_parent === "string" ? JSON.parse(row.relation_with_parent) : (row.relation_with_parent || {});

    return res.status(200).json({ success: true, data: row });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET SCHEMA BY SLUG (any authenticated user — to render the form)
// -------------------------------------------------------
const getSchemaBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const schema = await formEngine.getSchema(slug);
    if (!schema)
      return res.status(404).json({ success: false, message: "Form not found" });

    return res.status(200).json({ success: true, data: schema });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET MASTER FORMS (Configurator) — forms marked is_master=true
// -------------------------------------------------------
const getMasterForms = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         f.form_id,
         f.title,
         f.slug,
         COALESCE(f.root_entity->>'table', CONCAT('t_frm_', f.slug)) AS table_name,
         COALESCE(s.primary_key, 'id') AS primary_key,
         (
           SELECT jsonb_agg(
                    jsonb_build_object(
                      'db_field', fld->>'db_field',
                      'label',    COALESCE(fld->>'label', fld->>'db_field'),
                      'id',       fld->>'id',
                      'type',     fld->>'type'
                    )
                  )
           FROM t_section sec2
           CROSS JOIN LATERAL jsonb_array_elements(
             CASE WHEN jsonb_typeof(sec2.fields) = 'array' THEN sec2.fields ELSE '[]'::jsonb END
           ) AS fld
           WHERE sec2.section_form_id = f.form_id
             AND sec2.is_active = TRUE
             AND (fld->>'db_field') IS NOT NULL
             AND (fld->>'db_field') != ''
         ) AS fields
       FROM t_form f
       LEFT JOIN t_section s
         ON s.section_form_id = f.form_id
        AND s.type = 'general'
        AND s.is_active = TRUE
        AND s.deleted_at IS NULL
       WHERE f.deleted_at IS NULL
         AND f.is_active = TRUE
       GROUP BY f.form_id, f.title, f.slug, f.root_entity, s.primary_key
       ORDER BY f.title ASC`,
      []
    );

    const masterConfigsRes = await db.query(
      `SELECT slug, table_name, primary_key, label_key, foreign_key FROM t_master_configs ORDER BY slug ASC`,
      []
    ).catch(() => ({ rows: [] }));

    const forms = [...result.rows];
    const existingSlugs = new Set(forms.map((f) => f.slug));

    for (const cfg of masterConfigsRes.rows || []) {
      if (cfg.slug && !existingSlugs.has(cfg.slug)) {
        forms.push({
          form_id: null,
          title: cfg.slug,
          slug: cfg.slug,
          table_name: cfg.table_name,
          primary_key: cfg.primary_key || "id",
          fields: [],
        });
        existingSlugs.add(cfg.slug);
      }
    }

    return res.status(200).json({ success: true, data: forms });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// CREATE SCHEMA (Configurator) — also auto-creates DB table
// -------------------------------------------------------
const createSchema = async (req, res, next) => {
  try {
    await ensureIsDraftColumn();
    const {
      name,
      title,
      slug: inputSlug,
      description,
      definition,
      sections,
      actions,
      enable_action_tabs,
      action_tabs,
      table_columns,
      view_name,
      view_slug,
      triggers,
      workflow_id,
      enable_approval,
      allow_draft = false,
      is_master = false,
      is_draft = false,
      parent_form_id,
      relation_with_parent,
    } = req.body;

    const formName = (name || title || "").trim();
    if (!formName)
      return res.status(400).json({ success: false, message: "Form name is required" });

    const formDefinition = definition || { sections: sections || [] };
    const effectiveTriggers = triggers !== undefined ? triggers : formDefinition?.triggers;
    const slug      = inputSlug ? slugify(inputSlug) : slugify(formName);
    const tableName = `${FORM_TABLE_PREFIX}${slug}`;

    try {
      ddlService.validateIdentifier(slug, "slug");
      ddlService.validateIdentifier(tableName, "table name");
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    // Check duplicate slug OR form title
    const existing = await db.query(
      `SELECT form_id, title, slug FROM t_form 
       WHERE (LOWER(slug) = LOWER($1) OR LOWER(title) = LOWER($2)) 
         AND deleted_at IS NULL`,
      [slug, formName]
    );
    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      const conflict = (match.title || "").toLowerCase() === formName.toLowerCase()
        ? `title "${match.title}"`
        : `slug "${match.slug}"`;
      return res.status(409).json({
        success: false,
        message: `A form with this ${conflict} already exists. Please choose a unique name.`,
      });
    }

    // Check if table name is already used by an active form
    const tableExisting = await db.query(
      `SELECT title, slug FROM t_form 
       WHERE (root_entity->>'table' = $1 OR CONCAT('t_frm_', slug) = $1) 
         AND deleted_at IS NULL`,
      [tableName]
    );
    if (tableExisting.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Database table "${tableName}" is already used by form "${tableExisting.rows[0].title}". Please choose a different form name or slug.`,
      });
    }

    // Validate fields in definition
    const fields = extractFields(formDefinition);
    for (const field of fields) {
      if (!field.column_name) continue;
      try {
        ddlService.validateIdentifier(field.column_name, "column name");
        ddlService.getPgType(field.data_type || field.type);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    // CRITICAL: Create/provision database tables ONLY when final submit (is_draft is false)
    if (!is_draft) {
      const allFields = [
        ...(parent_form_id ? [{ column_name: "parent_id", type: "integer", required: false }] : []),
        ...fields,
      ];

      if (!(await ddlService.tableExists(tableName))) {
        await ddlService.createTable(tableName, null, allFields);
      } else {
        await ddlService.syncTableColumns(tableName, allFields);
      }

      // Automatically sync parent Foreign Key constraint (ON DELETE CASCADE)
      await ddlService.syncParentForeignKey(tableName, parent_form_id);

      // Sync master-select Foreign Keys for all master fields in sections
      await ddlService.syncMasterForeignKeys(tableName, formDefinition?.sections || []);

      // Provision child SQL tables for add_more sections (storage_type === "table")
      await provisionAddMoreTables(slug, tableName, formDefinition);

      // Auto-create and attach native PostgreSQL triggers & PL/pgSQL functions
      const effectiveTriggers = triggers !== undefined ? triggers : (formDefinition?.triggers || []);
      const synthesizedTriggers = [];
      for (const f of allFields) {
        if (f.validation?.dynamic_limit?.enabled && f.validation.dynamic_limit.target_table) {
          const dl = f.validation.dynamic_limit;
          const fieldCol = f.column_name || f.db_field || f.id;
          synthesizedTriggers.push({
            id: `trg_fld_${fieldCol}`,
            name: `Dynamic Limit (${f.label || fieldCol})`,
            enabled: true,
            events: ["create", "update", "delete"],
            target_table: dl.target_table,
            target_pk: "id",
            source_fk_field: dl.source_fk_field || "parent_id",
            validation: {
              enabled: true,
              current_amount_field: fieldCol,
              target_limit_field: dl.target_limit_field || "project_amount",
              error_message: dl.error_message || "Entered amount exceeds remaining project balance.",
            },
            actions: dl.remaining_field ? [
              {
                id: `act_${fieldCol}`,
                target_field: dl.remaining_field || "remaining_amount",
                action_type: "recalculate_balance",
                target_total_field: dl.target_limit_field || "project_amount",
                source_amount_field: fieldCol,
              }
            ] : [],
          });
        }
      }
      const combinedTriggers = [
        ...effectiveTriggers,
        ...synthesizedTriggers.filter((st) => !effectiveTriggers.some((et) => et.id === st.id)),
      ];
      await ddlService.syncTableTriggers(tableName, combinedTriggers);

      // Auto-create/refresh PostgreSQL Database View & app_database_views metadata
      await ensureFormDatabaseView({
        slug,
        formName,
        tableName,
        formDefinition,
        userId: req.user?.user_id || 0,
      });
    }

    // Save directly into primary t_form and t_section tables
    const formId = await syncFormToTFormAndTSection({
      formName,
      slug,
      tableName,
      formDefinition,
      isMaster: !!is_master,
      isDraft: !!is_draft,
      parentFormId: parent_form_id,
      actions,
      enableActionTabs: enable_action_tabs,
      actionTabs: action_tabs,
      tableColumns: table_columns,
      viewName: view_name,
      viewSlug: view_slug,
      triggers: effectiveTriggers,
      enableApproval: enable_approval !== undefined ? !!enable_approval : false,
      relationWithParent: relation_with_parent !== undefined ? relation_with_parent : formDefinition?.relation_with_parent,
      userId: req.user?.user_id || 0,
    });

    return res.status(201).json({
      success: true,
      message: is_draft
        ? `Form "${formName}" saved as draft.`
        : `Form "${formName}" created and table "${tableName}" provisioned successfully.`,
      data: {
        id: formId,
        title: formName,
        name: formName,
        slug,
        table_name: tableName,
        is_master: !!is_master,
        is_draft: !!is_draft,
        enable_approval: !!enable_approval,
        parent_form_id: (parent_form_id && parent_form_id !== "NaN" && parent_form_id !== "undefined") ? parent_form_id : null,
        relation_with_parent: relation_with_parent || null,
        is_active: true,
      },
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// UPDATE SCHEMA (Configurator) — adds new columns to DB table
// -------------------------------------------------------
const updateSchema = async (req, res, next) => {
  try {
    await ensureIsDraftColumn();
    const { id } = req.params;
    const {
      name,
      title,
      slug: inputSlug,
      description,
      definition,
      sections,
      actions,
      enable_action_tabs,
      action_tabs,
      table_columns,
      view_name,
      view_slug,
      triggers,
      workflow_id,
      allow_draft,
      is_active,
      is_master,
      is_draft,
      parent_form_id,
      enable_approval,
      relation_with_parent,
    } = req.body;

    const formName = (name || title || "").trim();
    let formDefinition = definition || (sections ? { sections } : undefined);

    const existing = await db.query(
      `SELECT f.form_id, f.title, f.slug, COALESCE(f.root_entity->>'table', '') AS table_name,
              CASE WHEN (to_jsonb(f)->>'is_draft') = 'true' THEN TRUE ELSE FALSE END AS is_draft,
              f.parent_form_id
       FROM t_form f WHERE (f.form_id = $1 OR f.slug = $1) AND f.deleted_at IS NULL`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Form schema not found" });
    }

    const schema = existing.rows[0];
    const targetTableName = schema.table_name || `${FORM_TABLE_PREFIX}${schema.slug}`;
    const rawParentId = parent_form_id !== undefined ? parent_form_id : schema.parent_form_id;
    const effectiveParentFormId = (rawParentId && rawParentId !== "NaN" && rawParentId !== "undefined" && rawParentId !== "null") ? rawParentId : null;

    // If definition was not provided, load existing sections from DB so fields/sections are preserved
    if (!formDefinition) {
      const existingSecRes = await db.query(
        `SELECT section_id AS id, section_id, section_label, type, slug, "table", primary_key, relation, fields, context
         FROM t_section
         WHERE section_form_id = $1 AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY section_id`,
        [schema.form_id]
      );
      formDefinition = { sections: existingSecRes.rows };
    }

    const rawDraft = is_draft !== undefined ? is_draft : schema.is_draft;
    const finalIsDraft = rawDraft !== undefined ? !!rawDraft : false;
    const effectiveIsMaster = is_master !== undefined ? is_master : undefined;
    const effectiveActions = actions !== undefined ? actions : undefined;
    const effectiveTriggers = triggers !== undefined ? triggers : (formDefinition?.triggers !== undefined ? formDefinition.triggers : (schema.triggers || []));

    // Create/sync database tables and triggers
    if (formDefinition) {
      const newFields = extractFields(formDefinition);
      const allFields = [
        ...(effectiveParentFormId ? [{ column_name: "parent_id", type: "integer", required: false }] : []),
        ...newFields,
      ];

      const tableAlreadyExists = await ddlService.tableExists(targetTableName);

      if (!finalIsDraft) {
        if (!tableAlreadyExists) {
          await ddlService.createTable(targetTableName, null, allFields);
        } else {
          await ddlService.syncTableColumns(targetTableName, allFields);
        }

        // Automatically sync parent Foreign Key constraint (ON DELETE CASCADE)
        await ddlService.syncParentForeignKey(targetTableName, effectiveParentFormId);

        // Sync master-select Foreign Keys for all master fields in sections
        await ddlService.syncMasterForeignKeys(targetTableName, formDefinition?.sections || []);

        // Provision child SQL tables for add_more sections (storage_type === "table")
        await provisionAddMoreTables(schema.slug, targetTableName, formDefinition);

        // Ensure PostgreSQL Database View metadata exists without overwriting custom modifications made in Database Views
        await ensureFormDatabaseView({
          slug: schema.slug,
          formName: formName || schema.title,
          tableName: targetTableName,
          formDefinition,
          userId: req.user?.user_id || 0,
          onlyIfMissing: true,
        });
      } else if (tableAlreadyExists) {
        // Even for draft saves, if the SQL table already exists, sync columns
        await ddlService.syncTableColumns(targetTableName, allFields);
      }

      // Auto-create and attach native PostgreSQL triggers & PL/pgSQL functions whenever table exists
      if (!finalIsDraft || tableAlreadyExists) {
        const synthesizedTriggers = [];
        for (const f of allFields) {
          if (f.validation?.dynamic_limit?.enabled && f.validation.dynamic_limit.target_table) {
            const dl = f.validation.dynamic_limit;
            const fieldCol = f.column_name || f.db_field || f.id;
            synthesizedTriggers.push({
              id: `trg_fld_${fieldCol}`,
              name: `Dynamic Limit (${f.label || fieldCol})`,
              enabled: true,
              events: ["create", "update", "delete"],
              target_table: dl.target_table,
              target_pk: "id",
              source_fk_field: dl.source_fk_field || "parent_id",
              validation: {
                enabled: true,
                current_amount_field: fieldCol,
                target_limit_field: dl.target_limit_field || "project_amount",
                error_message: dl.error_message || "Entered amount exceeds remaining project balance.",
              },
              actions: dl.remaining_field ? [
                {
                  id: `act_${fieldCol}`,
                  target_field: dl.remaining_field || "remaining_amount",
                  action_type: "recalculate_balance",
                  target_total_field: dl.target_limit_field || "project_amount",
                  source_amount_field: fieldCol,
                }
              ] : [],
            });
          }
        }

        const combinedTriggers = [
          ...effectiveTriggers,
          ...synthesizedTriggers.filter((st) => !effectiveTriggers.some((et) => et.id === st.id)),
        ];

        await ddlService.syncTableTriggers(targetTableName, combinedTriggers);
      }
    }

    const updatedFormName = formName || schema.title;

    // Save directly into t_form and t_section tables
    const formId = await syncFormToTFormAndTSection({
      formName: updatedFormName,
      slug: schema.slug,
      tableName: targetTableName,
      formDefinition: formDefinition || {},
      isMaster: effectiveIsMaster !== undefined ? !!effectiveIsMaster : undefined,
      isDraft: finalIsDraft,
      parentFormId: effectiveParentFormId,
      actions: effectiveActions,
      enableActionTabs: enable_action_tabs,
      actionTabs: action_tabs,
      tableColumns: table_columns,
      viewName: view_name,
      viewSlug: view_slug,
      triggers: effectiveTriggers,
      enableApproval: enable_approval,
      relationWithParent: relation_with_parent !== undefined ? relation_with_parent : (formDefinition?.relation_with_parent !== undefined ? formDefinition.relation_with_parent : schema.relation_with_parent),
      userId: req.user?.user_id || 0,
    });

    // Also directly update flags if provided
    const flagUpdates = [];
    const flagParams = [];
    let flagIdx = 1;
    if (effectiveIsMaster !== undefined) {
      flagUpdates.push(`is_master = $${flagIdx++}`);
      flagParams.push(!!effectiveIsMaster);
    }
    const effectiveIsActive = is_active !== undefined ? is_active : undefined;
    if (effectiveIsActive !== undefined) {
      flagUpdates.push(`is_active = $${flagIdx++}`);
      flagParams.push(!!effectiveIsActive);
    }
    if (rawDraft !== undefined) {
      flagUpdates.push(`is_draft = $${flagIdx++}`);
      flagParams.push(!!finalIsDraft);
    }
    if (rawParentId !== undefined) {
      flagUpdates.push(`parent_form_id = $${flagIdx++}`);
      flagParams.push(effectiveParentFormId);
    }
    if (enable_approval !== undefined) {
      flagUpdates.push(`enable_approval = $${flagIdx++}`);
      flagParams.push(!!enable_approval);
    }
    if (relation_with_parent !== undefined) {
      flagUpdates.push(`relation_with_parent = $${flagIdx++}::jsonb`);
      flagParams.push(JSON.stringify(relation_with_parent || {}));
    }
    if (flagUpdates.length > 0) {
      flagParams.push(schema.form_id);
      await db.query(
        `UPDATE t_form SET ${flagUpdates.join(", ")}, updated_at = NOW() WHERE form_id = $${flagIdx}`,
        flagParams
      );
    }

    return res.status(200).json({
      success: true,
      message: finalIsDraft
        ? `Form "${updatedFormName}" draft updated successfully.`
        : `Form "${updatedFormName}" submitted and table provisioned successfully.`,
      data: {
        id: formId || schema.form_id,
        title: updatedFormName,
        name: updatedFormName,
        slug: schema.slug,
        table_name: targetTableName,
        is_master: effectiveIsMaster !== undefined ? !!effectiveIsMaster : undefined,
        is_draft: finalIsDraft,
        is_active: effectiveIsActive !== undefined ? !!effectiveIsActive : true,
      },
    });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// Helper: Inspect Form Dependencies (Data, Tables, Database Views, Child Forms)
// -------------------------------------------------------
async function inspectFormDependencies(formIdOrSlug) {
  const formRes = await db.query(
    `SELECT f.form_id, f.title, f.slug,
            CASE WHEN (to_jsonb(f)->>'is_draft') = 'true' THEN TRUE ELSE FALSE END AS is_draft,
            COALESCE(f.root_entity->>'table', '') AS configured_table,
            to_jsonb(f)->>'view_name' AS view_name,
            to_jsonb(f)->>'view_slug' AS view_slug
     FROM t_form f 
     WHERE (f.form_id::text = $1 OR f.slug = $1) AND f.deleted_at IS NULL
     LIMIT 1`,
    [String(formIdOrSlug)]
  );

  if (formRes.rows.length === 0) {
    return null;
  }

  const form = formRes.rows[0];
  const formId = form.form_id;
  const slug = form.slug;
  const targetTable = form.configured_table || `t_frm_${slug}`;
  const defaultViewSlug = `v_${slug}`;

  // 1. Check Primary Database Table records
  let primaryTableExists = false;
  let primaryTableCount = 0;
  if (/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(targetTable)) {
    const tblCheck = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
      [targetTable]
    );
    if (tblCheck.rows.length > 0) {
      primaryTableExists = true;
      try {
        const countRes = await db.query(`SELECT COUNT(*)::int AS cnt FROM public."${targetTable}"`);
        primaryTableCount = parseInt(countRes.rows[0]?.cnt || 0, 10);
      } catch (e) {
        console.warn(`[PreDeleteCheck] Could not count rows in ${targetTable}:`, e.message);
      }
    }
  }

  // 2. Check Child Add-More Tables
  const childTables = [];
  try {
    const childTablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND (table_name LIKE $1 OR table_name LIKE $2)
         AND table_name != $3`,
      [`t_frm_${slug}_%`, `${targetTable}_%`, targetTable]
    );
    for (const row of childTablesRes.rows) {
      const cTable = row.table_name;
      let cCount = 0;
      try {
        const cRes = await db.query(`SELECT COUNT(*)::int AS cnt FROM public."${cTable}"`);
        cCount = parseInt(cRes.rows[0]?.cnt || 0, 10);
      } catch (e) {}
      childTables.push({ table_name: cTable, count: cCount });
    }
  } catch (e) {
    console.warn("[PreDeleteCheck] Child tables check warning:", e.message);
  }

  // 3. Check Submissions in t_forms_data
  let formsDataCount = 0;
  try {
    const fdCheck = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_forms_data' LIMIT 1`
    );
    if (fdCheck.rows.length > 0) {
      const fdRes = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM public.t_forms_data WHERE form_slug = $1 OR target_table = $2`,
        [slug, targetTable]
      );
      formsDataCount = parseInt(fdRes.rows[0]?.cnt || 0, 10);
    }
  } catch (e) {
    console.warn("[PreDeleteCheck] t_forms_data check warning:", e.message);
  }

  // 4. Check Dependent Database Views (in app_database_views metadata & PostgreSQL)
  let views = [];
  try {
    const metaCheck = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_database_views' LIMIT 1`
    );
    if (metaCheck.rows.length > 0) {
      const viewsRes = await db.query(
        `SELECT id, view_name, view_slug, database_view_name, base_table, view_type, status, is_active
         FROM public.app_database_views
         WHERE is_active = TRUE 
           AND (
             base_table = $1 
             OR base_table = $2 
             OR view_slug = $3 
             OR database_view_name = $3
             OR view_slug = $4 
             OR database_view_name = $4
             OR configuration_json->>'base_table' = $1
             OR configuration_json->>'base_table' = $2
           )`,
        [targetTable, `t_frm_${slug}`, defaultViewSlug, form.view_slug || defaultViewSlug]
      );
      views = viewsRes.rows;
    }
  } catch (e) {
    console.warn("[PreDeleteCheck] Database views check warning:", e.message);
  }

  // 5. Check Child Forms referencing this as parent_form_id
  let childForms = [];
  try {
    const childFormsRes = await db.query(
      `SELECT form_id AS id, title, slug, is_active
       FROM t_form
       WHERE deleted_at IS NULL 
         AND (parent_form_id = $1 OR parent_form_id = $2 OR parent_form_id = $3)
         AND form_id != $4`,
      [String(formId), slug, String(form.form_id), formId]
    );
    childForms = childFormsRes.rows;
  } catch (e) {
    console.warn("[PreDeleteCheck] Child forms check warning:", e.message);
  }

  const childTablesTotalRecords = childTables.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const totalRecordsCount = primaryTableCount + childTablesTotalRecords + formsDataCount;
  const isDraft = form.is_draft !== false;
  const canDeleteDirectly = isDraft && (totalRecordsCount === 0 && views.length === 0 && childForms.length === 0);

  return {
    form: {
      form_id: formId,
      title: form.title,
      slug: form.slug,
      is_draft: isDraft,
      table_name: targetTable,
    },
    isDraft,
    canDeleteDirectly,
    summary: {
      totalRecordsCount,
      primaryTableCount,
      childTablesCount: childTables.length,
      childTablesRecordsCount: childTablesTotalRecords,
      formsDataCount,
      viewsCount: views.length,
      childFormsCount: childForms.length,
    },
    details: {
      primaryTable: {
        table_name: targetTable,
        exists: primaryTableExists,
        count: primaryTableCount,
      },
      childTables,
      formsDataCount,
      views,
      childForms,
    },
  };
}

// -------------------------------------------------------
// PRE-DELETE CHECK (Configurator) — AWS-style dependency inspection
// -------------------------------------------------------
const preDeleteCheck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const info = await inspectFormDependencies(id);
    if (!info) {
      return res.status(404).json({ success: false, message: "Form schema not found" });
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
// DELETE SCHEMA (Configurator) — Strict deletion (Requires clean child data & views first)
// -------------------------------------------------------
const deleteSchema = async (req, res, next) => {
  try {
    const { id } = req.params;

    const info = await inspectFormDependencies(id);
    if (!info) {
      return res.status(404).json({ success: false, message: "Form schema not found" });
    }

    const { form, canDeleteDirectly, summary } = info;

    if (!form.is_draft) {
      return res.status(400).json({
        success: false,
        code: "PUBLISHED_FORM_CANNOT_BE_DELETED",
        message: `Cannot delete form "${form.title}" because it has already been published. Delete is only available for draft forms.`,
      });
    }

    // Strict rule: If any records, child tables, database views, or child forms exist, block deletion!
    if (!canDeleteDirectly) {
      const blockers = [];
      if (summary.totalRecordsCount > 0) blockers.push(`${summary.totalRecordsCount} data record(s)`);
      if (summary.viewsCount > 0) blockers.push(`${summary.viewsCount} database view(s)`);
      if (summary.childFormsCount > 0) blockers.push(`${summary.childFormsCount} child form(s)`);

      return res.status(409).json({
        success: false,
        code: "HAS_DEPENDENCIES",
        message: `Cannot delete form "${form.title}". Active dependencies found: ${blockers.join(", ")}. Please delete/clean the child data and views first.`,
        ...info,
      });
    }

    // When everything is clean (0 records, 0 views, 0 child forms), soft-delete the form schema
    await db.query(
      `UPDATE t_form
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE form_id = $2`,
      [req.user?.user_id || null, form.form_id]
    );

    if (form.form_id) {
      await db.query(
        `UPDATE t_section
         SET is_active = FALSE, deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE section_form_id = $2 AND (deleted_at IS NULL OR is_active = TRUE)`,
        [req.user?.user_id || null, form.form_id]
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: `Form "${form.title}" deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// GENERIC FORM DATA ENDPOINTS — authenticated users
// -------------------------------------------------------
const listRecords = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { page, limit, search, sortBy, sortOrder, ...filters } = req.query;
    const result = await formEngine.list(slug, { page, limit, search, sortBy, sortOrder, filters });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.message.includes("not found")) return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
};

const getRecord = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const record = await formEngine.getOne(slug, id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (err) { next(err); }
};

const createRecord = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { _draft, ...data } = req.body;
    const record = await formEngine.create(slug, data, req.user?.user_id, _draft === true);
    return res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

const updateRecord = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const record = await formEngine.update(slug, id, req.body, req.user?.user_id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    return res.status(200).json({ success: true, data: record });
  } catch (err) { next(err); }
};

const deleteRecord = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const deleted = await formEngine.softDelete(slug, id, req.user?.user_id);
    if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
    return res.status(200).json({ success: true, message: "Record deleted" });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET ALL DATABASE TABLES — from information_schema
// -------------------------------------------------------
const getAllDatabaseTables = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
       ORDER BY table_name ASC`,
      []
    );
    const tables = (result.rows || []).map((row) => ({
      table_name: row.table_name,
      label: row.table_name,
      value: row.table_name,
    }));
    return res.status(200).json({ success: true, data: tables });
  } catch (err) { next(err); }
};

// -------------------------------------------------------
// GET TABLE COLUMNS AS FORM BUILDER FIELDS
// -------------------------------------------------------
const getTableColumnsForFormBuilder = async (req, res, next) => {
  try {
    const { tableName } = req.params;
    if (!tableName || !tableName.trim()) {
      return res.status(400).json({ success: false, message: "Table name is required" });
    }

    const cleanTable = tableName.trim().toLowerCase();

    // Query information_schema for columns and data types
    const colRes = await db.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND LOWER(table_name) = $1
       ORDER BY ordinal_position ASC`,
      [cleanTable]
    );

    if (colRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Table "${cleanTable}" not found in database`,
      });
    }

    // Filter out internal / system columns
    const IGNORED_COLUMNS = new Set([
      "id",
      "created_at",
      "updated_at",
      "deleted_at",
      "created_by",
      "updated_by",
      "is_active",
      "parent_id",
    ]);

    const humanize = (str = "") => {
      return str
        .replace(/^t_[a-z0-9]+_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
    };

    const fields = [];

    for (const row of colRes.rows) {
      const col = row.column_name;
      if (IGNORED_COLUMNS.has(col.toLowerCase())) continue;

      const dataType = (row.data_type || "").toLowerCase();
      const isNullable = row.is_nullable === "YES";
      const isRequired = !isNullable && row.column_default === null;

      const lowerCol = col.toLowerCase();

      let fieldType = "text";
      let regexType = "";
      let numberType = "";
      let dataSource = null;
      let uiColSpan = 6;

      const isNumericName =
        lowerCol.includes("cost") ||
        lowerCol.includes("amount") ||
        lowerCol.includes("budget") ||
        lowerCol.includes("qty") ||
        lowerCol.includes("quantity") ||
        lowerCol.includes("unit") ||
        lowerCol.includes("price") ||
        lowerCol.includes("rate") ||
        lowerCol.includes("target") ||
        lowerCol.includes("tax") ||
        lowerCol.includes("total") ||
        lowerCol.includes("percent") ||
        lowerCol.includes("percentage") ||
        lowerCol.includes("value") ||
        lowerCol.includes("count");

      const isDateName =
        lowerCol.includes("date") ||
        lowerCol.includes("time") ||
        lowerCol.startsWith("dt_") ||
        lowerCol.endsWith("_dt");

      const isTextareaName =
        lowerCol.includes("desc") ||
        lowerCol.includes("remark") ||
        lowerCol.includes("comment") ||
        lowerCol.includes("notes") ||
        lowerCol.includes("address") ||
        lowerCol.includes("detail") ||
        lowerCol.includes("justification");

      const isSwitchName =
        lowerCol.startsWith("is_") ||
        lowerCol.startsWith("has_") ||
        lowerCol.startsWith("can_") ||
        lowerCol.startsWith("enable_");

      if (
        dataType.includes("int") ||
        dataType.includes("numeric") ||
        dataType.includes("decimal") ||
        dataType.includes("real") ||
        dataType.includes("double") ||
        isNumericName
      ) {
        fieldType = "number";
        const isInteger = dataType.includes("int") || lowerCol.includes("count") || lowerCol.includes("qty") || lowerCol.includes("year");
        regexType = isInteger ? "integer" : "decimal";
        numberType = isInteger ? "integer" : "decimal";
      } else if (dataType === "date" || dataType.includes("timestamp") || dataType.includes("time") || isDateName) {
        fieldType = "date";
      } else if (dataType.includes("bool") || isSwitchName) {
        fieldType = "switch";
        uiColSpan = 4;
      } else if (dataType.includes("json")) {
        fieldType = "textarea";
        uiColSpan = 12;
      } else if (isTextareaName || (row.character_maximum_length && row.character_maximum_length > 300)) {
        fieldType = "textarea";
        uiColSpan = 12;
      } else if (lowerCol.endsWith("_id") || lowerCol.endsWith("_status") || lowerCol.endsWith("_type")) {
        fieldType = "select";
      } else {
        fieldType = "text";
      }

      // Check if ends with _id to suggest master lookup
      if (col.endsWith("_id") && col.length > 3) {
        const baseMaster = col.replace(/_id$/, "");
        fieldType = "select";
        dataSource = {
          name: baseMaster,
          type: "master",
          table_name: `t_frm_${baseMaster}`,
          label_key: "name",
          primary_key: "id",
        };
      }

      const label = humanize(col);

      fields.push({
        id: `fld_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        label: label || col,
        db_field: col,
        column_name: col,
        type: fieldType,
        data_type: row.data_type,
        required: isRequired,
        regex_type: regexType,
        number_type: numberType,
        data_source: dataSource,
        visible: true,
        add_to_query: true,
        add_to_list: true,
        ui: {
          placeholder: `Enter ${label}`,
          col_span: uiColSpan,
          visible: true,
        },
        validation: {
          required: isRequired,
        },
      });
    }

    const columns = colRes.rows.map((row) => ({
      column_name: row.column_name,
      data_type: row.data_type,
      is_nullable: row.is_nullable,
    }));

    return res.status(200).json({
      success: true,
      tableName: cleanTable,
      columnsCount: colRes.rows.length,
      columns,
      fields,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// SYNC PARENT FOREIGN KEY & COLUMN (Configurator)
// -------------------------------------------------------
const syncParentForeignKey = async (req, res, next) => {
  try {
    await ensureIsDraftColumn();
    const { form_id, slug, table_name, parent_form_id } = req.body;

    let targetTableName = table_name ? String(table_name).trim() : "";
    let targetSlug = slug ? String(slug).trim() : "";
    let targetFormId = form_id;

    // 1. Resolve form details if missing
    if (targetFormId) {
      const formRes = await db.query(
        `SELECT form_id, slug, COALESCE(root_entity->>'table', '') AS table_name, parent_form_id
         FROM t_form 
         WHERE (form_id::text = $1 OR slug = $1) AND deleted_at IS NULL LIMIT 1`,
        [String(targetFormId)]
      );
      if (formRes.rows.length > 0) {
        if (!targetTableName) targetTableName = formRes.rows[0].table_name;
        if (!targetSlug) targetSlug = formRes.rows[0].slug;
      }
    } else if (targetSlug) {
      const formRes = await db.query(
        `SELECT form_id, slug, COALESCE(root_entity->>'table', '') AS table_name, parent_form_id 
         FROM t_form 
         WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
        [targetSlug]
      );
      if (formRes.rows.length > 0) {
        if (!targetTableName) targetTableName = formRes.rows[0].table_name;
        targetFormId = formRes.rows[0].form_id;
      }
    }

    if (!targetTableName && targetSlug) {
      targetTableName = `${FORM_TABLE_PREFIX}${targetSlug}`;
    }

    // 2. Perform DDL operation if child table exists
    let ddlResult = null;
    if (targetTableName) {
      const childExists = await ddlService.tableExists(targetTableName);
      if (childExists) {
        ddlResult = await ddlService.syncParentForeignKey(targetTableName, parent_form_id);
      }
    }

    // 3. Update t_form record if exists
    if (targetFormId || targetSlug) {
      await db.query(
        `UPDATE t_form 
         SET parent_form_id = $1, 
             updated_at = NOW() 
         WHERE (form_id::text = $2 OR slug = $3) AND deleted_at IS NULL`,
        [parent_form_id || null, String(targetFormId || ""), String(targetSlug || "")]
      );
    }

    return res.status(200).json({
      success: true,
      message: parent_form_id
        ? "Parent form selected. Column 'parent_id' and FOREIGN KEY constraint updated successfully."
        : "Parent form removed. FOREIGN KEY constraint updated.",
      data: {
        form_id: targetFormId,
        slug: targetSlug,
        table_name: targetTableName,
        parent_form_id: parent_form_id || null,
        ddl: ddlResult,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllSchemas, getSchemaById, getSchemaBySlug, getMasterForms, getAllDatabaseTables, getTableColumnsForFormBuilder,
  createSchema, updateSchema, deleteSchema, preDeleteCheck, syncParentForeignKey,
  listRecords, getRecord, createRecord, updateRecord, deleteRecord,
};

