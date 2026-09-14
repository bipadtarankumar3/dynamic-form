const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authController = require("./controller/auth.controller");
const { loginLimiter } = require("../../rate-limit/login");
const { forgetPasswordLimiter } = require("../../rate-limit/forgetPasswordRL");
const authMiddleware = require("../../middlewares/auth.middleware");

// Multer memory storage setup for profile picture / avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp, svg) are allowed for profile picture"));
    }
  },
});

const router = express.Router();

router.post("/login", loginLimiter, authController.login);
router.post("/forget-password", forgetPasswordLimiter, authController.forgetPassword);
router.post("/logout", authMiddleware.validateToken, authController.logout);
router.get("/profile", authMiddleware.validateToken, authController.getProfile);
router.put("/profile", authMiddleware.validateToken, upload.single("profile_pic"), authController.updateProfile);
router.post("/change-password", authMiddleware.validateToken, authController.changePassword);
router.post("/ngo/change-password", authMiddleware.validateToken, authController.ngoChangePassword);

// NGO Registration & Public Onboarding Endpoints
router.post("/ngo/register", authController.registerNgo);
router.post("/ngo/verify-otp", authController.verifyNgoOtp);
router.post("/ngo/resend-otp", authController.resendNgoOtp);
router.post("/ngo/onboarding", authController.submitNgoOnboarding);

module.exports = router;

