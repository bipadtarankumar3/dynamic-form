const express = require('express');
const multer = require('multer')();
const ctrl = require('./volunteeringStory.controller');
const { authenticateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Story CRUD & Feed (Auth optional for read, required for like/comment/create)
router.get('/', ctrl.getStories);
router.get('/:id', ctrl.getStoryById);
router.post('/', authenticateToken, multer.any(), ctrl.createOrUpdateStory);
router.put('/:id', authenticateToken, multer.any(), ctrl.createOrUpdateStory);
router.delete('/:id', authenticateToken, ctrl.deleteStory);

// Likes & Comments
router.post('/:id/like', authenticateToken, ctrl.toggleLike);
router.post('/:id/comments', authenticateToken, ctrl.addComment);
router.delete('/comments/:comment_id', authenticateToken, ctrl.deleteComment);

module.exports = router;
