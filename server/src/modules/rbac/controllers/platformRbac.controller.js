// server/src/modules/rbac/controllers/platformRbac.controller.js
// ============================================================
// Platform RBAC, User & Role Controller using raw pg.
// Accessible by Configurator role.
// ============================================================

const db = require("../../../config/db");
const bcrypt = require("bcryptjs");
const rbacEngine = require("../../../services/rbacEngine");

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// -------------------------------------------------------
// 1. ROLE MANAGEMENT
// -------------------------------------------------------

const listRoles = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, slug, is_configurator, is_active, description, created_at
       FROM t_roles
       WHERE deleted_at IS NULL
       ORDER BY id ASC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const createRole = async (req, res, next) => {
  try {
    const { name, description, is_configurator = false } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const slug = slugify(name);

    // Check duplicate slug
    const existing = await db.query(
      `SELECT id FROM t_roles WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
      [slug]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: `Role "${name}" already exists` });
    }

    const result = await db.query(
      `INSERT INTO t_roles (name, slug, is_configurator, description, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [name.trim(), slug, is_configurator === true, description || null, req.user?.user_id]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, is_configurator, is_active } = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (name?.trim()) {
      setClauses.push(`name = $${idx++}`);
      values.push(name.trim());
      setClauses.push(`slug = $${idx++}`);
      values.push(slugify(name));
    }
    if (description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(description);
    }
    if (is_configurator !== undefined) {
      setClauses.push(`is_configurator = $${idx++}`);
      values.push(is_configurator === true);
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      values.push(is_active === true);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(req.user?.user_id);
    values.push(id);

    const result = await db.query(
      `UPDATE t_roles SET ${setClauses.join(", ")}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting configurator role
    const checkConfig = await db.query(
      `SELECT is_configurator FROM t_roles WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (checkConfig.rows.length > 0 && checkConfig.rows[0].is_configurator) {
      return res.status(400).json({ success: false, message: "Cannot delete Configurator role" });
    }

    const result = await db.query(
      `UPDATE t_roles
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING name`,
      [req.user?.user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    return res.status(200).json({ success: true, message: `Role "${result.rows[0].name}" deleted` });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// 2. PERMISSION MANAGEMENT
// -------------------------------------------------------

// Helper to sync and retrieve dynamic system modules
const syncAndFetchModules = async () => {
  const formRes = await db.query(
    `SELECT slug, title, is_master, actions FROM t_form WHERE deleted_at IS NULL ORDER BY title ASC`
  );
  const menuRes = await db.query(
    `SELECT id, label, url, parent_id, module_key FROM t_menus WHERE deleted_at IS NULL ORDER BY label ASC`
  );

  const moduleMap = new Map();

  // Static Auth & System Modules
  const staticModules = [
    { slug: "dashboard", label: "Dashboard", category: "System" },
    { slug: "users", label: "Users Management", category: "Auth" },
    { slug: "roles", label: "Roles Management", category: "Auth" },
    { slug: "permissions", label: "Permissions Management", category: "Auth" },
    { slug: "approval_path", label: "Approval Paths", category: "Auth" },
  ];

  for (const s of staticModules) {
    moduleMap.set(s.slug, s);
  }

  // Form Builder Modules
  for (const f of formRes.rows) {
    if (!f.slug) continue;
    const cleanSlug = f.slug.trim().toLowerCase();
    
    // Extract custom actions from f.actions array if present
    const customActions = [];
    if (Array.isArray(f.actions)) {
      f.actions.forEach(a => {
        if (a?.slug && !["list", "add", "edit", "delete", "export"].includes(a.slug)) {
          customActions.push({ slug: a.slug, name: a.name || a.slug });
        }
      });
    }

    if (!moduleMap.has(cleanSlug)) {
      moduleMap.set(cleanSlug, {
        slug: cleanSlug,
        label: f.title || f.slug,
        category: f.is_master ? "Master" : "Form Builder",
        customActions,
      });
    }
  }

  // Menus & Submenus
  for (const m of menuRes.rows) {
    if (!m.url) continue;
    const rawUrl = String(m.url).split("?")[0].replace(/^\/+/, "").replace(/^forms\//, "").replace(/^admin\//, "");
    if (!rawUrl || rawUrl === "#") continue;
    const parts = rawUrl.split("/");
    // slugCandidate is derived from the URL and is the stable permission key for this menu entry
    const slugCandidate = (parts[parts.length - 1] || "").trim().toLowerCase();
    // module_key is the explicitly attached form slug — used ONLY for looking up custom actions
    const targetModuleKey = (m.module_key || "").trim().toLowerCase();

    // Check if there is an attached form for this menu.
    // Prefer module_key (explicit attachment) over URL slug heuristics.
    const attachedForm = formRes.rows.find(f => {
      const fSlug = (f.slug || "").trim().toLowerCase();
      if (targetModuleKey && fSlug === targetModuleKey) return true;
      return fSlug === slugCandidate || rawUrl.toLowerCase().includes(fSlug);
    });

    const customActions = [];
    if (attachedForm && Array.isArray(attachedForm.actions)) {
      attachedForm.actions.forEach(a => {
        if (a?.slug && !["list", "add", "edit", "delete", "export"].includes(a.slug)) {
          customActions.push({ slug: a.slug, name: a.name || a.slug });
        }
      });
    }

    // Always use slugCandidate as the module slug for this menu entry
    // so that the "Rfp List [Menu]" entry keeps its own permission scope
    if (slugCandidate && !moduleMap.has(slugCandidate)) {
      moduleMap.set(slugCandidate, {
        slug: slugCandidate,
        label: m.label || slugCandidate,
        category: m.parent_id ? "Sub Menu" : "Menu",
        customActions,
      });
    } else if (slugCandidate && moduleMap.has(slugCandidate)) {
      // Already registered — merge in any new custom actions
      const existing = moduleMap.get(slugCandidate);
      if (!existing.customActions) existing.customActions = [];
      if (customActions.length > 0) {
        const existingSlugs = new Set(existing.customActions.map(ca => ca.slug));
        customActions.forEach(ca => {
          if (!existingSlugs.has(ca.slug)) {
            existing.customActions.push(ca);
          }
        });
      }
    }
  }

  const modulesList = Array.from(moduleMap.values());

  // Auto-seed permission keys into t_permissions
  const baseActions = ["list", "add", "edit", "delete", "export"];
  for (const mod of modulesList) {
    const allActions = [...baseActions, ...(mod.customActions || []).map(ca => ca.slug)];
    for (const act of allActions) {
      const key = `${mod.slug}.${act}`;
      const label = `${mod.label} - ${act.toUpperCase()}`;
      await db.query(
        `INSERT INTO t_permissions (key, label, type, module)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET label = $2, type = $3, module = $4, deleted_at = NULL`,
        [key, label, act, mod.slug]
      );
    }
  }

  return modulesList;
};

const listPermissions = async (req, res, next) => {
  try {
    const modules = await syncAndFetchModules();
    return res.status(200).json({ success: true, data: modules });
  } catch (err) {
    next(err);
  }
};

const getRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params; // roleId

    const roleCheck = await db.query(
      `SELECT is_configurator FROM t_roles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    const isConfigurator = roleCheck.rows.length > 0 && roleCheck.rows[0].is_configurator === true;

    // Get active permission keys for this role
    const permRes = await db.query(
      `SELECT p.key, p.module, p.type
       FROM t_role_permissions rp
       JOIN t_permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1 AND rp.deleted_at IS NULL AND p.deleted_at IS NULL`,
      [id]
    );

    const permSet = new Set(permRes.rows.map(r => r.key));

    const modules = await syncAndFetchModules();
    const baseActions = [
      { slug: "list", name: "List Table" },
      { slug: "view", name: "View Details" },
      { slug: "add", name: "Add Record" },
      { slug: "edit", name: "Edit Record" },
      { slug: "delete", name: "Delete Record" },
      { slug: "export", name: "Export Data" },
    ];

    const result = modules.map(mod => {
      const custom = (mod.customActions || []).map(ca => ({ slug: ca.slug, name: ca.name || ca.slug }));
      const allActions = [...baseActions];
      custom.forEach(c => {
        if (c.slug && !allActions.some(b => b.slug === c.slug)) {
          allActions.push(c);
        }
      });

      let allowedActions = [];
      if (isConfigurator) {
        allowedActions = allActions.map(a => a.slug);
      } else {
        allowedActions = allActions.filter(a => permSet.has(`${mod.slug}.${a.slug}`)).map(a => a.slug);
      }

      return {
        module_slug: mod.slug,
        label: mod.label,
        category: mod.category,
        all_actions: allActions,
        allowed_actions: allowedActions,
        can_list: isConfigurator || permSet.has(`${mod.slug}.list`),
        can_view: isConfigurator || permSet.has(`${mod.slug}.view`),
        can_add: isConfigurator || permSet.has(`${mod.slug}.add`),
        can_edit: isConfigurator || permSet.has(`${mod.slug}.edit`),
        can_delete: isConfigurator || permSet.has(`${mod.slug}.delete`),
        can_export: isConfigurator || permSet.has(`${mod.slug}.export`),
      };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const assignRolePermissions = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params; // roleId
    const { permissions = [] } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "role_id is required" });
    }

    await client.query("BEGIN");

    // Get all permission mappings for the system
    const allPermsRes = await client.query(
      `SELECT id, key, module, type FROM t_permissions WHERE deleted_at IS NULL`
    );

    const permKeyMap = new Map();
    allPermsRes.rows.forEach(p => permKeyMap.set(p.key, p.id));

    // Soft-delete existing role permissions for this role
    await client.query(
      `UPDATE t_role_permissions
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE role_id = $2 AND deleted_at IS NULL`,
      [req.user?.user_id || null, id]
    );

    for (const item of permissions) {
      const slug = item.module_slug;
      if (!slug) continue;

      let targetActions = [];
      if (Array.isArray(item.allowed_actions)) {
        targetActions = item.allowed_actions;
      } else {
        const flagMap = { list: item.can_list, add: item.can_add, edit: item.can_edit, delete: item.can_delete, export: item.can_export };
        targetActions = Object.keys(flagMap).filter(k => flagMap[k] === true);
      }

      for (const act of targetActions) {
        const permKey = `${slug}.${act}`;
        let permId = permKeyMap.get(permKey);

        if (!permId) {
          const insRes = await client.query(
            `INSERT INTO t_permissions (key, label, type, module)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (key) DO UPDATE SET deleted_at = NULL
             RETURNING id`,
            [permKey, `${slug} - ${act.toUpperCase()}`, act, slug]
          );
          permId = insRes.rows[0]?.id;
        }

        if (permId) {
          await client.query(
            `INSERT INTO t_role_permissions (role_id, permission_id, created_by, updated_by)
             VALUES ($1, $2, $3, $3)
             ON CONFLICT (role_id, permission_id)
             DO UPDATE SET deleted_at = NULL, updated_by = $3, updated_at = NOW()`,
            [id, permId, req.user?.user_id || null]
          );
        }
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({ success: true, message: "Permissions assigned successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// -------------------------------------------------------
// 3. FIELD PERMISSIONS
// -------------------------------------------------------

const getFieldPermissions = async (req, res, next) => {
  try {
    const { id } = req.params; // roleId
    const { form_slug } = req.query;

    if (!form_slug) {
      return res.status(400).json({ success: false, message: "form_slug query parameter is required" });
    }

    const fieldPermissions = await rbacEngine.getFieldPermissions(id, form_slug);
    return res.status(200).json({ success: true, data: fieldPermissions });
  } catch (err) {
    next(err);
  }
};

const setFieldPermissions = async (req, res, next) => {
  try {
    const { id } = req.params; // roleId
    const { form_slug, field_permissions = [] } = req.body;

    if (!form_slug) {
      return res.status(400).json({ success: false, message: "form_slug is required" });
    }

    await rbacEngine.setFieldPermissions(id, form_slug, field_permissions, req.user?.user_id);
    return res.status(200).json({ success: true, message: "Field level permissions updated" });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// 4. USER MANAGEMENT
// -------------------------------------------------------

const listUsers = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, page) - 1) * parseInt(limit, 10);

    let where = "u.deleted_at IS NULL";
    const params = [];
    let idx = 1;

    if (search?.trim()) {
      where += ` AND (u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.department ILIKE $${idx})`;
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const countRes = await db.query(
      `SELECT COUNT(*) AS total FROM t_users u WHERE ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(parseInt(limit, 10), offset);
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role_id,
              u.role_slug, u.employee_code, u.department,
              u.designation, u.is_active, u.last_login_at, u.created_at,
              r.name AS role_name
       FROM t_users u
       LEFT JOIN t_roles r ON r.id = u.role_id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const {
      name, email, password, mobile, role_id,
      employee_code, department, designation, is_active = true
    } = req.body;

    if (!name || !email || !password || !role_id) {
      return res.status(400).json({
        success: false,
        message: "name, email, password, and role_id are required",
      });
    }

    // Check duplicate email
    const existing = await db.query(
      `SELECT id FROM t_users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
      [email.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: `Email "${email}" is already registered` });
    }

    // Get role details
    const roleRes = await db.query(
      `SELECT slug FROM t_roles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [role_id]
    );
    if (roleRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid role_id" });
    }
    const roleSlug = roleRes.rows[0].slug;

    const hashedPassword = await bcrypt.hash(password.trim(), 12);

    const result = await db.query(
      `INSERT INTO t_users
         (name, email, password, mobile, role_id, role_slug,
          employee_code, department, designation, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING id, name, email, mobile, role_id, role_slug, employee_code, department, designation, is_active, created_at, updated_at`,
      [
        name.trim(), email.trim().toLowerCase(), hashedPassword, mobile || null,
        role_id, roleSlug, employee_code || null, department || null,
        designation || null, is_active === true, req.user?.user_id
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, email, password, mobile, role_id,
      employee_code, department, designation, is_active
    } = req.body;

    const existing = await db.query(
      `SELECT * FROM t_users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (name?.trim()) {
      setClauses.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (email?.trim()) {
      // Check duplicate email
      const emailCheck = await db.query(
        `SELECT id FROM t_users WHERE LOWER(email) = LOWER($1) AND id <> $2 AND deleted_at IS NULL LIMIT 1`,
        [email.trim().toLowerCase(), id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Email "${email}" is already in use` });
      }
      setClauses.push(`email = $${idx++}`);
      values.push(email.trim().toLowerCase());
    }
    if (password?.trim()) {
      const hashedPassword = await bcrypt.hash(password.trim(), 12);
      setClauses.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }
    if (mobile !== undefined) {
      setClauses.push(`mobile = $${idx++}`);
      values.push(mobile);
    }
    if (role_id !== undefined) {
      const roleRes = await db.query(
        `SELECT slug FROM t_roles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [role_id]
      );
      if (roleRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid role_id" });
      }
      setClauses.push(`role_id = $${idx++}`);
      values.push(role_id);
      setClauses.push(`role_slug = $${idx++}`);
      values.push(roleRes.rows[0].slug);
    }
    if (employee_code !== undefined) {
      setClauses.push(`employee_code = $${idx++}`);
      values.push(employee_code);
    }
    if (department !== undefined) {
      setClauses.push(`department = $${idx++}`);
      values.push(department);
    }
    if (designation !== undefined) {
      setClauses.push(`designation = $${idx++}`);
      values.push(designation);
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      values.push(is_active === true);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(req.user?.user_id);
    values.push(id);

    const result = await db.query(
      `UPDATE t_users SET ${setClauses.join(", ")}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id, name, email, mobile, role_id, role_slug, employee_code, department, designation, is_active, created_at, updated_at`,
      values
    );

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self deletion
    if (parseInt(id, 10) === req.user?.user_id) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    }

    const result = await db.query(
      `UPDATE t_users
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING name`,
      [req.user?.user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, message: `User "${result.rows[0].name}" deleted` });
  } catch (err) {
    next(err);
  }
};

const getMyPermissions = async (req, res, next) => {
  try {
    const { role_id, isConfigurator } = req.user || {};

    let isConfig = isConfigurator === true;
    if (role_id) {
      const roleCheck = await db.query(
        `SELECT is_configurator FROM t_roles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [role_id]
      );
      if (roleCheck.rows.length > 0 && roleCheck.rows[0].is_configurator === true) {
        isConfig = true;
      }
    }

    const modules = await syncAndFetchModules();
    const permMap = {};

    if (isConfig) {
      modules.forEach(mod => {
        permMap[mod.slug] = ["list", "add", "edit", "delete", "export"];
      });
    } else if (role_id) {
      const permRes = await db.query(
        `SELECT p.key, p.module, p.type
         FROM t_role_permissions rp
         JOIN t_permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1 AND rp.deleted_at IS NULL AND p.deleted_at IS NULL`,
        [role_id]
      );

      const modAllowedMap = new Map();
      permRes.rows.forEach(r => {
        const modSlug = r.module ? r.module.trim().toLowerCase() : (r.key ? r.key.split(".")[0] : null);
        const actType = r.type ? r.type.trim().toLowerCase() : (r.key ? r.key.split(".")[1] : null);
        if (modSlug && actType) {
          if (!modAllowedMap.has(modSlug)) modAllowedMap.set(modSlug, new Set());
          modAllowedMap.get(modSlug).add(actType);
        }
      });

      modules.forEach(mod => {
        const set = modAllowedMap.get(mod.slug) || new Set();
        permMap[mod.slug] = Array.from(set);
      });
    } else {
      modules.forEach(mod => {
        permMap[mod.slug] = [];
      });
    }

    return res.status(200).json({ success: true, data: permMap });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  getRolePermissions,
  assignRolePermissions,
  getFieldPermissions,
  setFieldPermissions,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getMyPermissions,
};
