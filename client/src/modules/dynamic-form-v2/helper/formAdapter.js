// client/src/modules/dynamic-form-v2/helper/formAdapter.js
/**
 * Universal Form Data Adapter
 * Simplifies converting between API database records and UI Form values.
 */

/**
 * Converts a database record into a clean flat object for Ant Design Form initialization.
 * Handles both root fields and nested `data: { ... }` attributes.
 *
 * @param {Object} record - Raw database record from API
 * @returns {Object} Clean flat values for the form
 */
export function recordToFormValues(record) {
  if (!record || typeof record !== "object") return {};
  const innerData = record.data && typeof record.data === "object" ? record.data : {};
  return {
    ...innerData,
    ...record,
    id: record.id || record._id,
    _id: record._id || record.id,
  };
}

/**
 * Prepares user-submitted form values into a clean payload for API submission.
 *
 * @param {Object} formValues - Values from Ant Design Form
 * @param {string} formSlug - Slug of the dynamic form
 * @param {Object} extraMeta - Optional metadata like parent_id, id, etc.
 * @returns {Object} Final payload to send via HTTP POST/PUT
 */
export function formValuesToPayload(formValues = {}, formSlug = "", extraMeta = {}) {
  const { id, _id, form_slug: _fs, created_at, updated_at, ...cleanValues } = formValues;

  return {
    form_slug: formSlug,
    ...(id || _id ? { id: id || _id, record_id: id || _id } : {}),
    ...extraMeta,
    ...cleanValues,
  };
}

/**
 * Extracts options for a Select or Radio group from field configuration.
 *
 * @param {Object} field - Field schema object
 * @returns {Array<{ label: string, value: any }>}
 */
export function extractFieldOptions(field) {
  if (!field) return [];
  if (Array.isArray(field.options)) {
    return field.options.map((opt) =>
      typeof opt === "object" && opt !== null
        ? { label: opt.label || opt.name || String(opt.value), value: opt.value ?? opt.id }
        : { label: String(opt), value: opt }
    );
  }
  if (typeof field.options === "string") {
    try {
      const parsed = JSON.parse(field.options);
      if (Array.isArray(parsed)) {
        return extractFieldOptions({ options: parsed });
      }
    } catch {
      return [];
    }
  }
  return [];
}
