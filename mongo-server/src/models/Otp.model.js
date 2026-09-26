// mongo-server/src/models/Otp.model.js
const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    mobile: { type: String, default: null, trim: true },
    type: { type: String, required: true, index: true },
    value: { type: String, required: true },
    expires_at: { type: Date, required: true, index: true },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

OtpSchema.index({ email: 1, type: 1 });
OtpSchema.index({ mobile: 1, type: 1 });

module.exports = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
