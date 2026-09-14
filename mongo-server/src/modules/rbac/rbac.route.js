// mongo-server/src/modules/rbac/rbac.route.js
const express = require("express");
const controller = require("./rbac.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

// Roles
router.get("/roles", controller.listRoles);
router.post("/roles", controller.createRole);
router.put("/roles/:id", controller.updateRole);
router.delete("/roles/:id", controller.deleteRole);

// Permissions
router.get("/permissions", controller.listPermissions);
router.post("/permissions", controller.createPermission);
router.post("/permissions/assign", controller.assignPermissions);
router.get("/roles/:role_id/permissions", controller.getRolePermissions);

// Users
router.get("/users", controller.listUsers);
router.post("/users", controller.createUser);
router.put("/users/:id", controller.updateUser);
router.delete("/users/:id", controller.deleteUser);

// My permissions (for current user)
router.get("/my-permissions", controller.getMyPermissions);

module.exports = router;
