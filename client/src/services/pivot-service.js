import { privateHttpClient } from "@/services/api/httpClient";

export const getTables = async () => {
  return await privateHttpClient.get("pivot/tables");
};

export const getColumns = async (tableName) => {
  return await privateHttpClient.get(`pivot/columns/${tableName}`);
};

export const getFieldValues = async (tableName, columnName, search = '', labelColumn = '', extraParams = {}) => {
  const params = {
    search: search || '',
    labelColumn: labelColumn || '',
    ...extraParams,
  };
  const queryStr = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : v)}`)
    .join('&');

  return await privateHttpClient.get(`pivot/values/${tableName}/${columnName}?${queryStr}`);
};

export const getFilterFieldOptions = async (payload) => {
  return await privateHttpClient.post("pivot/filter-options", payload);
};

export const executePivot = async (payload) => {
  return await privateHttpClient.post("pivot/execute", payload);
};

export const exportPivotExcel = async (payload) => {
  return await privateHttpClient.post("pivot/export-excel", payload, {
    responseType: 'blob', // Important for downloading files
  });
};

export const savePivotReport = async (payload) => {
  return await privateHttpClient.post("pivot/save-report", payload);
};

export const getSavedPivotReports = async () => {
  return await privateHttpClient.get("pivot/saved-reports");
};

export const getAllPivotReports = async () => {
  return await privateHttpClient.get("pivot/all-reports");
};

export const togglePivotReportStatus = async (id) => {
  return await privateHttpClient.put(`pivot/report/${id}/status`, {});
};

export const deletePivotReport = async (id) => {
  return await privateHttpClient.delete(`pivot/report/${id}`);
};

export const reorderPivotReports = async (items) => {
  return await privateHttpClient.put("pivot/reports/reorder", { items });
};
