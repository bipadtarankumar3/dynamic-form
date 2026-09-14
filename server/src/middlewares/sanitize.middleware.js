const sanitizeHtml = require("sanitize-html");

// Safe HTML configuration to allow Rich Text Editor formatting while preventing XSS
const safeHtmlOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "p", "a", "ul", "ol",
    "nl", "li", "b", "i", "strong", "em", "strike", "code", "hr", "br", "div",
    "table", "thead", "caption", "tbody", "tr", "th", "td", "pre", "span", "u", "s"
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    span: ["style", "class"],
    p: ["style", "class"],
    div: ["style", "class"],
    td: ["colspan", "rowspan", "style"],
    th: ["colspan", "rowspan", "style"],
  },
  allowedStyles: {
    "*": {
      "color": [/^#(0-9a-f]{3,6})$/i, /^rgb\(/, /^[a-z]+$/i],
      "background-color": [/^#(0-9a-f]{3,6})$/i, /^rgb\(/, /^[a-z]+$/i],
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
      "font-size": [/^\d+(px|em|rem|%)$/],
    },
  },
  disallowedTagsMode: "discard",
};

const sensitiveKeys = new Set([
  "password",
  "smtp_password",
  "old_password",
  "new_password",
  "confirm_password",
  "token",
  "access_token",
  "jwt_secret",
]);

const sanitizeData = (data, parentKey = "") => {
  if (sensitiveKeys.has(parentKey.toLowerCase())) {
    return data; // Preserve exact raw password characters & secrets without HTML entity mutation
  }
  if (typeof data === "string") {
    return sanitizeHtml(data, safeHtmlOptions); // Preserve safe rich text HTML tags
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, parentKey)); // Recursively sanitize arrays
  } else if (typeof data === "object" && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = sanitizeData(data[key], key); // Recursively sanitize objects
      return acc;
    }, {});
  }
  return data; // Return numbers, booleans, etc., as-is
};

const sanitizeMiddleware = (req, res, next) => {
  // Skip for this API
  if (req.originalUrl === "/api/v1/admin/blog/upsert") {
    return next();
  }
  if (req.body) req.body = sanitizeData(req.body);
  if (req.query) req.query = sanitizeData(req.query);
  if (req.params) req.params = sanitizeData(req.params);
  next();
};

module.exports = sanitizeMiddleware;
