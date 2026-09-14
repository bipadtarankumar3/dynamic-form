const express = require("express");
const schemaController = require("./controllers/schema.controller");
const router = express.Router();
router.get("/all-list", schemaController.list);
module.exports = router;
