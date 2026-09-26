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
router.post("/filter-options", pivotController.getFilterOptions);

// Reports / Widgets
router.get("/all-reports", pivotController.getAllReports);
router.get("/saved-reports", pivotController.getSavedReports);
router.post("/save-report", pivotController.saveReport);
router.put("/report/:id/status", pivotController.toggleReportStatus);
router.delete("/report/:id", pivotController.deleteReport);
router.put("/reports/reorder", pivotController.reorderReports);

module.exports = router;

