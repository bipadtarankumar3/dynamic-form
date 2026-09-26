// mongo-server/src/modules/master-config/masterConfig.route.js
const express = require("express");
const router = express.Router();
const masterConfigController = require("./masterConfig.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware.validateToken);

router.get("/", masterConfigController.getAllMasterConfigs);
router.get("/tables", masterConfigController.getDatabaseTables);
router.get("/tables/:tableName/columns", masterConfigController.getTableColumns);
router.get("/:id", masterConfigController.getMasterConfigById);
router.post("/", masterConfigController.createMasterConfig);
router.put("/:id", masterConfigController.updateMasterConfig);
router.delete("/:id", masterConfigController.deleteMasterConfig);

module.exports = router;
