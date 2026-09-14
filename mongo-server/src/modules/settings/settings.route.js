// mongo-server/src/modules/settings/settings.route.js
const express = require("express");
const controller = require("./settings.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

// Optional token extraction helper
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    return authMiddleware.validateToken(req, res, next);
  }
  next();
};

// Public read endpoints
router.get("/", optionalAuth, controller.listSettings);
router.get("/:key", optionalAuth, controller.getSetting);

// Protected admin endpoints
router.post("/", authMiddleware.validateToken, controller.saveSetting);
router.put("/:key", authMiddleware.validateToken, controller.saveSetting);
router.delete("/:key", authMiddleware.validateToken, controller.deleteSetting);

module.exports = router;
