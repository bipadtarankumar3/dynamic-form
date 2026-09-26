// mongo-server/src/modules/workflow/workflow.controller.js
const mongoose = require("mongoose");
const WorkflowDef = require("../../models/WorkflowDef.model");
const WorkflowInstance = require("../../models/WorkflowInstance.model");
const Form = require("../../models/Form.model");
const AuditLog = require("../../models/AuditLog.model");
const { resolveFormAndModel } = require("../../utils/formCollection.util");

function formatWorkflow(wf) {
  if (!wf) return null;
  const doc = wf.toObject ? wf.toObject() : wf;
  const id = doc._id;
  const triggerForm = doc.trigger_form || doc.form_slug || "";

  return {
    ...doc,
    id,
    _id: id,
    wdf_id: id,
    name: doc.name,
    wdf_name: doc.name,
    slug: doc.slug,
    wdf_slug: doc.slug,
    trigger_form: triggerForm,
    wdf_trigger_form: triggerForm,
    form_slug: triggerForm,
    flow_type: doc.flow_type || "linear",
    wdf_flow_type: doc.flow_type || "linear",
    has_conditions: Boolean(doc.has_conditions),
    wdf_has_conditions: Boolean(doc.has_conditions),
    steps: doc.steps || [],
    wdf_steps: doc.steps || [],
    rules: doc.rules || [],
    initiator_roles: doc.initiator_roles || [],
    wdf_initiator_roles: doc.initiator_roles || [],
    is_active: doc.is_active !== false,
    wdf_is_active: doc.is_active !== false,
    created_at: doc.created_at || doc.createdAt,
    updated_at: doc.updated_at || doc.updatedAt,
  };
}

function generateSlug(name) {
  return (
    String(name || "workflow")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || `workflow_${Date.now()}`
  );
}

const workflowController = {
  // ============================================================
  // 1. LIST WORKFLOWS (GET /approval-path, GET /workflows)
  // ============================================================
  listWorkflows: async (req, res) => {
    try {
      const { form_slug, trigger_form, is_active, search } = req.query;
      const query = { deleted_at: null };

      if (form_slug || trigger_form) {
        const formTarget = form_slug || trigger_form;
        query.$or = [{ form_slug: formTarget }, { trigger_form: formTarget }, { slug: formTarget }];
      }

      if (is_active !== undefined) {
        query.is_active = is_active === "true" || is_active === true;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { slug: { $regex: search, $options: "i" } },
          { trigger_form: { $regex: search, $options: "i" } },
        ];
      }

      const defs = await WorkflowDef.find(query).sort({ created_at: -1 });
      const formatted = defs.map(formatWorkflow);

      return res.json({
        success: true,
        count: formatted.length,
        rows: formatted,
        data: formatted,
      });
    } catch (e) {
      console.error("[WorkflowController] listWorkflows error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // Alias for backward compatibility
  listDefs: async (req, res) => {
    return workflowController.listWorkflows(req, res);
  },

  // ============================================================
  // 2. GET SINGLE WORKFLOW (GET /approval-path/:id, GET /workflows/definitions/:slug)
  // ============================================================
  getWorkflow: async (req, res) => {
    try {
      const idOrSlug = req.params.id || req.params.slug;
      let query = { deleted_at: null };

      if (mongoose.isValidObjectId(idOrSlug)) {
        query._id = idOrSlug;
      } else {
        query.slug = String(idOrSlug).toLowerCase();
      }

      const def = await WorkflowDef.findOne(query);
      if (!def) {
        return res.status(404).json({ success: false, message: "Workflow definition not found" });
      }

      return res.json({ success: true, data: formatWorkflow(def) });
    } catch (e) {
      console.error("[WorkflowController] getWorkflow error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  getDef: async (req, res) => {
    return workflowController.getWorkflow(req, res);
  },

  // ============================================================
  // 3. CREATE WORKFLOW (POST /approval-path, POST /workflows/definitions)
  // ============================================================
  createWorkflow: async (req, res) => {
    try {
      const userId = req.user?.user_id || req.user?._id || req.user?.id || null;
      const {
        name,
        slug,
        trigger_form,
        form_slug,
        flow_type,
        has_conditions,
        description,
        is_active,
        is_draft,
        initiator_roles,
        conditions,
        steps,
        rules,
      } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "name is required" });
      }

      let finalSlug = slug ? generateSlug(slug) : generateSlug(name);
      const existingSlug = await WorkflowDef.findOne({ slug: finalSlug, deleted_at: null });
      if (existingSlug) {
        finalSlug = `${finalSlug}_${Date.now()}`;
      }

      const payload = {
        name,
        slug: finalSlug,
        trigger_form: trigger_form || form_slug || null,
        form_slug: form_slug || trigger_form || null,
        flow_type: flow_type || "linear",
        has_conditions: Boolean(has_conditions),
        description: description || "",
        is_active: is_draft ? false : is_active !== false,
        initiator_roles: initiator_roles || [],
        conditions: conditions || [],
        steps: steps || [],
        rules: rules || [],
        created_by: userId,
        updated_by: userId,
      };

      const created = await WorkflowDef.create(payload);
      return res.status(201).json({
        success: true,
        message: "Approval path created successfully",
        data: formatWorkflow(created),
      });
    } catch (e) {
      console.error("[WorkflowController] createWorkflow error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  saveDef: async (req, res) => {
    const idOrSlug = req.params.slug || req.params.id || req.body.slug;
    if (req.method === "PUT" || (idOrSlug && req.body._id)) {
      return workflowController.updateWorkflow(req, res);
    }
    return workflowController.createWorkflow(req, res);
  },

  // ============================================================
  // 4. UPDATE WORKFLOW (PUT /approval-path/:id)
  // ============================================================
  updateWorkflow: async (req, res) => {
    try {
      const userId = req.user?.user_id || req.user?._id || req.user?.id || null;
      const idOrSlug = req.params.id || req.params.slug;
      const {
        name,
        slug,
        trigger_form,
        form_slug,
        flow_type,
        has_conditions,
        description,
        is_active,
        is_draft,
        initiator_roles,
        conditions,
        steps,
        rules,
      } = req.body;

      let query = { deleted_at: null };
      if (mongoose.isValidObjectId(idOrSlug)) {
        query._id = idOrSlug;
      } else {
        query.slug = String(idOrSlug).toLowerCase();
      }

      const existing = await WorkflowDef.findOne(query);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Workflow definition not found" });
      }

      const payload = {
        updated_by: userId,
      };
      if (name !== undefined) payload.name = name;
      if (slug !== undefined) payload.slug = generateSlug(slug);
      if (trigger_form !== undefined || form_slug !== undefined) {
        payload.trigger_form = trigger_form || form_slug;
        payload.form_slug = form_slug || trigger_form;
      }
      if (flow_type !== undefined) payload.flow_type = flow_type;
      if (has_conditions !== undefined) payload.has_conditions = Boolean(has_conditions);
      if (description !== undefined) payload.description = description;
      if (is_draft !== undefined) {
        payload.is_active = is_draft ? false : (is_active !== undefined ? is_active : true);
      } else if (is_active !== undefined) {
        payload.is_active = Boolean(is_active);
      }
      if (initiator_roles !== undefined) payload.initiator_roles = initiator_roles;
      if (conditions !== undefined) payload.conditions = conditions;
      if (steps !== undefined) payload.steps = steps;
      if (rules !== undefined) payload.rules = rules;

      const updated = await WorkflowDef.findByIdAndUpdate(existing._id, { $set: payload }, { new: true });

      return res.json({
        success: true,
        message: "Approval path updated successfully",
        data: formatWorkflow(updated),
      });
    } catch (e) {
      console.error("[WorkflowController] updateWorkflow error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // ============================================================
  // 5. DELETE WORKFLOW (DELETE /approval-path/:id)
  // ============================================================
  deleteWorkflow: async (req, res) => {
    try {
      const idOrSlug = req.params.id || req.params.slug;
      let query = { deleted_at: null };
      if (mongoose.isValidObjectId(idOrSlug)) {
        query._id = idOrSlug;
      } else {
        query.slug = String(idOrSlug).toLowerCase();
      }

      const updated = await WorkflowDef.findOneAndUpdate(query, {
        $set: { deleted_at: new Date() },
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: "Workflow definition not found" });
      }

      return res.json({ success: true, message: "Approval path deleted successfully" });
    } catch (e) {
      console.error("[WorkflowController] deleteWorkflow error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  deleteDef: async (req, res) => {
    return workflowController.deleteWorkflow(req, res);
  },

  // ============================================================
  // 6. MODULE LIST (GET /approval-workflow/module-list)
  // ============================================================
  moduleList: async (req, res) => {
    try {
      const forms = await Form.find({ deleted_at: null }).select("title slug name form_code").sort({ title: 1 }).lean();
      const modules = forms.map((f) => ({
        label: f.title || f.name || f.slug,
        title: f.title || f.name || f.slug,
        value: f.slug,
        slug: f.slug,
      }));
      return res.json({ success: true, data: modules });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // ============================================================
  // 7. INSTANCES (GET /workflows/instances, GET /workflows/instances/:id)
  // ============================================================
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
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  getInstance: async (req, res) => {
    try {
      const { id } = req.params;
      const instance = await WorkflowInstance.findById(id)
        .populate("workflow_def_id")
        .populate("submitted_by", "name email");
      if (!instance) {
        return res.status(404).json({ success: false, message: "Workflow instance not found" });
      }
      return res.json({ success: true, data: instance });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

module.exports = workflowController;
