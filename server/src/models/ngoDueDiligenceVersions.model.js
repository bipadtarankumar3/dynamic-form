const { sequelize, DataTypes } = require("../config/db.config");

const NgoDueDiligenceVersionsModel = sequelize.define(
  "t_ngo_due_diligence_versions",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    form_slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "due_diligence",
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "UNDER_REVIEW",
    },
    change_summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approval_track: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_ngo_dd_versions_user_form_ver",
        fields: ["user_id", "form_slug", "version_number"],
      },
    ],
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

// Auto-sync table schema with PostgreSQL database
const autoSyncDB = async () => {
  try {
    await NgoDueDiligenceVersionsModel.sync({ alter: true });
    console.log("✅ t_ngo_due_diligence_versions synchronized successfully");
  } catch (err) {
    console.error("Auto-sync t_ngo_due_diligence_versions error:", err.message);
  }
};
autoSyncDB();

module.exports = NgoDueDiligenceVersionsModel;
