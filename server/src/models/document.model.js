const { sequelize, DataTypes } = require("../config/db.config");

const DocumentModel = sequelize.define(
  "t_documents",
  {
    tdoc_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
    },
    final_doc_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    doc_title: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    doc_type: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_path: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_original_path: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    doc_ext: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    doc_purpose: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    s3_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    s3_bucket: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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

module.exports = DocumentModel;
