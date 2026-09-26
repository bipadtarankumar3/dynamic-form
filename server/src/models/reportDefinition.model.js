const { sequelize, DataTypes } = require("../config/db.config");

const ReportDefinitionModel = sequelize.define(
  "t_report_definitions",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    query_config: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: '{}',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
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

module.exports = ReportDefinitionModel;
