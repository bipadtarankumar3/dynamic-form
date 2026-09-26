// Receives key and current data object
const parseIfJSON = (key, data) => {
  if (!data || !(key in data)) return undefined;
  try {
    const value = data[key];
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return data[key]; // fallback to original value
  }
};

module.exports = parseIfJSON;
