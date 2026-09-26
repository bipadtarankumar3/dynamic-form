// mongo-server/src/modules/dynamic-form/dynamicForm.route.js
const express = require('express');
const router = express.Router();
const dynamicFormController = require('./dynamicForm.controller');
const upload = require('../../middlewares/upload.middleware');

// Dynamic form client rendering endpoints
router.post('/schema-details', dynamicFormController.schemaDetails);
router.get('/schema-details/:formSlug', (req, res, next) => {
  req.body = { ...req.body, form_slug: req.params.formSlug };
  return dynamicFormController.schemaDetails(req, res, next);
});

router.post('/master-details', dynamicFormController.masterDetails);
router.post('/general-list-view', dynamicFormController.generalListView);
router.post('/details', dynamicFormController.details);
router.post('/view', dynamicFormController.viewById);

// Dynamic form CRUD (RPC-style)
router.post('/add', upload.any(), dynamicFormController.add);
router.post('/edit', upload.any(), dynamicFormController.edit);
router.post('/delete', dynamicFormController.deleteRecord);
router.post('/active-inactive', dynamicFormController.activeInactive);

// Dynamic form REST-style helpers
router.get('/:formSlug', (req, res, next) => {
  req.body = { ...req.body, form_slug: req.params.formSlug, ...req.query };
  return dynamicFormController.generalListView(req, res, next);
});

router.get('/:formSlug/:id', (req, res, next) => {
  req.body = { ...req.body, form_slug: req.params.formSlug, id: req.params.id };
  return dynamicFormController.viewById(req, res, next);
});

router.post('/:formSlug', upload.any(), (req, res, next) => {
  req.body = { ...req.body, form_slug: req.params.formSlug };
  return dynamicFormController.add(req, res, next);
});

router.put('/:formSlug/:id', upload.any(), (req, res, next) => {
  req.body = { ...req.body, form_slug: req.params.formSlug, id: req.params.id };
  return dynamicFormController.edit(req, res, next);
});

router.delete('/:formSlug/:id', (req, res, next) => {
  req.body = { ...req.body, form_slug: req.params.formSlug, id: req.params.id };
  return dynamicFormController.deleteRecord(req, res, next);
});

module.exports = router;
