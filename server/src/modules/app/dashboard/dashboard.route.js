const express = require("express");
const dashboardController = require("./controllers/dashboard.controller");
const router = express.Router();
const multer = require("multer")();



router.post("/all-count", multer.any(), dashboardController.allCount);

module.exports = router;
