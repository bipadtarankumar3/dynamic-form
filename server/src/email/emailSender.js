// emailSender.js
const nodemailer = require("nodemailer");
const logger = require("./emailLogger");
const db = require("../config/db");
require("dotenv").config();

class EmailSender {
  constructor() {
    this.transporter = null;
  }

  async getTransporter() {
    try {
      const dbRes = await db.query(`SELECT key, value FROM t_settings WHERE key LIKE 'smtp_%'`);
      const s = {};
      dbRes.rows.forEach((r) => { s[r.key] = r.value; });

      const cleanStr = (val) => (typeof val === "string" ? val.trim().replace(/^['"]|['"]$/g, "") : val || "");

      const host = cleanStr(s.smtp_host || process.env.SMTP_HOST);
      const port = Number(s.smtp_port || process.env.SMTP_PORT || 587);
      const user = cleanStr(s.smtp_user || process.env.SMTP_USER);
      const pass = cleanStr(s.smtp_password || process.env.SMTP_PASSWORD);
      const isSecure = s.smtp_secure === "true" || s.smtp_secure === true || port === 465;

      return {
        transporter: nodemailer.createTransport({
          host,
          port,
          secure: isSecure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false, ciphers: "SSLv3" },
          requireTLS: port === 587,
        }),
        fromName: cleanStr(s.smtp_from_name || process.env.SMTP_FROM_NAME || "TechCSR"),
        fromAddress: cleanStr(s.smtp_from_address || process.env.SMTP_FROM_ADDRESS || user),
      };
    } catch (e) {
      return {
        transporter: nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
          tls: { rejectUnauthorized: false, ciphers: "SSLv3" },
          requireTLS: Number(process.env.SMTP_PORT || 587) === 587,
        }),
        fromName: process.env.SMTP_FROM_NAME || "TechCSR",
        fromAddress: process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USER,
      };
    }
  }

  async sendMail({
    from,
    to,
    subject,
    text,
    template,
    variables,
    html,
    cc,
    bcc,
    attachments = [],
  }) {
    try {
      let finalHtml = html;

      if (template) {
        finalHtml = this.loadTemplate(template, variables);
      }

      const { transporter, fromName, fromAddress } = await this.getTransporter();

      const mailOptions = {
        from: from || `"${fromName}" <${fromAddress}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        text,
        html: finalHtml,
        ...(cc && { cc }),
        ...(bcc && { bcc }),
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`[EmailSender] Sent email to ${to} | subject: ${subject}`);
      return info;
    } catch (error) {
      logger.error(`[EmailSender] Error: %o`, error);
      throw error;
    }
  }
}

module.exports = new EmailSender();
