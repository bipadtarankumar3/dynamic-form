// mongo-server/src/models/Document.model.js
const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    form_slug: {
      type: String,
      required: true,
      index: true,
    },
    record_id: {
      type: String,
      required: true,
      index: true,
    },
    section_slug: {
      type: String,
      default: null,
    },
    field_key: {
      type: String,
      default: null,
    },
    row_id: {
      type: String,
      default: null,
    },
    doc_title: {
      type: String,
      default: "",
    },
    original_name: {
      type: String,
      default: "",
    },
    file_name: {
      type: String,
      required: true,
    },
    file_path: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      default: 0,
    },
    mime_type: {
      type: String,
      default: "",
    },
    doc_ext: {
      type: String,
      default: "",
    },
    doc_purpose: {
      type: String,
      default: "document",
    },
    remarks: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

DocumentSchema.index({ form_slug: 1, record_id: 1, deleted_at: 1 });

module.exports = mongoose.models.Document || mongoose.model("Document", DocumentSchema);
