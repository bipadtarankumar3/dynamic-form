// mongo-server/src/modules/rbac/rbac.route.js
const express = require("express");
const router = express.Router();
const rbacController = require("./rbac.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

// Roles
router.get("/roles", rbacController.listRoles);
router.post("/roles", rbacController.createRole);
router.put("/roles/:id", rbacController.updateRole);
router.delete("/roles/:id", rbacController.deleteRole);
router.get("/roles/:role_id/permissions", rbacController.getRolePermissions);

// Permissions
router.get("/permissions", rbacController.listPermissions);
router.post("/permissions", rbacController.createPermission);
router.post("/assign", rbacController.assignPermissions);
router.get("/my-permissions", rbacController.getMyPermissions);

// Users
router.get("/users", rbacController.listUsers);
router.post("/users", rbacController.createUser);
router.put("/users/:id", rbacController.updateUser);
router.delete("/users/:id", rbacController.deleteUser);

module.exports = router;
