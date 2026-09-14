const express = require("express");
const authController = require("./controller/auth.controller");
const validate = require("../../../middlewares/validate.middleware");
const {
  loginValidation,
} = require("./validation/auth.validation");
const {
  forgetPasswordLimiter,
} = require("../../../rate-limit/app/forgetPasswordRL");
const { loginLimiter } = require("../../../rate-limit/app/loginRL");
const router = express.Router();

router.post(
  "/login",
  loginLimiter,
  validate({
    body: loginValidation,
  }),
  authController.login
);

router.post(
  "/forget-password",
  forgetPasswordLimiter,
  authController.forgetPassword
);
router.post(
  "/single-login",
  authController.singleLogin
);

module.exports = router;
