// server/src/modules/menu/menu.route.js
// ============================================================
// GET /api/v1/menus/tree       — All auth users (get their menu)
// GET /api/v1/configurator/menus          — Configurator: flat list
// GET /api/v1/configurator/menus/:id      — Configurator: single item
// POST /api/v1/configurator/menus         — Configurator: create
// PUT  /api/v1/configurator/menus/:id     — Configurator: update
// PUT  /api/v1/configurator/menus/reorder — Configurator: bulk reorder
// DELETE /api/v1/configurator/menus/:id   — Configurator: delete
// PUT  /api/v1/configurator/menus/:id/permissions  — Configurator: set role perms
// ============================================================

const express = require("express");
const ctrl    = require("./menu.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

// -------------------------------------------------------
// PUBLIC — get public website menu tree
// -------------------------------------------------------
const publicRouter = express.Router();
publicRouter.get("/public-tree", ctrl.getPublicMenuTree);

// -------------------------------------------------------
// USER-FACING — get role-filtered menu tree
// -------------------------------------------------------
const userRouter = express.Router();
userRouter.use(authMiddleware.validateToken);
userRouter.get("/tree", ctrl.getMenuTree);

// -------------------------------------------------------
// CONFIGURATOR — full menu management
// -------------------------------------------------------
const configRouter = express.Router();
configRouter.use(authMiddleware.validateToken, requireConfigurator);

configRouter.get("/",                   ctrl.getAllMenus);
configRouter.get("/:id",                ctrl.getMenuById);
configRouter.post("/",                  ctrl.createMenu);
configRouter.put("/reorder",            ctrl.reorderMenus);
configRouter.put("/:id",                ctrl.updateMenu);
configRouter.delete("/:id",             ctrl.deleteMenu);
configRouter.put("/:id/permissions",    ctrl.setMenuRolePerms);

module.exports = { userRouter, configRouter, publicRouter };
