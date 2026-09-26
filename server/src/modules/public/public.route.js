// server/src/modules/public/public.route.js
// ============================================================
// Unified Public Router
// Endpoints mounted at: /api/v1/public
// Includes /public/forms/*
// ============================================================

const express = require("express");
const multer = require("multer")();
const ctrl = require("./public.controller");
const { publicFormRL } = require("../../rate-limit/publicFormRL");

const router = express.Router();

// 1. Unauthenticated Public Form Schema & Master Lookups
router.post("/forms/schema-details", ctrl.getPublicSchemaDetails);
router.post("/forms/master-details", ctrl.getPublicMasterOptions);

// 2. Unauthenticated Public Dynamic Form Submission (Multer handles FormData & JSON)
router.post("/forms/submit", publicFormRL, multer.any(), ctrl.submitPublicForm);
router.post("/submit", publicFormRL, multer.any(), ctrl.submitPublicForm);

module.exports = router;
