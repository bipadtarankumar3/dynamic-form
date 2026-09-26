// mongo-server/src/modules/auth/auth.route.js
const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const rbacController = require("../rbac/rbac.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// Public endpoints
router.post("/login", authController.login);
router.post("/forget-password", authController.forgetPassword);
router.post("/logout", authController.logout);

// Authenticated endpoints
router.get("/profile", authMiddleware.validateToken, authController.getProfile);
router.put("/profile", authMiddleware.validateToken, authController.updateProfile);
router.post("/change-password", authMiddleware.validateToken, authController.changePassword);

// Roles, Users & Permissions endpoints under /auth and /admin/auth
router.get("/roles", authMiddleware.validateToken, rbacController.listRoles);
router.post("/roles", authMiddleware.validateToken, rbacController.createRole);
router.put("/roles/:id", authMiddleware.validateToken, rbacController.updateRole);
router.delete("/roles/:id", authMiddleware.validateToken, rbacController.deleteRole);
router.get("/roles/:role_id/permissions", authMiddleware.validateToken, rbacController.getRolePermissions);
router.put("/roles/:role_id/permissions", authMiddleware.validateToken, rbacController.assignPermissions);

router.get("/users", authMiddleware.validateToken, rbacController.listUsers);
router.post("/users", authMiddleware.validateToken, rbacController.createUser);
router.put("/users/:id", authMiddleware.validateToken, rbacController.updateUser);
router.delete("/users/:id", authMiddleware.validateToken, rbacController.deleteUser);

router.get("/permissions", authMiddleware.validateToken, rbacController.listPermissions);
router.post("/permissions", authMiddleware.validateToken, rbacController.createPermission);
router.get("/my-permissions", authMiddleware.validateToken, rbacController.getMyPermissions);

module.exports = router;
