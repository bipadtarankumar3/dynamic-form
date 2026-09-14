const { sequelize, Op } = require("../../../config/db.config");
const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const DashboardBuilderModel = require("../../../models/dashboardBuilder.model");

// ---------------------------------------------------------------------------
// Auto-create the t_custom_dashboards table + sequence on server start
// ---------------------------------------------------------------------------
const initDB = async () => {
  try {
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS t_custom_dashboards_id_seq;
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.t_custom_dashboards
      (
          tdb_id character varying(255) COLLATE pg_catalog."default" NOT NULL
            DEFAULT ('tdb'::text || lpad((nextval('t_custom_dashboards_id_seq'::regclass))::text, 10, '0'::text)),
          tdb_name character varying(255) NOT NULL,
          tdb_description text,
          tdb_roles jsonb DEFAULT '[]'::jsonb,
          tdb_widgets_layout jsonb DEFAULT '[]'::jsonb,
          tdb_filters_config jsonb DEFAULT '[]'::jsonb,
          tdb_is_active boolean DEFAULT true,
          tdb_is_default boolean DEFAULT false,
          tdb_order integer DEFAULT 0,
          tdb_created_by integer DEFAULT 0,
          tdb_updated_by integer DEFAULT 0,
          tdb_created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          tdb_updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          tdb_deleted_at timestamp with time zone,
          CONSTRAINT t_custom_dashboards_pkey PRIMARY KEY (tdb_id)
      )
    `);
    await sequelize.query(`
      ALTER TABLE public.t_custom_dashboards ADD COLUMN IF NOT EXISTS tdb_filters_config jsonb DEFAULT '[]'::jsonb;
    `);
    console.log("t_custom_dashboards table initialized.");
  } catch (error) {
    console.error("Error initializing t_custom_dashboards table:", error.message);
  }
};
initDB();

const dashboardBuilderController = {
  // Get all active / configurator dashboards
  getDashboards: async (req, res, next) => {
    try {
      const { role_id, search, isConfigurator } = req.query;
      const whereClause = {
        tdb_deleted_at: null,
      };

      if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
        whereClause.tdb_is_active = true;
      }

      if (search && search.trim()) {
        whereClause.tdb_name = {
          [Op.iLike]: `%${search.trim()}%`,
        };
      }

      const dashboards = await DashboardBuilderModel.findAll({
        where: whereClause,
        order: [
          ["tdb_order", "ASC"],
          ["tdb_created_at", "DESC"],
        ],
      });

      // Filter by role if specified and not empty
      let result = dashboards;
      if (role_id && role_id !== "all") {
        const targetRoleId = isNaN(Number(role_id)) ? role_id : Number(role_id);
        result = dashboards.filter((d) => {
          const roles = d.tdb_roles || [];
          if (!roles || roles.length === 0) return true; // Available for all if empty
          return roles.some((r) => {
            if (typeof r === "object" && r !== null) {
              return (
                r.role_id === targetRoleId ||
                String(r.role_id) === String(targetRoleId) ||
                r.id === targetRoleId ||
                String(r.id) === String(targetRoleId) ||
                r.value === targetRoleId ||
                String(r.value) === String(targetRoleId)
              );
            }
            return r === targetRoleId || String(r) === String(targetRoleId);
          });
        });
      }

      return res.status(200).json({
        status: true,
        message: "Dashboards fetched successfully",
        data: result,
      });
    } catch (err) {
      console.error("getDashboards error:", err);
      return next(CustomErrorHandler.serverError(err.message));
    }
  },

  // Get single dashboard by ID
  getDashboardById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const dashboard = await DashboardBuilderModel.findOne({
        where: {
          tdb_id: id,
          tdb_deleted_at: null,
        },
      });

      if (!dashboard) {
        return next(CustomErrorHandler.notFound("Dashboard not found"));
      }

      return res.status(200).json({
        status: true,
        message: "Dashboard fetched successfully",
        data: dashboard,
      });
    } catch (err) {
      console.error("getDashboardById error:", err);
      return next(CustomErrorHandler.serverError(err.message));
    }
  },

  // Create new Dashboard
  createDashboard: async (req, res, next) => {
    try {
      const {
        name,
        description,
        roles = [],
        widgets_layout = [],
        filters_config = [],
        data_scope = 'all',
        is_active = true,
        is_default = false,
      } = req.body;

      if (!name || !name.trim()) {
        return next(CustomErrorHandler.badRequest("Dashboard name is required"));
      }

      const count = await DashboardBuilderModel.count({
        where: { tdb_deleted_at: null },
      });

      const newDashboard = await DashboardBuilderModel.create({
        tdb_name: name.trim(),
        tdb_description: description || "",
        tdb_roles: Array.isArray(roles) ? roles : [],
        tdb_widgets_layout: Array.isArray(widgets_layout) ? widgets_layout : [],
        tdb_filters_config: Array.isArray(filters_config) ? filters_config : [],
        tdb_data_scope: data_scope || 'all',
        tdb_is_active: is_active ?? true,
        tdb_is_default: is_default ?? false,
        tdb_order: count + 1,
        tdb_created_by: req.user?.id || 0,
        tdb_updated_by: req.user?.id || 0,
      });

      return res.status(201).json({
        status: true,
        message: "Dashboard created successfully",
        data: newDashboard,
      });
    } catch (err) {
      console.error("createDashboard error:", err);
      return next(CustomErrorHandler.serverError(err.message));
    }
  },

  // Update existing Dashboard
  updateDashboard: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        roles,
        widgets_layout,
        filters_config,
        data_scope,
        is_active,
        is_default,
        order,
      } = req.body;

      const dashboard = await DashboardBuilderModel.findOne({
        where: {
          tdb_id: id,
          tdb_deleted_at: null,
        },
      });

      if (!dashboard) {
        return next(CustomErrorHandler.notFound("Dashboard not found"));
      }

      if (name !== undefined) dashboard.tdb_name = name.trim();
      if (description !== undefined) dashboard.tdb_description = description;
      if (roles !== undefined) {
        dashboard.tdb_roles = roles;
        dashboard.changed('tdb_roles', true);
      }
      if (widgets_layout !== undefined) {
        dashboard.tdb_widgets_layout = widgets_layout;
        dashboard.changed('tdb_widgets_layout', true);
      }
      if (filters_config !== undefined) {
        dashboard.tdb_filters_config = filters_config;
        dashboard.changed('tdb_filters_config', true);
      }
      if (data_scope !== undefined) dashboard.tdb_data_scope = data_scope;
      if (is_active !== undefined) dashboard.tdb_is_active = is_active;
      if (is_default !== undefined) dashboard.tdb_is_default = is_default;
      if (order !== undefined) dashboard.tdb_order = order;
      dashboard.tdb_updated_by = req.user?.id || 0;

      await dashboard.save();

      return res.status(200).json({
        status: true,
        message: "Dashboard updated successfully",
        data: dashboard,
      });
    } catch (err) {
      console.error("updateDashboard error:", err);
      return next(CustomErrorHandler.serverError(err.message));
    }
  },

  // Toggle active status
  toggleStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const dashboard = await DashboardBuilderModel.findOne({
        where: {
          tdb_id: id,
          tdb_deleted_at: null,
        },
      });

      if (!dashboard) {
        return next(CustomErrorHandler.notFound("Dashboard not found"));
      }

      dashboard.tdb_is_active = !dashboard.tdb_is_active;
      dashboard.tdb_updated_by = req.user?.id || 0;
      await dashboard.save();

      return res.status(200).json({
        status: true,
        message: `Dashboard ${dashboard.tdb_is_active ? "activated" : "deactivated"} successfully`,
        data: dashboard,
      });
    } catch (err) {
      console.error("toggleStatus error:", err);
      return next(CustomErrorHandler.serverError(err.message));
    }
  },

  // Soft delete dashboard
  deleteDashboard: async (req, res, next) => {
    try {
      const { id } = req.params;
      const dashboard = await DashboardBuilderModel.findOne({
        where: {
          tdb_id: id,
          tdb_deleted_at: null,
        },
      });

      if (!dashboard) {
        return next(CustomErrorHandler.notFound("Dashboard not found"));
      }

      dashboard.tdb_deleted_at = new Date();
      dashboard.tdb_updated_by = req.user?.id || 0;
      await dashboard.save();

      return res.status(200).json({
        status: true,
        message: "Dashboard deleted successfully",
      });
    } catch (err) {
      console.error("deleteDashboard error:", err);
      return next(CustomErrorHandler.serverError(err.message));
    }
  },

  // Reorder dashboards
  reorderDashboards: async (req, res, next) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return next(CustomErrorHandler.badRequest("Items array is required"));
      }

      for (const item of items) {
        if (item.id && item.order !== undefined) {
          await DashboardBuilderModel.update(
            { tdb_order: item.order, tdb_updated_by: req.user?.id || 0 },
            { where: { tdb_id: item.id } }
          );
        }
      }

      return res.status(200).json({
        status: true,
        message: "Dashboards reordered successfully",
      });
    } catch (err) {
      console.error("reorderDashboards error:", err);
      return next(CustomErrorHandler.serverError(err.message));
    }
  },
};

module.exports = dashboardBuilderController;
