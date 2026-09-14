import { getDefaultValueByType } from "./defaultValue.helper";

export const sanitizeArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.filter((v) => v !== null && v !== undefined);
};

export const buildFileListFromDocuments = (docs = [], field) => {
  if (!docs) return [];
  const list = Array.isArray(docs) ? docs : [docs];
  const validDocs = list.filter((doc) => doc && doc !== "NA");

  return validDocs.map((doc, index) => ({
    uid: doc?.[field?.file?.primary_key] || doc?.tdoc_id || doc?.id || `${index}`,
    id: doc?.[field?.file?.primary_key] || doc?.tdoc_id || doc?.id, // important for delete
    name: doc?.[field?.file?.file_name_key] || doc?.file_name || doc?.doc_title || (typeof doc === "string" ? doc.split("/").pop() : `Document ${index + 1}`),
    status: "done",
    url: doc?.[field?.file?.file_path_key] || doc?.file_path || (typeof doc === "string" ? doc : ""),
  }));
};

export const resolveSelectValue = (field, rawValue) => {
  /* =========================
     NULL / EMPTY
  ========================== */
  if (rawValue === null || rawValue === undefined) {
    return getDefaultValueByType(field);
  }

  /* =========================
     ARRAY CASE (multiple)
  ========================== */
  if (Array.isArray(rawValue)) {
    const cleaned = sanitizeArray(
      rawValue.map((v) => {
        const val = v?.value !== undefined ? v.value : v;
        return val !== null && val !== undefined ? String(val) : val;
      })
    );

    // [null] OR [] OR [null, null]
    if (cleaned.length === 0) {
      return getDefaultValueByType(field);
    }

    return field?.multiple ? cleaned : cleaned[0];
  }

  /* =========================
     OBJECT CASE {label,value}
  ========================== */
  if (typeof rawValue === "object" && rawValue?.value !== undefined) {
    return String(rawValue.value);
  }

  /* =========================
     PRIMITIVE (string/number)
  ========================== */
  return String(rawValue);
};
