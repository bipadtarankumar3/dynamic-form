const express = require("express");
const userController = require("./controllers/user.controller");
const router = express.Router();

router.post("/change-password", userController.changePassword);
module.exports = router;
