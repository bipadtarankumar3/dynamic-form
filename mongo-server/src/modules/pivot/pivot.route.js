// mongo-server/src/modules/pivot/pivot.route.js
const express = require("express");
const controller = require("./pivot.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/tables",                              authMiddleware.validateToken, controller.getTables);
router.get("/columns/:tableName",                  authMiddleware.validateToken, controller.getColumns);
router.get("/values/:tableName/:columnName",       authMiddleware.validateToken, controller.getFieldValues);
router.post("/filter-options",                      authMiddleware.validateToken, controller.getFilterFieldOptions);
router.post("/execute",                            authMiddleware.validateToken, controller.executePivot);
router.post("/export-excel",                       authMiddleware.validateToken, controller.exportExcel);
router.post("/save-report",                        authMiddleware.validateToken, controller.saveReport);
router.get("/saved-reports",                       authMiddleware.validateToken, controller.getSavedReports);
router.get("/all-reports",                         authMiddleware.validateToken, controller.getAllReports);
router.put("/report/:id/status",                   authMiddleware.validateToken, controller.toggleReportStatus);
router.delete("/report/:id",                       authMiddleware.validateToken, controller.deleteReport);
router.put("/reports/reorder",                     authMiddleware.validateToken, controller.reorderReports);

module.exports = router;
