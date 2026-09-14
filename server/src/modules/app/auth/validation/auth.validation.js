const joi = require("joi");

const authValidation = {
  loginValidation: joi
    .object({
      email: joi.string().required().messages({
        "string.base": "Value must be a string",
        "string.empty": "email is required",
        "any.required": "email is required",
      }),
      password: joi.string().required().messages({
        "string.base": "Password must be a string",
        "any.required": "Password is required",
        "string.empty": "Password is required",
      }),
    })
    .unknown(true),
  signupValidation: joi
    .object({
      ptnt_name: joi.string().required().messages({
        "string.base": "Name must be a string",
        "any.required": "Name is required",
        "string.empty": "Name is required",
      }),
      password: joi.string().required().messages({
        "string.base": "Password must be a string",
        "any.required": "Password is required",
        "string.empty": "Password is required",
      }),
      ptnt_gender: joi
        .string()
        .valid("male", "female", "other")
        .insensitive()
        .required()
        .messages({
          "any.only": "Gender must be one of 'male', 'female', or 'other'",
          "string.base": "Gender must be a string",
          "any.required": "Gender is required",
          "string.empty": "Gender is required",
        }),
      ptnt_blood_group: joi
        .string()
        .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
        .insensitive()
        .required()
        .messages({
          "any.only":
            "Blood group must be one of 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'",
          "string.base": "Blood group must be a string",
          "any.required": "Blood group is required",
          "string.empty": "Blood group is required",
        }),
      ptnt_phone: joi.string().required().messages({
        "string.base": "Phone no must be a string",
        "any.required": "Phone no is required",
        "string.empty": "Phone no is required",
      }),
      ptnt_dob: joi
        .string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
          "string.pattern.base": "DOB must be in YYYY-MM-DD format",
          "any.required": "DOB is required",
          "string.empty": "DOB is required",
        }),
    })
    .unknown(true),
};

module.exports = authValidation;
