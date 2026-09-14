// app.js
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const moment = require("moment-timezone");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");

const { accessLogger } = require("./utils/accessLogger");
require("./config/db.config");

const router = require("./router");
const errorHandler = require("./middlewares/errorHandler.middleware");
const sanitizeMiddleware = require("./middlewares/sanitize.middleware");
const authMiddleware = require("./middlewares/auth.middleware");

const app = express();

// Disable X-Powered-By header
app.disable("x-powered-by");

// ------------------ Basic security headers ------------------
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Custom security headers
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'"); // clickjacking
  res.setHeader("X-Xss-Protection", "1;mode=block");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  next();
});

// ------------------ Header validation to mitigate request smuggling ------------------
// Must be very early in middleware chain (before body parsers)
// ------------------ Header validation to mitigate request smuggling ------------------
// Must be very early in middleware chain (before body parsers)
app.use((req, res, next) => {
  // Node lowercases header names
  const rawHeaders = req.rawHeaders || [];
  const headers = req.headers || {};

  // Only allow HTTP/1.1 and HTTP/2. Reject HTTP/1.0 — it lacks
  // Host header requirements and is a smuggling risk.
  const httpVersion = req.httpVersion;
  if (httpVersion !== "1.1" && httpVersion !== "2.0") {
    return res.status(400).json({
      success: false,
      message: "Bad Request: HTTP version not supported",
    });
  }

  // If both Transfer-Encoding and Content-Length present -> reject
  const hasCL = headers["content-length"] !== undefined;
  const hasTE = headers["transfer-encoding"] !== undefined;

  // Detect multiple Content-Length headers (node normally merges duplicates into string or array; check raw headers)
  let contentLengthCount = 0;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const name = rawHeaders[i];
    if (name && name.toLowerCase() === "content-length") contentLengthCount++;
  }

  if (hasCL && hasTE) {
    return res.status(400).json({
      success: false,
      message:
        "Bad Request: Conflicting Content-Length and Transfer-Encoding headers",
    });
  }

  if (contentLengthCount > 1) {
    return res.status(400).json({
      success: false,
      message: "Bad Request: Multiple Content-Length headers",
    });
  }

  // Reject ALL Transfer-Encoding at the app layer.
  // Node/Express already decodes chunked bodies before this runs.
  // Obfuscated values like "chunked, identity" or "Identity" bypass
  // the old whitelist check — rejecting TE entirely is the safe approach.
  if (hasTE) {
    return res.status(400).json({
      success: false,
      message: "Bad Request: Transfer-Encoding not accepted",
    });
  }

  // Reject suspicious large or impossible content length — matches body parser limit
  if (hasCL) {
    const clVal = Number(headers["content-length"]);
    if (!Number.isFinite(clVal) || clVal < 0 || clVal > 50 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Payload Too Large or Invalid Content-Length",
      });
    }
  }

  // Reject POST/PUT/PATCH with Content-Length: 0
  // This is a common smuggling carrier — a legitimate request never has
  // a body-expecting method with zero length.
  if (["PUT", "PATCH"].includes(req.method) && hasCL) {
    const clVal = Number(headers["content-length"]);
    if (clVal === 0) {
      return res.status(400).json({
        success: false,
        message: "Bad Request",
      });
    }
  }

  next();
});

// ------------------ Logging ------------------
app.use(accessLogger);

// ------------------ CORS (strict) ------------------
const allowedOrigins = [
  "http://10.250.4.15",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3003",
  "https://devreact.techcsr.com",
  "http://192.168.2.161:5014",
  "http://192.168.2.49:5014",
  "http://192.168.0.104:5014",
  "http://192.168.2.145:5014",
  "http://192.168.2.161:6003",
  "http://192.168.2.49:6003",
  "http://192.168.0.104:6003",
  "http://192.168.2.145:6003",
];
app.use(
  cors({
    origin: function (origin, cb) {
      // allow non-browser tools like curl (no origin)
      if (!origin) return cb(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ------------------ Host header validation ------------------
const allowedHosts = [
  "10.250.4.15",
  "localhost",
  "192.168.2.160",
  "192.168.2.159",
  "192.168.2.161",
  "10.122.111.49",
  "devreact.techcsr.com",
  "192.168.2.49",
  "192.168.0.104",
  "192.168.2.145",
];
app.use((req, res, next) => {
  const host = (
    req.headers["x-forwarded-host"] ||
    req.headers.host ||
    ""
  ).split(":")[0];
  if (!allowedHosts.includes(host)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Host Header" });
  }
  next();
});

// ------------------ Body parsers ------------------
app.use(express.json({ limit: "50mb" })); // built-in
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ------------------ Input sanitization ------------------
app.use(sanitizeMiddleware);

// ------------------ Static files ------------------
app.use(
  "/api/v1/static",
  express.static(path.join(__dirname, "../", "uploads")),
);

// ------------------ Protected routes ------------------
app.use("/api/v1/admin", authMiddleware.validateToken);

// ------------------ Application routes ------------------
router(app);

// ------------------ 404 handler ------------------
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "The requested resource was not found on this server.",
    path: req.originalUrl,
  });
});

// ------------------ Global error handler ------------------
app.use(errorHandler);

module.exports = app;
