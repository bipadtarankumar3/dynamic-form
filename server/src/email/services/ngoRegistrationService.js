const { renderTemplate } = require("../templates/templateRenderer");
const emailSender = require("../emailSender");

async function sendNgoRegistrationOTPEmail({ email, person_name, organization_name, darpan_no, otp }) {
  try {
    const html = renderTemplate("ngoRegistrationOTP", {
      person_name: person_name || "Representative",
      organization_name: organization_name || "NGO Partner",
      darpan_no: darpan_no || "N/A",
      otp,
      year: new Date().getFullYear(),
    });

    await emailSender.sendMail({
      to: email,
      subject: `TechCSR - Verification OTP for ${organization_name || "NGO Registration"}`,
      html,
    });
  } catch (err) {
    console.error("[EmailService] Failed to send NGO Registration OTP email:", err.message);
  }
}

module.exports = { sendNgoRegistrationOTPEmail };
