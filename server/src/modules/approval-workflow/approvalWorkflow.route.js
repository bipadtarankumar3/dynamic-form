// server/src/modules/approval-workflow/approvalWorkflow.route.js
// ============================================================
// Workflow routes:
//   /api/v1/configurator/workflows  — Configurator only (CRUD)
//   /api/v1/workflows               — All authenticated users
// ============================================================

const express = require("express");
const ctrl    = require("./controller/workflow.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

// -------------------------------------------------------
// SCHEMA MANAGEMENT — Configurator only
// -------------------------------------------------------
const configRouter = express.Router();
configRouter.use(authMiddleware.validateToken, requireConfigurator);

configRouter.post("/",               ctrl.createWorkflow);
configRouter.get("/",                ctrl.listWorkflows);
configRouter.get("/:id",             ctrl.getWorkflowById);
configRouter.put("/:id",             ctrl.updateWorkflow);
configRouter.delete("/:id",          ctrl.deleteWorkflow);

// Matrix Rules direct management
configRouter.post("/:id/rules",          ctrl.addWorkflowRule);
configRouter.put("/:id/rules/:ruleId",   ctrl.updateWorkflowRule);
configRouter.delete("/:id/rules/:ruleId",ctrl.deleteWorkflowRule);

// -------------------------------------------------------
// WORKFLOW OPERATIONS — All authenticated users
// -------------------------------------------------------
const userRouter = express.Router();
userRouter.use(authMiddleware.validateToken);

userRouter.post("/initiate", ctrl.initiateRecordWorkflow);
userRouter.post("/view",     ctrl.viewWorkflowState);
userRouter.post("/action",   ctrl.performWorkflowAction);

module.exports = { configRouter, userRouter };

