function convert(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  // Handle "null" and empty string
  if (value === "null" || value === "") return null;

  // Convert boolean strings
  if (value === "true") return true;
  if (value === "false") return false;

  // Convert numbers
  if (!isNaN(value)) return Number(value);

  // Try JSON (arrays/objects)
  try {
    return JSON.parse(value);
  } catch (_) {}

  // Default: return raw string
  return value;
}
module.exports = { convert };
