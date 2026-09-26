const express = require("express");
const router = express.Router();
const auditLogController = require("./auditLog.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

router.get("/", auditLogController.listLogs);
router.post("/dt", auditLogController.auditLogDt);
router.post("/details-by-id", auditLogController.getAuditDetailsById);
router.post("/get-all-table-name", auditLogController.getAuditTableNames);
router.post("/get-all-user", auditLogController.getAllUsers);

module.exports = router;

