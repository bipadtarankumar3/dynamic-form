// server/src/modules/form-approval/formApproval.route.js
const express = require("express");
const ctrl = require("./formApproval.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

// ── Read ─────────────────────────────────────────────────────
router.get("/workflow",             ctrl.getWorkflowState);    // full state: workflow + saved + instance
router.get("/users-by-role/:roleId", ctrl.getUsersByRole);     // active users for a role
router.get("/history",              ctrl.getApprovalHistory);  // full history timeline

// ── Write ─────────────────────────────────────────────────────
router.post("/save-assignments", ctrl.saveAssignments); // Stage 1: save approver picks to DB
router.post("/send",             ctrl.sendForApproval); // Stage 2: initiate + notify (reads from DB)
router.post("/resend",           ctrl.sendForApproval); // Resend after rejection (starts at Step 1)
router.post("/reopen",           ctrl.reopenWorkflow);   // Reset back to DRAFT for editing
router.post("/pull-back",        ctrl.pullBackWorkflow); // Pull back / recall step before next user acts
router.post("/action",           ctrl.performAction);   // Approve / Reject

module.exports = router;
