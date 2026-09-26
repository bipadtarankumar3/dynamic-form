// server/src/models/volunteeringStory.model.js
const { sequelize, DataTypes } = require("../config/db.config");

const VolunteeringStory = sequelize.define(
  "t_volunteering_impact_story",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    story_title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    story_slug: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    author_name: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "CSR Communications Team",
    },
    author_role: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "CSR Impact Lead",
    },
    cover_image: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    story_content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    impact_highlights: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    featured_quote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quote_attribution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gallery_images: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Published",
    },
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    allow_likes: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    show_likes: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    allow_comments: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    show_comments: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "t_volunteering_impact_story",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
  }
);

module.exports = VolunteeringStory;
