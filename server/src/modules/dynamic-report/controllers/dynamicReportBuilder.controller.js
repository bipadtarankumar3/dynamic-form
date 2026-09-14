// server/src/modules/dynamic-report/controllers/dynamicReportBuilder.controller.js
// ============================================================
// Dynamic Report Controller — handles CRUD for report definitions
// and executes report queries to export Excel/PDF/CSV.
// ============================================================

const db = require("../../../config/db");
const ExcelJS = require("exceljs");

// -------------------------------------------------------
// 1. REPORT DEFINITIONS CRUD (Configurator only)
// -------------------------------------------------------

const listReports = async (req, res, next) => {
  try {
    const { role_id, isConfigurator } = req.user;

    let sql = `SELECT * FROM t_report_definitions WHERE rdf_is_active = TRUE AND rdf_deleted_at IS NULL`;
    const params = [];

    if (!isConfigurator) {
      sql += ` AND (rdf_is_public = TRUE OR rdf_created_by = $1)`;
      params.push(req.user.user_id);
    }

    sql += ` ORDER BY rdf_created_at DESC`;
    const result = await db.query(sql, params);

    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const createReport = async (req, res, next) => {
  try {
    const { name, description, query_config = {}, is_public = false } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Report name is required" });
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_");

    // Check duplicate slug
    const existing = await db.query(
      `SELECT rdf_id FROM t_report_definitions WHERE rdf_slug = $1 AND rdf_deleted_at IS NULL LIMIT 1`,
      [slug]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: `Report "${name}" already exists` });
    }

    const result = await db.query(
      `INSERT INTO t_report_definitions
         (rdf_name, rdf_slug, rdf_description, rdf_query_config, rdf_is_active, rdf_is_public, rdf_created_by, rdf_updated_by)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6, $6)
       RETURNING *`,
      [
        name.trim(), slug, description || null,
        JSON.stringify(query_config), is_public === true,
        req.user?.user_id
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, query_config, is_public, is_active } = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (name?.trim()) {
      setClauses.push(`rdf_name = $${idx++}`);
      values.push(name.trim());
      setClauses.push(`rdf_slug = $${idx++}`);
      values.push(name.toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_"));
    }
    if (description !== undefined) {
      setClauses.push(`rdf_description = $${idx++}`);
      values.push(description);
    }
    if (query_config !== undefined) {
      setClauses.push(`rdf_query_config = $${idx++}`);
      values.push(JSON.stringify(query_config));
    }
    if (is_public !== undefined) {
      setClauses.push(`rdf_is_public = $${idx++}`);
      values.push(is_public === true);
    }
    if (is_active !== undefined) {
      setClauses.push(`rdf_is_active = $${idx++}`);
      values.push(is_active === true);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    setClauses.push(`rdf_updated_by = $${idx++}`, `rdf_updated_at = NOW()`);
    values.push(req.user?.user_id);
    values.push(id);

    const result = await db.query(
      `UPDATE t_report_definitions SET ${setClauses.join(", ")}
       WHERE rdf_id = $${idx} AND rdf_deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE t_report_definitions
       SET rdf_deleted_at = NOW(), rdf_updated_by = $1, rdf_updated_at = NOW()
       WHERE rdf_id = $2 AND rdf_deleted_at IS NULL
       RETURNING rdf_name`,
      [req.user?.user_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    return res.status(200).json({ success: true, message: `Report "${result.rows[0].rdf_name}" deleted` });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// 2. QUERY BUILDER & EXECUTION ENGINE
// -------------------------------------------------------

const executeReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reportRes = await db.query(
      `SELECT * FROM t_report_definitions WHERE rdf_id = $1 AND rdf_is_active = TRUE AND rdf_deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (reportRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Report definition not found" });
    }

    const report = reportRes.rows[0];
    const config = report.rdf_query_config || {};

    let sql = config.sql_query || "";
    if (!sql) {
      return res.status(400).json({ success: false, message: "Query config has no valid query template" });
    }

    // Secure verification: Must strictly be a SELECT query
    const cleanedQuery = sql.trim();
    if (!/^SELECT\s+/i.test(cleanedQuery) || cleanedQuery.includes(";")) {
      return res.status(400).json({ success: false, message: "Security violation: Invalid query format" });
    }

    const result = await db.query(cleanedQuery);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Report query failed", error: err.message });
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reportRes = await db.query(
      `SELECT * FROM t_report_definitions WHERE rdf_id = $1 AND rdf_is_active = TRUE AND rdf_deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (reportRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const report = reportRes.rows[0];
    const config = report.rdf_query_config || {};
    const sql = config.sql_query || "";

    if (!sql || !/^SELECT\s+/i.test(sql.trim()) || sql.includes(";")) {
      return res.status(400).json({ success: false, message: "Invalid query template" });
    }

    const dataRes = await db.query(sql);
    const rows = dataRes.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(report.rdf_name);

    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      worksheet.columns = keys.map((k) => ({ header: k, key: k, width: 20 }));
      rows.forEach((row) => worksheet.addRow(row));
    } else {
      worksheet.addRow(["No data available"]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${report.rdf_slug}.xlsx`;

    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listReports,
  createReport,
  updateReport,
  deleteReport,
  executeReport,
  exportExcel,
};
