// middleware/validate.js
const validate = (schemas) => {
  return (req, res, next) => {
    const toValidate = ["body", "query", "params"];
    const errors = {};

    toValidate.forEach((key) => {
      if (schemas[key]) {
        const { error, value } = schemas[key].validate(req[key], {
          abortEarly: false,
        });

        if (error) {
          error.details.forEach((err) => {
            const field = err.path.join(".");
            if (!errors[field]) {
              errors[field] = err.message;
            }
            // errors[`${key}.${field}`] = err.message;
          });
        } else {
          // If no error, override req with sanitized data
          req[key] = value;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: false,
        message: "Validation error",
        errors,
      });
    }

    next();
  };
};

module.exports = validate;
