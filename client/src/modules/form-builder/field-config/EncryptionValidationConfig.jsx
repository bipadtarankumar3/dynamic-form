import React from "react";
import { Switch, Select } from "antd";

export default function EncryptionValidationConfig({ activeField, updateNested }) {
  return (
    <div
      className={`tfc-val-row ${activeField?.validation?.is_encrypted ? "tfc-val-row--active" : ""}`}
      style={{ flexDirection: "column", alignItems: "flex-start" }}
    >
      <div className="tfc-val-left" style={{ width: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch
            checked={activeField?.validation?.is_encrypted || false}
            onChange={(checked) => {
              updateNested("validation", "is_encrypted", checked);
              if (!checked) {
                updateNested("validation", "mask_type", undefined);
              } else if (!activeField?.validation?.mask_type) {
                updateNested("validation", "mask_type", "aadhaar");
              }
            }}
          />
          <span className="tfc-val-name" style={{ fontWeight: 600, color: "#4f46e5" }}>
            🔒 Encrypt Data (pgcrypto)
          </span>
        </div>
      </div>

      {activeField?.validation?.is_encrypted && (
        <div style={{ marginTop: 10, width: "100%", paddingLeft: 34 }}>
          <div style={{ fontSize: 12, marginBottom: 4, color: "#64748b", fontWeight: 500 }}>
            View Mode Masking Format
          </div>
          <Select
            style={{ width: "100%" }}
            value={activeField?.validation?.mask_type || "aadhaar"}
            onChange={(val) => updateNested("validation", "mask_type", val)}
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
