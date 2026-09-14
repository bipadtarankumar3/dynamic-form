# Server — Complete Developer Guide

> **Who is this for?** Any developer who is new to this project and needs to understand the full Node.js/Express server architecture — from startup to adding new modules.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Node.js + Express.js | HTTP server and routing |
| PostgreSQL | Primary database |
| Sequelize | ORM for complex transactions and model queries |
| pg (node-postgres) | Raw SQL queries (auth, permissions, critical paths) |
| Multer | File upload parsing (multipart/form-data) |
| JWT (jsonwebtoken) | Stateless authentication tokens |
| Helmet | Security headers |
| Morgan | HTTP access logging |
| ExcelJS | Excel file generation |
| Handlebars | Email templating |
| Nodemailer | Email sending |
| Firebase Admin | Push notifications |
| Socket.io | Real-time events |
| node-cron | Scheduled background jobs |
| Winston | Application logging |
| Nodemon | Dev auto-restart |

---

## Starting The Server

```bash
# Development (auto-restart on file change)
cd server
npm start          # runs: nodemon server.js

# Production
node server.js
```

Environment variables go in `server/.env` (see `.env.example` for all keys).

---

## Entry Points

```
server.js          <- Starts HTTP server, requires src/app.js
src/app.js         <- Creates Express app, sets up ALL middleware globally
src/router.js      <- Registers ALL route modules in one place
```

---

## Full Middleware Chain (Every Request Passes Through These In Order)

```
1.  Helmet                    Security headers (X-Frame-Options, CSP, HSTS, etc.)
2.  Custom headers            X-Xss-Protection, Referrer-Policy, etc.
3.  HTTP version check        Reject HTTP/1.0 (smuggling prevention)
4.  Smuggling protection      Reject if both Content-Length + Transfer-Encoding present
5.  Morgan / accessLogger     Log every request to file + console
6.  CORS                      Allow only whitelisted origins (see allowedOrigins in app.js)
7.  Host header check         Reject requests with unrecognized Host header
8.  Body parser (JSON)        Parse application/json body, max 10mb
9.  Body parser (urlencoded)  Parse form-encoded body, max 10mb
10. Global sanitize           Strip XSS from all request body fields (sanitize-html)
11. Static files              /api/v1/static/* -> serves uploads/ directory
12. authMiddleware            JWT validation for all /api/v1/admin/* routes
13. Your route handler        Controller runs here
14. 404 handler               Catch-all for unknown routes
15. Global error handler      Formats all thrown/next(err) errors into standard response
```

> IMPORTANT: The authMiddleware only guards `/api/v1/admin/*` routes.
> Public routes like `/api/v1/auth/*` and `/api/v1/public/*` do NOT require a token.

---

## All Routes — Quick Reference

### Auth (No token required)
| Method | URL | Description |
|---|---|---|
| POST | /api/v1/auth/login | Login, get JWT token |
| POST | /api/v1/auth/forget-password | Send password reset email |
| POST | /api/v1/auth/logout | Invalidate token |
| GET  | /api/v1/auth/profile | Get logged-in user profile |

### Dynamic Form (Token + Permission required)
| Method | URL | Permission | Description |
|---|---|---|---|
| POST | /api/v1/admin/dynamic-form/add | add | Create new form record |
| POST | /api/v1/admin/dynamic-form/edit | edit | Update existing record |
| POST | /api/v1/admin/dynamic-form/general-list-view | list | Get records + schema |
| POST | /api/v1/admin/dynamic-form/details | edit | Load record for editing |
| POST | /api/v1/admin/dynamic-form/view | view | Load record for viewing |
| POST | /api/v1/admin/dynamic-form/schema-details | (open) | Load form schema only |
| POST | /api/v1/admin/dynamic-form/master-details | (open) | Load master dropdown data |
| POST | /api/v1/admin/dynamic-form/general-export-excel | list | Export to Excel |

### Configurator (Super Admin only)
| URL prefix | Description |
|---|---|
| /api/v1/configurator/form-schemas | Build/edit form schemas |
| /api/v1/configurator/master-schemas | Build/edit master data schemas |
| /api/v1/configurator/menus | Manage sidebar menus |
| /api/v1/configurator/rbac | Manage roles and permissions |
| /api/v1/configurator/workflows | Manage approval workflows |
| /api/v1/configurator/dashboard-widgets | Manage dashboard widgets |
| /api/v1/configurator/report-definitions | Manage report templates |
| /api/v1/configurator/settings | System settings |

### Other Admin Routes
| URL prefix | Description |
|---|---|
| /api/v1/admin/masters | Master data CRUD (dropdown lists) |
| /api/v1/admin/forms | Form data CRUD (same as dynamic-form) |
| /api/v1/admin/menus | Sidebar menu for logged-in user |
| /api/v1/admin/workflows | Approval workflow actions |
| /api/v1/admin/dashboard-widgets | Dashboard data |
| /api/v1/admin/reports | Generate reports |
| /api/v1/admin/notifications | User notifications |
| /api/v1/admin/audit | Audit log |
| /api/v1/admin/ngo | NGO approval management |
| /api/v1/admin/monitoring | KPI monitoring |
| /api/v1/admin/auth | User/Role/Permission management |

---

## Module Structure Pattern

Every module follows the same pattern:

```
modules/my-module/
├── myModule.route.js      <- Express router: maps URLs to controller functions
├── controller/
│   └── myModule.controller.js  <- Request handlers (req, res, next)
├── services/
│   └── myModule.service.js     <- Business logic (called by controller)
└── helper/
    └── myModule.helper.js      <- Utilities (query builders, formatters)
```

Example — Adding a completely new module:

```javascript
// Step 1: Create the route file
// modules/vendor/vendor.route.js
const express = require("express");
const router = express.Router();
const { checkPermission } = require("../../middlewares/checkPermission.middleware");
const vendorController = require("./controller/vendor.controller");

router.get("/list",  checkPermission("vendor", "list"),  vendorController.list);
router.post("/add",  checkPermission("vendor", "add"),   vendorController.add);
router.post("/edit", checkPermission("vendor", "edit"),  vendorController.edit);

module.exports = router;
```

```javascript
// Step 2: Register in router.js
app.use(["/api/v1/admin/vendor", "/api/v1/vendor"],
  require("./modules/vendor/vendor.route")
);
```

```javascript
// Step 3: Create the controller
// modules/vendor/controller/vendor.controller.js
const db = require("../../../config/db");
const CustomErrorHandler = require("../../../services/customErrorHandler.service");

const vendorController = {
  list: async (req, res, next) => {
    try {
      const result = await db.query("SELECT * FROM t_vendors WHERE deleted_at IS NULL");
      res.json({ status: true, data: result.rows });
    } catch (err) {
      next(CustomErrorHandler.internalServerError(err.message));
    }
  },

  add: async (req, res, next) => {
    try {
      const { name } = req.body;
      const userId = req.user.user_id;
      await db.query(
        "INSERT INTO t_vendors (name, created_by) VALUES ($1, $2)",
        [name, userId]
      );
      res.json({ status: true, message: "Vendor added successfully" });
    } catch (err) {
      next(CustomErrorHandler.internalServerError(err.message));
    }
  }
};

module.exports = vendorController;
```

---

## Authentication System

### Login Flow
```
POST /api/v1/auth/login
Body: { username: "admin@example.com", password: "secret" }

1. Controller finds user in t_users WHERE email = username
2. Validates bcrypt password hash
3. Creates JWT token: sign({ user_id, role_id, isConfigurator }, JWT_SECRET_KEY)
4. Saves token to t_access_tokens (so it can be revoked)
5. Returns: { token, user: { name, role, ... } }
```

### Token Validation (Every Protected Request)
```
Authorization: Bearer <jwt_token>

authMiddleware.validateToken:
1. Extract token from Authorization header
2. verify(token, JWT_SECRET_KEY)      -> decode payload
3. Check t_access_tokens              -> token not revoked?
4. Check t_users WHERE id = user_id  -> user still active?
5. Populate req.user = {
     user_id, id, usr_id,
     role_id, role_slug,
     isConfigurator              // true = Super Admin bypass
   }
```

### Logout
```
POST /api/v1/auth/logout
-> Sets deleted_at on t_access_tokens row
-> Token becomes permanently invalid
```

---

## RBAC (Role-Based Access Control)

### Permission Check Middleware

```javascript
// Usage in any route:
const { checkPermission, checkAnyPermission } = require("../../middlewares/checkPermission.middleware");

// Require a single permission:
router.post("/add", checkPermission("vendor", "add"), controller.add);
// or use form_slug from req.body automatically:
router.post("/add", checkPermission(undefined, "add"), controller.add);

// Require ANY one of multiple permissions:
router.post("/export", checkAnyPermission("vendor", ["list", "export"]), controller.export);
```

### How Permission Check Works

```sql
SELECT 1
FROM t_role_permissions rp
JOIN t_permissions p ON rp.permission_id = p.id
WHERE rp.role_id = :role_id
  AND p.module  = :form_slug        -- e.g. "vendor"
  AND (
    p.type    = :action             -- e.g. "add"
    OR p.key  = "vendor.add"       -- full key format
  )
  AND rp.deleted_at IS NULL
LIMIT 1;
```

### Configurator Bypass

Users with `isConfigurator = true` (role_slug = "configurator") **skip all permission checks** and have access to everything.

### Permission Database Tables

| Table | Description |
|---|---|
| t_users | All system users |
| t_roles | Role definitions (Admin, NGO, Configurator, etc.) |
| t_permissions | All possible module+action combinations |
| t_role_permissions | Junction: which role has which permissions |

---

## Database Access Patterns

### Two DB Clients (Use The Right One)

```javascript
// 1. RAW SQL (pg) — use for simple queries, auth, permissions
const db = require("../config/db");
const result = await db.query("SELECT * FROM t_users WHERE id = $1", [userId]);
const rows = result.rows;

// 2. Sequelize — use for transactions (multi-table writes), ORM models
const { sequelize } = require("../config/db.config");
const transaction = await sequelize.transaction();
try {
  await sequelize.query("INSERT INTO ...", { replacements: {}, transaction });
  await transaction.commit();
} catch (err) {
  await transaction.rollback();
  throw err;
}
```

> RULE: Always use Sequelize transactions when writing to MORE THAN ONE table at the same time (e.g. insert project + insert project sections + save files).

### Standard Query Pattern

```javascript
// Raw pg (simple reads):
const { rows } = await db.query(
  "SELECT id, name FROM t_vendors WHERE deleted_at IS NULL AND id = $1",
  [vendorId]
);

// Sequelize with replacements (for dynamic values):
const [results] = await sequelize.query(
  "SELECT * FROM t_users WHERE role_id = :roleId",
  { replacements: { roleId }, type: sequelize.QueryTypes.SELECT }
);
```

---

## Database Conventions

| Convention | Example |
|---|---|
| Table prefix | `t_` — all tables start with t_ |
| Form data tables | `t_frm_{form_slug}` e.g. `t_frm_criteria` |
| Primary key naming | `{short_prefix}_id` e.g. `criteria_id`, or just `id` |
| Soft deletes | `deleted_at TIMESTAMP NULL` — never hard-delete |
| Audit columns | `created_by INT` (FK to t_users), `updated_by INT`, `created_at TIMESTAMP`, `updated_at TIMESTAMP` |
| Status column | `status VARCHAR` — values: "draft", "submit", "approved", "rejected" |
| Parent-child FK | `parent_id INT` references parent table |

---

## File Upload System

```javascript
// In route: always add multer before your controller
const multer = require("multer")();
router.post("/add",
  multer.any(),         // parse multipart, stores in req.files
  sanitizeMiddleware,   // sanitize text fields
  secureUpload,         // validate MIME type (blocks .exe, .php, etc.)
  controller.add
);

// In controller: access files
req.files  // Array of { fieldname, originalname, mimetype, buffer, size }

// Save document metadata to DB:
const { saveAndPrepareDocumentMetadata } = require("../../../helper/document.helper");
const result = await saveAndPrepareDocumentMetadata(
  req.files,           // files array
  parentId,            // parent record ID
  "uploads/project/documents",  // disk path
  req.user.user_id,    // uploader ID
  transaction          // sequelize transaction
);
// result.metadata -> array of { tdoc_id, file_path, original_name, ... }
```

File access URL: `GET /api/v1/static/{relative_path}`

---

## Error Handling

### In Every Controller

```javascript
// Template — always follow this pattern:
const myAction = async (req, res, next) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    // ... your logic ...

    await transaction.commit();
    res.json({ status: true, message: "Done", data: result });

  } catch (err) {
    if (transaction) await transaction.rollback();  // critical!
    next(CustomErrorHandler.internalServerError(err.message));
  }
};
```

### Standard Response Formats

```javascript
// Success:
res.json({ status: true, message: "Vendor added", data: { id: 42 } });

// Validation error (client mistake):
res.status(400).json({ status: false, message: "Name is required" });

// Permission error:
res.status(403).json({ message: "Access Denied" });

// Not found:
res.status(404).json({ status: false, message: "Record not found" });

// Server error (via next()):
next(CustomErrorHandler.internalServerError("DB connection failed"));
```

---

## Rate Limiting

Sensitive endpoints have rate limiters to prevent abuse:

```javascript
// Login: 10 attempts per 15 minutes per IP
const { loginLimiter } = require("../../rate-limit/login");
router.post("/login", loginLimiter, authController.login);

// Dynamic form: limits rapid form submissions
const { dynamicFormRL } = require("../../rate-limit/dynamicFormRL");
router.post("/add", dynamicFormRL, ...);

// Forget password: 5 attempts per hour
const { forgetPasswordLimiter } = require("../../rate-limit/forgetPasswordRL");
router.post("/forget-password", forgetPasswordLimiter, ...);
```

---

## Email System

```javascript
// src/email/ — uses Nodemailer + Handlebars templates
const { sendEmail } = require("../email/emailService");

await sendEmail({
  to: "user@example.com",
  subject: "Welcome to TechCSR",
  template: "welcome",     // loads from src/email/templates/welcome.hbs
  context: {               // variables injected into the template
    name: "John",
    loginUrl: "https://app.techcsr.com/login"
  }
});
```

---

## Background Jobs (Cron)

```javascript
// src/workers/ — scheduled tasks
const cron = require("node-cron");

// Example: runs every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running nightly cleanup...");
  await db.query("DELETE FROM t_access_tokens WHERE deleted_at < NOW() - INTERVAL '30 days'");
});
```

---

## Dynamic Form Backend Hooks (Form-Specific Logic)

For adding per-form business logic without touching the core controller:

```javascript
// Create: server/src/modules/dynamic-form/hooks/vendorHooks.js
const { registerBackendHook } = require("../backendHookRegistry");

registerBackendHook("vendor", {
  onAfterInsert: async ({ insertedId, payload, extraFields, req }) => {
    // Fires AFTER the vendor record is saved to DB
    // insertedId -> new vendor's primary key
    // extraFields -> any extra__fieldname fields from frontend
    // req.user.user_id -> who submitted
  },
  onAfterUpdate: async ({ updatedId, payload, extraFields, req }) => {
    // Fires AFTER the vendor record is updated in DB
  }
});
```

Then load it in `router.js`:
```javascript
require("./modules/dynamic-form/hooks/vendorHooks");
```

Full hook guide: `src/modules/dynamic-form/DEVELOPER_GUIDE.md`

---

## Common Mistakes to Avoid

| Do NOT | Do Instead |
|---|---|
| Use `res.send()` for JSON | Use `res.json()` |
| Forget `await transaction.rollback()` in catch | Always rollback in catch block |
| Hardcode user ID | Use `req.user.user_id` from auth middleware |
| Register routes in `app.js` | Register all routes in `router.js` only |
| Trust client-supplied file extension | Use `secureUpload` middleware to validate MIME type |
| Write per-form logic in the controller | Use `registerBackendHook` in a separate hook file |
| Use Sequelize for simple single-table reads | Use raw `db.query()` for simple reads |
| Use raw `db.query()` for multi-table writes | Use `sequelize.transaction()` |
| Return passwords or secrets in responses | Always exclude sensitive fields from SELECT queries |
| Allow hard deletes | Always use `deleted_at = NOW()` (soft delete) |
