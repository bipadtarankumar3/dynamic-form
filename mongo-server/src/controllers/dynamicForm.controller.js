// mongo-server/src/controllers/dynamicForm.controller.js
const FormSchema = require("../models/FormSchema.model");
const FormSubmission = require("../models/FormSubmission.model");

// Create or update a dynamic form template
exports.saveSchema = async (req, res) => {
  try {
    const { formSlug, title, description, fields, version } = req.body;

    if (!formSlug || !title || !fields) {
      return res.status(400).json({
        success: false,
        message: "formSlug, title, and fields are required.",
      });
    }

    const schema = await FormSchema.findOneAndUpdate(
      { formSlug },
      { title, description, fields, version: version || 1, isActive: true },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Form schema saved successfully.",
      data: schema,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single form schema by slug
exports.getSchemaBySlug = async (req, res) => {
  try {
    const { formSlug } = req.params;
    const schema = await FormSchema.findOne({ formSlug, isActive: true });

    if (!schema) {
      return res.status(404).json({
        success: false,
        message: `Form schema '${formSlug}' not found.`,
      });
    }

    return res.status(200).json({ success: true, data: schema });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// List all form schemas
exports.listSchemas = async (req, res) => {
  try {
    const schemas = await FormSchema.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: schemas.length, data: schemas });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a form schema
exports.deleteSchema = async (req, res) => {
  try {
    const { formSlug } = req.params;
    await FormSchema.deleteOne({ formSlug });
    return res.status(200).json({ success: true, message: `Form schema '${formSlug}' deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Submit dynamic form data
exports.submitResponse = async (req, res) => {
  try {
    const { formSlug } = req.params;
    const { data, submittedBy } = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({
        success: false,
        message: "Form submission data object is required.",
      });
    }

    const schema = await FormSchema.findOne({ formSlug, isActive: true });
    if (!schema) {
      return res.status(404).json({
        success: false,
        message: `Cannot submit. Form schema '${formSlug}' does not exist.`,
      });
    }

    const submission = await FormSubmission.create({
      formSlug,
      formVersion: schema.version,
      submittedBy: submittedBy || "anonymous",
      data,
    });

    return res.status(201).json({
      success: true,
      message: "Form response submitted successfully.",
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// List submissions for a specific form
exports.getSubmissionsBySlug = async (req, res) => {
  try {
    const { formSlug } = req.params;
    const submissions = await FormSubmission.find({ formSlug }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
