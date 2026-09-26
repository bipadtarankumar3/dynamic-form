// mongo-server/src/modules/form-approval/formApproval.controller.js
const mongoose = require("mongoose");
const WorkflowDef = require("../../models/WorkflowDef.model");
const WorkflowInstance = require("../../models/WorkflowInstance.model");
const ApprovalProcessTrack = require("../../models/ApprovalProcessTrack.model");
const Notification = require("../../models/Notification.model");
const User = require("../../models/User.model");
const Role = require("../../models/Role.model");
const AuditLog = require("../../models/AuditLog.model");
const Form = require("../../models/Form.model");
const { resolveFormAndModel } = require("../../utils/formCollection.util");

// ── Helpers ──────────────────────────────────────────────────

function safeJson(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function decodeOperator(op) {
  if (!op) return "=";
  return String(op)
    .replace(/&gt;=/g, ">=")
    .replace(/&lt;=/g, "<=")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x3D;/g, "=")
    .replace(/&ne;/g, "!=");
}

function evaluateConditions(record = {}, conditions = []) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  let result = true;
  const flatRecord = { ...(record?.data || {}), ...(record || {}) };

  for (let i = 0; i < conditions.length; i++) {
    const { field, value, logic = "AND" } = conditions[i];
    const operator = decodeOperator(conditions[i].operator);
    if (!field) continue;

    const rv = String(flatRecord[field] ?? "").trim().toLowerCase();
    const cv = String(value ?? "").trim().toLowerCase();
    let match = false;

    switch (operator) {
      case "=":
      case "==":
      case "EQUALS":
        match = rv === cv;
        break;
      case "!=":
      case "<>":
      case "NOT_EQUALS":
        match = rv !== cv;
        break;
      case ">":
        match = !isNaN(Number(rv)) && Number(rv) > Number(cv);
        break;
      case "<":
        match = !isNaN(Number(rv)) && Number(rv) < Number(cv);
        break;
      case ">=":
        match = !isNaN(Number(rv)) && Number(rv) >= Number(cv);
        break;
      case "<=":
        match = !isNaN(Number(rv)) && Number(rv) <= Number(cv);
        break;
      case "CONTAINS":
      case "contains":
        match = rv.includes(cv);
        break;
      case "IN":
      case "in":
        match = (Array.isArray(value) ? value : String(value).split(","))
          .map((v) => String(v).trim().toLowerCase())
          .includes(rv);
        break;
      case "is_empty":
        match = !flatRecord[field] || rv === "";
        break;
      case "is_not_empty":
        match = Boolean(flatRecord[field]) && rv !== "";
        break;
      default:
        match = rv === cv;
    }

    if (i === 0) result = match;
    else if (logic === "OR") result = result || match;
    else result = result && match;
  }
  return result;
}

function getNotificationLink(form_slug, record_id) {
  if (form_slug === "request_for_proposal") {
    return `/admin/rfp-assessment/?rfp_id=${record_id}`;
  }
  return `/admin/forms/${form_slug}/${record_id}`;
}

async function getUserById(userId) {
  if (!userId) return null;
  if (!mongoose.isValidObjectId(userId)) {
    return await User.findOne({
      $or: [{ id: userId }, { employee_code: String(userId) }],
      deleted_at: null,
    })
      .populate("role_id", "name slug")
      .lean();
  }
  return await User.findOne({ _id: userId, deleted_at: null })
    .populate("role_id", "name slug")
    .lean();
}

async function sendNotification({
  user_id,
  title,
  message,
  event_key,
  ref_table,
  ref_id,
  link,
  type = "info",
  is_deletable = false,
  status_flag = null,
}) {
  if (!user_id) return;
  try {
    let targetUserId = user_id;
    if (!mongoose.isValidObjectId(user_id)) {
      const u = await getUserById(user_id);
      if (u?._id) targetUserId = u._id;
    }
    if (!mongoose.isValidObjectId(targetUserId)) return;

    await Notification.create({
      user_id: targetUserId,
      title,
      message: message || "",
      type,
      link: link || null,
      is_read: false,
      event_key: event_key || null,
      ref_table: ref_table || null,
      ref_id: ref_id || null,
      is_deletable: Boolean(is_deletable),
      status_flag: status_flag || null,
    });
  } catch (err) {
    console.error("[FormApproval] sendNotification error:", err.message);
  }
}

async function markPendingNotificationsRead(userId, refTable, refId) {
  if (!userId || !refId) return;
  try {
    let targetUserId = userId;
    if (!mongoose.isValidObjectId(userId)) {
      const u = await getUserById(userId);
      if (u?._id) targetUserId = u._id;
    }
    if (!mongoose.isValidObjectId(targetUserId)) return;

    await Notification.updateMany(
      {
        user_id: targetUserId,
        is_read: false,
        deleted_at: null,
        $or: [
          { ref_id: refId },
          { ref_id: String(refId) },
          { link: { $regex: String(refId) } },
        ],
      },
      { $set: { is_read: true, updated_at: new Date() } }
    );
  } catch (err) {
    console.error("[FormApproval] markPendingRead error:", err.message);
  }
}

async function recordApprovalTrack({
  apt_type,
  apt_item_id,
  apt_user_id,
  apt_user_name,
  apt_user_role,
  apt_accept_step,
  apt_remarks,
  apt_recipient_role,
  apt_recipient_id,
  apt_recipient_name,
  apt_accept_status,
  apt_status_flag,
}) {
  try {
    let validUserId = mongoose.isValidObjectId(apt_user_id) ? apt_user_id : null;
    let validRecipientId = mongoose.isValidObjectId(apt_recipient_id) ? apt_recipient_id : null;

    if (!validUserId && apt_user_id) {
      const u = await getUserById(apt_user_id);
      if (u?._id) validUserId = u._id;
    }
    if (!validRecipientId && apt_recipient_id) {
      const u = await getUserById(apt_recipient_id);
      if (u?._id) validRecipientId = u._id;
    }

    const trackDoc = await ApprovalProcessTrack.create({
      apt_id: `APT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      apt_type,
      apt_item_id,
      apt_user_id: validUserId,
      apt_user_name: apt_user_name || null,
      apt_user_role: apt_user_role || null,
      apt_accept_step: apt_accept_step || null,
      apt_remarks: apt_remarks || "",
      apt_recipient_role: apt_recipient_role || null,
      apt_recipient_id: validRecipientId,
      apt_recipient_name: apt_recipient_name || null,
      apt_accept_status: apt_accept_status || null,
      apt_status_flag: apt_status_flag || null,
      created_by: validUserId,
      updated_by: validUserId,
    });

    await AuditLog.create({
      action: apt_status_flag || apt_accept_status || "APPROVAL_EVENT",
      module: apt_type,
      record_id: apt_item_id,
      user_id: validUserId,
      meta: {
        accept_step: apt_accept_step,
        remarks: apt_remarks,
        status: apt_accept_status,
      },
    });

    return trackDoc;
  } catch (err) {
    console.error("[FormApproval] recordApprovalTrack error:", err.message);
  }
}

async function findFormRecord(form_slug, record_id) {
  try {
    const { Model, form } = await resolveFormAndModel(form_slug);
    if (!Model) return { record: null, Model: null, form: null };

    let record = null;
    if (mongoose.isValidObjectId(record_id)) {
      record = await Model.findOne({ _id: record_id, deleted_at: null }).lean();
    }
    if (!record) {
      record = await Model.findOne({
        $or: [
          { id: record_id },
          { id: Number(record_id) || -1 },
          { "data.id": record_id },
          { "data.id": Number(record_id) || -1 },
          { _id: record_id },
        ],
        deleted_at: null,
      }).lean();
    }
    return { record, Model, form };
  } catch (err) {
    console.warn("[FormApproval] findFormRecord warning:", err.message);
    return { record: null, Model: null, form: null };
  }
}

async function resolveWorkflowForForm(form_slug, record_id) {
  const cleanSlug = String(form_slug || "").trim();
  const wfList = await WorkflowDef.find({
    $or: [
      { form_slug: cleanSlug },
      { trigger_form: cleanSlug },
      { slug: cleanSlug },
      { form_slug: cleanSlug.toLowerCase() },
      { trigger_form: cleanSlug.toLowerCase() },
    ],
    is_active: { $ne: false },
    deleted_at: null,
  })
    .sort({ created_at: -1 })
    .lean();

  if (!wfList || wfList.length === 0) {
    // Fallback: any generic active workflow with matching trigger or default
    const fallback = await WorkflowDef.findOne({ is_active: { $ne: false }, deleted_at: null }).lean();
    if (!fallback) return null;
    wfList.push(fallback);
  }

  const { record } = await findFormRecord(form_slug, record_id);
  let matchedWorkflow = null;
  let matchedRule = null;

  for (const wf of wfList) {
    const rules = safeJson(wf.rules, []);
    if (Array.isArray(rules) && rules.length > 0) {
      let conditionMatched = false;
      for (const rule of rules) {
        const conds = safeJson(rule.conditions, []);
        if (evaluateConditions(record, conds)) {
          matchedWorkflow = wf;
          matchedRule = rule;
          conditionMatched = true;
          break;
        }
      }
      if (!conditionMatched) {
        matchedWorkflow = wf;
        matchedRule = rules[0];
      }
    } else {
      matchedWorkflow = wf;
    }

    if (matchedWorkflow) break;
  }

  if (!matchedWorkflow) return null;

  const rawSteps = matchedRule?.steps ?? matchedWorkflow.steps ?? matchedWorkflow.wdf_steps;
  const steps = safeJson(rawSteps, []);
  return { workflow: matchedWorkflow, matchedRule, steps, record };
}

async function enrichHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const userIds = [
    ...new Set(history.map((h) => h.by_user_id || h.actor_id).filter(Boolean)),
  ];

  let userMap = {};
  if (userIds.length > 0) {
    const validIds = userIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length > 0) {
      const users = await User.find({ _id: { $in: validIds } }).select("name email").lean();
      users.forEach((u) => {
        userMap[String(u._id)] = u.name;
      });
    }
  }

  return history.map((h) => {
    const actorId = String(h.by_user_id || h.actor_id || "");
    return {
      ...h,
      actor_name: userMap[actorId] || h.actor_name || `User #${actorId || "System"}`,
    };
  });
}

// ── Controller Methods ───────────────────────────────────────

const formApprovalController = {
  // ============================================================
  // 1. GET FULL WORKFLOW STATE & APPROVAL TRACK
  //    GET /form-approval/workflow?form_slug=project&record_id=5
  // ============================================================
  getWorkflowState: async (req, res, next) => {
    try {
      const { form_slug, record_id } = req.query;
      if (!form_slug || !record_id) {
        return res.status(400).json({
          success: false,
          message: "form_slug and record_id are required",
        });
      }

      const resolved = await resolveWorkflowForForm(form_slug, record_id);
      if (!resolved) {
        return res.json({ success: true, data: { hasWorkflow: false } });
      }

      const { workflow, matchedRule, steps, record } = resolved;

      // Find workflow instance for this specific record
      const instance = await WorkflowInstance.findOne({
        form_slug: { $in: [form_slug, form_slug.toLowerCase()] },
        $or: [
          { record_id: record_id },
          { record_id: String(record_id) },
          { record_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      })
        .sort({ created_at: -1 })
        .lean();

      let instanceData = null;
      let savedAssignment = null;

      if (instance) {
        const stepAssignments = safeJson(
          instance.wfi_step_assignments || instance.assignments,
          []
        );
        const history = await enrichHistory(safeJson(instance.history, []));

        // Resolve assigned users
        const allUserIds = [
          ...new Set(stepAssignments.map((a) => a.user_id).filter(Boolean)),
        ];
        let assignedUserMap = {};
        if (allUserIds.length > 0) {
          const validIds = allUserIds.filter((id) => mongoose.isValidObjectId(id));
          if (validIds.length > 0) {
            const uList = await User.find({ _id: { $in: validIds } })
              .populate("role_id", "name slug")
              .select("name email role_id role_slug")
              .lean();
            uList.forEach((u) => {
              assignedUserMap[String(u._id)] = {
                id: u._id,
                _id: u._id,
                name: u.name,
                email: u.email,
                role_name: u.role_id?.name || u.role_slug || "Approver",
                role_slug: u.role_id?.slug || u.role_slug || "",
              };
            });
          }
        }

        const enrichedAssignments = stepAssignments.map((a) => {
          const stepNum = Number(a.step);
          const stepDef =
            steps.find((s) => Number(s.step || s.step_number || s.level) === stepNum) || {};
          const uidStr = String(a.user_id);
          return {
            ...a,
            actions:
              a.actions ||
              stepDef.actions ||
              stepDef.permitted_actions || ["approve", "reject"],
            label: a.label || stepDef.label || stepDef.step_name || `Step ${stepNum}`,
            reject_to_step:
              a.reject_to_step !== undefined
                ? a.reject_to_step
                : stepDef.reject_to_step || "0",
            user: assignedUserMap[uidStr] || null,
          };
        });

        if (instance.status === "DRAFT" || instance.status === "Draft") {
          savedAssignment = {
            id: instance._id,
            assignments: enrichedAssignments,
          };
        } else {
          const currentStep = instance.current_step || 1;
          const nextStepNum = currentStep + 1;
          const nextAssignment = enrichedAssignments.find(
            (a) => Number(a.step) === nextStepNum
          );
          const currentAssignment = enrichedAssignments.find(
            (a) => Number(a.step) === currentStep
          );

          // Find initiator
          const initiatorEntry = history.find(
            (h) =>
              h.action === "SEND_FOR_APPROVAL" ||
              h.action === "RESEND_FOR_APPROVAL" ||
              h.action === "submitted"
          );
          const initiatorUserId = initiatorEntry?.by_user_id || instance.created_by;
          let initiatorUser = null;
          if (initiatorUserId) {
            initiatorUser = await getUserById(initiatorUserId);
          }

          // Extract rejection info
          let rejectionInfo = null;
          if (
            instance.status === "REJECTED" ||
            instance.status === "RESEND" ||
            instance.status === "CHANGES_REQUESTED"
          ) {
            const lastEvent = [...history]
              .reverse()
              .find(
                (h) =>
                  h.action === "REJECT" ||
                  h.action === "RESEND" ||
                  h.action === "REQUEST_INFO"
              );
            rejectionInfo = {
              action:
                lastEvent?.action ||
                (instance.status === "RESEND" ? "RESEND" : "REJECT"),
              step: lastEvent?.step || currentStep,
              role: lastEvent?.role || null,
              actor_name: lastEvent?.actor_name || null,
              by_user_id: lastEvent?.by_user_id || null,
              remarks: lastEvent?.remarks || instance.remarks || "",
              at: lastEvent?.at || instance.updated_at,
            };
          }

          instanceData = {
            id: instance._id,
            _id: instance._id,
            status: instance.status,
            current_step: currentStep,
            remarks: instance.remarks,
            assignments: enrichedAssignments,
            current_approver: currentAssignment?.user || null,
            next_approver: nextAssignment?.user || null,
            initiator: initiatorUser
              ? {
                  id: initiatorUser._id || initiatorUser.id,
                  name: initiatorUser.name,
                  email: initiatorUser.email,
                  role_name: initiatorUser.role_id?.name || initiatorUser.role_slug,
                }
              : initiatorUserId
              ? { id: initiatorUserId }
              : null,
            rejectionInfo,
            history,
          };
        }
      }

      // Fetch Approval Track records
      const trackRecords = await ApprovalProcessTrack.find({
        apt_type: form_slug,
        $or: [
          { apt_item_id: record_id },
          { apt_item_id: String(record_id) },
          { apt_item_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      })
        .populate("apt_user_id", "name email")
        .populate("apt_recipient_id", "name email")
        .sort({ apt_created_at: 1 })
        .lean();

      const approvalTrack = trackRecords.map((t) => ({
        ...t,
        user_name: t.apt_user_name || t.apt_user_id?.name || "System",
        user_email: t.apt_user_id?.email || "",
        recipient_name: t.apt_recipient_name || t.apt_recipient_id?.name || "",
        recipient_email: t.apt_recipient_id?.email || "",
      }));

      // Creator of record
      let recordCreator = null;
      if (record?.created_by) {
        recordCreator = await getUserById(record.created_by);
      }

      // Resolve initiator permissions
      const allowedInitiatorRoles =
        matchedRule?.initiator_roles && matchedRule.initiator_roles.length > 0
          ? matchedRule.initiator_roles
          : workflow.initiator_roles || [];

      const userRoleSlug = String(
        req.user?.role_slug || req.user?.role_name || ""
      ).toLowerCase();
      const userRoleId = req.user?.role_id;
      const isSuperAdmin = Boolean(
        req.user?.is_configurator ||
          req.user?.isConfigurator ||
          userRoleSlug === "superadmin" ||
          userRoleSlug === "admin" ||
          userRoleSlug === "configurator" ||
          userRoleId === 1 ||
          userRoleId === 2
      );

      let canInitiate = false;
      if (allowedInitiatorRoles.length > 0) {
        canInitiate =
          isSuperAdmin ||
          allowedInitiatorRoles.some(
            (r) =>
              String(r).toLowerCase() === userRoleSlug ||
              String(r) === String(userRoleId)
          );
      } else {
        canInitiate = isSuperAdmin;
      }

      return res.json({
        success: true,
        data: {
          hasWorkflow: true,
          workflow: {
            id: workflow._id,
            _id: workflow._id,
            name: workflow.name,
            slug: workflow.slug,
            flow_type: workflow.flow_type || "linear",
            initiator_roles: workflow.initiator_roles || [],
          },
          matchedRule: matchedRule
            ? {
                id: matchedRule.id || matchedRule._id,
                rule_name: matchedRule.rule_name,
                initiator_roles: matchedRule.initiator_roles || [],
              }
            : null,
          initiator_roles: allowedInitiatorRoles,
          canInitiate,
          steps,
          savedAssignment,
          instance: instanceData,
          recordCreator,
          approvalTrack,
        },
      });
    } catch (err) {
      console.error("[FormApproval] getWorkflowState error:", err);
      next(err);
    }
  },

  // ============================================================
  // 2. GET USERS BY ROLE
  //    GET /form-approval/users-by-role/:roleId
  // ============================================================
  getUsersByRole: async (req, res, next) => {
    try {
      const { roleId } = req.params;
      if (!roleId) {
        return res.status(400).json({ success: false, message: "roleId is required" });
      }

      let role = null;
      if (mongoose.isValidObjectId(roleId)) {
        role = await Role.findById(roleId).lean();
      }
      if (!role) {
        role = await Role.findOne({
          $or: [
            { slug: String(roleId).toLowerCase() },
            { name: new RegExp(`^${roleId}$`, "i") },
          ],
          deleted_at: null,
        }).lean();
      }

      let query = { is_active: true, deleted_at: null };
      if (role) {
        query.$or = [{ role_id: role._id }, { role_slug: role.slug }];
      } else if (mongoose.isValidObjectId(roleId)) {
        query.role_id = roleId;
      } else {
        query.role_slug = String(roleId).toLowerCase();
      }

      const users = await User.find(query)
        .populate("role_id", "name slug")
        .select("name email role_id role_slug")
        .sort({ name: 1 })
        .lean();

      const formatted = users.map((u) => ({
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        role_name: u.role_id?.name || u.role_slug || "Approver",
        role_slug: u.role_id?.slug || u.role_slug || "",
      }));

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error("[FormApproval] getUsersByRole error:", err);
      next(err);
    }
  },

  // ============================================================
  // 3. SAVE APPROVER ASSIGNMENTS (Stage 1: status = 'DRAFT')
  //    POST /form-approval/save-assignments
  // ============================================================
  saveAssignments: async (req, res, next) => {
    try {
      const { form_slug, record_id, assignments = [] } = req.body;
      if (!form_slug || !record_id) {
        return res.status(400).json({
          success: false,
          message: "form_slug and record_id are required",
        });
      }
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({
          success: false,
          message: "assignments array is required",
        });
      }

      const userId = req.user?.user_id || req.user?._id || req.user?.id || null;
      const resolved = await resolveWorkflowForForm(form_slug, record_id);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: "No active approval workflow found for this form",
        });
      }
      const { workflow, matchedRule, steps = [] } = resolved;

      // Validate each assignment
      const assignmentsToSave = [];
      for (const a of assignments) {
        if (!a.step || !a.user_id) {
          return res.status(400).json({
            success: false,
            message: `Each assignment must have step and user_id.`,
          });
        }
        const stepNum = Number(a.step);
        const stepDef =
          steps.find((s) => Number(s.step || s.step_number || s.level) === stepNum) || {};
        assignmentsToSave.push({
          step: stepNum,
          user_id: a.user_id,
          role_id: a.role_id || stepDef.role_id,
          role: a.role || stepDef.role,
          role_name: a.role_name || stepDef.role_name,
          label: a.label || stepDef.label || stepDef.step_name || `Step ${stepNum}`,
          actions:
            a.actions ||
            stepDef.actions ||
            stepDef.permitted_actions || ["approve", "reject"],
          reject_to_step:
            a.reject_to_step !== undefined
              ? a.reject_to_step
              : stepDef.reject_to_step || "0",
        });
      }

      let instance = await WorkflowInstance.findOne({
        form_slug: { $in: [form_slug, form_slug.toLowerCase()] },
        $or: [
          { record_id: record_id },
          { record_id: String(record_id) },
          { record_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      }).sort({ created_at: -1 });

      if (instance) {
        if (
          instance.status !== "DRAFT" &&
          instance.status !== "Draft" &&
          instance.status !== "REJECTED" &&
          instance.status !== "RESEND"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Approval has already been sent for this record and is currently in progress.",
          });
        }
        instance.wfi_step_assignments = assignmentsToSave;
        instance.assignments = assignmentsToSave;
        instance.workflow_def_id = workflow._id;
        instance.rule_id = matchedRule ? matchedRule.id || matchedRule._id : null;
        instance.status = "DRAFT";
        instance.current_step = 0;
        instance.updated_by = userId;
        await instance.save();
      } else {
        instance = await WorkflowInstance.create({
          workflow_def_id: workflow._id,
          form_slug,
          record_id,
          current_step: 0,
          status: "DRAFT",
          remarks: "",
          history: [],
          wfi_step_assignments: assignmentsToSave,
          assignments: assignmentsToSave,
          rule_id: matchedRule ? matchedRule.id || matchedRule._id : null,
          created_by: userId,
          updated_by: userId,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Approver assignments saved successfully",
        data: instance,
      });
    } catch (err) {
      console.error("[FormApproval] saveAssignments error:", err);
      next(err);
    }
  },

  // ============================================================
  // 4. SEND / RESEND FOR APPROVAL (Stage 2: status = 'PENDING_<ROLE>', step = 1)
  //    POST /form-approval/send
  // ============================================================
  sendForApproval: async (req, res, next) => {
    try {
      const { form_slug, record_id, remarks = "", assignments = null } = req.body;
      if (!form_slug || !record_id) {
        return res.status(400).json({
          success: false,
          message: "form_slug and record_id are required",
        });
      }

      const userId = req.user?.user_id || req.user?._id || req.user?.id || null;
      let instance = await WorkflowInstance.findOne({
        form_slug: { $in: [form_slug, form_slug.toLowerCase()] },
        $or: [
          { record_id: record_id },
          { record_id: String(record_id) },
          { record_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      }).sort({ created_at: -1 });

      const resolved = await resolveWorkflowForForm(form_slug, record_id);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: "No active approval workflow found for this form",
        });
      }
      const { workflow, matchedRule, steps } = resolved;
      if (!steps || steps.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Workflow has no steps defined",
        });
      }

      let step_assignments =
        Array.isArray(assignments) && assignments.length > 0
          ? assignments
          : safeJson(instance?.wfi_step_assignments || instance?.assignments, []);

      if (!instance && step_assignments.length > 0) {
        instance = await WorkflowInstance.create({
          workflow_def_id: workflow._id,
          form_slug,
          record_id,
          current_step: 0,
          status: "DRAFT",
          wfi_step_assignments: step_assignments,
          assignments: step_assignments,
          created_by: userId,
          updated_by: userId,
        });
      }

      if (!instance) {
        return res.status(400).json({
          success: false,
          message: "Please save approver assignments first before sending for approval",
        });
      }

      const isResend =
        instance.status === "REJECTED" || instance.status === "RESEND";

      const firstStep = steps[0];
      const firstRoleSlug = firstStep?.role || `ROLE_${firstStep?.role_id || 1}`;
      const initialStatus = `PENDING_${String(firstRoleSlug).toUpperCase()}`;
      const initiatorUser = await getUserById(userId);

      const history = safeJson(instance.history, []);
      history.push({
        step: 0,
        action: isResend ? "RESEND_FOR_APPROVAL" : "SEND_FOR_APPROVAL",
        by_user_id: userId,
        actor_name: initiatorUser?.name || req.user?.name || `User #${userId}`,
        at: new Date().toISOString(),
        remarks:
          remarks || (isResend ? "Resubmitted for approval" : "Sent for approval."),
      });

      instance.current_step = 1;
      instance.status = initialStatus;
      instance.remarks = remarks;
      instance.history = history;
      if (step_assignments.length > 0) {
        instance.wfi_step_assignments = step_assignments;
        instance.assignments = step_assignments;
      }
      instance.updated_by = userId;
      await instance.save();

      // Update form record status
      const { Model } = await findFormRecord(form_slug, record_id);
      if (Model) {
        await Model.updateMany(
          {
            $or: [
              { _id: mongoose.isValidObjectId(record_id) ? record_id : null },
              { id: record_id },
              { id: Number(record_id) || -1 },
              { "data.id": record_id },
              { "data.id": Number(record_id) || -1 },
            ].filter(Boolean),
          },
          {
            $set: {
              status: initialStatus,
              "data.status": initialStatus,
              "data.workflow_status": initialStatus,
              updated_by: userId,
              updated_at: new Date(),
            },
          }
        );
      }

      // Step 1 recipient
      const step1 = step_assignments.find((a) => Number(a.step) === 1);

      // Audit track
      await recordApprovalTrack({
        apt_type: form_slug,
        apt_item_id: record_id,
        apt_user_id: userId,
        apt_user_name: initiatorUser?.name || req.user?.name || "Initiator",
        apt_user_role:
          initiatorUser?.role_id?.name || initiatorUser?.role_slug || "Initiator",
        apt_accept_step: isResend
          ? `Resend for Approval (Step 1: ${firstStep?.role_name || firstRoleSlug})`
          : `Send for Approval (Step 1: ${firstStep?.role_name || firstRoleSlug})`,
        apt_remarks:
          remarks || (isResend ? "Resubmitted for approval" : "Sent for approval"),
        apt_recipient_role: firstStep?.role_name || firstRoleSlug,
        apt_recipient_id: step1?.user_id || null,
        apt_accept_status: "Pending Approval",
        apt_status_flag: isResend ? "RESENT" : "INITIATED",
      });

      // Send notification to step 1 user
      if (step1?.user_id) {
        const label = `${form_slug.replace(/_/g, " ")} #${record_id}`;
        await sendNotification({
          user_id: step1.user_id,
          title: isResend
            ? `Approval Request (Resubmitted): ${label}`
            : `Approval Request: ${label}`,
          message: isResend
            ? `${initiatorUser?.name || "Initiator"} has resubmitted "${label}" for your approval (Step 1: ${firstStep?.role_name || firstRoleSlug}). Remarks: ${remarks || "—"}`
            : `${initiatorUser?.name || "Someone"} sent "${label}" for your approval — Step 1: ${firstStep?.role_name || firstRoleSlug}.`,
          event_key: "form_approval_pending",
          ref_table: form_slug,
          ref_id: record_id,
          link: getNotificationLink(form_slug, record_id),
        });
      }

      await markPendingNotificationsRead(userId, form_slug, record_id);

      return res.status(200).json({
        success: true,
        message: isResend
          ? "Record resubmitted for approval successfully"
          : "Record sent for approval successfully",
        data: instance,
      });
    } catch (err) {
      console.error("[FormApproval] sendForApproval error:", err);
      next(err);
    }
  },

  // ============================================================
  // 5. PERFORM ACTION (Approve / Reject / Resend / Forward / Review)
  //    POST /form-approval/action
  // ============================================================
  performAction: async (req, res, next) => {
    try {
      const { form_slug, record_id, instance_id, action, remarks = "" } = req.body;
      if (!form_slug || !record_id || !action) {
        return res.status(400).json({
          success: false,
          message: "form_slug, record_id, and action are required",
        });
      }

      const normAction = String(action).toUpperCase();
      const VALID_ACTIONS = [
        "APPROVE",
        "REJECT",
        "RESEND",
        "REQUEST_INFO",
        "FORWARD",
        "REVIEW",
      ];
      if (!VALID_ACTIONS.includes(normAction)) {
        return res.status(400).json({
          success: false,
          message: `action must be one of: ${VALID_ACTIONS.join(", ")}`,
        });
      }

      const userId = req.user?.user_id || req.user?._id || req.user?.id || null;

      let instance = null;
      if (instance_id && mongoose.isValidObjectId(instance_id)) {
        instance = await WorkflowInstance.findById(instance_id);
      }
      if (!instance) {
        instance = await WorkflowInstance.findOne({
          form_slug: { $in: [form_slug, form_slug.toLowerCase()] },
          $or: [
            { record_id: record_id },
            { record_id: String(record_id) },
            { record_id: Number(record_id) || -1 },
          ],
          deleted_at: null,
        }).sort({ created_at: -1 });
      }

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Workflow instance not found",
        });
      }

      const stepAssignments = safeJson(
        instance.wfi_step_assignments || instance.assignments,
        []
      );
      const history = safeJson(instance.history, []);
      const currentStepNum = instance.current_step || 1;

      const resolved = await resolveWorkflowForForm(form_slug, record_id);
      if (!resolved) {
        return res.status(404).json({
          success: false,
          message: "Workflow configuration not found",
        });
      }
      const { steps } = resolved;

      const currentStep = steps[currentStepNum - 1] || steps[0];
      const actorUser = await getUserById(userId);
      const recordLabel = `${form_slug.replace(/_/g, " ")} #${record_id}`;

      history.push({
        step: currentStepNum,
        action: normAction,
        role: currentStep?.role_name || currentStep?.role,
        role_id: currentStep?.role_id,
        by_user_id: userId,
        actor_name: actorUser?.name || req.user?.name || `User #${userId}`,
        at: new Date().toISOString(),
        remarks,
      });

      let nextStatus;
      let nextStepNum = currentStepNum;
      let finished = false;
      let nextStep = null;
      let nextRoleSlug = null;
      let nextAssignment = null;
      let acceptStatusText = "Approved";

      if (normAction === "REJECT") {
        nextStatus = "REJECTED";
        finished = true;
        nextStepNum = currentStepNum;
        acceptStatusText = "Rejected";
      } else if (normAction === "RESEND" || normAction === "REQUEST_INFO") {
        nextStatus = "RESEND";
        finished = true;
        nextStepNum = currentStepNum;
        acceptStatusText = "Changes Requested";
      } else {
        if (currentStepNum >= steps.length) {
          nextStatus = "APPROVED";
          finished = true;
          nextStepNum = 0;
          acceptStatusText = normAction === "REVIEW" ? "Reviewed & Finalized" : "Approved";
        } else {
          nextStepNum = currentStepNum + 1;
          nextStep = steps[nextStepNum - 1];
          nextRoleSlug = nextStep?.role || `ROLE_${nextStep?.role_id || nextStepNum}`;
          nextStatus = `PENDING_${String(nextRoleSlug).toUpperCase()}`;
          nextAssignment = stepAssignments.find((a) => Number(a.step) === nextStepNum);
          acceptStatusText =
            normAction === "FORWARD"
              ? "Forwarded"
              : normAction === "REVIEW"
              ? "Reviewed & Passed"
              : "Approved & Forwarded";
        }
      }

      instance.current_step = finished
        ? normAction === "REJECT" || normAction === "RESEND"
          ? currentStepNum
          : 0
        : nextStepNum;
      instance.status = nextStatus;
      instance.remarks = remarks;
      instance.history = history;
      instance.updated_by = userId;
      await instance.save();

      // Update record status
      const { Model } = await findFormRecord(form_slug, record_id);
      if (Model) {
        const recordStatusText =
          normAction === "RESEND" || normAction === "REQUEST_INFO"
            ? "Changes Requested"
            : nextStatus === "APPROVED"
            ? "Approved"
            : nextStatus === "REJECTED"
            ? "Rejected"
            : nextStatus;

        await Model.updateMany(
          {
            $or: [
              { _id: mongoose.isValidObjectId(record_id) ? record_id : null },
              { id: record_id },
              { id: Number(record_id) || -1 },
              { "data.id": record_id },
              { "data.id": Number(record_id) || -1 },
            ].filter(Boolean),
          },
          {
            $set: {
              status: recordStatusText,
              "data.status": recordStatusText,
              "data.workflow_status": recordStatusText,
              updated_by: userId,
              updated_at: new Date(),
            },
          }
        );
      }

      // Record audit track
      await recordApprovalTrack({
        apt_type: form_slug,
        apt_item_id: record_id,
        apt_user_id: userId,
        apt_user_name: actorUser?.name || req.user?.name || "Approver",
        apt_user_role:
          actorUser?.role_id?.name || actorUser?.role_slug || currentStep?.role_name || "Approver",
        apt_accept_step: `Step ${currentStepNum}: ${currentStep?.role_name || currentStep?.role}`,
        apt_remarks: remarks || "—",
        apt_recipient_role: !finished ? nextStep?.role_name || nextRoleSlug : null,
        apt_recipient_id: !finished ? nextAssignment?.user_id || null : null,
        apt_accept_status: acceptStatusText,
        apt_status_flag: normAction,
      });

      await markPendingNotificationsRead(userId, form_slug, record_id);

      // Find initiator
      const initiatorEntry = [...history]
        .reverse()
        .find(
          (h) =>
            h.action === "SEND_FOR_APPROVAL" ||
            h.action === "RESEND_FOR_APPROVAL" ||
            h.action === "submitted"
        );
      const initiatorUserId = initiatorEntry?.by_user_id || instance.created_by;

      if (
        normAction === "REJECT" ||
        normAction === "RESEND" ||
        normAction === "REQUEST_INFO"
      ) {
        if (initiatorUserId) {
          const notifTitle =
            normAction === "RESEND" || normAction === "REQUEST_INFO"
              ? `${recordLabel} — Changes Requested (Resend)`
              : `${recordLabel} — Rejected`;
          const notifMsg =
            normAction === "RESEND" || normAction === "REQUEST_INFO"
              ? `Changes requested by ${actorUser?.name || "an approver"} at Step ${currentStepNum} (${currentStep?.role_name || currentStep?.role}). Reason: ${remarks || "—"}`
              : `Rejected by ${actorUser?.name || "an approver"} at Step ${currentStepNum} (${currentStep?.role_name || currentStep?.role}). Remarks: ${remarks || "—"}`;

          await sendNotification({
            user_id: initiatorUserId,
            title: notifTitle,
            message: notifMsg,
            event_key:
              normAction === "RESEND" || normAction === "REQUEST_INFO"
                ? "form_approval_resend"
                : "form_approval_rejected",
            ref_table: form_slug,
            ref_id: record_id,
            link: getNotificationLink(form_slug, record_id),
          });
        }
      } else if (!finished) {
        if (nextAssignment?.user_id) {
          await sendNotification({
            user_id: nextAssignment.user_id,
            title: `Approval Request: ${recordLabel}`,
            message: `Step ${currentStepNum} actioned (${normAction}) by ${actorUser?.name || "an approver"}. Your action is needed for Step ${nextStepNum}: ${nextStep?.role_name || nextStep?.role || ""}.`,
            event_key: "form_approval_pending",
            ref_table: form_slug,
            ref_id: record_id,
            link: getNotificationLink(form_slug, record_id),
          });
        }
      } else {
        if (initiatorUserId) {
          await sendNotification({
            user_id: initiatorUserId,
            title: `${recordLabel} — Approved ✓`,
            message: `Fully approved by ${actorUser?.name || "an approver"}. All ${steps.length} step(s) completed.`,
            event_key: "form_approval_approved",
            type: "success",
            is_deletable: true,
            status_flag: "APPROVED",
            ref_table: form_slug,
            ref_id: record_id,
            link: getNotificationLink(form_slug, record_id),
          });
        }
      }

      return res.json({
        success: true,
        message: `Action "${normAction}" performed successfully`,
        data: {
          instance_id: instance._id,
          status: nextStatus,
          current_step: instance.current_step,
          finished,
        },
      });
    } catch (err) {
      console.error("[FormApproval] performAction error:", err);
      next(err);
    }
  },

  // ============================================================
  // 6. RE-OPEN WORKFLOW (Reset back to DRAFT for Editing)
  //    POST /form-approval/reopen
  // ============================================================
  reopenWorkflow: async (req, res, next) => {
    try {
      const { form_slug, record_id, remarks = "" } = req.body;
      if (!form_slug || !record_id) {
        return res.status(400).json({
          success: false,
          message: "form_slug and record_id are required",
        });
      }

      const userId = req.user?.user_id || req.user?._id || req.user?.id || null;
      const actorUser = await getUserById(userId);

      const instance = await WorkflowInstance.findOne({
        form_slug: { $in: [form_slug, form_slug.toLowerCase()] },
        $or: [
          { record_id: record_id },
          { record_id: String(record_id) },
          { record_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      }).sort({ created_at: -1 });

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Workflow instance not found",
        });
      }

      const history = safeJson(instance.history, []);
      history.push({
        step: 0,
        action: "REOPENED",
        by_user_id: userId,
        actor_name: actorUser?.name || req.user?.name || `User #${userId}`,
        at: new Date().toISOString(),
        remarks: remarks || "Re-opened for editing by initiator",
      });

      instance.current_step = 0;
      instance.status = "DRAFT";
      instance.remarks = remarks || "Re-opened for editing";
      instance.history = history;
      instance.updated_by = userId;
      await instance.save();

      // Reset form record to Draft
      const { Model } = await findFormRecord(form_slug, record_id);
      if (Model) {
        await Model.updateMany(
          {
            $or: [
              { _id: mongoose.isValidObjectId(record_id) ? record_id : null },
              { id: record_id },
              { id: Number(record_id) || -1 },
              { "data.id": record_id },
              { "data.id": Number(record_id) || -1 },
            ].filter(Boolean),
          },
          {
            $set: {
              status: "Draft",
              "data.status": "Draft",
              "data.workflow_status": "Draft",
              updated_by: userId,
              updated_at: new Date(),
            },
          }
        );
      }

      await recordApprovalTrack({
        apt_type: form_slug,
        apt_item_id: record_id,
        apt_user_id: userId,
        apt_user_name: actorUser?.name || req.user?.name || "Initiator",
        apt_user_role:
          actorUser?.role_id?.name || actorUser?.role_slug || "Initiator",
        apt_accept_step: "Re-opened for Editing",
        apt_remarks: remarks || "Re-opened for editing",
        apt_recipient_role: null,
        apt_recipient_id: null,
        apt_accept_status: "Draft / Re-opened",
        apt_status_flag: "REOPENED",
      });

      await markPendingNotificationsRead(userId, form_slug, record_id);

      return res.json({
        success: true,
        message: "Workflow re-opened for editing successfully",
        data: instance,
      });
    } catch (err) {
      console.error("[FormApproval] reopenWorkflow error:", err);
      next(err);
    }
  },

  // ============================================================
  // 7. PULL BACK WORKFLOW (Recall action before next user acts)
  //    POST /form-approval/pull-back
  // ============================================================
  pullBackWorkflow: async (req, res, next) => {
    try {
      const { form_slug, record_id, remarks = "" } = req.body;
      if (!form_slug || !record_id) {
        return res.status(400).json({
          success: false,
          message: "form_slug and record_id are required",
        });
      }

      const userId = req.user?.user_id || req.user?._id || req.user?.id || null;
      const actorUser = await getUserById(userId);

      const instance = await WorkflowInstance.findOne({
        form_slug: { $in: [form_slug, form_slug.toLowerCase()] },
        $or: [
          { record_id: record_id },
          { record_id: String(record_id) },
          { record_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      }).sort({ created_at: -1 });

      if (!instance) {
        return res.status(404).json({
          success: false,
          message: "Workflow instance not found",
        });
      }

      if (
        instance.status === "APPROVED" ||
        instance.status === "REJECTED" ||
        instance.status === "DRAFT"
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot pull back workflow in status "${instance.status}"`,
        });
      }

      const currentStepNum = instance.current_step || 1;
      const prevStepNum = currentStepNum > 1 ? currentStepNum - 1 : 0;
      const history = safeJson(instance.history, []);

      history.push({
        step: currentStepNum,
        action: "PULLED_BACK",
        by_user_id: userId,
        actor_name: actorUser?.name || req.user?.name || `User #${userId}`,
        at: new Date().toISOString(),
        remarks: remarks || `Pulled back from Step ${currentStepNum}`,
      });

      let nextStatus = "DRAFT";
      if (prevStepNum === 0) {
        nextStatus = "DRAFT";
      } else {
        const resolved = await resolveWorkflowForForm(form_slug, record_id);
        const steps = resolved?.steps || [];
        const prevStep = steps[prevStepNum - 1];
        const prevRoleSlug = prevStep?.role || `ROLE_${prevStep?.role_id || prevStepNum}`;
        nextStatus = `PENDING_${String(prevRoleSlug).toUpperCase()}`;
      }

      instance.current_step = prevStepNum;
      instance.status = nextStatus;
      instance.remarks = remarks || "Pulled back by user";
      instance.history = history;
      instance.updated_by = userId;
      await instance.save();

      // Update form record
      const { Model } = await findFormRecord(form_slug, record_id);
      if (Model) {
        await Model.updateMany(
          {
            $or: [
              { _id: mongoose.isValidObjectId(record_id) ? record_id : null },
              { id: record_id },
              { id: Number(record_id) || -1 },
              { "data.id": record_id },
              { "data.id": Number(record_id) || -1 },
            ].filter(Boolean),
          },
          {
            $set: {
              status: nextStatus === "DRAFT" ? "Draft" : nextStatus,
              "data.status": nextStatus === "DRAFT" ? "Draft" : nextStatus,
              "data.workflow_status": nextStatus === "DRAFT" ? "Draft" : nextStatus,
              updated_by: userId,
              updated_at: new Date(),
            },
          }
        );
      }

      await recordApprovalTrack({
        apt_type: form_slug,
        apt_item_id: record_id,
        apt_user_id: userId,
        apt_user_name: actorUser?.name || req.user?.name || "Approver",
        apt_user_role:
          actorUser?.role_id?.name || actorUser?.role_slug || "Approver",
        apt_accept_step: `Pulled Back from Step ${currentStepNum}`,
        apt_remarks: remarks || "Pulled back",
        apt_recipient_role: null,
        apt_recipient_id: null,
        apt_accept_status: "Pulled Back",
        apt_status_flag: "PULLED_BACK",
      });

      return res.json({
        success: true,
        message: "Workflow pulled back successfully",
        data: instance,
      });
    } catch (err) {
      console.error("[FormApproval] pullBackWorkflow error:", err);
      next(err);
    }
  },

  // ============================================================
  // 8. GET APPROVAL HISTORY & TRACK
  //    GET /form-approval/history?form_slug=project&record_id=5
  // ============================================================
  getApprovalHistory: async (req, res, next) => {
    try {
      const { form_slug, record_id } = req.query;
      if (!form_slug || !record_id) {
        return res.status(400).json({
          success: false,
          message: "form_slug and record_id are required",
        });
      }

      const instance = await WorkflowInstance.findOne({
        form_slug: { $in: [form_slug, form_slug.toLowerCase()] },
        $or: [
          { record_id: record_id },
          { record_id: String(record_id) },
          { record_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      })
        .sort({ created_at: -1 })
        .lean();

      const trackRecords = await ApprovalProcessTrack.find({
        apt_type: form_slug,
        $or: [
          { apt_item_id: record_id },
          { apt_item_id: String(record_id) },
          { apt_item_id: Number(record_id) || -1 },
        ],
        deleted_at: null,
      })
        .populate("apt_user_id", "name email")
        .populate("apt_recipient_id", "name email")
        .sort({ apt_created_at: 1 })
        .lean();

      const approvalTrack = trackRecords.map((t) => ({
        ...t,
        user_name: t.apt_user_name || t.apt_user_id?.name || "System",
        user_email: t.apt_user_id?.email || "",
        recipient_name: t.apt_recipient_name || t.apt_recipient_id?.name || "",
        recipient_email: t.apt_recipient_id?.email || "",
      }));

      const history = await enrichHistory(safeJson(instance?.history, []));

      return res.json({
        success: true,
        data: {
          history,
          status: instance?.status || null,
          current_step: instance?.current_step || 0,
          initiated_at: instance?.created_at || null,
          approvalTrack,
        },
      });
    } catch (err) {
      console.error("[FormApproval] getApprovalHistory error:", err);
      next(err);
    }
  },
};

module.exports = formApprovalController;
