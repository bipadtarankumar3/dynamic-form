// mongo-server/src/modules/master-builder/masterBuilder.route.js
const express = require('express');
const router = express.Router();
const masterBuilderController = require('./masterBuilder.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware.validateToken);

// Master Schema routes
router.get('/', masterBuilderController.listSchemas);
router.get('/schemas', masterBuilderController.listSchemas);
router.get('/schemas/:slug', masterBuilderController.getSchema);
router.post('/schemas', masterBuilderController.saveSchema);
router.put('/schemas/:slug', masterBuilderController.saveSchema);
router.delete('/schemas/:slug', masterBuilderController.deleteSchema);

// Master Data routes
router.get('/data/:master_slug', masterBuilderController.listData);
router.get('/:master_slug/data', masterBuilderController.listData);
router.post('/:master_slug/data', masterBuilderController.addData);
router.put('/:master_slug/data/:id', masterBuilderController.editData);
router.delete('/:master_slug/data/:id', masterBuilderController.deleteData);

// Detail of a master
router.get('/:slug', masterBuilderController.getSchema);

module.exports = router;
