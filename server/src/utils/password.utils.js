const crypto = require("crypto");

class PasswordGenerator {
  // Method to generate a random password
  static generateRandomPassword() {
    const password = crypto
      .randomBytes(9)  // 9 bytes = 72 bits of entropy
      .toString("base64")  // Encodes to base64 (12 characters)
      .replace(/[+/=]/g, "_");  // Replace base64 special chars with '_'
    return password;
  }
}

module.exports = PasswordGenerator;
