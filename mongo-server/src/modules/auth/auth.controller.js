// mongo-server/src/modules/auth/auth.controller.js
const bcrypt = require("bcryptjs");
const { sign, verify } = require("jsonwebtoken");
const User = require("../../models/User.model");
const Token = require("../../models/Token.model");
const Otp = require("../../models/Otp.model");
const Role = require("../../models/Role.model");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = [
  { regex: /[a-z]/, msg: "Password must contain at least one lowercase letter" },
  { regex: /[A-Z]/, msg: "Password must contain at least one uppercase letter" },
  { regex: /\d/, msg: "Password must contain at least one number" },
  { regex: /[^A-Za-z0-9]/, msg: "Password must contain at least one special character" },
];

function badRequest(res, message, errors = {}) {
  return res.status(400).json({ success: false, message, errors });
}
function unauthorized(res, message) {
  return res.status(401).json({ success: false, message });
}

function generateToken(user, roleSlug, isConfigurator) {
  return sign(
    {
      user_id:        user._id,
      email:          user.email,
      role_slug:      roleSlug,
      isConfigurator: isConfigurator,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRY || "8h" }
  );
}

const authController = {

  // ================================================================
  // LOGIN — Two step: email+password → OTP → JWT
  // ================================================================
  login: async (req, res, next) => {
    try {
      const { email, password, type, token: otpToken, otp } = req.body;

      const emailTrim = email?.trim();
      if (!emailTrim) return badRequest(res, "Email is required", { email: "Email is required" });
      if (!EMAIL_REGEX.test(emailTrim)) return badRequest(res, "Invalid email format", { email: "Invalid email format" });

      const user = await User.findOne({ email: emailTrim.toLowerCase(), deleted_at: null })
        .populate("role_id", "name slug is_configurator");

      if (!user) return badRequest(res, "Invalid credentials", { access_error: "Invalid credentials" });

      // STEP 1 — email_verify
      if (type === "email_verify") {
        if (!password) return badRequest(res, "Password is required", { password: "Password is required" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return badRequest(res, "Invalid credentials", { access_error: "Invalid credentials" });

        if (!user.is_active) {
          return badRequest(res, "Account is inactive", { access_error: "Account is inactive" });
        }

        const otpValue = "123456"; // In production: use generateOtp()
        const expiry = new Date(Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60000);

        await Otp.deleteMany({ user_id: user._id, type: "login_verify" });
        await Otp.create({ user_id: user._id, email: user.email, type: "login_verify", value: otpValue, expires_at: expiry });

        const shortToken = sign(
          { user_id: user._id.toString(), email: user.email, type: "otp_verify" },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "10m" }
        );

        return res.status(200).json({
          success: true,
          type: "otp_verify",
          token: shortToken,
          message: "OTP sent to your registered email",
        });
      }

      // STEP 2 — otp_verify
      if (type === "otp_verify") {
        if (!otpToken || !otp) {
          return badRequest(res, "Token and OTP are required", { otp: "Token and OTP are required" });
        }

        let decoded;
        try {
          decoded = verify(otpToken, process.env.JWT_SECRET_KEY);
        } catch {
          return unauthorized(res, "Invalid or expired token");
        }

        if (decoded.type !== "otp_verify") {
          return unauthorized(res, "Invalid or expired token");
        }

        const otpRecord = await Otp.findOne({
          user_id: user._id,
          type: "login_verify",
          deleted_at: null,
          expires_at: { $gt: new Date() },
        });

        if (!otpRecord || otpRecord.value !== otp.trim()) {
          return badRequest(res, "Invalid or expired OTP", { otp: "Invalid or expired OTP" });
        }

        await Otp.deleteMany({ user_id: user._id, type: "login_verify" });

        const roleSlug = user.role_id?.slug || user.role_slug || "";
        const isConfigurator = Boolean(user.is_configurator || user.role_id?.is_configurator || roleSlug === "configurator" || roleSlug === "admin");

        const accessToken = generateToken(user, roleSlug, isConfigurator);

        await Token.create({ user_id: user._id, token: accessToken, name: "access_token" });
        await User.findByIdAndUpdate(user._id, { last_login_at: new Date() });

        return res.status(200).json({
          success: true,
          type: "login_success",
          message: "Login successful",
          token: accessToken,
          is_first_login: user.is_first_login || false,
          user: {
            user_id:        user._id,
            name:           user.name,
            email:          user.email,
            role_id:        user.role_id?._id,
            role_slug:      roleSlug,
            role_name:      user.role_id?.name || "",
            isConfigurator: isConfigurator,
          },
        });
      }

      return badRequest(res, "Invalid request type");
    } catch (error) {
      next(error);
    }
  },

  // ================================================================
  // LOGOUT — revoke token
  // ================================================================
  logout: async (req, res, next) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) return unauthorized(res, "Token not provided");

      await Token.findOneAndUpdate({ token }, { deleted_at: new Date() });
      return res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  },

  // ================================================================
  // FORGET PASSWORD — email_verify → otp_verify → reset_password
  // ================================================================
  forgetPassword: async (req, res, next) => {
    try {
      const { email, password, confirm_password, type, token, otp } = req.body;
      const emailTrim = email?.trim();
      if (!emailTrim) return badRequest(res, "Email is required", { email: "Email is required" });

      const user = await User.findOne({ email: emailTrim.toLowerCase(), deleted_at: null });
      const ENUM_SAFE_MSG = "If your account exists, a verification code has been sent to your email.";

      if (type === "email_verify") {
        if (user) {
          const otpValue = Math.floor(100000 + Math.random() * 900000).toString();
          const expiry = new Date(Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60000);
          await Otp.deleteMany({ user_id: user._id, type: "forget_password" });
          await Otp.create({ user_id: user._id, email: user.email, type: "forget_password", value: otpValue, expires_at: expiry });
        }

        const shortToken = sign(
          { user_id: user?._id?.toString(), email: emailTrim, type: "otp_verify" },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "10m" }
        );

        return res.status(200).json({ success: true, type: "otp_verify", token: shortToken, message: ENUM_SAFE_MSG });
      }

      if (!user) return badRequest(res, "Invalid or expired OTP.", { otp: "Invalid or expired OTP." });

      if (type === "otp_verify") {
        if (!token || !otp) return unauthorized(res, "Token and OTP are required");

        let decoded;
        try { decoded = verify(token, process.env.JWT_SECRET_KEY); }
        catch { return unauthorized(res, "Invalid or expired token"); }

        if (decoded.type !== "otp_verify") return unauthorized(res, "Invalid token type");

        const otpRecord = await Otp.findOne({ user_id: user._id, type: "forget_password", deleted_at: null });
        if (!otpRecord || otpRecord.value !== otp.trim() || new Date() > otpRecord.expires_at) {
          return badRequest(res, "Invalid or expired OTP.", { otp: "Invalid or expired OTP." });
        }

        await Otp.deleteMany({ user_id: user._id, type: "forget_password" });
        const resetToken = sign({ user_id: user._id.toString(), email: user.email, type: "reset_password" }, process.env.JWT_SECRET_KEY, { expiresIn: "10m" });

        return res.status(200).json({ success: true, type: "reset_password", token: resetToken, message: "OTP verified. You can now reset your password." });
      }

      if (type === "reset_password") {
        if (!token || !password || !confirm_password) return unauthorized(res, "Token, password, and confirm_password are required");

        let decoded;
        try { decoded = verify(token, process.env.JWT_SECRET_KEY); }
        catch { return unauthorized(res, "Invalid or expired token"); }

        if (decoded.type !== "reset_password") return unauthorized(res, "Invalid token type");

        if (password?.trim() !== confirm_password?.trim()) {
          return badRequest(res, "Passwords do not match", { confirm_password: "Passwords do not match" });
        }
        if (password.length < 6) return badRequest(res, "Weak password", { password: "Password must be at least 6 characters" });
        for (const rule of PASSWORD_RULES) {
          if (!rule.regex.test(password)) return badRequest(res, "Weak password", { password: rule.msg });
        }

        const hashed = await bcrypt.hash(password.trim(), 12);
        await User.findByIdAndUpdate(user._id, { password: hashed });

        return res.status(200).json({ success: true, message: "Password updated successfully" });
      }

      return badRequest(res, "Invalid request type");
    } catch (error) {
      next(error);
    }
  },

  // ================================================================
  // GET PROFILE
  // ================================================================
  getProfile: async (req, res, next) => {
    try {
      const user = await User.findOne({ _id: req.user.user_id, deleted_at: null })
        .populate("role_id", "name slug is_configurator");

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      return res.status(200).json({
        success: true,
        data: {
          user_id:        user._id,
          name:           user.name,
          email:          user.email,
          mobile:         user.mobile,
          employee_code:  user.employee_code,
          department:     user.department,
          designation:    user.designation,
          profile_pic:    user.profile_pic,
          last_login_at:  user.last_login_at,
          role: {
            id:             user.role_id?._id,
            name:           user.role_id?.name,
            slug:           user.role_id?.slug,
            isConfigurator: user.role_id?.is_configurator,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ================================================================
  // UPDATE PROFILE
  // ================================================================
  updateProfile: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { name, mobile, employee_code, department, designation } = req.body;

      if (name !== undefined && !name.trim()) {
        return badRequest(res, "Name cannot be empty", { name: "Name cannot be empty" });
      }

      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (mobile !== undefined) updates.mobile = mobile?.trim() || null;
      if (employee_code !== undefined) updates.employee_code = employee_code?.trim() || null;
      if (department !== undefined) updates.department = department?.trim() || null;
      if (designation !== undefined) updates.designation = designation?.trim() || null;

      const user = await User.findByIdAndUpdate(userId, updates, { new: true })
        .populate("role_id", "name slug is_configurator");

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user_id:        user._id,
          name:           user.name,
          email:          user.email,
          mobile:         user.mobile,
          employee_code:  user.employee_code,
          department:     user.department,
          designation:    user.designation,
          profile_pic:    user.profile_pic,
          role: { id: user.role_id?._id, name: user.role_id?.name, slug: user.role_id?.slug, isConfigurator: user.role_id?.is_configurator },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ================================================================
  // CHANGE PASSWORD
  // ================================================================
  changePassword: async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const { current_password, password, confirm_password } = req.body;

      if (!current_password) return badRequest(res, "Current password is required", { current_password: "Current password is required" });
      if (!password) return badRequest(res, "New password is required", { password: "New password is required" });
      if (confirm_password && password !== confirm_password) return badRequest(res, "Passwords do not match", { confirm_password: "Passwords do not match" });
      if (password.length < 6) return badRequest(res, "Password must be at least 6 characters", { password: "Password must be at least 6 characters" });

      for (const rule of PASSWORD_RULES) {
        if (!rule.regex.test(password)) return badRequest(res, "Weak password", { password: rule.msg });
      }

      const user = await User.findOne({ _id: userId, deleted_at: null });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) return badRequest(res, "The current password you entered is incorrect", { current_password: "The current password you entered is incorrect" });

      const hashed = await bcrypt.hash(password.trim(), 12);
      await User.findByIdAndUpdate(userId, { password: hashed });

      return res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;
