// mongo-server/src/modules/database-view/databaseView.route.js
const express = require("express");
const controller = require("./databaseView.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

router.get("/", controller.listViews);
router.get("/:slug", controller.getView);
router.post("/", controller.saveView);
router.post("/auto-generate", controller.autoGenerateView);
router.post("/:slug/query", controller.queryView);
router.post("/:slug/refresh", controller.refreshView);
router.delete("/:slug", controller.deleteView);

module.exports = router;
