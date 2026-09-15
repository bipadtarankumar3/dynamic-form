// mongo-server/src/modules/dashboard/dashboardBuilder.route.js
const express = require("express");
const controller = require("./dashboardBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware.validateToken);

router.get("/list",               controller.getDashboards);
router.get("/detail/:id",         controller.getDashboardById);
router.post("/create",            controller.createDashboard);
router.put("/update/:id",         controller.updateDashboard);
router.put("/toggle-status/:id",  controller.toggleStatus);
router.delete("/delete/:id",      controller.deleteDashboard);
router.put("/reorder",            controller.reorderDashboards);

module.exports = router;
