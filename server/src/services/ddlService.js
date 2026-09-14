// server/src/services/ddlService.js
// ============================================================
// Dynamic DDL Service — creates and alters PostgreSQL tables
// at runtime when Configurator defines masters or forms.
//
// Security: All table/column identifiers are validated against
// an allowlist regex before being embedded in SQL. Values are
// always parameterized ($1, $2 …). Never accepts raw user input
// directly as identifiers without sanitization.
// ============================================================

const db = require("../config/db");

// -------------------------------------------------------
// Identifier validation — only alphanumeric + underscores
// -------------------------------------------------------
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

function validateIdentifier(name, label = "identifier") {
  if (!name || !IDENTIFIER_REGEX.test(name)) {
    throw new Error(
      `[DDL] Invalid ${label}: "${name}". Must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    );
  }
  return name;
}

// -------------------------------------------------------
// Field type → PostgreSQL column type mapping
// -------------------------------------------------------
const FIELD_TYPE_MAP = {
  text:          "TEXT",
  short_text:    "VARCHAR(255)",
  long_text:     "TEXT",
  number:        "NUMERIC(18,4)",
  decimal:       "NUMERIC(18,4)",
  currency:      "NUMERIC(18,2)",
  email:         "VARCHAR(255)",
  mobile:        "VARCHAR(50)",
  url:           "TEXT",
  date:          "DATE",
  datetime:      "TIMESTAMPTZ",
  timestamp:     "TIMESTAMPTZ",
  timestamptz:   "TIMESTAMPTZ",
  time:          "TIME",
  year:          "SMALLINT",
  textarea:      "TEXT",
  text_area:     "TEXT",
  richtext:      "TEXT",
  dropdown:      "TEXT",
  select:        "TEXT",
  multi_select:  "TEXT[]",
  multiselect:   "TEXT[]",
  checkbox:      "BOOLEAN",
  radio:         "TEXT",
  toggle:        "BOOLEAN",
  upload:        "TEXT",          // S3 key
  image:         "TEXT",          // S3 key
  signature:     "TEXT",          // S3 key
  location:      "JSONB",         // { lat, lng, address }
  repeater:      "JSONB",         // array of sub-records
  table_grid:    "JSONB",
  hidden:        "TEXT",
  autonumber:    "SERIAL",
  password:      "TEXT",
  qr_code:       "TEXT",
  barcode:       "TEXT",
  color:         "VARCHAR(50)",
  date_range:    "VARCHAR(255)",
  daterange:     "VARCHAR(255)",
  file:          "TEXT",
  jsonb:         "JSONB",
  json:          "JSONB",
  point:         "JSONB",
  multipolygon:  "JSONB",
  line:          "JSONB",
  linestring:    "JSONB",
  // SQL type aliases for master builder compatibility
  varchar:            "TEXT",
  "varchar(255)":     "TEXT",
  integer:            "INTEGER",
  int:                "INTEGER",
  bigint:             "BIGINT",
  boolean:            "BOOLEAN",
  "double precision": "DOUBLE PRECISION",
  double_precision:   "DOUBLE PRECISION",
  double:             "DOUBLE PRECISION",
  float:              "DOUBLE PRECISION",
  float8:             "DOUBLE PRECISION",
  float4:             "REAL",
  real:               "REAL",
};

function getPgType(fieldType) {
  if (!fieldType) return "TEXT";
  const normalized = (fieldType || "").toLowerCase().trim();
  if (FIELD_TYPE_MAP[normalized]) {
    return FIELD_TYPE_MAP[normalized];
  }
  if (
    normalized.startsWith("varchar") ||
    normalized.startsWith("numeric") ||
    normalized.startsWith("decimal") ||
    normalized.startsWith("double") ||
    normalized.startsWith("float") ||
    normalized.startsWith("real") ||
    normalized.startsWith("char") ||
    normalized.startsWith("int") ||
    normalized.startsWith("text")
  ) {
    return normalized.toUpperCase();
  }
  return "TEXT";
}

// -------------------------------------------------------
// Build the 5 standard audit columns for a given prefix
// When prefix is empty/null, uses clean names (created_by, etc.)
// -------------------------------------------------------
function auditColumns(prefix) {
  const p = prefix ? `${prefix}_` : "";
  if (prefix) validateIdentifier(prefix, "prefix");
  return `
  "${p}created_by"   INTEGER     DEFAULT NULL,
  "${p}updated_by"   INTEGER     DEFAULT NULL,
  "${p}created_at"   TIMESTAMPTZ DEFAULT NOW(),
  "${p}updated_at"   TIMESTAMPTZ DEFAULT NOW(),
  "${p}deleted_at"   TIMESTAMPTZ DEFAULT NULL`.trim();
}

// -------------------------------------------------------
// Build column definition SQL from a field schema object
// -------------------------------------------------------
function buildColumnDef(field, tablePrefix, isAlter = false) {
  const colName = validateIdentifier(field.column_name || field.db_field, "column name");
  const pgType  = getPgType(field.data_type || field.type);

  let def = `"${colName}" ${pgType}`;

  if (field.required && field.type !== "autonumber" && !isAlter) {
    def += " NOT NULL";
  }

  if (field.default_value !== undefined && field.default_value !== null && field.default_value !== "") {
    // Only safe scalar defaults (strings, numbers, booleans)
    if (typeof field.default_value === "string") {
      // Escape single quotes
      const safe = field.default_value.replace(/'/g, "''");
      def += ` DEFAULT '${safe}'`;
    } else if (typeof field.default_value === "number" || typeof field.default_value === "boolean") {
      def += ` DEFAULT ${field.default_value}`;
    }
  }

  if (field.type === "checkbox" || field.type === "toggle") {
    if (field.default_value === undefined) def += " DEFAULT FALSE";
  }

  return def;
}

// -------------------------------------------------------
// CREATE TABLE — called when admin saves a master/form schema
// -------------------------------------------------------
/**
 * @param {string}  tableName   e.g. "t_mst_ngo"
 * @param {string}  prefix      e.g. "mst"  (used for audit columns + PK)
 * @param {Array}   fields      Array of field schema objects from the builder
 * @returns {Promise<void>}
 */
async function createTable(tableName, prefix, fields = []) {
  validateIdentifier(tableName, "table name");
  if (prefix) validateIdentifier(prefix, "column prefix");

  const p = prefix ? `${prefix}_` : "";
  const pkColName = `${p}id`;
  const columnDefs = [`"${pkColName}" SERIAL PRIMARY KEY`];

  for (const field of fields) {
    if (!field.column_name || field.type === "autonumber") continue; // PK handled above
    columnDefs.push(buildColumnDef(field, prefix));
  }

  // Ensure single standard status column exists for draft save ('draft') & submit ('submit') & Action Tabs
  const hasStatusCol = fields.some((f) => (f.column_name || f.db_field) === "status");
  if (!hasStatusCol) {
    columnDefs.push(`"${p}status" VARCHAR(50) DEFAULT 'draft'`);
  }

  // Append standard audit columns
  columnDefs.push(auditColumns(prefix));

  const sql = `
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      ${columnDefs.join(",\n      ")}
    )
  `.trim();

  await db.query(sql);
  console.log(`[DDL] ✅ Table created: ${tableName}`);
}

// -------------------------------------------------------
// ADD COLUMN — called when a new field is added to an existing schema
// -------------------------------------------------------
/**
 * @param {string}  tableName   e.g. "t_mst_ngo"
 * @param {Object}  field       field schema object { column_name, type, required, ... }
 */
async function addColumn(tableName, field) {
  validateIdentifier(tableName, "table name");
  const colName = validateIdentifier(field.column_name || field.db_field, "column name");

  // Check if column already exists
  const exists = await db.query(
    `SELECT column_name, data_type, character_maximum_length
     FROM information_schema.columns
     WHERE LOWER(table_name) = LOWER($1) AND LOWER(column_name) = LOWER($2)`,
    [tableName, colName]
  );

  if (exists.rows.length > 0) {
    const { data_type, character_maximum_length } = exists.rows[0];
    const targetType = getPgType(field.data_type || field.type);
    if (targetType === "JSONB" && !data_type.includes("json")) {
      try {
        await db.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${colName}" TYPE JSONB USING to_jsonb("${colName}")`);
        console.log(`[DDL] 🔄 Column "${tableName}.${colName}" converted to JSONB`);
      } catch (e) {
        console.warn(`[DDL] Could not alter column type to JSONB for ${tableName}.${colName}:`, e.message);
      }
    } else if ((targetType === "DOUBLE PRECISION" || targetType.startsWith("NUMERIC") || targetType === "INTEGER") && (data_type === "text" || data_type.includes("character"))) {
      try {
        await db.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${colName}" TYPE ${targetType} USING NULLIF("${colName}", '')::${targetType.toLowerCase()}`);
        console.log(`[DDL] 🔄 Column "${tableName}.${colName}" converted from ${data_type} → ${targetType}`);
      } catch (e) {
        console.warn(`[DDL] Could not alter column type to ${targetType} for ${tableName}.${colName}:`, e.message);
      }
    } else if (character_maximum_length && (targetType === "TEXT" || targetType.includes("VARCHAR"))) {
      try {
        await db.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${colName}" TYPE TEXT`);
        console.log(`[DDL] 🔄 Column "${tableName}.${colName}" expanded from VARCHAR(${character_maximum_length}) → TEXT`);
      } catch (e) {
        console.warn(`[DDL] Could not alter column type for ${tableName}.${colName}:`, e.message);
      }
    }
    return;
  }

  const colDef = buildColumnDef(field, "", true);
  const sql = `ALTER TABLE "${tableName}" ADD COLUMN ${colDef}`;

  await db.query(sql);
  console.log(`[DDL] ✅ Column added: ${tableName}.${colName}`);
}

// -------------------------------------------------------
// DROP COLUMN — called when a field is removed from a schema
// -------------------------------------------------------
/**
 * @param {string}  tableName    e.g. "t_mst_ngo"
 * @param {string}  columnName   e.g. "mst_registration_no"
 */
async function dropColumn(tableName, columnName) {
  validateIdentifier(tableName, "table name");
  validateIdentifier(columnName, "column name");

  const sql = `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${columnName}"`;
  await db.query(sql);
  console.log(`[DDL] ✅ Column dropped: ${tableName}.${columnName}`);
}

// -------------------------------------------------------
// RENAME COLUMN
// -------------------------------------------------------
/**
 * @param {string}  tableName   e.g. "t_mst_ngo"
 * @param {string}  oldName     current column name
 * @param {string}  newName     new column name
 */
async function renameColumn(tableName, oldName, newName) {
  validateIdentifier(tableName, "table name");
  validateIdentifier(oldName, "old column name");
  validateIdentifier(newName, "new column name");

  const sql = `ALTER TABLE "${tableName}" RENAME COLUMN "${oldName}" TO "${newName}"`;
  await db.query(sql);
  console.log(`[DDL] ✅ Column renamed: ${tableName}.${oldName} → ${newName}`);
}

// -------------------------------------------------------
// RENAME TABLE — called when a section or form table is renamed
// -------------------------------------------------------
/**
 * @param {string}  oldTableName   current table name e.g. "t_frm_proposal_info"
 * @param {string}  newTableName   new table name e.g. "t_frm_proposal_profile"
 */
async function renameTable(oldTableName, newTableName) {
  if (!oldTableName || !newTableName || oldTableName === newTableName) return false;
  validateIdentifier(oldTableName, "old table name");
  validateIdentifier(newTableName, "new table name");

  const existsOld = await tableExists(oldTableName);
  if (!existsOld) return false;

  const existsNew = await tableExists(newTableName);
  if (existsNew) {
    console.warn(`[DDL] Target table "${newTableName}" already exists — skipping rename of "${oldTableName}"`);
    return false;
  }

  const sql = `ALTER TABLE "${oldTableName}" RENAME TO "${newTableName}"`;
  await db.query(sql);
  console.log(`[DDL] 🔄 Table renamed: ${oldTableName} → ${newTableName}`);
  return true;
}

// -------------------------------------------------------
// CREATE INDEX
// -------------------------------------------------------
/**
 * @param {string}  tableName   e.g. "t_mst_ngo"
 * @param {string}  columnName  column to index
 */
async function createIndex(tableName, columnName) {
  validateIdentifier(tableName, "table name");
  validateIdentifier(columnName, "column name");

  const indexName = `idx_${tableName}_${columnName}`;
  const sql = `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("${columnName}")`;
  await db.query(sql);
  console.log(`[DDL] ✅ Index created: ${indexName}`);
}

// -------------------------------------------------------
// TABLE EXISTS check
// -------------------------------------------------------
/**
 * @param {string}  tableName
 * @returns {Promise<boolean>}
 */
async function tableExists(tableName) {
  if (!tableName) return false;
  const result = await db.query(
    `SELECT 1 FROM information_schema.tables
     WHERE LOWER(table_name) = LOWER($1)`,
    [tableName.trim()]
  );
  return result.rows.length > 0;
}

// -------------------------------------------------------
// GET TABLE COLUMNS — useful for dynamic form rendering
// -------------------------------------------------------
/**
 * @param {string}  tableName
 * @returns {Promise<Array>}  [{column_name, data_type, is_nullable, column_default}]
 */
async function getTableColumns(tableName) {
  validateIdentifier(tableName, "table name");

  const result = await db.query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );
  return result.rows;
}

/**
 * Synchronize table columns for a given table with fields from Form Builder schema definition.
 * Adds missing columns (including JSONB columns for add_more sections) and creates table if missing.
 */
async function syncTableColumns(tableName, fields = []) {
  validateIdentifier(tableName, "table name");

  const exists = await tableExists(tableName);
  if (!exists) {
    await createTable(tableName, null, fields);
    return;
  }

  // Ensure single standard status column exists
  await addColumn(tableName, { column_name: "status", type: "varchar", default_value: "draft" }).catch(() => {});

  for (const field of fields) {
    const colName = field.column_name || field.db_field;
    if (!colName || field.type === "autonumber") continue;
    try {
      await addColumn(tableName, { ...field, column_name: colName });
    } catch (e) {
      console.warn(`[DDL] Sync column warning for ${tableName}.${colName}:`, e.message);
    }
  }
}

/**
 * Synchronize parent Foreign Key constraint for a child table dynamically.
 * Adds or drops FK constraint when parent_form is assigned or cleared.
 *
 * @param {string} childTableName  e.g. "t_frm_pan_child"
 * @param {string|number} parentFormId  Parent form ID or slug
 */
async function syncParentForeignKey(childTableName, parentFormId) {
  if (!childTableName) return { success: false, message: "No child table specified" };
  validateIdentifier(childTableName, "child table name");
  const constraintName = `fk_${childTableName}_parent`;

  if (parentFormId && String(parentFormId) !== "null" && String(parentFormId) !== "undefined" && String(parentFormId) !== "") {
    try {
      // 1. Resolve parent table name from t_form
      const parentFormRes = await db.query(
        `SELECT f.slug, COALESCE(f.root_entity->>'table', '') AS table_name 
         FROM t_form f 
         WHERE (f.form_id::text = $1 OR f.slug = $1) AND f.deleted_at IS NULL`,
        [String(parentFormId)]
      );

      let parentTableName = "";
      let parentSlug = "";
      if (parentFormRes.rows.length > 0) {
        parentSlug = parentFormRes.rows[0].slug;
        parentTableName = parentFormRes.rows[0].table_name || `t_frm_${parentSlug}`;
      } else {
        parentSlug = String(parentFormId);
        parentTableName = `t_frm_${parentFormId}`;
      }

      // Check if parent table exists or try fallback names (e.g. t_ngo_...)
      let parentExists = await tableExists(parentTableName);
      if (!parentExists && parentSlug) {
        const altNgo = `t_ngo_${parentSlug}`;
        if (await tableExists(altNgo)) {
          parentTableName = altNgo;
          parentExists = true;
        } else if (await tableExists(parentSlug)) {
          parentTableName = parentSlug;
          parentExists = true;
        }
      }

      validateIdentifier(parentTableName, "parent table name");

      // 2. Ensure parent_id column exists
      await db.query(`ALTER TABLE "${childTableName}" ADD COLUMN IF NOT EXISTS "parent_id" INTEGER;`);

      // 3. Drop existing constraint if present
      await db.query(`ALTER TABLE "${childTableName}" DROP CONSTRAINT IF EXISTS "${constraintName}";`);

      // 4. Check if parent table exists before creating FK constraint
      if (parentExists) {
        // Null out any orphaned parent_id values that don't exist in the parent table
        await db.query(`
          UPDATE "${childTableName}" 
          SET "parent_id" = NULL 
          WHERE "parent_id" IS NOT NULL 
            AND "parent_id" NOT IN (SELECT "id" FROM "${parentTableName}");
        `).catch((err) => console.warn(`[DDL] Orphan cleanup notice for ${childTableName}:`, err.message));

        await db.query(`
          ALTER TABLE "${childTableName}" 
          ADD CONSTRAINT "${constraintName}" 
          FOREIGN KEY ("parent_id") 
          REFERENCES "${parentTableName}"("id") 
          ON DELETE CASCADE;
        `);
        console.log(`[DDL] ✅ Foreign Key created: ${childTableName}.parent_id → ${parentTableName}.id (CASCADE)`);
        return {
          success: true,
          columnCreated: true,
          foreignKeyCreated: true,
          childTableName,
          parentTableName,
          constraintName,
        };
      } else {
        console.log(`[DDL] ℹ️ Added parent_id column to ${childTableName}. Parent table ${parentTableName} not found yet for FK constraint.`);
        return {
          success: true,
          columnCreated: true,
          foreignKeyCreated: false,
          childTableName,
          parentTableName,
        };
      }
    } catch (e) {
      console.warn(`[DDL] Foreign Key sync warning for ${childTableName}:`, e.message);
      return { success: false, message: e.message };
    }
  } else {
    try {
      // Drop Foreign Key constraint when parent_form is cleared
      await db.query(`ALTER TABLE "${childTableName}" DROP CONSTRAINT IF EXISTS "${constraintName}";`);
      console.log(`[DDL] 🔄 Foreign Key dropped: ${constraintName} on ${childTableName}`);
      return {
        success: true,
        columnCreated: false,
        foreignKeyCreated: false,
        foreignKeyDropped: true,
        childTableName,
      };
    } catch (e) {
      console.warn(`[DDL] Foreign Key drop warning for ${childTableName}:`, e.message);
      return { success: false, message: e.message };
    }
  }
}

/**
 * Sync foreign key constraints for all master select fields in a form's sections.
 * For each field with data_source.type === "master" and a known table_name, this
 * creates a FK constraint:  formTable.fieldColumn → masterTable.valuePK
 *
 * @param {string} formTableName  e.g. "t_frm_project"
 * @param {Array}  sections       array of section objects from formDefinition
 */
async function syncMasterForeignKeys(formTableName, sections = []) {
  if (!formTableName) return;
  validateIdentifier(formTableName, "form table name");

  for (const sec of sections) {
    // Add_more section fields belong to their child table (sec.table), not the root table
    if (sec.type === "add_more" && sec.table && sec.table !== formTableName) {
      continue;
    }

    const fields = sec.fields || [];
    for (const field of fields) {
      const ds = field.data_source || field.dataSource;
      if (!ds || ds.type !== "master") continue;

      const colName    = field.column_name || field.db_field;
      const masterTable = ds.table_name  || ds.tableName;
      // SelectFieldConfig stores the PK as "primary_key", not "value_key"
      const masterPK   = ds.primary_key  || ds.value_key || ds.valueKey || "id";

      if (!colName || !masterTable) continue;

      // Validate identifiers — skip silently if invalid
      try {
        validateIdentifier(colName,      "column name");
        validateIdentifier(masterTable,  "master table name");
        validateIdentifier(masterPK,     "master primary key");
      } catch (e) {
        console.warn(`[DDL] Skipping FK for ${formTableName}.${colName} (invalid identifier):`, e.message);
        continue;
      }

      const constraintName = `fk_${formTableName}_${colName}`;

      try {
        // --- Step 1: Check if column exists --------------------------------
        const colRes = await db.query(
          `SELECT column_name, data_type
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND LOWER(table_name)   = LOWER($1)
             AND LOWER(column_name)  = LOWER($2)`,
          [formTableName, colName]
        );

        const isMultiple = !!field.multiple;

        if (isMultiple) {
          // Multiple select stores an array of IDs -> column must be JSONB without single-integer FK constraint
          await db.query(`ALTER TABLE "${formTableName}" DROP CONSTRAINT IF EXISTS "${constraintName}"`).catch(() => {});
          if (colRes.rows.length === 0) {
            await db.query(`ALTER TABLE "${formTableName}" ADD COLUMN IF NOT EXISTS "${colName}" JSONB`);
            console.log(`[DDL] ✅ Column added (multi-master JSONB): ${formTableName}.${colName} JSONB`);
          } else if (!colRes.rows[0].data_type.includes("json")) {
            await db.query(`
              ALTER TABLE "${formTableName}"
              ALTER COLUMN "${colName}" TYPE JSONB
              USING to_jsonb("${colName}")
            `);
            console.log(`[DDL] 🔄 Column type changed: ${formTableName}.${colName} → JSONB`);
          }
          continue; // Skip single-integer FK constraint
        }

        if (colRes.rows.length === 0) {
          // Column doesn't exist yet — add it as INTEGER
          await db.query(`ALTER TABLE "${formTableName}" ADD COLUMN IF NOT EXISTS "${colName}" INTEGER`);
          console.log(`[DDL] ✅ Column added (master FK): ${formTableName}.${colName} INTEGER`);
        } else {
          const existingType = colRes.rows[0].data_type; // e.g. "text", "integer"
          // If the column is TEXT/VARCHAR, convert it to INTEGER so FK can reference an integer PK
          if (!existingType.includes("int")) {
            // Drop the existing FK constraint first if any (prevents ALTER failure)
            await db.query(`ALTER TABLE "${formTableName}" DROP CONSTRAINT IF EXISTS "${constraintName}"`);
            await db.query(`
              ALTER TABLE "${formTableName}"
              ALTER COLUMN "${colName}" TYPE INTEGER
              USING "${colName}"::INTEGER
            `);
            console.log(`[DDL] 🔄 Column type changed: ${formTableName}.${colName} ${existingType} → INTEGER`);
          }
        }

        // --- Step 2: Check master table exists ----------------------------
        const masterExists = await tableExists(masterTable);
        if (!masterExists) {
          console.warn(`[DDL] Master table "${masterTable}" does not exist yet — skipping FK for ${formTableName}.${colName}`);
          continue;
        }

        // --- Step 3: Drop + recreate FK constraint -----------------------
        await db.query(`ALTER TABLE "${formTableName}" DROP CONSTRAINT IF EXISTS "${constraintName}"`);
        await db.query(`
          ALTER TABLE "${formTableName}"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("${colName}")
          REFERENCES "${masterTable}"("${masterPK}")
          ON DELETE SET NULL
        `);
        console.log(`[DDL] ✅ Master FK: ${formTableName}.${colName} → ${masterTable}.${masterPK} (SET NULL)`);

      } catch (e) {
        console.warn(`[DDL] Master FK warning for ${formTableName}.${colName} → ${masterTable}:`, e.message);
      }
    }
  }
}

// -------------------------------------------------------
// 10. SYNC DATABASE TRIGGERS & PL/pgSQL AUTOMATION FUNCTIONS
// -------------------------------------------------------
/**
 * Generates and applies native PostgreSQL trigger functions and triggers
 * on the source table for budget limits & rollup calculations.
 *
 * @param {string} sourceTableName e.g. "t_frm_payment"
 * @param {Array}  triggers        Array of trigger rule objects from form schema
 */
async function syncTableTriggers(sourceTableName, triggers = []) {
  if (!sourceTableName) return;
  validateIdentifier(sourceTableName, "source table name");

  const triggerList = Array.isArray(triggers) ? triggers : [];

  // --- Phase 1: Clean up any triggers/functions in PostgreSQL that were deleted from the web ---
  try {
    const existingTrgRes = await db.query(
      `SELECT trigger_name 
       FROM information_schema.triggers 
       WHERE LOWER(event_object_table) = LOWER($1) 
         AND (trigger_name LIKE 'trg_guard_%' OR trigger_name LIKE 'trg_act_%')`,
      [sourceTableName]
    );
    const existingDbTriggers = existingTrgRes.rows.map((r) => r.trigger_name);

    const activeDbTriggers = new Set(
      triggerList.filter((t) => t && t.enabled !== false).flatMap((t) => {
        const safeTrgId = (t.id || "").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        return [`trg_guard_${safeTrgId}`, `trg_act_${safeTrgId}`];
      })
    );

    for (const trgName of existingDbTriggers) {
      if (!activeDbTriggers.has(trgName)) {
        await db.query(`DROP TRIGGER IF EXISTS "${trgName}" ON "${sourceTableName}"`);
        console.log(`[DDL] 🗑️ Dropped deleted trigger from PostgreSQL: ${sourceTableName}.${trgName}`);
      }
    }

    const existingFnRes = await db.query(
      `SELECT routine_name 
       FROM information_schema.routines 
       WHERE routine_schema = 'public' 
         AND (routine_name LIKE 'fn_trg_guard_' || LOWER($1) || '_%' OR routine_name LIKE 'fn_trg_act_' || LOWER($1) || '_%')`,
      [sourceTableName]
    );
    const existingDbFns = existingFnRes.rows.map((r) => r.routine_name);

    const activeDbFns = new Set(
      triggerList.filter((t) => t && t.enabled !== false).flatMap((t) => {
        const safeTrgId = (t.id || "").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        return [
          `fn_trg_guard_${sourceTableName}_${safeTrgId}`,
          `fn_trg_act_${sourceTableName}_${safeTrgId}`,
        ];
      })
    );

    for (const fnName of existingDbFns) {
      if (!activeDbFns.has(fnName)) {
        await db.query(`DROP FUNCTION IF EXISTS "${fnName}"()`);
        console.log(`[DDL] 🗑️ Dropped deleted trigger function from PostgreSQL: ${fnName}`);
      }
    }
  } catch (cleanErr) {
    console.warn(`[DDL] Error cleaning up deleted triggers for ${sourceTableName}:`, cleanErr.message);
  }

  // --- Phase 2: Create / update active triggers ---
  for (const trg of triggerList) {
    if (!trg || !trg.id || trg.enabled === false) continue;
    const safeTrgId = trg.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    const guardFnName = `fn_trg_guard_${sourceTableName}_${safeTrgId}`;
    const guardTrgName = `trg_guard_${safeTrgId}`;
    const actionFnName = `fn_trg_act_${sourceTableName}_${safeTrgId}`;
    const actionTrgName = `trg_act_${safeTrgId}`;

    const targetTable = trg.target_table ? validateIdentifier(trg.target_table, "target table") : null;
    const sourceFk = trg.source_fk_field ? validateIdentifier(trg.source_fk_field, "foreign key field") : null;
    const targetPk = trg.target_pk ? validateIdentifier(trg.target_pk, "target primary key") : "id";

    if (!targetTable || !sourceFk) {
      continue;
    }

    const targetExists = await tableExists(targetTable);
    if (!targetExists) {
      console.warn(`[DDL] Target table "${targetTable}" does not exist — skipping trigger generation.`);
      continue;
    }

    // --- PART 1: Pre-Submission Validation Guard (BEFORE INSERT OR UPDATE) ---
    if (trg.validation?.enabled) {
      try {
        const sourceAmtField = validateIdentifier(trg.validation.current_amount_field || "amount", "source amount field");
        const targetLimitField = validateIdentifier(trg.validation.target_limit_field || "total_amount", "target limit field");
        const customError = (trg.validation.error_message || "Entered amount exceeds remaining balance.")
          .replace(/'/g, "''");

        const guardPlpgsql = `
CREATE OR REPLACE FUNCTION "${guardFnName}"()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_limit NUMERIC;
  v_existing_sum NUMERIC;
  v_new_amount NUMERIC;
  v_total_projected NUMERIC;
  v_fk_val TEXT;
BEGIN
  v_fk_val := COALESCE(NEW."${sourceFk}"::text, '');
  IF v_fk_val = '' OR v_fk_val IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Fetch target limit from parent table
  EXECUTE format('SELECT COALESCE("%I"::numeric, 0) FROM "%I" WHERE "%I"::text = $1 LIMIT 1',
                 '${targetLimitField}', '${targetTable}', '${targetPk}')
  INTO v_parent_limit USING v_fk_val;

  -- 2. Sum of existing child records
  IF TG_OP = 'UPDATE' THEN
    EXECUTE format('SELECT COALESCE(SUM("%I"::numeric), 0) FROM "%I" WHERE "%I"::text = $1 AND id::text <> $2',
                   '${sourceAmtField}', '${sourceTableName}', '${sourceFk}')
    INTO v_existing_sum USING v_fk_val, NEW.id::text;
  ELSE
    EXECUTE format('SELECT COALESCE(SUM("%I"::numeric), 0) FROM "%I" WHERE "%I"::text = $1',
                   '${sourceAmtField}', '${sourceTableName}', '${sourceFk}')
    INTO v_existing_sum USING v_fk_val;
  END IF;

  v_new_amount := COALESCE(NEW."${sourceAmtField}"::numeric, 0);
  v_total_projected := v_existing_sum + v_new_amount;

  IF v_parent_limit IS NOT NULL AND v_total_projected > v_parent_limit THEN
    RAISE EXCEPTION '${customError} (Projected Total: %, Allowed Limit: %)', v_total_projected, v_parent_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

        const watchFields = Array.isArray(trg.watch_update_fields)
          ? trg.watch_update_fields.map((f) => validateIdentifier(f, "watch update field")).filter(Boolean)
          : [];
        const guardWatchClause = watchFields.length > 0
          ? `UPDATE OF ${watchFields.map((f) => `"${f}"`).join(", ")}`
          : "UPDATE";

        await db.query(guardPlpgsql);
        await db.query(`DROP TRIGGER IF EXISTS "${guardTrgName}" ON "${sourceTableName}"`);
        await db.query(`
          CREATE TRIGGER "${guardTrgName}"
          BEFORE INSERT OR ${guardWatchClause} ON "${sourceTableName}"
          FOR EACH ROW
          WHEN (pg_trigger_depth() = 0)
          EXECUTE FUNCTION "${guardFnName}"();
        `);

        console.log(`[DDL] 🛡️ Created native DB Validation Guard Trigger: ${sourceTableName}.${guardTrgName}`);
      } catch (guardErr) {
        console.warn(`[DDL] Failed to create validation guard trigger on ${sourceTableName}:`, guardErr.message);
      }
    } else {
      try {
        await db.query(`DROP TRIGGER IF EXISTS "${guardTrgName}" ON "${sourceTableName}"`);
        await db.query(`DROP FUNCTION IF EXISTS "${guardFnName}"()`);
      } catch (_) {}
    }

    // --- PART 2: Post-Submission Rollup Actions (AFTER INSERT OR UPDATE OR DELETE) ---
    if (Array.isArray(trg.actions) && trg.actions.length > 0) {
      try {
        const updateStatements = [];

        // Helper to format filter conditions into SQL WHERE expressions
        const buildConditionSql = (conditions = []) => {
          if (!Array.isArray(conditions) || conditions.length === 0) return "";
          const clauses = [];
          for (const c of conditions) {
            if (!c || !c.field) continue;
            const fld = validateIdentifier(c.field, "condition field");
            const op = (c.operator || "=").toUpperCase().trim();
            if (op === "IS NULL") {
              clauses.push(`"${fld}" IS NULL`);
            } else if (op === "IS NOT NULL") {
              clauses.push(`"${fld}" IS NOT NULL`);
            } else if (op === "IN" || op === "NOT IN") {
              const vals = String(c.value || "")
                .split(",")
                .map((s) => s.trim().replace(/^['"]+|['"]+$/g, ""))
                .filter(Boolean);
              if (vals.length > 0) {
                const quotedList = vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
                clauses.push(`"${fld}"::text ${op} (${quotedList})`);
              }
            } else {
              const allowedOps = new Set(["=", "!=", "<>", ">", "<", ">=", "<=", "LIKE", "ILIKE"]);
              const safeOp = allowedOps.has(op) ? op : "=";
              const safeVal = String(c.value !== undefined ? c.value : "").replace(/'/g, "''");
              clauses.push(`"${fld}"::text ${safeOp} '${safeVal}'`);
            }
          }
          return clauses.length > 0 ? " AND " + clauses.join(" AND ") : "";
        };

        const parseSourceColumns = (rawField) => {
          if (!rawField) return ["amount"];
          const list = Array.isArray(rawField)
            ? rawField
            : String(rawField).split(",").map((s) => s.trim()).filter(Boolean);
          const validated = list.map((f) => validateIdentifier(f, "source amount field"));
          return validated.length > 0 ? validated : ["amount"];
        };

        // --- SPECIAL CASE: Same-Record / Intra-Table Automation (sourceTable == targetTable & sourceFk == targetPk) ---
        // Runs as a high-performance BEFORE INSERT OR UPDATE trigger so NEW.target_column is assigned directly
        // in memory before row write, ensuring instant persistence, zero lock conflicts, and correct RETURNING * values.
        const isSameRowSelfTrigger = targetTable.toLowerCase() === sourceTableName.toLowerCase() && sourceFk.toLowerCase() === targetPk.toLowerCase();

        if (isSameRowSelfTrigger) {
          const sameRowAssignments = [];
          const formulaFields = [];

          for (const act of trg.actions) {
            if (!act.target_field) continue;
            const targetField = validateIdentifier(act.target_field, "action target field");
            await db.query(`ALTER TABLE "${targetTable}" ADD COLUMN IF NOT EXISTS "${targetField}" NUMERIC(18,4)`).catch(() => {});

            if (Array.isArray(act.terms) && act.terms.length > 0) {
              const termParts = [];
              for (let tIdx = 0; tIdx < act.terms.length; tIdx++) {
                const term = act.terms[tIdx];
                const op = tIdx === 0 ? "" : (["+", "-", "*", "/"].includes(term.operator) ? ` ${term.operator} ` : " + ");
                if (term.source_type === "constant") {
                  const numVal = Number(term.constant_value) || 0;
                  termParts.push(`${op}${numVal}`);
                } else {
                  const fld = validateIdentifier(term.field || "amount", "formula field");
                  formulaFields.push(fld);
                  termParts.push(`${op}COALESCE(NEW."${fld}"::numeric, 0)`);
                }
              }
              sameRowAssignments.push(`NEW."${targetField}" := (${termParts.join("")});`);
            } else {
              const srcCols = parseSourceColumns(act.source_amount_field || act.source_fields);
              const primarySrcField = srcCols[0];
              formulaFields.push(primarySrcField);
              const targetTotField = act.target_total_field ? validateIdentifier(act.target_total_field, "target total field") : null;
              if (targetTotField) formulaFields.push(targetTotField);

              const actMode = (act.action_type || "sum_rollup").toLowerCase();
              if (actMode === "recalculate_balance" && targetTotField) {
                sameRowAssignments.push(`NEW."${targetField}" := COALESCE(NEW."${targetTotField}"::numeric, 0) - COALESCE(NEW."${primarySrcField}"::numeric, 0);`);
              } else {
                sameRowAssignments.push(`NEW."${targetField}" := COALESCE(NEW."${primarySrcField}"::numeric, 0);`);
              }
            }
          }

          if (sameRowAssignments.length > 0) {
            const watchFields = Array.isArray(trg.watch_update_fields)
              ? trg.watch_update_fields.map((f) => validateIdentifier(f, "watch update field")).filter(Boolean)
              : [];

            let updateClause = "UPDATE";
            if (watchFields.length > 0) {
              updateClause = `UPDATE OF ${watchFields.map((c) => `"${c}"`).join(", ")}`;
            }

            const rawEvents = (trg.events || ["insert", "update"]).map((e) => e.toLowerCase() === "create" ? "insert" : e.toLowerCase());
            const hasInsert = rawEvents.includes("insert");
            const hasUpdate = rawEvents.includes("update");

            const selfEvents = [];
            if (hasInsert) selfEvents.push("INSERT");
            if (hasUpdate) selfEvents.push(updateClause);
            const selfEventsSql = selfEvents.length > 0 ? selfEvents.join(" OR ") : `INSERT OR ${updateClause}`;

            const selfFnPlpgsql = `
CREATE OR REPLACE FUNCTION "${actionFnName}"()
RETURNS TRIGGER AS $$
BEGIN
  ${sameRowAssignments.join("\n  ")}
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

            await db.query(selfFnPlpgsql);
            await db.query(`DROP TRIGGER IF EXISTS "${actionTrgName}" ON "${sourceTableName}"`);
            await db.query(`
              CREATE TRIGGER "${actionTrgName}"
              BEFORE ${selfEventsSql} ON "${sourceTableName}"
              FOR EACH ROW
              EXECUTE FUNCTION "${actionFnName}"();
            `);

            console.log(`[DDL] ⚡ Created native Same-Record BEFORE Trigger (${selfEventsSql}): ${sourceTableName}.${actionTrgName}`);
            continue;
          }
        }

        for (const act of trg.actions) {
          if (!act.target_field) continue;
          const targetField = validateIdentifier(act.target_field, "action target field");
          const srcCols = parseSourceColumns(act.source_amount_field || act.source_fields);
          const primarySrcField = srcCols[0];
          const sumNumericExpr = srcCols.length > 1
            ? `(${srcCols.map((c) => `COALESCE("${c}"::numeric, 0)`).join(" + ")})`
            : `COALESCE("${primarySrcField}"::numeric, 0)`;

          const targetTotField = validateIdentifier(act.target_total_field || "total_amount", "action target total field");
          const actMode = (act.action_type || "sum_rollup").toLowerCase();
          const condSql = buildConditionSql(act.conditions || trg.conditions || []);

          if (Array.isArray(act.terms) && act.terms.length > 0) {
            await db.query(`ALTER TABLE "${targetTable}" ADD COLUMN IF NOT EXISTS "${targetField}" NUMERIC(18,4)`).catch(() => {});

            const termSqlParts = [];
            for (let tIdx = 0; tIdx < act.terms.length; tIdx++) {
              const term = act.terms[tIdx];
              const op = tIdx === 0 ? "" : (["+", "-", "*", "/"].includes(term.operator) ? ` ${term.operator} ` : " + ");

              if (term.source_type === "target_column") {
                const tf = validateIdentifier(term.field || "total_amount", "term target column");
                termSqlParts.push(`${op}COALESCE("%I"::numeric, 0)`);
              } else if (term.source_type === "constant") {
                const numVal = Number(term.constant_value) || 0;
                termSqlParts.push(`${op}${numVal}`);
              } else {
                // child_field
                const cf = validateIdentifier(term.field || "amount", "term child field");
                const method = (term.method || "sum").toLowerCase();
                let aggExpr;
                if (method === "count") {
                  aggExpr = `COUNT(*)`;
                } else if (method === "avg" || method === "average") {
                  aggExpr = `AVG("${cf}"::numeric)`;
                } else if (method === "min") {
                  aggExpr = `MIN("${cf}"::numeric)`;
                } else if (method === "max") {
                  aggExpr = `MAX("${cf}"::numeric)`;
                } else if (method === "value" || method === "none") {
                  aggExpr = `COALESCE("${cf}"::numeric, 0)`;
                } else {
                  aggExpr = `SUM("${cf}"::numeric)`;
                }
                const limitClause = (method === "value" || method === "none") ? "LIMIT 1" : "";
                const subquery = `COALESCE((SELECT COALESCE(${aggExpr}, 0) FROM "${sourceTableName}" WHERE "${sourceFk}"::text = $1 ${condSql} ${limitClause}), 0)`;
                termSqlParts.push(`${op}${subquery}`);
              }
            }

            const targetColsUsed = act.terms
              .filter((t) => t.source_type === "target_column" && t.field)
              .map((t) => validateIdentifier(t.field, "term target column"));

            let formatParams = `'${targetTable}', '${targetField}'`;
            if (targetColsUsed.length > 0) {
              formatParams += ", " + targetColsUsed.map((c) => `'${c}'`).join(", ");
            }
            formatParams += `, '${targetPk}'`;

            const expressionSql = termSqlParts.join("");
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (${expressionSql}) WHERE "%I"::text = $1',
                 ${formatParams})
  USING v_target_fk;
            `);
            continue;
          }

          // Ensure target column exists in target table with appropriate type
          if (actMode === "count" || actMode === "count_distinct") {
            await db.query(`ALTER TABLE "${targetTable}" ADD COLUMN IF NOT EXISTS "${targetField}" INTEGER`).catch(() => {});
          } else if (actMode === "first" || actMode === "last") {
            await db.query(`ALTER TABLE "${targetTable}" ADD COLUMN IF NOT EXISTS "${targetField}" TEXT`).catch(() => {});
          } else {
            await db.query(`ALTER TABLE "${targetTable}" ADD COLUMN IF NOT EXISTS "${targetField}" NUMERIC(18,4)`).catch(() => {});
          }

          if (actMode === "sum_rollup" || actMode === "sum") {
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT COALESCE(SUM(${sumNumericExpr}), 0) FROM "%I" WHERE "%I"::text = $1 ${condSql}) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${sourceTableName}', '${sourceFk}', '${targetPk}')
  USING v_target_fk;
            `);
          } else if (actMode === "count") {
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT COALESCE(COUNT(*), 0) FROM "%I" WHERE "%I"::text = $1 ${condSql}) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${sourceTableName}', '${sourceFk}', '${targetPk}')
  USING v_target_fk;
            `);
          } else if (actMode === "average" || actMode === "avg") {
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT COALESCE(AVG(${sumNumericExpr}), 0) FROM "%I" WHERE "%I"::text = $1 ${condSql}) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${sourceTableName}', '${sourceFk}', '${targetPk}')
  USING v_target_fk;
            `);
          } else if (actMode === "min") {
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT MIN(${sumNumericExpr}) FROM "%I" WHERE "%I"::text = $1 ${condSql}) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${sourceTableName}', '${sourceFk}', '${targetPk}')
  USING v_target_fk;
            `);
          } else if (actMode === "max") {
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT MAX(${sumNumericExpr}) FROM "%I" WHERE "%I"::text = $1 ${condSql}) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${sourceTableName}', '${sourceFk}', '${targetPk}')
  USING v_target_fk;
            `);
          } else if (actMode === "count_distinct") {
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT COALESCE(COUNT(DISTINCT "%I"), 0) FROM "%I" WHERE "%I"::text = $1 ${condSql}) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${primarySrcField}', '${sourceTableName}', '${sourceFk}', '${targetPk}')
  USING v_target_fk;
            `);
          } else if (actMode === "first") {
            const orderCol = act.order_field ? validateIdentifier(act.order_field, "order field") : "id";
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT "%I" FROM "%I" WHERE "%I"::text = $1 ${condSql} ORDER BY "%I" ASC LIMIT 1) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${primarySrcField}', '${sourceTableName}', '${sourceFk}', '${orderCol}', '${targetPk}')
  USING v_target_fk;
            `);
          } else if (actMode === "last") {
            const orderCol = act.order_field ? validateIdentifier(act.order_field, "order field") : "id";
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = (SELECT "%I" FROM "%I" WHERE "%I"::text = $1 ${condSql} ORDER BY "%I" DESC LIMIT 1) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${primarySrcField}', '${sourceTableName}', '${sourceFk}', '${orderCol}', '${targetPk}')
  USING v_target_fk;
            `);
          } else {
            // recalculate_balance: target_field = total_field - SUM(amount)
            updateStatements.push(`
  EXECUTE format('UPDATE "%I" SET "%I" = COALESCE("%I"::numeric, 0) - (SELECT COALESCE(SUM(${sumNumericExpr}), 0) FROM "%I" WHERE "%I"::text = $1 ${condSql}) WHERE "%I"::text = $1',
                 '${targetTable}', '${targetField}', '${targetTotField}', '${sourceTableName}', '${sourceFk}', '${targetPk}')
  USING v_target_fk;
            `);
          }
        }

        if (updateStatements.length > 0) {
          const evMap = { insert: "INSERT", update: "UPDATE", delete: "DELETE" };
          const rawEvents = (trg.events || ["insert", "update", "delete"]).map((e) => e.toLowerCase() === "create" ? "insert" : e.toLowerCase());
          const hasDelete = rawEvents.includes("delete");
          const hasUpdate = rawEvents.includes("update");
          const hasInsert = rawEvents.includes("insert");

          const selectedEvents = rawEvents.filter((e) => evMap[e]);
          const uniqueEvents = Array.from(new Set(selectedEvents));

          const watchFields = Array.isArray(trg.watch_update_fields)
            ? trg.watch_update_fields.map((f) => validateIdentifier(f, "watch update field")).filter(Boolean)
            : [];

          const eventClauses = uniqueEvents.map((ev) => {
            if (ev === "update" && watchFields.length > 0) {
              const quotedCols = watchFields.map((f) => `"${f}"`).join(", ");
              return `UPDATE OF ${quotedCols}`;
            }
            return evMap[ev];
          });

          const eventsSql = eventClauses.length > 0 ? eventClauses.join(" OR ") : "INSERT OR UPDATE";

          const branchStatements = [];

          if (hasDelete) {
            branchStatements.push(`
  IF TG_OP = 'DELETE' THEN
    v_target_fk := COALESCE(OLD."${sourceFk}"::text, '');
    IF v_target_fk <> '' AND v_target_fk IS NOT NULL THEN
      ${updateStatements.join("\n")}
    END IF;
    RETURN OLD;
  END IF;
`);
          }

          if (hasUpdate) {
            branchStatements.push(`
  IF TG_OP = 'UPDATE' THEN
    -- If FK changed on update, update both old parent record and new parent record
    IF COALESCE(OLD."${sourceFk}"::text, '') <> COALESCE(NEW."${sourceFk}"::text, '') AND COALESCE(OLD."${sourceFk}"::text, '') <> '' THEN
      v_target_fk := OLD."${sourceFk}"::text;
      ${updateStatements.join("\n")}
    END IF;
    v_target_fk := COALESCE(NEW."${sourceFk}"::text, '');
    IF v_target_fk <> '' AND v_target_fk IS NOT NULL THEN
      ${updateStatements.join("\n")}
    END IF;
    RETURN NEW;
  END IF;
`);
          }

          if (hasInsert) {
            branchStatements.push(`
  IF TG_OP = 'INSERT' THEN
    v_target_fk := COALESCE(NEW."${sourceFk}"::text, '');
    IF v_target_fk <> '' AND v_target_fk IS NOT NULL THEN
      ${updateStatements.join("\n")}
    END IF;
    RETURN NEW;
  END IF;
`);
          }

          branchStatements.push(`
  RETURN COALESCE(NEW, OLD);
`);

          const actionPlpgsql = `
CREATE OR REPLACE FUNCTION "${actionFnName}"()
RETURNS TRIGGER AS $$
DECLARE
  v_target_fk TEXT;
BEGIN
  ${branchStatements.join("\n")}
END;
$$ LANGUAGE plpgsql;
`;

          await db.query(actionPlpgsql);
          await db.query(`DROP TRIGGER IF EXISTS "${actionTrgName}" ON "${sourceTableName}"`);
          await db.query(`
            CREATE TRIGGER "${actionTrgName}"
            AFTER ${eventsSql} ON "${sourceTableName}"
            FOR EACH ROW
            WHEN (pg_trigger_depth() = 0)
            EXECUTE FUNCTION "${actionFnName}"();
          `);

          console.log(`[DDL] ⚡ Created native DB Action Rollup Trigger (${eventsSql}): ${sourceTableName}.${actionTrgName}`);
        }
      } catch (actionErr) {
        console.warn(`[DDL] Failed to create action rollup trigger on ${sourceTableName}:`, actionErr.message);
      }
    } else {
      try {
        await db.query(`DROP TRIGGER IF EXISTS "${actionTrgName}" ON "${sourceTableName}"`);
        await db.query(`DROP FUNCTION IF EXISTS "${actionFnName}"()`);
      } catch (_) {}
    }
  }
}

module.exports = {
  createTable,
  addColumn,
  dropColumn,
  renameColumn,
  renameTable,
  createIndex,
  tableExists,
  getTableColumns,
  syncTableColumns,
  syncParentForeignKey,
  syncMasterForeignKeys,
  syncTableTriggers,
  validateIdentifier,
  getPgType,
  FIELD_TYPE_MAP,
};
