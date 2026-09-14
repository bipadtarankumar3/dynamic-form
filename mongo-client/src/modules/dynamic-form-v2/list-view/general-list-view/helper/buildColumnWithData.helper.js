// client/src/modules/dynamic-form-v2/list-view/general-list-view/helper/buildColumnWithData.helper.js
// ============================================================
// Builds optimized table column definitions for Admin Listing Tables.
// Respects custom configured `schema.table_columns` (order, visibility, labels, alignment)
// while providing rich value formatting for master selects, dates, users, and JSON fields.
// ============================================================

/**
 * Creates a generic cell value resolver function for a field/column
 */
function createValueResolver(field, colKey) {
  return (row) => {
    if (!row) return "-";

    // 1. MASTER SELECT (single + multiple)
    if (
      field?.type === "select" &&
      (field?.data_source?.type === "master" || field?.dataSource?.type === "master")
    ) {
      const labelCol = field?.data_source?.label_key || field?.dataSource?.label_key || "name";
      const aliasKey = `${labelCol}_${colKey}`;
      const altAliasKey = `${colKey}_name`;

      let value = row[aliasKey] !== undefined ? row[aliasKey] : row[altAliasKey];

      // Fallback to raw DB value if label missing or empty
      if (
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0)
      ) {
        value = row[colKey];
      }

      if (value === null || value === undefined) return "-";

      if (Array.isArray(value)) {
        return value
          .map((v) => (typeof v === "string" ? v : v?.label || v?.name || v?.title || JSON.stringify(v)))
          .join(", ");
      }

      return value;
    }

    // 2. DATE RANGE
    if (
      field?.type === "date_range" &&
      field?.act_db_field?.start &&
      field?.act_db_field?.end
    ) {
      const start = row[field?.act_db_field?.start];
      const end = row[field?.act_db_field?.end];

      if (!start && !end) return "-";
      if (start && end) return `${start} → ${end}`;
      if (start) return `From ${start}`;
      return `Until ${end}`;
    }

    // 3. CREATED BY / USER NAME / AUDIT
    if (
      colKey === "created_by" ||
      colKey === "updated_by" ||
      colKey === "modified_by" ||
      colKey.endsWith("_created_by") ||
      colKey.endsWith("_by")
    ) {
      const aliases = [
        `name_${colKey}`,
        `${colKey}_name`,
        `username_${colKey}`,
        `full_name_${colKey}`,
        `${colKey}_username`,
        `${colKey}_full_name`,
      ];
      for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null && row[alias] !== "") {
          return row[alias];
        }
      }
      const rawVal = row[colKey];
      if (rawVal !== null && rawVal !== undefined) {
        if (typeof rawVal === "number" || (typeof rawVal === "string" && /^\d+$/.test(rawVal))) {
          return `User #${rawVal}`;
        }
        return rawVal;
      }
      return "-";
    }

    // Generic name_ alias check (e.g. name_state_id)
    if (row[`name_${colKey}`] !== undefined) {
      return row[`name_${colKey}`] || "-";
    }
    if (row[`${colKey}_name`] !== undefined) {
      return row[`${colKey}_name`] || "-";
    }

    // 4. DATE FORMAT (_at fields)
    if (
      (typeof row[colKey] === "string" || row[colKey] instanceof Date) &&
      (colKey.endsWith("_at") || colKey.endsWith("_date") || colKey === "created_at" || colKey === "updated_at")
    ) {
      const d = new Date(row[colKey]);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }

    // 5. BOOLEAN (Active / Inactive)
    if (typeof row[colKey] === "boolean") {
      return row[colKey] ? "Active" : "Inactive";
    }

    // 6. RAW / JSON / TEXT FALLBACK
    const v = row[colKey];
    if (v === null || v === undefined) return "-";
    if (Array.isArray(v)) {
      if (v.length === 0) return "-";
      if (typeof v[0] === "object" && v[0] !== null) {
        return (
          v
            .map((rowObj) =>
              Object.entries(rowObj)
                .filter(([k, val]) => k !== "id" && k !== "parent_id" && val !== null && val !== undefined && val !== "")
                .map(([, val]) => String(val))
                .join(" - ")
            )
            .filter(Boolean)
            .join("; ") || "-"
        );
      }
      return v.join(", ");
    }
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "string" && (field?.type === "textarea" || /<[a-z][\s\S]*>/i.test(v))) {
      const cleanText = v.replace(/<[^>]*>/g, "").trim();
      return cleanText || "-";
    }
    return v;
  };
}

export const buildColumnsOptimized = (schema, columnsApi = [], rows = []) => {
  // Collect all fields defined in sections
  const fieldMap = new Map();
  for (const section of schema?.sections || []) {
    if (section?.type === "add_more") continue;
    for (const field of section?.fields || []) {
      const k = field?.column_name || field?.db_field;
      if (k) {
        fieldMap.set(k, field);
      }
    }
  }

  // ============================================================
  // CASE 1: Configurator has customized `schema.table_columns`
  // ============================================================
  const customTableCols = schema?.table_columns || schema?.view_columns;
  if (Array.isArray(customTableCols) && customTableCols.length > 0) {
    const configuredCols = [];

    for (const tc of customTableCols) {
      if (tc.checked === false) continue; // Skip hidden columns

      const colKey = tc.key || tc.dataIndex || tc.db_field;
      if (!colKey) continue;

      const matchingField = fieldMap.get(colKey);
      const displayLabel = tc.label || matchingField?.label || colKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      configuredCols.push({
        key: colKey,
        label: displayLabel,
        sortable: tc.sortable !== false,
        align: tc.align || "left",
        getValue: createValueResolver(matchingField, colKey),
      });
    }

    if (configuredCols.length > 0) {
      return configuredCols;
    }
  }

  // ============================================================
  // CASE 2: View source is database view and columnsApi is provided
  // ============================================================
  const isViewSource = schema?.source === "database_view" || (schema?.view_name && !schema.view_name.startsWith("t_frm_"));
  if (isViewSource && Array.isArray(columnsApi) && columnsApi.length > 0) {
    const viewCols = [];
    columnsApi.forEach((col) => {
      const key = typeof col === "string" ? col : (col.key || col.dataIndex || col.column_name || col.db_field);
      if (!key) return;
      const matchingField = fieldMap.get(key);
      const displayLabel = (typeof col === "object" && col.label) ? col.label : (matchingField?.label || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
      viewCols.push({
        key,
        label: displayLabel,
        sortable: true,
        align: (typeof col === "object" && col.align) ? col.align : "left",
        getValue: createValueResolver(matchingField, key),
      });
    });
    if (viewCols.length > 0) {
      return viewCols;
    }
  }

  // ============================================================
  // CASE 3: Default columns built from sections + audit columns
  // ============================================================
  const normalColumns = [];
  const createdByColumns = [];
  const createdAtColumns = [];

  for (const section of schema?.sections || []) {
    if (section?.type === "add_more") continue;

    for (const field of section?.fields || []) {
      const colKey = field?.column_name || field?.db_field;
      if (
        !colKey ||
        field?.type === "file" ||
        (field?.visible === false && field?.add_to_list !== true)
      ) {
        continue;
      }

      const col = {
        key: colKey,
        label: field?.label || colKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        sortable: true,
        align: "left",
        getValue: createValueResolver(field, colKey),
      };

      if (colKey.endsWith("_created_by") || colKey === "created_by") {
        createdByColumns.push(col);
      } else if (colKey.endsWith("_at") || colKey === "created_at") {
        createdAtColumns.push(col);
      } else {
        normalColumns.push(col);
      }
    }
  }

  // Fallback 1: Use columnsApi if available and no columns built from sections
  if (normalColumns.length === 0 && createdByColumns.length === 0 && Array.isArray(columnsApi) && columnsApi.length > 0) {
    columnsApi.forEach((col) => {
      const key = col.key || col.dataIndex || col.db_field;
      if (!key) return;
      normalColumns.push({
        key,
        label: col.label || col.title || key.replace(/_/g, " "),
        sortable: true,
        align: col.align || "left",
        getValue: (row) => row[key] ?? "-",
      });
    });
  }

  // Fallback 2: Infer columns from rows data keys if still empty
  if (normalColumns.length === 0 && createdByColumns.length === 0 && Array.isArray(rows) && rows.length > 0) {
    const sampleRow = rows[0] || {};
    Object.keys(sampleRow).forEach((key) => {
      if (["id", "data"].includes(key) || typeof sampleRow[key] === "object") return;
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const col = {
        key,
        label,
        sortable: true,
        align: "left",
        getValue: (row) => {
          const val = row[key];
          if (val === null || val === undefined) return "-";
          if (typeof val === "boolean") return val ? "Active" : "Inactive";
          return String(val);
        },
      };
      if (key.endsWith("_created_by") || key === "created_by") createdByColumns.push(col);
      else if (key.endsWith("_at") || key === "created_at") createdAtColumns.push(col);
      else normalColumns.push(col);
    });
  }

  return [
    ...normalColumns,
    ...createdByColumns,
    ...createdAtColumns,
  ];
};
