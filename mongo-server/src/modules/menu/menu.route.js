// mongo-server/src/modules/menu/menu.route.js
const express = require("express");
const router = express.Router();
const menuController = require("./menu.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// User menu tree
router.get("/tree", authMiddleware.validateToken, menuController.getMenuTree);
router.get("/my-menus", authMiddleware.validateToken, menuController.getMenuTree);

// Menu Manager CRUD (Configurator/Admin)
router.get("/", authMiddleware.validateToken, menuController.listMenus);
router.post("/", authMiddleware.validateToken, menuController.createMenu);
router.put("/reorder", authMiddleware.validateToken, menuController.reorder);
router.put("/:id", authMiddleware.validateToken, menuController.updateMenu);
router.delete("/:id", authMiddleware.validateToken, menuController.deleteMenu);

module.exports = router;
