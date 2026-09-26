// mongo-server/src/modules/workflow/workflow.controller.js
const WorkflowDef = require("../../models/WorkflowDef.model");
const WorkflowInstance = require("../../models/WorkflowInstance.model");
const Form = require("../../models/Form.model");
const AuditLog = require("../../models/AuditLog.model");
const { getFormModel } = require("../../utils/formCollection.util");

const workflowController = {
  // ---- DEFINITIONS ----
  listDefs: async (req, res) => {
    try {
      const defs = await WorkflowDef.find({ deleted_at: null }).sort({ created_at: -1 });
      return res.json({ success: true, count: defs.length, data: defs });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getDef: async (req, res) => {
    try {
      const { slug } = req.params;
      const def = await WorkflowDef.findOne({ slug, deleted_at: null });
      if (!def) return res.status(404).json({ success: false, message: "Workflow definition not found" });
      return res.json({ success: true, data: def });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  saveDef: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { slug, name, form_slug, trigger_form, steps, rules, description, is_active } = req.body;
      if (!slug || !name) return res.status(400).json({ success: false, message: "slug and name are required" });

      const payload = {
        name,
        form_slug: form_slug || trigger_form || null,
        description: description || "",
        steps: steps || [],
        rules: rules || [],
        is_active: is_active !== false,
        updated_by: userId,
      };

      const existing = await WorkflowDef.findOne({ slug, deleted_at: null });
      if (existing) {
        const updated = await WorkflowDef.findByIdAndUpdate(existing._id, payload, { new: true });
        return res.json({ success: true, message: "Workflow updated", data: updated });
      }
      const def = await WorkflowDef.create({ ...payload, slug, created_by: userId });
      return res.status(201).json({ success: true, message: "Workflow created", data: def });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteDef: async (req, res) => {
    try {
      const { slug } = req.params;
      await WorkflowDef.findOneAndUpdate({ slug, deleted_at: null }, { deleted_at: new Date() });
      return res.json({ success: true, message: "Workflow definition deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ---- INSTANCES ----
  listInstances: async (req, res) => {
    try {
      const { form_slug, status } = req.query;
      const query = { deleted_at: null };
      if (form_slug) query.form_slug = form_slug;
      if (status) query.status = status;

      const instances = await WorkflowInstance.find(query)
        .populate("workflow_def_id", "name slug")
        .populate("submitted_by", "name email")
        .sort({ created_at: -1 });

      return res.json({ success: true, count: instances.length, data: instances });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getInstance: async (req, res) => {
    try {
      const { id } = req.params;
      const instance = await WorkflowInstance.findById(id)
        .populate("workflow_def_id")
        .populate("submitted_by", "name email");
      if (!instance) return res.status(404).json({ success: false, message: "Workflow instance not found" });
      return res.json({ success: true, data: instance });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Initiate workflow
  initiateWorkflow: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, record_id, workflow_slug } = req.body;
      if (!form_slug || !record_id) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const form = await Form.findOne({ slug: form_slug, deleted_at: null });
      const FormModel = form ? getFormModel(form) : getFormModel(form_slug);

      const record = await FormModel.findOne({ _id: record_id, deleted_at: null });
      if (!record) return res.status(404).json({ success: false, message: "Form record not found" });

      const wfQuery = workflow_slug
        ? { slug: workflow_slug, deleted_at: null }
        : { form_slug, is_active: true, deleted_at: null };

      const workflow = await WorkflowDef.findOne(wfQuery);
      if (!workflow) return res.status(400).json({ success: false, message: "No active workflow found for this form" });

      const existingInstance = await WorkflowInstance.findOne({ record_id, form_slug, deleted_at: null, status: "pending" });
      if (existingInstance) return res.status(400).json({ success: false, message: "A workflow is already in progress for this record" });

      const instance = await WorkflowInstance.create({
        workflow_def_id: workflow._id,
        form_slug,
        record_id,
        current_step: 1,
        status: "pending",
        submitted_by: userId,
        history: [
          {
            step: 1,
            action: "submitted",
            actor_id: userId,
            actor_name: req.user?.name || "User",
            comments: "Workflow initiated",
            timestamp: new Date(),
          },
        ],
      });

      await FormModel.findByIdAndUpdate(record_id, { status: "pending", "data.workflow_status": "pending" });
      await AuditLog.create({ action: "workflow_initiate", module: form_slug, record_id, user_id: userId });

      return res.status(201).json({ success: true, message: "Workflow initiated", data: instance });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Approve / Reject / Return
  actionStep: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { instance_id, action, comment } = req.body;
      if (!instance_id || !action) return res.status(400).json({ success: false, message: "instance_id and action are required" });

      const instance = await WorkflowInstance.findOne({ _id: instance_id, deleted_at: null }).populate("workflow_def_id");
      if (!instance) return res.status(404).json({ success: false, message: "Workflow instance not found" });

      const workflow = instance.workflow_def_id;
      const totalSteps = workflow?.steps?.length || 1;

      let newStatus = instance.status;
      let newStep = instance.current_step;

      if (action === "approved" || action === "approve") {
        if (instance.current_step >= totalSteps) {
          newStatus = "approved";
        } else {
          newStep = instance.current_step + 1;
        }
      } else if (action === "rejected" || action === "reject") {
        newStatus = "rejected";
      } else if (action === "returned" || action === "return") {
        newStatus = "returned";
      }

      instance.history.push({
        step: instance.current_step,
        action: action,
        actor_id: userId,
        actor_name: req.user?.name || "Approver",
        comments: comment || "",
        timestamp: new Date(),
      });

      await WorkflowInstance.findByIdAndUpdate(instance_id, {
        current_step: newStep,
        status: newStatus,
        history: instance.history,
      });

      const form = await Form.findOne({ slug: instance.form_slug, deleted_at: null });
      const FormModel = form ? getFormModel(form) : getFormModel(instance.form_slug);
      await FormModel.findByIdAndUpdate(instance.record_id, { status: newStatus, "data.workflow_status": newStatus });

      await AuditLog.create({ action: `workflow_${action}`, module: instance.form_slug, record_id: instance.record_id, user_id: userId, description: comment || "" });

      return res.json({ success: true, message: `Workflow step ${action}`, status: newStatus });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = workflowController;
