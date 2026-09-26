import { privateHttpClient } from "@/services/api/httpClient";

export const deleteFileById = async (documentId) => {
  return await privateHttpClient.post("common/delete-file", { documentId });
};

export const fetchPermission = async () => {
  return await privateHttpClient.get("common/permissions");
};

export const fetchSlugWiseUser = async (payload) => {
  return await privateHttpClient.post("common/slug-wise-user", payload);
};

export const fyListAPI = async (payload = {}) => {
  try {
    return await privateHttpClient.post("fy/list", payload);
  } catch (e) {
    try {
      const fallbackRes = await privateHttpClient.get("configurator/master-schemas/financial_year/records");
      return fallbackRes;
    } catch (err) {
      return { data: { success: true, data: [] } };
    }
  }
};

export const currentFyAPI = async (payload = {}) => {
  try {
    return await privateHttpClient.post("fy/current", payload);
  } catch (e) {
    return { data: { success: true, data: null } };
  }
};
