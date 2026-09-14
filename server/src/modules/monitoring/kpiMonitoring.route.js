// server/src/modules/monitoring/kpiMonitoring.route.js
// ============================================================
// KPI Monitoring Tracking Routes
// Mounted at: /api/v1/monitoring
// ============================================================

const express = require("express");
const ctrl = require("./kpiMonitoring.controller");
const { checkPermission } = require("../../middlewares/checkPermission.middleware");

const router = express.Router();

// 1. Fetch all KPI rows for a project (from t_frm_project_kpi_details + t_frm_kpi_master)
router.get("/kpi-rows", ctrl.getProjectKpiRows);

// 2. Fetch saved KPI tracking rows for a monitoring record
router.get("/kpi-tracking", ctrl.getMonitoringKpiTracking);

// 3. Save / Upsert actual KPI achievement values
router.post("/kpi-tracking/save", ctrl.saveMonitoringKpiTracking);

module.exports = router;
