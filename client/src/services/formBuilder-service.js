import { privateHttpClient } from "@/services/api/httpClient";

export const createFormAPI = async (payload) => {
  return await privateHttpClient.post("form-builder/create-form", payload);
};

export const syncParentForeignKeyAPI = async (payload) => {
  return await privateHttpClient.post("configurator/form-schemas/sync-parent-foreign-key", payload);
};

