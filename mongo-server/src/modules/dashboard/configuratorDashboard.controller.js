// mongo-server/src/modules/dashboard/configuratorDashboard.controller.js
const Form = require('../../models/Form.model');
const Menu = require('../../models/Menu.model');
const Role = require('../../models/Role.model');
const CustomDashboardWidget = require('../../models/CustomDashboardWidget.model');
const CustomDashboard = require('../../models/CustomDashboard.model');

const getConfiguratorDashboardOverview = async (req, res) => {
  try {
    const [
      formsCount,
      masterCount,
      draftsCount,
      publishedCount,
      menusCount,
      widgetsCount,
      dashboardsCount,
      rolesCount,
      recentForms,
      recentMasters,
      recentMenus,
      recentWidgets
    ] = await Promise.all([
      Form.countDocuments({ deleted_at: null, is_master: { $ne: true } }),
      Form.countDocuments({ deleted_at: null, is_master: true }),
      Form.countDocuments({ deleted_at: null, status: 'draft' }),
      Form.countDocuments({ deleted_at: null, status: 'published' }),
      Menu.countDocuments({ deleted_at: null }),
      CustomDashboardWidget.countDocuments({ deleted_at: null }),
      CustomDashboard.countDocuments({ deleted_at: null }),
      Role.countDocuments({ deleted_at: null }),
      Form.find({ deleted_at: null, is_master: { $ne: true } }).sort({ createdAt: -1 }).limit(10).lean(),
      Form.find({ deleted_at: null, is_master: true }).sort({ createdAt: -1 }).limit(10).lean(),
      Menu.find({ deleted_at: null }).sort({ order: 1 }).limit(10).lean(),
      CustomDashboardWidget.find({ deleted_at: null }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    const breakdown = [
      { key: 'formsbuilder', name: 'Forms Builder', count: formsCount, color: '#22c55e', url: '/configurator/formsbuilder' },
      { key: 'masterconfigs', name: 'Master Configs', count: masterCount, color: '#0369a1', url: '/configurator/masterconfigs' },
      { key: 'menus', name: 'Sidebar Menus', count: menusCount, color: '#b45309', url: '/configurator/menus' },
      { key: 'mother-dashboard', name: 'Dashboard Builder', count: widgetsCount, color: '#15803d', url: '/configurator/mother-dashboard' },
      { key: 'reports', name: 'Report Builder', count: 0, color: '#7c3aed', url: '/configurator/reports' },
      { key: 'settings', name: 'Site Settings / RBAC', count: rolesCount, color: '#ec4899', url: '/configurator/settings' }
    ];

    return res.status(200).json({
      success: true,
      message: 'Configurator dashboard overview loaded successfully',
      data: {
        kpis: {
          forms_count: formsCount,
          master_configs_count: masterCount,
          drafts_count: draftsCount,
          published_count: publishedCount,
          sidebar_menus_count: menusCount,
          dashboard_widgets_count: widgetsCount,
          reports_count: 0,
          roles_count: rolesCount
        },
        breakdown,
        recent: {
          forms: recentForms.map(f => ({ ...f, id: f._id.toString() })),
          masters: recentMasters.map(m => ({ ...m, id: m._id.toString() })),
          menus: recentMenus.map(m => ({ ...m, id: m._id.toString() })),
          widgets: recentWidgets.map(w => ({ ...w, id: w._id.toString() }))
        }
      }
    });
  } catch (err) {
    console.error('getConfiguratorDashboardOverview Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getConfiguratorDashboardOverview
};
