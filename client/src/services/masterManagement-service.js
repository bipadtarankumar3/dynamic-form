import { privateHttpClient } from "@/services/api/httpClient";

// theme wise Activity 
export const getThemeWiseActivityAllDataAPI = async (payload) => {
  return await privateHttpClient.get("master/theme-wise-activity-all-data", payload);
};
export const getFormGroupDetails = async (payload) => {
  return await privateHttpClient.post("master/form-group-details", payload);
};

export const getThemeWiseActivityAPI = async (payload) => {
  return await privateHttpClient.post("master/theme-wise-activity", payload);
};

export const getThemeListAPI = async (payload) => {
  return await privateHttpClient.get("master/theme-list", payload);
};

export const getVillageWiseStateAPI = async (payload) => {
  return await privateHttpClient.post("master/village-wise-state", payload);
};
export const getSchoolDetailsAPI = async (payload) => {
  return await privateHttpClient.post("master/school-details", payload);
};
export const getSupplyItemDetailsAPI = async (payload) => {
  return await privateHttpClient.post("master/supply-item-details", payload);
};
export const getVillageDetailsByIdAPI = async (payload) => {
  return await privateHttpClient.post("master/village-details-by-id", payload);
}
export const getDocumentTypeListAPI = async (payload) => {
  return await privateHttpClient.get("master/document-type-list", payload);
};
