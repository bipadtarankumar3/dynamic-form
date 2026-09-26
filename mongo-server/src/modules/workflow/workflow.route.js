// mongo-server/src/modules/workflow/workflow.route.js
const express = require("express");
const router = express.Router();
const workflowController = require("./workflow.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

// Definitions
router.get("/definitions", workflowController.listDefs);
router.get("/definitions/:slug", workflowController.getDef);
router.post("/definitions", workflowController.saveDef);
router.put("/definitions/:slug", workflowController.saveDef);
router.delete("/definitions/:slug", workflowController.deleteDef);

// Instances
router.get("/instances", workflowController.listInstances);
router.get("/instances/:id", workflowController.getInstance);
router.post("/initiate", workflowController.initiateWorkflow);
router.post("/action", workflowController.actionStep);

module.exports = router;
