const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");

const uploadsDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueName = `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
const controller = require("./dynamicForm.controller");
const { checkPermission } = require("../../middlewares/checkPermission.middleware");
const sanitize = require("../../middlewares/sanitize.middleware");

const router = express.Router();

router.post("/add",               upload.any(), sanitize, checkPermission(undefined, "add"),  controller.add);
router.post("/edit",              upload.any(), sanitize, checkPermission(undefined, "edit"), controller.edit);
router.post("/general-list-view", checkPermission(undefined, "list"),                          controller.generalListView);
router.post("/view-list-view",    checkPermission(undefined, "list"),                          controller.generalListView);
router.post("/details",           checkPermission(undefined, "edit"),                          controller.details);
router.post("/view",              controller.viewById);
router.post("/schema-details",    controller.schemaDetails);
router.post("/master-details",    controller.masterDetails);
router.post("/active_inactive",   controller.activeInactive);
router.post("/delete",            checkPermission(undefined, "delete"),                        controller.deleteRecord);

module.exports = router;
