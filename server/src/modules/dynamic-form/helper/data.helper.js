const { sequelize } = require("../../../config/db.config");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { encryptData } = require("../../../helper/encryption.helper");
/* =========================
   JSONB NORMALIZER
========================= */
function normalizeJsonbValue(value = undefined) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

const isAppendableValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value?.length === 0
  )
    return false;

  // Empty array → skip
  if (Array.isArray(value)) {
    return value.some(
      (v) =>
        v !== undefined &&
        v !== null &&
        v !== "" &&
        !(Array.isArray(v) && v.length === 0)
    );
  }

  return true; // allows 0, false, "", File, string, number
};

/* =========================
   MULTISELECT MAP BUILDER
========================= */
function buildMultiSelectMaps(schema = {}) {
  const textArrayFields = new Set();
  const jsonbFields = new Set();

  for (const section of schema?.sections || []) {
    if (section?.type === "add_more") {
      const secColName = section.slug || section.section_id || "add_more";
      jsonbFields.add(secColName);
      if (section.table) jsonbFields.add(section.table);
    }
    for (const field of section?.fields || []) {
      const dbCol = field?.db_field || field?.column_name;
      if (!dbCol) continue;
      const dataType = (field?.data_type || "").toLowerCase();
      const type = (field?.type || "").toLowerCase();
      if (
        dataType === "json" ||
        dataType === "jsonb" ||
        ["point", "multipolygon", "line", "linestring", "repeater", "table_grid", "location", "add_more", "json", "jsonb"].includes(type)
      ) {
        jsonbFields.add(dbCol);
      }
      if (field?.type === "select" && field?.multiple === true) {
        if (dataType === "text[]") textArrayFields.add(dbCol);
        else jsonbFields.add(dbCol);
      }
    }
  }

  return { textArrayFields, jsonbFields };
}

/* =========================
   FIELD NAME PARSER
========================= */
function parseFieldName(fieldname = "") {
  if (!fieldname) return {};
  const keys = [];
  fieldname.replace(/([^\[\]]+)/g, (_, k) => keys.push(k));
  if (keys.length === 0) return {};
  const section = keys[0];
  const isSecondKeyIndex = keys.length >= 2 && !isNaN(Number(keys[1]));
  const index = isSecondKeyIndex ? Number(keys[1]) : null;
  const field = isSecondKeyIndex ? keys[2] : keys[1];
  return { section, index, field };
}

/* =========================
   MERGE FILES
========================= */
function mergeFilesIntoData(data, files = []) {
  for (const file of files) {
    const { section, index, field } = parseFieldName(file?.fieldname);
    if (!section || !field) continue;

    const secObj = data[section];
    if (!secObj) continue;

    if (index !== null && index !== undefined) {
      const row = Array.isArray(secObj) ? secObj[index] : secObj;
      if (row) {
        row.documents ||= [];
        row.documents.push({ ...file, __field: field });
      }
    } else {
      if (Array.isArray(secObj)) {
        if (secObj[0]) {
          secObj[0].documents ||= [];
          secObj[0].documents.push({ ...file, __field: field });
        }
      } else {
        secObj.documents ||= [];
        secObj.documents.push({ ...file, __field: field });
      }
    }
  }
  return data;
}

/* =========================
   BUILD ROW
========================= */
async function buildRow(section, rowData, parentPK = null) {
  const row = {};
  if (rowData?.[section?.primary_key]) {
    const val = rowData[section.primary_key];
    if (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val.trim()))) {
      row[section.primary_key] = parseInt(val, 10);
    }
  }
  for (const field of section?.fields || []) {
    if (field?.type === "file") continue;
    if (!field?.db_field) continue;

    // Skip Add-More fields that store data in separate tables
    if (field?.type === "add_more" || field?.type === "repeater" || field?.type === "table_grid") {
      const storageType = field?.storage_type || (field?.storage === "table" ? "table" : "jsonb");
      if (storageType === "table") continue;
    }

    /* PASSWORD AUTO GENERATE */
    if (
      field?.rules?.auto_generate?.enabled === true &&
      field?.rules?.auto_generate?.type === "password" &&
      !rowData?.[field?.db_field]
    ) {
      row[field.db_field] = await bcrypt.hash("Default@123", 10);
      row.__generated_password = "Default@123";
      continue;
    }

    // date_range support
    if (
      field?.type === "date_range" &&
      field?.act_db_field &&
      rowData?.[field?.db_field]?.length === 2
    ) {
      row[field?.act_db_field?.start] = rowData?.[field?.db_field]?.[0] ?? null;
      row[field?.act_db_field?.end] = rowData?.[field?.db_field]?.[1] ?? null;
      continue;
    }

    /* NUMBER NORMALIZATION */
    if (field.type === "number" && isAppendableValue(rowData[field.db_field]) && !field?.validation?.is_encrypted) {
      let value = rowData[field.db_field];

      if (field.number_type === "integer") {
        const intVal = Number.parseInt(value, 10);
        if (Number.isNaN(intVal)) continue;
        value = intVal;
      }

      if (field.number_type === "decimal") {
        const floatVal = Number.parseFloat(value);
        if (Number.isNaN(floatVal)) continue;
        value = floatVal;
      }

      row[field.db_field] = value;
      continue;
    }

    let val = rowData?.[field?.db_field] ?? null;
    if (field?.validation?.is_encrypted === true && val !== null && val !== undefined && val !== "") {
      val = await encryptData(val);
    }
    row[field?.db_field] = val;
  }

  // Preserve extra hook fields passed in rowData that are not in section.fields
  if (rowData && typeof rowData === "object") {
    for (const [k, v] of Object.entries(rowData)) {
      if (k === "documents" || k.startsWith("__")) continue;
      if (v === "[object Object]" || v === "[object Array]") continue;
      const cleanKey = k.replace(/^extra__/, "");
      if (row[cleanKey] === undefined && isAppendableValue(v)) {
        row[cleanKey] = v;
      }
    }
  }

  if (Object.keys(section?.relation || {}).length > 0 && parentPK) {
    row[section?.relation?.foreign_key] = parentPK;
  }

  return row;
}

/* =========================
   SEGREGATE DATA
========================= */
async function segregateData(schema, data) {
  const tables = {};
  const documents = [];

  for (const section of schema?.sections || []) {
    const sectionData = data?.[section?.section_id] || data?.[section?.slug] || data?.[section?.id];
    if (!sectionData) continue;

    /* GENERAL */
    if (
      section?.type === "general" &&
      Object.keys(sectionData || {}).length > 0
    ) {
      tables[section?.table] ||= {};
      Object.assign(
        tables[section?.table],
        await buildRow(section, sectionData)
      );

      // Check for embedded Add-More Table fields inside this general section
      for (const field of section?.fields || []) {
        if (field?.type === "add_more" || field?.type === "repeater" || field?.type === "table_grid") {
          const storageType = field?.storage_type || (field?.storage === "table" ? "table" : "jsonb");
          if (storageType === "table") {
            const childTable = field.table_name || field.table || `t_${field.db_field || field.column_name}`;
            let addMoreRows = sectionData[field.db_field || field.column_name || field.id];

            if (typeof addMoreRows === "string") {
              try {
                addMoreRows = JSON.parse(addMoreRows);
              } catch (e) {
                addMoreRows = [];
              }
            }

            if (Array.isArray(addMoreRows)) {
              tables[childTable] ||= [];
              const childSec = {
                primary_key: "id",
                fields: field.fields || [],
                table: childTable,
              };

              for (let idx = 0; idx < addMoreRows.length; idx++) {
                const rowData = addMoreRows[idx];
                const tempId = rowData.id ?? `${childTable}_${idx}`;
                const row = await buildRow(childSec, rowData);
                row.__temp_pk = tempId;
                tables[childTable].push(row);
              }
            }
          }
        }
      }

      if (sectionData?.documents) {
        documents.push({
          section,
          parentTempId:
            section?.table === schema?.root_entity?.table
              ? null
              : section.section_id,
          files: sectionData.documents,
        });
      }
    }

    /* ADD_MORE */
    let secRows = sectionData;
    if (typeof secRows === "string") {
      try {
        secRows = JSON.parse(secRows);
      } catch (e) {
        secRows = [];
      }
    }

    if (section.type === "add_more" && Array.isArray(secRows)) {
      const rootTable = schema?.root_entity?.table;

      if (
        section.table === rootTable ||
        (tables[section.table] && !Array.isArray(tables[section.table]))
      ) {
        tables[section.table] ||= {};

        const addMoreArray = [];
        for (let index = 0; index < secRows.length; index++) {
          const rowData = secRows[index];
          const row = await buildRow(section, rowData);
          // Every JSONB row must have a stable id for future edits.
          if (!row.id) row.id = randomUUID();
          addMoreArray.push(row);

          if (rowData.documents) {
            documents.push({
              section,
              parentTempId: null,
              files: rowData.documents,
            });
          }
        }

        const secColName = section.slug || section.section_id || "add_more";
        tables[section.table][secColName] = addMoreArray;
      } else {
        tables[section.table] ||= [];

        for (let index = 0; index < sectionData.length; index++) {
          const rowData = sectionData[index];

          const tempId =
            rowData[section.primary_key] ?? `${section.table}_${index}`;

          const row = await buildRow(section, rowData);
          row.__temp_pk = tempId;
          tables[section.table].push(row);

          if (rowData.documents) {
            documents.push({
              section,
              parentTempId: tempId,
              files: rowData.documents,
            });
          }
        }
      }
    }
  }

  // Auto-map hook extra fields (extra__<key> -> <key>) to root table
  const rootTable = schema?.root_entity?.table;
  if (rootTable && tables[rootTable]) {
    for (const [key, value] of Object.entries(data || {})) {
      if (key.startsWith("extra__")) {
        const realKey = key.replace(/^extra__/, "");
        if (value !== undefined && value !== null && value !== "") {
          tables[rootTable][realKey] = value;
        }
      }
    }
  }

  tables.__documents = documents;
  return tables;
}

/* =========================
   SAFE JSONB SANITIZER
========================= */
function safeJsonString(v) {
  if (v === undefined || v === null || v === "" || v === "[object Object]" || v === "[object Array]") return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    try { return JSON.stringify(v); } catch { return null; }
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "" || trimmed === "[object Object]" || trimmed === "[object Array]") return null;
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify(trimmed);
    }
  }
  return JSON.stringify(v);
}

/* =========================
   RAW INSERT
========================= */
const ddlService = require("../../../services/ddlService");

async function insertRow(table, data, schemaCtx, transaction) {
  const { textArrayFields, jsonbFields } = schemaCtx || { textArrayFields: new Set(), jsonbFields: new Set() };
  if (data?.__generated_password) {
    delete data?.__generated_password;
  }

  const isJsonbCol = (c) => {
    if (jsonbFields?.has?.(c)) return true;
    const v = data[c];
    if (v === null || v === undefined) return false;
    if (textArrayFields?.has?.(c)) return false;
    if (Array.isArray(v)) return true;
    if (typeof v === "object" && !(v instanceof Date)) return true;
    return false;
  };

  // Ensure all incoming data columns exist in the PostgreSQL table before executing INSERT
  for (const col of Object.keys(data || {})) {
    if (col && !col.startsWith("__")) {
      try {
        const isArr = Array.isArray(data[col]) || textArrayFields?.has?.(col);
        const isObj = isJsonbCol(col);
        const fieldType = isArr ? (textArrayFields?.has?.(col) ? "text[]" : "jsonb") : (isObj ? "jsonb" : "text");
        await ddlService.addColumn(table, { column_name: col, type: fieldType });
      } catch (e) {
        // column exists or ignore
      }
    }
  }

  const cols = Object.keys(data || {});

  const values = cols?.map((c) => {
    if (textArrayFields?.has?.(c)) return `ARRAY[:${c}]::text[]`;
    if (isJsonbCol(c)) return `:${c}::jsonb`;
    return `:${c}`;
  });

  const replacements = { ...data };

  // Prepare replacements safely for JSONB parameters
  for (const c of cols) {
    if (isJsonbCol(c)) {
      replacements[c] = safeJsonString(data[c]);
    }
  }

  const quotedCols = cols?.map((c) => `"${c}"`);
  const sql = `
    INSERT INTO "${table}" (${quotedCols?.join(", ")})
    VALUES (${values?.join(", ")})
    RETURNING *
  `;
  if (Object.keys(replacements || {}).length === 0) {
    throw new Error("Invalid SQL or replacements");
  }

  const [rows] = await sequelize.query(sql, {
    replacements,
    transaction,
  });

  return rows[0];
}

/* =========================
   RAW UPDATE
========================= */
async function updateRow(table, data, where, schemaCtx, transaction) {
  const { textArrayFields, jsonbFields } = schemaCtx || { textArrayFields: new Set(), jsonbFields: new Set() };
  if (data?.__generated_password) {
    delete data?.__generated_password;
  }

  const isJsonbCol = (k) => {
    if (jsonbFields?.has?.(k)) return true;
    const v = data[k];
    if (v === null || v === undefined) return false;
    if (textArrayFields?.has?.(k)) return false;
    if (Array.isArray(v)) return true;
    if (typeof v === "object" && !(v instanceof Date)) return true;
    return false;
  };

  // Ensure all incoming data columns exist in the PostgreSQL table before executing UPDATE
  for (const col of Object.keys(data || {})) {
    if (col && !col.startsWith("__")) {
      try {
        const isArr = Array.isArray(data[col]) || textArrayFields?.has?.(col);
        const isObj = isJsonbCol(col);
        const fieldType = isArr ? (textArrayFields?.has?.(col) ? "text[]" : "jsonb") : (isObj ? "jsonb" : "text");
        await ddlService.addColumn(table, { column_name: col, type: fieldType });
      } catch (e) {
        // column exists or ignore
      }
    }
  }

  const setClause = Object.keys(data)
    .map((k) => {
      if (textArrayFields?.has?.(k)) return `"${k}" = ARRAY[:${k}]::text[]`;
      if (isJsonbCol(k)) return `"${k}" = :${k}::jsonb`;
      return `"${k}" = :${k}`;
    })
    .join(", ");

  const whereClause = Object.keys(where)
    .map((k) => `"${k}" = :w_${k}`)
    .join(" AND ");

  const replacements = { ...data };

  // Prepare replacements safely for JSONB parameters
  for (const k of Object.keys(data)) {
    if (isJsonbCol(k)) {
      replacements[k] = safeJsonString(data[k]);
    }
  }

  for (const [k, v] of Object.entries(where)) {
    replacements[`w_${k}`] = v;
  }

  await sequelize.query(
    `UPDATE "${table}" SET ${setClause} WHERE ${whereClause}`,
    { replacements, transaction }
  );
}

module.exports = {
  buildMultiSelectMaps,
  mergeFilesIntoData,
  segregateData,
  insertRow,
  updateRow,
};
