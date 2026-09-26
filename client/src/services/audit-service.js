import { privateHttpClient } from "@/services/api/httpClient";

export const getAuditDetailsByIdAPI = async (payload) => {
  return await privateHttpClient.post("audit/details-by-id", payload);
};
export const getAuditTableNamesAPI = async (payload) => {
  return await privateHttpClient.post("audit/get-all-table-name", payload);
};
export const getAllUserAPI = async (payload) => {
  return await privateHttpClient.post("audit/get-all-user", payload);
};
