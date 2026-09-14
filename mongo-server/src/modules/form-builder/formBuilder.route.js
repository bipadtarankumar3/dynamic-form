// mongo-server/src/modules/form-builder/formBuilder.route.js
const express = require("express");
const controller = require("./formBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

// 1. Static sub-resource routes (MUST be registered before /:id)
router.get("/all-tables", controller.getAllDatabaseTables);
router.get("/masters", controller.getMasterForms);
router.get("/table-columns/:tableName", controller.getTableColumnsForFormBuilder);
router.post("/sync-parent-foreign-key", controller.syncParentForeignKey);

// 2. Pre-delete check
router.get("/:id/pre-delete-check", controller.preDeleteCheck);

// 3. Schema Collection CRUD
router.get("/", controller.listSchemas);
router.get("/:id", controller.getSchema);
router.post("/", controller.saveSchema);
router.put("/:id", controller.saveSchema);
router.delete("/:id", controller.deleteSchema);

module.exports = router;
