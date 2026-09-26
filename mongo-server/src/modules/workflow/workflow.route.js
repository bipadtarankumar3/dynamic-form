// mongo-server/src/modules/workflow/workflow.route.js
const express = require("express");
const router = express.Router();
const workflowController = require("./workflow.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

// ── Approval Workflow Builder helpers ─────────────────────────
router.get("/module-list", workflowController.moduleList);
router.get("/list", workflowController.listWorkflows);
router.post("/create", workflowController.createWorkflow);

// ── Definitions (Legacy and REST aliases) ─────────────────────
router.get("/definitions", workflowController.listDefs);
router.get("/definitions/:slug", workflowController.getDef);
router.post("/definitions", workflowController.createWorkflow);
router.put("/definitions/:slug", workflowController.updateWorkflow);
router.delete("/definitions/:slug", workflowController.deleteWorkflow);

// ── Instances ─────────────────────────────────────────────────
router.get("/instances", workflowController.listInstances);
router.get("/instances/:id", workflowController.getInstance);

// ── Approval Path Configurator Root REST endpoints ────────────
router.get("/", workflowController.listWorkflows);
router.post("/", workflowController.createWorkflow);
router.get("/:id", workflowController.getWorkflow);
router.put("/:id", workflowController.updateWorkflow);
router.delete("/:id", workflowController.deleteWorkflow);

module.exports = router;
