// mongo-server/src/modules/auth/auth.route.js
const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// Public endpoints
router.post("/login", authController.login);
router.post("/forget-password", authController.forgetPassword);
router.post("/logout", authController.logout);

// Authenticated endpoints
router.get("/profile", authMiddleware.validateToken, authController.getProfile);
router.put("/profile", authMiddleware.validateToken, authController.updateProfile);
router.post("/change-password", authMiddleware.validateToken, authController.changePassword);

module.exports = router;
