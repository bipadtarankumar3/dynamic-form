# Dynamic Form System — Developer Guide

> **Who is this for?** Any developer who is new to this codebase and wants to understand how the admin list pages work and how to customize them.

---

## 🗂️ What Is The Dynamic Form System?

The **Dynamic Form System** is a plug-and-play framework that automatically renders list views, add/edit forms, and view forms for any database entity — driven entirely by a **form schema** stored in the backend.

You do **NOT** need to write a new page for every module. Instead, you:

1. Configure the form schema in the backend Form Builder.
2. Optionally register a hook in `registerAllFormHooks.js` to customize behavior.

---

## 🔁 How A Page Loads — Step By Step

Let us trace what happens when you hit:

```
http://localhost:3000/techcsr-csrproduct/admin/masters/criteria/
```

---

### Step 1: URL to Next.js Route Match

```
src/app/(admin)/admin/masters/[slug]/page.js
                                     ^
                               slug = "criteria"
```

The route file `page.js` does only **one thing**:

```javascript
// src/app/(admin)/admin/masters/[slug]/page.js

export default function DynamicMasterPage() {
  const params = useParams();
  const slug = params?.slug;  // "criteria"

  return <DynamicGeneralListView form_slug="criteria" />;
}
```

Similarly for forms:
```
/admin/forms/request_for_proposal/  ->  src/app/(admin)/admin/forms/[...slug]/page.js
```

---

### Step 2: DynamicGeneralListView — The 4-Step Pipeline

**File:** `src/modules/dynamic-form/list-view/general-list-view/DynamicGeneralListView.jsx`

This is the **core engine**. It runs a 4-step pipeline every time:

```
STEP 1 -> Check fullyCustomPage hook      (developer has 100% control)
    | (if not registered)
STEP 2 -> Fetch schema + records from API (automatic)
    |
STEP 3 -> Check customPage hook           (developer controls UI, data pre-fetched)
    | (if not registered)
STEP 4 -> Render default Table/Card view  (fully automatic)
```

---

#### STEP 1 — fullyCustomPage Hook

```javascript
const earlyFormHooks = getDynamicFormHooks("criteria");

if (earlyFormHooks?.fullyCustomPage) {
  return earlyFormHooks.fullyCustomPage({ form_slug, searchParams, decoded, parent_id });
}
// If this returns something -> renders it and STOPS here.
// Developer controls EVERYTHING including API calls.
```

---

#### STEP 2 — Fetch API

```javascript
// Calls:
POST /api/dynamic-form/general-list-view
Body: { form_slug: "criteria", filters: {}, pagination: { current_page: 1, page_size: 10 } }

// Response sets:
setSchema(...)   // form definition
setRows(...)     // database records
setActions(...)  // action buttons config
setTotal(...)    // record count
setColumns(...)  // built via buildColumnsOptimized(schema, ...)
```

**File:** `src/services/dynamicForm-service.js`

---

#### STEP 3 — customPage Hook

```javascript
const formHooks = getDynamicFormHooks("criteria");
const customPageFn = formHooks?.customPage;

if (customPageFn) {
  // Developer gets pre-fetched data passed in as props:
  return customPageFn({
    form_slug, schema, columns, actions, rows,
    dataFetchLoading, fetchData, perms,
    handleOpenDynamicAddEditForm,
    handleOpenDynamicViewForm,
    handleOpenChildrenAddEditForm
  });
}
// The Add/Edit/View modals still pop up automatically!
```

---

#### STEP 4 — Default Table / Card View

If no hooks are registered, automatically renders:
- Search bar + view toggle (Table / Grid)
- "+ Add New" button (if user has "add" permission)
- GeneralTableRender (table mode)
- DefaultGridCardRender (card/grid mode)
- DynamicFormModals (add/edit/view modal)

---

## 🔌 How To Register Hooks

**File:** `src/modules/dynamic-form/hooks/registerAllFormHooks.js`

This is the **single file all developers edit** to add custom behavior.

```javascript
import { registerDynamicFormHook } from "./dynamicFormHookRegistry";

registerDynamicFormHook("your_form_slug", {
  // hooks here...
});
```

---

## Available Hooks Reference

### fullyCustomPage — Full Page Override

Developer controls everything including data fetching.

```javascript
registerDynamicFormHook("my_form", {
  fullyCustomPage: ({ form_slug, searchParams }) => {
    return <MyFullyCustomPage />;
  }
});
```

---

### customPage — Custom UI, Auto Data

Data is pre-fetched and passed in as props.

```javascript
registerDynamicFormHook("project", {
  customPage: (props) => <ProjectCustomListPage {...props} />
});
```

Props you receive:

| Prop | Type | Description |
|---|---|---|
| form_slug | string | The form slug |
| schema | object | Full form schema from backend |
| rows | array | Database records |
| columns | array | Pre-built column definitions with getValue() |
| actions | array | Action button configs from Form Builder |
| perms | array | User permissions e.g. ["view","edit","add"] |
| dataFetchLoading | boolean | Loading state |
| fetchData | function | Call to refresh records |
| handleOpenDynamicAddEditForm | function | Opens Add/Edit modal |
| handleOpenDynamicViewForm | function | Opens View modal |
| handleOpenChildrenAddEditForm | function | Opens child form modal |

---

### getRowActions — Custom Action Menu Items

```javascript
registerDynamicFormHook("request_for_proposal", {
  getRowActions: ({ row, defaultActions, perms }) => {
    const customItems = [...defaultActions]; // start with default View/Edit/Delete

    if (row.status === "draft") {
      customItems.push({
        key: "submit_rfp",
        label: <span>Submit RFP</span>,
        onClick: () => alert("Submitting RFP #" + row.id)
      });
    }

    return customItems;
  }
});
```

---

### getColumns — Inject/Override Table Columns

```javascript
import { insertColumn } from "./dynamicFormHookRegistry";

registerDynamicFormHook("monthly_review_meeting", {
  getColumns: ({ defaultColumns }) => {
    const myColumn = {
      key: "amount",
      label: "Amount",
      getValue: (row) => row.amount ? row.amount.toLocaleString("en-IN") : "-"
    };
    return insertColumn(defaultColumns, { ...myColumn, position: { before: "remarks" } });
  }
});
```

insertColumn position options:
- "first" — add at the beginning
- { before: "field_name" } — insert before a column
- { after: "field_name" } — insert after a column
- default — inserts before the Actions column

---

### getExtraFields — Inject Custom Fields Into Form

```javascript
registerDynamicFormHook("implementation_partner", {
  getExtraFields: ({ form_slug, mode, data, position, fieldDbField }) => {
    // position = "before" | "after" | "after_all_sections"
    // fieldDbField = current field db_field name

    if (position === "after_all_sections") {
      return <div>My extra content at the bottom of the form</div>;
    }

    if (position === "before" && fieldDbField === "remarks") {
      return <Input placeholder="Custom field before remarks" />;
    }

    return null;
  }
});
```

---

### getListHeader — Custom Header Above List

```javascript
registerDynamicFormHook("monitoring", {
  getListHeader: ({ parent_id, parent_slug }) => {
    if (!parent_id) return null;
    return <ProjectHeaderCard projectId={parent_id} />;
  }
});
```

---

### onBeforeSubmit — Transform Data Before Saving

```javascript
registerDynamicFormHook("my_form", {
  onBeforeSubmit: async (formData) => {
    formData.status = formData.status || "draft";
    return formData;
  }
});
```

---

### onAfterSubmit — Run Logic After Save

```javascript
registerDynamicFormHook("my_form", {
  onAfterSubmit: async (result, formData) => {
    console.log("Saved!", result);
  }
});
```

---

## 📁 Key File Map

```
src/
├── app/
│   └── (admin)/admin/
│       ├── masters/[slug]/page.js              <- Entry: /admin/masters/criteria/
│       └── forms/[...slug]/page.js             <- Entry: /admin/forms/project/
│
├── modules/dynamic-form/
│   ├── DEVELOPER_GUIDE.md                      <- You are here
│   │
│   ├── hooks/
│   │   ├── registerAllFormHooks.js             <- EDIT THIS to customize any form
│   │   └── dynamicFormHookRegistry.js          <- Core registry (do not modify)
│   │
│   ├── list-view/general-list-view/
│   │   ├── DynamicGeneralListView.jsx          <- Core 4-step engine
│   │   ├── GeneralTableRender.jsx              <- Default table view
│   │   ├── helper/
│   │   │   └── buildColumnWithData.helper.js  <- Column builder from schema
│   │   └── components/
│   │       ├── DynamicFormModals.jsx           <- Add/Edit/View modal manager
│   │       └── DefaultGridCardRender.jsx       <- Default card grid view
│   │
│   ├── add-edit/DynamicAddEditForm.jsx         <- Add/Edit form renderer
│   └── view/DynamicFormView.jsx                <- View form renderer
│
├── modules/project/
│   └── ProjectCustomListPage.jsx               <- Example customPage for "project"
│
└── services/
    └── dynamicForm-service.js                  <- API calls for list, schema, etc.
```

---

## 🚀 How To Add A Custom Page — 3-Step Recipe

Scenario: You want a custom card layout for the "vendor" form slug.

### Step 1: Create your custom page component

```javascript
// src/modules/vendor/VendorCustomListPage.jsx
"use client";
import React from "react";

export default function VendorCustomListPage({
  schema, rows, dataFetchLoading, fetchData,
  perms, handleOpenDynamicAddEditForm, handleOpenDynamicViewForm
}) {
  if (dataFetchLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{schema?.title || "Vendors"}</h2>
      {rows.map((row) => (
        <div key={row.id}>{row.name}</div>
      ))}
    </div>
  );
}
```

### Step 2: Register the hook

```javascript
// src/modules/dynamic-form/hooks/registerAllFormHooks.js

import VendorCustomListPage from "@/modules/vendor/VendorCustomListPage";

registerDynamicFormHook("vendor", {
  customPage: (props) => <VendorCustomListPage {...props} />
});
```

### Step 3: Done!

Visit /admin/masters/vendor/ — your component renders automatically.
The Add/Edit/View modals still work without any extra code.

---

## 🔐 Permissions System

Permissions are checked via `hasModulePermissions(formSlug)` which returns an array like:

```javascript
["view", "add", "edit", "delete"]
```

Use them in your custom page:

```javascript
{perms.includes("add") && (
  <Button onClick={() => handleOpenDynamicAddEditForm({ mode: "add" })}>
    + Add New
  </Button>
)}
```

---

## ⚠️ Common Mistakes to Avoid

| Do NOT | Do Instead |
|---|---|
| Call hooks inside useMemo or useEffect | Call hooks at the top level of the component |
| Import with relative ../../ paths from deep folders | Use @/modules/... alias |
| Create a brand new page for every form | Register a customPage hook in registerAllFormHooks.js |
| Hardcode column labels | Use schema?.title and schema?.sections[].fields[].label |
| Pass payload as first arg to dynamicGeneralListViewAPI | Pass url first, then payload |

---

## 🧩 Currently Registered Hooks

| Form Slug | Hook | Effect |
|---|---|---|
| project | customPage | Renders ProjectCustomListPage with card grid and filters |
| request_for_proposal | getRowActions | Adds "Float RFP" / "View Proposals" to action menu |
| implementation_partner | getRowActions, getExtraFields, getColumns | NGO approval action and extra form fields |
| partner_due_dilligence | getRowActions | Adds "Quick Scorecard Review" action |
| monitoring | getListHeader, getExtraFields | Shows KPI tracking section inside the form |
| monthly_review_meeting | getExtraFields, getColumns | Injects Amount, DOB, and GST fields |
| mou, pan, deviation, project_closure | getListHeader | Shows ProjectHeaderCard above child list |
