const { renderTemplate } = require("../templates/templateRenderer");
const JobQueue = require("../worker/jobQueue");

const emailQueue = new JobQueue("worker.js");

function sendUserProfileCreateEmail(user) {
  const html = renderTemplate("userProfileCreate", {
    name: user.name,
    email: user.email,
    password: user.password,
    year: new Date().getFullYear(),
  });
  emailQueue.addJob({
    type: "SEND_EMAIL",
    payload: {
      subject: "User Profile Created",
      from: process.env.SMTP_USER,
      to: user.email,
      html,
    },
  });
}

module.exports = { sendUserProfileCreateEmail };
