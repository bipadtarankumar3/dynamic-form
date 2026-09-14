// mongo-server/src/models/Setting.model.js
const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema({
  key:        { type: String, required: true, unique: true, trim: true },
  value:      { type: mongoose.Schema.Types.Mixed, default: null },
  label:      { type: String, default: "" },
  group:      { type: String, default: "general" },
  is_public:  { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

SettingSchema.index({ key: 1 });

module.exports = mongoose.model("Setting", SettingSchema);
