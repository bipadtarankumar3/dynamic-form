const rateLimit = require("express-rate-limit");

const forgetPasswordLimiter = rateLimit({
  windowMs: 600 * 1000, 
  max: 10, 
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true, // send RateLimit-* headers
  legacyHeaders: false, // disable X-RateLimit-* headers
});

module.exports = { forgetPasswordLimiter };
