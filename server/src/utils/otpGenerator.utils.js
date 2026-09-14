const crypto = require("crypto");

exports.generateOtp = () => {
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
};
