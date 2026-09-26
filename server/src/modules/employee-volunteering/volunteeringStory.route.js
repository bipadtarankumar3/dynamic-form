// server/src/modules/employee-volunteering/volunteeringStory.route.js
const express = require("express");
const multer = require("multer")();
const ctrl = require("./volunteeringStory.controller");

const router = express.Router();

// Story CRUD & Feed
router.get("/", ctrl.getStories);
router.get("/:id", ctrl.getStoryById);
router.post("/", multer.any(), ctrl.createOrUpdateStory);
router.put("/:id", multer.any(), ctrl.createOrUpdateStory);
router.delete("/:id", ctrl.deleteStory);

// Likes & Comments
router.post("/:id/like", ctrl.toggleLike);
router.post("/:id/comments", ctrl.addComment);
router.delete("/comments/:comment_id", ctrl.deleteComment);

module.exports = router;
