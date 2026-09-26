const { sequelize, DataTypes } = require("../config/db.config");

const NotificationsModel = sequelize.define(
  "t_notifications",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'info',
    },
    link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    event_key: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    ref_table: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    ref_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
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

module.exports = NotificationsModel;
