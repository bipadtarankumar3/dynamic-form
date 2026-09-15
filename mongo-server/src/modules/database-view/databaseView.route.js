// mongo-server/src/modules/database-view/databaseView.route.js
const express = require("express");
const controller = require("./databaseView.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

// ── Schema Discovery (wizard step 1 & 2) ─────────────────────────────────────
router.get("/schema/tables",           controller.getTables);
router.get("/schema/tables/:tableName", controller.getTableRelationships);
router.get("/dependencies/:viewName",  controller.getDependencies);

// ── SQL / Pipeline Generation & Validation ───────────────────────────────────
router.post("/generate-sql",     controller.generateSQL);
router.post("/test-sql",         controller.testSQL);
router.post("/preview-pipeline", controller.previewPipeline);

// ── View CRUD & Management ────────────────────────────────────────────────────
router.get("/",                         controller.listViews);
router.get("/:id/pre-delete-check",     controller.preDeleteCheck);
router.get("/:id/preview",              controller.queryView);       // preview data
router.get("/:id",                      controller.getView);
router.post("/",                        controller.saveView);
router.post("/auto-generate",           controller.autoGenerateView);
router.post("/:id/refresh",             controller.refreshView);
router.put("/:id",                      controller.saveView);        // update reuses saveView (upsert)
router.delete("/:id",                   controller.deleteView);

module.exports = router;

