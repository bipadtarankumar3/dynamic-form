const BASE_URL = process.env.BASE_URL || "http://localhost:3003/";
const resolveExcelValue = (row, field) => {
  // =========================
  // MASTER SELECT FIELDS
  // =========================
  // Handles dropdowns whose values come from master tables
  if (field.type === "select" && field.data_source?.type === "master") {
    // Column name used in SQL for label (e.g. tski_skill_name_fm_skills_id)
    const labelCol = field.data_source.label_key || "name";
    const aliasKey = `${labelCol}_${field.db_field}`;

    // Prefer label column returned by SQL
    let value = row[aliasKey];

    // Fallback to raw DB value if label is missing
    if (
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0)
    ) {
      value = row[field.db_field];
    }

    // If still empty, return blank cell
    if (value === null || value === undefined) return "";

    // Handle multi-select values safely
    if (Array.isArray(value)) {
      return (
        value
          // Remove null/undefined items
          .filter((v) => v !== null && v !== undefined)
          // Convert objects → label, strings → 그대로
          .map((v) => {
            if (typeof v === "string") return v;
            if (typeof v === "object" && v.label) return v.label;
            return "";
          })
          // Remove empty strings
          .filter(Boolean)
          // Join as CSV for Excel
          .join(", ")
      );
    }

    // Single select → return directly
    return value;
  }

  // =========================
  // DATE RANGE FIELDS
  // =========================
  // Combines start + end date into readable format
  if (
    field.type === "date_range" &&
    field.act_db_field?.start &&
    field.act_db_field?.end
  ) {
    const start = row[field.act_db_field.start];
    const end = row[field.act_db_field.end];

    if (!start && !end) return "";
    if (start && end) return `${start} → ${end}`;
    if (start) return `From ${start}`;
    return `Until ${end}`;
  }

  // =========================
  // FALLBACK (NORMAL FIELDS)
  // =========================
  const v = row[field.db_field];
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (typeof v === "object") return "";
  return v;
};

// Purpose: Decide how many Excel sheets to create.
function getExcelExportSections(schema) {
  const result = [];

  // Collect all "general" sections
  const generalSections = schema.sections.filter((s) => s.type === "general");

  // Create ONE sheet for all general sections
  if (generalSections.length) {
    result.push({
      sheetName: "General",
      type: "general",
      sections: generalSections,
    });
  }

  // Create ONE sheet PER add_more section
  schema.sections
    .filter((s) => s.type === "add_more")
    .forEach((section) => {
      result.push({
        sheetName: section.section_label,
        type: "add_more",
        sections: [section],
      });
    });

  return result;
}

// Purpose: Build SQL query for add_more tables (one-to-many).
function buildAddMoreExcelQuery(section, schema) {
  // Root table primary key (user_id)
  const rootPK = schema.root_entity.primary_key;

  // Columns to select
  const selectCols = [];

  // JOIN clauses for master tables
  const joins = [];

  section.fields.forEach((field) => {
    if (field?.visible === false && field?.add_to_query !== true) return;
    // =========================
    // DATE RANGE (virtual field)
    // =========================
    // date_range has no DB column → use start & end
    if (field.type === "date_range" && field.act_db_field) {
      selectCols.push(
        `c.${field.act_db_field.start} AS ${field.act_db_field.start}`,
        `c.${field.act_db_field.end} AS ${field.act_db_field.end}`
      );
      return;
    }

    // =========================
    // FILE FIELD
    // =========================
    // Files are handled separately → skip
    if (field.type === "file") return;

    // =========================
    // MASTER SELECT (MULTIPLE)
    // =========================
    // Array of IDs → convert into [{label,value}]
    if (
      field.type === "select" &&
      field.data_source?.type === "master" &&
      field.multiple
    ) {
      const table = field.data_source.table_name;
      const pk = field.data_source.primary_key;
      const label = field.data_source.label_key;

      selectCols.push(`
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'label', m.${label},
                'value', m.${pk}
              )
              ORDER BY m.${pk}
            ),
            '[]'::jsonb
          )
          FROM ${table} m
          WHERE CASE
            WHEN jsonb_typeof(to_jsonb(c.${field.db_field})) = 'array' THEN 
              to_jsonb(c.${field.db_field}) @> to_jsonb(m.${pk}) OR to_jsonb(c.${field.db_field}) @> to_jsonb(CAST(m.${pk} AS TEXT))
            ELSE 
              CAST(m.${pk} AS TEXT) = CAST(c.${field.db_field} AS TEXT)
          END
        ) AS ${label}_${field.db_field}
      `);

      // Keep raw IDs as fallback
      selectCols.push(`c.${field.db_field} AS ${field.db_field}`);
      return;
    }

    // =========================
    // MASTER SELECT (SINGLE)
    // =========================
    // Join master table to fetch label
    if (
      field.type === "select" &&
      field.data_source?.type === "master" &&
      !field.multiple
    ) {
      const masterAlias = field.db_field;
      const pk = field.data_source.primary_key;
      const label = field.data_source.label_key;

      joins.push(`
        LEFT JOIN ${field.data_source.table_name} ${masterAlias}
          ON ${masterAlias}.${pk} = c.${field.db_field}
      `);

      selectCols.push(`${masterAlias}.${label} AS ${label}_${field.db_field}`);
      selectCols.push(`c.${field.db_field} AS ${field.db_field}`);
      return;
    }

    // =========================
    // NORMAL FIELD
    // =========================
    if (field.db_field) {
      selectCols.push(`c.${field.db_field} AS ${field.db_field}`);
    }
  });

  // Final SQL
  return `
    SELECT
      UPPER(c.${section.relation.foreign_key}) AS "${rootPK.toUpperCase()}",
      ${selectCols.join(", ")}
    FROM ${section.table} c
    ${joins.join("\n")}
    ORDER BY c.${section.primary_key} DESC
  `;
}

// Purpose: Convert SQL rows into Excel worksheet.
function buildExcelSheet(
  workbook,
  sheetName,
  sections,
  rows,
  isAddMore = false,
  schema
) {
  // Create worksheet
  const sheet = workbook.addWorksheet(sheetName);

  const columns = [];

  // Root primary key in uppercase (USER_ID)
  const rootKeyUpper = schema.root_entity.primary_key.toUpperCase();

  // =========================
  // ADD ROOT KEY COLUMN FIRST
  // =========================
  if (isAddMore) {
    columns.push({
      header: "User ID",
      key: rootKeyUpper,
      width: 15,
    });
  }

  // Add columns based on schema fields
  sections.forEach((section) => {
    section.fields
      .filter(
        (f) =>
          f.visible !== false &&
          f?.add_to_query !== true &&
          f.db_field &&
          f.type !== "file"
      )
      .forEach((field) => {
        const key =
          field.data_source?.type === "master" && !field.multiple
            ? `${field.data_source.label_key}_${field.db_field}`
            : field.db_field;

        columns.push({
          header: field.label,
          key,
          width: 25,
        });
      });
  });

  // Assign columns to sheet
  sheet.columns = columns;

  // =========================
  // ADD ROW DATA
  // =========================
  rows.forEach((row) => {
    const excelRow = {};

    // Add USER_ID for add_more rows
    if (isAddMore) {
      excelRow[rootKeyUpper] = row[rootKeyUpper];
    }

    // Fill field values
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!field.db_field || field.type === "file") return;

        const key =
          field.data_source?.type === "master" && !field.multiple
            ? `${field.data_source.label_key}_${field.db_field}`
            : field.db_field;

        excelRow[key] = resolveExcelValue(row, field);
      });
    });

    sheet.addRow(excelRow);
  });
}

function buildGlobalSearchWhere(schema, search) {
  if (!search) return "";

  const s = search.trim().toLowerCase();
  const conditions = [];

  schema.sections.forEach((section) => {
    if (section.type !== "general") return;

    const alias =
      section.table === schema.root_entity.table ? "r" : section.section_id;

    section.fields.forEach((field) => {
      if (!field.db_field) return;

      // 🚫 SKIP FILE FIELDS
      if (field.type === "file") return;

      /* ==========================
         MASTER SELECT (MULTIPLE)
      ========================== */
      if (field.data_source?.type === "master" && field.multiple) {
        const table = field.data_source.table_name;
        const pk = field.data_source.primary_key;
        const label = field.data_source.label_key;

        conditions.push(`
          EXISTS (
            SELECT 1
            FROM ${table} m
            WHERE (
              CASE
                WHEN jsonb_typeof(to_jsonb(${alias}.${field.db_field})) = 'array' THEN 
                  to_jsonb(${alias}.${field.db_field}) @> to_jsonb(m.${pk}) OR to_jsonb(${alias}.${field.db_field}) @> to_jsonb(CAST(m.${pk} AS TEXT))
                ELSE 
                  CAST(m.${pk} AS TEXT) = CAST(${alias}.${field.db_field} AS TEXT)
              END
            )
              AND LOWER(m.${label}) ILIKE '%${s}%'
          )
        `);
        return;
      }

      /* ==========================
         MASTER SELECT (SINGLE)
      ========================== */
      if (field.data_source?.type === "master") {
        const masterAlias = field.db_field;
        const label = field.data_source.label_key;

        conditions.push(`LOWER(${masterAlias}.${label}) ILIKE '%${s}%'`);
        return;
      }

      /* ==========================
         STATIC SELECT (ENUM)
      ========================== */
      if (field.type === "select" && field.options) {
        conditions.push(`LOWER(${alias}.${field.db_field}::text) = '${s}'`);
        return;
      }

      /* ==========================
         DATE RANGE
      ========================== */
      if (field.type === "date_range" && field.act_db_field) {
        conditions.push(
          `CAST(${alias}.${field.act_db_field.start} AS TEXT) ILIKE '%${search}%'`,
          `CAST(${alias}.${field.act_db_field.end} AS TEXT) ILIKE '%${search}%'`
        );
        return;
      }

      /* ==========================
         NORMAL TEXT / NUMBER
      ========================== */
      conditions.push(
        `CAST(${alias}.${field.db_field} AS TEXT) ILIKE '%${search}%'`
      );
    });
  });

  if (!conditions.length) return "";

  return `WHERE (${conditions.join(" OR ")})`;
}

/**
 * buildSortableFieldMap
 * -------------------------------------------------------
 * PURPOSE:
 * This function creates a mapping between frontend sort keys
 * (field.db_field) and their correct SQL column expressions.
 *
 * WHY THIS IS NEEDED:
 * - Frontend sends only `db_field` when sorting
 * - Some fields belong to:
 *    • root table (users → alias "r")
 *    • joined tables (user_banks, states, etc.)
 *    • virtual fields (date_range → no real DB column)
 * - Directly using `r.<db_field>` causes SQL errors
 *
 * WHAT THIS FUNCTION SOLVES:
 * - Maps each sortable field to the correct SQL column
 * - Handles:
 *    • normal fields
 *    • joined table fields
 *    • master select fields (sort by label)
 *    • date_range fields (sort by start date)
 *
 * RESULT:
 * Safe and correct ORDER BY clause generation
 */
function buildSortableFieldMap(schema) {
  // Object that will store:
  // {
  //   frontend_sort_key: "actual.sql.column"
  // }
  const map = {};

  // Loop through all sections defined in schema
  schema.sections.forEach((section) => {
    // Only "general" sections are used in list view
    if (section.type !== "general") return;

    // Decide SQL table alias:
    // - Root table (users) uses alias "r"
    // - Joined tables use section.section_id as alias
    const tableAlias =
      section.table === schema.root_entity.table ? "r" : section.section_id;

    // Loop through each field inside the section
    section.fields.forEach((field) => {
      // Skip fields that do not exist in database
      if (!field.db_field) return;

      /**
       * DATE RANGE FIELD
       * ---------------------------------------------------
       * Example:
       *  db_field: u_employment_period   ❌ (not real)
       *  actual columns:
       *    - u_employment_start_date
       *    - u_employment_end_date
       *
       * Sorting should be done using START DATE
       */
      if (field.type === "date_range" && field.act_db_field?.start) {
        // Map virtual field to real start-date column
        map[field.db_field] = `${tableAlias}.${field.act_db_field.start}`;
        return;
      }

      /**
       * MASTER SINGLE SELECT FIELD
       * ---------------------------------------------------
       * Example:
       *  db_field: u_user_state_id
       *  joined table: states
       *  label column: ts_state_name
       *
       * Sorting should be done by LABEL, not ID
       */
      if (field.data_source?.type === "master" && !field.multiple) {
        map[
          field.db_field
        ] = `${field.db_field}.${field.data_source.label_key}`;
        return;
      }

      /**
       * NORMAL FIELD
       * ---------------------------------------------------
       * Example:
       *  r.u_full_name
       *  bank_details.ub_account_number
       *
       * Safe direct column mapping
       */
      map[field.db_field] = `${tableAlias}.${field.db_field}`;
    });
  });

  // Return final sortable field → SQL column mapping
  return map;
}

function buildGeneralSelectQuery(schema, search) {
  const rootTable = schema.root_entity.table;
  const rootPK = schema.root_entity.primary_key;

  const select = [`r.${rootPK}`];
  const joins = [];
  const documentAggs = [];

  const searchColumns = [];
  schema.sections.forEach((section) => {
    if (section.type !== "general") return;

    const sectionAlias = section.table === rootTable ? "r" : section.section_id;

    /* ==========================
       SECTION JOIN (ONE TO ONE)
    ========================== */
    if (
      section.table !== rootTable &&
      section.relation?.type === "one_to_one"
    ) {
      select.push(`${sectionAlias}.${section.primary_key}`);
      joins.push(`
        LEFT JOIN ${section.table} ${sectionAlias}
          ON ${sectionAlias}.${section.relation.foreign_key || "parent_id"}
             = r.${section.relation.parent_key || rootPK}
      `);
    }

    /* ==========================
       FIELDS
    ========================== */
    section.fields.forEach((f) => {
      if (f?.visible === false && f?.add_to_query !== true) return;
      /* ---------- FILE FIELD ---------- */
      if (f.type === "file" && f.file) {
        const doc = f.file;

        documentAggs.push(`
          SELECT
            '${f.db_field}' AS db_field,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                 '${doc.primary_key}', d.${doc.primary_key},
                '${doc.doc_type_key}', d.${doc.doc_type_key},
                  '${doc.file_path_key}', CONCAT('${BASE_URL}', d.${doc.file_path_key}),
                  '${doc.file_name_key}', d.${doc.file_name_key}
                )
                ORDER BY d.created_at
              ),
              '[]'::jsonb
            ) AS docs
          FROM ${doc.table} d
          WHERE d.${doc.foreign_key} = ${sectionAlias}.${section.primary_key}
            AND d.${doc.doc_type_key} = '${f.db_field}'
        `);

        return;
      }

      /* ==========================
       MULTIPLE + MASTER
       (stored as jsonb array of IDs)
    ========================== */
      if (
        f.multiple &&
        f.data_source?.type === "master" &&
        f.db_field &&
        f.type === "select"
      ) {
        const table = f.data_source.table_name;
        const pk = f.data_source.primary_key || "id";
        const labelCol = f.data_source.label_key || "name";

        select.push(`
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'label', m.${labelCol},
                'value', m.${pk}
              )
              ORDER BY m.${pk}
            ),
            '[]'::jsonb
          )
          FROM ${table} m
          WHERE CASE
            WHEN jsonb_typeof(to_jsonb(${sectionAlias}.${f.db_field})) = 'array' THEN 
              to_jsonb(${sectionAlias}.${f.db_field}) @> to_jsonb(m.${pk}) OR to_jsonb(${sectionAlias}.${f.db_field}) @> to_jsonb(CAST(m.${pk} AS TEXT))
            ELSE 
              CAST(m.${pk} AS TEXT) = CAST(${sectionAlias}.${f.db_field} AS TEXT)
          END
        ) AS ${labelCol}_${f.db_field}
      `);

        select.push(`${sectionAlias}.${f.db_field}`);
        return;
      }

      /* ---------- MASTER FIELD ---------- */
      if (
        f.data_source?.type === "master" &&
        f.db_field &&
        f.type === "select"
      ) {
        const masterAlias = `${f.db_field}`;
        const pk = f.data_source.primary_key || "id";
        const labelCol = f.data_source.label_key || "name";

        joins.push(`
          LEFT JOIN ${f.data_source.table_name} ${masterAlias}
            ON ${masterAlias}.${pk} = ${sectionAlias}.${f.db_field}
        `);

        select.push(`${masterAlias}.${labelCol} as ${labelCol}_${f.db_field}`);
        select.push(`${sectionAlias}.${f.db_field}`);
        searchColumns.push(`${masterAlias}.${labelCol}`);
        return;
      }

      /* ---------- DATE RANGE ---------- */
      if (f.type === "date_range") {
        if (f.act_db_field?.start && f.act_db_field?.end) {
          select.push(`${sectionAlias}.${f.act_db_field.start}`);
          select.push(`${sectionAlias}.${f.act_db_field.end}`);

          searchColumns.push(`${sectionAlias}.${f.act_db_field.start}`);
          searchColumns.push(`${sectionAlias}.${f.act_db_field.end}`);
        } else if (f.db_field) {
          select.push(`${sectionAlias}.${f.db_field}`);
          searchColumns.push(`${sectionAlias}.${f.db_field}`);
        }
        return;
      }
      /* ---------- NORMAL FIELD ---------- */
      if (f.db_field) {
        select.push(`${sectionAlias}.${f.db_field}`);
        searchColumns.push(`${sectionAlias}.${f.db_field}`);
      }
    });
  });

  /* ==========================
     DOCUMENT MERGE (ALL FILE FIELDS)
  ========================== */
  if (documentAggs.length) {
    select.push(`
      (
        SELECT COALESCE(
          jsonb_object_agg(db_field, docs),
          '{}'::jsonb
        )
        FROM (
          ${documentAggs.join("\nUNION ALL\n")}
        ) file_docs
      ) AS documents
    `);
  }

  const whereClause = buildGlobalSearchWhere(schema, search);
  return `
  SELECT
    ${select.join(",\n")}
  FROM ${rootTable} r
  ${joins.join("\n")}
  ${whereClause}
`;
}

module.exports = {
  buildGeneralSelectQuery,
  resolveExcelValue,
  getExcelExportSections,
  buildAddMoreExcelQuery,
  buildExcelSheet,
  buildSortableFieldMap,
};
