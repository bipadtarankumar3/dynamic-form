// server/src/notification/controllers/notification.controller.js
// ============================================================
// Notification controller using raw pg.
// Handles user in-app notifications and configurator configs.
// ============================================================

const db = require("../../config/db");

// -------------------------------------------------------
// 1. CONFIGURATOR CONFIGS CRUD (Configurator only)
// -------------------------------------------------------

const listConfigs = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM t_notification_cfgs WHERE deleted_at IS NULL ORDER BY event ASC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const createConfig = async (req, res, next) => {
  try {
    const { event, label, channels = [], recipients = [], email_template } = req.body;

    if (!event) {
      return res.status(400).json({ success: false, message: "Event key is required" });
    }

    const result = await db.query(
      `INSERT INTO t_notification_cfgs
         (event, label, channels, recipients, email_template, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $6)
       RETURNING *`,
      [
        event.trim(), label || null,
        JSON.stringify(channels), JSON.stringify(recipients),
        email_template || null, req.user?.user_id || null
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, channels, recipients, email_template, is_active } = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (label !== undefined)          { setClauses.push(`label = $${idx++}`);          values.push(label); }
    if (channels !== undefined)       { setClauses.push(`channels = $${idx++}`);       values.push(JSON.stringify(channels)); }
    if (recipients !== undefined)     { setClauses.push(`recipients = $${idx++}`);     values.push(JSON.stringify(recipients)); }
    if (email_template !== undefined) { setClauses.push(`email_template = $${idx++}`); values.push(email_template); }
    if (is_active !== undefined)      { setClauses.push(`is_active = $${idx++}`);      values.push(is_active === true); }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    values.push(req.user?.user_id || null);
    values.push(id);

    const result = await db.query(
      `UPDATE t_notification_cfgs SET ${setClauses.join(", ")}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Notification config not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE t_notification_cfgs
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING event`,
      [req.user?.user_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Notification config not found" });
    }

    return res.status(200).json({ success: true, message: `Notification config deleted successfully` });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------
// 2. USER IN-APP NOTIFICATIONS
// -------------------------------------------------------

const ACTIONABLE_EVENT_KEYS = [
  "form_approval_pending",
  "form_approval_resend",
  "form_approval_request_info",
];

const listUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id || req.user?.usr_id;
    if (!userId) {
      return res.status(200).json({
        success: true,
        message: "Notifications fetched successfully",
        data: []
      });
    }

    const result = await db.query(
      `SELECT *
       FROM t_notifications
       WHERE user_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [Number(userId)]
    );

    const formattedData = result.rows.map((row) => {
      const isActionable = ACTIONABLE_EVENT_KEYS.includes(row.event_key);
      const isInformatic = !isActionable && Boolean(
        row.is_deletable === true ||
        row.event_key === "form_approval_approved" ||
        row.event_key === "dd_submitted" ||
        row.status_flag === "APPROVED" ||
        row.type === "success" ||
        row.type === "backup" ||
        row.type === "info"
      );

      return {
        ...row,
        tntf_id: row.id,
        tntf_title: row.title || "Notification",
        tntf_message: row.message || "",
        tntf_type: row.type || "info",
        tntf_created_at: row.created_at,
        tntf_redirect_url: row.link || "/admin/ngo/rfp-assessment",
        tntf_is_read: row.is_read ?? false,
        tntf_is_deletable: isInformatic,
        tntf_is_informatic: isInformatic,
        tntf_status_flag: row.status_flag || (row.event_key === "form_approval_approved" ? "APPROVED" : null),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: formattedData
    });
  } catch (err) {
    console.error("[listUserNotifications] Error:", err);
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { ids = [] } = req.body || {};
    const userId = req.user?.id || req.user?.user_id || req.user?.usr_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Notification ids array is required" });
    }

    // Only informatic notifications can be manually marked as read via this endpoint.
    // Actionable notifications (pending approval, resend) can only be marked read by taking steps on the workflow.
    await db.query(
      `UPDATE t_notifications
       SET is_read = TRUE, updated_by = $1, updated_at = NOW()
       WHERE id = ANY($2)
         AND user_id = $1
         AND (event_key IS NULL OR event_key NOT IN ('form_approval_pending', 'form_approval_resend', 'form_approval_request_info'))`,
      [Number(userId), ids]
    );

    return res.status(200).json({ success: true, message: "Notifications marked as read" });
  } catch (err) {
    console.error("[markAsRead] Error:", err);
    next(err);
  }
};

const deleteUserNotifications = async (req, res, next) => {
  try {
    const { ids = [] } = req.body || {};
    const userId = req.user?.id || req.user?.user_id || req.user?.usr_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Notification ids array is required" });
    }

    // Only informatic / deletable notifications can be deleted.
    // Actionable workflow notifications cannot be deleted.
    await db.query(
      `UPDATE t_notifications
       SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = ANY($2)
         AND user_id = $1
         AND (event_key IS NULL OR event_key NOT IN ('form_approval_pending', 'form_approval_resend', 'form_approval_request_info'))
         AND (is_deletable = TRUE OR event_key = 'form_approval_approved' OR event_key = 'dd_submitted' OR status_flag = 'APPROVED')`,
      [Number(userId), ids]
    );

    return res.status(200).json({ success: true, message: "Notifications deleted successfully" });
  } catch (err) {
    console.error("[deleteUserNotifications] Error:", err);
    next(err);
  }
};

module.exports = {
  listConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  listUserNotifications,
  markAsRead,
  deleteUserNotifications,
};
