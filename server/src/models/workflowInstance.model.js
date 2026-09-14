const { sequelize, DataTypes } = require("../config/db.config");

const WorkflowInstanceModel = sequelize.define(
  "t_workflow_instances",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    workflow_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "t_workflow_defs",
        key: "id",
      },
    },
    rule_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "t_workflow_rules",
        key: "id",
      },
    },
    record_table: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    record_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    current_step: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "pending",
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    history: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    wfi_step_assignments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
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
    tableName: "t_workflow_instances",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Associations
const WorkflowRuleModel = require("./workflowRule.model");

WorkflowRuleModel.hasMany(WorkflowInstanceModel, {
  foreignKey: "rule_id",
  as: "instances",
});

WorkflowInstanceModel.belongsTo(WorkflowRuleModel, {
  foreignKey: "rule_id",
  as: "rule",
});

module.exports = WorkflowInstanceModel;
