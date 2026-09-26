"use client";
// client/src/modules/dynamic-form/hooks/examples/HookExtraFieldExample.jsx
// ============================================================
// EXAMPLE: How to build a hook-injected field that participates
// in the main form's submit pipeline via extraFieldsRef.
//
// Register in registerAllFormHooks.js like:
//
//   import HookExtraFieldExample from "./examples/HookExtraFieldExample";
//   registerDynamicFormHook("your_form_slug", {
//     getExtraFields: ({ mode, data, extraFieldsRef }) => (
//       <HookExtraFieldExample ref={extraFieldsRef} data={data} mode={mode} />
//     )
//   });
//
// When the main form Submit button is clicked:
//   → DynamicAddEditForm calls extraFieldsRef.current.getData()
//   → This component validates and returns { valid, data, errors }
//   → Data is appended to FormData as extra__<fieldname>
//   → Backend receives it alongside normal form fields
// ============================================================

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Input, Select, Alert } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const HookExtraFieldExample = forwardRef(({ data, mode }, ref) => {
  // ── Local state for hook-owned fields ──────────────────────────────────
  const [gstNumber, setGstNumber]       = useState(data?.gst_number || "");
  const [orgCategory, setOrgCategory]   = useState(data?.org_category || null);
  const [errors, setErrors]             = useState({});

  // ── Expose getData() so DynamicAddEditForm can call it on submit ────────
  useImperativeHandle(ref, () => ({
    /**
     * Called automatically by DynamicAddEditForm during submit.
     * Must return: { valid: boolean, data: object, errors: object }
     */
    getData: async () => {
      const errs = {};

      // Validation
      if (!gstNumber || gstNumber.trim().length < 5) {
        errs.gst_number = "GST Number must be at least 5 characters.";
      }
      if (!orgCategory) {
        errs.org_category = "Organisation Category is required.";
      }

      setErrors(errs);

      if (Object.keys(errs).length > 0) {
        return { valid: false, data: {}, errors: errs };
      }

      // Return data — keys will be submitted as extra__gst_number, extra__org_category
      return {
        valid: true,
        errors: {},
        data: {
          gst_number:   gstNumber.trim(),
          org_category: orgCategory,
        }
      };
    },

    /** Optional: reset the hook fields */
    reset: () => {
      setGstNumber("");
      setOrgCategory(null);
      setErrors({});
    }
  }));

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "#f0fdf4",
      border: "1.5px solid #bbf7d0",
      borderRadius: 12,
      padding: "18px 20px",
      marginTop: 8
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 700, color: "#166534" }}>
        <InfoCircleOutlined />
        Additional Information (Hook Fields — saved with main form)
      </div>

      {/* Validation alerts */}
      {Object.keys(errors).length > 0 && (
        <Alert
          type="error"
          message={Object.values(errors).join(" · ")}
          style={{ marginBottom: 12, borderRadius: 8 }}
          showIcon
        />
      )}

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
            GST / Tax Number <span style={{ color: "red" }}>*</span>
          </label>
          <Input
            value={gstNumber}
            onChange={e => setGstNumber(e.target.value)}
            placeholder="e.g. 27AABCU9603R1ZX"
            status={errors.gst_number ? "error" : ""}
            style={{ borderRadius: 7 }}
          />
          {errors.gst_number && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{errors.gst_number}</div>}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
            Organisation Category <span style={{ color: "red" }}>*</span>
          </label>
          <Select
            value={orgCategory}
            onChange={setOrgCategory}
            placeholder="Select category"
            style={{ width: "100%" }}
            status={errors.org_category ? "error" : ""}
            options={[
              { label: "NGO / Non-Profit", value: "ngo" },
              { label: "Private Limited",  value: "pvt_ltd" },
              { label: "Government Body",  value: "govt" },
              { label: "Section 8 Company", value: "sec8" },
            ]}
          />
          {errors.org_category && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 3 }}>{errors.org_category}</div>}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: "#6b7280" }}>
        💡 These fields are managed by a hook and saved automatically when you click the main <strong>Submit</strong> button.
      </div>
    </div>
  );
});

HookExtraFieldExample.displayName = "HookExtraFieldExample";
export default HookExtraFieldExample;
