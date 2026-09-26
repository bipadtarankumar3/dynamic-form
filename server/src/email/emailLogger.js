// logger.js
const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json() 
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }),
    new transports.File({ filename: "src/email/logs/error.log", level: "error" }),
    new transports.File({ filename: "src/email/logs/success.log" , level: "info"}),
  ],
});

module.exports = logger;
