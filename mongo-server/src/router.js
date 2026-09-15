// mongo-server/src/router.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("./middlewares/auth.middleware");

// Auth (public — no validateToken on login/register routes)
router.use("/auth", require("./modules/auth/auth.route"));

// RBAC
router.use("/rbac", require("./modules/rbac/rbac.route"));
router.use("/configurator/rbac", require("./modules/rbac/rbac.route"));

// Form Builder (Schema definitions)
router.use("/form-builder", require("./modules/form-builder/formBuilder.route"));
router.use("/configurator/form-schemas", require("./modules/form-builder/formBuilder.route"));

// Dynamic Form Engine (Data CRUD, listing, views)
router.use("/dynamic-form", authMiddleware.validateToken, require("./modules/dynamic-form/dynamicForm.route"));
router.use("/forms", authMiddleware.validateToken, require("./modules/dynamic-form/dynamicForm.route"));

// Master Data Builder
router.use("/master-builder", require("./modules/master-builder/masterBuilder.route"));
router.use("/configurator/master-schemas", require("./modules/master-builder/masterBuilder.route"));
router.use("/masters", require("./modules/master-builder/masterBuilder.route"));

// Menu management
router.use("/menus", require("./modules/menu/menu.route"));
router.use("/configurator/menus", require("./modules/menu/menu.route"));

// Approval Workflows
router.use("/workflows", require("./modules/workflow/workflow.route"));
router.use("/configurator/workflows", require("./modules/workflow/workflow.route"));

// Database Views (MongoDB native views via aggregation)
router.use("/database-views", require("./modules/database-view/databaseView.route"));
router.use("/configurator/database-views", require("./modules/database-view/databaseView.route"));

// System settings
router.use("/settings", require("./modules/settings/settings.route"));
router.use("/configurator/settings", require("./modules/settings/settings.route"));

// Pivot Dashboard & Data Widgets
router.use("/pivot", require("./modules/pivot/pivot.route"));

// Custom Dashboards & Dashboard Builder
router.use("/custom-dashboards", require("./modules/dashboard/dashboardBuilder.route"));
router.use("/configurator/custom-dashboards", require("./modules/dashboard/dashboardBuilder.route"));

// Public endpoints
router.use("/public", require("./modules/public/public.route"));

// Audit logs
router.use("/audit", require("./modules/audit/auditLog.route"));

// Common utility routes (permissions, etc.)
router.use("/common", require("./modules/common/common.route"));

// Health check
router.get("/health", (req, res) => {
  res.json({ success: true, message: "mongo-server is running", timestamp: new Date().toISOString() });
});

module.exports = router;
