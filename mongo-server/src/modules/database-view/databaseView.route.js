// mongo-server/src/modules/database-view/databaseView.route.js
const express = require("express");
const router = express.Router();
const databaseViewController = require("./databaseView.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

// Wizard endpoints
router.get("/schema/tables", databaseViewController.getTables);
router.get("/schema/tables/:tableName", databaseViewController.getTableRelationships);
router.get("/dependencies/:viewName", databaseViewController.getDependencies);
router.post("/generate-sql", databaseViewController.generateSQL);
router.post("/test-sql", databaseViewController.testSQL);
router.post("/preview-pipeline", databaseViewController.previewPipeline);
router.get("/pre-delete-check/:id", databaseViewController.preDeleteCheck);

// CRUD
router.get("/", databaseViewController.listViews);
router.get("/:slug", databaseViewController.getView);
router.post("/", databaseViewController.saveView);
router.put("/:slug", databaseViewController.saveView);
router.delete("/:slug", databaseViewController.deleteView);
router.get("/:slug/preview", databaseViewController.previewView);
router.post("/:slug/refresh", databaseViewController.refreshView);
router.post("/:slug/query", databaseViewController.queryView);
router.get("/:slug/query", databaseViewController.queryView);

module.exports = router;
