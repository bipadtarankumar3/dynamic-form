require("dotenv").config();

const fs = require("fs");
const path = require("path");
const winston = require("winston");
const moment = require("moment-timezone");

/* ==================================================
   CONFIG
================================================== */

const TIMEZONE = "Asia/Kolkata";
const LOG_RETENTION_DAYS = 30;
const ROTATION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 min

/* ==================================================
   ROOT PATH (PM2 / DOCKER SAFE)
================================================== */

const ROOT_DIR = process.cwd();

const LOGS_DIR = path.join(ROOT_DIR, "logs");
const ERROR_DIR = path.join(LOGS_DIR, "error");

/* ==================================================
   ENSURE DIRECTORIES
================================================== */

try {
  fs.mkdirSync(ERROR_DIR, { recursive: true });
  // console.log("📁 Error log directory ready:", ERROR_DIR);
} catch (err) {
  console.error("❌ Failed to create error log directory:", err);
}

/* ==================================================
   DATE HELPERS
================================================== */

function getCurrentDate() {
  return moment().tz(TIMEZONE).format("DD-MM-YYYY");
}

/* ==================================================
   LOGGER INSTANCE
================================================== */

let currentDateStr = getCurrentDate();
let currentFile = path.join(ERROR_DIR, `${currentDateStr}.log`);

function createFileTransport(filePath) {
  return new winston.transports.File({
    filename: filePath,
    level: "error",
  });
}

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [createFileTransport(currentFile)],
});

// Console logging (dev only)
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

/* ==================================================
   DAILY ROTATION
================================================== */

function rotateErrorLogsIfNeeded() {
  try {
    const newDateStr = getCurrentDate();

    if (newDateStr !== currentDateStr) {
      // console.log("🔄 Rotating error log file…");

      currentDateStr = newDateStr;
      currentFile = path.join(ERROR_DIR, `${currentDateStr}.log`);

      // Remove old file transports only
      logger.transports.forEach((t) => {
        if (t instanceof winston.transports.File) {
          logger.remove(t);
        }
      });

      // Add new transport
      logger.add(createFileTransport(currentFile));
    }
  } catch (err) {
    console.error("❌ Error log rotation failed:", err);
  }
}

// Check every minute
setInterval(rotateErrorLogsIfNeeded, ROTATION_CHECK_INTERVAL);

/* ==================================================
   LOG RETENTION CLEANUP
================================================== */

function cleanupOldErrorLogs() {
  try {
    const files = fs.readdirSync(ERROR_DIR);

    files.forEach((file) => {
      if (!file.endsWith(".log")) return;

      const filePath = path.join(ERROR_DIR, file);
      const stats = fs.statSync(filePath);

      const ageDays =
        (Date.now() - stats.mtimeMs) /
        (1000 * 60 * 60 * 24);

      if (ageDays > LOG_RETENTION_DAYS) {
        fs.unlinkSync(filePath);
        // console.log(`🗑️ Deleted old error log: ${file}`);
      }
    });
  } catch (err) {
    console.error("❌ Error log cleanup failed:", err);
  }
}

// Run once at startup
cleanupOldErrorLogs();

// Run daily
setInterval(cleanupOldErrorLogs, 24 * 60 * 60 * 1000);

/* ==================================================
   EXPRESS ERROR MIDDLEWARE
================================================== */

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;

  logger.error({
    message: err.message,
    statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    body: req.body,
    params: req.params,
    query: req.query,
  });

  const response =
    statusCode === 500
      ? {
          status: 0,
          message: "Internal server error",
          ...(process.env.DEBUG_MODE === "true" && {
            originalError: err.message,
          }),
        }
      : {
          status: 0,
          message: err.message,
        };

  res.status(statusCode).json(response);
};

/* ==================================================
   SHUTDOWN SAFETY
================================================== */

function shutdownHandler(signal) {
  // console.log(`\n⚠️ ${signal} received. Closing error logger…`);

  logger.end?.(() => {
    // console.log("📦 Error logger closed safely");
    process.exit(0);
  });
}

process.on("SIGINT", shutdownHandler);
process.on("SIGTERM", shutdownHandler);
process.on("SIGQUIT", shutdownHandler);

/* ==================================================
   UNCAUGHT ERROR LOGGING
================================================== */

process.on("uncaughtException", (err) => {
  logger.error({
    type: "uncaughtException",
    message: err.message,
    stack: err.stack,
  });

  // console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  logger.error({
    type: "unhandledRejection",
    message: reason?.message || reason,
  });

  // console.error("❌ Unhandled Rejection:", reason);
});

/* ==================================================
   EXPORT
================================================== */

module.exports = errorHandler;
