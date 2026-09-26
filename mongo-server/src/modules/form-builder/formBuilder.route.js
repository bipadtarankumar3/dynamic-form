// mongo-server/src/modules/form-builder/formBuilder.route.js
const express = require('express');
const router = express.Router();
const formBuilderController = require('./formBuilder.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware.validateToken);

// Utilities & Dropdowns for form editor
router.get('/all-tables', formBuilderController.getAllDatabaseTables);
router.get('/database-tables', formBuilderController.getAllDatabaseTables);
router.get('/masters', formBuilderController.getMasterForms);
router.get('/master-forms', formBuilderController.getMasterForms);
router.get('/table-columns/:tableName', formBuilderController.getTableColumnsForFormBuilder);
router.post('/sync-parent-foreign-key', formBuilderController.syncParentForeignKey);
router.get('/:id/pre-delete-check', formBuilderController.preDeleteCheck);
router.get('/pre-delete-check/:id', formBuilderController.preDeleteCheck);

// Form Schema CRUD
router.get('/', formBuilderController.listSchemas);
router.get('/:id', formBuilderController.getSchema);
router.post('/', formBuilderController.saveSchema);
router.put('/:id', formBuilderController.saveSchema);
router.delete('/:id', formBuilderController.deleteSchema);

module.exports = router;

