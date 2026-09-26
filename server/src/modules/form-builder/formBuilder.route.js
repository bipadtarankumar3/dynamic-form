// server/src/modules/form-builder/formBuilder.route.js
// ============================================================
// Two route groups:
//   /api/v1/configurator/form-schemas  — Configurator only
//   /api/v1/forms                       — All authenticated users
// ============================================================

const express = require("express");
const ctrl    = require("./controller/formBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator && req.user?.role_slug !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied — Configurator role required" });
  }
  next();
}

// -------------------------------------------------------
// SCHEMA MANAGEMENT — Configurator only
// -------------------------------------------------------
const schemaRouter = express.Router();
schemaRouter.use(authMiddleware.validateToken, requireConfigurator);

schemaRouter.get("/",              ctrl.getAllSchemas);
schemaRouter.get("/masters",       ctrl.getMasterForms);   // All active form schemas
schemaRouter.get("/all-tables",    ctrl.getAllDatabaseTables); // All DB tables from information_schema
schemaRouter.get("/table-columns/:tableName", ctrl.getTableColumnsForFormBuilder); // Columns for auto-generating fields
schemaRouter.post("/sync-parent-foreign-key", ctrl.syncParentForeignKey); // Instant parent_id column & Foreign Key sync
schemaRouter.get("/:id",           ctrl.getSchemaById);
schemaRouter.get("/:id/pre-delete-check", ctrl.preDeleteCheck);
schemaRouter.post("/",             ctrl.createSchema);
schemaRouter.put("/:id",           ctrl.updateSchema);
schemaRouter.delete("/:id",        ctrl.deleteSchema);

// -------------------------------------------------------
// FORM DATA — All authenticated users
// -------------------------------------------------------
const dataRouter = express.Router();
dataRouter.use(authMiddleware.validateToken);

dataRouter.get("/schema/:slug",    ctrl.getSchemaBySlug);   // Get form definition for rendering
dataRouter.get("/:slug",           ctrl.listRecords);
dataRouter.get("/:slug/:id",       ctrl.getRecord);
dataRouter.post("/:slug",          ctrl.createRecord);
dataRouter.put("/:slug/:id",       ctrl.updateRecord);
dataRouter.delete("/:slug/:id",    ctrl.deleteRecord);

// -------------------------------------------------------
// LEGACY COMPATIBILITY — Configurator only
// -------------------------------------------------------
const legacyRouter = express.Router();
legacyRouter.use(authMiddleware.validateToken, requireConfigurator);
legacyRouter.post("/create-form", ctrl.createSchema);

module.exports = { schemaRouter, dataRouter, legacyRouter };


