// mongo-server/src/models/VolunteeringStory.model.js
const mongoose = require("mongoose");

const VolunteeringStorySchema = new mongoose.Schema(
  {
    event_id: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    parent_id: { type: mongoose.Schema.Types.Mixed, default: null },
    story_title: { type: String, required: true, trim: true },
    story_slug: { type: String, required: true, trim: true, index: true },
    author_name: { type: String, default: "" },
    author_role: { type: String, default: "CSR Impact Lead" },
    cover_image: { type: String, default: null },
    excerpt: { type: String, default: "" },
    story_content: { type: String, default: "" },
    impact_highlights: { type: Array, default: [] },
    featured_quote: { type: String, default: "" },
    quote_attribution: { type: String, default: "" },
    gallery_images: { type: Array, default: [] },
    tags: { type: Array, default: [] },
    status: { type: String, default: "Published", index: true },
    read_time_minutes: { type: Number, default: 3 },
    allow_likes: { type: Boolean, default: true },
    show_likes: { type: Boolean, default: true },
    allow_comments: { type: Boolean, default: true },
    show_comments: { type: Boolean, default: true },
    published_at: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

VolunteeringStorySchema.index({ event_id: 1, deleted_at: 1 });
VolunteeringStorySchema.index({ status: 1, deleted_at: 1 });

module.exports = mongoose.models.VolunteeringStory || mongoose.model("VolunteeringStory", VolunteeringStorySchema);
