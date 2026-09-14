import { getDefaultValueByType } from "./defaultValue.helper";

/* ---------- UTIL ---------- */
const sanitizeArray = (arr) =>
  Array.isArray(arr) ? arr.filter((v) => v !== null && v !== undefined) : arr;

/* ---------- FILE HYDRATION ---------- */
export const buildFileListFromDocuments = (docs = [], field) => {
  if (!docs) return [];
  const list = Array.isArray(docs) ? docs : [docs];
  const validDocs = list.filter((doc) => doc && doc !== "NA");

  return validDocs?.map((doc, index) => ({
    uid: doc?.[field?.file?.primary_key] || doc?.tdoc_id || doc?.id || `${index}`,
    id: doc?.[field?.file?.primary_key] || doc?.tdoc_id || doc?.id, // for delete API
    name: doc?.[field?.file?.file_name_key] || doc?.file_name || doc?.doc_title || (typeof doc === "string" ? doc.split("/").pop() : `Document ${index + 1}`),
    status: "done",
    url: doc?.[field?.file?.file_path_key] || doc?.file_path || (typeof doc === "string" ? doc : ""),
  }));
};

/* ---------- SELECT VALUE ---------- */
const toStr = (v) =>
  v !== null && v !== undefined ? String(v) : v;

export const resolveSelectValue = (field, rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return getDefaultValueByType(field);
  }

  if (Array.isArray(rawValue)) {
    const cleaned = sanitizeArray(
      rawValue?.map((v) => toStr(v?.value !== undefined ? v.value : v))
    );
    if (cleaned?.length === 0) return getDefaultValueByType(field);
    return field?.multiple ? cleaned : cleaned?.[0];
  }

  if (typeof rawValue === "object" && rawValue?.value !== undefined) {
    return toStr(rawValue?.value);
  }

  return toStr(rawValue);
};

// ---------- ENTRY HYDRATION ----------
export const hydrateAddMoreEntries = (section, apiRows = [], rootData = {}) => {
  const entries = [];
  const fileLists = [];

  apiRows?.forEach((row) => {
    // Restore the stored id (UUID) so it stays stable across edits.
    // Fall back to a new UUID only if the row has no id (legacy data).
    const rowId = row?.id || crypto.randomUUID();
    const entry = { __row_id: rowId, id: rowId };
    const rowFiles = {};
    if (row?.[section?.primary_key])
      entry[section?.primary_key] = row[section?.primary_key];
    section.fields.forEach((field) => {
      if (field?.visible === false && field?.add_to_query !== true) return;
      /* ================= FILE ================= */
      if (field?.type === "file") {
        const rawDocs =
          row?.documents?.[field?.db_field] ||
          row?.[field?.db_field] ||
          rootData?.documents?.[field?.db_field] ||
          [];

        const files = buildFileListFromDocuments(rawDocs, field);
        rowFiles[field?.db_field] = files;

        // IMPORTANT: store file list in entry for form state
        entry[field?.db_field] = files;
        return;
      }

      /* ================= DATE RANGE ================= */
      if (field?.type === "date_range" && field?.act_db_field) {
        const start = row?.[field?.act_db_field?.start];
        const end = row?.[field?.act_db_field?.end];
        entry[field?.db_field] =
          start && end ? [start, end] : getDefaultValueByType(field);
        return;
      }

      /* ================= SELECT ================= */
      if (field?.type === "select") {
        entry[field?.db_field] = resolveSelectValue(
          field,
          row?.[field.db_field]
        );
        return;
      }

      /* ================= NORMAL ================= */
      entry[field?.db_field] =
        row?.[field?.db_field] ?? getDefaultValueByType(field);
    });

    entries.push(entry);
    fileLists.push(rowFiles);
  });

  return { entries, fileLists };
};
