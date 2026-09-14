// server/src/rate-limit/publicFormRL.js
// ============================================================
// VAPT Rate Limiter for Public Forms & NGO Registration
// Limits submission rate to prevent brute-force / spam attacks.
// ============================================================

const rateLimit = require("express-rate-limit");

const publicFormRL = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 submissions per 15 minutes per IP address (VAPT compliance)
  message: {
    success: false,
    message: "Security Notice: Too many form submissions from your IP address. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { publicFormRL };
