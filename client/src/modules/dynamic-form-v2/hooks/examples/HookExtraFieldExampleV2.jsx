"use client";

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Input, Select, Alert } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const HookExtraFieldExampleV2 = forwardRef(({ data, mode }, ref) => {
  const [gstNumber, setGstNumber]       = useState(data?.gst_number || "");
  const [orgCategory, setOrgCategory]   = useState(data?.org_category || null);
  const [errors, setErrors]             = useState({});

  useImperativeHandle(ref, () => ({
    getData: async () => {
      const errs = {};

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

      return {
        valid: true,
        errors: {},
        data: {
          gst_number:   gstNumber.trim(),
          org_category: orgCategory,
        }
      };
    },

    reset: () => {
      setGstNumber("");
      setOrgCategory(null);
      setErrors({});
    }
  }));

  return (
    <div style={{
      background: "#f0fdf4",
      border: "1.5px solid #bbf7d0",
      borderRadius: 12,
      padding: "18px 20px",
      marginTop: 8
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 700, color: "#166534" }}>
        <InfoCircleOutlined />
        Additional Information (Hook Fields — saved with main form V2)
      </div>

      {Object.keys(errors).length > 0 && (
        <Alert
          type="error"
          message={Object.values(errors).join(" · ")}
          style={{ marginBottom: 12, borderRadius: 8 }}
          showIcon
        />
      )}

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
    </div>
  );
});

HookExtraFieldExampleV2.displayName = "HookExtraFieldExampleV2";
export default HookExtraFieldExampleV2;
