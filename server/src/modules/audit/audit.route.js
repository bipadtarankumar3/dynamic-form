// server/src/modules/audit/audit.route.js
const express = require("express");
const ctrl = require("./controllers/audit.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { requirePermission } = require("../../middlewares/rbac.middleware");

const router = express.Router();

router.use(authMiddleware.validateToken);

router.post("/dt", requirePermission("audit.list"), ctrl.auditLogDt);
router.post("/details-by-id", ctrl.getAuditDetailsById);
router.post("/get-all-table-name", ctrl.getAllTableName);
router.post("/get-all-user", ctrl.getAllUser);

module.exports = router;

