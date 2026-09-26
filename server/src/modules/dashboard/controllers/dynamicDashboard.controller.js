// server/src/modules/dashboard/controllers/dynamicDashboard.controller.js
// ============================================================
// Dynamic Dashboard Controller — handles CRUD for widgets, and
// executes widget queries to load real-time charts/metrics.
// Validates queries securely to prevent unauthorized updates/writes.
// ============================================================

const db = require("../../../config/db");

// -------------------------------------------------------
// 1. WIDGET DEFINITIONS CRUD (Configurator only)
// -------------------------------------------------------

const listWidgets = async (req, res, next) => {
  try {
    const { dashboard = "main" } = req.query;
    const { role_id, isConfigurator } = req.user;

    let sql = `SELECT * FROM t_dashboard_widgets WHERE dwg_dashboard_key = $1 AND dwg_is_active = TRUE AND dwg_deleted_at IS NULL`;
    const params = [dashboard];

    if (!isConfigurator) {
      sql += ` AND (dwg_role_id IS NULL OR dwg_role_id = $2)`;
      params.push(role_id);
    }

    sql += ` ORDER BY dwg_order ASC`;
    const result = await db.query(sql, params);

    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const createWidget = async (req, res, next) => {
  try {
    const {
      dashboard_key = "main", role_id, title, type, config = {}, position = {}, order = 0
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ success: false, message: "Widget title and type are required" });
    }

    const result = await db.query(
      `INSERT INTO t_dashboard_widgets
         (dwg_dashboard_key, dwg_role_id, dwg_title, dwg_type, dwg_config, dwg_position, dwg_order, dwg_is_active, dwg_created_by, dwg_updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $8)
       RETURNING *`,
      [
        dashboard_key, role_id || null, title.trim(), type,
        JSON.stringify(config), JSON.stringify(position),
        parseInt(order, 10) || 0, req.user?.user_id
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateWidget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dashboard_key, role_id, title, type, config, position, order, is_active } = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (dashboard_key !== undefined)  { setClauses.push(`dwg_dashboard_key = $${idx++}`); values.push(dashboard_key); }
    if (role_id !== undefined)        { setClauses.push(`dwg_role_id = $${idx++}`);       values.push(role_id || null); }
    if (title !== undefined)          { setClauses.push(`dwg_title = $${idx++}`);         values.push(title.trim()); }
    if (type !== undefined)           { setClauses.push(`dwg_type = $${idx++}`);          values.push(type); }
    if (config !== undefined)         { setClauses.push(`dwg_config = $${idx++}`);        values.push(JSON.stringify(config)); }
    if (position !== undefined)       { setClauses.push(`dwg_position = $${idx++}`);      values.push(JSON.stringify(position)); }
    if (order !== undefined)          { setClauses.push(`dwg_order = $${idx++}`);         values.push(parseInt(order, 10) || 0); }
    if (is_active !== undefined)      { setClauses.push(`dwg_is_active = $${idx++}`);     values.push(is_active === true); }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    setClauses.push(`dwg_updated_by = $${idx++}`, `dwg_updated_at = NOW()`);
    values.push(req.user?.user_id);
    values.push(id);

    const result = await db.query(
      `UPDATE t_dashboard_widgets SET ${setClauses.join(", ")}
       WHERE dwg_id = $${idx} AND dwg_deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Widget not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteWidget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE t_dashboard_widgets
       SET dwg_deleted_at = NOW(), dwg_updated_by = $1, dwg_updated_at = NOW()
       WHERE dwg_id = $2 AND dwg_deleted_at IS NULL
       RETURNING dwg_title`,
      [req.user?.user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Widget not found" });
    }

    return res.status(200).json({ success: true, message: `Widget "${result.rows[0].dwg_title}" deleted` });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// 2. QUERY EXECUTION ENGINE (All auth users)
// -------------------------------------------------------

const executeWidgetQuery = async (req, res, next) => {
  try {
    const { widget_id } = req.params;

    // Load widget and check permissions
    const { role_id, isConfigurator } = req.user;
    const widgetRes = await db.query(
      `SELECT dwg_config, dwg_type, dwg_role_id FROM t_dashboard_widgets
       WHERE dwg_id = $1 AND dwg_is_active = TRUE AND dwg_deleted_at IS NULL LIMIT 1`,
      [widget_id]
    );

    if (widgetRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Widget not found" });
    }

    const widget = widgetRes.rows[0];

    if (!isConfigurator && widget.dwg_role_id !== null && widget.dwg_role_id !== role_id) {
      return res.status(403).json({ success: false, message: "Access denied to widget data" });
    }

    const config = widget.dwg_config || {};
    const queryType = config.query_type; // "sql" | "predefined"
    let rawQuery = config.sql_query || "";

    if (!rawQuery) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Secure verification: Must strictly be a SELECT query, no multi-statements (semicolons)
    const cleanedQuery = rawQuery.trim();
    const isSelect = /^SELECT\s+/i.test(cleanedQuery);
    const hasSemicolon = cleanedQuery.includes(";");

    if (!isSelect || hasSemicolon) {
      return res.status(400).json({
        success: false,
        message: "Security violation: Only single SELECT queries without semicolons are allowed."
      });
    }

    const dataRes = await db.query(cleanedQuery);
    return res.status(200).json({ success: true, data: dataRes.rows });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Query execution error", error: err.message });
  }
};

module.exports = {
  listWidgets,
  createWidget,
  updateWidget,
  deleteWidget,
  executeWidgetQuery,
};
