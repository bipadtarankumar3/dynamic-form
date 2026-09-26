// mongo-server/src/modules/common/fy.route.js
const express = require("express");
const router = express.Router();
const commonController = require("./common.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.get("/", authMiddleware.validateToken, commonController.getFinancialYears);

module.exports = router;
