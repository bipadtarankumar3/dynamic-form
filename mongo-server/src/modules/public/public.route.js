const express = require('express');
const router = express.Router();
const publicController = require('./public.controller');

// Public form routes (for public surveys, external submissions)
router.get('/forms/:formCode/meta', publicController.getPublicFormMeta);
router.post('/forms/:formCode/submit', publicController.submitPublicForm);

module.exports = router;
