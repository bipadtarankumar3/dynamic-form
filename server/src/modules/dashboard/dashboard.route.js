// server/src/modules/dashboard/dashboard.route.js
// ============================================================
// Dashboard routes:
//   /api/v1/configurator/dashboard-widgets — Configurator CRUD
//   /api/v1/dashboard-widgets              — All authenticated users
//   /api/v1/admin/dash                     — Legacy endpoints
// ============================================================

const express = require("express");
const legacyCtrl = require("./controllers/dashboard.controller");
const dynamicCtrl = require("./controllers/dynamicDashboard.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator) {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

// 1. Configurator schema / widget builder
const configRouter = express.Router();
configRouter.use(authMiddleware.validateToken, requireConfigurator);

configRouter.post("/",      dynamicCtrl.createWidget);
configRouter.put("/:id",    dynamicCtrl.updateWidget);
configRouter.delete("/:id", dynamicCtrl.deleteWidget);

// 2. Dynamic dashboard execution for users
const userRouter = express.Router();
userRouter.use(authMiddleware.validateToken);

userRouter.get("/",             dynamicCtrl.listWidgets);
userRouter.get("/:widget_id",   dynamicCtrl.executeWidgetQuery);

// 3. Legacy router (kept for backward compatibility during client migration)
const legacyRouter = express.Router();

legacyRouter.post("/counts", legacyCtrl.getDashboardCounts);
legacyRouter.post("/proposal-count-theme-wise", legacyCtrl.getProposalCountThemeWise);
legacyRouter.post("/proposal-by-theme-dt", legacyCtrl.getProposalByThemeDT);
legacyRouter.post("/proposal-by-theme-file-download", legacyCtrl.getProposalByThemeFileDownload);
legacyRouter.post("/project-count-theme-wise", legacyCtrl.getProjectCountThemeWise);
legacyRouter.post("/project-by-theme-dt", legacyCtrl.getProjectByThemeDT);
legacyRouter.post("/project-by-theme-file-download", legacyCtrl.getProjectByThemeFileDownload);
legacyRouter.post("/budget-details", legacyCtrl.getBudgetDetails);
legacyRouter.post("/utilization-theme-wise", legacyCtrl.getUtilizationThemeWise);
legacyRouter.post("/utilization-by-theme-dt", legacyCtrl.getUtilizationByThemeDT);
legacyRouter.post("/utilization-by-theme-file-download", legacyCtrl.getUtilizationByThemeFileDownload);
legacyRouter.post("/ngo-dt", legacyCtrl.getNgoDT);
legacyRouter.post("/ngo-list-file-download", legacyCtrl.ngoListFileDownload);
legacyRouter.post("/student-coverage-dt", legacyCtrl.getStudentsCoverageDT);
legacyRouter.post("/student-coverage-file-download", legacyCtrl.getStudentsCoverageFileDownload);
legacyRouter.post("/training-coverage-dt", legacyCtrl.getTrainingCoverageDT);
legacyRouter.post("/training-coverage-file-download", legacyCtrl.getTrainingCoverageFileDownload);
legacyRouter.post("/edu-scholarship-geojson", legacyCtrl.getEduScholarshipGeojson);
legacyRouter.post("/edu-scholarship-dt", legacyCtrl.getEduScholarshipDT);
legacyRouter.post("/item-supplied-geojson", legacyCtrl.getItemSuppliedGeojson);
legacyRouter.post("/item-supplied-dt", legacyCtrl.getItemSuppliedDT);
legacyRouter.post("/mmu-organized-geojson", legacyCtrl.getMMUOrganizedGeojson);
legacyRouter.post("/mmu-organized-dt", legacyCtrl.getMMUOrganizedDT);
legacyRouter.post("/mega-camp-geojson", legacyCtrl.getMegaCampGeojson);
legacyRouter.post("/mega-camp-dt", legacyCtrl.getMegaCampDT);
legacyRouter.post("/animal-camp-geojson", legacyCtrl.getAnimalCampGeojson);
legacyRouter.post("/animal-camp-dt", legacyCtrl.getAnimalCampDT);
legacyRouter.post("/shg-geojson", legacyCtrl.getSHGGeojson);
legacyRouter.post("/shg-dt", legacyCtrl.getSHGDT);

module.exports = { configRouter, userRouter, legacyRouter };

