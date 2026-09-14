const express = require("express");
const {
  logout
} = require("../logout/logout.controller");
const router = express.Router();


router.get("/logout", logout);

module.exports = router;
