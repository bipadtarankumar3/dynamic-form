const rawBaseUrl = process.env.BASE_URL || "http://localhost:6003/api/v1/static/";
const BASE_URL = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;
const baseDomain = rawBaseUrl.replace(/\/api\/v1\/static\/?$/, "");

const getDocUrlExpr = (col) => `CASE 
  WHEN ${col} LIKE 'http://%' OR ${col} LIKE 'https://%' THEN ${col}
  WHEN ${col} LIKE '/api/v1/static/%' THEN CONCAT('${baseDomain}', ${col})
  ELSE CONCAT('${BASE_URL}', ${col})
END`;

const resolveExcelValue = (row, field) => {
  // =========================
  // CREATED BY (USER NAME)
  // =========================
  if (field.db_field && field.db_field.endsWith("_created_by")) {
    const nameKey = `name_${field.db_field}`;
    return row[nameKey] || "";
  }

  // =========================
  // CREATED AT (DD/MM/YYYY)
  // =========================
  if (field.db_field?.endsWith("_created_at")) {
    const d = row[field.db_field];
    if (!d) return "";

    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  }

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
  // BOOLEAN (Active / Inactive)
  // =========================
  if (typeof row[field.db_field] === "boolean") {
    return row[field.db_field] ? "Active" : "Inactive";
  }

  // =========================
  // FALLBACK (NORMAL FIELDS)
  // =========================
  // const v = row[field.db_field];
  // if (v === null || v === undefined) return "";
  // if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  // if (typeof v === "object") return "";
  // return v;
  // =========================
  // FALLBACK (NORMAL FIELDS)
  // =========================
  const v = row[field.db_field];

  if (v === null || v === undefined) return "";

  // ✅ FIX: handle Date properly
  if (v instanceof Date) {
    return v.toLocaleString(); // or ISO if you prefer
  }

  if (Array.isArray(v)) return v.filter(Boolean).join(", ");

  if (typeof v === "object") return "";

  return v;
};

// Purpose: Decide how many Excel sheets to create.
function getExcelExportSections(schema) {
  const result = [];

  // Collect all "general" sections
  const generalSections = schema.sections.filter((s) => s.type === "general");
  const sheetName = generalSections.length
    ? generalSections[0].section_label
    : "General";
  // Create ONE sheet for all general sections
  if (generalSections.length) {
    result.push({
      sheetName,
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
        `c.${field.act_db_field.end} AS ${field.act_db_field.end}`,
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
          ON CAST(${masterAlias}.${pk} AS TEXT) = CAST(c.${field.db_field} AS TEXT)
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
  schema,
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
  // sections.forEach((section) => {
  //   section.fields
  //     .filter(
  //       (f) =>
  //         f.db_field &&
  //         f.type !== "file" &&
  //         (f.add_to_list === true || // 👈 EXPLICITLY ADD TO EXCEL
  //           f.visible !== false), // 👈 NORMAL VISIBLE FIELDS
  //     )
  //     .forEach((field) => {
  //       const key =
  //         field.data_source?.type === "master" && !field.multiple
  //           ? `${field.data_source.label_key}_${field.db_field}`
  //           : field.db_field;

  //       columns.push({
  //         header: field.label,
  //         key,
  //         width: 25,
  //       });
  //     });
  // });
  const normalFields = [];
  const auditFields = [];

  sections.forEach((section) => {
    section.fields
      .filter(
        (f) =>
          f.db_field &&
          f.type !== "file" &&
          (f.add_to_list === true || f.visible !== false),
      )
      .forEach((field) => {
        if (
          field.db_field.endsWith("_created_by") ||
          field.db_field.endsWith("_created_at")
        ) {
          auditFields.push(field);
        } else {
          normalFields.push(field);
        }
      });
  });

  // NORMAL FIELDS FIRST, CREATED_* LAST
  [...normalFields, ...auditFields].forEach((field) => {
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
         CREATED BY USER SEARCH
      ========================== */
      if (field.db_field.endsWith("_created_by")) {
        const userAlias = `${field.db_field}_user`;

        conditions.push(`LOWER(${userAlias}.name) ILIKE '%${s}%'`);
        return;
      }

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
          `CAST(${alias}.${field.act_db_field.end} AS TEXT) ILIKE '%${search}%'`,
        );
        return;
      }

      /* ==========================
         NORMAL TEXT / NUMBER
      ========================== */
      conditions.push(
        `CAST(${alias}.${field.db_field} AS TEXT) ILIKE '%${search}%'`,
      );
    });
  });

  if (!conditions.length) return "";

  return `WHERE (${conditions.join(" OR ")})`;
}

// function buildGlobalSearchWhere(schema, search) {
//   if (!search) return "";

//   const s = search.trim().toLowerCase();
//   const conditions = [];

//   schema.sections.forEach((section) => {
//     if (section.type !== "general") return;

//     // ✅ FIX 1: USE section.alias IF PRESENT
//     const alias =
//       section.alias ||
//       (section.table === schema.root_entity.table ? "r" : null);

//     // 🚫 SAFETY: if alias still missing, skip
//     if (!alias) return;

//     section.fields.forEach((field) => {
//       if (!field.db_field) return;

//       // 🚫 SKIP FILE FIELDS
//       if (field.type === "file") return;

//       /* ==========================
//          MASTER SELECT (MULTIPLE)
//       ========================== */
//       if (field.data_source?.type === "master" && field.multiple) {
//         const table = field.data_source.table_name;
//         const pk = field.data_source.primary_key;
//         const label = field.data_source.label_key;

//         conditions.push(`
//           EXISTS (
//             SELECT 1
//             FROM ${table} m
//             WHERE m.${pk} = ANY (${alias}.${field.db_field})
//               AND LOWER(m.${label}) ILIKE '%${s}%'
//           )
//         `);
//         return;
//       }

//       /* ==========================
//          MASTER SELECT (SINGLE)
//       ========================== */
//       if (field.data_source?.type === "master") {
//         // ✅ FIX 2: CORRECT MASTER ALIAS
//         const masterAlias = `${alias}_${field.db_field}`;
//         const label = field.data_source.label_key;

//         conditions.push(
//           `LOWER(${masterAlias}.${label}) ILIKE '%${s}%'`
//         );
//         return;
//       }

//       /* ==========================
//          STATIC SELECT (ENUM)
//       ========================== */
//       if (field.type === "select" && field.options) {
//         conditions.push(
//           `LOWER(${alias}.${field.db_field}::text) = '${s}'`
//         );
//         return;
//       }

//       /* ==========================
//          DATE RANGE
//       ========================== */
//       if (field.type === "date_range" && field.act_db_field) {
//         conditions.push(
//           `CAST(${alias}.${field.act_db_field.start} AS TEXT) ILIKE '%${s}%'`,
//           `CAST(${alias}.${field.act_db_field.end} AS TEXT) ILIKE '%${s}%'`
//         );
//         return;
//       }

//       /* ==========================
//          NORMAL TEXT / NUMBER
//       ========================== */
//       conditions.push(
//         `CAST(${alias}.${field.db_field} AS TEXT) ILIKE '%${s}%'`
//       );
//     });
//   });

//   if (!conditions.length) return "";

//   return `WHERE (${conditions.join(" OR ")})`;
// }

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
  const map = {};

  schema.sections.forEach((section) => {
    if (section.type !== "general") return;

    const tableAlias =
      section.table === schema.root_entity.table
        ? "r"
        : section.alias || section.section_id;

    section.fields.forEach((field) => {
      if (!field.db_field) return;

      /* ---------- CREATED BY USER SORT ---------- */
      if (
        field.db_field &&
        field.add_to_list === true &&
        field.db_field.endsWith("_created_by")
      ) {
        const userAlias = `${field.db_field}_user`;
        map[field.db_field] = `${userAlias}.name`;
        return;
      }

      /* ---------- DATE RANGE ---------- */
      if (field.type === "date_range" && field.act_db_field?.start) {
        map[field.db_field] = `${tableAlias}.${field.act_db_field.start}`;
        return;
      }

      /* ---------- MASTER SINGLE SELECT ---------- */
      // if (field.data_source?.type === "master" && !field.multiple) {
      //   const masterAlias = `${tableAlias}_${field.db_field}`;
      //   map[field.db_field] = `${masterAlias}.${field.data_source.label_key}`;
      //   return;
      // }

      /* ---------- MASTER SINGLE SELECT ---------- */
      if (field.data_source?.type === "master" && !field.multiple) {
        const masterAlias = field.db_field; // <-- FIX IS HERE
        map[field.db_field] = `${masterAlias}.${field.data_source.label_key}`;
        return;
      }

      /* ---------- NORMAL FIELD ---------- */
      map[field.db_field] = `${tableAlias}.${field.db_field}`;
    });
  });

  return map;
}

function buildGeneralSelectQuery(schema, search, status) {
  const rootTable = schema?.root_entity?.table;
  const rootPK = schema?.root_entity?.primary_key || "id";
  const rootSource = schema?.view_name || schema?.database_view_name || rootTable;

  const select = [`r.*`];
  const joins = [];
  const documentAggs = [];

  const searchColumns = [];
  schema.sections.forEach((section) => {
    if (section.type === "add_more") return;

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

      /* ==========================
   CREATED BY USER JOIN
   (NO SCHEMA CHANGE)
========================== */
      if (
        f.db_field &&
        f.add_to_list === true &&
        f.db_field.endsWith("_created_by")
      ) {
        const userAlias = `${f.db_field}_user`;

        joins.push(`
    LEFT JOIN t_user ${userAlias}
      ON ${userAlias}.user_id = ${sectionAlias}.${f.db_field}
  `);

        select.push(`${userAlias}.name AS name_${f.db_field}`);
        select.push(`${sectionAlias}.${f.db_field}`);

        searchColumns.push(`${userAlias}.name`);
        return;
      }

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
                  '${doc.file_path_key}', ${getDocUrlExpr(`d.${doc.file_path_key}`)},
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
        const labelCol = (f.data_source.label_key || "name").includes(".") ? f.data_source.label_key.split(".").pop() : (f.data_source.label_key || "name");

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
        // Guard: only generate the JOIN if we have a valid table_name
        if (!f.data_source.table_name) {
          // No table_name configured — just select the raw value, no JOIN
          select.push(`${sectionAlias}.${f.db_field}`);
          searchColumns.push(`${sectionAlias}.${f.db_field}`);
          return;
        }

        const masterAlias = `${f.db_field}`;
        const pk = f.data_source.primary_key || "id";
        const labelCol = (f.data_source.label_key || "name").includes(".") ? f.data_source.label_key.split(".").pop() : (f.data_source.label_key || "name");

        joins.push(`
          LEFT JOIN ${f.data_source.table_name} ${masterAlias}
            ON CAST(${masterAlias}.${pk} AS TEXT) = CAST(${sectionAlias}.${f.db_field} AS TEXT)
        `);
        if (f?.data_source?.name === "themes") {
          select.push(`${masterAlias}.${"tthm_slug"} as theme_slug`);
        }
        select.push(`${masterAlias}.${labelCol} as ${labelCol}_${f.db_field}`);
        select.push(`${sectionAlias}.${f.db_field}`);
        searchColumns.push(`${masterAlias}.${labelCol}`);
        return;
      }

      /* ---------- DATE RANGE ---------- */

      if (f.type === "date_range" && f.db_field) {
        if (f.act_db_field?.start && f.act_db_field?.end) {
          select.push(`${sectionAlias}.${f.act_db_field.start}`);
          select.push(`${sectionAlias}.${f.act_db_field.end}`);
          searchColumns.push(`${sectionAlias}.${f.act_db_field.start}`);
          searchColumns.push(`${sectionAlias}.${f.act_db_field.end}`);
        }
        select.push(`${sectionAlias}.${f.db_field}`);
        searchColumns.push(`${sectionAlias}.${f.db_field}`);
        return;
      }
      /* ---------- NORMAL FIELD ---------- */
      if (f.db_field) {
        if (f.type === "add_more" || f.type === "repeater" || f.type === "table_grid") {
          const storageType = f.storage_type || (f.storage === "table" ? "table" : "jsonb");
          if (storageType === "table") {
            const childTbl = f.table_name || f.table || `t_${f.db_field}`;
            const childCols = [`'id', c.id`];
            const childJoins = [];

            (f.fields || []).forEach((cf) => {
              const colName = cf.db_field || cf.column_name;
              if (!colName) return;
              childCols.push(`'${colName}', c.${colName}`);

              if (cf.type === "select" && cf.data_source?.type === "master" && cf.data_source?.table_name) {
                const masterTbl = cf.data_source.table_name;
                const masterPk = cf.data_source.primary_key || "id";
                const masterLabel = cf.data_source.label_key || "name";
                const mAlias = `m_${colName}`;

                childJoins.push(`
                  LEFT JOIN ${masterTbl} ${mAlias}
                    ON CAST(${mAlias}.${masterPk} AS text) = CAST(c.${colName} AS text)
                `);
                childCols.push(`'${colName}_label', COALESCE(${mAlias}.${masterLabel}::text, c.${colName}::text)`);
              }
            });

            select.push(`
              (
                SELECT COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      ${childCols.join(",\n")}
                    )
                    ORDER BY c.id
                  ),
                  '[]'::jsonb
                )
                FROM ${childTbl} c
                ${childJoins.join("\n")}
                WHERE c.parent_id = ${sectionAlias}.${section.primary_key || rootPK || 'id'}
              ) AS ${f.db_field}
            `);
            return;
          }
        }
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

  //   const whereClause = buildGlobalSearchWhere(schema, search);
  //   return `
  //   SELECT
  //     ${select.join(",\n")}
  //   FROM ${rootTable} r
  //   ${joins.join("\n")}
  //   ${whereClause}
  // `;
  const searchWhere = buildGlobalSearchWhere(schema, search);

  const statusWhere = status
    ? `r.tpro_status ${Array.isArray(status) ? "IN (:status)" : "= :status"}`
    : "";
  let whereClause = "";

  if (searchWhere && statusWhere) {
    whereClause = `${searchWhere} AND ${statusWhere}`;
  } else if (searchWhere) {
    whereClause = searchWhere;
  } else if (statusWhere) {
    whereClause = `WHERE ${statusWhere}`;
  }
  return `
  SELECT
    ${select.join(",\n")}
  FROM ${rootSource} r
  ${joins.join("\n")}
  ${whereClause}
`;
}

// function buildGeneralSelectQuery(schema, search) {
//   const rootTable = schema.root_entity.table;
//   const rootPK = schema.root_entity.primary_key;

//   const select = [`r.${rootPK}`];
//   const joins = [];
//   const documentAggs = [];
//   const searchColumns = [];

//   schema.sections.forEach((section) => {
//     if (section.type !== "general") return;

//     // 🔑 SAFE ALIAS
//     const sectionAlias =
//       section.table === rootTable ? "r" : section.alias || section.section_id;

//     /* ==========================
//        SECTION JOIN
//     ========================== */
//     if (section.table !== rootTable && section.relation) {
//       joins.push(`
//         LEFT JOIN ${section.table} ${sectionAlias}
//           ON ${sectionAlias}.${section.relation.foreign_key}
//              = r.${section.relation.parent_key}
//       `);

//       select.push(`${sectionAlias}.${section.primary_key}`);
//     }

//     /* ==========================
//        FIELDS
//     ========================== */
//     section.fields.forEach((f) => {
//       if (f?.visible === false && f?.add_to_query !== true) return;
//       if (!f.db_field) return;

//       /* ---------- FILE FIELD ---------- */
//       if (f.type === "file" && f.file) {
//         const doc = f.file;

//         documentAggs.push(`
//           SELECT
//             '${f.db_field}' AS db_field,
//             COALESCE(
//               jsonb_agg(
//                 jsonb_build_object(
//                   '${doc.primary_key}', d.${doc.primary_key},
//                   '${doc.doc_type_key}', d.${doc.doc_type_key},
//                   '${doc.file_path_key}', CONCAT('${BASE_URL}', d.${doc.file_path_key}),
//                   '${doc.file_name_key}', d.${doc.file_name_key}
//                 )
//                 ORDER BY d.created_at
//               ),
//               '[]'::jsonb
//             ) AS docs
//           FROM ${doc.table} d
//           WHERE d.${doc.foreign_key} = ${sectionAlias}.${section.primary_key}
//             AND d.${doc.doc_type_key} = '${f.db_field}'
//         `);
//         return;
//       }

//       /* ==========================
//          MULTIPLE + MASTER
//       ========================== */
//       if (
//         f.multiple &&
//         f.data_source?.type === "master" &&
//         f.type === "select"
//       ) {
//         const table = f.data_source.table_name;
//         const pk = f.data_source.primary_key || "id";
//         const labelCol = f.data_source.label_key || "name";

//         select.push(`
//           (
//             SELECT COALESCE(
//               jsonb_agg(
//                 jsonb_build_object(
//                   'label', m.${labelCol},
//                   'value', m.${pk}
//                 )
//                 ORDER BY m.${pk}
//               ),
//               '[]'::jsonb
//             )
//             FROM ${table} m
//             WHERE m.${pk} = ANY (${sectionAlias}.${f.db_field})
//           ) AS ${labelCol}_${f.db_field}
//         `);

//         select.push(`${sectionAlias}.${f.db_field}`);
//         return;
//       }

//       /* ---------- MASTER FIELD ---------- */
//       if (f.data_source?.type === "master" && f.type === "select") {
//         const masterAlias = `${sectionAlias}_${f.db_field}`;
//         const pk = f.data_source.primary_key || "id";
//         const labelCol = f.data_source.label_key || "name";

//         joins.push(`
//           LEFT JOIN ${f.data_source.table_name} ${masterAlias}
//             ON ${masterAlias}.${pk} = ${sectionAlias}.${f.db_field}
//         `);

//         select.push(`${masterAlias}.${labelCol} AS ${labelCol}_${f.db_field}`);
//         select.push(`${sectionAlias}.${f.db_field}`);
//         searchColumns.push(`${masterAlias}.${labelCol}`);
//         return;
//       }

//       /* ---------- DATE RANGE ---------- */
//       if (f.type === "date_range") {
//         select.push(`${sectionAlias}.${f.act_db_field.start}`);
//         select.push(`${sectionAlias}.${f.act_db_field.end}`);
//         searchColumns.push(`${sectionAlias}.${f.act_db_field.start}`);
//         searchColumns.push(`${sectionAlias}.${f.act_db_field.end}`);
//         return;
//       }

//       /* ---------- NORMAL FIELD ---------- */
//       select.push(`${sectionAlias}.${f.db_field}`);
//       searchColumns.push(`${sectionAlias}.${f.db_field}`);
//     });
//   });

//   /* ==========================
//      DOCUMENT MERGE
//   ========================== */
//   if (documentAggs.length) {
//     select.push(`
//       (
//         SELECT COALESCE(
//           jsonb_object_agg(db_field, docs),
//           '{}'::jsonb
//         )
//         FROM (
//           ${documentAggs.join("\nUNION ALL\n")}
//         ) file_docs
//       ) AS documents
//     `);
//   }

//   const whereClause = buildGlobalSearchWhere(schema, search);

//   return `
//     SELECT
//       ${select.join(",\n")}
//     FROM ${rootTable} r
//     ${joins.join("\n")}
//     ${whereClause}
//   `;
// }

module.exports = {
  buildGeneralSelectQuery,
  resolveExcelValue,
  getExcelExportSections,
  buildAddMoreExcelQuery,
  buildExcelSheet,
  buildSortableFieldMap,
};
