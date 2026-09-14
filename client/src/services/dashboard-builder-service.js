import { privateHttpClient } from "@/services/api/httpClient";

export const getCustomDashboards = async (params = {}) => {
  return await privateHttpClient.get("custom-dashboards/list", { params });
};

export const getCustomDashboardById = async (id) => {
  return await privateHttpClient.get(`custom-dashboards/detail/${id}`);
};

export const createCustomDashboard = async (payload) => {
  return await privateHttpClient.post("custom-dashboards/create", payload);
};

export const updateCustomDashboard = async (id, payload) => {
  return await privateHttpClient.put(`custom-dashboards/update/${id}`, payload);
};

export const toggleCustomDashboardStatus = async (id) => {
  return await privateHttpClient.put(`custom-dashboards/toggle-status/${id}`, {});
};

export const deleteCustomDashboard = async (id) => {
  return await privateHttpClient.delete(`custom-dashboards/delete/${id}`);
};

export const reorderCustomDashboards = async (items) => {
  return await privateHttpClient.put("custom-dashboards/reorder", { items });
};

export const getAvailableRoles = async () => {
  try {
    const res = await privateHttpClient.get("configurator/rbac/roles");
    if (res.data?.success || res.data?.status) {
      return res.data.data || [];
    }
  } catch (e) {
    try {
      const res2 = await privateHttpClient.get("rbac/rol/list");
      return res2.data?.data || [];
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  }
  return [];
};
