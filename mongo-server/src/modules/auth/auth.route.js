// mongo-server/src/modules/auth/auth.route.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("./auth.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: "Too many login attempts, try again later" } });
const forgetPwdLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { success: false, message: "Too many requests, try again in an hour" } });

router.post("/login", loginLimiter, authController.login);
router.post("/forget-password", forgetPwdLimiter, authController.forgetPassword);
router.post("/logout", authMiddleware.validateToken, authController.logout);
router.get("/profile", authMiddleware.validateToken, authController.getProfile);
router.put("/profile", authMiddleware.validateToken, authController.updateProfile);
router.post("/change-password", authMiddleware.validateToken, authController.changePassword);

module.exports = router;
