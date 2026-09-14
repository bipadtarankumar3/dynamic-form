// mongo-server/src/modules/menu/menu.route.js
const express = require("express");
const controller = require("./menu.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();
router.use(authMiddleware.validateToken);

router.get("/tree", controller.getMenuTree);     // for the logged-in user
router.get("/", controller.listMenus);           // admin: all menus flat
router.post("/", controller.createMenu);
router.put("/reorder", controller.reorder);
router.put("/:id", controller.updateMenu);
router.delete("/:id", controller.deleteMenu);

module.exports = router;
