// mongo-server/src/modules/dashboard/dashboardBuilder.controller.js
const mongoose = require("mongoose");
const CustomDashboard = require("../../models/CustomDashboard.model");

function formatDashboard(doc) {
  if (!doc) return null;
  const idStr = doc._id.toString();
  return {
    id: idStr,
    _id: idStr,
    tdb_id: idStr,
    name: doc.name,
    tdb_name: doc.name,
    description: doc.description || "",
    tdb_description: doc.description || "",
    roles: doc.roles || [],
    tdb_roles: doc.roles || [],
    widgets_layout: doc.widgets_layout || [],
    tdb_widgets_layout: doc.widgets_layout || [],
    filters_config: doc.filters_config || [],
    tdb_filters_config: doc.filters_config || [],
    data_scope: doc.data_scope || "all",
    tdb_data_scope: doc.data_scope || "all",
    is_active: doc.is_active ?? true,
    tdb_is_active: doc.is_active ?? true,
    is_default: doc.is_default ?? false,
    tdb_is_default: doc.is_default ?? false,
    order: doc.order || 0,
    tdb_order: doc.order || 0,
    created_at: doc.created_at,
    tdb_created_at: doc.created_at,
    updated_at: doc.updated_at,
    tdb_updated_at: doc.updated_at,
  };
}

const dashboardBuilderController = {

  // GET /custom-dashboards/list
  getDashboards: async (req, res) => {
    try {
      const { role_id, search } = req.query;
      const query = { deleted_at: null };

      if (!req.user?.isConfigurator && req.user?.role_slug !== "admin" && req.user?.role_slug !== "super_admin") {
        query.is_active = true;
      }

      if (search && search.trim()) {
        query.name = { $regex: search.trim(), $options: "i" };
      }

      const dashboards = await CustomDashboard.find(query).sort({ order: 1, created_at: -1 }).lean();
      let result = dashboards.map(formatDashboard);

      // Filter by role if specified
      if (role_id && role_id !== "all") {
        const targetRoleId = String(role_id);
        result = result.filter((d) => {
          const roles = d.roles || [];
          if (!roles || roles.length === 0) return true; // Available for all if empty
          return roles.some((r) => {
            if (typeof r === "object" && r !== null) {
              return (
                String(r.role_id) === targetRoleId ||
                String(r.id) === targetRoleId ||
                String(r.value) === targetRoleId ||
                String(r.slug) === targetRoleId
              );
            }
            return String(r) === targetRoleId;
          });
        });
      }

      return res.json({
        status: true,
        success: true,
        message: "Dashboards fetched successfully",
        data: result,
      });
    } catch (e) {
      return res.status(500).json({ status: false, success: false, message: e.message });
    }
  },

  // GET /custom-dashboards/detail/:id
  getDashboardById: async (req, res) => {
    try {
      const { id } = req.params;
      const dashboard = await CustomDashboard.findOne({ _id: id, deleted_at: null }).lean();
      if (!dashboard) {
        return res.status(404).json({ status: false, message: "Dashboard not found" });
      }

      return res.json({
        status: true,
        success: true,
        message: "Dashboard fetched successfully",
        data: formatDashboard(dashboard),
      });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // POST /custom-dashboards/create
  createDashboard: async (req, res) => {
    try {
      const {
        name,
        tdb_name,
        description,
        tdb_description,
        roles = [],
        tdb_roles,
        widgets_layout = [],
        tdb_widgets_layout,
        filters_config = [],
        tdb_filters_config,
        data_scope = "all",
        is_active = true,
        is_default = false,
      } = req.body;

      const dashboardName = (name || tdb_name || "").trim();
      if (!dashboardName) {
        return res.status(400).json({ status: false, message: "Dashboard name is required" });
      }

      const count = await CustomDashboard.countDocuments({ deleted_at: null });
      const userId = req.user?.user_id || null;

      const newDashboard = await CustomDashboard.create({
        name: dashboardName,
        description: description || tdb_description || "",
        roles: tdb_roles || roles || [],
        widgets_layout: tdb_widgets_layout || widgets_layout || [],
        filters_config: tdb_filters_config || filters_config || [],
        data_scope: data_scope || "all",
        is_active: is_active ?? true,
        is_default: is_default ?? false,
        order: count + 1,
        created_by: userId,
        updated_by: userId,
      });

      return res.status(201).json({
        status: true,
        success: true,
        message: "Dashboard created successfully",
        data: formatDashboard(newDashboard),
      });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // PUT /custom-dashboards/update/:id
  updateDashboard: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        tdb_name,
        description,
        tdb_description,
        roles,
        tdb_roles,
        widgets_layout,
        tdb_widgets_layout,
        filters_config,
        tdb_filters_config,
        data_scope,
        is_active,
        is_default,
        order,
      } = req.body;

      const dashboard = await CustomDashboard.findOne({ _id: id, deleted_at: null });
      if (!dashboard) {
        return res.status(404).json({ status: false, message: "Dashboard not found" });
      }

      if (name !== undefined || tdb_name !== undefined) dashboard.name = (name || tdb_name || "").trim();
      if (description !== undefined || tdb_description !== undefined) dashboard.description = description || tdb_description || "";
      if (roles !== undefined || tdb_roles !== undefined) dashboard.roles = tdb_roles || roles || [];
      if (widgets_layout !== undefined || tdb_widgets_layout !== undefined) dashboard.widgets_layout = tdb_widgets_layout || widgets_layout || [];
      if (filters_config !== undefined || tdb_filters_config !== undefined) dashboard.filters_config = tdb_filters_config || filters_config || [];
      if (data_scope !== undefined) dashboard.data_scope = data_scope;
      if (is_active !== undefined) dashboard.is_active = is_active;
      if (is_default !== undefined) dashboard.is_default = is_default;
      if (order !== undefined) dashboard.order = order;
      dashboard.updated_by = req.user?.user_id || null;

      await dashboard.save();

      return res.json({
        status: true,
        success: true,
        message: "Dashboard updated successfully",
        data: formatDashboard(dashboard),
      });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // PUT /custom-dashboards/toggle-status/:id
  toggleStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const dashboard = await CustomDashboard.findOne({ _id: id, deleted_at: null });
      if (!dashboard) {
        return res.status(404).json({ status: false, message: "Dashboard not found" });
      }

      dashboard.is_active = !dashboard.is_active;
      dashboard.updated_by = req.user?.user_id || null;
      await dashboard.save();

      return res.json({
        status: true,
        message: `Dashboard ${dashboard.is_active ? "activated" : "deactivated"} successfully`,
        data: formatDashboard(dashboard),
      });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // DELETE /custom-dashboards/delete/:id
  deleteDashboard: async (req, res) => {
    try {
      const { id } = req.params;
      const dashboard = await CustomDashboard.findOne({ _id: id, deleted_at: null });
      if (!dashboard) {
        return res.status(404).json({ status: false, message: "Dashboard not found" });
      }

      dashboard.deleted_at = new Date();
      dashboard.updated_by = req.user?.user_id || null;
      await dashboard.save();

      return res.json({
        status: true,
        message: "Dashboard deleted successfully",
      });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // PUT /custom-dashboards/reorder
  reorderDashboards: async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ status: false, message: "Items array is required" });
      }

      for (const item of items) {
        if (item.id && item.order !== undefined) {
          await CustomDashboard.findByIdAndUpdate(item.id, {
            order: item.order,
            updated_by: req.user?.user_id || null,
          });
        }
      }

      return res.json({
        status: true,
        message: "Dashboards reordered successfully",
      });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },
};

module.exports = dashboardBuilderController;
