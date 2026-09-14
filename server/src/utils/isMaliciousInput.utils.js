function isMaliciousInput(input) {
  if (!input || typeof input !== "string") return false;

  const lowerInput = input.toLowerCase();

  // 🚫 Dangerous SQL keywords (basic list)
  const sqlKeywords = [
    "select",
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "union",
    "--",
    ";",
    "/*",
    "*/",
    "xp_",
    "exec",
    "execute",
  ];

  // 🚫 Special characters that should raise suspicion in untrusted input
  const dangerousChars = ["'", '"', ";", "--", "`"];

  const hasKeyword = sqlKeywords.some((kw) => lowerInput.includes(kw));
  const hasSpecial = dangerousChars.some((ch) => input.includes(ch));

  return hasKeyword || hasSpecial;
}
module.exports = { isMaliciousInput };
