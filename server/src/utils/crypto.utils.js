const CryptoJS = require("crypto-js");

const SECRET_KEY = process.env.PG_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

const decryptOrPlain = (token) => {
  if (token === undefined || token === null) return null;
  if (!isNaN(token)) return token.toString();

  try {
    const decoded = decodeURIComponent(token);
    const [saltHex, ivHex, cipherText] = decoded.split(":");

    const salt = CryptoJS.enc.Hex.parse(saltHex);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const key = CryptoJS.PBKDF2(SECRET_KEY, salt, {
      keySize: 256 / 32,
      iterations: 1000,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherText, key, { iv }).toString(
      CryptoJS.enc.Utf8
    );
    return decrypted || token.toString();
  } catch {
    return token.toString();
  }
};

module.exports = { decryptOrPlain };
