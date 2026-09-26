// mongo-server/src/modules/dashboard/dashboardBuilder.controller.js
const CustomDashboard = require("../../models/CustomDashboard.model");
const CustomDashboardWidget = require("../../models/CustomDashboardWidget.model");
const Form = require("../../models/Form.model");
const MasterSchema = require("../../models/MasterSchema.model");
const DatabaseView = require("../../models/DatabaseView.model");
const { getFormModel } = require("../../utils/formCollection.util");
const mongoose = require("mongoose");

const dashboardBuilderController = {
  // ---- DASHBOARDS CRUD ----
  listDashboards: async (req, res) => {
    try {
      const { role_slug, isConfigurator } = req.user || {};
      const query = { deleted_at: null };
      if (!isConfigurator && role_slug) {
        query.$or = [{ roles: { $size: 0 } }, { roles: role_slug }];
      }
      const dashboards = await CustomDashboard.find(query).sort({ created_at: -1 });
      return res.json({ success: true, count: dashboards.length, data: dashboards });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getDashboard: async (req, res) => {
    try {
      const { id } = req.params;
      const dashboard = await CustomDashboard.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { slug: id }].filter(Boolean),
        deleted_at: null,
      });
      if (!dashboard) return res.status(404).json({ success: false, message: "Dashboard not found" });

      const widgets = await CustomDashboardWidget.find({ dashboard_id: dashboard._id, deleted_at: null });
      return res.json({ success: true, data: { ...dashboard.toObject(), widgets } });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  saveDashboard: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { id, name, slug, description, layout, roles, is_default } = req.body;
      if (!name || !slug) return res.status(400).json({ success: false, message: "name and slug are required" });

      const payload = {
        name,
        slug,
        description: description || "",
        layout: layout || [],
        roles: roles || [],
        is_default: Boolean(is_default),
        updated_by: userId,
      };

      let existing = null;
      if (id && mongoose.isValidObjectId(id)) {
        existing = await CustomDashboard.findById(id);
      } else {
        existing = await CustomDashboard.findOne({ slug, deleted_at: null });
      }

      if (existing) {
        const updated = await CustomDashboard.findByIdAndUpdate(existing._id, payload, { new: true });
        return res.json({ success: true, message: "Dashboard updated", data: updated });
      }

      const created = await CustomDashboard.create({ ...payload, created_by: userId });
      return res.status(201).json({ success: true, message: "Dashboard created", data: created });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteDashboard: async (req, res) => {
    try {
      const { id } = req.params;
      await CustomDashboard.findByIdAndUpdate(id, { deleted_at: new Date() });
      await CustomDashboardWidget.updateMany({ dashboard_id: id }, { deleted_at: new Date() });
      return res.json({ success: true, message: "Dashboard deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ---- WIDGETS CRUD ----
  saveWidget: async (req, res) => {
    try {
      const { id, dashboard_id, title, widget_type, data_source, grid_position, config } = req.body;
      if (!title || !widget_type) return res.status(400).json({ success: false, message: "title and widget_type are required" });

      const payload = {
        dashboard_id: dashboard_id || null,
        title,
        widget_type,
        data_source: data_source || {},
        grid_position: grid_position || {},
        config: config || {},
      };

      if (id && mongoose.isValidObjectId(id)) {
        const updated = await CustomDashboardWidget.findByIdAndUpdate(id, payload, { new: true });
        return res.json({ success: true, message: "Widget updated", data: updated });
      }

      const created = await CustomDashboardWidget.create(payload);
      return res.status(201).json({ success: true, message: "Widget created", data: created });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteWidget: async (req, res) => {
    try {
      const { id } = req.params;
      await CustomDashboardWidget.findByIdAndUpdate(id, { deleted_at: new Date() });
      return res.json({ success: true, message: "Widget deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ---- WIDGET DATA EXECUTION ----
  getWidgetData: async (req, res) => {
    try {
      const { target, type = "form", aggregation = "count", group_by, value_field } = req.body;
      if (!target) return res.status(400).json({ success: false, message: "target is required" });

      const db = mongoose.connection.db;

      if (type === "form") {
        const form = await Form.findOne({ slug: target, deleted_at: null });
        const FormModel = form ? getFormModel(form) : getFormModel(target);

        if (!group_by) {
          const count = await FormModel.countDocuments({ deleted_at: null });
          return res.json({ success: true, data: { count, total: count } });
        }

        const pipeline = [
          { $match: { deleted_at: null } },
          {
            $group: {
              _id: `$data.${group_by}`,
              count: { $sum: 1 },
              ...(value_field && aggregation === "sum" ? { total: { $sum: `$data.${value_field}` } } : {}),
            },
          },
        ];
        const results = await FormModel.aggregate(pipeline);
        return res.json({ success: true, data: results.map(r => ({ label: r._id || "Other", value: r.total !== undefined ? r.total : r.count })) });
      }

      const count = await db.collection(target).countDocuments({});
      return res.json({ success: true, data: { count, total: count } });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = dashboardBuilderController;
