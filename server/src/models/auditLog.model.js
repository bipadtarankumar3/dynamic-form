const { sequelize, DataTypes } = require("../config/db.config");

const AuditLogModel = sequelize.define(
  "t_audit_logs",
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
    user_email: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    user_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    role_slug: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    table_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    record_id: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    old_value: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    new_value: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    browser: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    endpoint: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
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

module.exports = AuditLogModel;
