const commonRoute = require("./modules/common/common.route");
const authRoute = require("./modules/auth/auth.route");

//app
const appAuthRoute = require("./modules/app/auth/auth.route");
const appVersionRoute = require("./modules/app/version/version.route");
const authMiddleware = require("./middlewares/auth.middleware");
const appSchemaRoute = require('./modules/app/schema/schema.route');
const appDashboardRoute = require('./modules/app/dashboard/dashboard.route');
const appAuthMiddleware = require("./middlewares/auth.app.middleware");

module.exports = (app) => {
  // -------------------------------------------------------
  // Auth (existing — preserved, supports both admin and public prefixes)
  // -------------------------------------------------------
  app.use(["/api/v1/admin/auth", "/api/v1/auth"], authRoute);


  // -------------------------------------------------------
  // LEGACY SYSTEM ROUTING (Common routes kept for auth context)
  // -------------------------------------------------------
  app.use("/api/v1/admin/common", commonRoute);

  // -------------------------------------------------------
  // NEW PLATFORM DYNAMIC ROUTES (Phase 4–13)
  // -------------------------------------------------------
  const { schemaRouter: masterSchemaRouter, dataRouter: masterDataRouter } = require('./modules/master-builder/masterBuilder.route');
  const { configRouter: masterConfigRouter }                               = require('./modules/master-builder/masterConfig.route');
  const { schemaRouter: formSchemaRouter, dataRouter: formDataRouter }     = require('./modules/form-builder/formBuilder.route');
  const { userRouter: menuUserRouter, configRouter: menuConfigRouter, publicRouter: menuPublicRouter } = require('./modules/menu/menu.route');
  const { configRouter: workflowConfigRouter, userRouter: workflowUserRouter } = require('./modules/approval-workflow/approvalWorkflow.route');
  const { configRouter: rbacConfigRouter, adminRouter: rbacAdminRouter } = require('./modules/rbac/rbac.route');
  const { configRouter: dashConfigRouter, userRouter: dashUserRouter } = require('./modules/dashboard/dashboard.route');
  const { configRouter: reportConfigRouter, userRouter: reportUserRouter } = require('./modules/dynamic-report/dynamicReport.route');
  const { configRouter: notifConfigRouter, userRouter: notifUserRouter } = require('./notification/notification.route');
  const { settingsPublicRouter, settingsConfiguratorRouter } = require('./modules/settings/settings.route');

  const configuratorDashboardRoute = require('./modules/dashboard/configuratorDashboard.route');

  const databaseViewRouter = require('./modules/database-view/databaseView.route');

  // Configurator-only schema management (supports both /admin prefixed and raw paths)
  app.use(["/api/v1/admin/configurator/database-views", "/api/v1/configurator/database-views"], databaseViewRouter);
  app.use(["/api/v1/admin/configurator/dashboard",      "/api/v1/configurator/dashboard"],      configuratorDashboardRoute);
  app.use(["/api/v1/admin/configurator/master-schemas", "/api/v1/configurator/master-schemas"], masterSchemaRouter);
  app.use(["/api/v1/admin/configurator/master-configs", "/api/v1/configurator/master-configs"], masterConfigRouter);
  app.use(["/api/v1/admin/configurator/form-schemas",   "/api/v1/configurator/form-schemas"],   formSchemaRouter);
  app.use(["/api/v1/admin/configurator/menus",           "/api/v1/configurator/menus"],          menuConfigRouter);
  app.use(["/api/v1/admin/configurator/workflows",       "/api/v1/configurator/workflows"],      workflowConfigRouter);
  app.use(["/api/v1/admin/configurator/rbac",            "/api/v1/configurator/rbac"],           rbacConfigRouter);
  app.use(["/api/v1/admin/configurator/dashboard-widgets", "/api/v1/configurator/dashboard-widgets"], dashConfigRouter);
  app.use(["/api/v1/admin/configurator/report-definitions", "/api/v1/configurator/report-definitions"], reportConfigRouter);
  app.use(["/api/v1/admin/configurator/notification-cfgs",  "/api/v1/configurator/notification-cfgs"],  notifConfigRouter);
  app.use(["/api/v1/admin/configurator/settings",           "/api/v1/configurator/settings"],           settingsConfiguratorRouter);

  // Unified Public Engine (NGO Registration + Public Forms & Schemas)
  app.use("/api/v1/settings", settingsPublicRouter);
  app.use("/api/v1/public/menus", menuPublicRouter);
  app.use("/api/v1/public", require("./modules/public/public.route"));

  // All authenticated users — generic master/form data + menu tree + workflows
  app.use(["/api/v1/admin/masters",   "/api/v1/masters"],   masterDataRouter);
  app.use(["/api/v1/admin/forms",     "/api/v1/forms"],     formDataRouter);
  app.use(["/api/v1/admin/menus",     "/api/v1/menus"],     menuUserRouter);
  app.use(["/api/v1/admin/workflows", "/api/v1/workflows"], workflowUserRouter);
  app.use(["/api/v1/admin/dashboard-widgets", "/api/v1/dashboard-widgets"], dashUserRouter);
  app.use(["/api/v1/admin/reports",           "/api/v1/reports"],           reportUserRouter);
  app.use(["/api/v1/admin/notifications",     "/api/v1/notifications",     "/api/v1/tntf", "/api/v1/admin/tntf"], notifUserRouter);
  app.use("/api/v1/admin/audit",       require('./modules/audit/audit.route'));
  app.use("/api/v1/admin/pivot",       require('./modules/pivot/pivot.route'));
  app.use(["/api/v1/admin/fy", "/api/v1/fy"], require("./modules/common/fy.route"));
  app.use(["/api/v1/admin/custom-dashboards", "/api/v1/custom-dashboards", "/api/v1/configurator/custom-dashboards", "/api/v1/admin/configurator/custom-dashboards"], require('./modules/dashboard/dashboardBuilder.route'));
  app.use(["/api/v1/admin/ngo",        "/api/v1/ngo"], require("./modules/ngo/ngo.route"));
  app.use(["/api/v1/admin/monitoring", "/api/v1/monitoring"], require("./modules/monitoring/kpiMonitoring.route"));
  // Static Auth management pages (Users, Roles, Permissions, Approval Path)
  app.use(["/api/v1/admin/auth", "/api/v1/auth"], rbacAdminRouter);
  app.use("/api/v1/common/permissions", authMiddleware.validateToken, require('./modules/rbac/controllers/platformRbac.controller').getMyPermissions);
  app.use(["/api/v1/admin/approval-path", "/api/v1/approval-path"], workflowConfigRouter);
  // Generic Form Approval (works for any form_slug + record_id)
  app.use(["/api/v1/admin/form-approval", "/api/v1/form-approval"], require("./modules/form-approval/formApproval.route"));

  // Legacy wrappers still called by existing client modals
  app.use("/api/v1/admin/form-builder", require('./modules/form-builder/formBuilder.route').legacyRouter);
  app.use("/api/v1/admin/dynamic-report", require('./modules/dynamic-report/dynamicReport.route').legacyRouter);
  app.use("/api/v1/admin/dash", require('./modules/dashboard/dashboard.route').legacyRouter);
  app.use(["/api/v1/admin/dynamic-form", "/api/v1/dynamic-form"], require('./modules/dynamic-form/dynamicForm.route'));

  // -------------------------------------------------------
  // APP (Mobile) routes (existing — preserved)
  // -------------------------------------------------------
  app.use("/api/v1/app/auth", appAuthRoute);
  app.use("/api/v1/app/user", appAuthMiddleware.validateToken, require('./modules/app/user/user.route'));
  app.use("/api/v1/app/version", appVersionRoute);
  app.use("/api/v1/app/schema", appAuthMiddleware.validateToken, appSchemaRoute);
  app.use("/api/v1/app/dashboard", appAuthMiddleware.validateToken, appDashboardRoute);
  app.use("/api/v1/app/common", appAuthMiddleware.validateToken, require('./modules/common/common.route'));
  app.use("/api/v1/app", require('./modules/logout/logout.route'));
};


