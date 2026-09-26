# Dynamic Form System — Server-Side Developer Guide

> **Who is this for?** Backend developers who are new to this codebase and want to understand how the Node.js/Express server handles form submissions, list views, and how to add custom server-side logic.

---

## Technology Stack

- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL via Sequelize (raw SQL also used for complex queries)
- **Auth**: JWT Tokens validated via middleware
- **File Uploads**: Multer + custom secureUpload middleware
- **Rate Limiting**: Per-route rate limiters

---

## Server Directory Structure

```
server/
├── server.js                          <- Entry point
├── src/
│   ├── app.js                         <- Express app setup (CORS, security, middleware)
│   ├── router.js                      <- ALL route registrations in one file
│   │
│   ├── config/
│   │   ├── db.config.js               <- Sequelize DB connection
│   │   └── db.js                      <- Raw pg query helper
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js         <- JWT token validation
│   │   ├── checkPermission.middleware.js <- RBAC permission check
│   │   ├── sanitize.middleware.js     <- Input XSS sanitization
│   │   ├── secureUpload.middleware.js <- File type/size validation
│   │   └── errorHandler.middleware.js <- Global error handler
│   │
│   ├── modules/
│   │   ├── dynamic-form/              <- CORE: handles all form CRUD
│   │   ├── form-builder/              <- Configurator: build/edit form schemas
│   │   ├── master-builder/            <- Configurator: build master data tables
│   │   ├── rbac/                      <- Roles, permissions, users
│   │   ├── auth/                      <- Login, refresh token
│   │   ├── menu/                      <- Sidebar menu config
│   │   ├── approval-workflow/         <- Multi-stage approvals
│   │   ├── dashboard/                 <- Widget data
│   │   ├── dynamic-report/            <- Report builder
│   │   ├── monitoring/                <- KPI monitoring
│   │   ├── ngo/                       <- NGO approval flow
│   │   └── audit/                     <- Audit log
│   │
│   ├── helper/
│   │   ├── getFormWithSection.helper.js  <- Load form schema from DB
│   │   └── document.helper.js            <- File upload/document save helpers
│   │
│   └── services/
│       └── customErrorHandler.service.js <- Structured error responses
```

---

## How A Request Flows Through The Server

Let us trace what happens when the frontend submits a new form record:

```
POST /api/v1/admin/dynamic-form/add
Body: { form_slug: "criteria", criteria_name: "Risk Management", ... }
```

### Step 1: app.js Middleware Chain

Every request passes through these layers in order:

```
1. Helmet (security headers)
2. HTTP version check (reject HTTP/1.0)
3. Header smuggling protection (reject conflicting Content-Length + Transfer-Encoding)
4. Morgan access logger
5. CORS check (only allowed origins)
6. Host header validation
7. Body parser (JSON, max 10mb)
8. Global sanitize middleware (XSS strip)
9. authMiddleware.validateToken (JWT check for /api/v1/admin/* routes)
10. Route handler
```

### Step 2: router.js Route Match

```javascript
// router.js
app.use(["/api/v1/admin/dynamic-form", "/api/v1/dynamic-form"],
  require("./modules/dynamic-form/dynamicForm.route")
);
```

### Step 3: dynamicForm.route.js — Route + Per-Route Middleware

```javascript
router.post(
  "/add",
  dynamicFormRL,               // Rate limiter (prevents abuse)
  multer.any(),                // Parse multipart/form-data (files)
  sanitizeMiddleware,          // XSS clean again for file uploads
  secureUpload,                // Validate file type + size
  checkPermission(undefined, "add"),  // RBAC: user must have "add" permission
  dynamicFormController.add    // Controller
);
```

---

## The Dynamic Form Controller

**File:** `src/modules/dynamic-form/controller/dynamicForm.controller.js`

### ADD Flow (POST /dynamic-form/add)

```
1.  Load form schema from DB      getFormWithSection({ form_slug })
2.  Build field type maps         buildMultiSelectMaps(schema)
3.  Merge file uploads            mergeFilesIntoData(req.body, req.files)
4.  Segregate by table            segregateData(schema, mergedData)
5.  Inject audit columns          created_by = req.user.user_id
6.  Inject parent_id if child     segregated[rootTable].parent_id = req.body.parent_id
7.  Run validation rules          executeRules({ schema, segregatedData, mode: "add" })
8.  BEGIN transaction
9.  Insert root table row         insertRow(rootTable, ...)
10. Insert general sections       (each section.type === "general")
11. Insert add_more sections      (each row in section.type === "add_more")
12. Save file documents           saveAndPrepareDocumentMetadata(...)
13. COMMIT transaction
14. Extract extra__ fields        { extra__gst: "..." } -> { gst: "..." }
15. Fire onAfterInsert hook       triggerBackendHook(form_slug, "onAfterInsert", context)
16. Return success response       { status: true, message: "...", root_id: 42 }
```

### EDIT Flow (POST /dynamic-form/edit)

Same as ADD but:
- Uses `updateRow()` instead of `insertRow()`
- Injects `updated_by` instead of `created_by`
- Fires `onAfterUpdate` hook instead of `onAfterInsert`
- Skips rule validation (rules only run on add)

### LIST VIEW Flow (POST /dynamic-form/general-list-view)

```
1.  Load schema                   getFormWithSection({ form_slug })
2.  Build SELECT query            buildGeneralSelectQuery(schema, filters, pagination)
   - Determines which tables to JOIN
   - Resolves master select labels (e.g. state name from t_state)
   - Resolves created_by -> user name via JOIN on users table
   - Applies search filters
   - Applies pagination (LIMIT/OFFSET)
3.  Run raw SQL query
4.  Return { schema, rows, total_count, actions }
```

---

## Backend Hook System

**File:** `src/modules/dynamic-form/hooks/backendHookRegistry.js`

The server supports pluggable lifecycle hooks for any form slug — similar to the frontend hook system.

### Available Backend Hooks

| Hook | When It Fires | Context Available |
|---|---|---|
| `onBeforeInsert` | Before DB insert (inside transaction) | `{ payload, schema, req }` |
| `onAfterInsert` | After DB insert + commit | `{ insertedId, payload, extraFields, req }` |
| `onBeforeUpdate` | Before DB update (inside transaction) | `{ payload, existingId, schema, req }` |
| `onAfterUpdate` | After DB update + commit | `{ updatedId, payload, extraFields, req }` |

### How To Register A Backend Hook

```javascript
// Example: server/src/modules/dynamic-form/hooks/myFormHooks.js
const { registerBackendHook } = require("../backendHookRegistry");

registerBackendHook("vendor", {

  onAfterInsert: async ({ insertedId, payload, extraFields, req }) => {
    // insertedId  -> the new record's primary key (e.g. 7)
    // payload     -> the main form data that was saved
    // extraFields -> any extra__fieldname fields from the frontend hook
    // req         -> full Express request (has req.user.user_id etc.)

    console.log("New vendor created:", insertedId);

    // Example: send a notification
    await sendNotification({
      to: "admin@company.com",
      subject: "New Vendor Registered",
      body: `Vendor ID ${insertedId} was just added.`
    });
  },

  onAfterUpdate: async ({ updatedId, payload, extraFields, req }) => {
    console.log("Vendor updated:", updatedId);
  }

});
```

### Where To Load Your Hook File

Import it in the main module entry or a dedicated hook loader. For example, add at the bottom of `router.js`:

```javascript
// Load all backend hooks (add new form hooks here)
require("./modules/dynamic-form/hooks/projectHooks");
require("./modules/dynamic-form/hooks/vendorHooks");  // <- add new ones here
```

---

## extra__ Fields — Frontend to Backend Communication

When the frontend registers `getExtraFields` and the user fills in those custom fields, they are submitted as `extra__fieldname` in the form POST body.

**Frontend hook sends:**
```
extra__gst_number = "27AABCU9603R1ZX"
extra__org_category = "ngo"
```

**Controller extracts them automatically:**
```javascript
const extraFields = {};
for (const [key, value] of Object.entries(req.body)) {
  if (key.startsWith("extra__")) {
    extraFields[key.replace("extra__", "")] = value;
    // extraFields = { gst_number: "27AABCU9603R1ZX", org_category: "ngo" }
  }
}
```

**Then passes them to your hook:**
```javascript
await triggerBackendHook(form_slug, "onAfterInsert", {
  insertedId,
  payload,
  extraFields,  // <- your custom fields are here
  req
});
```

See full example: `src/modules/dynamic-form/hooks/examples/projectHooks.example.js`

---

## Adding A New API Route

### Step 1: Create your route file

```javascript
// src/modules/vendor/vendor.route.js
const express = require("express");
const router = express.Router();
const { checkPermission } = require("../../middlewares/checkPermission.middleware");

router.get("/list", checkPermission("vendor", "list"), async (req, res) => {
  res.json({ status: true, data: [] });
});

module.exports = router;
```

### Step 2: Register it in router.js

```javascript
// src/router.js
app.use(["/api/v1/admin/vendor", "/api/v1/vendor"], require("./modules/vendor/vendor.route"));
```

---

## API Endpoints Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/api/v1/admin/dynamic-form/add` | add | Create a new form record |
| POST | `/api/v1/admin/dynamic-form/edit` | edit | Update an existing record |
| POST | `/api/v1/admin/dynamic-form/general-list-view` | list | Fetch records list with schema |
| POST | `/api/v1/admin/dynamic-form/details` | edit | Fetch single record for edit |
| POST | `/api/v1/admin/dynamic-form/view` | view | Fetch single record for view |
| POST | `/api/v1/admin/dynamic-form/schema-details` | (open) | Fetch form schema only |
| POST | `/api/v1/admin/dynamic-form/master-details` | (open) | Fetch master dropdown data |
| POST | `/api/v1/admin/dynamic-form/active_inactive` | (open) | Toggle record status |
| POST | `/api/v1/admin/dynamic-form/general-export-excel` | list | Export records to Excel |

---

## Authentication & RBAC

### JWT Token Flow

```
1. User logs in   -> POST /api/v1/auth/login  -> receives JWT token
2. Token stored in frontend (cookie/localStorage)
3. Every /api/v1/admin/* request -> authMiddleware.validateToken checks token
4. req.user is populated: { user_id, role_id, company_id, ... }
```

### Permission Check

```javascript
// How checkPermission middleware works:
checkPermission(undefined, "add")
// "undefined" = uses form_slug from req.body.form_slug
// "add"       = checks if user has "add" permission for that slug

// Permissions come from the RBAC module:
// Roles -> Modules -> Actions (view, add, edit, delete, list)
```

---

## Database Conventions

| Convention | Example |
|---|---|
| Table prefix `t_` | `t_criteria`, `t_project`, `t_documents` |
| Primary key pattern | `criteria_id`, `project_id` |
| Audit columns | `created_by` (user_id FK), `updated_by`, `created_at`, `updated_at` |
| Foreign key pattern | `parent_id` for parent-child, `{field}_id` for master selects |
| Master tables | `t_state`, `t_district`, `t_schedule_vii` etc. |
| Form data tables | `t_frm_{form_slug}` e.g. `t_frm_criteria` |
| `created_by` JOIN | Backend automatically JOINs users table -> `name_created_by` alias in rows |

---

## Validation Rules

Validation is defined in the form schema (Form Builder) and executed server-side:

```javascript
// src/modules/dynamic-form/helper/ruleExecutor.helper.js
const errorBag = await executeRules({ schema, segregatedData, mode: "add" });
if (hasErrors(errorBag)) {
  return res.status(400).json({ status: false, errors: errorBag });
}
```

Rule types supported:
- `required` - field must not be empty
- `unique` - value must be unique in the table
- `min_length` / `max_length` - string length constraints
- `regex` - custom pattern validation

---

## File Upload Flow

Files are handled by Multer and stored in `uploads/` directory:

```
1. multer.any()           -> Parses multipart/form-data, puts files in req.files
2. secureUpload           -> Validates MIME type, rejects dangerous file types
3. Controller runs        -> mergeFilesIntoData(req.body, req.files)
4. After DB insert        -> saveAndPrepareDocumentMetadata(files, parentId, uploadPath, userId)
5. File saved to disk     -> uploads/project/dynamic_forms/{uuid}.{ext}
6. Metadata saved to DB   -> t_documents table
```

File access URL:
```
GET /api/v1/static/project/dynamic_forms/{filename}
```

---

## Error Handling

All controllers use `next(error)` to pass errors to the global handler:

```javascript
// Always wrap in try/catch:
try {
  // ... your logic
} catch (err) {
  if (transaction) await transaction.rollback();  // always rollback on error
  next(CustomErrorHandler.internalServerError(err.message));
}
```

**Standard error response format:**
```json
{
  "status": false,
  "message": "Something went wrong",
  "error": "..."
}
```

**Standard success response format:**
```json
{
  "status": true,
  "message": "Criteria added successfully",
  "data": { ... }
}
```

---

## Common Mistakes to Avoid

| Do NOT | Do Instead |
|---|---|
| Run DB queries outside a transaction for multi-table writes | Always use `sequelize.transaction()` and pass it to each insert/update |
| Forget to rollback on error | Always `if (transaction) await transaction.rollback()` in catch |
| Hardcode user_id in logic | Always use `req.user.user_id` from auth middleware |
| Trust file extension from client | Let `secureUpload` middleware validate MIME type |
| Register routes after `router(app)` in app.js | Always add routes in `router.js` before the 404 handler |
| Modify `dynamicForm.controller.js` for per-form logic | Use `registerBackendHook` in a separate file |
