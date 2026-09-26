// mongo-server/src/models/VolunteeringStoryComment.model.js
const mongoose = require("mongoose");

const VolunteeringStoryCommentSchema = new mongoose.Schema(
  {
    story_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    event_id: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    emp_id: { type: String, default: null },
    user_name: { type: String, required: true },
    user_avatar: { type: String, default: null },
    user_dept: { type: String, default: "Corporate Volunteering" },
    is_attendee: { type: Boolean, default: false },
    comment_text: { type: String, required: true },
    parent_comment_id: { type: mongoose.Schema.Types.Mixed, default: null },
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

VolunteeringStoryCommentSchema.index({ story_id: 1, is_deleted: 1 });

module.exports = mongoose.models.VolunteeringStoryComment || mongoose.model("VolunteeringStoryComment", VolunteeringStoryCommentSchema);
