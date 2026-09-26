const { sequelize, DataTypes } = require("../config/db.config");

const FieldPermissionModel = sequelize.define(
  "t_field_permissions",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    form_slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    field_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    can_view: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    can_edit: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
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

module.exports = FieldPermissionModel;
