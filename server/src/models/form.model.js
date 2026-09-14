const { sequelize, DataTypes } = require("../config/db.config");

const FormModel = sequelize.define(
  "t_form",
  {
    form_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    root_entity: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    api: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    actions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    enable_action_tabs: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    action_tabs: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    table_columns: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    triggers: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    enable_approval: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    view_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    view_slug: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    relation_with_parent: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    relation_with_children: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    parent_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    parent_form_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    is_draft: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    modal_size: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '1400',
    },
    is_master: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
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

module.exports = FormModel;
