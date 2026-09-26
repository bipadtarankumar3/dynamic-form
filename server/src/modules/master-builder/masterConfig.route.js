// server/src/modules/master-builder/masterConfig.route.js
// ============================================================
// Configurator Routes for t_master_configs management
// ============================================================

const express = require("express");
const ctrl = require("./masterConfig.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

const configRouter = express.Router();
configRouter.use(authMiddleware.validateToken, requireConfigurator);

configRouter.get("/", ctrl.getAllMasterConfigs);
configRouter.get("/tables", ctrl.getDatabaseTables);
configRouter.get("/tables/:tableName/columns", ctrl.getTableColumns);
configRouter.get("/:id", ctrl.getMasterConfigById);
configRouter.post("/", ctrl.createMasterConfig);
configRouter.put("/:id", ctrl.updateMasterConfig);
configRouter.delete("/:id", ctrl.deleteMasterConfig);

module.exports = { configRouter };
