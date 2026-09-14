// server/src/middlewares/rbac.middleware.js
// ============================================================
// RBAC middleware — checks if current authenticated user has
// required permissions. Automatically allows Configurator role.
// ============================================================

const rbacEngine = require("../services/rbacEngine");

/**
 * Express middleware to check if user has a specific permission.
 * 
 * @param {string} permissionKey (e.g. 'budget.export', 'proposal.approve')
 */
const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const { role_id, isConfigurator, role_slug } = req.user || {};

      if (isConfigurator === true) {
        return next();
      }

      if (!role_id) {
        return res.status(403).json({
          success: false,
          message: "Access Denied — Role not assigned",
        });
      }

      const hasPerm = await rbacEngine.hasPermission(role_id, permissionKey);
      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: `Access Denied — Missing permission: ${permissionKey}`,
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Server Error during permission check",
        error: err.message,
      });
    }
  };
};

/**
 * Express middleware to check if user has at least one of the specified permissions.
 * 
 * @param {string[]} permissionKeys
 */
const requireAnyPermission = (permissionKeys = []) => {
  return async (req, res, next) => {
    try {
      const { role_id, isConfigurator, role_slug } = req.user || {};

      if (isConfigurator === true) {
        return next();
      }

      if (!role_id) {
        return res.status(403).json({
          success: false,
          message: "Access Denied — Role not assigned",
        });
      }

      const hasPerm = await rbacEngine.hasAnyPermission(role_id, permissionKeys);
      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: "Access Denied — Missing required permissions",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Server Error during permission check",
        error: err.message,
      });
    }
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
};
