// server/src/middlewares/auth.middleware.js
const { verify } = require("jsonwebtoken");
const db         = require("../config/db");

const authMiddleware = {
  /**
   * validateToken — guards any endpoint requiring JWT auth.
   * Reads token from Authorization: Bearer <token>.
   * Uses raw pg (t_access_tokens, t_users) instead of Sequelize.
   */
  async validateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token      = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing",
      });
    }

    try {
      // 1. Verify JWT signature + expiry
      const decoded = verify(token, process.env.JWT_SECRET_KEY);

      // 2. Check token exists in t_access_tokens (not revoked)
      const tokenCheck = await db.query(
        `SELECT * FROM t_access_tokens
         WHERE token = $1
           AND deleted_at IS NULL
         LIMIT 1`,
        [token]
      );

      if (tokenCheck.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      // 3. Verify user is still active and retrieve role metadata
      const userCheck = await db.query(
        `SELECT u.*, r.slug AS role_slug, r.name AS role_name, r.is_configurator AS role_is_configurator
         FROM t_users u
         LEFT JOIN t_roles r ON r.id = u.role_id AND r.deleted_at IS NULL
         WHERE u.id = $1
           AND u.deleted_at IS NULL
         LIMIT 1`,
        [decoded.user_id || decoded.usr_id || decoded.id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userCheck.rows[0];
      const userId = user.id || user.usr_id;
      const roleId = user.role_id || user.usr_role_id;
      const roleSlug = user.role_slug || decoded.role_slug || decoded.usr_role_slug || "";
      const isActive = user.is_active !== undefined ? user.is_active : user.usr_is_active;

      if (!isActive) {
        return res.status(401).json({
          success: false,
          message: "Your account has been deactivated",
        });
      }

      const isConfigurator = Boolean(
        decoded.isConfigurator === true ||
        decoded.rol_is_configurator === true ||
        user.role_is_configurator === true ||
        roleSlug === "configurator" ||
        roleSlug === "admin" ||
        (user.role_name && String(user.role_name).toLowerCase().includes("admin"))
      );

      // 4. Attach decoded user info to request
      req.user = {
        ...decoded,
        id:             userId,
        usr_id:         userId,
        user_id:        userId,
        role_id:        roleId,
        usr_role_id:    roleId,
        role_slug:      roleSlug,
        usr_role_slug:  roleSlug,
        role_name:      user.role_name || decoded.role_name,
        isConfigurator,
      };

      // 5. VAPT: Enforce first-login password change — NGO users ONLY.
      //    Admin / configurator / other roles are never affected.
      //    Skip the check for the endpoint that clears the flag.
      const isNgoUser = roleSlug === "ngo";
      const isChangePasswordEndpoint =
        req.path === "/ngo/change-password" ||
        req.originalUrl?.includes("/ngo/change-password");

      if (isNgoUser && !isChangePasswordEndpoint) {
        try {
          const firstLoginCheck = await db.query(
            `SELECT is_first_login FROM t_users
             WHERE id = $1 AND role_slug = 'ngo' AND deleted_at IS NULL LIMIT 1`,
            [userId]
          );
          if (firstLoginCheck.rows[0]?.is_first_login === true) {
            return res.status(403).json({
              success: false,
              code: "FORCE_PASSWORD_CHANGE",
              message: "You must change your password before accessing the portal.",
            });
          }
        } catch (_) { /* column may not exist on older DBs — fail open */ }
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: err.message,
      });
    }
  },
};

module.exports = authMiddleware;
