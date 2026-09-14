const nodemailer = require("nodemailer");
require("dotenv").config();
class EmailSender {
  constructor(smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass) {
    this.smtpHost = smtpHost;
    this.smtpPort = smtpPort;
    this.smtpSecure = smtpSecure;
    this.smtpUser = smtpUser;
    this.smtpPass = smtpPass;
  }

  // Function to send email
  async sendMail(
    from,
    to,
    subject,
    text,
    html,
    cc = null,
    bcc = null,
    attachments = []
  ) {
    try {
      // Create a transporter using provided SMTP details
      const transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure, // Use SSL/TLS
        auth: {
          user: this.smtpUser, // SMTP User
          pass: this.smtpPass, // SMTP Password (or App Password)
        },
        tls: {
          rejectUnauthorized: false, // only for dev/testing
        },
      });

      // Email options with dynamic values
      const mailOptions = {
        from: from, // Dynamic sender address
        to: Array.isArray(to) ? to.join(", ") : to, // Dynamic recipient(s)
        subject: subject, // Dynamic subject
        text: text, // Dynamic plain text body
        html: html, // Dynamic HTML body
        ...(cc && { cc: Array.isArray(cc) ? cc.join(", ") : cc }), // Optional CC recipients
        ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(", ") : bcc }), // Dynamic BCC (optional)
        attachments: attachments, // Dynamic attachments (optional)
      };

      // Send email and log result
      const info = await transporter.sendMail(mailOptions);
      return info; // Return the email result for further handling
    } catch (error) {
      throw error; // Throw error to be handled by the caller
    }
  }
}

const emailSender = new EmailSender(
  process.env.SMTP_HOST, // SMTP Host
  process.env.SMTP_PORT, // SMTP Port
  true, // Secure (SSL/TLS)
  process.env.SMTP_USER, // SMTP User (Your Email)
  process.env.SMTP_PASSWORD // SMTP Password (or App Password)
);

module.exports = emailSender;

// Example attachments
// const exampleAttachments = [
//   {
//     filename: "text1.pdf",
//     content: "hello world!", // UTF-8 string as attachment
//   },
//   {
//     filename: "text2.txt",
//     content: new Buffer("hello world!", "utf-8"), // Binary buffer as attachment
//   },
// ];

// Sending an email using the class method
// emailSender
//   .sendMail(
//     '"ABC" <your-email@gmail.com>', // From
//     "recipient@example.com", // To (can be a single email or array)
//     "Work Log", // Subject
//     "Welcome To The ABC", // Text body
//     "<b>Welcome To The ABC</b>", // HTML body
//     exampleAttachments // Attachments
//   )
//   .then((result) => {
//     console.log("Email sent successfully:", result);
//   })
//   .catch((error) => {
//     console.error("Failed to send email:", error);
//   });
