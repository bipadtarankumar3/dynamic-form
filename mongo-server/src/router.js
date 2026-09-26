const express = require('express');
const router = express.Router();
const authMiddleware = require('./middlewares/auth.middleware');

// 1. Auth routes (Login, Register, Logout, Me, Password change, Otp)
const authRoute = require('./modules/auth/auth.route');
router.use('/auth', authRoute);
router.use('/admin/auth', authRoute);

// 2. RBAC (Roles, Permissions, User assignments)
const rbacRoute = require('./modules/rbac/rbac.route');
router.use('/rbac', rbacRoute);
router.use('/configurator/rbac', rbacRoute);
router.use('/admin/rbac', rbacRoute);
router.use('/admin/configurator/rbac', rbacRoute);

// 3. Form Builder (Form metadata and section schemas)
const formBuilderRoute = require('./modules/form-builder/formBuilder.route');
router.use('/form-builder', formBuilderRoute);
router.use('/configurator/form-schemas', formBuilderRoute);
router.use('/admin/form-builder', formBuilderRoute);
router.use('/admin/configurator/form-schemas', formBuilderRoute);

// 4. Dynamic Form Engine (Data CRUD, listing, pagination, export, filters)
const dynamicFormRoute = require('./modules/dynamic-form/dynamicForm.route');
router.use('/dynamic-form', authMiddleware.authenticateToken, dynamicFormRoute);
router.use('/forms', authMiddleware.authenticateToken, dynamicFormRoute);
router.use('/admin/forms', authMiddleware.authenticateToken, dynamicFormRoute);
router.use('/admin/dynamic-form', authMiddleware.authenticateToken, dynamicFormRoute);

// 5. Master Data Builder (Master schemas & rows CRUD)
const masterBuilderRoute = require('./modules/master-builder/masterBuilder.route');
router.use('/master-builder', masterBuilderRoute);
router.use('/configurator/master-schemas', masterBuilderRoute);
router.use('/masters', masterBuilderRoute);
router.use('/admin/masters', masterBuilderRoute);
router.use('/admin/configurator/master-schemas', masterBuilderRoute);

// 5b. Master Configs (Dynamic Master Configurations & Key Mapping)
const masterConfigRoute = require('./modules/master-config/masterConfig.route');
router.use('/master-configs', masterConfigRoute);
router.use('/configurator/master-configs', masterConfigRoute);
router.use('/admin/master-configs', masterConfigRoute);
router.use('/admin/configurator/master-configs', masterConfigRoute);

// 6. Menu Management
const menuRoute = require('./modules/menu/menu.route');
router.use('/menus', menuRoute);
router.use('/configurator/menus', menuRoute);
router.use('/admin/menus', menuRoute);
router.use('/admin/configurator/menus', menuRoute);

// 7. Approval Workflows & Path
const workflowRoute = require('./modules/workflow/workflow.route');
router.use('/workflows', workflowRoute);
router.use('/configurator/workflows', workflowRoute);
router.use('/approval-path', workflowRoute);
router.use('/admin/workflows', workflowRoute);
router.use('/admin/configurator/workflows', workflowRoute);
router.use('/admin/approval-path', workflowRoute);

// 8. Form Approval Engine
const formApprovalRoute = require('./modules/form-approval/formApproval.route');
router.use('/form-approval', formApprovalRoute);
router.use('/admin/form-approval', formApprovalRoute);

// 9. Database Views (Dynamic Aggregation Views)
const databaseViewRoute = require('./modules/database-view/databaseView.route');
router.use('/database-views', databaseViewRoute);
router.use('/configurator/database-views', databaseViewRoute);
router.use('/admin/database-views', databaseViewRoute);
router.use('/admin/configurator/database-views', databaseViewRoute);

// 10. System Settings
const settingsRoute = require('./modules/settings/settings.route');
router.use('/settings', settingsRoute);
router.use('/configurator/settings', settingsRoute);
router.use('/admin/settings', settingsRoute);
router.use('/admin/configurator/settings', settingsRoute);

// 11. Pivot Dashboard & Analytics
const pivotRoute = require('./modules/pivot/pivot.route');
router.use('/pivot', pivotRoute);
router.use('/admin/pivot', pivotRoute);

// 12. Custom Dashboards & Widgets
const dashboardRoute = require('./modules/dashboard/dashboardBuilder.route');
const configuratorDashboardRoute = require('./modules/dashboard/configuratorDashboard.route');
router.use('/custom-dashboards', dashboardRoute);
router.use('/configurator/custom-dashboards', dashboardRoute);
router.use('/admin/custom-dashboards', dashboardRoute);
router.use('/admin/configurator/custom-dashboards', dashboardRoute);
router.use('/dashboard-widgets', dashboardRoute);
router.use('/admin/dashboard-widgets', dashboardRoute);
router.use('/configurator/dashboard', configuratorDashboardRoute);
router.use('/admin/configurator/dashboard', configuratorDashboardRoute);

// 13. Public Endpoints
const publicRoute = require('./modules/public/public.route');
router.use('/public', publicRoute);

// 14. Audit Logs
const auditLogRoute = require('./modules/audit/auditLog.route');
router.use('/audit', auditLogRoute);
router.use('/admin/audit', auditLogRoute);

// 15. Common & FY Utility Routes
const commonRoute = require('./modules/common/common.route');
const fyRoute = require('./modules/common/fy.route');
router.use('/common', commonRoute);
router.use('/admin/common', commonRoute);
router.use('/fy', fyRoute);
router.use('/admin/fy', fyRoute);

// 16. Employee Volunteering (Programs, Events, RSVPs, Attendance)
const employeeVolunteeringRoute = require('./modules/employee-volunteering/employeeVolunteering.route');
const volunteeringStoryRoute = require('./modules/employee-volunteering/volunteeringStory.route');
router.use('/employee-volunteering', employeeVolunteeringRoute);
router.use('/volunteering', employeeVolunteeringRoute);
router.use('/admin/employee-volunteering', employeeVolunteeringRoute);
router.use('/admin/volunteering', employeeVolunteeringRoute);

router.use('/employee-volunteering/stories', volunteeringStoryRoute);
router.use('/volunteering/stories', volunteeringStoryRoute);
router.use('/admin/employee-volunteering/stories', volunteeringStoryRoute);
router.use('/admin/volunteering/stories', volunteeringStoryRoute);

// 17. NGO Management & RFP Lifecycle
const ngoRoute = require('./modules/ngo/ngo.route');
router.use('/ngo', ngoRoute);
router.use('/admin/ngo', ngoRoute);

// 18. Monitoring & KPI Tracking
const kpiMonitoringRoute = require('./modules/monitoring/kpiMonitoring.route');
router.use('/monitoring', kpiMonitoringRoute);
router.use('/admin/monitoring', kpiMonitoringRoute);

// 19. In-App Notifications
const notificationRoute = require('./modules/notification/notification.route');
router.use('/notifications', notificationRoute);
router.use('/admin/notifications', notificationRoute);
router.use('/tntf', notificationRoute);
router.use('/admin/tntf', notificationRoute);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CSR Dynamic Form MongoDB Server is healthy and running',
    timestamp: new Date().toISOString(),
    database: 'MongoDB'
  });
});

module.exports = router;
