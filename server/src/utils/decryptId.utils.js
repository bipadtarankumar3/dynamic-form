const CryptoJS = require("crypto-js");
require("dotenv").config();

const isProbablyEncrypted = (str) => {
  try {
    const decoded = decodeURIComponent(str || "");
    return decoded.startsWith("U2FsdGVkX1");
  } catch {
    return false;
  }
};

const decryptId = (inputId) => {
  const id_secret_key = process.env.ID_SECRET_KEY;
  if (!id_secret_key || !inputId) return null;

  // If it's not encrypted, just return it as-is
  if (!isProbablyEncrypted(inputId)) {
    return inputId;
  }

  try {
    const decoded = decodeURIComponent(inputId);
    const bytes = CryptoJS.AES.decrypt(decoded, id_secret_key);
    const originalId = bytes.toString(CryptoJS.enc.Utf8);

    if (!originalId) throw new Error("Invalid decryption");
    return originalId;

  } catch (error) {
    return null; // or fallback to returning inputId if needed
  }
};

module.exports = { decryptId };
