// mongo-server/src/modules/form-approval/formApproval.route.js
const express = require("express");
const router = express.Router();
const formApprovalController = require("./formApproval.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

router.get("/status", formApprovalController.getApprovalStatus);
router.post("/submit", formApprovalController.submitForApproval);
router.post("/action", formApprovalController.performAction);

module.exports = router;
