// server/src/modules/audit/controllers/audit.controller.js
// ============================================================
// Audit controller using raw pg.
// Handles loading audit logs for list tables and detail views.
// ============================================================

const db = require("../../../config/db");

const auditController = {
  /**
   * Datatable/pagination endpoint for audit logs.
   */
  auditLogDt: async (req, res, next) => {
    try {
      const { search = "", page = 1, limit = 50, filterParams = {} } = req.body;
      const offset = (Math.max(1, page) - 1) * parseInt(limit, 10);

      let whereClause = "1=1";
      const params = [];
      let idx = 1;

      // Filter by Date Range
      if (filterParams.date_range?.from_date && filterParams.date_range?.to_date) {
        whereClause += ` AND aud_created_at BETWEEN $${idx} AND $${idx + 1}`;
        params.push(new Date(filterParams.date_range.from_date), new Date(filterParams.date_range.to_date + " 23:59:59"));
        idx += 2;
      }

      // Filter by User
      if (filterParams.user_id) {
        whereClause += ` AND aud_user_id = $${idx}`;
        params.push(parseInt(filterParams.user_id, 10));
        idx++;
      }

      // Filter by Table Name
      if (filterParams.table_name) {
        whereClause += ` AND aud_table_name = $${idx}`;
        params.push(filterParams.table_name);
        idx++;
      }

      // Filter by Operation
      if (filterParams.operation_type) {
        whereClause += ` AND aud_action = $${idx}`;
        params.push(filterParams.operation_type);
        idx++;
      }

      // Search term (searches email, name, IP, table, action)
      if (search?.trim()) {
        whereClause += ` AND (
          aud_user_email ILIKE $${idx} OR
          aud_user_name ILIKE $${idx} OR
          aud_table_name ILIKE $${idx} OR
          aud_action ILIKE $${idx} OR
          aud_ip_address ILIKE $${idx}
        )`;
        params.push(`%${search.trim()}%`);
        idx++;
      }

      // Total count
      const countRes = await db.query(
        `SELECT COUNT(*) AS total FROM t_audit_logs WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0].total, 10);

      // Data query
      params.push(parseInt(limit, 10), offset);
      const dataRes = await db.query(
        `SELECT aud_id, aud_user_id, aud_user_email, aud_user_name, aud_role_slug,
                aud_action, aud_table_name, aud_record_id, aud_ip_address,
                aud_browser, aud_endpoint, aud_created_at
         FROM t_audit_logs
         WHERE ${whereClause}
         ORDER BY aud_created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        params
      );

      return res.status(200).json({
        success: true,
        data: dataRes.rows,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns old and new value json details for a log.
   */
  getAuditDetailsById: async (req, res, next) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: "id is required" });
      }

      const result = await db.query(
        `SELECT aud_id, aud_old_value, aud_new_value FROM t_audit_logs WHERE aud_id = $1 LIMIT 1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Audit details not found" });
      }

      return res.status(200).json({
        success: true,
        data: {
          old_value: result.rows[0].aud_old_value,
          new_value: result.rows[0].aud_new_value,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns list of database tables for log filtering.
   */
  getAllTableName: async (req, res, next) => {
    try {
      const result = await db.query(
        `SELECT DISTINCT aud_table_name FROM t_audit_logs
         WHERE aud_table_name IS NOT NULL
         ORDER BY aud_table_name ASC`
      );

      const tableOptions = result.rows.map((row) => ({
        label: row.aud_table_name,
        value: row.aud_table_name,
      }));

      return res.status(200).json({
        success: true,
        data: tableOptions,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns list of users who have log entries.
   */
  getAllUser: async (req, res, next) => {
    try {
      const result = await db.query(
        `SELECT usr_id, usr_name FROM t_users
         WHERE usr_deleted_at IS NULL
         ORDER BY usr_name ASC`
      );

      const userOptions = result.rows.map((row) => ({
        label: row.usr_name,
        value: row.usr_id,
      }));

      return res.status(200).json({
        success: true,
        data: userOptions,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = auditController;
