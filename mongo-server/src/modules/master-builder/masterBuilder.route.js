// mongo-server/src/modules/master-builder/masterBuilder.route.js
const express = require("express");
const controller = require("./masterBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

// Master Schema CRUD
router.get("/schemas", controller.listSchemas);
router.get("/schemas/:slug", controller.getSchema);
router.post("/schemas", controller.saveSchema);
router.put("/schemas/:slug", controller.saveSchema);
router.delete("/schemas/:slug", controller.deleteSchema);

// Master Data CRUD (per master_slug)
router.get("/:master_slug/data", controller.listData);
router.post("/:master_slug/data", controller.addData);
router.put("/:master_slug/data/:id", controller.editData);
router.delete("/:master_slug/data/:id", controller.deleteData);

module.exports = router;
