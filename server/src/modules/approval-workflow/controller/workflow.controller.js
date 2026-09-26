// server/src/modules/approval-workflow/controller/workflow.controller.js
// ============================================================
// Controller for Workflow Definitions and Child Workflow Rules Matrix
// Parent Table: t_workflow_defs (id, name, slug, trigger_form, flow_type, has_conditions, is_active, is_draft, created_by, updated_by, created_at, updated_at, deleted_at)
// Child Table:  t_workflow_rules (id, workflow_id, rule_name, conditions, initiator_roles, steps, order_index, is_active, created_by, updated_by, created_at, updated_at, deleted_at)
// ============================================================

const db = require("../../../config/db");

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "_");

const ensureWorkflowColumns = async () => {
  try {
    // 1. Ensure columns on parent table t_workflow_defs
    await db.query(`ALTER TABLE t_workflow_defs ADD COLUMN IF NOT EXISTS flow_type VARCHAR(50) DEFAULT 'normal';`);
    await db.query(`ALTER TABLE t_workflow_defs ADD COLUMN IF NOT EXISTS has_conditions BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE t_workflow_defs ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE t_workflow_defs ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;`);
    await db.query(`ALTER TABLE t_workflow_defs ADD COLUMN IF NOT EXISTS initiator_roles JSONB DEFAULT '[]'::jsonb;`);
    await db.query(`ALTER TABLE t_workflow_defs ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;`);

    // 2. Ensure child table t_workflow_rules exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS t_workflow_rules (
        id               SERIAL PRIMARY KEY,
        workflow_id      INTEGER NOT NULL REFERENCES t_workflow_defs(id) ON DELETE CASCADE,
        rule_name        VARCHAR(255) DEFAULT 'Default Path',
        conditions       JSONB DEFAULT '[]'::jsonb,
        initiator_roles  JSONB DEFAULT '[]'::jsonb,
        steps            JSONB DEFAULT '[]'::jsonb,
        order_index      INTEGER DEFAULT 0,
        is_active        BOOLEAN DEFAULT TRUE,
        created_by       INTEGER DEFAULT NULL,
        updated_by       INTEGER DEFAULT NULL,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW(),
        deleted_at       TIMESTAMPTZ DEFAULT NULL
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_wfr_workflow ON t_workflow_rules(workflow_id);`);

    // 3. Ensure rule_id on t_workflow_instances
    await db.query(`ALTER TABLE t_workflow_instances ADD COLUMN IF NOT EXISTS rule_id INTEGER REFERENCES t_workflow_rules(id) ON DELETE SET NULL;`);

    // 4. Auto-migration: if any t_workflow_defs has no entries in t_workflow_rules, populate a default rule from parent steps/initiators
    const orphanDefs = await db.query(`
      SELECT wd.id, wd.name, wd.steps, wd.conditions, wd.initiator_roles, wd.created_by
      FROM t_workflow_defs wd
      LEFT JOIN t_workflow_rules wr ON wr.workflow_id = wd.id AND wr.deleted_at IS NULL
      WHERE wr.id IS NULL AND wd.deleted_at IS NULL
    `);

    for (const def of orphanDefs.rows) {
      const stepsArr = Array.isArray(def.steps) ? def.steps : (typeof def.steps === "string" ? JSON.parse(def.steps || "[]") : []);
      const condsArr = Array.isArray(def.conditions) ? def.conditions : (typeof def.conditions === "string" ? JSON.parse(def.conditions || "[]") : []);
      const initsArr = Array.isArray(def.initiator_roles) ? def.initiator_roles : (typeof def.initiator_roles === "string" ? JSON.parse(def.initiator_roles || "[]") : []);

      if (stepsArr.length > 0 || initsArr.length > 0 || condsArr.length > 0) {
        await db.query(`
          INSERT INTO t_workflow_rules (workflow_id, rule_name, conditions, initiator_roles, steps, order_index, is_active, created_by, updated_by)
          VALUES ($1, $2, $3, $4, $5, 0, TRUE, $6, $6)
        `, [
          def.id,
          "Default Path",
          JSON.stringify(condsArr),
          JSON.stringify(initsArr),
          JSON.stringify(stepsArr),
          def.created_by || null
        ]);
      }
    }
  } catch (err) {
    console.warn("Could not ensure t_workflow_rules & t_workflow_defs columns:", err.message);
  }
};
ensureWorkflowColumns();

const sanitizeSteps = (steps = []) => {
  if (!Array.isArray(steps)) return [];
  return steps.map((step, idx) => {
    const acts = step.actions || (step.action ? (Array.isArray(step.action) ? step.action : [step.action]) : ["approve"]);
    return {
      step: step.step || idx + 1,
      level: step.level || step.step || idx + 1,
      role_id: step.role_id !== undefined ? Number(step.role_id) : null,
      role: step.role || "",
      role_name: step.role_name || "",
      label: step.label || `Stage Level ${step.step || idx + 1}`,
      action: acts[0] || "approve",
      actions: acts.length > 0 ? acts : ["approve"],
      reject_to_step: step.reject_to_step !== undefined ? String(step.reject_to_step) : "0"
    };
  });
};

const sanitizeInitiators = (initiators = []) => {
  if (!Array.isArray(initiators)) return [];
  return initiators.map(r => (typeof r === "object" && r !== null ? (r.id || r.value || r) : r));
};

// ============================================================
// 1. CREATE WORKFLOW DEFINITION + CHILD RULES
// ============================================================
const createWorkflow = async (req, res, next) => {
  try {
    await ensureWorkflowColumns();
    const {
      name,
      trigger_form,
      flow_type = "normal", // 'normal' or 'multi_level'
      has_conditions,
      rules = [],
      // Fallback fields for legacy/simple submissions
      steps = [],
      conditions = [],
      initiator_roles = [],
      is_draft = false,
      is_active = true
    } = req.body;

    if (!name || !trigger_form) {
      return res.status(400).json({
        success: false,
        message: "name and trigger_form are required",
      });
    }

    const slug = slugify(name);
    const finalHasConditions = has_conditions !== undefined ? Boolean(has_conditions) : (flow_type === "multi_level");
    const finalFlowType = flow_type || (finalHasConditions ? "multi_level" : "normal");

    // Check duplicate slug
    const existing = await db.query(
      `SELECT id FROM t_workflow_defs WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
      [slug]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: `Workflow "${name}" already exists` });
    }

    const finalActive = is_draft ? false : (is_active !== undefined ? is_active : true);

    // If new workflow is active and linked to a trigger_form, deactivate older workflows for the same form
    if (finalActive && trigger_form) {
      await db.query(
        `UPDATE t_workflow_defs SET is_active = FALSE WHERE trigger_form = $1 AND deleted_at IS NULL`,
        [trigger_form]
      );
    }

    // 1. Insert parent record
    const result = await db.query(
      `INSERT INTO t_workflow_defs (name, slug, trigger_form, flow_type, has_conditions, is_draft, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [
        name.trim(),
        slug,
        trigger_form || null,
        finalFlowType,
        finalHasConditions,
        is_draft,
        finalActive,
        req.user?.user_id || null
      ]
    );

    const workflow = result.rows[0];
    const workflowId = workflow.id;

    // 2. Insert child rule records into t_workflow_rules
    const insertedRules = [];
    if (Array.isArray(rules) && rules.length > 0) {
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        const rSteps = sanitizeSteps(r.steps || []);
        const rInits = sanitizeInitiators(r.initiator_roles || []);
        const rConds = Array.isArray(r.conditions) ? r.conditions : [];
        const rName = r.rule_name || (finalFlowType === "multi_level" ? `Matrix Rule ${i + 1}` : "Default Path");

        const ruleRes = await db.query(
          `INSERT INTO t_workflow_rules (workflow_id, rule_name, conditions, initiator_roles, steps, order_index, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
           RETURNING *`,
          [
            workflowId,
            rName,
            JSON.stringify(rConds),
            JSON.stringify(rInits),
            JSON.stringify(rSteps),
            r.order_index !== undefined ? r.order_index : i,
            r.is_active !== undefined ? r.is_active : true,
            req.user?.user_id || null
          ]
        );
        insertedRules.push(ruleRes.rows[0]);
      }
    } else {
      // Normal flow fallback: single rule from root payload
      const sanitizedRootSteps = sanitizeSteps(steps);
      const sanitizedRootInits = sanitizeInitiators(initiator_roles);
      const sanitizedRootConds = Array.isArray(conditions) ? conditions : [];

      const ruleRes = await db.query(
        `INSERT INTO t_workflow_rules (workflow_id, rule_name, conditions, initiator_roles, steps, order_index, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING *`,
        [
          workflowId,
          "Default Path",
          JSON.stringify(sanitizedRootConds),
          JSON.stringify(sanitizedRootInits),
          JSON.stringify(sanitizedRootSteps),
          0,
          true,
          req.user?.user_id || null
        ]
      );
      insertedRules.push(ruleRes.rows[0]);
    }

    workflow.rules = insertedRules;

    return res.status(201).json({
      success: true,
      message: is_draft ? "Draft saved successfully" : "Workflow definition created successfully",
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 2. LIST WORKFLOWS (with child rules summary)
// ============================================================
const listWorkflows = async (req, res, next) => {
  try {
    await ensureWorkflowColumns();
    const wfResult = await db.query(
      `SELECT wd.*, 
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', wr.id,
                    'rule_name', wr.rule_name,
                    'conditions', wr.conditions,
                    'initiator_roles', wr.initiator_roles,
                    'steps', wr.steps,
                    'order_index', wr.order_index,
                    'is_active', wr.is_active
                  ) ORDER BY wr.order_index ASC, wr.id ASC
                ) FILTER (WHERE wr.id IS NOT NULL AND wr.deleted_at IS NULL),
                '[]'::json
              ) AS rules,
              COUNT(wr.id) FILTER (WHERE wr.deleted_at IS NULL) AS rule_count
       FROM t_workflow_defs wd
       LEFT JOIN t_workflow_rules wr ON wr.workflow_id = wd.id AND wr.deleted_at IS NULL
       WHERE wd.deleted_at IS NULL
       GROUP BY wd.id
       ORDER BY wd.created_at DESC`
    );

    return res.status(200).json({ success: true, data: wfResult.rows });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 3. GET WORKFLOW BY ID (joined with child rules)
// ============================================================
const getWorkflowById = async (req, res, next) => {
  try {
    await ensureWorkflowColumns();
    const { id } = req.params;
    const wfResult = await db.query(
      `SELECT * FROM t_workflow_defs WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (wfResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow definition not found" });
    }

    const workflow = wfResult.rows[0];

    const rulesResult = await db.query(
      `SELECT * FROM t_workflow_rules 
       WHERE workflow_id = $1 AND deleted_at IS NULL 
       ORDER BY order_index ASC, id ASC`,
      [id]
    );

    workflow.rules = rulesResult.rows;

    return res.status(200).json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 4. UPDATE WORKFLOW DEFINITION + SYNC CHILD RULES
// ============================================================
const updateWorkflow = async (req, res, next) => {
  try {
    await ensureWorkflowColumns();
    const { id } = req.params;
    const {
      name,
      trigger_form,
      flow_type,
      has_conditions,
      rules,
      // Fallback fields
      steps,
      conditions,
      initiator_roles,
      is_draft,
      is_active
    } = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (name?.trim()) {
      setClauses.push(`name = $${idx++}`);
      values.push(name.trim());
      setClauses.push(`slug = $${idx++}`);
      values.push(slugify(name));
    }
    if (trigger_form !== undefined) {
      setClauses.push(`trigger_form = $${idx++}`);
      values.push(trigger_form);
    }
    if (flow_type !== undefined) {
      setClauses.push(`flow_type = $${idx++}`);
      values.push(flow_type);
    }
    if (has_conditions !== undefined) {
      setClauses.push(`has_conditions = $${idx++}`);
      values.push(Boolean(has_conditions));
    }
    if (is_draft !== undefined) {
      setClauses.push(`is_draft = $${idx++}`);
      values.push(is_draft);
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
      values.push(req.user?.user_id || null);
      values.push(id);

      await db.query(
        `UPDATE t_workflow_defs SET ${setClauses.join(", ")}
         WHERE id = $${idx} AND deleted_at IS NULL`,
        values
      );
    }

    // Check if workflow exists
    const wfCheck = await db.query(
      `SELECT * FROM t_workflow_defs WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (wfCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow definition not found" });
    }
    const updatedWorkflow = wfCheck.rows[0];

    // If active and linked to form, deactivate older workflows for same form
    if (updatedWorkflow.is_active === true && updatedWorkflow.trigger_form) {
      await db.query(
        `UPDATE t_workflow_defs SET is_active = FALSE
         WHERE trigger_form = $1 AND id != $2 AND deleted_at IS NULL`,
        [updatedWorkflow.trigger_form, id]
      );
    }

    // Sync child rules if rules array provided
    if (Array.isArray(rules)) {
      // Soft-delete existing rules not in payload or replace
      await db.query(
        `UPDATE t_workflow_rules SET deleted_at = NOW(), updated_at = NOW() WHERE workflow_id = $1 AND deleted_at IS NULL`,
        [id]
      );

      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        const rSteps = sanitizeSteps(r.steps || []);
        const rInits = sanitizeInitiators(r.initiator_roles || []);
        const rConds = Array.isArray(r.conditions) ? r.conditions : [];
        const rName = r.rule_name || `Rule ${i + 1}`;

        await db.query(
          `INSERT INTO t_workflow_rules (workflow_id, rule_name, conditions, initiator_roles, steps, order_index, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
          [
            id,
            rName,
            JSON.stringify(rConds),
            JSON.stringify(rInits),
            JSON.stringify(rSteps),
            r.order_index !== undefined ? r.order_index : i,
            r.is_active !== undefined ? r.is_active : true,
            req.user?.user_id || null
          ]
        );
      }
    } else if (steps || initiator_roles || conditions) {
      // Fallback single rule sync
      await db.query(
        `UPDATE t_workflow_rules SET deleted_at = NOW(), updated_at = NOW() WHERE workflow_id = $1 AND deleted_at IS NULL`,
        [id]
      );
      const rSteps = sanitizeSteps(steps || []);
      const rInits = sanitizeInitiators(initiator_roles || []);
      const rConds = Array.isArray(conditions) ? conditions : [];

      await db.query(
        `INSERT INTO t_workflow_rules (workflow_id, rule_name, conditions, initiator_roles, steps, order_index, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
        [
          id,
          "Default Path",
          JSON.stringify(rConds),
          JSON.stringify(rInits),
          JSON.stringify(rSteps),
          0,
          true,
          req.user?.user_id || null
        ]
      );
    }

    // Fetch updated rules
    const rulesResult = await db.query(
      `SELECT * FROM t_workflow_rules 
       WHERE workflow_id = $1 AND deleted_at IS NULL 
       ORDER BY order_index ASC, id ASC`,
      [id]
    );
    updatedWorkflow.rules = rulesResult.rows;

    return res.status(200).json({ success: true, data: updatedWorkflow });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 5. DELETE WORKFLOW (Cascades to child rules)
// ============================================================
const deleteWorkflow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE t_workflow_defs
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING name`,
      [req.user?.user_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow definition not found" });
    }

    // Soft delete child rules as well
    await db.query(
      `UPDATE t_workflow_rules SET deleted_at = NOW(), updated_by = $1, updated_at = NOW() WHERE workflow_id = $2 AND deleted_at IS NULL`,
      [req.user?.user_id || null, id]
    );

    return res.status(200).json({ success: true, message: `Workflow deleted successfully` });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 6. DEDICATED CHILD RULE CRUD HANDLERS
// ============================================================
const addWorkflowRule = async (req, res, next) => {
  try {
    await ensureWorkflowColumns();
    const { id } = req.params; // workflow_id
    const { rule_name, conditions = [], initiator_roles = [], steps = [], order_index = 0, is_active = true } = req.body;

    const wfCheck = await db.query(`SELECT id FROM t_workflow_defs WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, [id]);
    if (wfCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Parent workflow not found" });
    }

    const rSteps = sanitizeSteps(steps);
    const rInits = sanitizeInitiators(initiator_roles);

    const result = await db.query(
      `INSERT INTO t_workflow_rules (workflow_id, rule_name, conditions, initiator_roles, steps, order_index, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [
        id,
        rule_name || "New Matrix Rule",
        JSON.stringify(conditions),
        JSON.stringify(rInits),
        JSON.stringify(rSteps),
        order_index,
        is_active,
        req.user?.user_id || null
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateWorkflowRule = async (req, res, next) => {
  try {
    const { id, ruleId } = req.params;
    const { rule_name, conditions, initiator_roles, steps, order_index, is_active } = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (rule_name !== undefined) {
      setClauses.push(`rule_name = $${idx++}`);
      values.push(rule_name);
    }
    if (conditions !== undefined) {
      setClauses.push(`conditions = $${idx++}`);
      values.push(JSON.stringify(conditions || []));
    }
    if (initiator_roles !== undefined) {
      setClauses.push(`initiator_roles = $${idx++}`);
      values.push(JSON.stringify(sanitizeInitiators(initiator_roles || [])));
    }
    if (steps !== undefined) {
      setClauses.push(`steps = $${idx++}`);
      values.push(JSON.stringify(sanitizeSteps(steps || [])));
    }
    if (order_index !== undefined) {
      setClauses.push(`order_index = $${idx++}`);
      values.push(Number(order_index));
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(req.user?.user_id || null);
    values.push(ruleId);
    values.push(id);

    const result = await db.query(
      `UPDATE t_workflow_rules SET ${setClauses.join(", ")}
       WHERE id = $${idx++} AND workflow_id = $${idx} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow rule not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteWorkflowRule = async (req, res, next) => {
  try {
    const { id, ruleId } = req.params;
    const result = await db.query(
      `UPDATE t_workflow_rules
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND workflow_id = $3 AND deleted_at IS NULL
       RETURNING id`,
      [req.user?.user_id || null, ruleId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Workflow rule not found" });
    }

    return res.status(200).json({ success: true, message: "Workflow rule deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 7. RUNTIME WORKFLOW OPERATIONS
// ============================================================
const workflowEngine = require("../../../services/workflowEngine");

const initiateRecordWorkflow = async (req, res, next) => {
  try {
    const { form_slug, record_id } = req.body;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }
    const instance = await workflowEngine.initiateWorkflow(form_slug, record_id, req.user?.user_id);
    return res.status(200).json({ success: true, data: instance });
  } catch (err) {
    next(err);
  }
};

const viewWorkflowState = async (req, res, next) => {
  try {
    const { form_slug, record_id } = req.body;
    if (!form_slug || !record_id) {
      return res.status(400).json({ success: false, message: "form_slug and record_id are required" });
    }
    const state = await workflowEngine.getWorkflowState(form_slug, record_id);
    return res.status(200).json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
};

const performWorkflowAction = async (req, res, next) => {
  try {
    const { instance_id, action, remarks } = req.body;
    if (!instance_id || !action) {
      return res.status(400).json({ success: false, message: "instance_id and action are required" });
    }
    const result = await workflowEngine.performWorkflowAction(instance_id, req.user?.role_slug, action, remarks, req.user?.user_id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createWorkflow,
  listWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  addWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
  initiateRecordWorkflow,
  viewWorkflowState,
  performWorkflowAction,
};
