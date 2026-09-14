// server/src/modules/rbac/rbac.route.js
// ============================================================
// RBAC routes:
//   /api/v1/configurator/rbac  — Configurator only (Roles, Users, Permissions CRUD)
//   /api/v1/admin/auth         — Admin accessible Auth management pages
// ============================================================

const express = require("express");
const ctrl    = require("./controllers/platformRbac.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

const configRouter = express.Router();
configRouter.use(authMiddleware.validateToken, requireConfigurator);

// Roles CRUD
configRouter.get("/roles",          ctrl.listRoles);
configRouter.post("/roles",         ctrl.createRole);
configRouter.put("/roles/:id",      ctrl.updateRole);
configRouter.delete("/roles/:id",   ctrl.deleteRole);

// Permissions List
configRouter.get("/permissions",    ctrl.listPermissions);

// Role -> Permission Assignments
configRouter.get("/roles/:id/permissions",   ctrl.getRolePermissions);
configRouter.put("/roles/:id/permissions",   ctrl.assignRolePermissions);

// Field-level permissions
configRouter.get("/roles/:id/field-permissions", ctrl.getFieldPermissions);
configRouter.put("/roles/:id/field-permissions", ctrl.setFieldPermissions);

// Users CRUD
configRouter.get("/users",          ctrl.listUsers);
configRouter.post("/users",         ctrl.createUser);
configRouter.put("/users/:id",      ctrl.updateUser);
configRouter.delete("/users/:id",   ctrl.deleteUser);

const { checkPermission } = require("../../middlewares/checkPermission.middleware");

// -------------------------------------------------------
// Admin Auth Router — requires explicit permissions for roles, users, and permissions
// Mounted at /api/v1/admin/auth
// -------------------------------------------------------
const adminRouter = express.Router();
adminRouter.use(authMiddleware.validateToken);

// Roles CRUD
adminRouter.get("/roles",          checkPermission("roles", "list"), ctrl.listRoles);
adminRouter.post("/roles",         checkPermission("roles", "add"), ctrl.createRole);
adminRouter.put("/roles/:id",      checkPermission("roles", "edit"), ctrl.updateRole);
adminRouter.delete("/roles/:id",   checkPermission("roles", "delete"), ctrl.deleteRole);

// Permissions
adminRouter.get("/permissions",    checkPermission("permissions", "list"), ctrl.listPermissions);
adminRouter.get("/my-permissions", ctrl.getMyPermissions);
adminRouter.get("/roles/:id/permissions", checkPermission("permissions", "list"), ctrl.getRolePermissions);
adminRouter.put("/roles/:id/permissions", checkPermission("permissions", "edit"), ctrl.assignRolePermissions);

// Users CRUD
adminRouter.get("/users",          checkPermission("users", "list"), ctrl.listUsers);
adminRouter.post("/users",         checkPermission("users", "add"), ctrl.createUser);
adminRouter.put("/users/:id",      checkPermission("users", "edit"), ctrl.updateUser);
adminRouter.delete("/users/:id",   checkPermission("users", "delete"), ctrl.deleteUser);

// Active / Inactive toggle
adminRouter.patch("/users/:id/toggle-active", async (req, res, next) => {
  try {
    const db = require("../../config/db");
    const { id } = req.params;
    const result = await db.query(
      `UPDATE t_users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = { configRouter, adminRouter };


