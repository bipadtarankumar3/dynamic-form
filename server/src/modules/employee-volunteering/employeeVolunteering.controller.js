// server/src/modules/employee-volunteering/employeeVolunteering.controller.js
// ============================================================
// Employee Volunteering Management Controller
// 100% Dynamic FormBuilder Compatible:
// - Dynamically resolves FormBuilder schema & tables
// - FormBuilder tables:
//     * t_frm_volunteering_program
//     * t_frm_volunteering_event
//     * t_frm_volunteering_event_volunteer
// - Dynamically maps and saves ANY fields added in FormBuilder
// - Integrates with t_users table for employee enrolments & directory
// - Live attendance rollups, approvals, and employee portal
// ============================================================

const db = require("../../config/db");
const { getFormWithSection } = require("../../helper/getFormWithSection.helper");
const storageService = require("../../services/storage.service");
const { saveAndPrepareDocumentMetadata, saveUpdateAndPrepareDocumentMetadata } = require("../../helper/document.helper");
const DocumentModel = require("../../models/document.model");

const DEFAULT_PROGRAM_TABLE = "t_frm_volunteering_program";
const DEFAULT_EVENT_TABLE = "t_frm_volunteering_event";
const DEFAULT_VOLUNTEER_TABLE = "t_frm_volunteering_event_volunteer";

let schemaEnsured = false;
const ensureEventSchema = async () => {
  if (schemaEnsured) return;
  try {
    await db.query(`
      ALTER TABLE t_frm_volunteering_event ADD COLUMN IF NOT EXISTS start_date DATE;
      ALTER TABLE t_frm_volunteering_event ADD COLUMN IF NOT EXISTS end_date DATE;
      UPDATE t_frm_volunteering_event SET start_date = event_date WHERE start_date IS NULL AND event_date IS NOT NULL;
      UPDATE t_frm_volunteering_event SET end_date = event_date WHERE end_date IS NULL AND event_date IS NOT NULL;
    `);
    schemaEnsured = true;
  } catch (e) {
    // ignore
  }
};

/**
 * Dynamically resolves the primary table name for a form_slug from FormBuilder
 */
const getFormTable = async (formSlug, defaultTable) => {
  try {
    const schema = await getFormWithSection({ form_slug: formSlug });
    const secTable = schema?.sections?.find(s => s.table && s.type !== "add_more")?.table 
      || schema?.sections?.[0]?.table 
      || schema?.root_entity?.table;
    return secTable || defaultTable;
  } catch (e) {
    return defaultTable;
  }
};

/**
 * Dynamically fetches existing column definitions for a table from PostgreSQL
 */
const getTableColumns = async (tableName) => {
  try {
    const res = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );
    const colMap = {};
    for (const r of res.rows) {
      colMap[r.column_name] = r.data_type;
    }
    return colMap;
  } catch (e) {
    return {};
  }
};

/**
 * Dynamically builds and executes an INSERT statement for ANY columns in payload
 */
const dynamicInsert = async (tableName, payload) => {
  const colMap = await getTableColumns(tableName);
  const validCols = [];
  const placeholders = [];
  const values = [];

  for (const [key, val] of Object.entries(payload)) {
    if (colMap[key] && val !== undefined) {
      validCols.push(`"${key}"`);
      const dataType = colMap[key];
      values.push(val);

      if (dataType === "jsonb" || dataType === "json") {
        placeholders.push(`$${values.length}::jsonb`);
        values[values.length - 1] = typeof val === "object" ? JSON.stringify(val) : val;
      } else if (dataType === "integer" || dataType === "bigint" || dataType === "smallint") {
        placeholders.push(`$${values.length}::int`);
        values[values.length - 1] = val === "" || isNaN(Number(val)) ? null : Number(val);
      } else if (dataType.includes("numeric") || dataType.includes("decimal") || dataType.includes("double") || dataType.includes("real")) {
        placeholders.push(`$${values.length}::numeric`);
        values[values.length - 1] = val === "" || isNaN(Number(val)) ? null : Number(val);
      } else if (dataType.includes("date") || dataType.includes("time")) {
        placeholders.push(`$${values.length}`);
        values[values.length - 1] = val === "" ? null : val;
      } else {
        placeholders.push(`$${values.length}`);
      }
    }
  }

  if (validCols.length === 0) {
    throw new Error(`No matching columns found in table "${tableName}"`);
  }

  const sql = `INSERT INTO "${tableName}" (${validCols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
  const result = await db.query(sql, values);
  return result.rows[0];
};

/**
 * Dynamically builds and executes an UPDATE statement for ANY columns in payload
 */
const dynamicUpdate = async (tableName, payload, whereSql, whereParams = []) => {
  const colMap = await getTableColumns(tableName);
  const setClauses = [];
  const values = [...whereParams];

  for (const [key, val] of Object.entries(payload)) {
    if (colMap[key] && key !== "id" && val !== undefined) {
      const dataType = colMap[key];
      let sanitizedVal = val;

      if (dataType === "jsonb" || dataType === "json") {
        sanitizedVal = typeof val === "object" ? JSON.stringify(val) : val;
        values.push(sanitizedVal);
        const paramIdx = values.length;
        setClauses.push(`"${key}" = $${paramIdx}::jsonb`);
      } else if (dataType === "integer" || dataType === "bigint" || dataType === "smallint") {
        sanitizedVal = val === "" || isNaN(Number(val)) ? null : Number(val);
        values.push(sanitizedVal);
        const paramIdx = values.length;
        setClauses.push(`"${key}" = $${paramIdx}::int`);
      } else if (dataType.includes("numeric") || dataType.includes("decimal") || dataType.includes("double") || dataType.includes("real")) {
        sanitizedVal = val === "" || isNaN(Number(val)) ? null : Number(val);
        values.push(sanitizedVal);
        const paramIdx = values.length;
        setClauses.push(`"${key}" = $${paramIdx}::numeric`);
      } else if (dataType.includes("date") || dataType.includes("time")) {
        sanitizedVal = val === "" ? null : val;
        values.push(sanitizedVal);
        const paramIdx = values.length;
        setClauses.push(`"${key}" = $${paramIdx}`);
      } else {
        values.push(sanitizedVal);
        const paramIdx = values.length;
        setClauses.push(`"${key}" = $${paramIdx}`);
      }
    }
  }

  if (colMap["updated_at"]) {
    setClauses.push(`"updated_at" = NOW()`);
  }

  if (setClauses.length === 0) {
    const fetchRes = await db.query(`SELECT * FROM "${tableName}" WHERE ${whereSql}`, whereParams);
    return fetchRes.rows[0];
  }

  const sql = `UPDATE "${tableName}" SET ${setClauses.join(", ")} WHERE ${whereSql} RETURNING *`;
  const result = await db.query(sql, values);
  return result.rows[0];
};

// Helper to parse JSON safely
const parseJsonField = (val, fallback = null) => {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
};

/**
 * Automatically records uploaded files, images, and documents into the standard `t_documents` table
 * using the global saveAndPrepareDocumentMetadata helper and DocumentModel
 */
const recordFilesToDocuments = async (fileList, finalDocId, purpose = "volunteering_submission", userId = 1) => {
  if (!Array.isArray(fileList) || fileList.length === 0 || !finalDocId) return;

  try {
    const preparedFiles = fileList.map((item) => {
      if (typeof item === "string") {
        return { path: item, originalname: item.split("/").pop(), doc_purpose: purpose };
      }
      return { ...item, doc_purpose: item.doc_purpose || purpose };
    });

    const result = await saveAndPrepareDocumentMetadata(
      preparedFiles,
      finalDocId,
      "uploads/volunteering",
      userId || 1
    );

    if (result?.metadata?.length > 0) {
      const rowsToInsert = result.metadata.map((m) => ({
        ...m,
        tdoc_id: `doc_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        doc_purpose: m.doc_purpose || purpose,
        created_by: userId || 1,
        updated_by: userId || 1,
      }));

      await DocumentModel.bulkCreate(rowsToInsert, { ignoreDuplicates: true });
    }
  } catch (e) {
    console.warn("[t_documents] record error via saveAndPrepareDocumentMetadata:", e.message);
  }
};

// ============================================================
// 1. DYNAMIC PROGRAMS CONTROLLERS (FormBuilder Schema Driven)
// ============================================================

exports.getPrograms = async (req, res) => {
  try {
    const progTable = await getFormTable("volunteering_program", DEFAULT_PROGRAM_TABLE);
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const colMap = await getTableColumns(progTable);

    const { theme, status, search } = req.query;

    let query = `
      SELECT 
        p.*,
        COALESCE((SELECT COUNT(*) FROM "${eventTable}" e WHERE (e.program_id = p.program_id OR e.program_id = p.id::text) AND e.deleted_at IS NULL), 0)::int AS achieved_events,
        COALESCE((SELECT SUM(COALESCE(e.registered_count, 0) * 4) FROM "${eventTable}" e WHERE (e.program_id = p.program_id OR e.program_id = p.id::text) AND e.deleted_at IS NULL), 0)::numeric AS achieved_hours,
        COALESCE((SELECT SUM(COALESCE(e.registered_count, 0)) FROM "${eventTable}" e WHERE (e.program_id = p.program_id OR e.program_id = p.id::text) AND e.deleted_at IS NULL), 0)::int AS achieved_employees
      FROM "${progTable}" p
      WHERE 1=1
    `;
    const params = [];

    if (colMap["deleted_at"]) {
      query += ` AND p.deleted_at IS NULL`;
    }
    if (theme && colMap["csr_theme"]) {
      params.push(theme);
      query += ` AND p.csr_theme = $${params.length}`;
    }
    if (status && colMap["status"]) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      const searchClauses = [];
      if (colMap["program_name"]) searchClauses.push(`p.program_name ILIKE $${params.length}`);
      if (colMap["program_id"]) searchClauses.push(`p.program_id ILIKE $${params.length}`);
      if (colMap["objective"]) searchClauses.push(`p.objective ILIKE $${params.length}`);
      if (searchClauses.length > 0) {
        query += ` AND (${searchClauses.join(" OR ")})`;
      }
    }

    query += ` ORDER BY p.id DESC`;

    const result = await db.query(query, params);
    return res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const progTable = await getFormTable("volunteering_program", DEFAULT_PROGRAM_TABLE);
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const colMap = await getTableColumns(progTable);

    let whereClause = `(p.id = $1::int OR p.program_id = $2::text)`;
    if (colMap["deleted_at"]) {
      whereClause += ` AND p.deleted_at IS NULL`;
    }

    const result = await db.query(`
      SELECT 
        p.*,
        COALESCE((SELECT COUNT(*) FROM "${eventTable}" e WHERE (e.program_id = p.program_id OR e.program_id = p.id::text) AND e.deleted_at IS NULL), 0)::int AS achieved_events,
        COALESCE((SELECT SUM(COALESCE(e.registered_count, 0) * 4) FROM "${eventTable}" e WHERE (e.program_id = p.program_id OR e.program_id = p.id::text) AND e.deleted_at IS NULL), 0)::numeric AS achieved_hours
      FROM "${progTable}" p
      WHERE ${whereClause}
    `, [isNaN(numId) ? -1 : numId, String(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProgram = async (req, res) => {
  try {
    const progTable = await getFormTable("volunteering_program", DEFAULT_PROGRAM_TABLE);
    const body = req.body || {};
    const payload = {
      ...body,
      program_id: body.program_id || `VP-2025-${Math.floor(100 + Math.random() * 900)}`,
      program_name: body.program_name || body.name || "New CSR Program"
    };

    const row = await dynamicInsert(progTable, payload);
    return res.status(201).json({ success: true, data: row, message: "Program created successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const progTable = await getFormTable("volunteering_program", DEFAULT_PROGRAM_TABLE);
    const body = req.body || {};
    const numId = Number(id);

    const whereSql = `(id = $1::int OR program_id = $2::text)`;
    const row = await dynamicUpdate(progTable, body, whereSql, [isNaN(numId) ? -1 : numId, String(id)]);

    if (!row) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    return res.json({ success: true, data: row, message: "Program updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const progTable = await getFormTable("volunteering_program", DEFAULT_PROGRAM_TABLE);
    const colMap = await getTableColumns(progTable);

    if (colMap["deleted_at"]) {
      await db.query(`UPDATE "${progTable}" SET deleted_at = NOW() WHERE (id = $1::int OR program_id = $2::text)`, [isNaN(numId) ? -1 : numId, String(id)]);
    } else {
      await db.query(`DELETE FROM "${progTable}" WHERE (id = $1::int OR program_id = $2::text)`, [isNaN(numId) ? -1 : numId, String(id)]);
    }

    return res.json({ success: true, message: "Program deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// 2. DYNAMIC EVENTS CONTROLLERS (FormBuilder Schema Driven)
// ============================================================

exports.getEvents = async (req, res) => {
  try {
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const progTable = await getFormTable("volunteering_program", DEFAULT_PROGRAM_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);
    const colMap = await getTableColumns(eventTable);

    const { theme, type, status, program_id, search } = req.query;

    let query = `
      SELECT 
        e.*,
        COALESCE((SELECT COUNT(*) FROM "${volTable}" v WHERE v.event_id = e.id AND v.status IN ('Accepted', 'Attended') AND v.deleted_at IS NULL), 0)::int AS registered_count,
        COALESCE((SELECT COUNT(*) FROM "${volTable}" v WHERE v.event_id = e.id AND v.status = 'Attended' AND v.deleted_at IS NULL), 0)::int AS attended_count
      FROM "${eventTable}" e 
      WHERE 1=1
    `;
    const params = [];

    if (colMap["deleted_at"]) {
      query += ` AND e.deleted_at IS NULL`;
    }
    if (theme && colMap["csr_theme"]) {
      params.push(theme);
      query += ` AND e.csr_theme = $${params.length}`;
    }
    if (type && colMap["event_type"]) {
      params.push(type);
      query += ` AND e.event_type = $${params.length}`;
    }
    if (status && colMap["approval_status"]) {
      params.push(status);
      query += ` AND e.approval_status = $${params.length}`;
    }
    if (program_id && colMap["program_id"]) {
      params.push(program_id);
      query += ` AND (e.program_id = $${params.length} OR e.program_id = (SELECT program_id FROM "${progTable}" WHERE id::text = $${params.length} LIMIT 1))`;
    }
    if (search) {
      params.push(`%${search}%`);
      const searchClauses = [];
      if (colMap["event_name"]) searchClauses.push(`e.event_name ILIKE $${params.length}`);
      if (colMap["event_id"]) searchClauses.push(`e.event_id ILIKE $${params.length}`);
      if (colMap["event_location"]) searchClauses.push(`e.event_location ILIKE $${params.length}`);
      if (searchClauses.length > 0) {
        query += ` AND (${searchClauses.join(" OR ")})`;
      }
    }

    query += ` ORDER BY e.id DESC`;

    const result = await db.query(query, params);
    return res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);
    const colMap = await getTableColumns(eventTable);

    let whereSql = `(id = $1::int OR event_id = $2::text)`;
    if (colMap["deleted_at"]) {
      whereSql += ` AND deleted_at IS NULL`;
    }

    const eventRes = await db.query(`SELECT * FROM "${eventTable}" WHERE ${whereSql}`, [isNaN(numId) ? -1 : numId, String(id)]);

    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const event = eventRes.rows[0];

    // Fetch related volunteers / enrolled employees joined with t_users
    const volRes = await db.query(`
      SELECT 
        v.*,
        u.designation,
        u.role_slug,
        u.profile_pic,
        COALESCE(u.name, v.name) AS name,
        COALESCE(u.email, v.email) AS email,
        COALESCE(NULLIF(u.department, ''), v.dept) AS dept,
        COALESCE(NULLIF(u.employee_code, ''), v.emp_id) AS emp_id,
        COALESCE(u.mobile, v.phone) AS phone
      FROM "${volTable}" v
      LEFT JOIN "t_users" u ON u.id = v.user_id
      WHERE v.event_id = $1 AND v.deleted_at IS NULL
      ORDER BY v.id ASC
    `, [event.id]);

    const volunteers = volRes.rows;
    for (const v of volunteers) {
      const parsedFb = parseJsonField(v.feedback_form, null);
      v.feedback_form = (parsedFb && typeof parsedFb === "object" && Object.keys(parsedFb).length > 0 && (parsedFb.rating !== undefined || parsedFb.learnings || parsedFb.testimonial || parsedFb.hours !== undefined || parsedFb.submitted_at)) ? parsedFb : null;
      v.photos = parseJsonField(v.photos, []);
      v.attachments = parseJsonField(v.attachments, []);

      const docRes = await db.query(`
        SELECT tdoc_id, doc_title, doc_type, file_path, file_name, doc_purpose, created_at 
        FROM "t_documents" 
        WHERE final_doc_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
      `, [v.id]);
      const seenDocKeys = new Set();
      v.documents = docRes.rows.filter(d => {
        const key = (d.file_name || d.file_path || "").toLowerCase().trim();
        if (!key || seenDocKeys.has(key)) return false;
        seenDocKeys.add(key);
        return true;
      });
    }

    event.volunteers = volunteers;
    event.registered_count = volunteers.filter(v => v.status === "Accepted" || v.status === "Attended").length || event.registered_count || 0;
    event.attended_count = volunteers.filter(v => v.status === "Attended").length || event.attended_count || 0;
    event.budget_items = parseJsonField(event.budget_items, []);
    event.closure_summary = parseJsonField(event.closure_summary, {});
    event.story = parseJsonField(event.story, {});

    return res.json({ success: true, data: event });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    await ensureEventSchema();
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const body = req.body || {};
    const startDate = body.start_date || body.event_date || null;
    const endDate = body.end_date || startDate;
    const payload = {
      ...body,
      start_date: startDate,
      end_date: endDate,
      event_date: startDate,
      event_id: body.event_id || `EVT-2025-${Math.floor(100 + Math.random() * 900)}`,
      event_name: body.event_name || body.name || "New Volunteering Event",
      approval_status: body.approval_status || "DRAFT"
    };

    const row = await dynamicInsert(eventTable, payload);
    return res.status(201).json({ success: true, data: row, message: "Event created successfully in Draft status" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    await ensureEventSchema();
    const { id } = req.params;
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const body = req.body || {};
    const numId = Number(id);

    const payload = { ...body };
    if (body.start_date && !body.event_date) {
      payload.event_date = body.start_date;
    }
    if (body.event_date && !body.start_date) {
      payload.start_date = body.event_date;
    }
    if (body.start_date && !body.end_date) {
      payload.end_date = body.start_date;
    }

    const whereSql = `(id = $1::int OR event_id = $2::text)`;
    const row = await dynamicUpdate(eventTable, payload, whereSql, [isNaN(numId) ? -1 : numId, String(id)]);

    if (!row) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, data: row, message: "Event updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const colMap = await getTableColumns(eventTable);

    if (colMap["deleted_at"]) {
      await db.query(`UPDATE "${eventTable}" SET deleted_at = NOW() WHERE (id = $1::int OR event_id = $2::text)`, [isNaN(numId) ? -1 : numId, String(id)]);
    } else {
      await db.query(`DELETE FROM "${eventTable}" WHERE (id = $1::int OR event_id = $2::text)`, [isNaN(numId) ? -1 : numId, String(id)]);
    }

    return res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// 3. EVENT APPROVAL & PUBLISHING LIFECYCLE
// ============================================================

exports.submitEventForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);

    const row = await dynamicUpdate(eventTable, { approval_status: "PENDING_APPROVAL" }, `(id = $1::int OR event_id = $2::text)`, [isNaN(numId) ? -1 : numId, String(id)]);

    if (!row) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, data: row, message: "Event submitted for approval" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.publishEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);

    // 1. Fetch current event to ensure it exists and is not already published
    const existingRes = await db.query(
      `SELECT * FROM "${eventTable}" WHERE (id = $1::int OR event_id = $2::text) AND deleted_at IS NULL LIMIT 1`,
      [isNaN(numId) ? -1 : numId, String(id)]
    );

    if (!existingRes.rows[0]) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const currentEvent = existingRes.rows[0];
    const currentStatus = String(currentEvent.approval_status || "").toUpperCase();

    // Admin can ONLY publish 1 time - prevent duplicate publishing
    if (currentStatus === "PUBLISHED" || currentStatus === "OPEN_FOR_REGISTRATION" || currentStatus === "IN_PROGRESS" || currentStatus === "COMPLETED" || currentStatus === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "This event is already published. Events can only be published once."
      });
    }

    // 2. Update status from APPROVED to PUBLISHED
    const event = await dynamicUpdate(
      eventTable,
      { approval_status: "PUBLISHED", published_at: new Date() },
      `(id = $1::int OR event_id = $2::text)`,
      [isNaN(numId) ? -1 : numId, String(id)]
    );

    if (!event) {
      return res.status(500).json({ success: false, message: "Failed to update event status to PUBLISHED" });
    }

    // Automatically enrol / invite users from the database `t_users` table
    await db.query(`
      INSERT INTO "${volTable}" (event_id, user_id, emp_id, name, email, dept, phone, status)
      SELECT 
        $1::int, 
        u.id, 
        COALESCE(NULLIF(u.employee_code, ''), 'EMP-' || u.id::text), 
        u.name, 
        u.email, 
        COALESCE(NULLIF(u.department, ''), 'General'), 
        u.mobile, 
        'Invited'
      FROM "t_users" u
      WHERE u.deleted_at IS NULL AND (u.is_active IS NULL OR u.is_active = true)
        AND NOT EXISTS (
          SELECT 1 FROM "${volTable}" v 
          WHERE v.event_id = $1::int AND (v.user_id = u.id OR (u.employee_code IS NOT NULL AND u.employee_code <> '' AND v.emp_id = u.employee_code))
        )
    `, [event.id]);

    // Fetch updated volunteers list joined with t_users
    const volRes = await db.query(`
      SELECT 
        v.*,
        u.designation,
        u.role_slug,
        u.profile_pic,
        COALESCE(u.name, v.name) AS name,
        COALESCE(u.email, v.email) AS email,
        COALESCE(NULLIF(u.department, ''), v.dept) AS dept,
        COALESCE(NULLIF(u.employee_code, ''), v.emp_id) AS emp_id,
        COALESCE(u.mobile, v.phone) AS phone
      FROM "${volTable}" v
      LEFT JOIN "t_users" u ON u.id = v.user_id
      WHERE v.event_id = $1 AND v.deleted_at IS NULL 
      ORDER BY v.id ASC
    `, [event.id]);
    event.volunteers = volRes.rows;

    // Send in-app notifications to all active users in t_users
    const activeUsersRes = await db.query(`
      SELECT id, name, email FROM "t_users" 
      WHERE deleted_at IS NULL AND (is_active IS NULL OR is_active = true)
    `);

    const creatorId = req.user?.user_id || req.user?.id || 1;
    const eventDateStr = event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Upcoming";

    for (const u of activeUsersRes.rows) {
      await db.query(`
        INSERT INTO "t_notifications" (
          user_id, title, message, type, link, is_read, event_key, ref_table, ref_id, created_by, updated_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'event', $4, FALSE, 'VOLUNTEERING_EVENT_PUBLISHED', $5, $6, $7, $7, NOW(), NOW()
        )
      `, [
        u.id,
        `🚀 New Volunteering Event: ${event.event_name || 'CSR Activity'}`,
        `You are invited to participate in "${event.event_name}" (${event.csr_theme || 'CSR Activity'}) on ${eventDateStr} at ${event.event_location || 'Venue'}. Click to view event details and RSVP.`,
        `/admin/event/volunteering-event/${event.id}`,
        eventTable,
        event.id,
        creatorId
      ]).catch((err) => console.warn("[t_notifications] Error creating notification:", err.message));
    }

    return res.json({
      success: true,
      data: event,
      message: `Event published! Notifications and invitations sent to ${volRes.rows.length} company employees from user directory.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveEventClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const closureData = req.body || {};
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);

    const event = await dynamicUpdate(
      eventTable,
      { closure_summary: closureData, approval_status: "CLOSED" },
      `(id = $1::int OR event_id = $2::text)`,
      [isNaN(numId) ? -1 : numId, String(id)]
    );

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, data: event, message: "Event closed and report submitted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveEventStory = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const storyData = req.body || {};
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);

    const event = await dynamicUpdate(
      eventTable,
      { story: storyData },
      `(id = $1::int OR event_id = $2::text)`,
      [isNaN(numId) ? -1 : numId, String(id)]
    );

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, data: event, message: "Impact story published successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// 4. VOLUNTEER ATTENDANCE & FORM SUBMISSIONS
// ============================================================

exports.getEventVolunteers = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);

    const eventRes = await db.query(`SELECT id FROM "${eventTable}" WHERE (id = $1::int OR event_id = $2::text)`, [isNaN(numId) ? -1 : numId, String(id)]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const eventId = eventRes.rows[0].id;
    const result = await db.query(`
      SELECT 
        v.*,
        u.designation,
        u.role_slug,
        u.profile_pic,
        COALESCE(u.name, v.name) AS name,
        COALESCE(u.email, v.email) AS email,
        COALESCE(NULLIF(u.department, ''), v.dept) AS dept,
        COALESCE(NULLIF(u.employee_code, ''), v.emp_id) AS emp_id,
        COALESCE(u.mobile, v.phone) AS phone
      FROM "${volTable}" v
      LEFT JOIN "t_users" u ON u.id = v.user_id
      WHERE v.event_id = $1 AND v.deleted_at IS NULL 
      ORDER BY v.id ASC
    `, [eventId]);

    const volunteers = result.rows;
    for (const v of volunteers) {
      const parsedFb = parseJsonField(v.feedback_form, null);
      v.feedback_form = (parsedFb && typeof parsedFb === "object" && Object.keys(parsedFb).length > 0 && (parsedFb.rating !== undefined || parsedFb.learnings || parsedFb.testimonial || parsedFb.hours !== undefined || parsedFb.submitted_at)) ? parsedFb : null;
      v.photos = parseJsonField(v.photos, []);
      v.attachments = parseJsonField(v.attachments, []);

      const docRes = await db.query(`
        SELECT tdoc_id, doc_title, doc_type, file_path, file_name, doc_purpose, created_at 
        FROM "t_documents" 
        WHERE final_doc_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
      `, [v.id]);
      const seenDocKeys = new Set();
      v.documents = docRes.rows.filter(d => {
        const key = (d.file_name || d.file_path || "").toLowerCase().trim();
        if (!key || seenDocKeys.has(key)) return false;
        seenDocKeys.add(key);
        return true;
      });
    }

    return res.json({ success: true, data: volunteers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateVolunteerAttendance = async (req, res) => {
  try {
    const { id, volunteerId } = req.params;
    const numId = Number(id);
    const { status, check_in, check_out, hours, feedback_form } = req.body;
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);

    const eventRes = await db.query(
      `SELECT id FROM "${eventTable}" WHERE (id = $1::int OR event_id = $2::text) AND deleted_at IS NULL LIMIT 1`,
      [isNaN(numId) ? -1 : numId, String(id)]
    );
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const eventId = eventRes.rows[0].id;

    const payload = {
      status: status,
      check_in: check_in,
      check_out: check_out,
      check_in_time: check_in,
      check_out_time: check_out,
      hours: hours !== undefined ? Number(hours) : undefined,
      feedback_form: feedback_form !== undefined ? (typeof feedback_form === "object" ? feedback_form : parseJsonField(feedback_form, null)) : undefined
    };

    const numVolId = Number(volunteerId);
    const updatedRow = await dynamicUpdate(
      volTable,
      payload,
      `event_id = $1::int AND (id = $2::int OR user_id = $2::int OR emp_id = $3::text)`,
      [eventId, isNaN(numVolId) ? -1 : numVolId, String(volunteerId)]
    );

    if (!updatedRow) {
      return res.status(404).json({ success: false, message: "Volunteer record not found" });
    }

    return res.json({ success: true, data: updatedRow, message: "Attendance updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.addWalkInVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const body = req.body || {};
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);

    const eventRes = await db.query(`SELECT id FROM "${eventTable}" WHERE (id = $1::int OR event_id = $2::text)`, [isNaN(numId) ? -1 : numId, String(id)]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const eventId = eventRes.rows[0].id;
    const empId = body.emp_id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await db.query(`
      INSERT INTO "${volTable}" (
        event_id, user_id, emp_id, name, email, dept, phone, status, check_in, hours
      ) VALUES ($1::int, $2, $3, $4, $5, $6, $7, 'Attended', $8, $9)
      RETURNING *
    `, [
      eventId,
      body.user_id ? Number(body.user_id) : null,
      empId,
      body.name || "Walk-in Volunteer",
      body.email || `${(body.name || "volunteer").toLowerCase().replace(/\s+/g, ".")}@techcsr.com`,
      body.dept || "General",
      body.phone || "",
      body.check_in || "08:00 AM",
      Number(body.hours) || 4.0
    ]);

    return res.status(201).json({ success: true, data: result.rows[0], message: "Walk-in volunteer checked in!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// 4. EVENT LIFECYCLE CONTROLLERS (Closure, Stories, Reports)
// ============================================================

exports.saveEventClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const body = req.body || {};
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);

    const payload = {
      closure_summary: body.closure_summary || body,
      approval_status: "COMPLETED",
      status: "COMPLETED"
    };

    const updated = await dynamicUpdate(
      eventTable,
      payload,
      `(id = $1::int OR event_id = $2::text)`,
      [isNaN(numId) ? -1 : numId, String(id)]
    );

    return res.json({
      success: true,
      data: updated,
      message: "Event closure report saved and marked as COMPLETED"
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveEventStory = async (req, res) => {
  try {
    const { id } = req.params;
    const numId = Number(id);
    const body = req.body || {};
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);

    const payload = {
      story: body.story || body
    };

    const updated = await dynamicUpdate(
      eventTable,
      payload,
      `(id = $1::int OR event_id = $2::text)`,
      [isNaN(numId) ? -1 : numId, String(id)]
    );

    return res.json({
      success: true,
      data: updated,
      message: "Event impact story published successfully"
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// 5. EMPLOYEE PORTAL SELF-SERVICE
// ============================================================

exports.getPortalEvents = async (req, res) => {
  try {
    await ensureEventSchema();
    const empId = req.query.emp_id || (req.user?.employee_code || "EMP-1042");
    const userId = req.user?.id || null;
    const userEmail = req.user?.email || "";
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);

    const eventsRes = await db.query(`
      SELECT * FROM "${eventTable}" 
      WHERE approval_status IN ('PUBLISHED', 'OPEN_FOR_REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CLOSED') 
        AND deleted_at IS NULL 
      ORDER BY COALESCE(start_date, event_date) ASC
    `);

    const events = eventsRes.rows;
    for (const ev of events) {
      ev.budget_items = parseJsonField(ev.budget_items, []);
      ev.closure_summary = parseJsonField(ev.closure_summary, {});
      ev.story = parseJsonField(ev.story, {});
      if (!ev.start_date && ev.event_date) ev.start_date = ev.event_date;
      if (!ev.end_date && ev.start_date) ev.end_date = ev.start_date;

      // Fetch all related volunteers with feedback_form and documents
      const volRes = await db.query(`
        SELECT 
          v.*,
          u.designation,
          u.role_slug,
          u.profile_pic,
          COALESCE(u.name, v.name) AS name,
          COALESCE(u.email, v.email) AS email,
          COALESCE(NULLIF(u.department, ''), v.dept) AS dept,
          COALESCE(NULLIF(u.employee_code, ''), v.emp_id) AS emp_id,
          COALESCE(u.mobile, v.phone) AS phone
        FROM "${volTable}" v
        LEFT JOIN "t_users" u ON u.id = v.user_id
        WHERE v.event_id = $1 AND v.deleted_at IS NULL
        ORDER BY v.id ASC
      `, [ev.id]);

      const volunteers = volRes.rows;
      for (const v of volunteers) {
        const parsedFb = parseJsonField(v.feedback_form, null);
        v.feedback_form = (parsedFb && typeof parsedFb === "object" && Object.keys(parsedFb).length > 0) ? parsedFb : null;
        v.photos = parseJsonField(v.photos, []);
        v.attachments = parseJsonField(v.attachments, []);

        const docRes = await db.query(`
          SELECT tdoc_id, doc_title, doc_type, file_path, file_name, doc_purpose, created_at 
          FROM "t_documents" 
          WHERE final_doc_id = $1 AND deleted_at IS NULL
          ORDER BY created_at DESC
        `, [v.id]);
        const seenDocKeys = new Set();
        v.documents = docRes.rows.filter(d => {
          const key = (d.file_name || d.file_path || "").toLowerCase().trim();
          if (!key || seenDocKeys.has(key)) return false;
          seenDocKeys.add(key);
          return true;
        });
      }

      ev.volunteers = volunteers;
      ev.registered_count = volunteers.filter(v => v.status === "Accepted" || v.status === "Attended").length || ev.registered_count || 0;
      ev.attended_count = volunteers.filter(v => v.status === "Attended").length || ev.attended_count || 0;

      // Match ONLY the current employee
      const userVol = volunteers.find(v => 
        (userId && Number(v.user_id) === Number(userId)) ||
        (empId && String(v.emp_id || "").toLowerCase().trim() === String(empId || "").toLowerCase().trim()) ||
        (userEmail && String(v.email || "").toLowerCase().trim() === String(userEmail || "").toLowerCase().trim())
      ) || null;

      ev.user_enrolment = userVol;
      ev.user_registration_status = userVol?.status || null;
      ev.user_is_attended = userVol ? (userVol.status === "Attended" || Boolean(userVol.feedback_form)) : false;
    }

    return res.json({ success: true, data: events });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitPortalRsvp = async (req, res) => {
  try {
    const { event_id, user_id, emp_id, emp_name, name, email, dept, status } = req.body;
    const actualName = emp_name || name || req.user?.name || "Employee Volunteer";
    const actualEmpId = emp_id || req.user?.employee_code || (req.user?.id ? `EMP-${req.user.id}` : "EMP-1042");
    const actualUserId = user_id || req.user?.id || null;
    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);

    const eventRes = await db.query(`SELECT id FROM "${eventTable}" WHERE (id = $1::int OR event_id = $2::text)`, [isNaN(Number(event_id)) ? -1 : Number(event_id), String(event_id)]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const eventId = eventRes.rows[0].id;

    const checkVol = await db.query(`
      SELECT id FROM "${volTable}" 
      WHERE event_id = $1::int AND (user_id = $2 OR emp_id = $3::text)
    `, [eventId, actualUserId, actualEmpId]);
    let result;

    if (checkVol.rows.length > 0) {
      result = await db.query(`
        UPDATE "${volTable}" SET
          status = $1,
          registered_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [status || "Accepted", checkVol.rows[0].id]);
    } else {
      result = await db.query(`
        INSERT INTO "${volTable}" (event_id, user_id, emp_id, name, email, dept, status, registered_at)
        VALUES ($1::int, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [eventId, actualUserId, actualEmpId, actualName, email || `${actualEmpId.toLowerCase()}@techcsr.com`, dept || "General", status || "Accepted"]);
    }

    return res.json({ success: true, data: result.rows[0], message: `RSVP marked as ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitPortalFeedback = async (req, res) => {
  try {
    const rawBody = req.body || {};
    const fbObj = typeof rawBody.feedback === "string" 
      ? parseJsonField(rawBody.feedback, {}) 
      : (rawBody.feedback && typeof rawBody.feedback === "object" ? rawBody.feedback : {});
    const fbFormObj = typeof rawBody.feedback_form === "string" 
      ? parseJsonField(rawBody.feedback_form, {}) 
      : (rawBody.feedback_form && typeof rawBody.feedback_form === "object" ? rawBody.feedback_form : {});

    // Unpack and normalize all submitted fields (including nested sections like sec_123[field_name] or extra__field_name)
    const normalizedFields = {};
    const extractFields = (sourceObj) => {
      if (!sourceObj || typeof sourceObj !== "object") return;
      for (const [key, val] of Object.entries(sourceObj)) {
        if (val === undefined || val === null) continue;
        let cleanKey = key;
        const bracketMatch = key.match(/\[([^\]]+)\]$/);
        if (bracketMatch) {
          cleanKey = bracketMatch[1];
        } else if (key.startsWith("extra__")) {
          cleanKey = key.replace("extra__", "");
        }
        normalizedFields[cleanKey] = val;
      }
    };

    extractFields(rawBody);
    extractFields(fbObj);
    extractFields(fbFormObj);

    const event_id = normalizedFields.event_id || rawBody.event_id;
    const rawUserId = normalizedFields.user_id || rawBody.user_id || req.user?.id || 1;
    const actualUserId = (!isNaN(Number(rawUserId)) && Number(rawUserId) > 0) 
      ? Number(rawUserId) 
      : (!isNaN(Number(req.user?.id)) ? Number(req.user.id) : 1);
    const emp_id = normalizedFields.emp_id || rawBody.emp_id || req.user?.employee_code || `EMP-${actualUserId}`;
    const name = normalizedFields.name || rawBody.name || req.user?.name || req.user?.first_name || "";
    const email = normalizedFields.email || rawBody.email || req.user?.email || "";
    const dept = normalizedFields.dept || rawBody.dept || req.user?.department || "";

    const eventTable = await getFormTable("volunteering_event", DEFAULT_EVENT_TABLE);
    const volTable = await getFormTable("volunteering_event_volunteer", DEFAULT_VOLUNTEER_TABLE);

    const eventRes = await db.query(
      `SELECT id FROM "${eventTable}" WHERE (id = $1::int OR event_id = $2::text) AND deleted_at IS NULL LIMIT 1`,
      [isNaN(Number(event_id)) ? -1 : Number(event_id), String(event_id)]
    );
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const eventId = eventRes.rows[0].id;

    // Find existing volunteer record for this specific employee
    let existingVolRes = await db.query(
      `SELECT * FROM "${volTable}" 
       WHERE event_id = $1::int 
         AND (
           ($2::text <> '' AND emp_id = $2::text)
           OR (user_id IS NOT NULL AND user_id = $3::int)
           OR ($4::text <> '' AND LOWER(COALESCE(email, '')) = LOWER($4::text))
           OR ($5::text <> '' AND LOWER(COALESCE(name, '')) = LOWER($5::text))
         ) 
       ORDER BY id ASC LIMIT 1`,
      [eventId, String(emp_id || ""), actualUserId, String(email || ""), String(name || "")]
    );

    let existingVol;
    if (existingVolRes.rows.length > 0) {
      existingVol = existingVolRes.rows[0];
    } else {
      // Insert a new attendance record for this employee
      const insertPayload = {
        event_id: eventId,
        emp_id: emp_id,
        user_id: actualUserId,
        name: name || "Employee User",
        email: email || "employee@cyberswift.com",
        dept: dept || "General",
        status: "Attended",
        hours: 4
      };
      existingVol = await dynamicInsert(volTable, insertPayload);
    }

    if (!existingVol) {
      return res.status(500).json({ success: false, message: "Failed to initialize volunteer record" });
    }

    // Process actual uploaded files via multer
    const uploadedPhotos = [];
    const uploadedVideos = [];
    const uploadedDocs = [];
    const fieldDocMap = {};

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const storageResult = await saveAndPrepareDocumentMetadata(
        req.files,
        existingVol.id,
        "uploads/volunteering",
        actualUserId
      );

      if (storageResult?.metadata?.length > 0) {
        const rowsToInsert = storageResult.metadata.map((m) => ({
          ...m,
          tdoc_id: `doc_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          created_by: actualUserId,
          updated_by: actualUserId,
        }));

        await DocumentModel.bulkCreate(rowsToInsert, { ignoreDuplicates: true });

        rowsToInsert.forEach((doc) => {
          const field = doc.doc_purpose || "";
          const fileName = doc.file_name || "";
          if (field) {
            if (!fieldDocMap[field]) fieldDocMap[field] = [];
            fieldDocMap[field].push(doc.file_path);
          }
          if (field === "photos" || doc.doc_type?.startsWith("image/") || fileName.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
            uploadedPhotos.push(doc.file_path);
          } else if (field === "videos" || doc.doc_type?.startsWith("video/") || fileName.match(/\.(mp4|mov|avi|mkv)$/i)) {
            uploadedVideos.push(doc.file_path);
          } else {
            uploadedDocs.push({
              file_name: doc.file_name,
              file_path: doc.file_path,
              doc_type: doc.doc_type,
              doc_purpose: doc.doc_purpose || "Volunteer Verification Proof"
            });
          }
        });
      }
    }

    // Also include any string URLs or existing files passed in body
    const rawBodyPhotos = Array.isArray(rawBody.photos) ? rawBody.photos : (typeof rawBody.photos === "string" ? parseJsonField(rawBody.photos, [rawBody.photos]) : []);
    const rawBodyVideos = Array.isArray(rawBody.videos) ? rawBody.videos : (typeof rawBody.videos === "string" ? parseJsonField(rawBody.videos, [rawBody.videos]) : []);
    const rawBodyDocs = Array.isArray(rawBody.attachments) ? rawBody.attachments : (typeof rawBody.attachments === "string" ? parseJsonField(rawBody.attachments, [rawBody.attachments]) : []);

    const seenDocSet = new Set();
    const allDocs = [...uploadedDocs, ...rawBodyDocs.filter(d => d && (typeof d === "string" ? !d.startsWith("blob:") : true))].filter(d => {
      const p = typeof d === "string" ? d : (d.file_name || d.file_path || "");
      const base = p.split("/").pop()?.split("?")[0]?.toLowerCase().trim();
      if (!base || seenDocSet.has(base)) return false;
      seenDocSet.add(base);
      return true;
    });

    const prevFeedback = typeof existingVol.feedback_form === "string" 
      ? parseJsonField(existingVol.feedback_form, {}) 
      : (existingVol.feedback_form || {});

    // Build fully dynamic feedback JSON capturing ALL submitted keys
    const feedbackJson = {
      ...prevFeedback,
      ...normalizedFields,
      photos: allPhotos.length > 0 ? allPhotos : (prevFeedback.photos || []),
      videos: allVideos.length > 0 ? allVideos : (prevFeedback.videos || []),
      attachments: allDocs.length > 0 ? allDocs : (prevFeedback.attachments || []),
      ...fieldDocMap,
      submitted_at: new Date().toLocaleString(),
      verification_status: "Pending Review"
    };

    // Calculate core fields
    const actualHours = Number(normalizedFields.hours || feedbackJson.hours) || Number(existingVol.hours) || 4;
    const actualCheckIn = normalizedFields.check_in_time || feedbackJson.check_in_time || existingVol.check_in_time || null;
    const actualCheckOut = normalizedFields.check_out_time || feedbackJson.check_out_time || existingVol.check_out_time || null;

    // Check table columns to dynamically update all matching table columns
    const colMap = await getTableColumns(volTable);
    const payload = {
      status: "Attended",
      hours: actualHours
    };

    // Dynamically assign any matching fields to table payload
    for (const [key, val] of Object.entries(normalizedFields)) {
      if (colMap[key] && key !== "id" && key !== "event_id") {
        const colType = colMap[key];
        if (colType === "integer" || colType === "bigint" || colType === "smallint") {
          if (!isNaN(Number(val)) && val !== "" && val !== null) {
            payload[key] = Number(val);
          }
        } else {
          payload[key] = val;
        }
      }
    }

    if (colMap["feedback_form"]) payload.feedback_form = feedbackJson;
    if (colMap["photos"]) payload.photos = allPhotos;
    if (colMap["attachments"]) payload.attachments = allDocs;
    if (colMap["check_in_time"]) payload.check_in_time = actualCheckIn;
    if (colMap["check_out_time"]) payload.check_out_time = actualCheckOut;
    if (colMap["name"] && name) payload.name = name;
    if (colMap["email"] && email) payload.email = email;
    if (colMap["dept"] && dept) payload.dept = dept;
    if (colMap["emp_id"] && emp_id) payload.emp_id = emp_id;
    if (colMap["user_id"] && actualUserId) payload.user_id = actualUserId;

    const volunteerRow = await dynamicUpdate(
      volTable,
      payload,
      `id = $1::int`,
      [existingVol.id]
    );

    return res.json({
      success: true,
      data: volunteerRow || {},
      message: "Attendance, feedback, hours, and media submitted successfully!"
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
