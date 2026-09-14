// server/src/services/formEngine.js
// ============================================================
// Generic Form Engine — handles CRUD for any form table
// created by the Configurator via the Form Builder.
//
// Form tables live at: t_frm_{slug}   (no column prefix)
// Schema stored in:    t_form_schemas  (table: t_form_schemas)
//
// Supports: sections, tabs, multi-step, conditional fields,
//           draft save, file uploads (S3 key stored as text).
// ============================================================

const db = require("../config/db");
const { validateIdentifier } = require("./ddlService");

const FORM_TABLE_PREFIX = "t_frm_";

const { getFormWithSection } = require("../helper/getFormWithSection.helper");

async function getSchema(slug) {
  const schema = await getFormWithSection({ form_slug: slug });
  if (!schema) return null;
  
  const firstSec = schema.sections?.[0] || {};
  const rootEntity = typeof schema.root_entity === "string" ? JSON.parse(schema.root_entity) : (schema.root_entity || {});
  const resolvedTable = rootEntity?.table || firstSec.table || `${FORM_TABLE_PREFIX}${schema.slug}`;
  let triggers = schema.triggers || [];
  if (typeof triggers === "string") {
    try { triggers = JSON.parse(triggers); } catch { triggers = []; }
  }

  return {
    ...schema,
    id: schema.form_id,
    title: schema.title,
    name: schema.title,
    slug: schema.slug,
    fsc_table_name: resolvedTable,
    table_name: resolvedTable,
    fsc_definition: { sections: schema.sections || [], triggers },
    triggers: Array.isArray(triggers) ? triggers : [],
    is_active: schema.is_active,
  };
}

// -------------------------------------------------------
// Extract all field definitions from the schema definition JSONB
// Schema definition structure:
// { sections: [ { fields: [ {column_name, db_field, type, label, ...} ] } ] }
// -------------------------------------------------------
function extractFields(definition) {
  const fields = [];
  const def = typeof definition === "string" ? JSON.parse(definition) : (definition || {});
  const sections = def?.sections || def?.tabs || [];

  for (const section of sections) {
    const secFields = typeof section?.fields === "string" ? JSON.parse(section.fields || "[]") : (section?.fields || []);
    for (const field of secFields) {
      const colName = field.column_name || field.db_field || (field.label ? field.label.toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_") : null) || field.id;
      if (colName) {
        fields.push({
          ...field,
          column_name: colName,
        });
      }
    }
  }
  return fields;
}

// -------------------------------------------------------
// LIST records with pagination, search, filter, sort
// -------------------------------------------------------
async function list(slug, options = {}) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Form "${slug}" not found`);

  const tableName = schema.fsc_table_name;
  validateIdentifier(tableName, "table name");

  const pkCol = "id";
  const fields = extractFields(schema.fsc_definition);

  const {
    page      = 1,
    limit     = 20,
    search    = "",
    filters   = {},
    sortBy    = pkCol,
    sortOrder = "DESC",
  } = options;

  const safeLimit     = Math.min(Math.max(1, parseInt(limit, 10)), 500);
  const offset        = (Math.max(1, parseInt(page, 10)) - 1) * safeLimit;
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const allowedCols    = new Set([pkCol, ...fields.map((f) => f.column_name)]);
  const safeSortBy     = allowedCols.has(sortBy) ? sortBy : pkCol;

  const params = [];
  let idx = 1;

  // Filter conditions
  const conditions = [`deleted_at IS NULL`];
  for (const [key, value] of Object.entries(filters)) {
    if (!allowedCols.has(key) || value === undefined || value === "") continue;
    conditions.push(`${key} = $${idx++}`);
    params.push(value);
  }

  // Search
  if (search?.trim()) {
    const textFields = fields
      .filter((f) => ["text", "short_text", "email", "mobile", "textarea"].includes(f.type))
      .map((f) => f.column_name);

    if (textFields.length > 0) {
      const searchParts = textFields.map((col) => {
        params.push(`%${search.trim()}%`);
        return `CAST(${col} AS TEXT) ILIKE $${idx++}`;
      });
      conditions.push(`(${searchParts.join(" OR ")})`);
    }
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  params.push(safeLimit, offset);
  const dataResult = await db.query(
    `SELECT * FROM ${tableName}
     WHERE ${whereClause}
     ORDER BY ${safeSortBy} ${safeSortOrder}
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data:       dataResult.rows,
    total,
    page:       parseInt(page, 10),
    limit:      safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    schema: {
      name:        schema.fsc_name,
      slug:        schema.fsc_slug,
      definition:  schema.fsc_definition,
      allow_draft: schema.fsc_allow_draft,
      workflow_id: schema.fsc_workflow_id,
    },
  };
}

// -------------------------------------------------------
// GET ONE by ID
// -------------------------------------------------------
async function getOne(slug, id) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Form "${slug}" not found`);

  const tableName = schema.fsc_table_name;
  validateIdentifier(tableName, "table name");

  const result = await db.query(
    `SELECT * FROM ${tableName}
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

// -------------------------------------------------------
// EXECUTE TRIGGER VALIDATIONS (PRE-SAVE GUARD)
// -------------------------------------------------------
async function executeTriggerValidations(schema, data, operation = "create", recordId = null) {
  const triggers = Array.isArray(schema.triggers) ? schema.triggers : [];
  for (const trigger of triggers) {
    if (!trigger.enabled) continue;
    const events = Array.isArray(trigger.events) ? trigger.events : ["create", "update"];
    if (!events.includes(operation)) continue;

    const validation = trigger.validation;
    if (!validation || !validation.enabled) continue;

    const targetTable = trigger.target_table;
    const targetPk = trigger.target_pk || "id";
    const sourceFkField = trigger.source_fk_field;
    if (!targetTable || !sourceFkField) continue;

    validateIdentifier(targetTable, "target table");
    validateIdentifier(targetPk, "target primary key");
    validateIdentifier(sourceFkField, "source foreign key");

    let foreignKeyValue = data[sourceFkField];
    const currentTable = schema.fsc_table_name || schema.table_name;

    // If on update and FK is not in payload, fetch from existing record
    if (foreignKeyValue === undefined && recordId) {
      const existing = await db.query(`SELECT ${sourceFkField} FROM ${currentTable} WHERE id = $1 LIMIT 1`, [recordId]);
      foreignKeyValue = existing.rows[0]?.[sourceFkField];
    }

    if (!foreignKeyValue) continue;

    // 1. Fetch parent/target row
    const targetRes = await db.query(
      `SELECT * FROM ${targetTable} WHERE ${targetPk} = $1 LIMIT 1`,
      [foreignKeyValue]
    );
    const targetRow = targetRes.rows[0];
    if (!targetRow) continue;

    // 2. Sum limit validation
    if (validation.rule_type === "sum_limit" || !validation.rule_type) {
      const amountField = validation.current_amount_field || "amount";
      const limitField = validation.target_limit_field || "total_amount";
      validateIdentifier(amountField, "current amount field");
      validateIdentifier(limitField, "target limit field");

      const newAmount = Number(data[amountField] !== undefined ? data[amountField] : 0);
      const targetLimit = Number(targetRow[limitField] || 0);

      // Sum existing payments for this foreign key excluding current record (if updating)
      let sumQuery = `SELECT COALESCE(SUM(${amountField}), 0) AS total_sum FROM ${currentTable} WHERE ${sourceFkField} = $1`;
      const sumParams = [foreignKeyValue];
      if (recordId) {
        sumQuery += ` AND id != $2`;
        sumParams.push(recordId);
      }
      try {
        const sumRes = await db.query(`${sumQuery} AND deleted_at IS NULL`, sumParams);
        const existingSum = Number(sumRes.rows[0]?.total_sum || 0);
        const cumulativeSum = existingSum + newAmount;

        if (cumulativeSum > targetLimit) {
          const available = Math.max(0, targetLimit - existingSum);
          const defaultMsg = `Amount (${newAmount}) exceeds the remaining balance (${available}) for the selected record. Total limit is ${targetLimit}, already allocated: ${existingSum}.`;
          throw new Error(validation.error_message || defaultMsg);
        }
      } catch (err) {
        if (err.message && (err.message.includes("exceeds the remaining") || (validation.error_message && err.message.includes(validation.error_message)))) {
          throw err;
        }
        // If deleted_at does not exist on table, fallback without deleted_at
        const sumRes = await db.query(sumQuery, sumParams);
        const existingSum = Number(sumRes.rows[0]?.total_sum || 0);
        const cumulativeSum = existingSum + newAmount;

        if (cumulativeSum > targetLimit) {
          const available = Math.max(0, targetLimit - existingSum);
          const defaultMsg = `Amount (${newAmount}) exceeds the remaining balance (${available}) for the selected record. Total limit is ${targetLimit}, already allocated: ${existingSum}.`;
          throw new Error(validation.error_message || defaultMsg);
        }
      }
    }
  }
}

// -------------------------------------------------------
// EXECUTE TRIGGER ACTIONS (POST-SAVE ROLLUPS & SYNC)
// -------------------------------------------------------
async function executeTriggerActions(schema, data, operation = "create", recordId = null, previousData = null) {
  const triggers = Array.isArray(schema.triggers) ? schema.triggers : [];
  for (const trigger of triggers) {
    if (!trigger.enabled) continue;
    const rawEvents = Array.isArray(trigger.events) ? trigger.events : ["create", "update", "delete"];
    const events = rawEvents.map((e) => e.toLowerCase() === "insert" ? "create" : e.toLowerCase());
    if (!events.includes(operation)) continue;

    // If updating and specific fields are configured to be watched, only fire if one of them changed
    if (operation === "update" && Array.isArray(trigger.watch_update_fields) && trigger.watch_update_fields.length > 0 && previousData) {
      const hasWatchedFieldChanged = trigger.watch_update_fields.some((field) => {
        return String(data?.[field] ?? '') !== String(previousData?.[field] ?? '');
      });
      if (!hasWatchedFieldChanged) {
        continue;
      }
    }

    const actions = Array.isArray(trigger.actions) ? trigger.actions : [];
    if (actions.length === 0) continue;

    const targetTable = trigger.target_table;
    const targetPk = trigger.target_pk || "id";
    const sourceFkField = trigger.source_fk_field;
    if (!targetTable || !sourceFkField) continue;

    validateIdentifier(targetTable, "target table");
    validateIdentifier(targetPk, "target primary key");
    validateIdentifier(sourceFkField, "source foreign key");

    const currentTable = schema.fsc_table_name || schema.table_name;
    const targetIdsToUpdate = new Set();

    if (data?.[sourceFkField]) targetIdsToUpdate.add(data[sourceFkField]);
    if (previousData?.[sourceFkField]) targetIdsToUpdate.add(previousData[sourceFkField]);

    for (const fkId of targetIdsToUpdate) {
      if (!fkId) continue;

      for (const act of actions) {
        const targetField = act.target_field;
        if (!targetField) continue;
        validateIdentifier(targetField, "target field");

        const parseSourceColumns = (rawField) => {
          if (!rawField) return ["amount"];
          const list = Array.isArray(rawField)
            ? rawField
            : String(rawField).split(",").map((s) => s.trim()).filter(Boolean);
          const validated = list.map((f) => validateIdentifier(f, "source amount field"));
          return validated.length > 0 ? validated : ["amount"];
        };
        const srcCols = parseSourceColumns(act.source_amount_field || act.source_fields);
        const primarySrcField = srcCols[0];
        const sumNumericExpr = srcCols.length > 1
          ? `(${srcCols.map((c) => `COALESCE("${c}"::numeric, 0)`).join(" + ")})`
          : `COALESCE("${primarySrcField}"::numeric, 0)`;

        const actMode = (act.action_type || "sum_rollup").toLowerCase();
        const conditions = act.conditions || trigger.conditions || [];
        let condSql = "";
        if (Array.isArray(conditions) && conditions.length > 0) {
          const clauses = [];
          for (const c of conditions) {
            if (!c || !c.field) continue;
            const fld = validateIdentifier(c.field, "condition field");
            const op = (c.operator || "=").toUpperCase().trim();
            if (op === "IS NULL") {
              clauses.push(`"${fld}" IS NULL`);
            } else if (op === "IS NOT NULL") {
              clauses.push(`"${fld}" IS NOT NULL`);
            } else if (op === "IN" || op === "NOT IN") {
              const vals = String(c.value || "")
                .split(",")
                .map((s) => s.trim().replace(/^['"]+|['"]+$/g, ""))
                .filter(Boolean);
              if (vals.length > 0) {
                const quotedList = vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
                clauses.push(`"${fld}"::text ${op} (${quotedList})`);
              }
            } else {
              const allowedOps = new Set(["=", "!=", "<>", ">", "<", ">=", "<=", "LIKE", "ILIKE"]);
              const safeOp = allowedOps.has(op) ? op : "=";
              const safeVal = String(c.value !== undefined ? c.value : "").replace(/'/g, "''");
              clauses.push(`"${fld}"::text ${safeOp} '${safeVal}'`);
            }
          }
          if (clauses.length > 0) {
            condSql = " AND " + clauses.join(" AND ");
          }
        }

        try {
          if (Array.isArray(act.terms) && act.terms.length > 0) {
            let finalVal = 0;
            for (let tIdx = 0; tIdx < act.terms.length; tIdx++) {
              const term = act.terms[tIdx];
              let termVal = 0;
              if (term.source_type === "target_column") {
                const tf = validateIdentifier(term.field || "total_amount", "term target column");
                const res = await db.query(
                  `SELECT COALESCE("${tf}"::numeric, 0) AS val FROM "${targetTable}" WHERE "${targetPk}"::text = $1 LIMIT 1`,
                  [fkId]
                );
                termVal = Number(res.rows[0]?.val || 0);
              } else if (term.source_type === "constant") {
                termVal = Number(term.constant_value) || 0;
              } else {
                const cf = validateIdentifier(term.field || "amount", "term child field");
                const method = (term.method || "sum").toLowerCase();
                let aggExpr;
                if (method === "count") {
                  aggExpr = `COUNT(*)`;
                } else if (method === "avg" || method === "average") {
                  aggExpr = `AVG("${cf}"::numeric)`;
                } else if (method === "min") {
                  aggExpr = `MIN("${cf}"::numeric)`;
                } else if (method === "max") {
                  aggExpr = `MAX("${cf}"::numeric)`;
                } else {
                  aggExpr = `SUM("${cf}"::numeric)`;
                }
                let res;
                try {
                  res = await db.query(
                    `SELECT COALESCE(${aggExpr}, 0) AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 AND deleted_at IS NULL ${condSql}`,
                    [fkId]
                  );
                } catch {
                  res = await db.query(
                    `SELECT COALESCE(${aggExpr}, 0) AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
                    [fkId]
                  );
                }
                termVal = Number(res.rows[0]?.val || 0);
              }

              if (tIdx === 0) {
                finalVal = termVal;
              } else {
                const op = term.operator || "+";
                if (op === "-") finalVal -= termVal;
                else if (op === "*") finalVal *= termVal;
                else if (op === "/") finalVal = termVal !== 0 ? finalVal / termVal : 0;
                else finalVal += termVal;
              }
            }

            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [finalVal, fkId]
            );
            continue;
          }

          if (actMode === "recalculate_balance" || actMode === "subtract_from_total") {
            const totalField = act.target_total_field || "total_amount";
            validateIdentifier(totalField, "target total field");

            let sumRes;
            try {
              sumRes = await db.query(
                `SELECT COALESCE(SUM(${sumNumericExpr}), 0) AS total_sum FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 AND deleted_at IS NULL ${condSql}`,
                [fkId]
              );
            } catch {
              sumRes = await db.query(
                `SELECT COALESCE(SUM(${sumNumericExpr}), 0) AS total_sum FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
                [fkId]
              );
            }
            const totalChildSum = Number(sumRes.rows[0]?.total_sum || 0);

            const targetRowRes = await db.query(
              `SELECT "${totalField}" FROM "${targetTable}" WHERE "${targetPk}"::text = $1 LIMIT 1`,
              [fkId]
            );
            const targetTotal = Number(targetRowRes.rows[0]?.[totalField] || 0);
            const newRemaining = targetTotal - totalChildSum;

            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [newRemaining, fkId]
            );
          } else if (actMode === "count") {
            const res = await db.query(
              `SELECT COALESCE(COUNT(*), 0) AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
              [fkId]
            );
            const val = Number(res.rows[0]?.val || 0);
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [val, fkId]
            );
          } else if (actMode === "average" || actMode === "avg") {
            const res = await db.query(
              `SELECT COALESCE(AVG(${sumNumericExpr}), 0) AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
              [fkId]
            );
            const val = Number(res.rows[0]?.val || 0);
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [val, fkId]
            );
          } else if (actMode === "min") {
            const res = await db.query(
              `SELECT MIN(${sumNumericExpr}) AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
              [fkId]
            );
            const val = res.rows[0]?.val !== null ? Number(res.rows[0]?.val) : null;
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [val, fkId]
            );
          } else if (actMode === "max") {
            const res = await db.query(
              `SELECT MAX(${sumNumericExpr}) AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
              [fkId]
            );
            const val = res.rows[0]?.val !== null ? Number(res.rows[0]?.val) : null;
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [val, fkId]
            );
          } else if (actMode === "count_distinct") {
            const res = await db.query(
              `SELECT COALESCE(COUNT(DISTINCT "${primarySrcField}"), 0) AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
              [fkId]
            );
            const val = Number(res.rows[0]?.val || 0);
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [val, fkId]
            );
          } else if (actMode === "first") {
            const orderCol = act.order_field ? validateIdentifier(act.order_field, "order field") : "id";
            const res = await db.query(
              `SELECT "${primarySrcField}" AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql} ORDER BY "${orderCol}" ASC LIMIT 1`,
              [fkId]
            );
            const val = res.rows[0]?.val ?? null;
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [val, fkId]
            );
          } else if (actMode === "last") {
            const orderCol = act.order_field ? validateIdentifier(act.order_field, "order field") : "id";
            const res = await db.query(
              `SELECT "${primarySrcField}" AS val FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql} ORDER BY "${orderCol}" DESC LIMIT 1`,
              [fkId]
            );
            const val = res.rows[0]?.val ?? null;
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [val, fkId]
            );
          } else {
            // Default: sum_rollup
            let sumRes;
            try {
              sumRes = await db.query(
                `SELECT COALESCE(SUM(${sumNumericExpr}), 0) AS total_sum FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 AND deleted_at IS NULL ${condSql}`,
                [fkId]
              );
            } catch {
              sumRes = await db.query(
                `SELECT COALESCE(SUM(${sumNumericExpr}), 0) AS total_sum FROM "${currentTable}" WHERE "${sourceFkField}"::text = $1 ${condSql}`,
                [fkId]
              );
            }
            const totalChildSum = Number(sumRes.rows[0]?.total_sum || 0);
            await db.query(
              `UPDATE "${targetTable}" SET "${targetField}" = $1, updated_at = NOW() WHERE "${targetPk}"::text = $2`,
              [totalChildSum, fkId]
            );
          }
        } catch (actErr) {
          console.error(`[TriggerAction] Error executing ${actMode} on ${targetTable}.${targetField}:`, actErr.message);
        }
      }
    }
  }
}

// -------------------------------------------------------
// CREATE — insert a new form record
// -------------------------------------------------------
async function create(slug, data, userId, isDraft = false) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Form "${slug}" not found`);

  const tableName = schema.fsc_table_name;
  validateIdentifier(tableName, "table name");

  // Run trigger validations before save (if not draft)
  if (!isDraft) {
    await executeTriggerValidations(schema, data, "create");
  }

  const fields = extractFields(schema.fsc_definition);
  const allowedCols = new Set(fields.map((f) => f.column_name));

  const insertColumns  = [];
  const insertValues   = [];
  const placeholders   = [];
  let idx = 1;

  // Map user data to only allowed columns
  for (const [key, value] of Object.entries(data)) {
    if (!allowedCols.has(key)) continue;
    insertColumns.push(key);
    insertValues.push(value ?? null);
    placeholders.push(`$${idx++}`);
  }

  // Status column — draft vs submitted (if column exists)
  const hasStatus = fields.some((f) => f.column_name === "status");
  if (hasStatus) {
    insertColumns.push("status");
    insertValues.push(isDraft ? "draft" : "submitted");
    placeholders.push(`$${idx++}`);
  }

  // Audit columns
  insertColumns.push("created_by", "updated_by");
  insertValues.push(userId || null, userId || null);
  placeholders.push(`$${idx++}`, `$${idx++}`);

  if (insertColumns.length <= 2) {
    throw new Error("No valid form fields provided");
  }

  const sql = `
    INSERT INTO ${tableName} (${insertColumns.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *
  `.trim();

  const result = await db.query(sql, insertValues);
  const createdRecord = result.rows[0];

  // Execute post-save trigger actions
  if (!isDraft && createdRecord) {
    await executeTriggerActions(schema, createdRecord, "create", createdRecord.id);
  }

  return createdRecord;
}

// -------------------------------------------------------
// UPDATE — update an existing form record
// -------------------------------------------------------
async function update(slug, id, data, userId) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Form "${slug}" not found`);

  const tableName = schema.fsc_table_name;
  validateIdentifier(tableName, "table name");

  // Fetch previous record state before updating
  const prevRes = await db.query(`SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`, [id]);
  const previousRecord = prevRes.rows[0] || null;

  // Run trigger validations before update
  await executeTriggerValidations(schema, data, "update", id);

  const fields = extractFields(schema.fsc_definition);
  const allowedCols = new Set(fields.map((f) => f.column_name));

  const setClauses = [];
  const values     = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (!allowedCols.has(key)) continue;
    setClauses.push(`${key} = $${idx++}`);
    values.push(value ?? null);
  }

  if (setClauses.length === 0) throw new Error("No valid fields to update");

  setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
  values.push(userId || null);

  values.push(id);
  const sql = `
    UPDATE ${tableName}
    SET ${setClauses.join(", ")}
    WHERE id = $${idx} AND deleted_at IS NULL
    RETURNING *
  `.trim();

  const result = await db.query(sql, values);
  const updatedRecord = result.rows[0] || null;

  // Execute post-save trigger actions
  if (updatedRecord) {
    await executeTriggerActions(schema, updatedRecord, "update", id, previousRecord);
  }

  return updatedRecord;
}

// -------------------------------------------------------
// SOFT DELETE
// -------------------------------------------------------
async function softDelete(slug, id, userId) {
  const schema = await getSchema(slug);
  if (!schema) throw new Error(`Form "${slug}" not found`);

  const tableName = schema.fsc_table_name;
  validateIdentifier(tableName, "table name");

  // Fetch previous record state before delete
  const prevRes = await db.query(`SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`, [id]);
  const previousRecord = prevRes.rows[0] || null;

  const result = await db.query(
    `UPDATE ${tableName}
     SET deleted_at = NOW(),
         updated_by = $1,
         updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [userId || null, id]
  );

  const isDeleted = result.rows.length > 0;

  if (isDeleted && previousRecord) {
    await executeTriggerActions(schema, null, "delete", id, previousRecord);
  }

  return isDeleted;
}

module.exports = { list, getOne, create, update, softDelete, getSchema, extractFields };
