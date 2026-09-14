// server/src/modules/menu/menu.controller.js
// ============================================================
// Menu Engine — Configurator manages sidebar menus in t_menus.
// Regular users fetch their role-filtered menu tree at login.
// Menus are hierarchical (parent/child), ordered, and role-controlled.
// ============================================================

const db = require("../../config/db");

const ensureMenuColumns = async () => {
  try {
    await db.query(`ALTER TABLE t_menus ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE t_menus ADD COLUMN IF NOT EXISTS image VARCHAR(500) DEFAULT NULL;`);
  } catch (err) {
    console.warn("Could not alter t_menus column:", err.message);
  }
};
ensureMenuColumns();

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
    await ensureMenuColumns();
    const result = await db.query(
      `SELECT m.id, m.parent_id, m.label, m.icon, m.image, m.url, m.order, m.module_key, m.is_public
       FROM t_menus m
       WHERE m.deleted_at IS NULL AND m.is_active = TRUE AND (m.is_public = TRUE OR m.url ILIKE '/public/%')
       ORDER BY m.parent_id NULLS FIRST, m.order ASC`
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
    await ensureMenuColumns();
    const { role_id, isConfigurator } = req.user || {};

    const result = await db.query(
      `SELECT
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
       WHERE m.deleted_at IS NULL AND m.is_active = TRUE AND m.is_configurator = FALSE AND (m.is_public IS NOT TRUE OR m.is_public = FALSE)
       ORDER BY m.parent_id NULLS FIRST, m.order ASC`
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
        if (r.module) allowedModules.add(r.module.trim().toLowerCase());
        if (r.key) {
          const parts = r.key.split(".");
          if (parts[0]) allowedModules.add(parts[0].trim().toLowerCase());
        }
      });

      // Filter flat menus: exclude public forms and deduplicate entries
      const seenSlugs = new Set();
      flat = flat.filter(m => {
        if (m.is_public === true || (m.url && String(m.url).includes("mode=form_only"))) {
          return false; // Exclude public form links from Admin sidebar
        }

        if (!m.url || m.url === "#") return true; // keep parent header containers initially

        const rawUrl = String(m.url).split("?")[0].replace(/^\/+/, "").replace(/^forms\//, "").replace(/^admin\//, "");
        const parts = rawUrl.split("/");
        const slugCandidate = (parts[parts.length - 1] || "").trim().toLowerCase();

        // Always allow dashboard
        if (slugCandidate === "dashboard") return true;

        // Check if role has access to this menu item's target slug or via explicit module_key
        // Note: module_key deliberately allows slug ≠ module_key (e.g. URL 'approval-path' vs key 'approval_path')
        const hasAccess = allowedModules.has(slugCandidate) ||
          (m.module_key && allowedModules.has(m.module_key.trim().toLowerCase()));
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
          if (r.module) adminAllowedModules.add(r.module.trim().toLowerCase());
          if (r.key) {
            const parts = r.key.split(".");
            if (parts[0]) adminAllowedModules.add(parts[0].trim().toLowerCase());
          }
        });
      }

      flat = flat.filter(m => {
        if (!m.url || m.url === "#") return true;

        const rawUrl = String(m.url).split("?")[0].replace(/^\/+/, "").replace(/^forms\//, "").replace(/^admin\//, "");
        const parts = rawUrl.split("/");
        const slugCandidate = (parts[parts.length - 1] || "").trim().toLowerCase();

        if (slugCandidate === "dashboard") return true;

        // Only show module/menu if admin explicitly has permissions for that slug or module_key
        // Note: module_key deliberately allows slug ≠ module_key (e.g. URL 'approval-path' vs key 'approval_path')
        if (m.module_key || slugCandidate) {
          const hasAccess = adminAllowedModules.has(slugCandidate) ||
            (m.module_key && adminAllowedModules.has(m.module_key.trim().toLowerCase()));
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
    await ensureMenuColumns();
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
    await ensureMenuColumns();
    const {
      label, icon, image, url, order = 0,
      parent_id, module_key, is_configurator = false, is_public = false
    } = req.body;

    if (!label?.trim())
      return res.status(400).json({ success: false, message: "Menu label is required" });

    const result = await db.query(
      `INSERT INTO t_menus
         (label, icon, image, url, "order", parent_id,
          module_key, is_configurator, is_public, is_active,
          created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $10)
       RETURNING *`,
      [
        label.trim(), icon || null, image || null, url || null, parseInt(order, 10) || 0,
        parent_id || null, module_key || null, is_configurator === true, is_public === true,
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
    await ensureMenuColumns();
    const { id } = req.params;
    const { label, icon, image, url, order, parent_id, module_key, is_configurator, is_public, is_active } = req.body;

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
    if (is_active !== undefined)      { setClauses.push(`is_active = $${idx++}`);       values.push(is_active); }

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
// -------------------------------------------------------
const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

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
