const { sign } = require("jsonwebtoken");
require("dotenv").config();

const jwtUtils = {
  /**
   * Generate a signed JWT token for a user.
   * @param {Object} user - Must contain id (or usr_id), email, role_slug, is_configurator
   * @returns {string} JWT token
   */
  generateToken: (user) => {
    const userId = user.id || user.usr_id;
    if (!userId) {
      throw new Error("Invalid user object — user id is required");
    }

    const payload = {
      user_id:          userId,
      email:            user.email || user.usr_email,
      name:             user.name || user.usr_name,
      role_id:          user.role_id || user.usr_role_id,
      role_slug:        user.role_slug || user.usr_role_slug || user.role_slug_r,
      role_name:        user.role_name || user.rol_name,
      isConfigurator:   user.is_configurator === true || user.rol_is_configurator === true,
      id_secret_key:    process.env.ID_SECRET_KEY,
      created:          new Date().toISOString(),
    };

    const token = sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRY || "8h",
    });

    return token;
  },
};

module.exports = jwtUtils;
