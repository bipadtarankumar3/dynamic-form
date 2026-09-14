const { sequelize, DataTypes } = require("../config/db.config");

const MasterConfigModel = sequelize.define(
  "t_master_configs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: true,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    table_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    primary_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    label_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    is_active_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    foreign_key: {
      type: DataTypes.STRING(255),
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
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: false,
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

module.exports = MasterConfigModel;
