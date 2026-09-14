const { sequelize } = require("../config/db.config");

const SECRET_KEY =
  process.env.PG_ENCRYPTION_KEY ||
  "techcsr_default_encryption_secret_key_2026";

/**
 * Encrypts data on PostgreSQL database side using pgp_sym_encrypt via pgcrypto extension.
 */
async function encryptData(text) {
  if (text === null || text === undefined || text === "") return text;
  const str = String(text);
  // If already encrypted with pgcrypto, return as is
  if (str.startsWith("PGENC:")) return str;

  try {
    const [res] = await sequelize.query(
      `SELECT encode(pgp_sym_encrypt(CAST(:str AS text), :key), 'hex') AS encrypted`,
      {
        replacements: { str, key: SECRET_KEY },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (res && res.encrypted) {
      return `PGENC:${res.encrypted}`;
    }
    return str;
  } catch (err) {
    console.error("PostgreSQL pgcrypto encrypt error:", err.message);
    return str;
  }
}

/**
 * Decrypts hex encoded pgcrypto data on PostgreSQL database side using pgp_sym_decrypt.
 */
async function decryptData(text) {
  if (text === null || text === undefined || text === "") return text;
  let str = String(text);
  if (!str.startsWith("PGENC:")) return str;

  const hexPayload = str.slice(6);
  try {
    const [res] = await sequelize.query(
      `SELECT pgp_sym_decrypt(decode(:hexPayload, 'hex'), :key) AS decrypted`,
      {
        replacements: { hexPayload, key: SECRET_KEY },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (res && res.decrypted !== undefined) {
      return res.decrypted;
    }
    return str;
  } catch (err) {
    console.error("PostgreSQL pgcrypto decrypt error:", err.message);
    return str;
  }
}

/**
 * Applies visual masking based on field configuration (maskType).
 * 1. aadhaar / phone: Last 4 digits visible -> ********9012
 * 2. partial / email: First char show, 2nd char *, 3rd char show (or email b************@domain.com)
 * 3. full: All characters replaced with * -> ************
 */
async function applyMasking(value, maskType = "full") {
  if (value === null || value === undefined || value === "") return value;
  const decrypted = await decryptData(value);
  const str = String(decrypted);

  switch (maskType) {
    case "aadhaar":
    case "phone": {
      const visibleCount = 4;
      if (str.length <= visibleCount) return "*".repeat(str.length);
      return "*".repeat(str.length - visibleCount) + str.slice(-visibleCount);
    }
    case "partial":
    case "email": {
      const atIndex = str.indexOf("@");
      if (atIndex > 0) {
        const username = str.slice(0, atIndex);
        const domain = str.slice(atIndex);
        const maskedUser =
          username.length > 1
            ? username[0] + "*".repeat(username.length - 1)
            : "*";
        return maskedUser + domain;
      } else {
        // First digit/char show, 2nd digit *, 3rd digit show, etc.
        if (str.length <= 1) return str;
        return str
          .split("")
          .map((ch, idx) => (idx % 2 === 1 ? "*" : ch))
          .join("");
      }
    }
    case "full":
    default:
      return "*".repeat(str.length);
  }
}

module.exports = {
  encryptData,
  decryptData,
  applyMasking,
};
