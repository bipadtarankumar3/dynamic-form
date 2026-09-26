const { renderTemplate } = require("../templates/templateRenderer");
const JobQueue = require("../worker/jobQueue");

const emailQueue = new JobQueue("worker.js");

function sendAppPatientSignupOTPEmail(user) {
  const html = renderTemplate("appPatientSignupOTP", {
    name: user.name,
    otp: user.otp,
    year: new Date().getFullYear(),
  });
  emailQueue.addJob({
    type: "SEND_EMAIL",
    payload: {
      subject: "Registration Verification OTP",
      from: process.env.SMTP_USER,
      to: user.email,
      html,
    },
  });
}

module.exports = { sendAppPatientSignupOTPEmail };
