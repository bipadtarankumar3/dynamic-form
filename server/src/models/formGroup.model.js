const { sequelize, DataTypes } = require("../config/db.config");

const FormGroupModel = sequelize.define(
  "t_form_group",
  {
    tfg_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: true,
    },
    tfg_slug: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tfg_from_group_details: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    tfg_is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    tfg_created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    tfg_updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    tfg_created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    tfg_updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    tfg_deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    createdAt: "tfg_created_at",
    updatedAt: "tfg_updated_at",
    deletedAt: "tfg_deleted_at",
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

module.exports = FormGroupModel;
