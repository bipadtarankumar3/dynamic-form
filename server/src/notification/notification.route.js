// server/src/notification/notification.route.js
// ============================================================
// Notification routes:
//   /api/v1/configurator/notification-cfgs — Configurator CRUD
//   /api/v1/notifications                   — All authenticated users
// ============================================================

const express = require("express");
const ctrl    = require("./controllers/notification.controller");
const authMiddleware = require("../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator) {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

// 1. Configurator notification configs management
const configRouter = express.Router();
configRouter.use(authMiddleware.validateToken, requireConfigurator);

configRouter.get("/",       ctrl.listConfigs);
configRouter.post("/",      ctrl.createConfig);
configRouter.put("/:id",    ctrl.updateConfig);
configRouter.delete("/:id", ctrl.deleteConfig);

// 2. User dynamic notifications list / read / delete
const userRouter = express.Router();
userRouter.use(authMiddleware.validateToken);

userRouter.get("/",         ctrl.listUserNotifications);
userRouter.get("/list",     ctrl.listUserNotifications);
userRouter.post("/list",    ctrl.listUserNotifications);
userRouter.put("/read",     ctrl.markAsRead);
userRouter.post("/read",    ctrl.markAsRead);
userRouter.put("/delete",   ctrl.deleteUserNotifications);
userRouter.post("/delete",  ctrl.deleteUserNotifications);

module.exports = { configRouter, userRouter };

