import React from "react";
import { Switch, Select } from "antd";

export default function EncryptionValidationConfigV2({ activeField, updateNested, updateField, onUpdateField }) {
  const isEncrypted = !!activeField?.validation?.is_encrypted;

  const handleToggle = (checked) => {
    const newValidation = {
      ...(activeField?.validation || {}),
      is_encrypted: checked,
      mask_type: checked ? (activeField?.validation?.mask_type || "aadhaar") : undefined,
    };

    if (typeof onUpdateField === "function") {
      onUpdateField({ ...activeField, validation: newValidation });
    } else if (typeof updateField === "function") {
      updateField("validation", newValidation);
    } else if (typeof updateNested === "function") {
      updateNested("validation", "is_encrypted", checked);
    }
  };

  const handleMaskChange = (val) => {
    const newValidation = {
      ...(activeField?.validation || {}),
      mask_type: val,
    };

    if (typeof onUpdateField === "function") {
      onUpdateField({ ...activeField, validation: newValidation });
    } else if (typeof updateField === "function") {
      updateField("validation", newValidation);
    } else if (typeof updateNested === "function") {
      updateNested("validation", "mask_type", val);
    }
  };

  return (
    <div
      className={`tfc-val-row ${isEncrypted ? "tfc-val-row--active" : ""}`}
      style={{ flexDirection: "column", alignItems: "flex-start" }}
    >
      <div className="tfc-val-left" style={{ width: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch
            checked={isEncrypted}
            onChange={handleToggle}
          />
          <span className="tfc-val-name" style={{ fontWeight: 600, color: "#4f46e5" }}>
            🔒 Encrypt Data (pgcrypto)
          </span>
        </div>
      </div>

      {isEncrypted && (
        <div style={{ marginTop: 10, width: "100%", paddingLeft: 34 }}>
          <div style={{ fontSize: 12, marginBottom: 4, color: "#64748b", fontWeight: 500 }}>
            View Mode Masking Format
          </div>
          <Select
            style={{ width: "100%" }}
            value={activeField?.validation?.mask_type || "aadhaar"}
            onChange={handleMaskChange}
            options={[
              { label: "Aadhaar / Mobile (Last 4 digits visible: ********9012)", value: "aadhaar" },
              { label: "Partial Masking (First char show, next *: b*u*c*e / b*****@domain.com)", value: "partial" },
              { label: "Full Masking (All masked: ************)", value: "full" },
            ]}
          />
        </div>
      )}
    </div>
  );
}
