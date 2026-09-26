import { privateHttpClient } from '@/services/api/httpClient';

const API_BASE = '/configurator/menus';

/**
 * Fetch flat list of all menus for configurator
 */
export const fetchAllMenus = async () => {
  const res = await privateHttpClient.get(API_BASE);
  return res.data?.data || [];
};

/**
 * Fetch available form and master schemas for menu attachments
 */
export const fetchAttachmentSchemas = async () => {
  const [formsRes, mastersRes] = await Promise.allSettled([
    privateHttpClient.get('/configurator/form-schemas'),
    privateHttpClient.get('/configurator/master-schemas'),
  ]);

  const formsList = formsRes.status === 'fulfilled' && formsRes.value.data?.data ? formsRes.value.data.data : [];
  const mastersList = mastersRes.status === 'fulfilled' && mastersRes.value.data?.data ? mastersRes.value.data.data : [];

  return { formsList, mastersList };
};

/**
 * Create a new menu item
 * @param {Object} payload
 */
export const createMenu = async (payload) => {
  const res = await privateHttpClient.post(API_BASE, payload);
  return res.data;
};

/**
 * Update an existing menu item
 * @param {string|number} id
 * @param {Object} payload
 */
export const updateMenu = async (id, payload) => {
  const res = await privateHttpClient.put(`${API_BASE}/${id}`, payload);
  return res.data;
};

/**
 * Soft delete a menu item
 * @param {string|number} id
 */
export const deleteMenu = async (id) => {
  const res = await privateHttpClient.delete(`${API_BASE}/${id}`);
  return res.data;
};

/**
 * Bulk reorder menu items
 * @param {Array<{ id: number, order: number, parent_id: number|null }>} items
 */
export const reorderMenus = async (items) => {
  const res = await privateHttpClient.put(`${API_BASE}/reorder`, { items });
  return res.data;
};

/**
 * Update role permissions for a menu item
 * @param {string|number} id
 * @param {Object} permissionsPayload
 */
export const updateMenuPermissions = async (id, permissionsPayload) => {
  const res = await privateHttpClient.put(`${API_BASE}/${id}/permissions`, permissionsPayload);
  return res.data;
};
