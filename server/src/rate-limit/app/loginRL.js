const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // allow only 5 requests per minute per IP
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true, // send RateLimit-* headers
  legacyHeaders: false, // disable X-RateLimit-* headers
});

module.exports = { loginLimiter };
