// server/src/modules/dynamic-report/dynamicReport.route.js
// ============================================================
// Report Builder routes:
//   /api/v1/configurator/report-definitions — Configurator CRUD
//   /api/v1/reports                         — All authenticated users
//   /api/v1/admin/dynamic-report            — Legacy endpoints
// ============================================================

const express = require("express");
const legacyCtrl = require("./controllers/dynamicReport.controller");
const builderCtrl = require("./controllers/dynamicReportBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator) {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

// 1. Configurator schema / report builder
const configRouter = express.Router();
configRouter.use(authMiddleware.validateToken, requireConfigurator);

configRouter.post("/",      builderCtrl.createReport);
configRouter.put("/:id",    builderCtrl.updateReport);
configRouter.delete("/:id", builderCtrl.deleteReport);

// 2. Report execution and export for users
const userRouter = express.Router();
userRouter.use(authMiddleware.validateToken);

userRouter.get("/",             builderCtrl.listReports);
userRouter.get("/:id",          builderCtrl.executeReport);
userRouter.get("/:id/export",   builderCtrl.exportExcel);

// 3. Legacy router (kept for backward compatibility during client migration)
const legacyRouter = express.Router();

legacyRouter.get("/views",       legacyCtrl.getViews);
legacyRouter.get("/metadata",    legacyCtrl.getMetadata);
legacyRouter.post("/execute",    legacyCtrl.executeReport);
legacyRouter.get("/saved",       legacyCtrl.getSavedQueries);
legacyRouter.post("/save",       legacyCtrl.saveQuery);

module.exports = { configRouter, userRouter, legacyRouter };

