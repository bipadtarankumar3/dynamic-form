// mongo-server/src/modules/settings/settings.route.js
const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public settings endpoints (unauthenticated)
router.get('/', settingsController.getPublicSettings);
router.get('/public', settingsController.getPublicSettings);

// Admin / Configurator endpoints
router.get('/all', authMiddleware.validateToken, settingsController.getAllSettings);
router.post('/', authMiddleware.validateToken, settingsController.saveSetting);
router.post('/bulk', authMiddleware.validateToken, settingsController.bulkSaveSettings);

module.exports = router;
