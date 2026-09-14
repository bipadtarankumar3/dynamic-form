// server/src/middlewares/checkPermission.middleware.js
// ============================================================
// Middleware to check role permissions for dynamic form APIs
// Handles full permission key matching (e.g. 'partner_due_dilligence.list')
// and action type matching (e.g. type = 'list').
// ============================================================

const { sequelize } = require("../config/db.config");

const checkPermission = (moduleSlug, permissionSlug) => {
  return async (req, res, next) => {
    try {
      const { role_id, isConfigurator, role_slug, role_name, rol_is_configurator } = req.user || {};
      const { form_slug } = req.body || {};

      const isAdminOrConfigurator =
        isConfigurator === true ||
        rol_is_configurator === true ||
        Number(role_id) === 1 ||
        Number(role_id) === 2 ||
        role_slug === "admin" ||
        role_slug === "configurator" ||
        role_slug === "system_configurator" ||
        role_slug === "super_admin" ||
        (role_name && String(role_name).toLowerCase().includes("admin")) ||
        (role_name && String(role_name).toLowerCase().includes("configurat"));

      // 1. Admin / Configurator bypass
      if (isAdminOrConfigurator) {
        return next();
      }

      if (!role_id) {
        return res.status(403).json({ message: "Unauthorized — Role not assigned" });
      }

      const targetMod = (moduleSlug || form_slug || "").trim().toLowerCase();

      if (!permissionSlug) {
        return checkAnyPermission(moduleSlug, ["approve", "edit", "add"])(req, res, next);
      }

      const targetAct = (permissionSlug || "").trim().toLowerCase();
      const fullKey = `${targetMod}.${targetAct}`;

      // Map action synonyms
      const actVariants = [targetAct];
      if (targetAct === "view") actVariants.push("read", "list", "details");
      if (targetAct === "read") actVariants.push("view", "list");
      if (targetAct === "edit") actVariants.push("update");
      if (targetAct === "add")  actVariants.push("create");

      const keyVariants = actVariants.map(a => `${targetMod}.${a}`).concat([fullKey, targetAct]);

      const isNgoUser =
        role_slug === "ngo" ||
        Number(role_id) === 6 ||
        (role_name && String(role_name).toLowerCase().includes("ngo"));

      if (isNgoUser) {
        if (
          ["implementation_partner", "due_diligence", "dd_document_type"].includes(targetMod) &&
          ["view", "read", "list", "details", "add", "create", "edit", "update"].includes(targetAct)
        ) {
          return next();
        }
        if (
          ["project", "request_for_proposal"].includes(targetMod) &&
          ["view", "read", "list", "details"].includes(targetAct)
        ) {
          return next();
        }
      }

      // 2. Query permission tables with flexible key & type matching
      const results = await sequelize.query(
        `
        SELECT 1
        FROM t_role_permissions rp
        JOIN t_permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = :role_id
          AND (
            p.module = :mod_slug 
            OR p.module = REPLACE(:mod_slug, '_form', '')
            OR p.module = REPLACE(:mod_slug, 'frm_', '')
          )
          AND (
            p.type IN (:act_variants)
            OR p.key IN (:key_variants)
          )
          AND rp.deleted_at IS NULL
          AND p.deleted_at IS NULL
        LIMIT 1;
        `,
        {
          replacements: {
            role_id,
            mod_slug: targetMod,
            act_variants: actVariants,
            key_variants: keyVariants,
          },
          type: sequelize.QueryTypes.SELECT,
        },
      );

      if (results.length === 0) {
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
      const { role_id, isConfigurator, role_slug, role_name, rol_is_configurator } = req.user || {};
      const { form_slug } = req.body || {};

      const isAdminOrConfigurator =
        isConfigurator === true ||
        rol_is_configurator === true ||
        Number(role_id) === 1 ||
        Number(role_id) === 2 ||
        role_slug === "admin" ||
        role_slug === "configurator" ||
        role_slug === "system_configurator" ||
        role_slug === "super_admin" ||
        (role_name && String(role_name).toLowerCase().includes("admin")) ||
        (role_name && String(role_name).toLowerCase().includes("configurat"));

      // 1. Admin / Configurator bypass
      if (isAdminOrConfigurator) {
        return next();
      }

      if (!role_id) {
        return res.status(403).json({ message: "Unauthorized — Role not assigned" });
      }

      if (!Array.isArray(permissionSlugs) || permissionSlugs.length === 0) {
        return res
          .status(500)
          .json({ message: "No permission slugs provided to checkAnyPermission" });
      }

      const targetMod = (moduleSlug || form_slug || "").trim().toLowerCase();
      const fullKeys = permissionSlugs.map(act => `${targetMod}.${act}`);

      const isNgoUser =
        role_slug === "ngo" ||
        Number(role_id) === 6 ||
        (role_name && String(role_name).toLowerCase().includes("ngo"));

      if (isNgoUser) {
        if (["implementation_partner", "due_diligence", "dd_document_type", "project", "request_for_proposal"].includes(targetMod)) {
          return next();
        }
      }

      const results = await sequelize.query(
        `
        SELECT 1
        FROM t_role_permissions rp
        JOIN t_permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = :role_id
          AND (
            p.module = :mod_slug 
            OR p.module = REPLACE(:mod_slug, '_form', '')
            OR p.module = REPLACE(:mod_slug, 'frm_', '')
          )
          AND (
            p.type IN (:perm_slugs) 
            OR p.key IN (:full_keys)
            OR p.key IN (:perm_slugs)
          )
          AND rp.deleted_at IS NULL
          AND p.deleted_at IS NULL
        LIMIT 1;
        `,
        {
          replacements: {
            role_id,
            mod_slug: targetMod,
            perm_slugs: permissionSlugs,
            full_keys: fullKeys,
          },
          type: sequelize.QueryTypes.SELECT,
        },
      );

      if (results.length === 0) {
        return res.status(403).json({ message: "Access Denied — Missing required permissions" });
      }

      next();
    } catch (error) {
      console.error("[checkAnyPermission] Error:", error.message);
      return res.status(500).json({ message: "Server Error" });
    }
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission,
};
