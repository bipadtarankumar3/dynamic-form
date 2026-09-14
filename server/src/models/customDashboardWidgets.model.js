const { sequelize, DataTypes } = require("../config/db.config");

const CustomDashboardWidgetsModel = sequelize.define(
  "t_custom_dashboard_widgets",
  {
    tcdw_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      defaultValue: sequelize.literal(
        "('tcdw' || LPAD(NEXTVAL('t_custom_dashboard_widgets_id_seq')::TEXT, 10, '0'))"
      ),
    },
    tcdw_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tcdw_table_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tcdw_configuration: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    tcdw_chart_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    tcdw_raw_query: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tcdw_query: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tcdw_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tcdw_is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    tcdw_created_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tcdw_updated_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tcdw_created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    tcdw_updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    tcdw_deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    createdAt: "tcdw_created_at",
    updatedAt: "tcdw_updated_at",
    deletedAt: "tcdw_deleted_at",
    paranoid: false,
    freezeTableName: true,
    hooks: {
      beforeSave: async (instance) => {
        for (const key in instance.dataValues) {
          if (
            typeof instance.dataValues[key] === "string" &&
            instance.dataValues[key] !== null
          ) {
            instance.dataValues[key] = instance.dataValues[key].trim();
          }
        }
      },
    },
  }
);

const initCustomDashboardWidgetsDB = async () => {
  try {
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS t_custom_dashboard_widgets_id_seq START WITH 1 INCREMENT BY 1;
      CREATE TABLE IF NOT EXISTS public.t_custom_dashboard_widgets (
        tcdw_id varchar(255) NOT NULL DEFAULT ('tcdw'::text || lpad((nextval('t_custom_dashboard_widgets_id_seq'::regclass))::text, 10, '0'::text)),
        tcdw_title varchar(255),
        tcdw_table_name varchar(255),
        tcdw_configuration jsonb,
        tcdw_chart_type varchar(50),
        tcdw_order int4 DEFAULT 0,
        tcdw_is_active bool DEFAULT true,
        tcdw_created_by int4 DEFAULT 0,
        tcdw_updated_by int4 DEFAULT 0,
        tcdw_created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tcdw_updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tcdw_deleted_at timestamptz,
        CONSTRAINT t_custom_dashboard_widgets_pkey PRIMARY KEY (tcdw_id)
      );
      ALTER TABLE public.t_custom_dashboard_widgets ADD COLUMN IF NOT EXISTS tcdw_raw_query text;
      ALTER TABLE public.t_custom_dashboard_widgets ADD COLUMN IF NOT EXISTS tcdw_query text;
    `);

    // Drop obsolete legacy tables so deleted widgets are not re-imported
    await sequelize.query(`
      DROP TABLE IF EXISTS public.t_pivot_saved_reports CASCADE;
      DROP TABLE IF EXISTS public.t_dashboard_widgets CASCADE;
    `).catch(() => {});
  } catch (err) {
    console.error("Init t_custom_dashboard_widgets DB error:", err.message);
  }
};
initCustomDashboardWidgetsDB();

module.exports = CustomDashboardWidgetsModel;
