// server/src/services/auditLogger.js
// ============================================================
// Audit Logger Service — Logs all database updates, creation,
// deletions, logins, logouts, and file exports into t_audit_logs.
// ============================================================

const db = require("../config/db");

/**
 * Logs a business action into the database audit log.
 * 
 * @param {Object} req - Express request object (to extract IP, user agent, user info)
 * @param {string} action - 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT'
 * @param {string} tableName - Target table name
 * @param {string|number} recordId - PK of affected row
 * @param {Object} oldValue - JSON object before edit (optional)
 * @param {Object} newValue - JSON object after edit (optional)
 */
async function logAction(req, action, tableName = null, recordId = null, oldValue = null, newValue = null) {
  try {
    const user = req?.user || {};
    const ip = req?.ip || req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress || "";
    const userAgent = req?.headers?.["user-agent"] || "";
    const endpoint = req?.originalUrl || req?.url || "";

    await db.query(
      `INSERT INTO t_audit_logs
         (aud_user_id, aud_user_email, aud_user_name, aud_role_slug,
          aud_action, aud_table_name, aud_record_id,
          aud_old_value, aud_new_value, aud_ip_address, aud_browser, aud_endpoint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        user.user_id || null,
        user.email || null,
        user.name || null,
        user.role_slug || null,
        action,
        tableName,
        recordId ? String(recordId) : null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ip,
        userAgent,
        endpoint
      ]
    );
  } catch (err) {
    console.error("[AuditLogger] Failed to write audit log:", err.message);
  }
}

module.exports = {
  logAction
};
