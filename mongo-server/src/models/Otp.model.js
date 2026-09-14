// mongo-server/src/models/Otp.model.js
const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email:      { type: String, required: true },
  type:       { type: String, required: true }, // login_verify | forget_password
  value:      { type: String, required: true },
  expires_at: { type: Date, required: true },
  deleted_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

OtpSchema.index({ user_id: 1, type: 1 });

module.exports = mongoose.model("Otp", OtpSchema);
