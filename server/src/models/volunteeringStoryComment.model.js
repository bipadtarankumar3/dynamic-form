// server/src/models/volunteeringStoryComment.model.js
const { sequelize, DataTypes } = require("../config/db.config");

const VolunteeringStoryComment = sequelize.define(
  "t_volunteering_story_comments",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    story_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    parent_comment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    emp_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    user_avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_dept: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_attendee: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    comment_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "t_volunteering_story_comments",
    timestamps: false,
  }
);

module.exports = VolunteeringStoryComment;
