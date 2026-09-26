const { sequelize, DataTypes } = require("../config/db.config");

const DashboardBuilderModel = sequelize.define(
  "t_custom_dashboards",
  {
    tdb_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      defaultValue: sequelize.literal(
        "('tdb' || LPAD(NEXTVAL('t_custom_dashboards_id_seq')::TEXT, 10, '0'))"
      ),
    },
    tdb_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tdb_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tdb_roles: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    tdb_widgets_layout: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    tdb_filters_config: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    tdb_data_scope: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'all', // 'all' (Full Access) | 'created_by' (Only records created by logged-in user)
    },
    tdb_is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    tdb_is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    tdb_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tdb_created_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tdb_updated_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tdb_created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    tdb_updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    tdb_deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    createdAt: "tdb_created_at",
    updatedAt: "tdb_updated_at",
    deletedAt: "tdb_deleted_at",
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

const initDashboardsDB = async () => {
  try {
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS t_custom_dashboards_id_seq START WITH 1 INCREMENT BY 1;
      CREATE TABLE IF NOT EXISTS public.t_custom_dashboards (
        tdb_id varchar(255) NOT NULL DEFAULT ('tdb'::text || lpad((nextval('t_custom_dashboards_id_seq'::regclass))::text, 10, '0'::text)),
        tdb_name varchar(255) NOT NULL,
        tdb_description text,
        tdb_roles jsonb DEFAULT '[]'::jsonb,
        tdb_widgets_layout jsonb DEFAULT '[]'::jsonb,
        tdb_filters_config jsonb DEFAULT '[]'::jsonb,
        tdb_data_scope varchar(50) DEFAULT 'all',
        tdb_is_active bool DEFAULT true,
        tdb_is_default bool DEFAULT false,
        tdb_order int4 DEFAULT 0,
        tdb_created_by int4 DEFAULT 0,
        tdb_updated_by int4 DEFAULT 0,
        tdb_created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tdb_updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tdb_deleted_at timestamptz,
        CONSTRAINT t_custom_dashboards_pkey PRIMARY KEY (tdb_id)
      );
      ALTER TABLE public.t_custom_dashboards ADD COLUMN IF NOT EXISTS tdb_filters_config jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.t_custom_dashboards ADD COLUMN IF NOT EXISTS tdb_data_scope varchar(50) DEFAULT 'all';
    `);
  } catch (err) {
    console.error("Init t_custom_dashboards DB error:", err.message);
  }
};
initDashboardsDB();

module.exports = DashboardBuilderModel;
