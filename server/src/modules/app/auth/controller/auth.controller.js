const { sequelize, Op } = require("../../../../config/db.config");
const RoleModel = require("../../../../models/role.model");
const UserModel = require("../../../../models/user.model");
const CustomErrorHandler = require("../../../../services/customErrorHandler.service");
const bcrypt = require("bcryptjs");
const jwtAppUtils = require("../../../../utils/jwt.app.utils");
const PersonalAccessTokenModel = require("../../../../models/personalAccessToken.model");
const { generateOtp } = require("../../../../utils/otpGenerator.utils");
const OtpModel = require("../../../../models/otp.model");
const { sign, verify } = require("jsonwebtoken");
const {
  sendForgetPasswordOTPEmail,
} = require("../../../../email/services/forgetPasswordService");
const {
  sendLoginVerifyOTPEmail,
} = require("../../../../email/services/loginVerifyService");

const authController = {
  login: async (req, res, next) => {
    try {
      const { email, password, type, token: otpToken, otp } = req.body;

      /* ================= EMAIL REQUIRED ================= */
      const emailTrim = email?.trim();
      if (!emailTrim) {
        return res.status(400).json({
          status: false,
          message: "Email is required",
        });
      }

      /* ================= EMAIL FORMAT ================= */
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);
      if (!isEmail) {
        return res.status(400).json({
          status: false,
          message: "Please provide a valid email",
        });
      }

      /* ================= FETCH USER ================= */
      const user = await UserModel.findOne({
        where: { email: { [Op.iLike]: emailTrim } },
      });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Invalid credentials",
        });
      }

      /* =====================================================
         STEP 1 — EMAIL + PASSWORD VERIFIED → SEND OTP
      ===================================================== */
      if (type === "email_verify") {
        if (!password) {
          return res.status(400).json({
            status: false,
            message: "Password is required",
          });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({
            status: false,
            message: "Invalid email or password",
          });
        }

        if (!user.role_id || user.is_active === false) {
          return res.status(403).json({
            status: false,
            message: "Account is inactive or role not assigned",
          });
        }

        const agent = await RoleModel.findOne({
          where: { rol_id: user.role_id },
          attributes: ["rol_agent", "rol_slug"],
        });

        if (!agent || !agent.rol_agent?.includes("mobile")) {
          return res.status(403).json({
            status: false,
            message: "You do not have access to login",
          });
        }

        /* ================= SEND OTP ================= */
        const otpValue = generateOtp();
        const expiry = new Date(
          Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60000,
        );

        await OtpModel.destroy({
          where: {
            user_id: user.id,
            type: "login_verify",
          },
        });

        await OtpModel.create({
          user_id: user.id,
          email: user.email,
          type: "login_verify",
          value: otpValue,
          expires_at: expiry,
        });

        sendLoginVerifyOTPEmail({
          name: user.name,
          email: user.email,
          otp: otpValue,
        });

        const jwtToken = sign(
          {
            user_id: user.id,
            email: user.email,
            type: "otp_verify",
          },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "10m" },
        );

        return res.status(200).json({
          status: true,
          type: "otp_verify",
          token: jwtToken,
          message: "OTP sent successfully",
        });
      }

      /* =====================================================
         STEP 2 — OTP VERIFY → LOGIN SUCCESS
      ===================================================== */
      if (type === "otp_verify") {
        if (!otpToken || !otp) {
          return res.status(400).json({
            status: false,
            message: "Token and OTP are required",
          });
        }

        let decoded;
        try {
          decoded = verify(otpToken, process.env.JWT_SECRET_KEY);
        } catch {
          return res.status(400).json({
            status: false,
            message: "Invalid or expired token",
          });
        }

        if (decoded.type !== "otp_verify" || decoded.user_id !== user.id) {
          return res.status(400).json({
            status: false,
            message: "Invalid or expired token",
          });
        }

        const otpRecord = await OtpModel.findOne({
          where: {
            user_id: user.id,
            type: "login_verify",
            expires_at: { [Op.gt]: new Date() },
          },
        });

        if (!otpRecord || otpRecord.value !== otp.trim()) {
          return res.status(400).json({
            status: false,
            message: "Invalid or expired OTP",
          });
        }

        await OtpModel.destroy({
          where: {
            user_id: user.id,
            type: "login_verify",
          },
        });

        const accessToken = jwtAppUtils.generateToken({
          user_id: user.id,
          email: user.email,
          role_id: user.role_id,
          role_slug: user.role_slug,
        });

        await PersonalAccessTokenModel.create({
          tokenable_type: user.role_slug,
          tokenable_id: user.id,
          name: "access_token",
          token: accessToken,
        });

        await UserModel.update(
          {
            app_token: accessToken,
            updated_by: user.id,
          },
          { where: { id: user.id } },
        );

        return res.status(200).json({
          status: true,
          message: "Login successful",
          token: accessToken,
          user: {
            user_id: user.id,
            email: user.email,
            role_id: user.role_id,
            role_slug: user.role_slug,
            name: user.name,
          },
        });
      }

      /* ================= INVALID TYPE ================= */
      return res.status(400).json({
        status: false,
        message: "Invalid request type",
      });
    } catch (error) {
      return next(CustomErrorHandler.databaseError(error.message));
    }
  },
  forgetPassword: async (req, res, next) => {
    try {
      const { email, password, confirm_password, type, token, otp } = req.body;

      // Normalize input
      const emailTrim = email?.trim();
      if (!emailTrim)
        return res
          .status(400)
          .json({ status: false, message: "Email is required" });

      // Fetch user
      const user = await UserModel.findOne({ where: { email: emailTrim } });

      // Prevent enumeration
      if (!user || !user?.email) {
        if (type === "email_verify") {
          const payload = {
            type: "otp_verify",
          };

          const jwtToken = sign(payload, process.env.JWT_SECRET_KEY, {
            expiresIn: "10m",
          });

          return res.status(200).json({
            status: true,
            token: jwtToken,
            type: "otp_verify",
            message:
              "If your account exists, we’ve sent a verification code to your email. Please check your email and enter the OTP to continue.",
          });
        } else {
          return res.status(400).json({
            status: false,
            message: "Invalid request type.",
          });
        }
      }

      // STEP 1 — Email VERIFY: send OTP
      if (type === "email_verify") {
        const otpValue = generateOtp();
        const expiry = new Date(
          Date.now() + process.env.OTP_EXPIRY_MINUTES * 60000,
        );

        await OtpModel.destroy({
          where: {
            user_id: user.id,
            type: "forget_password",
          },
        });

        await OtpModel.create({
          user_id: user.id,
          email: user.email,
          type: "forget_password",
          value: otpValue,
          expires_at: expiry,
        });

        // Send OTP email
        sendForgetPasswordOTPEmail({
          name: user.name,
          email: user.email,
          otp: otpValue,
        });

        const payload = {
          user_id: user.id,
          email: user.email,
          type: "otp_verify",
        };

        const jwtToken = sign(payload, process.env.JWT_SECRET_KEY, {
          expiresIn: "10m",
        });

        return res.status(200).json({
          status: true,
          token: jwtToken,
          type: "otp_verify",
          message:
            "If your account exists, we’ve sent a verification code to your email. Please check your email and enter the OTP to continue.",
        });
      }

      // STEP 2 — OTP VERIFY: verify OTP & issue reset token
      if (type === "otp_verify") {
        if (!token || !otp)
          return res
            .status(400)
            .json({ status: false, message: "Token and OTP are required" });

        let decoded;
        try {
          decoded = verify(token, process.env.JWT_SECRET_KEY);
        } catch {
          return res
            .status(400)
            .json({ status: false, message: "Invalid or expired token" });
        }

        // Validate token type and ownership
        if (decoded.type !== "otp_verify" || decoded.user_id !== user.id) {
          return res
            .status(400)
            .json({ status: false, message: "Invalid or expired token" });
        }

        // Verify OTP from DB
        const otpRecord = await OtpModel.findOne({
          where: { user_id: decoded.user_id, type: "forget_password" },
        });

        if (
          !otpRecord ||
          otpRecord.value !== otp.trim() ||
          new Date() > new Date(otpRecord.expires_at)
        ) {
          return res.status(400).json({
            status: false,
            message: "Invalid or expired OTP.",
          });
        }

        // OTP valid → delete from DB and create reset token
        await OtpModel.destroy({
          where: { user_id: decoded.user_id, type: "forget_password" },
        });

        const resetPayload = {
          user_id: decoded.user_id,
          email: decoded.email,
          email: decoded.email,
          type: "reset_password",
        };

        const resetToken = sign(resetPayload, process.env.JWT_SECRET_KEY, {
          expiresIn: "10m",
        });

        return res.status(200).json({
          status: true,
          type: "reset_password",
          token: resetToken,
          message:
            "OTP verified successfully. You can now reset your password.",
        });
      }

      // STEP 3 — RESET PASSWORD
      if (type === "reset_password") {
        if (!token || !password || !confirm_password) {
          return res.status(400).json({
            status: false,
            message: "Token, password, and confirm_password are required",
          });
        }

        let decoded;
        try {
          decoded = verify(token, process.env.JWT_SECRET_KEY);
        } catch {
          return res
            .status(400)
            .json({ status: false, message: "Invalid or expired token" });
        }

        if (
          decoded.type !== "reset_password" ||
          decoded.user_id !== user.id
        ) {
          return res
            .status(400)
            .json({ status: false, message: "Invalid or expired token" });
        }

        // Password validation
        if (password?.trim() !== confirm_password?.trim()) {
          return res.status(400).json({
            status: false,
            errors: {
              confirm_password: "Password and confirm password do not match",
            },
          });
        }

        const passwordRegex = {
          lowercase: /[a-z]/,
          uppercase: /[A-Z]/,
          number: /\d/,
          specialChar: /[@$!%*?&]/,
        };

        if (password.length < 6) {
          return res.status(400).json({
            status: false,
            message: "Password must be at least 6 characters long",
          });
        }

        if (!passwordRegex.lowercase.test(password)) {
          return res.status(400).json({
            status: false,
            message: "Password must contain at least one lowercase letter",
          });
        }

        if (!passwordRegex.uppercase.test(password)) {
          return res.status(400).json({
            status: false,
            message: "Password must contain at least one uppercase letter",
          });
        }

        if (!passwordRegex.number.test(password)) {
          return res.status(400).json({
            status: false,
            message: "Password must contain at least one number",
          });
        }

        if (!passwordRegex.specialChar.test(password)) {
          return res.status(400).json({
            status: false,
            message:
              "Password must contain at least one special character (@$!%*?&)",
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        await UserModel.update(
          { password: hashedPassword },
          { where: { id: user.id } },
        );

        return res.status(200).json({
          status: true,
          message: "Password updated successfully",
        });
      }

      // INVALID TYPE
      return res
        .status(400)
        .json({ status: false, message: "Invalid request type" });
    } catch (error) {
      return next(CustomErrorHandler.databaseError(error.message));
    }
  },

  singleLogin: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      /* ================= EMAIL REQUIRED ================= */
      const emailTrim = email?.trim();
      if (!emailTrim) {
        return res.status(400).json({
          status: false,
          message: "Email is required",
        });
      }

      /* ================= EMAIL FORMAT ================= */
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);
      if (!isEmail) {
        return res.status(400).json({
          status: false,
          message: "Please provide a valid email",
        });
      }

      /* ================= PASSWORD REQUIRED ================= */
      if (!password) {
        return res.status(400).json({
          status: false,
          message: "Password is required",
        });
      }

      /* ================= FETCH USER ================= */
      const user = await UserModel.findOne({
        where: { email: { [Op.iLike]: emailTrim } },
      });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Invalid credentials",
        });
      }

      /* ================= PASSWORD MATCH ================= */
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          status: false,
          message: "Invalid email or password",
        });
      }

      /* ================= ACCOUNT ACTIVE CHECK ================= */
      if (!user.role_id || user.is_active === false) {
        return res.status(403).json({
          status: false,
          message: "Account is inactive or role not assigned",
        });
      }

      /* ================= ROLE CHECK ================= */
      const agent = await RoleModel.findOne({
        where: { rol_id: user.role_id },
        attributes: ["rol_agent", "rol_slug"],
      });

      if (!agent || !agent.rol_agent?.includes("mobile")) {
        return res.status(403).json({
          status: false,
          message: "You do not have access to login",
        });
      }

      /* ================= SINGLE LOGIN CHECK ================= */

      if (!user.app_token) {
        return res.status(200).json({
          status: true,
          message: "No Logged in User found",
        });
      }

      return res.status(409).json({
        status: false,
        message:
          "User already logged in on another device. If you log in now, you will be logged out from the other device, and all your local data on that device will be cleared. Are you sure you want to log in on this device?",
      });

      // /* ================= SINGLE LOGIN CHECK ================= */
      // const existingToken = await PersonalAccessTokenModel.findOne({
      //   where: {
      //     tokenable_id: user.user_id,
      //     name: "access_token",
      //   },
      // });

      // if (existingToken) {
      //   return res.status(403).json({
      //     status: false,
      //     message: "User already logged in on another device",
      //   });
      // }
    } catch (error) {
      return next(CustomErrorHandler.databaseError(error.message));
    }
  },
};

module.exports = authController;
