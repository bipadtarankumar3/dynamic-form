const { sequelize, DataTypes } = require("../config/db.config");

const ApprovalProcessTrackModel = sequelize.define(
  "t_approval_process_track",
  {
    apt_id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false,
    },
    apt_type: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apt_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    apt_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    apt_user_role: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apt_accept_step: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apt_remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    apt_recipient_role: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apt_recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    apt_accept_status: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apt_status_flag: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apt_created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    apt_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    apt_deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    apt_created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    apt_updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    timestamps: false,
    tableName: "t_approval_process_track",
    freezeTableName: true,
  }
);

module.exports = ApprovalProcessTrackModel;
