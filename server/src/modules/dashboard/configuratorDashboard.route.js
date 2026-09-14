// server/src/modules/dashboard/configuratorDashboard.route.js
// ============================================================
// Configurator Dashboard Route — Handles overview statistics & metrics
// ============================================================

const express = require("express");
const router = express.Router();
const ctrl = require("./controllers/configuratorDashboard.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

router.use(authMiddleware.validateToken, requireConfigurator);

router.get("/overview", ctrl.getConfiguratorDashboardOverview);
router.get("/stats",    ctrl.getConfiguratorDashboardOverview);

module.exports = router;
