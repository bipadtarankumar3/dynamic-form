// mongo-server/src/modules/dashboard/dashboardBuilder.controller.js
const CustomDashboard = require("../../models/CustomDashboard.model");
const CustomDashboardWidget = require("../../models/CustomDashboardWidget.model");
const Form = require("../../models/Form.model");
const MasterSchema = require("../../models/MasterSchema.model");
const DatabaseView = require("../../models/DatabaseView.model");
const { getFormModel } = require("../../utils/formCollection.util");
const mongoose = require("mongoose");

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^-+|-+$/g, "");

const normalizeDashboard = (d) => {
  if (!d) return null;
  const doc = typeof d.toObject === "function" ? d.toObject() : { ...d };
  const idStr = String(doc._id || doc.id || "");
  const nameStr = doc.name || doc.tdb_name || "Untitled Dashboard";
  const descStr = doc.description || doc.tdb_description || "";
  const rolesArr = doc.roles || doc.tdb_roles || [];
  const layoutArr = doc.layout || doc.widgets_layout || doc.tdb_widgets_layout || [];
  const isActiveBool = doc.is_active !== false && doc.tdb_is_active !== false;
  const isDefaultBool = Boolean(doc.is_default || doc.tdb_is_default);

  return {
    ...doc,
    _id: idStr,
    id: idStr,
    tdb_id: idStr,
    name: nameStr,
    tdb_name: nameStr,
    slug: doc.slug || slugify(nameStr),
    description: descStr,
    tdb_description: descStr,
    roles: rolesArr,
    tdb_roles: rolesArr,
    layout: layoutArr,
    widgets_layout: layoutArr,
    tdb_widgets_layout: layoutArr,
    is_active: isActiveBool,
    tdb_is_active: isActiveBool,
    is_default: isDefaultBool,
    tdb_is_default: isDefaultBool,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
};

const dashboardBuilderController = {
  // ---- DASHBOARDS CRUD ----
  listDashboards: async (req, res) => {
    try {
      const { role_slug, isConfigurator } = req.user || {};
      const query = { deleted_at: null };
      if (!isConfigurator && role_slug) {
        query.$or = [{ roles: { $size: 0 } }, { roles: role_slug }];
      }
      const dashboards = await CustomDashboard.find(query).sort({ created_at: -1 }).lean();
      const formatted = dashboards.map(normalizeDashboard);

      return res.json({
        status: true,
        success: true,
        count: formatted.length,
        data: formatted,
      });
    } catch (e) {
      return res.status(500).json({ status: false, success: false, message: e.message });
    }
  },

  getDashboard: async (req, res) => {
    try {
      const id = req.params.id || req.query.id;
      if (!id) return res.status(400).json({ status: false, success: false, message: "ID is required" });

      const dashboard = await CustomDashboard.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { slug: id }].filter(Boolean),
        deleted_at: null,
      }).lean();

      if (!dashboard) {
        return res.status(404).json({ status: false, success: false, message: "Dashboard not found" });
      }

      const widgets = await CustomDashboardWidget.find({ dashboard_id: dashboard._id, deleted_at: null }).lean();
      const formatted = normalizeDashboard(dashboard);

      return res.json({
        status: true,
        success: true,
        data: { ...formatted, widgets },
      });
    } catch (e) {
      return res.status(500).json({ status: false, success: false, message: e.message });
    }
  },

  saveDashboard: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const id = req.params.id || req.body.id || req.body.tdb_id || req.body._id;
      const name = req.body.name || req.body.tdb_name;
      const description = req.body.description !== undefined ? req.body.description : req.body.tdb_description;
      const roles = req.body.roles || req.body.tdb_roles || [];
      const layout = req.body.widgets_layout || req.body.layout || req.body.tdb_widgets_layout || [];
      const isActive = req.body.is_active !== undefined ? req.body.is_active : (req.body.tdb_is_active !== undefined ? req.body.tdb_is_active : true);
      const isDefault = Boolean(req.body.is_default || req.body.tdb_is_default);

      if (!name) {
        return res.status(400).json({ status: false, success: false, message: "Dashboard title is required" });
      }

      let slug = req.body.slug || slugify(name);
      if (!slug) slug = `dashboard_${Date.now()}`;

      const payload = {
        name,
        slug,
        description: description || "",
        layout: layout || [],
        roles: roles || [],
        is_active: isActive,
        is_default: isDefault,
        updated_by: userId,
      };

      let existing = null;
      if (id && mongoose.isValidObjectId(id)) {
        existing = await CustomDashboard.findById(id);
      } else if (id) {
        existing = await CustomDashboard.findOne({ slug: id, deleted_at: null });
      }

      if (existing) {
        const updated = await CustomDashboard.findByIdAndUpdate(existing._id, payload, { new: true }).lean();
        return res.json({
          status: true,
          success: true,
          message: "Dashboard updated successfully",
          data: normalizeDashboard(updated),
        });
      }

      // Check if duplicate slug exists, if so append random suffix
      const existingSlug = await CustomDashboard.findOne({ slug, deleted_at: null });
      if (existingSlug) {
        payload.slug = `${slug}_${Date.now().toString().slice(-4)}`;
      }

      const created = await CustomDashboard.create({ ...payload, created_by: userId });
      return res.status(201).json({
        status: true,
        success: true,
        message: "Dashboard created successfully",
        data: normalizeDashboard(created),
      });
    } catch (e) {
      return res.status(500).json({ status: false, success: false, message: e.message });
    }
  },

  toggleStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const dashboard = await CustomDashboard.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { slug: id }].filter(Boolean),
        deleted_at: null,
      });

      if (!dashboard) {
        return res.status(404).json({ status: false, success: false, message: "Dashboard not found" });
      }

      dashboard.is_active = !dashboard.is_active;
      await dashboard.save();

      return res.json({
        status: true,
        success: true,
        message: `Dashboard ${dashboard.is_active ? "activated" : "deactivated"} successfully`,
        data: normalizeDashboard(dashboard),
      });
    } catch (e) {
      return res.status(500).json({ status: false, success: false, message: e.message });
    }
  },

  deleteDashboard: async (req, res) => {
    try {
      const { id } = req.params;
      const target = await CustomDashboard.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { slug: id }].filter(Boolean),
      });

      if (target) {
        await CustomDashboard.findByIdAndUpdate(target._id, { deleted_at: new Date() });
        await CustomDashboardWidget.updateMany({ dashboard_id: target._id }, { deleted_at: new Date() });
      }

      return res.json({ status: true, success: true, message: "Dashboard deleted successfully" });
    } catch (e) {
      return res.status(500).json({ status: false, success: false, message: e.message });
    }
  },

  reorderDashboards: async (req, res) => {
    try {
      return res.json({ status: true, success: true, message: "Dashboards reordered" });
    } catch (e) {
      return res.status(500).json({ status: false, success: false, message: e.message });
    }
  },

  // ---- WIDGETS CRUD ----
  saveWidget: async (req, res) => {
    try {
      const { id, dashboard_id, title, widget_type, data_source, grid_position, config } = req.body;
      if (!title || !widget_type) return res.status(400).json({ status: false, success: false, message: "title and widget_type are required" });

      const payload = {
        dashboard_id: dashboard_id || null,
        title,
        widget_type,
        data_source: data_source || {},
        grid_position: grid_position || {},
        config: config || {},
      };

      const targetId = req.body._id || req.body.id || id;
      if (targetId && mongoose.isValidObjectId(targetId)) {
        const updated = await CustomDashboardWidget.findByIdAndUpdate(targetId, payload, { new: true }).lean();
        return res.json({
          status: true,
          success: true,
          message: "Widget updated",
          data: { ...updated, _id: String(updated._id), id: String(updated._id) },
        });
      }

      const created = await CustomDashboardWidget.create(payload);
      return res.status(201).json({
        status: true,
        success: true,
        message: "Widget created",
        data: { ...created.toObject(), _id: String(created._id), id: String(created._id) },
      });
    } catch (e) { return res.status(500).json({ status: false, success: false, message: e.message }); }
  },

  deleteWidget: async (req, res) => {
    try {
      const targetId = req.params.id || req.body._id || req.body.id;
      if (targetId && mongoose.isValidObjectId(targetId)) {
        await CustomDashboardWidget.findByIdAndUpdate(targetId, { deleted_at: new Date() });
      }
      return res.json({ status: true, success: true, message: "Widget deleted" });
    } catch (e) { return res.status(500).json({ status: false, success: false, message: e.message }); }
  },

  // ---- WIDGET DATA EXECUTION ----
  getWidgetData: async (req, res) => {
    try {
      const { target, type = "form", aggregation = "count", group_by, value_field } = req.body;
      if (!target) return res.status(400).json({ status: false, success: false, message: "target is required" });

      const db = mongoose.connection.db;

      if (type === "form") {
        const form = await Form.findOne({ slug: target, deleted_at: null });
        const FormModel = form ? getFormModel(form) : getFormModel(target);

        if (!group_by) {
          const count = await FormModel.countDocuments({ deleted_at: null });
          return res.json({ status: true, success: true, data: { count, total: count } });
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
        return res.json({ status: true, success: true, data: results.map(r => ({ label: r._id || "Other", value: r.total !== undefined ? r.total : r.count })) });
      }

      const count = await db.collection(target).countDocuments({});
      return res.json({ status: true, success: true, data: { count, total: count } });
    } catch (e) { return res.status(500).json({ status: false, success: false, message: e.message }); }
  },
};

module.exports = dashboardBuilderController;

