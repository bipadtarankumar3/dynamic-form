const { renderTemplate } = require("../templates/templateRenderer");
const emailSender = require("../emailSender");

async function sendNgoProfileCreateEmail(user) {
  try {
    const html = renderTemplate("ngoProfileCreate", {
      name: user.name || user.organization_name || "NGO Partner",
      email: user.email,
      password: user.password,
      login_url: user.login_url || process.env.BASE_URL?.replace("/api/v1/static/", "") || "http://localhost:3003",
      year: new Date().getFullYear(),
    });

    await emailSender.sendMail({
      to: user.email,
      subject: `TechCSR - Your NGO Login Credentials`,
      html,
    });
    console.log(`[EmailService] Credentials email sent successfully to ${user.email}`);
  } catch (err) {
    console.error("[EmailService] Failed to send NGO credentials email:", err.message);
  }
}

module.exports = { sendNgoProfileCreateEmail };
