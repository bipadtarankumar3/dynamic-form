// mongo-server/src/modules/pivot/pivot.route.js
const express = require("express");
const router = express.Router();
const pivotController = require("./pivot.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

router.get("/tables", pivotController.getTables);
router.get("/columns/:tableName", pivotController.getColumns);
router.get("/values/:tableName/:columnName", pivotController.getFieldValues);
router.post("/execute", pivotController.executePivot);
router.post("/export-excel", pivotController.exportExcel);

module.exports = router;
