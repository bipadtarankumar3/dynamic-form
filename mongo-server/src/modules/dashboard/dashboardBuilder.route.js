// mongo-server/src/modules/dashboard/dashboardBuilder.route.js
const express = require("express");
const router = express.Router();
const dashboardBuilderController = require("./dashboardBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

// Dashboards
router.get("/", dashboardBuilderController.listDashboards);
router.get("/:id", dashboardBuilderController.getDashboard);
router.post("/", dashboardBuilderController.saveDashboard);
router.put("/:id", dashboardBuilderController.saveDashboard);
router.delete("/:id", dashboardBuilderController.deleteDashboard);

// Widgets
router.post("/widgets/save", dashboardBuilderController.saveWidget);
router.delete("/widgets/:id", dashboardBuilderController.deleteWidget);
router.post("/widgets/data", dashboardBuilderController.getWidgetData);

module.exports = router;
