// mongo-server/src/models/Token.model.js
const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token:      { type: String, required: true, unique: true },
  name:       { type: String, default: "access_token" },
  deleted_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

TokenSchema.index({ token: 1 });
TokenSchema.index({ user_id: 1 });

module.exports = mongoose.model("Token", TokenSchema);
