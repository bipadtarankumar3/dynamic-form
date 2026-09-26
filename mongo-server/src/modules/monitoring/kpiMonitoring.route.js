const express = require('express');
const router = express.Router();
const ctrl = require('./kpiMonitoring.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');

router.use(authenticateToken);

// 1. Fetch all KPI rows for a project
router.get('/kpi-rows', ctrl.getProjectKpiRows);

// 2. Fetch saved KPI tracking rows for a monitoring record
router.get('/kpi-tracking', ctrl.getMonitoringKpiTracking);

// 3. Save / Upsert actual KPI achievement values
router.post('/kpi-tracking/save', ctrl.saveMonitoringKpiTracking);

module.exports = router;
