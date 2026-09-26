const express = require("express");
const router = express.Router();
const ctrl = require("./controllers/dashboardBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// All custom dashboard builder routes require authentication
router.use(authMiddleware.validateToken);

router.get("/list", ctrl.getDashboards);
router.get("/detail/:id", ctrl.getDashboardById);
router.post("/create", ctrl.createDashboard);
router.put("/update/:id", ctrl.updateDashboard);
router.put("/toggle-status/:id", ctrl.toggleStatus);
router.delete("/delete/:id", ctrl.deleteDashboard);
router.put("/reorder", ctrl.reorderDashboards);

module.exports = router;
