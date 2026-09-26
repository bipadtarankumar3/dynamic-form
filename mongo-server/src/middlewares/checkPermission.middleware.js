// mongo-server/src/middlewares/checkPermission.middleware.js
const RolePermission = require("../models/RolePermission.model");
const Permission = require("../models/Permission.model");

const checkPermission = (moduleSlug, permissionSlug) => {
  return async (req, res, next) => {
    try {
      const { role_id, isConfigurator, role_slug, role_name } = req.user || {};
      const form_slug = req.body?.form_slug;

      // Configurator / Admin bypass
      const isAdmin = isConfigurator ||
        role_slug === "admin" || role_slug === "configurator" ||
        role_slug === "super_admin" ||
        (role_name && String(role_name).toLowerCase().includes("admin"));

      if (isAdmin) return next();

      if (!role_id) {
        return res.status(403).json({ message: "Unauthorized — Role not assigned" });
      }

      const targetMod = (moduleSlug || form_slug || "").trim().toLowerCase();
      const targetAct = (permissionSlug || "").trim().toLowerCase();

      if (!targetAct) {
        return next();
      }

      // Build action variant list
      const actVariants = [targetAct];
      if (targetAct === "view") actVariants.push("read", "list", "details");
      if (targetAct === "read") actVariants.push("view", "list");
      if (targetAct === "edit") actVariants.push("update");
      if (targetAct === "add")  actVariants.push("create");

      const keyVariants = actVariants.map(a => `${targetMod}.${a}`);

      // Find matching permissions
      const permissions = await Permission.find({
        $or: [
          { module: targetMod, type: { $in: actVariants } },
          { key: { $in: keyVariants } },
        ],
        deleted_at: null,
      }).select("_id");

      if (permissions.length === 0) {
        return res.status(403).json({ message: `Access Denied — Missing permission for ${targetMod} (${targetAct})` });
      }

      const permissionIds = permissions.map(p => p._id);

      // Check role has at least one of these permissions
      const rolePermission = await RolePermission.findOne({
        role_id,
        permission_id: { $in: permissionIds },
        deleted_at: null,
      });

      if (!rolePermission) {
        return res.status(403).json({ message: `Access Denied — Missing permission for ${targetMod} (${targetAct})` });
      }

      next();
    } catch (error) {
      console.error("[checkPermission] Error:", error.message);
      return res.status(500).json({ message: "Server Error" });
    }
  };
};

const checkAnyPermission = (moduleSlug, permissionSlugs = []) => {
  return async (req, res, next) => {
    try {
      const { role_id, isConfigurator, role_slug, role_name } = req.user || {};
      const form_slug = req.body?.form_slug;

      const isAdmin = isConfigurator ||
        role_slug === "admin" || role_slug === "configurator" ||
        role_slug === "super_admin" ||
        (role_name && String(role_name).toLowerCase().includes("admin"));

      if (isAdmin) return next();

      if (!role_id) {
        return res.status(403).json({ message: "Unauthorized — Role not assigned" });
      }

      const targetMod = (moduleSlug || form_slug || "").trim().toLowerCase();
      const fullKeys = permissionSlugs.map(a => `${targetMod}.${a}`);

      const permissions = await Permission.find({
        $or: [
          { module: targetMod, type: { $in: permissionSlugs } },
          { key: { $in: fullKeys } },
          { key: { $in: permissionSlugs } },
        ],
        deleted_at: null,
      }).select("_id");

      if (permissions.length === 0) {
        return res.status(403).json({ message: "Access Denied — Missing required permissions" });
      }

      const permissionIds = permissions.map(p => p._id);

      const rolePermission = await RolePermission.findOne({
        role_id,
        permission_id: { $in: permissionIds },
        deleted_at: null,
      });

      if (!rolePermission) {
        return res.status(403).json({ message: "Access Denied — Missing required permissions" });
      }

      next();
    } catch (error) {
      console.error("[checkAnyPermission] Error:", error.message);
      return res.status(500).json({ message: "Server Error" });
    }
  };
};

module.exports = { checkPermission, checkAnyPermission };
