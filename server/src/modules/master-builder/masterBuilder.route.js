// server/src/modules/master-builder/masterBuilder.route.js
// ============================================================
// Two route groups:
//   /api/v1/configurator/master-schemas  — Configurator only (schema management)
//   /api/v1/masters                       — All authenticated users (data CRUD)
// ============================================================

const express = require("express");
const router  = express.Router();
const ctrl    = require("./masterBuilder.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

// -------------------------------------------------------
// Configurator-only guard middleware
// -------------------------------------------------------
function requireConfigurator(req, res, next) {
  if (!req.user?.isConfigurator) {
    return res.status(403).json({
      success: false,
      message: "Access denied — Configurator role required",
    });
  }
  next();
}

// -------------------------------------------------------
// SCHEMA MANAGEMENT — Configurator only
// POST   /api/v1/configurator/master-schemas
// GET    /api/v1/configurator/master-schemas
// GET    /api/v1/configurator/master-schemas/:id
// PUT    /api/v1/configurator/master-schemas/:id
// DELETE /api/v1/configurator/master-schemas/:id
// -------------------------------------------------------
const schemaRouter = express.Router();
schemaRouter.use(authMiddleware.validateToken, requireConfigurator);

schemaRouter.get("/",    ctrl.getAllSchemas);
schemaRouter.get("/:id", ctrl.getSchemaById);
schemaRouter.post("/",   ctrl.createSchema);
schemaRouter.put("/:id", ctrl.updateSchema);
schemaRouter.delete("/:id", ctrl.deleteSchema);

// -------------------------------------------------------
// MASTER DATA — all authenticated users
// GET    /api/v1/masters/:slug/dropdown
// GET    /api/v1/masters/:slug
// GET    /api/v1/masters/:slug/:id
// POST   /api/v1/masters/:slug
// PUT    /api/v1/masters/:slug/:id
// DELETE /api/v1/masters/:slug/:id
// -------------------------------------------------------
const dataRouter = express.Router();
dataRouter.use(authMiddleware.validateToken);

dataRouter.get("/:slug/dropdown", ctrl.getDropdown);
dataRouter.get("/:slug",         ctrl.listRecords);
dataRouter.get("/:slug/:id",     ctrl.getRecord);
dataRouter.post("/:slug",        ctrl.createRecord);
dataRouter.put("/:slug/:id",     ctrl.updateRecord);
dataRouter.delete("/:slug/:id",  ctrl.deleteRecord);

module.exports = { schemaRouter, dataRouter };
