// mongo-server/src/routes/dynamicForm.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/dynamicForm.controller");

// Schema endpoints
router.post("/schemas", controller.saveSchema);
router.get("/schemas", controller.listSchemas);
router.get("/schemas/:formSlug", controller.getSchemaBySlug);
router.delete("/schemas/:formSlug", controller.deleteSchema);

// Submission endpoints
router.post("/schemas/:formSlug/submit", controller.submitResponse);
router.get("/schemas/:formSlug/submissions", controller.getSubmissionsBySlug);

module.exports = router;
