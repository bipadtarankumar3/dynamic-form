// mongo-server/src/middlewares/auth.middleware.js
const { verify } = require('jsonwebtoken');
const Token = require('../models/Token.model');
const User = require('../models/User.model');

async function validateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token is missing' });
  }

  try {
    const secret = process.env.JWT_SECRET_KEY || 'csr_dynamic_form_jwt_secret_2025_secure_key';
    const decoded = verify(token, secret);

    const userId = decoded.user_id || decoded.userId || decoded.id;

    // Verify user is active
    let user = null;
    if (userId) {
      user = await User.findOne({ _id: userId, deleted_at: null })
        .populate('role_id', 'name slug is_configurator');
    }

    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase(), deleted_at: null })
        .populate('role_id', 'name slug is_configurator');
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    }

    const roleSlug = user.role_id?.slug || user.role_slug || decoded.role_slug || '';
    const isConfigurator = Boolean(
      user.is_configurator ||
      user.role_id?.is_configurator ||
      roleSlug === 'configurator' ||
      roleSlug === 'admin' ||
      roleSlug === 'super_admin'
    );

    req.user = {
      ...decoded,
      id: user._id,
      userId: user._id,
      user_id: user._id,
      email: user.email,
      name: user.name,
      role: roleSlug,
      role_id: user.role_id?._id || user.role_id,
      role_slug: roleSlug,
      role_name: user.role_id?.name || decoded.role_name || '',
      isConfigurator,
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
  }
}

const authMiddleware = {
  validateToken,
  authenticateToken: validateToken,
};

module.exports = authMiddleware;
module.exports.validateToken = validateToken;
module.exports.authenticateToken = validateToken;
