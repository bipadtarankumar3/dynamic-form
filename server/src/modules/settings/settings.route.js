// server/src/modules/settings/settings.route.js
// ============================================================
// Routes for managing site settings (t_settings table)
// ============================================================

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ctrl = require("./settings.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../../uploads/logo");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp|ico/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png, gif, svg, webp, ico) are allowed"));
    }
  }
});

const settingsPublicRouter = express.Router();
settingsPublicRouter.get("/", ctrl.getSettings);

const settingsConfiguratorRouter = express.Router();
settingsConfiguratorRouter.use(authMiddleware.validateToken, requireConfigurator);
settingsConfiguratorRouter.put("/", upload.fields([
  { name: "site_logo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
  { name: "login_bg_image", maxCount: 1 },
  { name: "login_left_image", maxCount: 1 }
]), ctrl.updateSettings);
settingsConfiguratorRouter.post("/test-email", ctrl.testEmail);

module.exports = { settingsPublicRouter, settingsConfiguratorRouter };
