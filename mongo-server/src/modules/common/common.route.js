// mongo-server/src/modules/common/common.route.js
const express = require("express");
const controller = require("./common.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/permissions", authMiddleware.validateToken, controller.getMyPermissions);

module.exports = router;
