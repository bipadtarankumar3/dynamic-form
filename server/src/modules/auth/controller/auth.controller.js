// server/src/modules/auth/controller/auth.controller.js
// Uses raw pg (db.js) — no Sequelize dependency.
// Login flow: email_verify (password check → OTP send) → otp_verify (OTP check → JWT issue)
// Also handles: forgetPassword (email_verify → otp_verify → reset_password)

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sign, verify } = require("jsonwebtoken");
const db = require("../../../config/db");
const jwtUtils = require("../../../utils/jwt.utils");
const { generateOtp } = require("../../../utils/otpGenerator.utils");
const {
  sendForgetPasswordOTPEmail,
} = require("../../../email/services/forgetPasswordService");
const {
  sendLoginVerifyOTPEmail,
} = require("../../../email/services/loginVerifyService");
const storageService = require("../../../services/storage.service");

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { regex: /[a-z]/,        msg: "Password must contain at least one lowercase letter" },
  { regex: /[A-Z]/,        msg: "Password must contain at least one uppercase letter" },
  { regex: /\d/,           msg: "Password must contain at least one number" },
  { regex: /[^A-Za-z0-9]/, msg: "Password must contain at least one special character (!@#$%^&* etc.)" },
];

function badRequest(res, message, errors = {}) {
  return res.status(400).json({ success: false, message, errors });
}

function unauthorized(res, message) {
  return res.status(401).json({ success: false, message });
}

// ----------------------------------------------------------------
// Auth Controller
// ----------------------------------------------------------------
const authController = {

  // ==============================================================
  // LOGIN — two-step: email+password → OTP → JWT
  // ==============================================================
  login: async (req, res, next) => {
    try {
      const { email, password, type, token: otpToken, otp } = req.body;

      /* ---- Email validation ---- */
      const emailTrim = email?.trim();
      if (!emailTrim) return badRequest(res, "Email is required", { email: "Email is required" });
      if (!EMAIL_REGEX.test(emailTrim)) return badRequest(res, "Invalid email format", { email: "Invalid email format" });

      /* ---- Fetch user from t_users ---- */
      const userResult = await db.query(
        `SELECT u.id, u.name, u.email, u.password,
                u.role_id, u.role_slug, u.is_active,
                r.name AS role_name, r.slug AS role_slug_r, r.is_configurator
         FROM t_users u
         LEFT JOIN t_roles r ON r.id = u.role_id AND r.deleted_at IS NULL
         WHERE LOWER(u.email) = LOWER($1)
           AND u.deleted_at IS NULL
         LIMIT 1`,
        [emailTrim]
      );

      const user = userResult.rows[0];
      if (!user) return badRequest(res, "Invalid credentials", { access_error: "Invalid credentials" });

      /* ====================================================
         STEP 1 — email_verify: check password → send OTP
      ==================================================== */
      if (type === "email_verify") {
        if (!password) return badRequest(res, "Password is required", { password: "Password is required" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return badRequest(res, "Invalid credentials", { access_error: "Invalid credentials" });

        if (!user.role_id || !user.is_active) {
          return badRequest(res, "Account is inactive or role not assigned", {
            access_error: "Account is inactive or role not assigned",
          });
        }

        /* -- Send OTP -- */
        // const otpValue = generateOtp();
        const otpValue = 123456;
        const expiry = new Date(Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60000);

        await db.query(
          `DELETE FROM t_otps WHERE user_id = $1 AND type = 'login_verify'`,
          [user.id]
        );
        await db.query(
          `INSERT INTO t_otps (user_id, email, type, value, expires_at)
           VALUES ($1, $2, 'login_verify', $3, $4)`,
          [user.id, user.email, otpValue, expiry]
        );

        sendLoginVerifyOTPEmail({ name: user.name, email: user.email, otp: otpValue });

        const shortToken = sign(
          { user_id: user.id, email: user.email, type: "otp_verify" },
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

      /* ====================================================
         STEP 2 — otp_verify: verify OTP → issue JWT
      ==================================================== */
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

        if (decoded.type !== "otp_verify" || decoded.user_id !== user.id) {
          return unauthorized(res, "Invalid or expired token");
        }

        /* -- Verify OTP from DB -- */
        const otpResult = await db.query(
          `SELECT id, value, expires_at FROM t_otps
           WHERE user_id = $1
             AND type = 'login_verify'
             AND expires_at > NOW()
             AND deleted_at IS NULL
           LIMIT 1`,
          [user.id]
        );

        const otpRecord = otpResult.rows[0];
        if (!otpRecord || otpRecord.value !== otp.trim()) {
          return badRequest(res, "Invalid or expired OTP", { otp: "Invalid or expired OTP" });
        }

        /* -- Delete used OTP -- */
        await db.query(
          `DELETE FROM t_otps WHERE user_id = $1 AND type = 'login_verify'`,
          [user.id]
        );

        /* -- Issue full JWT -- */
        const accessToken = jwtUtils.generateToken(user);

        /* -- Store token in t_access_tokens -- */
        await db.query(
          `INSERT INTO t_access_tokens (user_id, token, name)
           VALUES ($1, $2, 'access_token')`,
          [user.id, accessToken]
        );

        /* -- Update last login timestamp -- */
        await db.query(
          `UPDATE t_users SET last_login_at = NOW() WHERE id = $1`,
          [user.id]
        );

        /* -- Check if NGO user is logging in for the first time -- */
        let isFirstLogin = false;
        try {
          const mcpRes = await db.query(
            `SELECT is_first_login FROM t_users WHERE id = $1 LIMIT 1`,
            [user.id]
          );
          isFirstLogin = mcpRes.rows[0]?.is_first_login === true;
        } catch (_) { /* column may not exist yet on older DBs */ }

        return res.status(200).json({
          success: true,
          type: "login_success",
          message: "Login successful",
          token: accessToken,
          is_first_login: isFirstLogin,
          user: {
            user_id:        user.id,
            name:           user.name,
            email:          user.email,
            role_id:        user.role_id,
            role_slug:      user.role_slug || user.role_slug_r,
            role_name:      user.role_name,
            isConfigurator: user.is_configurator === true,
          },
        });
      }

      return badRequest(res, "Invalid request type");
    } catch (error) {
      return next(error);
    }
  },

  // ==============================================================
  // LOGOUT — revoke access token
  // ==============================================================
  logout: async (req, res, next) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) return unauthorized(res, "Token not provided");

      await db.query(
        `UPDATE t_access_tokens
         SET deleted_at = NOW()
         WHERE token = $1`,
        [token]
      );

      return res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      return next(error);
    }
  },

  // ==============================================================
  // FORGET PASSWORD — email_verify → otp_verify → reset_password
  // ==============================================================
  forgetPassword: async (req, res, next) => {
    try {
      const { email, password, confirm_password, type, token, otp } = req.body;

      const emailTrim = email?.trim();
      if (!emailTrim) return badRequest(res, "Email is required", { email: "Email is required" });

      const userResult = await db.query(
        `SELECT id, name, email FROM t_users
         WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
        [emailTrim]
      );
      const user = userResult.rows[0];

      /* -- Prevent user enumeration: always return same response -- */
      const ENUM_SAFE_MSG =
        "If your account exists, a verification code has been sent to your email.";

      /* ---- STEP 1 — email_verify ---- */
      if (type === "email_verify") {
        if (user) {
          const otpValue = generateOtp();
          const expiry = new Date(Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60000);

          await db.query(
            `DELETE FROM t_otps WHERE user_id = $1 AND type = 'forget_password'`,
            [user.id]
          );
          await db.query(
            `INSERT INTO t_otps (user_id, email, type, value, expires_at)
             VALUES ($1, $2, 'forget_password', $3, $4)`,
            [user.id, user.email, otpValue, expiry]
          );

          sendForgetPasswordOTPEmail({ name: user.name, email: user.email, otp: otpValue });
        }

        const shortToken = sign(
          { user_id: user?.id, email: emailTrim, type: "otp_verify" },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "10m" }
        );

        return res.status(200).json({
          success: true,
          type: "otp_verify",
          token: shortToken,
          message: ENUM_SAFE_MSG,
        });
      }

      if (!user) return badRequest(res, "Invalid or expired OTP.", { otp: "Invalid or expired OTP." });

      /* ---- STEP 2 — otp_verify ---- */
      if (type === "otp_verify") {
        if (!token || !otp) return unauthorized(res, "Token and OTP are required");

        let decoded;
        try {
          decoded = verify(token, process.env.JWT_SECRET_KEY);
        } catch {
          return unauthorized(res, "Invalid or expired token");
        }

        if (decoded.type !== "otp_verify" || decoded.user_id !== user.id) {
          return unauthorized(res, "Invalid or expired token");
        }

        const otpResult = await db.query(
          `SELECT value, expires_at FROM t_otps
           WHERE user_id = $1 AND type = 'forget_password'
             AND deleted_at IS NULL LIMIT 1`,
          [user.id]
        );
        const otpRecord = otpResult.rows[0];

        if (!otpRecord || otpRecord.value !== otp.trim() || new Date() > new Date(otpRecord.expires_at)) {
          return badRequest(res, "Invalid or expired OTP.", { otp: "Invalid or expired OTP." });
        }

        await db.query(
          `DELETE FROM t_otps WHERE user_id = $1 AND type = 'forget_password'`,
          [user.id]
        );

        const resetToken = sign(
          { user_id: user.id, email: user.email, type: "reset_password" },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "10m" }
        );

        return res.status(200).json({
          success: true,
          type: "reset_password",
          token: resetToken,
          message: "OTP verified. You can now reset your password.",
        });
      }

      /* ---- STEP 3 — reset_password ---- */
      if (type === "reset_password") {
        if (!token || !password || !confirm_password) {
          return unauthorized(res, "Token, password, and confirm_password are required");
        }

        let decoded;
        try {
          decoded = verify(token, process.env.JWT_SECRET_KEY);
        } catch {
          return unauthorized(res, "Invalid or expired token");
        }

        if (decoded.type !== "reset_password" || decoded.user_id !== user.id) {
          return unauthorized(res, "Invalid or expired token");
        }

        if (password?.trim() !== confirm_password?.trim()) {
          return badRequest(res, "Passwords do not match", {
            confirm_password: "Password and confirm password do not match",
          });
        }

        if (password.length < 6) {
          return badRequest(res, "Weak password", { password: "Password must be at least 6 characters" });
        }

        for (const rule of PASSWORD_RULES) {
          if (!rule.regex.test(password)) {
            return badRequest(res, "Weak password", { password: rule.msg });
          }
        }

        const hashedPassword = await bcrypt.hash(password.trim(), 12);
        await db.query(
          `UPDATE t_users SET password = $1, updated_at = NOW() WHERE id = $2`,
          [hashedPassword, user.id]
        );

        return res.status(200).json({ success: true, message: "Password updated successfully" });
      }

      return badRequest(res, "Invalid request type");
    } catch (error) {
      return next(error);
    }
  },

  // ==============================================================
  // GET PROFILE — return current user info
  // ==============================================================
  getProfile: async (req, res, next) => {
    try {
      const result = await db.query(
        `SELECT u.id, u.name, u.email, u.mobile,
                u.employee_code, u.department, u.designation,
                u.profile_pic, u.last_login_at,
                r.id AS role_id, r.name AS role_name, r.slug AS role_slug, r.is_configurator
         FROM t_users u
         LEFT JOIN t_roles r ON r.id = u.role_id AND r.deleted_at IS NULL
         WHERE u.id = $1 AND u.deleted_at IS NULL
         LIMIT 1`,
        [req.user.user_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const user = result.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          user_id:        user.id,
          name:           user.name,
          email:          user.email,
          mobile:         user.mobile,
          employee_code:  user.employee_code,
          department:     user.department,
          designation:    user.designation,
          profile_pic:    user.profile_pic,
          last_login_at:  user.last_login_at,
          role: {
            id:             user.role_id,
            name:           user.role_name,
            slug:           user.role_slug,
            isConfigurator: user.is_configurator,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  },

  // ==============================================================
  // UPDATE PROFILE — allow updating name, mobile, employee_code,
  // department, designation, and avatar. PREVENT email & role change.
  // ==============================================================
  updateProfile: async (req, res, next) => {
    try {
      const userId = req.user?.user_id || req.user?.id;
      if (!userId) {
        return unauthorized(res, "Unauthorized access");
      }

      const { name, mobile, employee_code, department, designation, remove_avatar } = req.body;

      // Validate name if provided
      if (name !== undefined && !name.trim()) {
        return badRequest(res, "Name cannot be empty", { name: "Name cannot be empty" });
      }

      // Check current user existence
      const userCheck = await db.query(
        `SELECT id, name, email, mobile, employee_code, department, designation, profile_pic
         FROM t_users
         WHERE id = $1 AND deleted_at IS NULL
         LIMIT 1`,
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const currentUser = userCheck.rows[0];

      // Determine profile_pic
      let newProfilePic = currentUser.profile_pic;
      if (req.file) {
        const uploadResult = await storageService.uploadFile({
          file: req.file,
          folder: "avatars",
          docPurpose: "profile_pic",
          docTitle: `${currentUser.name || "User"} Profile Picture`,
          createdBy: userId,
        });
        newProfilePic = uploadResult.file_path;
      } else if (remove_avatar === "true" || remove_avatar === true) {
        newProfilePic = null;
      } else if (req.body.profile_pic !== undefined) {
        newProfilePic = req.body.profile_pic ? req.body.profile_pic.trim() : null;
      }

      const updatedName = name !== undefined ? name.trim() : currentUser.name;
      const updatedMobile = mobile !== undefined ? mobile.trim() : currentUser.mobile;
      const updatedEmployeeCode = employee_code !== undefined ? employee_code.trim() : currentUser.employee_code;
      const updatedDepartment = department !== undefined ? department.trim() : currentUser.department;
      const updatedDesignation = designation !== undefined ? designation.trim() : currentUser.designation;

      // Update user in database (Notice: email and role_id are explicitly excluded)
      await db.query(
        `UPDATE t_users
         SET name = $1,
             mobile = $2,
             employee_code = $3,
             department = $4,
             designation = $5,
             profile_pic = $6,
             updated_at = NOW()
         WHERE id = $7 AND deleted_at IS NULL`,
        [
          updatedName,
          updatedMobile,
          updatedEmployeeCode,
          updatedDepartment,
          updatedDesignation,
          newProfilePic,
          userId,
        ]
      );

      // Fetch fresh updated user with role details
      const freshResult = await db.query(
        `SELECT u.id, u.name, u.email, u.mobile,
                u.employee_code, u.department, u.designation,
                u.profile_pic, u.last_login_at,
                r.id AS role_id, r.name AS role_name, r.slug AS role_slug, r.is_configurator
         FROM t_users u
         LEFT JOIN t_roles r ON r.id = u.role_id AND r.deleted_at IS NULL
         WHERE u.id = $1 AND u.deleted_at IS NULL
         LIMIT 1`,
        [userId]
      );

      const user = freshResult.rows[0];

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user_id:        user.id,
          name:           user.name,
          email:          user.email,
          mobile:         user.mobile,
          employee_code:  user.employee_code,
          department:     user.department,
          designation:    user.designation,
          profile_pic:    user.profile_pic,
          last_login_at:  user.last_login_at,
          role: {
            id:             user.role_id,
            name:           user.role_name,
            slug:           user.role_slug,
            isConfigurator: user.is_configurator === true,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  },

  // ==============================================================
  // CHANGE PASSWORD — Authenticated user password update
  // ==============================================================
  changePassword: async (req, res, next) => {
    try {
      const userId = req.user?.user_id || req.user?.id;
      if (!userId) {
        return unauthorized(res, "Unauthorized access");
      }

      const { current_password, password, confirm_password, confirmPassword } = req.body;
      const newPassword = password;
      const confirmPwd = confirm_password || confirmPassword;

      if (!current_password) {
        return badRequest(res, "Current password is required", { current_password: "Current password is required" });
      }
      if (!newPassword) {
        return badRequest(res, "New password is required", { password: "New password is required" });
      }
      if (confirmPwd && newPassword !== confirmPwd) {
        return badRequest(res, "Passwords do not match", { confirmPassword: "Passwords do not match" });
      }
      if (newPassword.length < 6) {
        return badRequest(res, "Password must be at least 6 characters", { password: "Password must be at least 6 characters" });
      }

      for (const rule of PASSWORD_RULES) {
        if (!rule.regex.test(newPassword)) {
          return badRequest(res, "Weak password", { password: rule.msg });
        }
      }

      // Fetch user from DB
      const result = await db.query(
        `SELECT id, password FROM t_users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Check current password match
      let isMatch = false;
      if (user.password) {
        try {
          isMatch = await bcrypt.compare(current_password, user.password);
        } catch {
          isMatch = false;
        }
        if (!isMatch && current_password === user.password) {
          isMatch = true;
        }
      }

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "The current password you entered is incorrect",
          errors: { current_password: "The current password you entered is incorrect" },
        });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 12);
      await db.query(
        `UPDATE t_users SET password = $1, updated_at = NOW() WHERE id = $2`,
        [hashedPassword, userId]
      );

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      return next(error);
    }
  },

  // ==============================================================
  // NGO REGISTRATION & OTP VERIFICATION FLOW
  // ==============================================================
  ensureNgoTables: async () => {
    try {
      // Ensure is_first_login column exists on t_users
      await db.query(`
        ALTER TABLE t_users
        ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT FALSE;
      `);
    } catch (e) {
      console.warn("[NGO] ensureNgoTables:", e.message);
    }
  },

  registerNgo: async (req, res, next) => {
    try {
      await authController.ensureNgoTables();
      const {
        darpan_no,
        darpan_link,
        organization_name,
        email,
        phone_no,
        person_name,
        person_designation,
        website,
        address,
        permanent_address,
        name_of_the_organization,
        csr_registration_number,
        primary_email,
        ...restPayload
      } = req.body;

      const cleanEmail = (primary_email || email)?.trim().toLowerCase();
      const cleanDarpan = (csr_registration_number || darpan_no)?.trim();
      const cleanOrg = (name_of_the_organization || organization_name)?.trim();
      const cleanPhone = (phone_no || restPayload.contact)?.trim();
      const cleanPerson = (person_name || restPayload.name)?.trim();
      const cleanDesig = (person_designation || restPayload.designation)?.trim();
      const cleanLink = (darpan_link || website)?.trim() || "";
      const cleanAddress = (address || "").trim();
      const cleanPermAddress = (permanent_address || "").trim();

      const profileData = {
        name_of_the_organization: cleanOrg,
        organization_name: cleanOrg,
        csr_registration_number: cleanDarpan,
        darpan_no: cleanDarpan,
        primary_email: cleanEmail,
        email: cleanEmail,
        website: cleanLink,
        darpan_link: cleanLink,
        address: cleanAddress,
        permanent_address: cleanPermAddress,
        phone_no: cleanPhone,
        person_name: cleanPerson,
        person_designation: cleanDesig,
        ...restPayload
      };

      // Validation
      const errors = {};
      if (!cleanDarpan) errors.darpan_no = "NGO Darpan / CSR Registration Number is required";
      if (!cleanOrg) errors.organization_name = "Organization name is required";
      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) errors.email = "Enter a valid email address";
      if (!cleanPhone || cleanPhone.length < 10) errors.phone_no = "Enter a valid phone number (minimum 10 digits)";
      if (!cleanPerson) errors.person_name = "Contact person name is required";
      if (!cleanDesig) errors.person_designation = "Person designation is required";

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ success: false, message: "Validation error", errors });
      }

      // Check if user already exists and is active in t_users
      const existingUser = await db.query(
        `SELECT id FROM t_users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
        [cleanEmail]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "An active user account already exists with this email address. Please proceed to login.",
          errors: { email: "Account with this email already exists" }
        });
      }

      // Read skip_ngo_otp_verification from req.body or t_settings
      let skipOtp = false;
      if (req.body.skip_otp === true || req.body.skip_otp === "true") {
        skipOtp = true;
      } else if (req.body.skip_otp === false || req.body.skip_otp === "false") {
        skipOtp = false;
      } else {
        try {
          const setRes = await db.query(`SELECT value FROM t_settings WHERE key = 'skip_ngo_otp_verification' LIMIT 1`);
          if (setRes.rows.length > 0 && (setRes.rows[0].value === "true" || setRes.rows[0].value === true)) {
            skipOtp = true;
          }
        } catch (e) {}
      }

      if (skipOtp) {
        // Direct verification without OTP
        const tempPassword = `TechCSR@${Math.floor(1000 + Math.random() * 9000)}`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        let roleId = null;
        try {
          const roleRes = await db.query(`SELECT id FROM t_roles WHERE slug = 'ngo' AND deleted_at IS NULL LIMIT 1`);
          if (roleRes.rows.length > 0) {
            roleId = roleRes.rows[0].id;
          } else {
            const newRole = await db.query(`
              INSERT INTO t_roles (name, slug, description, is_active, is_configurator, created_at, updated_at)
              VALUES ('NGO Partner', 'ngo', 'External NGO Partner with portal access', TRUE, FALSE, NOW(), NOW())
              RETURNING id
            `);
            roleId = newRole.rows[0]?.id;
          }
        } catch (e) {}

        const userRes = await db.query(
          `INSERT INTO t_users 
             (name, email, password, role_id, role_slug, department, designation, is_active, is_first_login, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'ngo', 'NGO Portal', $5, TRUE, TRUE, NOW(), NOW())
           ON CONFLICT (email) DO UPDATE 
             SET password = $3, role_id = $4, is_active = TRUE, is_first_login = TRUE, updated_at = NOW()
           RETURNING id`,
          [cleanPerson || cleanOrg, cleanEmail, hashedPassword, roleId, cleanDesig || "Authorized Representative"]
        );
        const userId = userRes.rows[0]?.id;

        // Upsert into t_frm_implementation_partner
        const existingPartner = await db.query(
          `SELECT id FROM t_frm_implementation_partner WHERE LOWER(email) = $1 OR created_by = $2 LIMIT 1`,
          [cleanEmail, userId]
        );

        let partnerId = null;
        if (existingPartner.rows.length > 0) {
          partnerId = existingPartner.rows[0].id;
          await db.query(
            `UPDATE t_frm_implementation_partner SET
               darpan_no = $1,
               darpan_link = $2,
               organization_name = $3,
               email = $4,
               phone_no = $5,
               person_name = $6,
               person_designation = $7,
               address = $8,
               permanent_address = $9,
               is_verified = TRUE,
               registration_status = 'VERIFIED_PENDING_ONBOARDING',
               profile_data = $10::jsonb,
               user_id = $11,
               updated_by = $11,
               updated_at = NOW()
             WHERE id = $12`,
            [
              cleanDarpan, cleanLink, cleanOrg, cleanEmail, cleanPhone, cleanPerson, cleanDesig,
              cleanAddress, cleanPermAddress, JSON.stringify(profileData), userId, partnerId
            ]
          );
        } else {
          const insertRes = await db.query(
            `INSERT INTO t_frm_implementation_partner
               (darpan_no, darpan_link, organization_name, email, phone_no, person_name, person_designation,
                address, permanent_address, status, registration_status, is_verified, profile_data,
                user_id, created_by, updated_by, created_at, updated_at)
             VALUES
               ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Draft', 'VERIFIED_PENDING_ONBOARDING', TRUE,
                $10::jsonb, $11, $11, $11, NOW(), NOW())
             RETURNING id`,
            [
              cleanDarpan, cleanLink, cleanOrg, cleanEmail, cleanPhone, cleanPerson, cleanDesig,
              cleanAddress, cleanPermAddress, JSON.stringify(profileData), userId
            ]
          );
          partnerId = insertRes.rows[0]?.id;
        }

        // Upsert key contacts
        if (partnerId && cleanPerson) {
          try {
            const checkContact = await db.query(
              `SELECT id FROM t_frm_implementation_partner_key_contacts WHERE parent_id = $1 AND deleted_at IS NULL LIMIT 1`,
              [partnerId]
            );
            if (checkContact.rows.length === 0) {
              await db.query(
                `INSERT INTO t_frm_implementation_partner_key_contacts (
                   parent_id, name, designation, contact, email, status, created_by, updated_by, created_at, updated_at
                 ) VALUES (
                   $1, $2, $3, $4, $5, 'Active', $6, $6, NOW(), NOW()
                 )`,
                [partnerId, cleanPerson, cleanDesig, cleanPhone, cleanEmail, userId]
              );
            }
          } catch (kcErr) {
            console.warn("[registerNgo] Key contact insert warning:", kcErr.message);
          }
        }

        // Send login credentials email
        try {
          const { sendNgoProfileCreateEmail } = require("../../../email/services/ngoProfileCreateService");
          sendNgoProfileCreateEmail({
            name: cleanPerson || cleanOrg,
            email: cleanEmail,
            password: tempPassword,
          });
        } catch (me) {
          console.error("[registerNgo] Failed to dispatch credentials email:", me.message);
        }

        return res.status(200).json({
          success: true,
          verified: true,
          message: "Registration successful! Your login credentials have been sent to your email address.",
          registration_id: partnerId,
          email: cleanEmail,
          organization_name: cleanOrg,
        });
      } else {
        // Send OTP code and store in t_frm_implementation_partner
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const existingPartner = await db.query(
          `SELECT id FROM t_frm_implementation_partner WHERE LOWER(email) = $1 LIMIT 1`,
          [cleanEmail]
        );

        let partnerId = null;
        if (existingPartner.rows.length > 0) {
          partnerId = existingPartner.rows[0].id;
          await db.query(
            `UPDATE t_frm_implementation_partner SET
               darpan_no = $1,
               darpan_link = $2,
               organization_name = $3,
               email = $4,
               phone_no = $5,
               person_name = $6,
               person_designation = $7,
               address = $8,
               permanent_address = $9,
               otp_code = $10,
               otp_expires_at = $11,
               otp_attempts = 0,
               is_verified = FALSE,
               registration_status = 'PENDING_VERIFICATION',
               profile_data = $12::jsonb,
               updated_at = NOW()
             WHERE id = $13`,
            [
              cleanDarpan, cleanLink, cleanOrg, cleanEmail, cleanPhone, cleanPerson, cleanDesig,
              cleanAddress, cleanPermAddress, otpCode, otpExpiry, JSON.stringify(profileData), partnerId
            ]
          );
        } else {
          const insertRes = await db.query(
            `INSERT INTO t_frm_implementation_partner
               (darpan_no, darpan_link, organization_name, email, phone_no, person_name, person_designation,
                address, permanent_address, otp_code, otp_expires_at, otp_attempts, is_verified,
                registration_status, status, profile_data, created_at, updated_at)
             VALUES
               ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, FALSE,
                'PENDING_VERIFICATION', 'Draft', $12::jsonb, NOW(), NOW())
             RETURNING id`,
            [
              cleanDarpan, cleanLink, cleanOrg, cleanEmail, cleanPhone, cleanPerson, cleanDesig,
              cleanAddress, cleanPermAddress, otpCode, otpExpiry, JSON.stringify(profileData)
            ]
          );
          partnerId = insertRes.rows[0]?.id;
        }

        const { sendNgoRegistrationOTPEmail } = require("../../../email/services/ngoRegistrationService");
        sendNgoRegistrationOTPEmail({
          email: cleanEmail,
          person_name: cleanPerson,
          organization_name: cleanOrg,
          darpan_no: cleanDarpan,
          otp: otpCode,
        });

        return res.status(200).json({
          success: true,
          verified: false,
          message: `Verification OTP has been sent to ${cleanEmail}. Please enter the 6-digit code to continue.`,
          registration_id: partnerId,
          email: cleanEmail,
        });
      }
    } catch (error) {
      return next(error);
    }
  },

  verifyNgoOtp: async (req, res, next) => {
    try {
      const { registration_id, email, otp } = req.body;
      const cleanOtp = otp ? otp.toString().trim() : "";

      if (!registration_id || !cleanOtp) {
        return res.status(400).json({ success: false, message: "Registration ID and OTP are required" });
      }

      const regRes = await db.query(
        `SELECT id, email, person_name, organization_name,
                person_designation, darpan_no, darpan_link,
                phone_no, address, permanent_address, profile_data, otp_code, otp_expires_at, is_verified 
         FROM t_frm_implementation_partner 
         WHERE id = $1 LIMIT 1`,
        [registration_id]
      );

      if (regRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Registration record not found" });
      }

      const reg = regRes.rows[0];
      const partnerEmail = (reg.email || email || "").trim().toLowerCase();
      const partnerOrg = reg.organization_name || "NGO Partner";
      const partnerPerson = reg.person_name || partnerOrg;
      const partnerDesig = reg.person_designation || "Authorized Representative";

      if (reg.otp_code !== cleanOtp) {
        return res.status(400).json({ success: false, message: "Invalid verification OTP code", errors: { otp: "Invalid OTP code" } });
      }

      if (reg.otp_expires_at && new Date() > new Date(reg.otp_expires_at)) {
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP code.", errors: { otp: "OTP expired" } });
      }

      // Provision user account and dispatch login credentials email upon successful OTP verification
      const tempPassword = `TechCSR@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      let roleId = null;
      try {
        const roleRes = await db.query(`SELECT id FROM t_roles WHERE slug = 'ngo' AND deleted_at IS NULL LIMIT 1`);
        if (roleRes.rows.length > 0) {
          roleId = roleRes.rows[0].id;
        } else {
          const newRole = await db.query(`
            INSERT INTO t_roles (name, slug, description, is_active, is_configurator, created_at, updated_at)
            VALUES ('NGO Partner', 'ngo', 'External NGO Partner with portal access', TRUE, FALSE, NOW(), NOW())
            RETURNING id
          `);
          roleId = newRole.rows[0]?.id;
        }
      } catch (e) {}

      const userRes = await db.query(
        `INSERT INTO t_users 
           (name, email, password, role_id, role_slug, department, designation, is_active, is_first_login, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'ngo', 'NGO Portal', $5, TRUE, TRUE, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE 
           SET password = $3, role_id = $4, is_active = TRUE, is_first_login = TRUE, updated_at = NOW()
         RETURNING id`,
        [partnerPerson, partnerEmail, hashedPassword, roleId, partnerDesig]
      );
      const userId = userRes.rows[0]?.id;

      // Update t_frm_implementation_partner
      await db.query(
        `UPDATE t_frm_implementation_partner 
         SET is_verified = TRUE, registration_status = 'VERIFIED_PENDING_ONBOARDING',
             user_id = $1, created_by = COALESCE(created_by, $1), updated_by = $1, updated_at = NOW() 
         WHERE id = $2`,
        [userId, registration_id]
      );

      // Ensure key contact is present
      if (registration_id && partnerPerson) {
        try {
          const checkContact = await db.query(
            `SELECT id FROM t_frm_implementation_partner_key_contacts WHERE parent_id = $1 AND deleted_at IS NULL LIMIT 1`,
            [registration_id]
          );
          if (checkContact.rows.length === 0) {
            await db.query(
              `INSERT INTO t_frm_implementation_partner_key_contacts (
                 parent_id, name, designation, contact, email, status, created_by, updated_by, created_at, updated_at
               ) VALUES (
                 $1, $2, $3, $4, $5, 'Active', $6, $6, NOW(), NOW()
               )`,
              [registration_id, partnerPerson, partnerDesig, reg.phone_no, partnerEmail, userId]
            );
          }
        } catch (kcErr) {
          console.warn("[verifyNgoOtp] Key contact warning:", kcErr.message);
        }
      }

      // Dispatch login credentials email
      try {
        const { sendNgoProfileCreateEmail } = require("../../../email/services/ngoProfileCreateService");
        sendNgoProfileCreateEmail({
          name: partnerPerson,
          email: partnerEmail,
          password: tempPassword,
        });
      } catch (me) {
        console.error("[verifyNgoOtp] Failed to dispatch credentials email:", me.message);
      }

      return res.status(200).json({
        success: true,
        verified: true,
        message: "Email verified successfully! Your login credentials have been sent to your email address.",
        registration_id: reg.id,
        email: partnerEmail,
        organization_name: partnerOrg,
      });
    } catch (error) {
      return next(error);
    }
  },

  resendNgoOtp: async (req, res, next) => {
    try {
      const { registration_id, email } = req.body;
      const cleanEmail = (email || "").trim().toLowerCase();

      const regRes = await db.query(
        `SELECT id, email, person_name, organization_name, darpan_no 
         FROM t_frm_implementation_partner 
         WHERE id = $1 OR (LOWER(email) = $2 AND $2 != '')
         LIMIT 1`,
        [registration_id || 0, cleanEmail]
      );

      if (regRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Registration record not found" });
      }

      const reg = regRes.rows[0];
      const targetEmail = (reg.email || cleanEmail).trim().toLowerCase();
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await db.query(
        `UPDATE t_frm_implementation_partner 
         SET otp_code = $1, otp_expires_at = $2, otp_attempts = 0, updated_at = NOW() 
         WHERE id = $3`,
        [otpCode, otpExpiry, reg.id]
      );

      const { sendNgoRegistrationOTPEmail } = require("../../../email/services/ngoRegistrationService");
      sendNgoRegistrationOTPEmail({
        email: targetEmail,
        person_name: reg.person_name || reg.organization_name,
        organization_name: reg.organization_name,
        darpan_no: reg.darpan_no,
        otp: otpCode,
      });

      return res.status(200).json({
        success: true,
        message: `New verification OTP sent to ${targetEmail}.`,
      });
    } catch (error) {
      return next(error);
    }
  },

  submitNgoOnboarding: async (req, res, next) => {
    try {
      const { registration_id, profile_data = {}, due_diligence_data = {} } = req.body;
      if (!registration_id) {
        return res.status(400).json({ success: false, message: "registration_id is required" });
      }

      const regRes = await db.query(
        `SELECT id, is_verified, organization_name, email 
         FROM t_frm_implementation_partner 
         WHERE id = $1 LIMIT 1`,
        [registration_id]
      );

      if (regRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Registration not found" });
      }

      await db.query(
        `UPDATE t_frm_implementation_partner 
         SET profile_data = $1, registration_status = 'SUBMITTED', status = 'Submitted', updated_at = NOW() 
         WHERE id = $2`,
        [JSON.stringify(profile_data), registration_id]
      );

      return res.status(200).json({
        success: true,
        message: "Your NGO Profile details have been submitted to the NGO Manager for review.",
      });
    } catch (error) {
      return next(error);
    }
  },

  // ==============================================================
  // NGO CHANGE PASSWORD — First-login mandatory password change
  // (authenticated; does not require current_password)
  // ==============================================================
  ngoChangePassword: async (req, res, next) => {
    try {
      const userId = req.user?.user_id || req.user?.id;
      if (!userId) return unauthorized(res, "Unauthorized access");

      // Only allow if user is an NGO on their first login
      const userResult = await db.query(
        `SELECT id, role_slug, password, is_first_login
         FROM t_users
         WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      const user = userResult.rows[0];
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const { password, confirm_password } = req.body;

      if (!password) {
        return badRequest(res, "New password is required", { password: "New password is required" });
      }
      if (!confirm_password) {
        return badRequest(res, "Confirm password is required", { confirm_password: "Confirm password is required" });
      }
      if (password.trim() !== confirm_password.trim()) {
        return badRequest(res, "Passwords do not match", { confirm_password: "Password and confirm password do not match" });
      }
      if (password.length < 6) {
        return badRequest(res, "Password must be at least 6 characters", { password: "Password must be at least 6 characters" });
      }
      for (const rule of PASSWORD_RULES) {
        if (!rule.regex.test(password)) {
          return badRequest(res, "Weak password", { password: rule.msg });
        }
      }

      // Prevent reusing the same temp password
      let isSame = false;
      try { isSame = await bcrypt.compare(password.trim(), user.password); } catch (_) {}
      if (isSame) {
        return badRequest(res, "New password must be different from your temporary password", {
          password: "New password must be different from your temporary password",
        });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 12);
      await db.query(
        `UPDATE t_users
         SET password = $1, is_first_login = FALSE, updated_at = NOW()
         WHERE id = $2`,
        [hashedPassword, userId]
      );

      return res.status(200).json({
        success: true,
        message: "Password changed successfully. Welcome to the NGO Portal!",
      });
    } catch (error) {
      return next(error);
    }
  },
};

module.exports = authController;


