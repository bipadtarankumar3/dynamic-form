const express = require("express");
const router = express.Router();
const pivotController = require("./controllers/pivot.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// All pivot routes require a valid JWT token
router.use(authMiddleware.validateToken);

router.get("/tables",                              pivotController.getTables);
router.get("/columns/:tableName",                  pivotController.getColumns);
router.get("/values/:tableName/:columnName",       pivotController.getFieldValues);
router.post("/filter-options",                      pivotController.getFilterFieldOptions);
router.post("/execute",                            pivotController.executePivot);
router.post("/export-excel",                       pivotController.exportExcel);
router.post("/save-report",                        pivotController.saveReport);
router.get("/saved-reports",                       pivotController.getSavedReports);
router.get("/all-reports",                         pivotController.getAllReports);
router.put("/report/:id/status",                   pivotController.toggleReportStatus);
router.delete("/report/:id",                       pivotController.deleteReport);
router.put("/reports/reorder",                     pivotController.reorderReports);

module.exports = router;
