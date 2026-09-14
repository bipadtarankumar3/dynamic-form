const { sequelize, DataTypes } = require("../config/db.config");

const PivotSavedReportsModel = sequelize.define(
  "t_pivot_saved_reports",
  {
    tpsr_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      defaultValue: sequelize.literal(
        "('tpsr' || LPAD(NEXTVAL('t_pivot_saved_reports_id_seq')::TEXT, 10, '0'))"
      ),
    },
    tpsr_report_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tpsr_table_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tpsr_configuration: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    tpsr_chart_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    tpsr_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tpsr_is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    tpsr_created_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tpsr_updated_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tpsr_created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    tpsr_updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    tpsr_deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    createdAt: "tpsr_created_at",
    updatedAt: "tpsr_updated_at",
    deletedAt: "tpsr_deleted_at",
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

const initPivotReportsDB = async () => {
  try {
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS t_pivot_saved_reports_id_seq START WITH 1 INCREMENT BY 1;
      CREATE TABLE IF NOT EXISTS public.t_pivot_saved_reports (
        tpsr_id varchar(255) NOT NULL DEFAULT ('tpsr'::text || lpad((nextval('t_pivot_saved_reports_id_seq'::regclass))::text, 10, '0'::text)),
        tpsr_report_name varchar(255),
        tpsr_table_name varchar(255),
        tpsr_configuration jsonb,
        tpsr_chart_type varchar(50),
        tpsr_order int4 DEFAULT 0,
        tpsr_is_active bool DEFAULT true,
        tpsr_created_by int4 DEFAULT 0,
        tpsr_updated_by int4 DEFAULT 0,
        tpsr_created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tpsr_updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tpsr_deleted_at timestamptz,
        CONSTRAINT t_pivot_saved_reports_pkey PRIMARY KEY (tpsr_id)
      );
    `);
  } catch (err) {
    console.error("Init t_pivot_saved_reports DB error:", err.message);
  }
};
initPivotReportsDB();

module.exports = PivotSavedReportsModel;
