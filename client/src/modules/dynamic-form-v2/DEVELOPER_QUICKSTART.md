# Dynamic Form System V2 — Developer Quickstart

Welcome to the simplified **Dynamic Form System V2**. This document explains how the dynamic form system works in 3 minutes.

---

## 🎯 The 3 Core Components

You only need to know **3 main components** in `client/src/modules/dynamic-form-v2/`:

```
dynamic-form-v2/
├── list-view/general-list-view/DynamicGeneralListViewV2.jsx  👉 1. List / Table View
├── add-edit/DynamicAddEditFormV2.jsx                        👉 2. Add / Edit Form Modal or Page
└── view/DynamicFormViewV2.jsx                                👉 3. Detail View + Approval Panel
```

---

## 1. List / Table View (`DynamicGeneralListViewV2`)

Renders a full-featured table with search, filters, pagination, CSV export, and action buttons:

```jsx
import DynamicGeneralListViewV2 from "@/modules/dynamic-form-v2/list-view/general-list-view/DynamicGeneralListViewV2";

export default function ProjectListPage() {
  return <DynamicGeneralListViewV2 slug="project" />;
}
```

* Automatically loads the form schema and data from the backend.
* Automatically wires up **Add**, **Edit**, **View**, **Delete**, and **Export** buttons.

---

## 2. Add & Edit Form (`DynamicAddEditFormV2`)

Renders the dynamic form sections, validations, dropdown options, calculations, and file uploaders:

```jsx
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";

export default function ProjectEditModal({ recordId, onClose, onSuccess }) {
  return (
    <DynamicAddEditFormV2
      form_slug="project"
      mode={recordId ? "edit" : "add"}
      id={recordId}
      parent_primary_key_value={recordId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
```

---

## 3. Detail & Approval View (`DynamicFormViewV2`)

Renders a clean read-only view of all filled sections, attached documents, and the **Approval Process Tracker**:

```jsx
import DynamicFormViewV2 from "@/modules/dynamic-form-v2/view/DynamicFormViewV2";

export default function ProjectDetailPage({ recordId }) {
  return (
    <DynamicFormViewV2
      form_slug="project"
      selectedData={{ id: recordId }}
      enableApproval={true}
    />
  );
}
```

---

## 🛠️ Data Helpers (`formAdapter.js`)

Converting between database records and form fields is now simple:

```js
import { recordToFormValues, formValuesToPayload } from "@/modules/dynamic-form-v2/helper/formAdapter";

// 1. Initializing form values
const initialValues = recordToFormValues(apiRecord);

// 2. Submitting form values to API
const payload = formValuesToPayload(formValues, "project");
```

---

## ⚡ Customizing Behavior (Hooks)

To add custom logic or validation for a specific form (e.g. `project` or `vendor_master`), add a hook in:
👉 [`client/src/modules/dynamic-form-v2/hooks/registerAllFormHooksV2.js`](file:///Users/bipadtarankumar/projects/nextjs/csrdynamicform/client/src/modules/dynamic-form-v2/hooks/registerAllFormHooksV2.js)
