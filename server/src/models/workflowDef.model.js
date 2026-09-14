const { sequelize, DataTypes } = require("../config/db.config");

const WorkflowDefinitionModel = sequelize.define(
  "t_workflow_defs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    trigger_form: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    flow_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "normal",
    },
    has_conditions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_draft: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Legacy support fields
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
    tableName: "t_workflow_defs",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Associations
const WorkflowRuleModel = require("./workflowRule.model");
const WorkflowInstanceModel = require("./workflowInstance.model");

WorkflowDefinitionModel.hasMany(WorkflowRuleModel, {
  foreignKey: "workflow_id",
  as: "rules",
  onDelete: "CASCADE",
});

WorkflowRuleModel.belongsTo(WorkflowDefinitionModel, {
  foreignKey: "workflow_id",
  as: "workflow",
});

WorkflowDefinitionModel.hasMany(WorkflowInstanceModel, {
  foreignKey: "workflow_id",
  as: "instances",
});

WorkflowInstanceModel.belongsTo(WorkflowDefinitionModel, {
  foreignKey: "workflow_id",
  as: "workflow",
});

module.exports = WorkflowDefinitionModel;
