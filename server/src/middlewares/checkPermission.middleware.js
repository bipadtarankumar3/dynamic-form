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
      const rawFormSlug = req.body?.form_slug || req.query?.form_slug || req.params?.form_slug || req.params?.slug || "";
      const rawParentSlug = req.body?.parent_slug || req.query?.parent_slug || req.params?.parent_slug || "";

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

      const targetMod = (moduleSlug || rawFormSlug || "").trim().toLowerCase();
      const targetParent = (rawParentSlug || "").trim().toLowerCase();

      if (!permissionSlug) {
        return checkAnyPermission(moduleSlug, ["approve", "edit", "add"])(req, res, next);
      }

      const targetAct = (permissionSlug || "").trim().toLowerCase();
      const fullKey = `${targetMod}.${targetAct}`;

      // Map action synonyms
      const actVariants = [targetAct];
      if (targetAct === "view") actVariants.push("read", "list", "details");
      if (targetAct === "read") actVariants.push("view", "list");
      if (targetAct === "list") actVariants.push("view", "read", "details");
      if (targetAct === "details") actVariants.push("view", "read", "list");
      if (targetAct === "edit") actVariants.push("update");
      if (targetAct === "add")  actVariants.push("create");

      if (targetParent) {
        actVariants.push(targetMod);
      }

      const keyVariants = [
        fullKey,
        targetAct,
        targetMod,
        `${targetMod}.${targetAct}`,
        `${targetParent}.${targetMod}`,
        `${targetParent}.${targetAct}`,
      ];

      actVariants.forEach((a) => {
        keyVariants.push(`${targetMod}.${a}`);
        if (targetParent) {
          keyVariants.push(`${targetParent}.${a}`);
          keyVariants.push(`${targetParent}.${targetMod}.${a}`);
        }
      });

      const isNgoUser =
        role_slug === "ngo" ||
        Number(role_id) === 6 ||
        (role_name && String(role_name).toLowerCase().includes("ngo")) ||
        Boolean(req.user?.implementation_partner_id);

      if (isNgoUser) {
        if (
          ["implementation_partner", "due_diligence", "dd_document_type", "rfp_submission", "rfp_proposal_submission", "floated-rfps", "rfp_float"].includes(targetMod) &&
          ["view", "read", "list", "details", "add", "create", "edit", "update"].includes(targetAct)
        ) {
          return next();
        }
        if (
          ["project", "request_for_proposal", "rfp_float", "monitoring", "project_pan", "project_beneficiary", "beneficiary", "project_location", "budgets", "secondary_sdg", "project_activity_milestone", "project_delivery_milestone"].includes(targetMod) &&
          ["view", "read", "list", "details"].includes(targetAct)
        ) {
          return next();
        }
        if (
          (targetParent === "project" || targetParent === "request_for_proposal" || targetParent === "rfp_float") &&
          ["view", "read", "list", "details"].includes(targetAct)
        ) {
          return next();
        }
      }

      const searchModules = Array.from(
        new Set(
          [
            targetMod,
            targetParent,
            targetMod.replace(/_form$/, ""),
            targetMod.replace(/^frm_/, ""),
            targetParent.replace(/_form$/, ""),
            targetParent.replace(/^frm_/, ""),
          ].filter(Boolean)
        )
      );

      // 2. Query permission tables with flexible key & type matching
      const results = await sequelize.query(
        `
        SELECT 1
        FROM t_role_permissions rp
        JOIN t_permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = :role_id
          AND (
            p.module IN (:searchModules)
            OR p.key IN (:key_variants)
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
            searchModules,
            act_variants: Array.from(new Set(actVariants)),
            key_variants: Array.from(new Set(keyVariants)),
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
      const rawFormSlug = req.body?.form_slug || req.query?.form_slug || req.params?.form_slug || req.params?.slug || "";
      const rawParentSlug = req.body?.parent_slug || req.query?.parent_slug || req.params?.parent_slug || "";

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

      const targetMod = (moduleSlug || rawFormSlug || "").trim().toLowerCase();
      const targetParent = (rawParentSlug || "").trim().toLowerCase();
      const fullKeys = permissionSlugs.map(act => `${targetMod}.${act}`);
      if (targetParent) {
        permissionSlugs.forEach(act => {
          fullKeys.push(`${targetParent}.${act}`, `${targetParent}.${targetMod}`, `${targetParent}.${targetMod}.${act}`);
        });
      }

      const isNgoUser =
        role_slug === "ngo" ||
        Number(role_id) === 6 ||
        (role_name && String(role_name).toLowerCase().includes("ngo")) ||
        Boolean(req.user?.implementation_partner_id);

      if (isNgoUser) {
        if (
          ["implementation_partner", "due_diligence", "dd_document_type", "project", "request_for_proposal", "rfp_submission", "rfp_proposal_submission", "floated-rfps", "monitoring", "project_pan", "project_beneficiary", "beneficiary"].includes(targetMod) ||
          targetParent === "project" ||
          targetParent === "request_for_proposal" ||
          targetParent === "rfp_float"
        ) {
          return next();
        }
      }

      const searchModules = Array.from(
        new Set(
          [
            targetMod,
            targetParent,
            targetMod.replace(/_form$/, ""),
            targetMod.replace(/^frm_/, ""),
            targetParent.replace(/_form$/, ""),
            targetParent.replace(/^frm_/, ""),
          ].filter(Boolean)
        )
      );

      const results = await sequelize.query(
        `
        SELECT 1
        FROM t_role_permissions rp
        JOIN t_permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = :role_id
          AND (
            p.module IN (:searchModules)
            OR p.key IN (:full_keys)
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
            searchModules,
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
