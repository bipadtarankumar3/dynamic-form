// mongo-server/src/modules/audit/auditLog.route.js
const express = require("express");
const router = express.Router();
const auditLogController = require("./auditLog.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);
router.get("/", auditLogController.listLogs);

module.exports = router;
