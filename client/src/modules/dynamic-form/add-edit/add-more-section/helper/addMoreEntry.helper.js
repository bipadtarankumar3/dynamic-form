import { getDefaultValueByType } from "./defaultValue.helper";
export const buildRootOptionsForNewEntry = (section = {}, options = []) => {
  const rootOpts = {};

  section?.fields?.forEach((field) => {
    // only select fields
    if (field?.type !== "select") return;

    // must be master
    const ds = field?.data_source;
    if (!ds || ds?.type !== "master") return;

    // skip dependent fields
    if (field?.dependency) return;

    // copy already-loaded root options
    rootOpts[field?.db_field] = options?.[0]?.[field?.db_field] || [];
  });

  return rootOpts;
};
export const createEmptyEntry = (section = {}) => {
  const id = crypto.randomUUID();
  const entry = { __row_id: id, id }; // id round-trips into the JSONB row
  section?.fields?.forEach((field) => {
    entry[field?.db_field] = getDefaultValueByType(field);
  });
  return entry;
};
