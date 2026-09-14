// mongo-server/src/modules/workflow/workflow.controller.js
const WorkflowDef = require("../../models/WorkflowDef.model");
const WorkflowInstance = require("../../models/WorkflowInstance.model");
const FormData = require("../../models/FormData.model");
const AuditLog = require("../../models/AuditLog.model");

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
      const { slug, name, trigger_form, flow_type, has_conditions, conditions, initiator_roles, steps, is_draft } = req.body;
      if (!slug || !name) return res.status(400).json({ success: false, message: "slug and name are required" });

      const payload = { name, trigger_form, flow_type: flow_type || "normal", has_conditions: has_conditions || false, conditions: conditions || [], initiator_roles: initiator_roles || [], steps: steps || [], is_draft: is_draft || false, updated_by: userId };

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
        .populate("workflow_id", "name slug")
        .populate("initiated_by", "name email")
        .sort({ created_at: -1 });

      return res.json({ success: true, count: instances.length, data: instances });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getInstance: async (req, res) => {
    try {
      const { id } = req.params;
      const instance = await WorkflowInstance.findById(id)
        .populate("workflow_id")
        .populate("initiated_by", "name email")
        .populate("tracks.actioned_by", "name email");
      if (!instance) return res.status(404).json({ success: false, message: "Workflow instance not found" });
      return res.json({ success: true, data: instance });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Initiate workflow for a form record
  initiateWorkflow: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, record_id, workflow_slug } = req.body;
      if (!form_slug || !record_id) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const record = await FormData.findOne({ _id: record_id, form_slug, deleted_at: null });
      if (!record) return res.status(404).json({ success: false, message: "Form record not found" });

      // Find applicable workflow
      const wfQuery = workflow_slug
        ? { slug: workflow_slug, deleted_at: null }
        : { trigger_form: form_slug, is_active: true, is_draft: false, deleted_at: null };

      const workflow = await WorkflowDef.findOne(wfQuery);
      if (!workflow) return res.status(400).json({ success: false, message: "No active workflow found for this form" });

      // Check if instance already exists
      const existingInstance = await WorkflowInstance.findOne({ record_id, form_slug, deleted_at: null, status: "pending" });
      if (existingInstance) return res.status(400).json({ success: false, message: "A workflow is already in progress for this record" });

      const tracks = workflow.steps.map(step => ({
        step_number: step.step_number || step.order || 1,
        step_name: step.name || `Step ${step.step_number || 1}`,
        action: "pending",
      }));

      const instance = await WorkflowInstance.create({
        workflow_id: workflow._id,
        form_slug,
        record_id,
        current_step: 1,
        status: "pending",
        initiated_by: userId,
        tracks,
      });

      // Update form record status
      await FormData.findByIdAndUpdate(record_id, { status: "pending", "data.workflow_status": "pending" });

      await AuditLog.create({ action: "workflow_initiate", module: form_slug, record_id, user_id: userId, description: `Workflow "${workflow.name}" initiated` });

      return res.status(201).json({ success: true, message: "Workflow initiated", data: instance });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Approve / Reject / Send Back a step
  actionStep: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { instance_id, action, comment } = req.body;
      if (!instance_id || !action) return res.status(400).json({ success: false, message: "instance_id and action are required" });
      if (!["approved", "rejected", "sent_back"].includes(action)) return res.status(400).json({ success: false, message: "action must be approved, rejected, or sent_back" });

      const instance = await WorkflowInstance.findOne({ _id: instance_id, deleted_at: null }).populate("workflow_id");
      if (!instance) return res.status(404).json({ success: false, message: "Workflow instance not found" });
      if (instance.status !== "pending") return res.status(400).json({ success: false, message: "Workflow is not in pending state" });

      const currentTrack = instance.tracks.find(t => t.step_number === instance.current_step);
      if (currentTrack) {
        currentTrack.action = action;
        currentTrack.comment = comment || "";
        currentTrack.actioned_by = userId;
        currentTrack.actioned_at = new Date();
      }

      const workflow = instance.workflow_id;
      const totalSteps = workflow?.steps?.length || 1;

      let newStatus = "pending";
      let newStep = instance.current_step;

      if (action === "approved") {
        if (instance.current_step >= totalSteps) {
          newStatus = "approved";
        } else {
          newStep = instance.current_step + 1;
        }
      } else if (action === "rejected") {
        newStatus = "rejected";
      } else if (action === "sent_back") {
        newStatus = "sent_back";
      }

      await WorkflowInstance.findByIdAndUpdate(instance_id, {
        current_step: newStep,
        status: newStatus,
        tracks: instance.tracks,
      });

      // Update form data status
      await FormData.findByIdAndUpdate(instance.record_id, { status: newStatus, "data.workflow_status": newStatus });

      await AuditLog.create({ action: `workflow_${action}`, module: instance.form_slug, record_id: instance.record_id, user_id: userId, description: comment || "" });

      return res.json({ success: true, message: `Workflow step ${action}`, status: newStatus });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = workflowController;
