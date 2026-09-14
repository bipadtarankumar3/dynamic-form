// mongo-server/src/middlewares/auth.middleware.js
const { verify } = require("jsonwebtoken");
const Token = require("../models/Token.model");
const User = require("../models/User.model");

const authMiddleware = {
  async validateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Access token is missing" });
    }

    try {
      // 1. Verify JWT signature
      const decoded = verify(token, process.env.JWT_SECRET_KEY);

      // 2. Check token is not revoked
      const tokenRecord = await Token.findOne({ token, deleted_at: null });
      if (!tokenRecord) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
      }

      // 3. Verify user is active
      const user = await User.findOne({ _id: decoded.user_id, deleted_at: null })
        .populate("role_id", "name slug is_configurator");

      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      if (!user.is_active) {
        return res.status(401).json({ success: false, message: "Your account has been deactivated" });
      }

      const roleSlug = user.role_id?.slug || user.role_slug || decoded.role_slug || "";
      const isConfigurator = Boolean(
        user.is_configurator ||
        user.role_id?.is_configurator ||
        roleSlug === "configurator" ||
        roleSlug === "admin" ||
        roleSlug === "super_admin"
      );

      // 4. Attach user to request
      req.user = {
        ...decoded,
        id: user._id,
        user_id: user._id,
        role_id: user.role_id?._id || user.role_id,
        role_slug: roleSlug,
        role_name: user.role_id?.name || decoded.role_name || "",
        isConfigurator,
      };

      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token", error: err.message });
    }
  },
};

module.exports = authMiddleware;
