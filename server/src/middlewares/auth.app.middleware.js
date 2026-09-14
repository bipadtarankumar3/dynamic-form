const { verify, decode } = require("jsonwebtoken");
const UsersModel = require("../models/user.model");
const PersonalAccessTokenModel = require("../models/personalAccessToken.model");

const appAuthMiddleware = {
  validateToken: async (req, res, next) => {
    // Extract token from Authorization header
    const token = req.headers["authorization"]?.split(" ")[1]; // "Bearer <token>"

    // Check if token is provided
    if (!token) {
      return res.status(401).json({
        message: "Authorization token is missing",
      });
    }

    // Try to verify the token
    try {
      // Verify the token using JWT's secret key
      const decoded = verify(token, process.env.JWT_SECRET_KEY);

      const isTokenExist = await PersonalAccessTokenModel.findOne({
        where: {
          token,
        },
      });

      if (!isTokenExist) {
        return res.status(401).json({
          message: "Invalid or expired token",
        });
      }

      const user = await UsersModel.findByPk(decoded.user_id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.is_active === false) {
        return res.status(401).json({
          message: "Your account has been deactivated",
        });
      }
      // if (
      //   user?.role_slug === "patient" &&
      //   decoded?.fcm_token !== user?.fcm_token
      // ) {
      //   return res.status(401).json({
      //     message: "Already logged in from another device",
      //   });
      // }

      if (token !== user.app_token) {
        return res.status(409).json({
          status: false,
          message: "Invalid or expired token",
        });
      }

      // Attach the user information to the request object (user data)
      req.user = decoded; // { userId, created }

      // Proceed to the next middleware or route handler
      next();
    } catch (err) {
      // Handle invalid or expired token
      return res.status(401).json({
        message: "Invalid or expired token",
        error: err.message,
      });
    }
  },
};

module.exports = appAuthMiddleware;
