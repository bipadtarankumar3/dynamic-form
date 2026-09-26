// server/src/modules/database-view/databaseView.route.js
// ============================================================
// PostgreSQL Database View Builder — API Router
// Configurator API endpoints for database view metadata,
// relationship discovery, SQL generation, view DDL execution, and preview.
// ============================================================

const express = require("express");
const router = express.Router();
const controller = require("./controllers/databaseViewController");
const authMiddleware = require("../../middlewares/auth.middleware");

// Optional middleware protection (falls through if auth token is present)
const authenticate = (req, res, next) => {
  if (req.headers.authorization) {
    return authMiddleware.validateToken(req, res, next);
  }
  next();
};

router.use(authenticate);

// Schema Metadata Discovery
router.get("/schema/tables", controller.getTables);
router.get("/schema/tables/:tableName", controller.getTableRelationships);
router.get("/dependencies/:viewName", controller.getDependencies);

// SQL Engine & Validation
router.post("/generate-sql", controller.generateSQL);
router.post("/test-sql", controller.testSQL);

// View Management CRUD & DDL Execution
router.get("/", controller.listViews);
router.get("/:id", controller.getViewDetails);
router.get("/:id/pre-delete-check", controller.preDeleteCheck);
router.post("/", controller.createView);
router.put("/:id", controller.updateView);
router.post("/:id/refresh", controller.refreshView);
router.delete("/:id", controller.dropView);

// Preview Data
router.get("/:id/preview", controller.getPreviewData);

module.exports = router;
