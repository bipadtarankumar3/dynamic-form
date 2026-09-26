// server/src/services/notificationEngine.js
// ============================================================
// Notification Engine — Handles multi-channel dynamic dispatches
// (In-app, Email) based on Configurator event rules.
// ============================================================

const db = require("../config/db");
const emailSender = require("../utils/sendMail.utils");

/**
 * Interpolates template strings with keys from variables object.
 * e.g. "Hello {{name}}" + { name: "John" } -> "Hello John"
 */
function interpolate(template, data) {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Dispatch notification across configured channels for an event.
 * 
 * @param {string} eventKey - e.g. 'proposal_submitted', 'budget_approved'
 * @param {Object} data - Template replacement variables
 * @param {number[]} fallbackUserIds - Default user ids if no config/recipients match
 */
/**
 * Dispatch notification across configured channels for an event.
 * 
 * @param {string} eventKey - e.g. 'proposal_submitted', 'budget_approved'
 * @param {Object} data - Template replacement variables
 * @param {number[]} fallbackUserIds - Recipient user ids
 */
async function dispatch(eventKey, data = {}, fallbackUserIds = []) {
  try {
    const userIds = new Set(fallbackUserIds);

    // If recipients provided in data (array of user IDs or user:X / role:X strings)
    const extraRecipients = Array.isArray(data.recipients) ? data.recipients : [];
    for (const recipient of extraRecipients) {
      if (typeof recipient === "number") {
        userIds.add(recipient);
      } else if (typeof recipient === "string") {
        if (recipient.startsWith("user:")) {
          const uId = parseInt(recipient.split(":")[1], 10);
          if (uId) userIds.add(uId);
        } else if (recipient.startsWith("role:")) {
          const rSlug = recipient.split(":")[1];
          const roleUsers = await db.query(
            `SELECT id FROM t_users WHERE (role_slug = $1 OR slug = $1) AND is_active = TRUE AND deleted_at IS NULL`,
            [rSlug]
          );
          roleUsers.rows.forEach((row) => userIds.add(row.id));
        }
      }
    }

    const resolvedUserIds = Array.from(userIds);
    if (resolvedUserIds.length === 0) return;

    // Build notifications title and message
    const title = interpolate(data.title || `Notification: ${eventKey}`, data);
    const message = interpolate(data.message || "", data);

    // Always insert in-app notifications into t_notifications
    for (const uId of resolvedUserIds) {
      await db.query(
        `INSERT INTO t_notifications
           (user_id, title, message, type, link, is_read, event_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6, NOW(), NOW())`,
        [
          uId,
          title,
          message,
          data.type || "info",
          data.link || null,
          eventKey
        ]
      );
    }

    // Optional email dispatch if requested in data.channels
    if (Array.isArray(data.channels) && data.channels.includes("email")) {
      const emailsRes = await db.query(
        `SELECT email, name FROM t_users WHERE id = ANY($1) AND is_active = TRUE AND deleted_at IS NULL`,
        [resolvedUserIds]
      );

      for (const recipientUser of emailsRes.rows) {
        const emailBody = interpolate(data.email_template || message, { ...data, recipient_name: recipientUser.name });
        try {
          await emailSender.sendMail(
            process.env.SMTP_FROM_ADDRESS || "noreply@company.com",
            recipientUser.email,
            title,
            emailBody,
            `<div style="font-family: sans-serif;">${emailBody}</div>`
          );
        } catch (mailErr) {
          console.error(`[Notifications] Failed to send email to ${recipientUser.email}:`, mailErr.message);
        }
      }
    }
  } catch (err) {
    console.error("[Notifications] Dispatch error:", err.message);
  }
}

module.exports = {
  dispatch,
  interpolate,
};
