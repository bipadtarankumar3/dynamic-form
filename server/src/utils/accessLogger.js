const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const morgan = require("morgan");

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
const ACCESS_DIR = path.join(LOGS_DIR, "access");

/* ==================================================
   ENSURE DIRECTORIES
================================================== */

try {
  fs.mkdirSync(ACCESS_DIR, { recursive: true });
  // console.log("📁 Access log directory ready:", ACCESS_DIR);
} catch (err) {
  console.error("❌ Failed to create log directory:", err);
}

/* ==================================================
   STREAM MANAGEMENT
================================================== */

let currentDateStr = getCurrentDate();
let accessLogStream = createLogStream(currentDateStr);

/* ==================================================
   DATE HELPERS
================================================== */

function getCurrentDate() {
  return moment().tz(TIMEZONE).format("DD-MM-YYYY");
}

/* ==================================================
   CREATE LOG STREAM
================================================== */

function createLogStream(dateStr) {
  const filePath = path.join(ACCESS_DIR, `${dateStr}.log`);

  const stream = fs.createWriteStream(filePath, {
    flags: "a",
  });

  stream.on("error", (err) => {
    console.error("❌ Log stream error:", err.message);
  });

  return stream;
}

/* ==================================================
   DAILY ROTATION
================================================== */

function rotateLogsIfNeeded() {
  try {
    const newDateStr = getCurrentDate();

    if (newDateStr !== currentDateStr) {
      // console.log("🔄 Rotating access log file…");

      accessLogStream.end(() => {
        console.log("📦 Old log stream closed");
      });

      currentDateStr = newDateStr;
      accessLogStream = createLogStream(currentDateStr);
    }
  } catch (err) {
    console.error("❌ Log rotation error:", err);
  }
}

// Check every minute
setInterval(rotateLogsIfNeeded, ROTATION_CHECK_INTERVAL);

/* ==================================================
   LOG RETENTION CLEANUP
================================================== */

function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(ACCESS_DIR);

    files.forEach((file) => {
      if (!file.endsWith(".log")) return;

      const filePath = path.join(ACCESS_DIR, file);
      const stats = fs.statSync(filePath);

      const ageDays =
        (Date.now() - stats.mtimeMs) /
        (1000 * 60 * 60 * 24);

      if (ageDays > LOG_RETENTION_DAYS) {
        fs.unlinkSync(filePath);
        // console.log(`🗑️ Deleted old log: ${file}`);
      }
    });
  } catch (err) {
    console.error("❌ Log cleanup error:", err);
  }
}

// Run once on startup
cleanupOldLogs();

// Run daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

/* ==================================================
   MORGAN FORMAT
================================================== */

// IST timestamp token
morgan.token("local-time", () =>
  moment().tz(TIMEZONE).format("DD-MM-YYYY HH:mm:ss")
);

const logFormat =
  ':remote-addr - :remote-user [:local-time] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

/* ==================================================
   MORGAN LOGGER
================================================== */

const accessLogger = morgan(logFormat, {
  stream: {
    write: (message) => {
      accessLogStream.write(message);
    },
  },
});

/* ==================================================
   SHUTDOWN SAFETY
================================================== */

function shutdownHandler(signal) {
  // console.log(`\n⚠️ Received ${signal}. Closing log stream...`);

  accessLogStream.end(() => {
    // console.log("📦 Log stream closed safely");
    process.exit(0);
  });
}

// PM2 / Docker / K8s signals
process.on("SIGINT", shutdownHandler);
process.on("SIGTERM", shutdownHandler);
process.on("SIGQUIT", shutdownHandler);

/* ==================================================
   UNCAUGHT ERROR LOGGING
================================================== */

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

/* ==================================================
   EXPORT
================================================== */

module.exports = {
  accessLogger,
};
