// server/src/services/workflowEngine.js
// ============================================================
// Workflow Engine — Execution & State Machine Service
// Evaluates Parent Workflow Defs and Child Rules Matrix for Form Submissions
// ============================================================

const db = require("../config/db");

function validateIdentifier(name, type = "identifier") {
  if (!name || typeof name !== "string") {
    throw new Error(`Invalid ${type}: must be a non-empty string`);
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid ${type} format: "${name}". Only alphanumeric and underscore allowed.`);
  }
}

/**
 * Evaluates conditions array against a submitted business record.
 */
function evaluateConditions(record, conditions = []) {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return true; // No conditions = unconditional pass
  }

  let overallResult = true;

  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    const { field, operator, value, logic = "AND" } = cond;
    if (!field) continue;

    const recordValue = record[field] !== undefined ? record[field] : record[field.toLowerCase()];
    let match = false;

    const recValStr = String(recordValue !== null && recordValue !== undefined ? recordValue : "").trim().toLowerCase();
    const condValStr = String(value !== null && value !== undefined ? value : "").trim().toLowerCase();
    const recValNum = Number(recordValue);
    const condValNum = Number(value);

    switch (operator) {
      case "=":
      case "==":
      case "EQUALS":
        match = recValStr === condValStr;
        break;
      case "!=":
      case "<>":
      case "NOT_EQUALS":
        match = recValStr !== condValStr;
        break;
      case ">":
        match = !isNaN(recValNum) && !isNaN(condValNum) && recValNum > condValNum;
        break;
      case "<":
        match = !isNaN(recValNum) && !isNaN(condValNum) && recValNum < condValNum;
        break;
      case ">=":
        match = !isNaN(recValNum) && !isNaN(condValNum) && recValNum >= condValNum;
        break;
      case "<=":
        match = !isNaN(recValNum) && !isNaN(condValNum) && recValNum <= condValNum;
        break;
      case "IN":
      case "in":
        if (Array.isArray(value)) {
          match = value.map(v => String(v).trim().toLowerCase()).includes(recValStr);
        } else if (typeof value === "string") {
          const parts = value.split(",").map(v => v.trim().toLowerCase());
          match = parts.includes(recValStr);
        }
        break;
      case "CONTAINS":
      case "contains":
        match = recValStr.includes(condValStr);
        break;
      case "is_empty":
      case "IS_EMPTY":
        match = !recordValue || recValStr === "";
        break;
      case "is_not_empty":
      case "IS_NOT_EMPTY":
        match = Boolean(recordValue) && recValStr !== "";
        break;
      case "BETWEEN":
      case "between":
        if (Array.isArray(value) && value.length >= 2) {
          const min = Number(value[0]);
          const max = Number(value[1]);
          match = !isNaN(recValNum) && recValNum >= min && recValNum <= max;
        }
        break;
      default:
        match = recValStr === condValStr;
    }

    if (i === 0) {
      overallResult = match;
    } else if (logic === "OR") {
      overallResult = overallResult || match;
    } else {
      overallResult = overallResult && match;
    }
  }

  return overallResult;
}

/**
 * Initiates a workflow instance for a newly submitted form record.
 */
async function initiateWorkflow(formSlug, recordId, userId) {
  const tableName = formSlug.startsWith("t_") ? formSlug : `t_frm_${formSlug}`;
  validateIdentifier(tableName, "table name");

  // Fetch initiator role
  let userRoleSlug = "";
  let userRoleId = null;
  if (userId) {
    const userRoleRes = await db.query(
      `SELECT u.role_id, r.slug FROM t_users u LEFT JOIN t_roles r ON r.id = u.role_id WHERE u.id = $1 LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] }));
    userRoleSlug = userRoleRes.rows[0]?.slug || "";
    userRoleId = userRoleRes.rows[0]?.role_id || null;
  }

  // Fetch the business record for evaluating conditions
  const prefix = formSlug.startsWith("t_") ? formSlug.substring(2, 5) : "frm";
  const pkCol = `${prefix}_id`;
  let recordObj = {};
  try {
    const recRes = await db.query(`SELECT * FROM ${tableName} WHERE ${pkCol} = $1 OR id = $1 LIMIT 1`, [recordId]);
    if (recRes.rows.length > 0) recordObj = recRes.rows[0];
  } catch (e) {
    const recRes = await db.query(`SELECT * FROM ${tableName} LIMIT 1`).catch(() => ({ rows: [] }));
    if (recRes.rows.length > 0) recordObj = recRes.rows[0];
  }

  // 1. Find active workflow definitions linked to this form
  const wdfResult = await db.query(
    `SELECT id, name, flow_type, has_conditions, steps, conditions, initiator_roles 
     FROM t_workflow_defs
     WHERE trigger_form = $1 AND is_active = TRUE AND deleted_at IS NULL
     ORDER BY id ASC`,
    [formSlug]
  );

  if (wdfResult.rows.length === 0) {
    return null;
  }

  let matchedWdf = null;
  let matchedRule = null;

  for (const wdf of wdfResult.rows) {
    // Fetch active child rules for this workflow definition
    const rulesRes = await db.query(
      `SELECT id, rule_name, conditions, initiator_roles, steps, order_index 
       FROM t_workflow_rules 
       WHERE workflow_id = $1 AND is_active = TRUE AND deleted_at IS NULL
       ORDER BY order_index ASC, id ASC`,
      [wdf.id]
    );

    const rules = rulesRes.rows;

    if (rules.length > 0) {
      for (const rule of rules) {
        const inits = Array.isArray(rule.initiator_roles)
          ? rule.initiator_roles
          : (typeof rule.initiator_roles === "string" ? JSON.parse(rule.initiator_roles || "[]") : []);

        if (inits.length > 0) {
          const isAllowed = inits.some((r) =>
            (userRoleId !== null && (r === userRoleId || String(r) === String(userRoleId))) ||
            (userRoleSlug && String(r).toLowerCase() === userRoleSlug.toLowerCase())
          );
          if (!isAllowed) continue;
        }

        const conds = Array.isArray(rule.conditions)
          ? rule.conditions
          : (typeof rule.conditions === "string" ? JSON.parse(rule.conditions || "[]") : []);

        if (evaluateConditions(recordObj, conds)) {
          matchedWdf = wdf;
          matchedRule = rule;
          break;
        }
      }
    } else {
      // Fallback to parent definition's legacy fields if no child rules yet
      const initiatorRoles = Array.isArray(wdf.initiator_roles)
        ? wdf.initiator_roles
        : (typeof wdf.initiator_roles === "string" ? JSON.parse(wdf.initiator_roles || "[]") : []);

      if (initiatorRoles.length > 0) {
        const isAllowed = initiatorRoles.some((r) =>
          (userRoleId !== null && (r === userRoleId || String(r) === String(userRoleId))) ||
          (userRoleSlug && String(r).toLowerCase() === userRoleSlug.toLowerCase())
        );
        if (!isAllowed) continue;
      }

      const conds = Array.isArray(wdf.conditions)
        ? wdf.conditions
        : (typeof wdf.conditions === "string" ? JSON.parse(wdf.conditions || "[]") : []);

      if (evaluateConditions(recordObj, conds)) {
        matchedWdf = wdf;
        break;
      }
    }

    if (matchedWdf) break;
  }

  if (!matchedWdf) {
    return null;
  }

  const { id: wdf_id } = matchedWdf;
  const rawSteps = matchedRule?.steps || matchedWdf.steps;
  const steps = Array.isArray(rawSteps) ? rawSteps : (typeof rawSteps === "string" ? JSON.parse(rawSteps || "[]") : []);

  if (steps.length === 0) {
    return null;
  }

  const existing = await db.query(
    `SELECT wfi_id FROM t_workflow_instances
     WHERE wfi_record_table = $1 AND wfi_record_id = $2 AND wfi_deleted_at IS NULL
     LIMIT 1`,
    [tableName, recordId]
  );

  if (existing.rows.length > 0) {
    throw new Error(`Workflow already initiated for ${tableName} ID ${recordId}`);
  }

  const firstStep = steps[0];
  const firstRoleSlug = firstStep.role || `ROLE_${firstStep.role_id || 1}`;
  const history = [
    {
      step: 0,
      action: "INITIATE",
      by_user_id: userId,
      at: new Date().toISOString(),
      remarks: matchedRule ? `Initiated under rule: ${matchedRule.rule_name}` : "Workflow initiated upon record submission.",
    },
  ];

  // 3. Insert workflow instance (with rule_id)
  const wfiResult = await db.query(
    `INSERT INTO t_workflow_instances
       (wfi_workflow_id, rule_id, wfi_record_table, wfi_record_id, wfi_current_step,
        wfi_status, wfi_remarks, wfi_history, wfi_created_by, wfi_updated_by)
     VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $8)
     RETURNING wfi_id, wfi_status`,
    [
      wdf_id,
      matchedRule ? matchedRule.id : null,
      tableName,
      recordId,
      `PENDING_${firstRoleSlug.toUpperCase()}`,
      `Awaiting Step 1 (${firstStep.role_name || firstRoleSlug}) review.`,
      JSON.stringify(history),
      userId,
    ]
  );

  // 4. Update the business record's status column
  const statusCol = `${pkCol.replace(/_id$/, '')}_status`;
  validateIdentifier(pkCol, "primary key column");
  validateIdentifier(statusCol, "status column");

  await db.query(
    `UPDATE ${tableName}
     SET ${statusCol} = $1, ${prefix}_updated_by = $2, ${prefix}_updated_at = NOW()
     WHERE ${pkCol} = $3`,
    [`PENDING_${firstRoleSlug.toUpperCase()}`, userId, recordId]
  );

  return wfiResult.rows[0];
}

/**
 * Submits an action in a workflow (Approve / Reject / Forward / Resend).
 */
async function submitAction(formSlug, recordId, action, remarks, userId, roleId) {
  const tableName = formSlug.startsWith("t_") ? formSlug : `t_frm_${formSlug}`;
  validateIdentifier(tableName, "table name");

  // 1. Fetch current running instance joined with rule or workflow definition
  const wfiResult = await db.query(
    `SELECT wi.*, wd.name AS wdf_name, wd.steps AS wdf_steps, wr.steps AS rule_steps, wr.rule_name, r.slug AS rol_slug
     FROM t_workflow_instances wi
     JOIN t_workflow_defs wd ON (wd.id = wi.wfi_workflow_id OR wd.id = wi.workflow_id)
     LEFT JOIN t_workflow_rules wr ON wr.id = wi.rule_id
     JOIN t_roles r ON r.id = $3 AND r.deleted_at IS NULL
     WHERE (wi.wfi_record_table = $1 OR wi.record_table = $1)
       AND (wi.wfi_record_id = $2 OR wi.record_id = $2)
       AND (wi.wfi_deleted_at IS NULL AND wi.deleted_at IS NULL)
     LIMIT 1`,
    [tableName, recordId, roleId]
  );

  if (wfiResult.rows.length === 0) {
    throw new Error("No active workflow instance found for this record");
  }

  const wi = wfiResult.rows[0];
  const activeStepsRaw = wi.rule_steps || wi.wdf_steps;
  const steps = Array.isArray(activeStepsRaw) ? activeStepsRaw : (typeof activeStepsRaw === "string" ? JSON.parse(activeStepsRaw || "[]") : []);
  const currentStepNum = wi.wfi_current_step || wi.current_step || 1;
  const currentStepIdx = currentStepNum - 1;

  if (currentStepIdx < 0 || currentStepIdx >= steps.length) {
    throw new Error("Workflow is already completed or in an invalid state");
  }

  const currentStep = steps[currentStepIdx];

  // 2. Validate role matches the current step requirements
  const userRoleCheck = await db.query(
    `SELECT id, slug, is_configurator FROM t_roles WHERE id = $1 AND deleted_at IS NULL`,
    [roleId]
  );
  const userRole = userRoleCheck.rows[0];
  const isConfigurator = userRole && userRole.is_configurator === true;

  const matchesRole =
    (currentStep.role_id !== undefined && currentStep.role_id !== null && Number(currentStep.role_id) === Number(roleId)) ||
    (currentStep.role && userRole && (currentStep.role === userRole.slug || String(currentStep.role) === String(roleId)));

  if (!isConfigurator && !matchesRole) {
    throw new Error(`Unauthorized role. Required: ${currentStep.role_name || currentStep.role || currentStep.role_id}. User has role ID: ${roleId}`);
  }

  // 3. Determine next state
  const normAction = String(action || "").toUpperCase();
  let nextStepNum = currentStepNum;
  let nextStatus = wi.wfi_status || wi.status;
  let finished = false;

  const history = Array.isArray(wi.wfi_history || wi.history) ? (wi.wfi_history || wi.history) : [];
  history.push({
    step: currentStepNum,
    role: currentStep.role_name || currentStep.role,
    role_id: currentStep.role_id,
    action: normAction,
    by_user_id: userId,
    at: new Date().toISOString(),
    remarks,
  });

  if (normAction === "REJECT") {
    nextStatus = "REJECTED";
    finished = true;
  } else if (normAction === "APPROVE") {
    if (currentStepNum === steps.length) {
      nextStatus = "APPROVED";
      finished = true;
    } else {
      nextStepNum = currentStepNum + 1;
      const nextStep = steps[nextStepNum - 1];
      const nextRoleSlug = nextStep.role || `ROLE_${nextStep.role_id || nextStepNum}`;
      nextStatus = `PENDING_${nextRoleSlug.toUpperCase()}`;
    }
  } else if (normAction === "REQUEST_INFO" || normAction === "RESEND") {
    nextStatus = "AWAITING_INFORMATION";
  } else if (normAction === "FORWARD") {
    nextStatus = `FORWARDED_STEP_${currentStepNum}`;
  } else {
    throw new Error(`Unknown action: ${action}`);
  }

  // 4. Update workflow instance in DB
  const instPkCol = wi.wfi_id !== undefined ? "wfi_id" : "id";
  await db.query(
    `UPDATE t_workflow_instances
     SET wfi_current_step = $1,
         wfi_status = $2,
         wfi_remarks = $3,
         wfi_history = $4,
         wfi_updated_by = $5,
         wfi_updated_at = NOW()
     WHERE ${instPkCol} = $6`,
    [
      finished ? 0 : nextStepNum,
      nextStatus,
      remarks,
      JSON.stringify(history),
      userId,
      wi.wfi_id || wi.id,
    ]
  );

  // 5. Update the business record status
  const prefix = formSlug.startsWith("t_") ? formSlug.substring(2, 5) : "frm";
  const pkCol = `${prefix}_id`;
  const statusCol = `${prefix}_status`;
  validateIdentifier(pkCol, "primary key column");
  validateIdentifier(statusCol, "status column");

  await db.query(
    `UPDATE ${tableName}
     SET ${statusCol} = $1, ${prefix}_updated_by = $2, ${prefix}_updated_at = NOW()
     WHERE ${pkCol} = $3`,
    [`${nextStatus}`, userId, recordId]
  );

  return { instance_id: wi.wfi_id || wi.id, status: nextStatus };
}

/**
 * Returns the current workflow state, history, and definitions for a record.
 */
async function getWorkflowState(formSlug, recordId) {
  const tableName = formSlug.startsWith("t_") ? formSlug : `t_frm_${formSlug}`;
  validateIdentifier(tableName, "table name");

  const result = await db.query(
    `SELECT wi.*, wd.name AS wdf_name, wd.steps AS wdf_steps, wr.steps AS rule_steps, wr.rule_name
     FROM t_workflow_instances wi
     JOIN t_workflow_defs wd ON (wd.id = wi.wfi_workflow_id OR wd.id = wi.workflow_id)
     LEFT JOIN t_workflow_rules wr ON wr.id = wi.rule_id
     WHERE (wi.wfi_record_table = $1 OR wi.record_table = $1)
       AND (wi.wfi_record_id = $2 OR wi.record_id = $2)
       AND (wi.wfi_deleted_at IS NULL AND wi.deleted_at IS NULL)
     LIMIT 1`,
    [tableName, recordId]
  );

  if (result.rows.length === 0) return null;
  const wi = result.rows[0];
  const steps = wi.rule_steps || wi.wdf_steps || [];

  return {
    instance_id: wi.wfi_id || wi.id,
    workflow_name: wi.wdf_name,
    rule_name: wi.rule_name,
    current_step: wi.wfi_current_step || wi.current_step,
    status: wi.wfi_status || wi.status,
    remarks: wi.wfi_remarks || wi.remarks,
    steps: Array.isArray(steps) ? steps : (typeof steps === "string" ? JSON.parse(steps || "[]") : []),
    history: wi.wfi_history || wi.history,
  };
}

module.exports = {
  initiateWorkflow,
  submitAction,
  getWorkflowState,
};
