const emailSender = require("../utils/sendMail.utils");

const jobs = JSON.parse(process.argv[2]); // array of email data

(async () => {
  try {
    for (const job of jobs) {
      await emailSender.sendMail(
        job.from,
        job.to,
        job.subject,
        job.text,
        job.html,
        job.cc,
        job.bcc,
        job.attachments
      );
    }
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
})();
