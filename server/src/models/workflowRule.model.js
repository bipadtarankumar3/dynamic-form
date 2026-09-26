const { sequelize, DataTypes } = require("../config/db.config");

const WorkflowRuleModel = sequelize.define(
  "t_workflow_rules",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    workflow_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "t_workflow_defs",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    rule_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "Default Rule",
    },
    conditions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    initiator_roles: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    steps: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "t_workflow_rules",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = WorkflowRuleModel;
