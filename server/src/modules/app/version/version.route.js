const router = require("express").Router();
const versionController = require("./controller/version.controller");

router.get("/", versionController.getVersion);

module.exports = router;
