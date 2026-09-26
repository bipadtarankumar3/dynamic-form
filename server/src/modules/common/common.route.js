const express = require("express");
const {
  deleteDocument,
  fetchPermissions,
  logout,
} = require("../common/common.controller");
const router = express.Router();

router.post("/delete-file", deleteDocument);
router.get("/permissions", fetchPermissions);
router.get("/logout", logout);

module.exports = router;
