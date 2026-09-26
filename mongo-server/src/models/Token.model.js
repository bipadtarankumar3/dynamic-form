// mongo-server/src/models/Token.model.js
const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    name: { type: String, default: "access_token" },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

TokenSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Token || mongoose.model("Token", TokenSchema);
