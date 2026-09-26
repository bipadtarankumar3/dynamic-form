// mongo-server/src/modules/form-approval/formApproval.route.js
const express = require("express");
const router = express.Router();
const formApprovalController = require("./formApproval.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

// ── Read ─────────────────────────────────────────────────────
router.get("/workflow", formApprovalController.getWorkflowState);
router.get("/status", formApprovalController.getWorkflowState);
router.get("/users-by-role/:roleId", formApprovalController.getUsersByRole);
router.get("/history", formApprovalController.getApprovalHistory);

// ── Write ─────────────────────────────────────────────────────
router.post("/save-assignments", formApprovalController.saveAssignments);
router.post("/send", formApprovalController.sendForApproval);
router.post("/resend", formApprovalController.sendForApproval);
router.post("/submit", formApprovalController.sendForApproval);
router.post("/reopen", formApprovalController.reopenWorkflow);
router.post("/pull-back", formApprovalController.pullBackWorkflow);
router.post("/action", formApprovalController.performAction);

module.exports = router;
