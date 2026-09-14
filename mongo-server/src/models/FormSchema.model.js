// mongo-server/src/models/FormSchema.model.js
const mongoose = require("mongoose");

const FieldOptionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
}, { _id: false });

const DependsOnSchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  equals: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const FieldSchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["text", "number", "textarea", "select", "radio", "checkbox", "date", "file", "repeatable_group"],
  },
  placeholder: { type: String, default: "" },
  defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
  required: { type: Boolean, default: false },
  options: [FieldOptionSchema],
  dependsOn: DependsOnSchema,
  validation: {
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String },
  },
  fields: [mongoose.Schema.Types.Mixed],
}, { _id: false });

const FormSchemaDef = new mongoose.Schema(
  {
    formSlug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    fields: [FieldSchema],
    createdBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FormSchema", FormSchemaDef);
