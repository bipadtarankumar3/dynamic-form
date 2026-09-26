// mongo-server/src/models/VolunteeringStoryLike.model.js
const mongoose = require("mongoose");

const VolunteeringStoryLikeSchema = new mongoose.Schema(
  {
    story_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    event_id: { type: mongoose.Schema.Types.Mixed, default: null },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    emp_id: { type: String, default: null },
    user_name: { type: String, default: "" },
    user_avatar: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

VolunteeringStoryLikeSchema.index({ story_id: 1, user_id: 1 });
VolunteeringStoryLikeSchema.index({ story_id: 1, emp_id: 1 });

module.exports = mongoose.models.VolunteeringStoryLike || mongoose.model("VolunteeringStoryLike", VolunteeringStoryLikeSchema);
