// mongo-server/src/models/ApprovalProcessTrack.model.js
const mongoose = require("mongoose");

const ApprovalProcessTrackSchema = new mongoose.Schema(
  {
    apt_id: { type: String, default: null, index: true },
    apt_type: { type: String, required: true, index: true }, // form_slug / module
    apt_item_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true }, // record_id
    apt_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    apt_user_name: { type: String, default: null },
    apt_user_role: { type: String, default: null },
    apt_accept_step: { type: String, default: null },
    apt_remarks: { type: String, default: "" },
    apt_recipient_role: { type: String, default: null },
    apt_recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    apt_recipient_name: { type: String, default: null },
    apt_accept_status: { type: String, default: null },
    apt_status_flag: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "apt_created_at", updatedAt: "apt_updated_at" },
  }
);

ApprovalProcessTrackSchema.index({ apt_type: 1, apt_item_id: 1, apt_created_at: 1 });
ApprovalProcessTrackSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.ApprovalProcessTrack ||
  mongoose.model("ApprovalProcessTrack", ApprovalProcessTrackSchema);
