// mongo-server/src/modules/workflow/workflow.route.js
const express = require("express");
const controller = require("./workflow.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

// Workflow Definitions
router.get("/definitions", controller.listDefs);
router.get("/definitions/:slug", controller.getDef);
router.post("/definitions", controller.saveDef);
router.put("/definitions/:slug", controller.saveDef);
router.delete("/definitions/:slug", controller.deleteDef);

// Workflow Instances
router.get("/instances", controller.listInstances);
router.get("/instances/:id", controller.getInstance);
router.post("/initiate", controller.initiateWorkflow);
router.post("/action", controller.actionStep);

module.exports = router;
