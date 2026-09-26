// mongo-server/src/modules/common/common.route.js
const express = require("express");
const router = express.Router();
const commonController = require("./common.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

router.get("/permissions", commonController.getMyPermissions);
router.post("/permissions", commonController.getMyPermissions);
router.post("/delete-file", commonController.deleteFile);
router.get("/documents", commonController.getDocuments);
router.post("/slug-wise-user", commonController.slugWiseUser);
router.get("/financial-years", commonController.getFinancialYears);

module.exports = router;
