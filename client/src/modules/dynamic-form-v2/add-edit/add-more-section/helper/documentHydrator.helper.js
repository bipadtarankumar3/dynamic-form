import { buildFileListFromDocuments } from "./hydrateForm.helper";

/**
 * Hydrate documents for ADD MORE edit mode
 * Dependency aware
 */
export const hydrateAddMoreDocuments = (section, apiRows = []) => {
  return apiRows?.map((row) => {
    const rowFiles = {};

    section?.fields?.forEach((field) => {
      if (field?.type !== "file") return;

      const parent = field?.dependency?.parent_db_field;

      // dependency check
      if (parent && !row?.[parent]) {
        rowFiles[field?.db_field] = [];
        return;
      }

      rowFiles[field?.db_field] = buildFileListFromDocuments(
        row?.documents?.[field?.db_field] || [],
        field
      );
    });

    return rowFiles;
  });
};
