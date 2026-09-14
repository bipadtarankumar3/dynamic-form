const fillMissingKeysWithNull = (data) => {
  if (Array.isArray(data)) {
    // Collect all keys from all objects in array
    const allKeys = data.reduce((keys, item) => {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        Object.keys(item).forEach((k) => keys.add(k));
      }
      return keys;
    }, new Set());

    return data.map((item) => {
      if (typeof item === "object" && item !== null) {
        const filled = fillMissingKeysWithNull(item);
        // Add missing keys as null
        for (const k of allKeys) {
          if (!(k in filled)) {
            filled[k] = null;
          }
        }
        return filled;
      }
      return item;
    });
  } else if (typeof data === "object" && data !== null) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === "string" && value.trim() === "") {
        acc[key] = null;
      } else {
        acc[key] = fillMissingKeysWithNull(value);
      }
      return acc;
    }, {});
  } else if (typeof data === "string" && data.trim() === "") {
    return null;
  }

  return data;
};

const fillMissingKeys = (req, res, next) => {
  if (req.body) req.body = fillMissingKeysWithNull(req.body);
  if (req.query) req.query = fillMissingKeysWithNull(req.query);
  if (req.params) req.params = fillMissingKeysWithNull(req.params);
  next();
};

module.exports = { fillMissingKeys, fillMissingKeysWithNull };
