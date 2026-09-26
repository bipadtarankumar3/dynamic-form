// mongo-server/src/modules/dashboard/configuratorDashboard.route.js
const express = require('express');
const router = express.Router();
const ctrl = require('./configuratorDashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware.validateToken);

router.get('/overview', ctrl.getConfiguratorDashboardOverview);
router.get('/stats', ctrl.getConfiguratorDashboardOverview);
router.get('/', ctrl.getConfiguratorDashboardOverview);

module.exports = router;
