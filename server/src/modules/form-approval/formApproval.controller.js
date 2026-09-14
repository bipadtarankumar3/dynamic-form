// server/src/modules/form-approval/formApproval.controller.js
// ============================================================
// Generic Form Approval Controller (Unified 1-Table Architecture)
//
// Single Table: `t_workflow_instances`
//   - Stage 1 (Saved Approvers): status = 'DRAFT', current_step = 0
//   - Stage 2 (Sent / Pending):  status = 'PENDING_<ROLE>', current_step = 1
//   - Stage 3 (Actioned):       status = 'PENDING_<NEXT>' | 'APPROVED' | 'REJECTED'
//
// Audit History Table: `t_approval_process_track`
// ============================================================

const db = require("../../config/db");

// ── DB Auto-Migration ─────────────────────────────────────────
const ensureFormApprovalColumns = async () => {
  try {
    // 1. Table for Approval Process Track (audit history table)
    await db.query(`
      CREATE SEQUENCE IF NOT EXISTS t_approval_process_track_id_seq;

      CREATE TABLE IF NOT EXISTS public.t_approval_process_track (
        apt_id             VARCHAR(255) PRIMARY KEY DEFAULT ('APT'::text || lpad(((nextval('t_approval_process_track_id_seq'::regclass))::character varying)::text, 20, '0'::text)),
        apt_type           VARCHAR(255),
        apt_item_id        INTEGER,
        apt_user_id        INTEGER,
        apt_user_role      VARCHAR(255),
        apt_accept_step    VARCHAR(255),
        apt_remarks        TEXT,
        apt_recipient_role VARCHAR(255),
        apt_recipient_id   INTEGER,
        apt_accept_status  VARCHAR(255),
        apt_status_flag    VARCHAR(255),
        apt_created_at     TIMESTAMPTZ DEFAULT NOW(),
        apt_updated_at     TIMESTAMPTZ DEFAULT NOW(),
        apt_deleted_at     TIMESTAMPTZ DEFAULT NULL,
        apt_created_by     INTEGER DEFAULT NULL,
        apt_updated_by     INTEGER DEFAULT NULL
      )
    `);

    // 2. Ensure per-step user assignments column exists on t_workflow_instances
    await db.query(`
      ALTER TABLE t_workflow_instances
        ADD COLUMN IF NOT EXISTS wfi_step_assignments JSONB DEFAULT '[]'::jsonb
    `).catch(() => {});

    // 3. Ensure ref_table / ref_id / is_deletable / status_flag exist on notifications and deleted_at defaults to NULL
    await db.query(`ALTER TABLE t_notifications ALTER COLUMN deleted_at SET DEFAULT NULL`).catch(() => {});
    await db.query(`ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS ref_table VARCHAR(200) DEFAULT NULL`).catch(() => {});
    await db.query(`ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS ref_id INTEGER DEFAULT NULL`).catch(() => {});
    await db.query(`ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN DEFAULT FALSE`).catch(() => {});
    await db.query(`ALTER TABLE t_notifications ADD COLUMN IF NOT EXISTS status_flag VARCHAR(50) DEFAULT NULL`).catch(() => {});
  } catch (err) {
    console.warn("[FormApproval] ensureColumns warn:", err.message);
  }
};
ensureFormApprovalColumns();

// ── Helpers ──────────────────────────────────────────────────

async function getTableInfo(form_slug) {
  let tableName = form_slug.startsWith("t_") ? form_slug : `t_frm_${form_slug}`;

  // 1. Try to fetch from t_form root_entity
  try {
    const formRes = await db.query(
      `SELECT root_entity FROM t_form WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
      [form_slug]
    );
    if (formRes.rows.length > 0) {
      const root = safeJson(formRes.rows[0].root_entity, null);
      if (root?.table) tableName = root.table;
    }
  } catch {}

  let pkCol = "id";
  let statusCol = "status";
  let updatedByCol = "updated_by";
  let updatedAtCol = "updated_at";

  // 2. Discover column names from PostgreSQL information_schema
  try {
    const colRes = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    const cols = colRes.rows.map(r => r.column_name.toLowerCase());

    if (cols.includes("status")) statusCol = "status";
    else if (cols.includes("frm_status")) statusCol = "frm_status";
    else if (cols.includes(`${form_slug}_status`)) statusCol = `${form_slug}_status`;

    if (cols.includes("id")) pkCol = "id";
    else if (cols.includes("frm_id")) pkCol = "frm_id";
    else if (cols.includes(`${form_slug}_id`)) pkCol = `${form_slug}_id`;

    if (cols.includes("updated_by")) updatedByCol = "updated_by";
    else if (cols.includes("frm_updated_by")) updatedByCol = "frm_updated_by";

    if (cols.includes("updated_at")) updatedAtCol = "updated_at";
    else if (cols.includes("frm_updated_at")) updatedAtCol = "frm_updated_at";
  } catch {}

  return { tableName, pkCol, statusCol, updatedByCol, updatedAtCol };
}

// Decode HTML entities stored by form builders (e.g. &gt; → >)
function decodeOperator(op) {
  if (!op) return op;
  return String(op)
    .replace(/&gt;/g,  ">")
    .replace(/&lt;/g,  "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x3D;/g, "=");
}

function evaluateConditions(record, conditions = []) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  let result = true;
  for (let i = 0; i < conditions.length; i++) {
    const { field, value, logic = "AND" } = conditions[i];
    const operator = decodeOperator(conditions[i].operator);
    if (!field) continue;
    const rv = String(record[field] ?? "").trim().toLowerCase();
    const cv = String(value ?? "").trim().toLowerCase();
    let match = false;
    switch (operator) {
      case "=": case "==": case "EQUALS":      match = rv === cv; break;
      case "!=": case "<>": case "NOT_EQUALS": match = rv !== cv; break;
      case ">":  match = !isNaN(Number(rv)) && Number(rv) > Number(cv); break;
      case "<":  match = !isNaN(Number(rv)) && Number(rv) < Number(cv); break;
      case ">=": match = !isNaN(Number(rv)) && Number(rv) >= Number(cv); break;
      case "<=": match = !isNaN(Number(rv)) && Number(rv) <= Number(cv); break;
      case "CONTAINS": case "contains": match = rv.includes(cv); break;
      case "IN": case "in":
        match = (Array.isArray(value) ? value : String(value).split(","))
          .map(v => String(v).trim().toLowerCase()).includes(rv);
        break;
      case "is_empty":     match = !record[field] || rv === ""; break;
      case "is_not_empty": match = Boolean(record[field]) && rv !== ""; break;
      default: match = rv === cv;
    }
    if (i === 0) result = match;
    else if (logic === "OR") result = result || match;
    else result = result && match;
  }
  return result;
}

function safeJson(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

async function sendNotification({ user_id, title, message, event_key, ref_table, ref_id, link, type = "info", is_deletable = false, status_flag = null }) {
  if (!user_id) return;
  try {
    await db.query(
      `INSERT INTO t_notifications
         (user_id, title, message, type, link, is_read, event_key, ref_table, ref_id, is_deletable, status_flag, deleted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7, $8, $9, $10, NULL, NOW(), NOW())`,
      [user_id, title, message || "", type, link || null, event_key, ref_table || null, ref_id || null, Boolean(is_deletable), status_flag]
    );
  } catch (err) {
    console.error("[FormApproval] sendNotification error:", err.message);
  }
}

async function markPendingNotificationsRead(userId, refTable, refId) {
  if (!userId || !refId) return;
  try {
    const result = await db.query(
      `UPDATE t_notifications
         SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1
         AND is_read = FALSE
         AND deleted_at IS NULL
         AND (
           (
             ref_id = $2
             AND (
               ref_table = $3
               OR ref_table ILIKE '%' || $3 || '%'
               OR $3 ILIKE '%' || ref_table || '%'
               OR ref_table IS NULL
             )
           )
           OR link ILIKE '%/' || $2::text
           OR link ILIKE '%/' || $2::text || '/%'
           OR link ILIKE '%/' || $2::text || '?%'
           OR link ILIKE '%record_id=' || $2::text || '%'
         )
       RETURNING id`,
      [Number(userId), Number(refId), String(refTable || "")]
    );
    if (result.rows && result.rows.length > 0) {
      console.log(`[FormApproval] Marked ${result.rows.length} notification(s) as read for user ${userId}, ref ${refTable}#${refId}`);
    }
  } catch (err) {
    console.error("[FormApproval] markPendingRead error:", err.message);
  }
}

async function getUserById(userId) {
  if (!userId) return null;
  const res = await db.query(
    `SELECT u.id, u.name, u.email, r.name AS role_name, r.slug AS role_slug
       FROM t_users u
       LEFT JOIN t_roles r ON r.id = u.role_id
      WHERE u.id = $1 AND u.deleted_at IS NULL LIMIT 1`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return res.rows[0] || null;
}

// ── Insert into t_approval_process_track ─────────────────────
async function recordApprovalTrack({
  apt_type,
  apt_item_id,
  apt_user_id,
  apt_user_role,
  apt_accept_step,
  apt_remarks,
  apt_recipient_role,
  apt_recipient_id,
  apt_accept_status,
  apt_status_flag,
}) {
  try {
    await db.query(
      `INSERT INTO t_approval_process_track
         (apt_type, apt_item_id, apt_user_id, apt_user_role, apt_accept_step,
          apt_remarks, apt_recipient_role, apt_recipient_id, apt_accept_status,
          apt_status_flag, apt_created_by, apt_updated_by, apt_created_at, apt_updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $3, $3, NOW(), NOW())`,
      [
        apt_type,
        apt_item_id,
        apt_user_id,
        apt_user_role,
        apt_accept_step,
        apt_remarks,
        apt_recipient_role,
        apt_recipient_id,
        apt_accept_status,
        apt_status_flag,
      ]
    );

    // Sync to t_ngo_due_diligence_versions if due_diligence
    if (apt_type === "due_diligence" || apt_type === "due-diligence") {
      try {
        let v = null;
        let ngoUserId = null;

        // Check if apt_item_id is id in t_frm_due_diligence, then get its creator
        const frmRes = await db.query(
          `SELECT created_by, user_id FROM t_frm_due_diligence WHERE id = $1 LIMIT 1`,
          [apt_item_id]
        ).catch(() => ({ rows: [] }));

        if (frmRes.rows[0]?.created_by || frmRes.rows[0]?.user_id) {
          ngoUserId = frmRes.rows[0].created_by || frmRes.rows[0].user_id;
        } else {
          // Check if apt_item_id is a user id directly
          const uCheck = await db.query(
            `SELECT id FROM t_users WHERE id = $1 LIMIT 1`,
            [apt_item_id]
          ).catch(() => ({ rows: [] }));
          if (uCheck.rows.length > 0) {
            ngoUserId = apt_item_id;
          }
        }

        if (ngoUserId) {
          const vRes = await db.query(
            `SELECT id, approval_track, version_number FROM t_ngo_due_diligence_versions 
             WHERE user_id = $1 AND form_slug = 'due_diligence'
             ORDER BY version_number DESC LIMIT 1`,
            [ngoUserId]
          );
          if (vRes.rows.length > 0) v = vRes.rows[0];
        }

        if (v) {
          let currentTrack = [];
          if (v.approval_track) {
            currentTrack = typeof v.approval_track === "string" ? JSON.parse(v.approval_track) : v.approval_track;
          }
          if (!Array.isArray(currentTrack)) currentTrack = [];

          currentTrack.push({
            id: `track_${Date.now()}_wf`,
            action: apt_status_flag || apt_accept_status,
            status: apt_accept_status,
            version_number: v.version_number,
            performed_by_id: apt_user_id,
            performed_by_role: apt_user_role,
            step: apt_accept_step,
            remarks: apt_remarks,
            timestamp: new Date().toISOString(),
          });

          // Check authoritative workflow status for this record if instance exists
          let newStatus = "UNDER_REVIEW";
          const flag = String(apt_status_flag || "").toUpperCase();
          const acceptSt = String(apt_accept_status || "").toUpperCase();

          const wfCheck = await db.query(
            `SELECT status FROM t_workflow_instances WHERE record_table = 't_frm_due_diligence' AND record_id = $1 ORDER BY id DESC LIMIT 1`,
            [apt_item_id]
          ).catch(() => ({ rows: [] }));
          const wfStatus = wfCheck.rows[0]?.status;

          if (wfStatus === "APPROVED" || acceptSt === "APPROVED" || flag === "APPROVED") {
            newStatus = "APPROVED";
          } else if (wfStatus === "REJECTED" || flag.includes("REJECT")) {
            newStatus = "REJECTED";
          } else if (wfStatus === "RESEND" || flag.includes("RESEND") || flag.includes("REQUEST_INFO")) {
            newStatus = "NEEDS_REVISION";
          } else if (wfStatus && wfStatus.startsWith("PENDING")) {
            newStatus = "SENT_FOR_APPROVAL";
          } else if (flag.includes("SEND") || flag.includes("PENDING") || flag === "INITIATED") {
            newStatus = "SENT_FOR_APPROVAL";
          }

          await db.query(
            `UPDATE t_ngo_due_diligence_versions 
             SET approval_track = $1, status = $2, updated_at = NOW() 
             WHERE id = $3`,
            [JSON.stringify(currentTrack), newStatus, v.id]
          );
        }
      } catch (syncErr) {
        console.warn("[FormApproval] Sync to t_ngo_due_diligence_versions notice:", syncErr.message);
      }
    }
  } catch (err) {
    console.error("[FormApproval] recordApprovalTrack error:", err.message);
  }
}

async function resolveWorkflowForForm(form_slug, record_id) {
  const wfResult = await db.query(
    `SELECT id, name, slug, flow_type, has_conditions, steps, conditions, initiator_roles
       FROM t_workflow_defs
      WHERE trigger_form = $1 AND is_active = true AND deleted_at IS NULL
      ORDER BY id ASC`,
    [form_slug]
  );
  if (wfResult.rows.length === 0) return null;

  const { tableName, pkCol } = await getTableInfo(form_slug);
  let record = {};
  try {
    const recRes = await db.query(
      `SELECT * FROM ${tableName} WHERE ${pkCol} = $1 OR id = $1 LIMIT 1`,
      [record_id]
    );
    if (recRes.rows.length > 0) {
      record = recRes.rows[0];
    } else if (form_slug === "due_diligence" || form_slug === "due-diligence") {
      const verRes = await db.query(
        `SELECT * FROM t_ngo_due_diligence_versions 
         WHERE (id = $1 OR user_id = $1) AND form_slug = 'due_diligence'
         ORDER BY version_number DESC LIMIT 1`,
        [record_id]
      );
      if (verRes.rows.length > 0) {
        record = typeof verRes.rows[0].data === "string" ? JSON.parse(verRes.rows[0].data) : (verRes.rows[0].data || verRes.rows[0]);
      }
    }
  } catch { /* table may not exist yet */ }

  let matchedWorkflow = null;
  let matchedRule = null;

  for (const wf of wfResult.rows) {
    const rulesRes = await db.query(
      `SELECT id, rule_name, conditions, initiator_roles, steps, order_index
         FROM t_workflow_rules
        WHERE workflow_id = $1 AND is_active = true AND deleted_at IS NULL
        ORDER BY order_index ASC, id ASC`,
      [wf.id]
    );
    const rules = rulesRes.rows;

    if (rules.length > 0) {
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
      // Fallback: show workflow with first rule even if no condition matches
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
  const rawSteps = matchedRule?.steps ?? matchedWorkflow.steps;
  const steps = safeJson(rawSteps, []);
  return { workflow: matchedWorkflow, matchedRule, steps, record };
}

// ── Enrich history with actor names ──────────────────────────
async function enrichHistory(history = []) {
  if (!history || history.length === 0) return [];
  const userIds = [...new Set(history.map(h => h.by_user_id).filter(Boolean))];
  let userMap = {};
  if (userIds.length > 0) {
    const res = await db.query(
      `SELECT id, name FROM t_users WHERE id = ANY($1) AND deleted_at IS NULL`,
      [userIds]
    ).catch(() => ({ rows: [] }));
    res.rows.forEach(u => { userMap[u.id] = u.name; });
  }
  return history.map(h => ({
    ...h,
    actor_name: userMap[h.by_user_id] || h.actor_name || `User #${h.by_user_id}`,
  }));
}

// ============================================================
// 1. GET FULL WORKFLOW STATE & APPROVAL TRACK
//    GET /form-approval/workflow?form_slug=project&record_id=5
// ============================================================
const getWorkflowState = async (req, res, next) => {
  try {
    const { form_slug, record_id } = req.query;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }

    const resolved = await resolveWorkflowForForm(form_slug, Number(record_id));
    if (!resolved) {
      return res.json({ success: true, data: { hasWorkflow: false } });
    }

    const { workflow, matchedRule, steps, record } = resolved;
    const { tableName } = await getTableInfo(form_slug);

    // ── Check single table: t_workflow_instances for this specific record ───────────────
    let instanceRes = await db.query(
      `SELECT * FROM t_workflow_instances
        WHERE (record_table = $1 OR (record_table IN ('t_frm_due_diligence', 't_ngo_due_diligence_versions') AND $1 IN ('t_frm_due_diligence', 't_ngo_due_diligence_versions')))
          AND record_id = $2
          AND deleted_at IS NULL
        ORDER BY id DESC LIMIT 1`,
      [tableName, Number(record_id)]
    ).catch(() => ({ rows: [] }));

    const instance = instanceRes.rows[0] || null;

    let instanceData = null;
    let savedAssignment = null;

    if (instance) {
      const stepAssignments = safeJson(instance.wfi_step_assignments, []);
      const history = await enrichHistory(safeJson(instance.history, []));

      // Resolve users for each assigned step
      const allUserIds = [...new Set(stepAssignments.map(a => a.user_id).filter(Boolean))];
      let assignedUserMap = {};
      if (allUserIds.length > 0) {
        const ur = await db.query(
          `SELECT id, name, email FROM t_users WHERE id = ANY($1) AND deleted_at IS NULL`,
          [allUserIds]
        ).catch(() => ({ rows: [] }));
        ur.rows.forEach(u => { assignedUserMap[u.id] = u; });
      }

      const enrichedAssignments = stepAssignments.map(a => {
        const stepNum = Number(a.step);
        const stepDef = steps.find(s => Number(s.step || s.level) === stepNum) || {};
        return {
          ...a,
          actions: a.actions || stepDef.actions || stepDef.permitted_actions || ["approve", "reject"],
          label: a.label || stepDef.label || `Step ${stepNum}`,
          reject_to_step: a.reject_to_step !== undefined ? a.reject_to_step : (stepDef.reject_to_step || "0"),
          user: assignedUserMap[a.user_id] || null,
        };
      });

      if (instance.status === "DRAFT") {
        // Stage 1 completed: approvers saved, not sent yet
        savedAssignment = {
          id: instance.id,
          assignments: enrichedAssignments,
        };
      } else {
        // Stage 2+: active or finished workflow
        const currentStep = instance.current_step || 1;
        const nextStepNum = currentStep + 1;
        const nextAssignment = enrichedAssignments.find(a => Number(a.step) === nextStepNum);
        const currentAssignment = enrichedAssignments.find(a => Number(a.step) === currentStep);

        // Find initiator
        const initiatorEntry = history.find(h => h.action === "SEND_FOR_APPROVAL" || h.action === "RESEND_FOR_APPROVAL");
        const initiatorUserId = initiatorEntry?.by_user_id || instance.created_by;
        let initiatorUser = null;
        if (initiatorUserId) {
          initiatorUser = await getUserById(initiatorUserId);
        }

        // Extract rejection info if rejected
        let rejectionInfo = null;
        if (instance.status === "REJECTED" || instance.status === "RESEND" || instance.status === "CHANGES_REQUESTED") {
          const lastEvent = [...history].reverse().find(h => h.action === "REJECT" || h.action === "RESEND" || h.action === "REQUEST_INFO");
          rejectionInfo = {
            action: lastEvent?.action || (instance.status === "RESEND" ? "RESEND" : "REJECT"),
            step: lastEvent?.step || currentStep,
            role: lastEvent?.role || null,
            actor_name: lastEvent?.actor_name || null,
            by_user_id: lastEvent?.by_user_id || null,
            remarks: lastEvent?.remarks || instance.remarks || "",
            at: lastEvent?.at || instance.updated_at,
          };
        }

        instanceData = {
          id: instance.id,
          status: instance.status,
          current_step: currentStep,
          remarks: instance.remarks,
          assignments: enrichedAssignments,
          current_approver: currentAssignment?.user || null,
          next_approver: nextAssignment?.user || null,
          initiator: initiatorUser ? { id: initiatorUser.id, name: initiatorUser.name, email: initiatorUser.email, role_name: initiatorUser.role_name } : (initiatorUserId ? { id: initiatorUserId } : null),
          rejectionInfo,
          history,
        };
      }
    }

    // ── Fetch Approval Track records (from t_approval_process_track) ──
    const trackRes = await db.query(
      `SELECT apt.*,
              u.name AS user_name, u.email AS user_email,
              rec.name AS recipient_name, rec.email AS recipient_email
         FROM t_approval_process_track apt
         LEFT JOIN t_users u ON u.id = apt.apt_user_id
         LEFT JOIN t_users rec ON rec.id = apt.apt_recipient_id
        WHERE apt.apt_type = $1 AND apt.apt_item_id = $2 AND apt.apt_deleted_at IS NULL
        ORDER BY apt.apt_created_at ASC, apt.apt_id ASC`,
      [form_slug, Number(record_id)]
    ).catch(() => ({ rows: [] }));

    const approvalTrack = trackRes.rows || [];

    // Fetch creator of record if available
    let recordCreator = null;
    if (record?.created_by) {
      recordCreator = await getUserById(record.created_by);
    }

    // Resolve allowed initiator roles from matched rule or workflow
    const allowedInitiatorRoles = (matchedRule?.initiator_roles && matchedRule.initiator_roles.length > 0)
      ? matchedRule.initiator_roles
      : (workflow.initiator_roles || []);

    const userRoleSlug = String(req.user?.role_slug || req.user?.role_name || "").toLowerCase();
    const userRoleId = Number(req.user?.role_id);
    const isSuperAdmin = Boolean(
      req.user?.isConfigurator ||
      userRoleId === 1 ||
      userRoleSlug === "superadmin" ||
      userRoleSlug === "configurator"
    );

    let canInitiate = false;
    if (allowedInitiatorRoles.length > 0) {
      canInitiate = isSuperAdmin || allowedInitiatorRoles.some(
        (r) => Number(r) === userRoleId || String(r).toLowerCase() === userRoleSlug
      );
    } else {
      // If no restrictions, default to Admin / Configurator
      canInitiate = isSuperAdmin || userRoleId === 2 || userRoleSlug === "admin";
    }

    return res.json({
      success: true,
      data: {
        hasWorkflow: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          flow_type: workflow.flow_type,
          initiator_roles: workflow.initiator_roles || [],
        },
        matchedRule: matchedRule ? {
          id: matchedRule.id,
          rule_name: matchedRule.rule_name,
          initiator_roles: matchedRule.initiator_roles || [],
        } : null,
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
    next(err);
  }
};

// ============================================================
// 2. GET USERS BY ROLE
//    GET /form-approval/users-by-role/:roleId
// ============================================================
const getUsersByRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    if (!roleId) {
      return res.status(400).json({ success: false, message: "roleId is required" });
    }
    const result = await db.query(
      `SELECT u.id, u.name, u.email, r.name AS role_name, r.slug AS role_slug
         FROM t_users u
         LEFT JOIN t_roles r ON r.id = u.role_id AND r.deleted_at IS NULL
        WHERE u.role_id = $1
          AND u.is_active = true
          AND u.deleted_at IS NULL
        ORDER BY u.name ASC`,
      [Number(roleId)]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 3. SAVE APPROVER ASSIGNMENTS (Stage 1: status = 'DRAFT')
//    POST /form-approval/save-assignments
//    Body: { form_slug, record_id, assignments: [{step, user_id, role_id, role_name}] }
// ============================================================
const saveAssignments = async (req, res, next) => {
  try {
    const { form_slug, record_id, assignments = [] } = req.body;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: "assignments array is required" });
    }

    const userId = req.user?.user_id || req.user?.id || null;
    const { tableName } = await getTableInfo(form_slug);

    // Resolve workflow to store IDs
    const resolved = await resolveWorkflowForForm(form_slug, Number(record_id));
    if (!resolved) {
      return res.status(404).json({ success: false, message: "No active approval workflow found for this form" });
    }
    const { workflow, matchedRule, steps = [] } = resolved;

    // Verify initiator permissions: only Admins or roles declared in workflow.initiator_roles
    const userRoleSlug = String(req.user?.role_slug || req.user?.role_name || "").toLowerCase();
    const userRoleId = Number(req.user?.role_id);
    const isAdminUser = Boolean(
      req.user?.isConfigurator ||
      userRoleId === 1 ||
      userRoleId === 2 ||
      userRoleSlug === "admin" ||
      userRoleSlug === "superadmin" ||
      userRoleSlug === "configurator"
    );
    const initiatorRoles = workflow.initiator_roles || [];
    const isAllowedInitiator =
      isAdminUser ||
      (Array.isArray(initiatorRoles) &&
        initiatorRoles.length > 0 &&
        initiatorRoles.some(
          (r) => String(r).toLowerCase() === userRoleSlug || Number(r) === userRoleId
        ));

    if (!isAllowedInitiator) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only administrators or designated workflow initiators can assign approvers."
      });
    }

    // Validate each step has a user_id and enrich with actions
    const assignmentsToSave = [];
    for (const a of assignments) {
      if (!a.step || !a.user_id) {
        return res.status(400).json({
          success: false,
          message: `Each assignment must have step and user_id. Got: ${JSON.stringify(a)}`
        });
      }
      const stepNum = Number(a.step);
      const stepDef = steps.find(s => Number(s.step || s.level) === stepNum) || {};
      assignmentsToSave.push({
        step: stepNum,
        user_id: Number(a.user_id),
        role_id: a.role_id || stepDef.role_id,
        role: a.role || stepDef.role,
        role_name: a.role_name || stepDef.role_name,
        label: a.label || stepDef.label || `Step ${stepNum}`,
        actions: a.actions || stepDef.actions || stepDef.permitted_actions || ["approve", "reject"],
        reject_to_step: a.reject_to_step !== undefined ? a.reject_to_step : (stepDef.reject_to_step || "0"),
      });
    }

    // Check if an existing instance exists in t_workflow_instances
    const existing = await db.query(
      `SELECT id, status FROM t_workflow_instances
        WHERE record_table = $1 AND record_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [tableName, Number(record_id)]
    );

    let resultRow;
    if (existing.rows.length > 0) {
      const current = existing.rows[0];
      if (current.status !== "DRAFT" && current.status !== "REJECTED" && current.status !== "RESEND") {
        return res.status(409).json({
          success: false,
          message: "Approval has already been sent for this record and is currently in progress.",
        });
      }
      const updateRes = await db.query(
        `UPDATE t_workflow_instances
           SET wfi_step_assignments = $1, workflow_id = $2, rule_id = $3,
               status = 'DRAFT', current_step = 0,
               updated_by = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [JSON.stringify(assignmentsToSave), workflow.id, matchedRule ? matchedRule.id : null, userId, current.id]
      );
      resultRow = updateRes.rows[0];
    } else {
      const insertRes = await db.query(
        `INSERT INTO t_workflow_instances
           (workflow_id, rule_id, record_table, record_id,
            current_step, status, remarks, history,
            wfi_step_assignments, created_by, updated_by)
         VALUES ($1, $2, $3, $4, 0, 'DRAFT', '', '[]'::jsonb, $5, $6, $6)
         RETURNING *`,
        [workflow.id, matchedRule ? matchedRule.id : null, tableName, Number(record_id), JSON.stringify(assignmentsToSave), userId]
      );
      resultRow = insertRes.rows[0];
    }

    return res.status(201).json({
      success: true,
      message: "Approver assignments saved successfully",
      data: resultRow,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 4. SEND / RESEND FOR APPROVAL (Stage 2: status = 'PENDING_<ROLE>', step = 1)
//    POST /form-approval/send
//    Body: { form_slug, record_id, remarks, assignments }
// ============================================================
const sendForApproval = async (req, res, next) => {
  try {
    const { form_slug, record_id, remarks = "", assignments = null } = req.body;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }

    const { tableName, pkCol, statusCol, updatedByCol, updatedAtCol } = await getTableInfo(form_slug);
    const userId = req.user?.user_id || req.user?.id || null;

    // Fetch existing instance from t_workflow_instances
    const draftRes = await db.query(
      `SELECT * FROM t_workflow_instances
        WHERE record_table = $1 AND record_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [tableName, Number(record_id)]
    );

    if (draftRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please save approver assignments first before sending for approval",
      });
    }

    const draftInstance = draftRes.rows[0];
    const isResend = draftInstance.status === "REJECTED" || draftInstance.status === "RESEND";

    if (draftInstance.status !== "DRAFT" && draftInstance.status !== "REJECTED" && draftInstance.status !== "RESEND") {
      return res.status(409).json({ success: false, message: "Approval already active for this record" });
    }

    // Step assignments: from body if provided, else from draftInstance
    let step_assignments = Array.isArray(assignments) && assignments.length > 0
      ? assignments
      : safeJson(draftInstance.wfi_step_assignments, []);

    if (step_assignments.length === 0) {
      return res.status(400).json({ success: false, message: "No approver assignments found" });
    }

    // Resolve workflow
    const resolved = await resolveWorkflowForForm(form_slug, Number(record_id));
    if (!resolved) {
      return res.status(404).json({ success: false, message: "No active approval workflow found" });
    }
    const { workflow, matchedRule, steps } = resolved;
    if (steps.length === 0) {
      return res.status(400).json({ success: false, message: "Workflow has no steps defined" });
    }

    // Verify initiator permissions: only Admins or roles declared in workflow.initiator_roles
    const userRoleSlug = String(req.user?.role_slug || req.user?.role_name || "").toLowerCase();
    const userRoleId = Number(req.user?.role_id);
    const isAdminUser = Boolean(
      req.user?.isConfigurator ||
      userRoleId === 1 ||
      userRoleId === 2 ||
      userRoleSlug === "admin" ||
      userRoleSlug === "superadmin" ||
      userRoleSlug === "configurator"
    );
    const initiatorRoles = workflow.initiator_roles || [];
    const isAllowedInitiator =
      isAdminUser ||
      (Array.isArray(initiatorRoles) &&
        initiatorRoles.length > 0 &&
        initiatorRoles.some(
          (r) => String(r).toLowerCase() === userRoleSlug || Number(r) === userRoleId
        ));

    if (!isAllowedInitiator) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only administrators or designated workflow initiators can send records for approval."
      });
    }

    const firstStep = steps[0];
    const firstRoleSlug = firstStep?.role || `ROLE_${firstStep?.role_id || 1}`;
    const initialStatus = `PENDING_${String(firstRoleSlug).toUpperCase()}`;
    const initiatorUser = await getUserById(userId);

    const history = safeJson(draftInstance.history, []);
    history.push({
      step: 0,
      action: isResend ? "RESEND_FOR_APPROVAL" : "SEND_FOR_APPROVAL",
      by_user_id: userId,
      actor_name: initiatorUser?.name || `User #${userId}`,
      at: new Date().toISOString(),
      remarks: remarks || (isResend ? "Resubmitted for approval" : "Sent for approval."),
    });

    // Update the instance from DRAFT / REJECTED → PENDING (Step 1)
    const instanceRes = await db.query(
      `UPDATE t_workflow_instances
         SET current_step = 1, status = $1, remarks = $2,
             wfi_step_assignments = $3,
             history = $4, updated_by = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, status, current_step`,
      [initialStatus, remarks, JSON.stringify(step_assignments), JSON.stringify(history), userId, draftInstance.id]
    );

    // Update form record status
    try {
      await db.query(
        `UPDATE ${tableName}
           SET ${statusCol} = $1, ${updatedByCol} = $2, ${updatedAtCol} = NOW()
         WHERE ${pkCol} = $3`,
        [initialStatus, userId, Number(record_id)]
      );
    } catch (e) {
      console.warn("[FormApproval] Could not update record status:", e.message);
    }

    // Step 1 recipient
    const step1 = step_assignments.find(a => Number(a.step) === 1);

    // ── Audit: Insert into t_approval_process_track ───────────
    await recordApprovalTrack({
      apt_type:           form_slug,
      apt_item_id:        Number(record_id),
      apt_user_id:        userId,
      apt_user_role:      initiatorUser?.role_name || initiatorUser?.role_slug || "Initiator",
      apt_accept_step:    isResend
        ? `Resend for Approval (Step 1: ${firstStep?.role_name || firstRoleSlug})`
        : `Send for Approval (Step 1: ${firstStep?.role_name || firstRoleSlug})`,
      apt_remarks:        remarks || (isResend ? "Resubmitted for approval" : "Sent for approval"),
      apt_recipient_role: firstStep?.role_name || firstRoleSlug,
      apt_recipient_id:   step1?.user_id || null,
      apt_accept_status:  "Pending Approval",
      apt_status_flag:    isResend ? "RESENT" : "INITIATED",
    });

    // Notify Step-1 assigned user
    if (step1?.user_id) {
      const label = `${form_slug.replace(/_/g, " ")} #${record_id}`;
      await sendNotification({
        user_id: step1.user_id,
        title: isResend ? `Approval Request (Resubmitted): ${label}` : `Approval Request: ${label}`,
        message: isResend
          ? `${initiatorUser?.name || "Initiator"} has resubmitted "${label}" for your approval (Step 1: ${firstStep?.role_name || firstRoleSlug}). Remarks: ${remarks || "—"}`
          : `${initiatorUser?.name || "Someone"} sent "${label}" for your approval — Step 1: ${firstStep?.role_name || firstRoleSlug}.`,
        event_key: "form_approval_pending",
        ref_table: tableName,
        ref_id: Number(record_id),
        link: `/admin/forms/${form_slug}/${record_id}`,
      });
    }

    // Mark initiator's notifications for this record as read
    await markPendingNotificationsRead(userId, tableName, Number(record_id));

    return res.status(200).json({
      success: true,
      message: isResend ? "Record resubmitted for approval successfully" : "Record sent for approval successfully",
      data: instanceRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 5. PERFORM ACTION (Approve / Reject / Resend / Forward / Review)
//    POST /form-approval/action
//    Body: { form_slug, record_id, instance_id, action, remarks }
// ============================================================
const performAction = async (req, res, next) => {
  try {
    const { form_slug, record_id, instance_id, action, remarks = "" } = req.body;
    if (!form_slug || !record_id || !instance_id || !action) {
      return res.status(400).json({ success: false, message: "form_slug, record_id, instance_id, and action are required" });
    }

    const normAction = String(action).toUpperCase();
    const VALID_ACTIONS = ["APPROVE", "REJECT", "RESEND", "REQUEST_INFO", "FORWARD", "REVIEW"];
    if (!VALID_ACTIONS.includes(normAction)) {
      return res.status(400).json({ success: false, message: `action must be one of: ${VALID_ACTIONS.join(", ")}` });
    }

    const { tableName, pkCol, statusCol, updatedByCol, updatedAtCol } = await getTableInfo(form_slug);
    const userId = req.user?.user_id || req.user?.id || null;

    // Fetch running instance
    const instanceRes = await db.query(
      `SELECT * FROM t_workflow_instances WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [Number(instance_id)]
    );
    if (instanceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow instance not found" });
    }

    const instance = instanceRes.rows[0];
    const stepAssignments = safeJson(instance.wfi_step_assignments, []);
    const history = safeJson(instance.history, []);
    const currentStepNum = instance.current_step || 1;

    // Validate this user is the assigned approver for the current step
    const currentAssignment = stepAssignments.find(a => Number(a.step) === currentStepNum);
    if (currentAssignment && Number(currentAssignment.user_id) !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: `You are not the assigned approver for Step ${currentStepNum}`,
      });
    }

    // Fetch workflow steps
    const resolved = await resolveWorkflowForForm(form_slug, Number(record_id));
    if (!resolved) {
      return res.status(404).json({ success: false, message: "Workflow configuration not found" });
    }
    const { steps } = resolved;

    if (currentStepNum < 1 || currentStepNum > steps.length) {
      return res.status(400).json({ success: false, message: "Workflow is in an invalid or already-completed state" });
    }

    const currentStep = steps[currentStepNum - 1];
    const actorUser = await getUserById(userId);
    const recordLabel = `${form_slug.replace(/_/g, " ")} #${record_id}`;

    history.push({
      step: currentStepNum,
      action: normAction,
      role: currentStep?.role_name || currentStep?.role,
      role_id: currentStep?.role_id,
      by_user_id: userId,
      actor_name: actorUser?.name || `User #${userId}`,
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
      nextStatus = "RESEND"; // Pauses workflow and sends back for changes
      finished = true;
      nextStepNum = currentStepNum;
      acceptStatusText = "Changes Requested";
    } else {
      // APPROVE / FORWARD / REVIEW
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
        nextAssignment = stepAssignments.find(a => Number(a.step) === nextStepNum);
        acceptStatusText = normAction === "FORWARD" ? "Forwarded" : normAction === "REVIEW" ? "Reviewed & Passed" : "Approved & Forwarded";
      }
    }

    // Update the workflow instance
    await db.query(
      `UPDATE t_workflow_instances
         SET current_step = $1, status = $2, remarks = $3,
             history = $4, updated_by = $5, updated_at = NOW()
       WHERE id = $6`,
      [finished ? (normAction === "REJECT" || normAction === "RESEND" || normAction === "REQUEST_INFO" ? currentStepNum : 0) : nextStepNum, nextStatus, remarks, JSON.stringify(history), userId, Number(instance_id)]
    );

    // Update form record status
    try {
      const recordStatusText =
        normAction === "RESEND" || normAction === "REQUEST_INFO"
          ? "Changes Requested"
          : nextStatus === "APPROVED"
          ? "Approved"
          : nextStatus === "REJECTED"
          ? "Rejected"
          : nextStatus;

      await db.query(
        `UPDATE ${tableName}
           SET ${statusCol} = $1, ${updatedByCol} = $2, ${updatedAtCol} = NOW()
         WHERE ${pkCol} = $3`,
        [recordStatusText, userId, Number(record_id)]
      );
    } catch (e) {
      console.warn("[FormApproval] Could not update record status:", e.message);
    }

    // Explicit sync to t_ngo_due_diligence_versions if due_diligence
    if (form_slug === "due_diligence" || form_slug === "due-diligence" || tableName === "t_frm_due_diligence") {
      try {
        const frmUserRes = await db.query(
          `SELECT created_by, user_id FROM "${tableName}" WHERE "${pkCol}" = $1 LIMIT 1`,
          [Number(record_id)]
        ).catch(() => ({ rows: [] }));
        const ngoUserId = frmUserRes.rows[0]?.created_by || frmUserRes.rows[0]?.user_id || instance.created_by;
        if (ngoUserId) {
          const targetVerStatus =
            nextStatus === "APPROVED"
              ? "APPROVED"
              : nextStatus === "REJECTED"
              ? "REJECTED"
              : normAction === "RESEND" || normAction === "REQUEST_INFO"
              ? "NEEDS_REVISION"
              : "UNDER_REVIEW";

          await db.query(
            `UPDATE t_ngo_due_diligence_versions
                SET status = $1, updated_at = NOW()
              WHERE user_id = $2 AND form_slug = 'due_diligence'
                AND version_number = (
                  SELECT MAX(version_number) FROM t_ngo_due_diligence_versions WHERE user_id = $2 AND form_slug = 'due_diligence'
                )`,
            [targetVerStatus, ngoUserId]
          );
        }
      } catch (ddSyncErr) {
        console.warn("[FormApproval] Explicit DD version status sync notice:", ddSyncErr.message);
      }
    }

    // ── Audit: Insert into t_approval_process_track ───────────
    await recordApprovalTrack({
      apt_type:           form_slug,
      apt_item_id:        Number(record_id),
      apt_user_id:        userId,
      apt_user_role:      actorUser?.role_name || actorUser?.role_slug || currentStep?.role_name || "Approver",
      apt_accept_step:    `Step ${currentStepNum}: ${currentStep?.role_name || currentStep?.role}`,
      apt_remarks:        remarks || "—",
      apt_recipient_role: !finished ? (nextStep?.role_name || nextRoleSlug) : null,
      apt_recipient_id:   !finished ? (nextAssignment?.user_id || null) : null,
      apt_accept_status:  acceptStatusText,
      apt_status_flag:    normAction,
    });

    // Mark current user's pending notification as read
    await markPendingNotificationsRead(userId, tableName, Number(record_id));

    // Find initiator from history
    const initiatorEntry = [...history].reverse().find(h => h.action === "SEND_FOR_APPROVAL" || h.action === "RESEND_FOR_APPROVAL");
    const initiatorUserId = initiatorEntry?.by_user_id || instance.created_by;

    if (normAction === "REJECT" || normAction === "RESEND" || normAction === "REQUEST_INFO") {
      if (initiatorUserId) {
        const notifTitle = normAction === "RESEND" || normAction === "REQUEST_INFO"
          ? `${recordLabel} — Changes Requested (Resend)`
          : `${recordLabel} — Rejected`;
        const notifMsg = normAction === "RESEND" || normAction === "REQUEST_INFO"
          ? `Changes requested by ${actorUser?.name || "an approver"} at Step ${currentStepNum} (${currentStep?.role_name || currentStep?.role}). Reason: ${remarks || "—"}`
          : `Rejected by ${actorUser?.name || "an approver"} at Step ${currentStepNum} (${currentStep?.role_name || currentStep?.role}). Remarks: ${remarks || "—"}`;

        await sendNotification({
          user_id: initiatorUserId,
          title: notifTitle,
          message: notifMsg,
          event_key: normAction === "RESEND" || normAction === "REQUEST_INFO" ? "form_approval_resend" : "form_approval_rejected",
          ref_table: tableName, ref_id: Number(record_id),
          link: `/admin/forms/${form_slug}/${record_id}`,
        });
      }
    } else if (!finished) {
      // Notify next approver
      if (nextAssignment?.user_id) {
        await sendNotification({
          user_id: nextAssignment.user_id,
          title: `Approval Request: ${recordLabel}`,
          message: `Step ${currentStepNum} actioned (${normAction}) by ${actorUser?.name || "an approver"}. Your action is needed for Step ${nextStepNum}: ${nextStep?.role_name || nextStep?.role || ""}.`,
          event_key: "form_approval_pending",
          ref_table: tableName, ref_id: Number(record_id),
          link: `/admin/forms/${form_slug}/${record_id}`,
        });
      }
    } else {
      // Final approval — notify initiator
      if (initiatorUserId) {
        await sendNotification({
          user_id: initiatorUserId,
          title: `${recordLabel} — Approved ✓`,
          message: `Fully approved by ${actorUser?.name || "an approver"}. All ${steps.length} step(s) completed.`,
          event_key: "form_approval_approved",
          type: "success",
          is_deletable: true,
          status_flag: "APPROVED",
          ref_table: tableName, ref_id: Number(record_id),
          link: `/admin/forms/${form_slug}/${record_id}`,
        });
      }
    }

    return res.json({
      success: true,
      message: `Action "${normAction}" performed successfully`,
      data: {
        instance_id: Number(instance_id),
        status: nextStatus,
        current_step: finished ? (normAction === "REJECT" || normAction === "RESEND" ? currentStepNum : 0) : nextStepNum,
        finished,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 6. RE-OPEN WORKFLOW (Reset back to DRAFT for Editing)
//    POST /form-approval/reopen
//    Body: { form_slug, record_id, remarks }
// ============================================================
const reopenWorkflow = async (req, res, next) => {
  try {
    const { form_slug, record_id, remarks = "" } = req.body;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }

    const { tableName, pkCol, statusCol, updatedByCol, updatedAtCol } = await getTableInfo(form_slug);
    const userId = req.user?.user_id || req.user?.id || null;
    const actorUser = await getUserById(userId);

    const instanceRes = await db.query(
      `SELECT * FROM t_workflow_instances
        WHERE record_table = $1 AND record_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [tableName, Number(record_id)]
    );

    if (instanceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow instance not found" });
    }

    const instance = instanceRes.rows[0];
    const history = safeJson(instance.history, []);
    history.push({
      step: 0,
      action: "REOPENED",
      by_user_id: userId,
      actor_name: actorUser?.name || `User #${userId}`,
      at: new Date().toISOString(),
      remarks: remarks || "Re-opened for editing by initiator",
    });

    // Reset workflow instance to DRAFT
    const updateRes = await db.query(
      `UPDATE t_workflow_instances
         SET current_step = 0, status = 'DRAFT', remarks = $1,
             history = $2, updated_by = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [remarks || "Re-opened for editing", JSON.stringify(history), userId, instance.id]
    );

    // Reset form record to Draft
    try {
      await db.query(
        `UPDATE ${tableName}
           SET ${statusCol} = 'Draft', ${updatedByCol} = $1, ${updatedAtCol} = NOW()
         WHERE ${pkCol} = $2`,
        [userId, Number(record_id)]
      );
    } catch (e) {
      console.warn("[FormApproval] Could not reset record status:", e.message);
    }

    // Explicit sync to t_ngo_due_diligence_versions if due_diligence
    if (form_slug === "due_diligence" || form_slug === "due-diligence" || tableName === "t_frm_due_diligence") {
      try {
        const frmUserRes = await db.query(
          `SELECT created_by, user_id FROM "${tableName}" WHERE "${pkCol}" = $1 LIMIT 1`,
          [Number(record_id)]
        ).catch(() => ({ rows: [] }));
        const ngoUserId = frmUserRes.rows[0]?.created_by || frmUserRes.rows[0]?.user_id || instance.created_by;
        if (ngoUserId) {
          await db.query(
            `UPDATE t_ngo_due_diligence_versions
                SET status = 'DRAFT', updated_at = NOW()
              WHERE user_id = $1 AND form_slug = 'due_diligence'
                AND version_number = (
                  SELECT MAX(version_number) FROM t_ngo_due_diligence_versions WHERE user_id = $1 AND form_slug = 'due_diligence'
                )`,
            [ngoUserId]
          );
        }
      } catch (ddSyncErr) {
        console.warn("[FormApproval] DD reopen version status sync notice:", ddSyncErr.message);
      }
    }

    // ── Audit: Insert into t_approval_process_track ───────────
    await recordApprovalTrack({
      apt_type:           form_slug,
      apt_item_id:        Number(record_id),
      apt_user_id:        userId,
      apt_user_role:      actorUser?.role_name || actorUser?.role_slug || "Initiator",
      apt_accept_step:    "Re-opened for Editing",
      apt_remarks:        remarks || "Re-opened for editing",
      apt_recipient_role: null,
      apt_recipient_id:   null,
      apt_accept_status:  "Draft / Re-opened",
      apt_status_flag:    "REOPENED",
    });

    // Mark user's notifications for this record as read
    await markPendingNotificationsRead(userId, tableName, Number(record_id));

    return res.json({
      success: true,
      message: "Workflow re-opened for editing successfully",
      data: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 6. GET APPROVAL HISTORY & TRACK
//    GET /form-approval/history?form_slug=project&record_id=5
// ============================================================
const getApprovalHistory = async (req, res, next) => {
  try {
    const { form_slug, record_id } = req.query;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }
    const { tableName } = await getTableInfo(form_slug);
    const instanceRes = await db.query(
      `SELECT history, wfi_step_assignments, status, current_step, created_at
         FROM t_workflow_instances
        WHERE record_table = $1 AND record_id = $2 AND deleted_at IS NULL
        ORDER BY id DESC LIMIT 1`,
      [tableName, Number(record_id)]
    ).catch(() => ({ rows: [] }));

    // Also get track records
    const trackRes = await db.query(
      `SELECT apt.*,
              u.name AS user_name, u.email AS user_email,
              rec.name AS recipient_name, rec.email AS recipient_email
         FROM t_approval_process_track apt
         LEFT JOIN t_users u ON u.id = apt.apt_user_id
         LEFT JOIN t_users rec ON rec.id = apt.apt_recipient_id
        WHERE apt.apt_type = $1 AND apt.apt_item_id = $2 AND apt.apt_deleted_at IS NULL
        ORDER BY apt.apt_created_at ASC, apt.apt_id ASC`,
      [form_slug, Number(record_id)]
    ).catch(() => ({ rows: [] }));

    if (instanceRes.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          history: [],
          status: null,
          approvalTrack: trackRes.rows || []
        }
      });
    }
    const instance = instanceRes.rows[0];
    const history = await enrichHistory(safeJson(instance.history, []));

    return res.json({
      success: true,
      data: {
        history,
        status: instance.status,
        current_step: instance.current_step,
        initiated_at: instance.created_at,
        approvalTrack: trackRes.rows || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 7. PULL BACK WORKFLOW (Recall action before next user acts)
//    POST /form-approval/pull-back
//    Body: { form_slug, record_id, remarks }
// ============================================================
const pullBackWorkflow = async (req, res, next) => {
  try {
    const { form_slug, record_id, remarks = "" } = req.body;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }

    const { tableName, pkCol, statusCol, updatedByCol, updatedAtCol } = await getTableInfo(form_slug);
    const userId = req.user?.user_id || req.user?.id || null;
    const actorUser = await getUserById(userId);

    const instanceRes = await db.query(
      `SELECT * FROM t_workflow_instances
        WHERE record_table = $1 AND record_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [tableName, Number(record_id)]
    );

    if (instanceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow instance not found" });
    }

    const instance = instanceRes.rows[0];

    if (instance.status === "APPROVED" || instance.status === "REJECTED" || instance.status === "DRAFT") {
      return res.status(400).json({ success: false, message: `Cannot pull back workflow in status "${instance.status}"` });
    }

    const currentStep = instance.current_step || 1;
    const stepAssignments = safeJson(instance.wfi_step_assignments, []);
    const history = safeJson(instance.history, []);
    const resolved = await resolveWorkflowForForm(form_slug, Number(record_id));
    const steps = resolved?.steps || [];

    let targetStep = 0;
    let nextStatus = "DRAFT";
    let targetRoleName = "Initiator";

    if (currentStep <= 1) {
      targetStep = 0;
      nextStatus = "DRAFT";
      targetRoleName = "Initiator";
    } else {
      targetStep = currentStep - 1;
      const targetStepDef = steps.find(s => Number(s.step || s.level) === targetStep) || steps[targetStep - 1] || {};
      const targetRoleSlug = targetStepDef.role || `ROLE_${targetStepDef.role_id || targetStep}`;
      nextStatus = `PENDING_${String(targetRoleSlug).toUpperCase()}`;
      targetRoleName = targetStepDef.role_name || targetStepDef.role || `Step ${targetStep}`;
    }

    history.push({
      step: targetStep,
      action: "PULL_BACK",
      by_user_id: userId,
      actor_name: actorUser?.name || `User #${userId}`,
      at: new Date().toISOString(),
      remarks: remarks || `Pulled back from Step ${currentStep} to ${targetRoleName}`,
    });

    await db.query(
      `UPDATE t_workflow_instances
         SET current_step = $1, status = $2, remarks = $3,
             history = $4, updated_by = $5, updated_at = NOW()
       WHERE id = $6`,
      [targetStep, nextStatus, remarks || `Pulled back to ${targetRoleName}`, JSON.stringify(history), userId, instance.id]
    );

    try {
      const recordStatusText = targetStep === 0 ? "Draft" : nextStatus;
      await db.query(
        `UPDATE ${tableName}
           SET ${statusCol} = $1, ${updatedByCol} = $2, ${updatedAtCol} = NOW()
         WHERE ${pkCol} = $3`,
        [recordStatusText, userId, Number(record_id)]
      );
    } catch (e) {
      console.warn("[FormApproval] Could not update record status on pull back:", e.message);
    }

    // Explicit sync to t_ngo_due_diligence_versions if due_diligence
    if (form_slug === "due_diligence" || form_slug === "due-diligence" || tableName === "t_frm_due_diligence") {
      try {
        const frmUserRes = await db.query(
          `SELECT created_by, user_id FROM "${tableName}" WHERE "${pkCol}" = $1 LIMIT 1`,
          [Number(record_id)]
        ).catch(() => ({ rows: [] }));
        const ngoUserId = frmUserRes.rows[0]?.created_by || frmUserRes.rows[0]?.user_id || instance.created_by;
        if (ngoUserId) {
          const targetVerStatus = targetStep === 0 ? "DRAFT" : "UNDER_REVIEW";
          await db.query(
            `UPDATE t_ngo_due_diligence_versions
                SET status = $1, updated_at = NOW()
              WHERE user_id = $2 AND form_slug = 'due_diligence'
                AND version_number = (
                  SELECT MAX(version_number) FROM t_ngo_due_diligence_versions WHERE user_id = $2 AND form_slug = 'due_diligence'
                )`,
            [targetVerStatus, ngoUserId]
          );
        }
      } catch (ddSyncErr) {
        console.warn("[FormApproval] DD pull back version status sync notice:", ddSyncErr.message);
      }
    }

    await recordApprovalTrack({
      apt_type:           form_slug,
      apt_item_id:        Number(record_id),
      apt_user_id:        userId,
      apt_user_role:      actorUser?.role_name || actorUser?.role_slug || "Approver",
      apt_accept_step:    `Pulled Back from Step ${currentStep} to ${targetRoleName}`,
      apt_remarks:        remarks || "Pulled back for re-evaluation",
      apt_recipient_role: targetRoleName,
      apt_recipient_id:   targetStep === 0 ? instance.created_by : (stepAssignments.find(a => Number(a.step) === targetStep)?.user_id || null),
      apt_accept_status:  "Pulled Back",
      apt_status_flag:    "PULL_BACK",
    });

    await markPendingNotificationsRead(userId, tableName, Number(record_id));

    return res.json({
      success: true,
      message: `Workflow successfully pulled back to ${targetRoleName}`,
      data: {
        instance_id: instance.id,
        current_step: targetStep,
        status: nextStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWorkflowState,
  getUsersByRole,
  saveAssignments,
  sendForApproval,
  performAction,
  reopenWorkflow,
  pullBackWorkflow,
  getApprovalHistory,
};
