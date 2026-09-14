// mongo-server/src/modules/public/public.route.js
const express = require("express");
const dynamicFormCtrl = require("../dynamic-form/dynamicForm.controller");

const router = express.Router();

// Public form endpoints (no auth required)
router.post("/forms/schema-details", dynamicFormCtrl.schemaDetails);
router.post("/forms/master-details", dynamicFormCtrl.masterDetails);
router.post("/forms/submit", dynamicFormCtrl.add);
router.post("/submit", dynamicFormCtrl.add);

module.exports = router;
