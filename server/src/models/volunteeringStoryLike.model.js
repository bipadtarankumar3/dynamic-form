// server/src/models/volunteeringStoryLike.model.js
const { sequelize, DataTypes } = require("../config/db.config");

const VolunteeringStoryLike = sequelize.define(
  "t_volunteering_story_likes",
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
      allowNull: true,
    },
    user_avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "t_volunteering_story_likes",
    timestamps: false,
  }
);

module.exports = VolunteeringStoryLike;
