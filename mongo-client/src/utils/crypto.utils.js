import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

export const encrypt = (text) => {
  if (!text) return null;

  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);

  const key = CryptoJS.PBKDF2(SECRET_KEY, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  });

  const encrypted = CryptoJS.AES.encrypt(text.toString(), key, {
    iv,
  }).toString();

  return encodeURIComponent(`${salt.toString()}:${iv.toString()}:${encrypted}`);
};
