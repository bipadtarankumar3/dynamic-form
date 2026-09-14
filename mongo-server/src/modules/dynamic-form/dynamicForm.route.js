// mongo-server/src/modules/dynamic-form/dynamicForm.route.js
const express = require("express");
const multer = require("multer")();
const controller = require("./dynamicForm.controller");
const { checkPermission } = require("../../middlewares/checkPermission.middleware");
const sanitize = require("../../middlewares/sanitize.middleware");

const router = express.Router();

router.post("/add",               multer.any(), sanitize, checkPermission(undefined, "add"),  controller.add);
router.post("/edit",              multer.any(), sanitize, checkPermission(undefined, "edit"), controller.edit);
router.post("/general-list-view", checkPermission(undefined, "list"),                          controller.generalListView);
router.post("/view-list-view",    checkPermission(undefined, "list"),                          controller.generalListView);
router.post("/details",           checkPermission(undefined, "edit"),                          controller.details);
router.post("/view",              controller.viewById);
router.post("/schema-details",    controller.schemaDetails);
router.post("/master-details",    controller.masterDetails);
router.post("/active_inactive",   controller.activeInactive);
router.post("/delete",            checkPermission(undefined, "delete"),                        controller.deleteRecord);

module.exports = router;
