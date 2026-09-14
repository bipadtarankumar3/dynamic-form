// mongo-server/src/modules/audit/auditLog.route.js
const express = require("express");
const controller = require("./auditLog.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

router.get("/", controller.list);

module.exports = router;
