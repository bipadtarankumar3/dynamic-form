const express = require("express");
const controller = require("./common.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/permissions",    authMiddleware.validateToken, controller.getMyPermissions);
router.post("/delete-file",   authMiddleware.validateToken, controller.deleteFile);
router.get("/documents",      authMiddleware.validateToken, controller.getDocuments);
router.post("/slug-wise-user",authMiddleware.validateToken, controller.slugWiseUser);

module.exports = router;
