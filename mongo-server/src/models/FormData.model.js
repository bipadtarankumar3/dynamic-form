// mongo-server/src/models/FormData.model.js
// Stores all dynamic form submissions — one collection for all forms,
// differentiated by form_slug. data field is Schema.Types.Mixed to allow any structure.
const mongoose = require("mongoose");

const FormDataSchema = new mongoose.Schema({
  form_slug:    { type: String, required: true, index: true },
  form_version: { type: Number, default: 1 },
  parent_id:    { type: mongoose.Schema.Types.ObjectId, default: null }, // for child forms
  status:       { type: String, default: "draft", enum: ["draft", "submit", "approved", "rejected"] },
  data:         { type: mongoose.Schema.Types.Mixed, required: true },
  created_by:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updated_by:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  deleted_at:   { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

FormDataSchema.index({ form_slug: 1, deleted_at: 1 });
FormDataSchema.index({ form_slug: 1, status: 1 });
FormDataSchema.index({ form_slug: 1, created_at: -1 });

module.exports = mongoose.model("FormData", FormDataSchema);
