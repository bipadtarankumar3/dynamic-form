const { renderTemplate } = require("../templates/templateRenderer");
const JobQueue = require("../worker/jobQueue");

const emailQueue = new JobQueue("worker.js");

function sendLoginVerifyOTPEmail(user) {
  const html = renderTemplate("loginVerifyOTP", {
    name: user.name,
    otp: user.otp,
    year: new Date().getFullYear(),
  });
  emailQueue.addJob({
    type: "SEND_EMAIL",
    payload: {
      subject: "Login Verification OTP",
      from: process.env.SMTP_USER,
      to: user.email,
      html,
    },
  });
}

module.exports = { sendLoginVerifyOTPEmail };
