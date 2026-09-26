import { privateHttpClient } from "@/services/api/httpClient";

export const upsertPermission = async (payload) => {
  return await privateHttpClient.post("rbac/perm/upsert", payload);
};

export const permissionList = async () => {
  return await privateHttpClient.get("rbac/perm/list");
};

export const upsertModule = async (payload) => {
  return await privateHttpClient.post("rbac/mod/upsert", payload);
};

export const moduleList = async () => {
  return await privateHttpClient.get("rbac/mod/list");
};

export const upsertRole = async (payload) => {
  return await privateHttpClient.post("rbac/rol/upsert", payload);
};

export const roleDetails = async (payload) => {
  return await privateHttpClient.post("rbac/rol/details", payload);
};

export const roleListAPI = async () => {
  return await privateHttpClient.get("rbac/rol/list");
};
export const roleWiseUserLIstAPI = async (payload) => {
  return await privateHttpClient.post("rbac/rol/user-list", payload);
};
