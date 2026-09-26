// mongo-server/src/modules/dashboard/dashboardBuilder.route.js
const express = require("express");
const router = express.Router();
const dashboardBuilderController = require("./dashboardBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

// Dashboards List
router.get("/", dashboardBuilderController.listDashboards);
router.get("/list", dashboardBuilderController.listDashboards);

// Dashboards Detail
router.get("/detail/:id", dashboardBuilderController.getDashboard);
router.get("/:id", dashboardBuilderController.getDashboard);

// Dashboards Create / Update
router.post("/", dashboardBuilderController.saveDashboard);
router.post("/create", dashboardBuilderController.saveDashboard);
router.post("/save", dashboardBuilderController.saveDashboard);

router.put("/update/:id", dashboardBuilderController.saveDashboard);
router.put("/toggle-status/:id", dashboardBuilderController.toggleStatus);
router.put("/reorder", dashboardBuilderController.reorderDashboards);
router.put("/:id", dashboardBuilderController.saveDashboard);

// Dashboards Delete
router.delete("/delete/:id", dashboardBuilderController.deleteDashboard);
router.delete("/:id", dashboardBuilderController.deleteDashboard);

// Widgets
router.post("/widgets/save", dashboardBuilderController.saveWidget);
router.delete("/widgets/:id", dashboardBuilderController.deleteWidget);
router.post("/widgets/data", dashboardBuilderController.getWidgetData);

module.exports = router;

