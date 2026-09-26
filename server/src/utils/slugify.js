function generateSlug(str = "") {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") // replace spaces & symbols with _
    .replace(/^_+|_+$/g, ""); // trim _ from start/end
}

module.exports = { generateSlug };
