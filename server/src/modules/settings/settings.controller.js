// server/src/modules/settings/settings.controller.js
// ============================================================
// Controller for managing site settings (t_settings table)
// ============================================================

const db = require("../../config/db");

async function ensureSettingsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS t_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(200) UNIQUE NOT NULL,
        value TEXT,
        type VARCHAR(50) DEFAULT 'string',
        "group" VARCHAR(100) DEFAULT 'general',
        label VARCHAR(200),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Check if seeded
    const check = await db.query(`SELECT COUNT(*) AS count FROM t_settings`);
    if (parseInt(check.rows[0].count, 10) === 0) {
      const defaultSettings = [
        { key: 'site_name', value: 'TechCSR-CSR Product', type: 'string', group: 'general', label: 'Website Name', description: 'Name of the website shown in the title and header' },
        { key: 'site_description', value: 'TechCSR-CSR Product Web Application', type: 'string', group: 'general', label: 'Website Description', description: 'Meta description for the website' },
        { key: 'site_title', value: 'TechCSR-CSR Product', type: 'string', group: 'general', label: 'Website Title', description: 'Title shown on the browser tab' },
        { key: 'site_logo', value: '/techcsr/assets/logo/TechCSR Logo.png', type: 'image', group: 'general', label: 'Website Logo', description: 'Logo displayed in headers and login page' },
        { key: 'primary_color', value: '#15803d', type: 'color', group: 'theme', label: 'Primary Color', description: 'Primary theme color' },
        { key: 'secondary_color', value: '#659327', type: 'color', group: 'theme', label: 'Secondary Color', description: 'Secondary theme color (like sidebar hovers)' },
        { key: 'footer_text', value: '© 2026 TechCSR. All rights reserved.', type: 'string', group: 'general', label: 'Footer Text', description: 'Text shown in the page footer' },
        { key: 'support_email', value: 'support@techcsr.com', type: 'string', group: 'contact', label: 'Support Email', description: 'Support email address' },
        { key: 'support_phone', value: '+91 99999 99999', type: 'string', group: 'contact', label: 'Support Phone', description: 'Support contact number' },
        { key: 'allow_ngo_registration', value: 'true', type: 'boolean', group: 'onboarding', label: 'Allow NGO Registration', description: 'Show Register as NGO link on login page' },
        { key: 'skip_ngo_otp_verification', value: 'false', type: 'boolean', group: 'onboarding', label: 'Skip NGO Email OTP', description: 'Bypass OTP verification on NGO signup' },
        { key: 'ngo_register_left_title', value: 'NGO Partner Onboarding', type: 'string', group: 'onboarding', label: 'NGO Register Left Title', description: 'Left banner title on NGO registration' },
        { key: 'ngo_register_left_desc', value: '', type: 'string', group: 'onboarding', label: 'NGO Register Left Description', description: 'Left banner description paragraph on NGO registration' },
        { key: 'ngo_register_form_title', value: 'NGO Partner Registration', type: 'string', group: 'onboarding', label: 'NGO Register Form Title', description: 'Form title on NGO registration' },
        { key: 'ngo_register_form_sub', value: 'Fill in your organization details to begin partnership onboarding', type: 'string', group: 'onboarding', label: 'NGO Register Form Subtitle', description: 'Form subtitle on NGO registration' },
        { key: 'ngo_register_btn_text', value: 'REGISTER AS NGO PARTNER', type: 'string', group: 'onboarding', label: 'NGO Register Button Text', description: 'Button text on NGO registration' },
        { key: 'ngo_register_step1_text', value: 'Enter Darpan & contact credentials', type: 'string', group: 'onboarding', label: 'NGO Register Step 1 Label', description: 'Step 1 text on NGO registration' },
        { key: 'ngo_register_step2_text', value: 'Verify official email address', type: 'string', group: 'onboarding', label: 'NGO Register Step 2 Label', description: 'Step 2 text on NGO registration' },
        { key: 'ngo_register_step3_text', value: 'Manager review & credentials dispatch', type: 'string', group: 'onboarding', label: 'NGO Register Step 3 Label', description: 'Step 3 text on NGO registration' },
        { key: 'smtp_host', value: '', type: 'string', group: 'mail', label: 'SMTP Host', description: 'SMTP Host address (e.g. smtp.gmail.com)' },
        { key: 'smtp_port', value: '587', type: 'number', group: 'mail', label: 'SMTP Port', description: 'SMTP Port (e.g. 587 or 465)' },
        { key: 'smtp_user', value: '', type: 'string', group: 'mail', label: 'SMTP User', description: 'SMTP Account username / email' },
        { key: 'smtp_password', value: '', type: 'password', group: 'mail', label: 'SMTP Password', description: 'SMTP Account password / app password' },
        { key: 'smtp_from_name', value: 'TechCSR System', type: 'string', group: 'mail', label: 'SMTP From Name', description: 'Sender display name' },
        { key: 'smtp_from_address', value: '', type: 'string', group: 'mail', label: 'SMTP From Address', description: 'Sender email address' },
        { key: 'smtp_secure', value: 'false', type: 'boolean', group: 'mail', label: 'SMTP Secure SSL/TLS', description: 'Enable SSL/TLS' }
      ];

      for (const setting of defaultSettings) {
        await db.query(`
          INSERT INTO t_settings (key, value, type, "group", label, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (key) DO NOTHING
        `, [setting.key, setting.value, setting.type, setting.group, setting.label, setting.description]);
      }
      console.log("[Settings] Default settings seeded successfully.");
    }
  } catch (err) {
    console.error("[Settings] Error ensuring settings table:", err.message);
  }
}

// Get all settings as a key-value object and list
const getSettings = async (req, res, next) => {
  try {
    await ensureSettingsTable();
    const result = await db.query(`
      SELECT key, value, type, "group", label, description 
      FROM t_settings 
      ORDER BY id ASC
    `);

    const settingsObj = {};
    result.rows.forEach((row) => {
      settingsObj[row.key] = row.value || "";
    });

    return res.status(200).json({
      success: true,
      settings: settingsObj,
      raw: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// Update settings bulk or single
const updateSettings = async (req, res, next) => {
  try {
    await ensureSettingsTable();
    const updates = { ...req.body };

    // Process file uploads if present
    if (req.files) {
      if (req.files.site_logo && req.files.site_logo[0]) {
        updates.site_logo = `/api/v1/static/logo/${req.files.site_logo[0].filename}`;
      }
      if (req.files.favicon && req.files.favicon[0]) {
        updates.favicon = `/api/v1/static/logo/${req.files.favicon[0].filename}`;
      }
      if (req.files.login_bg_image && req.files.login_bg_image[0]) {
        updates.login_bg_image = `/api/v1/static/logo/${req.files.login_bg_image[0].filename}`;
      }
      if (req.files.login_left_image && req.files.login_left_image[0]) {
        updates.login_left_image = `/api/v1/static/logo/${req.files.login_left_image[0].filename}`;
      }
    }

    // Update settings
    for (const [key, value] of Object.entries(updates)) {
      const checkKey = await db.query(`SELECT id FROM t_settings WHERE key = $1`, [key]);
      if (checkKey.rows.length > 0) {
        await db.query(`
          UPDATE t_settings 
          SET value = $1, updated_at = NOW() 
          WHERE key = $2
        `, [value !== undefined ? String(value) : "", key]);
      } else {
        await db.query(`
          INSERT INTO t_settings (key, value, type, "group", label, description)
          VALUES ($1, $2, 'string', 'general', $1, '')
        `, [key, value !== undefined ? String(value) : ""]);
      }
    }

    // Fetch and return the updated settings list
    const result = await db.query(`
      SELECT key, value, type, "group", label, description 
      FROM t_settings 
      ORDER BY id ASC
    `);

    const settingsObj = {};
    result.rows.forEach((row) => {
      settingsObj[row.key] = row.value || "";
    });

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings: settingsObj,
      raw: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// Send Test Email using configured or passed settings
const testEmail = async (req, res, next) => {
  const nodemailer = require("nodemailer");
  try {
    const { recipient_email, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name, smtp_from_address, smtp_secure } = req.body;

    if (!recipient_email) {
      return res.status(400).json({ success: false, message: "Recipient email is required for testing." });
    }

    // Read current settings as fallback
    const dbRes = await db.query(`SELECT key, value FROM t_settings WHERE key LIKE 'smtp_%'`);
    const dbSettings = {};
    dbRes.rows.forEach((r) => { dbSettings[r.key] = r.value; });

    const cleanStr = (val) => (typeof val === "string" ? val.trim().replace(/^['"]|['"]$/g, "") : val || "");

    const host = cleanStr(smtp_host || dbSettings.smtp_host || process.env.SMTP_HOST);
    const port = Number(smtp_port || dbSettings.smtp_port || process.env.SMTP_PORT || 587);
    const user = cleanStr(smtp_user || dbSettings.smtp_user || process.env.SMTP_USER);
    const pass = cleanStr(smtp_password || dbSettings.smtp_password || process.env.SMTP_PASSWORD);
    const fromName = cleanStr(smtp_from_name || dbSettings.smtp_from_name || process.env.SMTP_FROM_NAME || "TechCSR");
    const fromAddr = cleanStr(smtp_from_address || dbSettings.smtp_from_address || process.env.SMTP_FROM_ADDRESS || user);
    const isSecure = smtp_secure === true || smtp_secure === "true" || port === 465;

    if (!host || !user) {
      return res.status(400).json({ success: false, message: "SMTP Host and Username are required to test email delivery." });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        ciphers: "SSLv3",
      },
      requireTLS: port === 587,
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: recipient_email,
      subject: "TechCSR - SMTP Test Email Delivery",
      text: "Hello! This is a test email from your TechCSR application confirming that your SMTP settings are configured properly.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
          <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 25px; border-radius: 8px; border-top: 4px solid #15803d;">
            <h2 style="color: #15803d; margin-top: 0;">✅ SMTP Connection Successful!</h2>
            <p style="color: #444; font-size: 14px;">Your mail server credentials have been validated successfully.</p>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px; color: #334155;">
              <div><strong>SMTP Host:</strong> ${host}</div>
              <div><strong>Port:</strong> ${port}</div>
              <div><strong>From Address:</strong> ${fromAddr}</div>
              <div><strong>Delivered to:</strong> ${recipient_email}</div>
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">Sent from TechCSR Configurator</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${recipient_email}! Message ID: ${info.messageId}`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `SMTP Connection / Delivery failed: ${err.message}`
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  testEmail,
  ensureSettingsTable,
};
