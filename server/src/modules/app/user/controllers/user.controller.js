const UserModel = require("../../../../models/user.model");
const CustomErrorHandler = require("../../../../services/customErrorHandler.service");
const bcrypt = require("bcryptjs");
const userController = {
  changePassword: async (req, res, next) => {
    try {
      const userId = req.user?.user_id;
      const newPassword = req.body?.password;
      const currentPassword = req.body?.current_password;
      if (!newPassword || !currentPassword) {
        return res.status(400).json({
          status: false,
          message: "New password and current password are required",
        });
      }
      const user = await UserModel.findOne({ where: { user_id: userId } });
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          status: false,
          message: "Current password is incorrect",
        });
      }

      const passwordRegex = {
        lowercase: /[a-z]/,
        uppercase: /[A-Z]/,
        number: /\d/,
        specialChar: /[@$!%*?&]/,
      };

      if (newPassword.length < 6) {
        return res.status(400).json({
          status: false,
          message: "Password must be at least 6 characters long",
        });
      }

      if (!passwordRegex.lowercase.test(newPassword)) {
        return res.status(400).json({
          status: false,
          message: "Password must contain at least one lowercase letter",
        });
      }

      if (!passwordRegex.uppercase.test(newPassword)) {
        return res.status(400).json({
          status: false,
          message: "Password must contain at least one uppercase letter",
        });
      }

      if (!passwordRegex.number.test(newPassword)) {
        return res.status(400).json({
          status: false,
          message: "Password must contain at least one number",
        });
      }

      if (!passwordRegex.specialChar.test(newPassword)) {
        return res.status(400).json({
          status: false,
          message:
            "Password must contain at least one special character (@$!%*?&)",
        });
      }
      user.password = newPassword;
      user.updated_by = userId;
      await user.save();

      return res.json({
        status: true,
        message: "Password updated successfully",
      });
    } catch (err) {
      return next(CustomErrorHandler.internalServerError(err));
    }
  },
};

module.exports = userController;
