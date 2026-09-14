const express = require("express");
const dynamicFormController = require("./controller/dynamicForm.controller");
const {
  checkPermission,
} = require("../../../middlewares/checkPermission.middleware");
const sanitizeMiddleware = require("../../../middlewares/sanitize.middleware");
const secureUpload = require("../../../middlewares/secureUpload.middleware");
const router = express.Router();
const multer = require("multer")();

router.post(
  "/add",
  multer.any(),
  sanitizeMiddleware, secureUpload,
  checkPermission(undefined, "add"),
  dynamicFormController.add,
);
router.post(
  "/edit",
  multer.any(),
  sanitizeMiddleware, secureUpload,
  checkPermission(undefined, "edit"),
  dynamicFormController.edit,
);
router.post(
  "/general-list-view",
  // checkPermission(undefined, "list"),
  dynamicFormController.generalListView,
);
router.post(
  "/general-export-excel",
  checkPermission(undefined, "list"),
  dynamicFormController.generalExcelExport,
);
router.post(
  "/details",
  checkPermission(undefined, "edit"),
  dynamicFormController.details,
);
router.post("/schema-details", dynamicFormController.schemaDetails);
router.post("/parent-record", dynamicFormController.parentRecord);
router.post("/master-details", dynamicFormController.masterDetails);
router.post(
  "/active_inactive",
  dynamicFormController.activeInactive,
);
router.post(
  "/view",
  dynamicFormController.viewById,
);

module.exports = router;
