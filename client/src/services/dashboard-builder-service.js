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
    const rawList = res.data?.data || res.data?.roles || [];
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((r, idx) => {
        const idVal = String(r._id || r.id || r.role_id || r.role_slug || r.slug || `role_${idx}`);
        const nameVal = r.name || r.role_name || r.role_slug || r.slug || `Role #${idVal}`;
        return {
          ...r,
          id: idVal,
          _id: idVal,
          role_id: idVal,
          name: nameVal,
          role_name: nameVal,
        };
      });
    }
  } catch (e) {
    try {
      const res2 = await privateHttpClient.get("rbac/rol/list");
      const rawList2 = res2.data?.data || [];
      if (Array.isArray(rawList2) && rawList2.length > 0) {
        return rawList2.map((r, idx) => {
          const idVal = String(r._id || r.id || r.role_id || r.role_slug || r.slug || `role_${idx}`);
          const nameVal = r.name || r.role_name || r.role_slug || r.slug || `Role #${idVal}`;
          return {
            ...r,
            id: idVal,
            _id: idVal,
            role_id: idVal,
            name: nameVal,
            role_name: nameVal,
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  }
  return [];
};

