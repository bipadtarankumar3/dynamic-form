require("dotenv").config();

class CustomErrorHandler extends Error {
  constructor(status, message, code = null, isOperational = true) {
    super(message);

    this.status = status;
    this.message = message || "Something went wrong";
    this.code = code;
    this.isOperational = isOperational;

    // Clean stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /* ------------------------------------------
     VALIDATION
  ------------------------------------------ */
  static validationError(message = "Validation failed") {
    return new CustomErrorHandler(400, message, "ERROR_VALIDATION");
  }

  /* ------------------------------------------
     DATABASE
  ------------------------------------------ */
  static databaseError(message = "Database error") {
    const msg =
      process.env.NODE_ENV === "production" ? "ERROR_DATABASE" : message;

    return new CustomErrorHandler(500, msg, "ERROR_DATABASE");
  }

  /* ------------------------------------------
     UNAUTHORIZED
  ------------------------------------------ */
  static unAuthorizedError(message = "Unauthorized") {
    return new CustomErrorHandler(401, message, "ERROR_UNAUTHORIZED");
  }

  /* ------------------------------------------
     FILE UPLOAD
  ------------------------------------------ */
  static fileUploadError(message = "File upload failed") {
    const msg =
      process.env.NODE_ENV === "production" ? "ERROR_FILE_UPLOAD" : message;

    return new CustomErrorHandler(409, msg, "ERROR_FILE_UPLOAD");
  }

  /* ------------------------------------------
     INTERNAL SERVER
  ------------------------------------------ */
  static internalServerError(message = "Internal server error") {
    const msg =
      process.env.NODE_ENV === "production" ? "ERROR_INTERNAL_SERVER" : message;

    return new CustomErrorHandler(
      500,
      msg,
      "ERROR_INTERNAL_SERVER",
      false, // programmer error
    );
  }

  /* ------------------------------------------
   BAD REQUEST
------------------------------------------ */
  static badRequest(message = "Bad request") {
    return new CustomErrorHandler(400, message, "ERROR_BAD_REQUEST");
  }
}

module.exports = CustomErrorHandler;
