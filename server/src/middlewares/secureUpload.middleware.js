// secureUpload.middleware.js
const path = require("path");
const fileType = require("file-type");
const sanitizeHtml = require("sanitize-html");

// Allowed MIME types
const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml", // include this for SVG validation
];

// Allowed file extensions
const allowedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".svg",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILE_COUNT = 10;

const secureUpload = async (req, res, next) => {
  if (!req.files || !Array.isArray(req.files)) return next();

  if (req.files.length > MAX_FILE_COUNT) {
    return res.status(400).json({
      message: `❌ Too many files uploaded. Maximum allowed is ${MAX_FILE_COUNT}.`,
    });
  }

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase();

    // 1. Validate extension
    if (!allowedExtensions.includes(ext)) {
      return res
        .status(400)
        .json({ message: `❌ File type not allowed: ${file.originalname}` });
    }

    // 2. Validate size
    if (file.size > MAX_FILE_SIZE) {
      return res
        .status(400)
        .json({ message: `❌ File too large: ${file.originalname} (max 25MB)` });
    }

    // 3. Validate MIME using actual buffer
    const type = await fileType.fromBuffer(file.buffer);
    if (!type || !allowedMimeTypes.includes(type.mime)) {
      return res
        .status(400)
        .json({ message: `❌ Invalid file content: ${file.originalname}` });
    }

    // 4. Optional: Sanitize SVG content
    if (ext === ".svg" || type.mime === "image/svg+xml") {
      const dirty = file.buffer.toString("utf8");
      const clean = sanitizeHtml(dirty, {
        allowedTags: [
          "svg",
          "g",
          "path",
          "rect",
          "circle",
          "line",
          "polyline",
          "polygon",
          "text",
          "tspan",
          "defs",
          "style",
        ],
        allowedAttributes: {
          "*": [
            "fill",
            "stroke",
            "d",
            "x",
            "y",
            "width",
            "height",
            "cx",
            "cy",
            "r",
            "viewBox",
            "transform",
            "xmlns",
            "points",
            "x1",
            "x2",
            "y1",
            "y2",
          ],
        },
        allowedSchemes: [],
        allowVulnerableTags: true,
      });

      file.buffer = Buffer.from(clean, "utf8"); // Replace the buffer with sanitized content
    }
  }

  next();
};

module.exports = secureUpload;
