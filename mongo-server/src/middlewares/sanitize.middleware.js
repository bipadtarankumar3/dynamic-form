// mongo-server/src/middlewares/sanitize.middleware.js
const sanitizeHtml = require("sanitize-html");

const sanitizeValue = (val) => {
  if (typeof val === "string") {
    return sanitizeHtml(val, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "span"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["style", "class", "id"],
        img: ["src", "alt", "width", "height"],
        a: ["href", "name", "target"],
      },
    });
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val && typeof val === "object" && !(val instanceof Date)) {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      clean[k] = sanitizeValue(v);
    }
    return clean;
  }
  return val;
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
};

module.exports = sanitizeMiddleware;
