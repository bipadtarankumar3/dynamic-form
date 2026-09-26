// mongo-server/src/modules/form-approval/formApproval.controller.js
const WorkflowInstance = require("../../models/WorkflowInstance.model");
const WorkflowDef = require("../../models/WorkflowDef.model");
const Form = require("../../models/Form.model");
const AuditLog = require("../../models/AuditLog.model");
const { getFormModel } = require("../../utils/formCollection.util");

const formApprovalController = {
  // Get approval status and history for a form record
  getApprovalStatus: async (req, res) => {
    try {
      const { form_slug, record_id } = req.query;
      if (!form_slug || !record_id) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const instance = await WorkflowInstance.findOne({ form_slug, record_id, deleted_at: null })
        .populate("workflow_def_id")
        .populate("submitted_by", "name email");

      return res.json({
        success: true,
        data: instance || { status: "not_started", history: [] },
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Submit record for approval
  submitForApproval: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, record_id, comments } = req.body;
      if (!form_slug || !record_id) return res.status(400).json({ success: false, message: "form_slug and record_id are required" });

      const form = await Form.findOne({ slug: form_slug, deleted_at: null });
      const FormModel = form ? getFormModel(form) : getFormModel(form_slug);

      const record = await FormModel.findOne({ _id: record_id, deleted_at: null });
      if (!record) return res.status(404).json({ success: false, message: "Record not found" });

      let workflow = await WorkflowDef.findOne({ form_slug, is_active: true, deleted_at: null });
      if (!workflow) {
        workflow = await WorkflowDef.findOne({ is_active: true, deleted_at: null });
      }

      let instance = await WorkflowInstance.findOne({ form_slug, record_id, deleted_at: null });
      if (!instance) {
        instance = await WorkflowInstance.create({
          workflow_def_id: workflow?._id,
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
              comments: comments || "Submitted for approval",
              timestamp: new Date(),
            },
          ],
        });
      } else {
        instance.status = "pending";
        instance.current_step = 1;
        instance.history.push({
          step: 1,
          action: "submitted",
          actor_id: userId,
          actor_name: req.user?.name || "User",
          comments: comments || "Resubmitted for approval",
          timestamp: new Date(),
        });
        await instance.save();
      }

      await FormModel.findByIdAndUpdate(record_id, { status: "pending", "data.status": "pending" });
      await AuditLog.create({ action: "submit_for_approval", module: form_slug, record_id, user_id: userId, description: comments });

      return res.json({ success: true, message: "Submitted for approval", data: instance });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // Perform step action (approve / reject / return)
  performAction: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { form_slug, record_id, action, comments } = req.body;
      if (!form_slug || !record_id || !action) return res.status(400).json({ success: false, message: "form_slug, record_id, and action are required" });

      const instance = await WorkflowInstance.findOne({ form_slug, record_id, deleted_at: null }).populate("workflow_def_id");
      if (!instance) return res.status(404).json({ success: false, message: "Approval workflow not found" });

      const workflow = instance.workflow_def_id;
      const totalSteps = workflow?.steps?.length || 1;

      let newStatus = instance.status;
      let newStep = instance.current_step;

      if (action === "approve" || action === "approved") {
        if (instance.current_step >= totalSteps) {
          newStatus = "approved";
        } else {
          newStep = instance.current_step + 1;
        }
      } else if (action === "reject" || action === "rejected") {
        newStatus = "rejected";
      } else if (action === "return" || action === "returned") {
        newStatus = "returned";
      }

      instance.history.push({
        step: instance.current_step,
        action: action,
        actor_id: userId,
        actor_name: req.user?.name || "Approver",
        comments: comments || "",
        timestamp: new Date(),
      });

      instance.status = newStatus;
      instance.current_step = newStep;
      await instance.save();

      const form = await Form.findOne({ slug: form_slug, deleted_at: null });
      const FormModel = form ? getFormModel(form) : getFormModel(form_slug);
      await FormModel.findByIdAndUpdate(record_id, { status: newStatus, "data.status": newStatus });

      await AuditLog.create({ action: `approval_${action}`, module: form_slug, record_id, user_id: userId, description: comments || "" });

      return res.json({ success: true, message: `Record ${action}ed successfully`, status: newStatus, data: instance });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = formApprovalController;
