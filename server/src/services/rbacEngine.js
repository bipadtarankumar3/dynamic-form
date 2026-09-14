// server/src/services/rbacEngine.js
// ============================================================
// RBAC Engine — Handles permission checks, role permissions,
// and field-level permissions for the platform.
// All queries use raw pg pool and parameterized queries.
// ============================================================

const db = require("../config/db");

/**
 * Checks if a role has a specific permission.
 * Configurator (rol_is_configurator = true) has all permissions by default.
 * 
 * @param {number} roleId
 * @param {string} permissionKey (e.g. 'budget.export', 'proposal.approve')
 * @returns {Promise<boolean>}
 */
async function hasPermission(roleId, permissionKey) {
  if (!roleId) return false;

  // 1. Check if the role is a Configurator (has all access)
  const roleCheck = await db.query(
    `SELECT is_configurator FROM t_roles 
     WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [roleId]
  );

  if (roleCheck.rows.length === 0) return false;
  if (roleCheck.rows[0].is_configurator === true) return true;

  // 2. Check explicit permission mapping
  const permCheck = await db.query(
    `SELECT 1 FROM t_role_permissions rp
     JOIN t_permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = $1
       AND p.key = $2
       AND rp.deleted_at IS NULL
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [roleId, permissionKey]
  );

  return permCheck.rows.length > 0;
}

/**
 * Checks if a role has any of the specified permissions.
 * 
 * @param {number} roleId
 * @param {string[]} permissionKeys
 * @returns {Promise<boolean>}
 */
async function hasAnyPermission(roleId, permissionKeys) {
  if (!roleId || !Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    return false;
  }

  // 1. Check Configurator status
  const roleCheck = await db.query(
    `SELECT is_configurator FROM t_roles 
     WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [roleId]
  );

  if (roleCheck.rows.length === 0) return false;
  if (roleCheck.rows[0].is_configurator === true) return true;

  // 2. Check any of the keys
  const permCheck = await db.query(
    `SELECT 1 FROM t_role_permissions rp
     JOIN t_permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = $1
       AND p.key = ANY($2)
       AND rp.deleted_at IS NULL
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [roleId, permissionKeys]
  );

  return permCheck.rows.length > 0;
}

/**
 * Gets all permissions assigned to a role.
 * 
 * @param {number} roleId
 * @returns {Promise<string[]>} List of permission keys
 */
async function getRolePermissions(roleId) {
  if (!roleId) return [];

  // If Configurator, return all existing permissions
  const roleCheck = await db.query(
    `SELECT is_configurator FROM t_roles 
     WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [roleId]
  );

  if (roleCheck.rows.length > 0 && roleCheck.rows[0].is_configurator === true) {
    const allPerms = await db.query(
      `SELECT key FROM t_permissions WHERE deleted_at IS NULL`
    );
    return allPerms.rows.map((row) => row.key);
  }

  const result = await db.query(
    `SELECT p.key FROM t_role_permissions rp
     JOIN t_permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = $1
       AND rp.deleted_at IS NULL
       AND p.deleted_at IS NULL`,
    [roleId]
  );

  return result.rows.map((row) => row.key);
}

/**
 * Gets field-level permissions for a specific role and form schema.
 * 
 * @param {number} roleId
 * @param {string} formSlug
 * @returns {Promise<Object>} Map of field_name -> { can_view, can_edit }
 */
async function getFieldPermissions(roleId, formSlug) {
  if (!roleId || !formSlug) return {};

  // Configurator has complete field level edit/view by default
  const roleCheck = await db.query(
    `SELECT is_configurator FROM t_roles 
     WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [roleId]
  );

  const isConfigurator = roleCheck.rows.length > 0 && roleCheck.rows[0].is_configurator === true;

  const result = await db.query(
    `SELECT fpe_field_name, fpe_can_view, fpe_can_edit
     FROM t_field_permissions
     WHERE fpe_role_id = $1
       AND fpe_form_slug = $2
       AND fpe_deleted_at IS NULL`,
    [roleId, formSlug]
  );

  const permissions = {};
  result.rows.forEach((row) => {
    permissions[row.fpe_field_name] = {
      can_view: isConfigurator ? true : row.fpe_can_view,
      can_edit: isConfigurator ? true : row.fpe_can_edit,
    };
  });

  return permissions;
}

/**
 * Sets field-level permissions for a role and form slug.
 * Bulk inserts or updates.
 * 
 * @param {number} roleId
 * @param {string} formSlug
 * @param {Array} fieldPerms Array of { field_name, can_view, can_edit }
 * @param {number} userId (for updated_by / created_by)
 */
async function setFieldPermissions(roleId, formSlug, fieldPerms = [], userId) {
  if (!roleId || !formSlug) throw new Error("roleId and formSlug are required");

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // Soft delete existing field permissions for this role and form first, or we do upsert
    for (const fp of fieldPerms) {
      await client.query(
        `INSERT INTO t_field_permissions
           (fpe_role_id, fpe_form_slug, fpe_field_name, fpe_can_view, fpe_can_edit, fpe_created_by, fpe_updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $6)
         ON CONFLICT (fpe_role_id, fpe_form_slug, fpe_field_name)
         DO UPDATE SET
           fpe_can_view = $4,
           fpe_can_edit = $5,
           fpe_updated_by = $6,
           fpe_updated_at = NOW(),
           fpe_deleted_at = NULL`,
        [roleId, formSlug, fp.field_name, fp.can_view !== false, fp.can_edit !== false, userId || null]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// -------------------------------------------------------
// Assigns a set of permissions to a role.
// -------------------------------------------------------
async function assignRolePermissions(roleId, permissionIds = [], userId) {
  if (!roleId) throw new Error("roleId is required");

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // Soft delete previous mapping
    await client.query(
      `UPDATE t_role_permissions
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE role_id = $2 AND deleted_at IS NULL`,
      [userId || null, roleId]
    );

    // Insert new mappings
    for (const permId of permissionIds) {
      await client.query(
        `INSERT INTO t_role_permissions (role_id, permission_id, created_by, updated_by)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT (role_id, permission_id)
         DO UPDATE SET
           deleted_at = NULL,
           updated_by = $3,
           updated_at = NOW()`,
        [roleId, permId, userId || null]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  hasPermission,
  hasAnyPermission,
  getRolePermissions,
  getFieldPermissions,
  setFieldPermissions,
  assignRolePermissions,
};
