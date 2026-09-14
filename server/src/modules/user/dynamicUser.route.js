const express = require("express");
const dynamicUserController = require("./controller/dynamicUser.controller");
const sanitizeMiddleware = require("../../middlewares/sanitize.middleware");
const secureUpload = require("../../middlewares/secureUpload.middleware");
const router = express.Router();
const multer = require("multer")();

router.post(
  "/add",
  multer.any(),
  sanitizeMiddleware,
  secureUpload,
  dynamicUserController.add,
);
router.post(
  "/edit",
  multer.any(),
  sanitizeMiddleware,
  secureUpload,
  dynamicUserController.edit,
);
router.post("/active_inactive", dynamicUserController.activeInactive);
router.post("/login-as", dynamicUserController.loginAs);
router.post("/reset-password", dynamicUserController.userResetPassword);
router.post("/change-password", dynamicUserController.changePassword);
module.exports = router;
