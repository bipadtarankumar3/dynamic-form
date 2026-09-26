// server/src/modules/menu/menu.controller.js
// ============================================================
// Menu Engine — Configurator manages sidebar menus in t_menus.
// Regular users fetch their role-filtered menu tree at login.
// Menus are hierarchical (parent/child), ordered, and role-controlled.
// ============================================================

const db = require("../../config/db");

// -------------------------------------------------------
// GET MENU TREE for current user
// Filtered by:
//   - Role visibility (t_menu_role_perms)
//   - deleted_at IS NULL
//   - is_active = TRUE
//   - is_configurator only for Configurator role
// -------------------------------------------------------
const getPublicMenuTree = async (req, res, next) => {
  try {
    const result = await db.query(
      `WITH RECURSIVE active_menus AS (
         SELECT m.id, m.parent_id, m.label, m.icon, m.image, m.url, m.order, m.module_key, m.is_public
         FROM t_menus m
         WHERE m.deleted_at IS NULL AND m.is_active = TRUE AND m.parent_id IS NULL AND (m.is_public = TRUE OR m.url ILIKE '/public/%')
         UNION ALL
         SELECT c.id, c.parent_id, c.label, c.icon, c.image, c.url, c.order, c.module_key, c.is_public
         FROM t_menus c
         JOIN active_menus p ON c.parent_id = p.id
         WHERE c.deleted_at IS NULL AND c.is_active = TRUE AND (c.is_public = TRUE OR c.url ILIKE '/public/%')
       )
       SELECT * FROM active_menus
       ORDER BY parent_id NULLS FIRST, "order" ASC`
    );
    const flat = result.rows;
    const tree = buildTree(flat);
    return res.status(200).json({ success: true, data: tree });
  } catch (err) {
    next(err);
  }
};

const getMenuTree = async (req, res, next) => {
  try {
    const { role_id, isConfigurator } = req.user || {};

    const result = await db.query(
      `WITH RECURSIVE active_menus AS (
         SELECT
           m.id,
           m.parent_id,
           m.label,
           m.icon,
           m.image,
           m.url,
           m.order,
           m.module_key,
           m.is_configurator,
           m.is_public
         FROM t_menus m
         WHERE m.deleted_at IS NULL AND m.is_active = TRUE AND m.parent_id IS NULL AND m.is_configurator = FALSE AND (m.is_public IS NOT TRUE OR m.is_public = FALSE)
         UNION ALL
         SELECT
           c.id,
           c.parent_id,
           c.label,
           c.icon,
           c.image,
           c.url,
           c.order,
           c.module_key,
           c.is_configurator,
           c.is_public
         FROM t_menus c
         JOIN active_menus p ON c.parent_id = p.id
         WHERE c.deleted_at IS NULL AND c.is_active = TRUE AND c.is_configurator = FALSE AND (c.is_public IS NOT TRUE OR c.is_public = FALSE)
       )
       SELECT * FROM active_menus
       ORDER BY parent_id NULLS FIRST, "order" ASC`
    );

    let flat = result.rows;

    if (!isConfigurator && role_id) {
      // Fetch allowed permission keys for this role from t_role_permissions
      const permRes = await db.query(
        `SELECT p.key, p.module, p.type
         FROM t_role_permissions rp
         JOIN t_permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1 AND rp.deleted_at IS NULL AND p.deleted_at IS NULL`,
        [role_id]
      );

      const allowedModules = new Set();
      permRes.rows.forEach(r => {
        if (r.module) {
          const mod = r.module.trim().toLowerCase();
          allowedModules.add(mod);
          allowedModules.add(mod.replace(/_/g, "-"));
          allowedModules.add(mod.replace(/-/g, "_"));
        }
        if (r.key) {
          const parts = r.key.split(".");
          if (parts[0]) {
            const modKey = parts[0].trim().toLowerCase();
            allowedModules.add(modKey);
            allowedModules.add(modKey.replace(/_/g, "-"));
            allowedModules.add(modKey.replace(/-/g, "_"));
          }
        }
      });

      // Filter flat menus: exclude public forms and deduplicate entries
      const seenSlugs = new Set();
      const parentIds = new Set(flat.filter(x => x.parent_id).map(x => x.parent_id));
      flat = flat.filter(m => {
        if (m.is_public === true || (m.url && String(m.url).includes("mode=form_only"))) {
          return false; // Exclude public form links from Admin sidebar
        }

        if (parentIds.has(m.id) || !m.url || m.url === "#") return true; // keep parent header containers initially

        const rawUrl = String(m.url).split("?")[0].replace(/^\/+/, "").replace(/^forms\//, "").replace(/^admin\//, "").replace(/^event\//, "").replace(/^masters\//, "");
        const parts = rawUrl.split("/");
        const slugCandidate = (parts[parts.length - 1] || "").trim().toLowerCase();
        const slugUnderscore = slugCandidate.replace(/-/g, "_");
        const slugHyphen = slugCandidate.replace(/_/g, "-");

        // Always allow dashboard
        if (slugCandidate === "dashboard") return true;

        // Check if role has access to this menu item's target slug or via explicit module_key
        const normKey = (m.module_key || "").trim().toLowerCase();
        const normKeyUnderscore = normKey.replace(/-/g, "_");
        const normKeyHyphen = normKey.replace(/_/g, "-");

        const hasAccess =
          allowedModules.has(slugCandidate) ||
          allowedModules.has(slugUnderscore) ||
          allowedModules.has(slugHyphen) ||
          allowedModules.has(rawUrl.toLowerCase()) ||
          (normKey && (allowedModules.has(normKey) || allowedModules.has(normKeyUnderscore) || allowedModules.has(normKeyHyphen))) ||
          (slugCandidate === "feed" && (allowedModules.has("feed") || allowedModules.has("volunteering-story-feed") || allowedModules.has("volunteering_story_feed") || allowedModules.has("volunteering-impact-story") || allowedModules.has("volunteering_impact_story"))) ||
          (slugCandidate === "portal" && (allowedModules.has("portal") || allowedModules.has("volunteering-portal") || allowedModules.has("volunteering_portal") || allowedModules.has("volunteering") || allowedModules.has("volunteering_event") || allowedModules.has("volunteering-event"))) ||
          (slugCandidate === "volunteering-impact-story" && (allowedModules.has("volunteering_impact_story") || allowedModules.has("volunteering-impact-story")));

        if (!hasAccess) return false;

        // Deduplicate menu entries for the same target slug
        if (seenSlugs.has(slugCandidate)) return false;
        seenSlugs.add(slugCandidate);

        return true;
      });
    } else {
      // Configurator/admin fallback filter
      let adminAllowedModules = new Set();

      if (role_id) {
        const adminPermRes = await db.query(
          `SELECT p.module, p.key
           FROM t_role_permissions rp
           JOIN t_permissions p ON rp.permission_id = p.id
           WHERE rp.role_id = $1 AND rp.deleted_at IS NULL AND p.deleted_at IS NULL`,
          [role_id]
        );
        adminPermRes.rows.forEach(r => {
          if (r.module) {
            const mod = r.module.trim().toLowerCase();
            adminAllowedModules.add(mod);
            adminAllowedModules.add(mod.replace(/_/g, "-"));
            adminAllowedModules.add(mod.replace(/-/g, "_"));
          }
          if (r.key) {
            const parts = r.key.split(".");
            if (parts[0]) {
              const modKey = parts[0].trim().toLowerCase();
              adminAllowedModules.add(modKey);
              adminAllowedModules.add(modKey.replace(/_/g, "-"));
              adminAllowedModules.add(modKey.replace(/-/g, "_"));
            }
          }
        });
      }

      const adminParentIds = new Set(flat.filter(x => x.parent_id).map(x => x.parent_id));
      flat = flat.filter(m => {
        if (adminParentIds.has(m.id) || !m.url || m.url === "#") return true;

        const rawUrl = String(m.url).split("?")[0].replace(/^\/+/, "").replace(/^forms\//, "").replace(/^admin\//, "").replace(/^event\//, "").replace(/^masters\//, "");
        const parts = rawUrl.split("/");
        const slugCandidate = (parts[parts.length - 1] || "").trim().toLowerCase();

        if (slugCandidate === "dashboard") return true;

        if (m.module_key || slugCandidate) {
          const normKey = (m.module_key || "").trim().toLowerCase();
          const hasAccess =
            adminAllowedModules.has(slugCandidate) ||
            adminAllowedModules.has(slugCandidate.replace(/-/g, "_")) ||
            adminAllowedModules.has(slugCandidate.replace(/_/g, "-")) ||
            (normKey && (adminAllowedModules.has(normKey) || adminAllowedModules.has(normKey.replace(/-/g, "_")) || adminAllowedModules.has(normKey.replace(/_/g, "-"))));
          return hasAccess;
        }
        return true;
      });
    }

    const tree = buildTree(flat);

    // Recursively prune parent menu containers that have no children and no direct URL
    const pruneEmptyParents = (nodes) => {
      return nodes.filter(node => {
        if (Array.isArray(node.children) && node.children.length > 0) {
          node.children = pruneEmptyParents(node.children);
          return node.children.length > 0 || (node.url && node.url !== "#");
        }
        return node.url && node.url !== "#";
      });
    };

    const finalTree = pruneEmptyParents(tree);

    return res.status(200).json({ success: true, data: finalTree });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// Build tree from flat list
// -------------------------------------------------------
function buildTree(items) {
  const map = {};
  const roots = [];

  for (const item of items) {
    map[item.id] = { ...item, children: [] };
  }

  for (const item of items) {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  }

  return roots;
}

// -------------------------------------------------------
// GET ALL MENUS FLAT (Configurator — for menu builder UI)
// -------------------------------------------------------
const getAllMenus = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.*,
              p.label AS parent_label
       FROM t_menus m
       LEFT JOIN t_menus p ON p.id = m.parent_id
       WHERE m.deleted_at IS NULL
       ORDER BY m.parent_id NULLS FIRST, m.order ASC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// GET SINGLE MENU ITEM (Configurator)
// -------------------------------------------------------
const getMenuById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT * FROM t_menus WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Menu not found" });

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// CREATE MENU ITEM (Configurator)
// -------------------------------------------------------
const createMenu = async (req, res, next) => {
  try {
    const {
      label, icon, image, url, order = 0,
      parent_id, module_key, is_configurator = false, is_public = false,
      is_system = false, is_deletable = true
    } = req.body;

    if (!label?.trim())
      return res.status(400).json({ success: false, message: "Menu label is required" });

    const result = await db.query(
      `INSERT INTO t_menus
         (label, icon, image, url, "order", parent_id,
          module_key, is_configurator, is_public, is_active, is_system, is_deletable,
          created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12, $12)
       RETURNING *`,
      [
        label.trim(), icon || null, image || null, url || null, parseInt(order, 10) || 0,
        parent_id || null, module_key || null, is_configurator === true, is_public === true,
        is_system === true, is_deletable !== false,
        req.user?.user_id || null,
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// UPDATE MENU ITEM (Configurator)
// -------------------------------------------------------
const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      label,
      icon,
      image,
      url,
      order,
      parent_id,
      module_key,
      is_configurator,
      is_public,
      is_active,
      is_system,
      is_deletable
    } = req.body;

    const setClauses = [];
    const values     = [];
    let idx = 1;

    if (label !== undefined)          { setClauses.push(`label = $${idx++}`);           values.push(label); }
    if (icon !== undefined)           { setClauses.push(`icon = $${idx++}`);            values.push(icon); }
    if (image !== undefined)          { setClauses.push(`image = $${idx++}`);           values.push(image || null); }
    if (url !== undefined)            { setClauses.push(`url = $${idx++}`);             values.push(url); }
    if (order !== undefined)          { setClauses.push(`"order" = $${idx++}`);           values.push(parseInt(order, 10)); }
    if (parent_id !== undefined)      { setClauses.push(`parent_id = $${idx++}`);       values.push(parent_id || null); }
    if (module_key !== undefined)     { setClauses.push(`module_key = $${idx++}`);      values.push(module_key); }
    if (is_configurator !== undefined){ setClauses.push(`is_configurator = $${idx++}`); values.push(is_configurator === true); }
    if (is_public !== undefined)      { setClauses.push(`is_public = $${idx++}`);       values.push(is_public === true); }
    if (is_active !== undefined)      { setClauses.push(`is_active = $${idx++}`);       values.push(is_active === true || is_active === "true" || is_active === 1); }
    if (is_system !== undefined)      { setClauses.push(`is_system = $${idx++}`);       values.push(is_system === true); }
    if (is_deletable !== undefined)   { setClauses.push(`is_deletable = $${idx++}`);    values.push(is_deletable === true); }

    if (setClauses.length === 0)
      return res.status(400).json({ success: false, message: "No fields to update" });

    setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(req.user?.user_id || null);
    values.push(id);

    const result = await db.query(
      `UPDATE t_menus SET ${setClauses.join(", ")}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Menu not found" });

    // If menu was deactivated, cascade deactivate all child menus and descendants
    if (is_active !== undefined) {
      const boolActive = is_active === true || is_active === "true" || is_active === 1;
      if (!boolActive) {
        await db.query(
          `WITH RECURSIVE descendants AS (
             SELECT id FROM t_menus WHERE parent_id = $1 AND deleted_at IS NULL
             UNION ALL
             SELECT m.id FROM t_menus m
             INNER JOIN descendants d ON m.parent_id = d.id
             WHERE m.deleted_at IS NULL
           )
           UPDATE t_menus
           SET is_active = FALSE, updated_by = $2, updated_at = NOW()
           WHERE id IN (SELECT id FROM descendants)`,
          [id, req.user?.user_id || null]
        );
      }
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// BULK REORDER (Configurator — drag-drop saves new order)
// body: { items: [ { id: 1, order: 1, parent_id: null }, ... ] }
// -------------------------------------------------------
const reorderMenus = async (req, res, next) => {
  try {
    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: "items array is required" });

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      for (const item of items) {
        await client.query(
          `UPDATE t_menus
           SET "order" = $1, parent_id = $2,
               updated_by = $3, updated_at = NOW()
           WHERE id = $4 AND deleted_at IS NULL`,
          [parseInt(item.order, 10) || 0, item.parent_id || null, req.user?.user_id || null, item.id]
        );
      }

      await client.query("COMMIT");
      return res.status(200).json({ success: true, message: "Menu order updated" });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// SOFT DELETE (Configurator)
// Protected system menus and core forms cannot be deleted
// -------------------------------------------------------
const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if this menu or any of its children is marked as system / not deletable
    const checkRes = await db.query(
      `WITH RECURSIVE children AS (
         SELECT id, label, is_system, is_deletable, module_key, url FROM t_menus WHERE id = $1
         UNION ALL
         SELECT m.id, m.label, m.is_system, m.is_deletable, m.module_key, m.url FROM t_menus m
         INNER JOIN children c ON m.parent_id = c.id
       )
       SELECT * FROM children WHERE is_system = TRUE OR is_deletable = FALSE`,
      [id]
    );

    if (checkRes.rows.length > 0) {
      const protectedItem = checkRes.rows[0];
      return res.status(400).json({
        success: false,
        message: `"${protectedItem.label}" is a core system menu and cannot be deleted. You can set it to Inactive instead.`,
      });
    }

    // Also soft-delete all children
    const result = await db.query(
      `WITH RECURSIVE children AS (
         SELECT id FROM t_menus WHERE id = $1
         UNION ALL
         SELECT m.id FROM t_menus m
         INNER JOIN children c ON m.parent_id = c.id
       )
       UPDATE t_menus
       SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
       WHERE id IN (SELECT id FROM children)
         AND deleted_at IS NULL
       RETURNING id`,
      [id, req.user?.user_id || null]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Menu not found" });

    return res.status(200).json({
      success: true,
      message: `Menu and ${result.rows.length - 1} child item(s) deleted`,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// SET ROLE PERMISSIONS for a menu item (Configurator)
// body: { permissions: [ { role_id: 1, can_view: true }, ... ] }
// -------------------------------------------------------
const setMenuRolePerms = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions = [] } = req.body;

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      for (const perm of permissions) {
        await client.query(
          `INSERT INTO t_menu_role_perms (menu_id, role_id, can_view, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $4)
           ON CONFLICT (menu_id, role_id)
           DO UPDATE SET can_view = $3, updated_by = $4, updated_at = NOW()`,
          [id, perm.role_id, perm.can_view !== false, req.user?.user_id || null]
        );
      }

      await client.query("COMMIT");
      return res.status(200).json({ success: true, message: "Menu role permissions updated" });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicMenuTree,
  getMenuTree,
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  reorderMenus,
  deleteMenu,
  setMenuRolePerms,
};
