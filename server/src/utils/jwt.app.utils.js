const { sign } = require('jsonwebtoken');
require('dotenv').config()
const jwtAppUtils = {
  generateToken: (user) => {
    if (!user || !user.user_id) {
      throw new Error('Invalid user object'); // Ensure the user object is valid.
    }

    const payload = {
      ...user,  // Only include essential info (e.g., user ID) in the payload.
      id_secret_key : process.env.ID_SECRET_KEY,
      created: new Date(),
    };

    // Generate JWT with a 1-hour expiration time
    const token = sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: '999y',  // Consider shorter expiration times for added security.
    });

    return token;
  },
};

module.exports = jwtAppUtils;
