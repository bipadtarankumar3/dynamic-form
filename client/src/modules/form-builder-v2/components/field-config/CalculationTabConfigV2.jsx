import React from "react";
import { Switch, Select, Input, Button, Tag, Space, Divider } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { validateFormula } from "@/modules/dynamic-form-v2/add-edit/add-more-section/helper/calculation.helper";

export default function CalculationTabConfigV2({
  activeField,
  updateField,
  updateNested,
  allFormFields = [],
}) {
  const calc = activeField?.calculation || {};
  const isEnabled = !!calc?.enabled;

  const updateCalc = (key, value) => {
    updateNested("calculation", key, value);
  };

  const handleToggleEnable = (checked) => {
    const isDecimal = activeField?.number_type === "decimal" || activeField?.data_type === "double precision";
    const currentCalc = activeField?.calculation || {};

    const updatedCalc = checked
      ? {
          ...currentCalc,
          enabled: true,
          type: "expression",
          read_only: currentCalc.read_only !== undefined ? currentCalc.read_only : true,
          precision: currentCalc.precision !== undefined ? currentCalc.precision : (isDecimal ? 2 : 0),
          rounding: currentCalc.rounding || "round",
          formula: currentCalc.formula || "",
        }
      : {
          ...currentCalc,
          enabled: false,
        };

    if (typeof updateField === "function") {
      updateField("calculation", updatedCalc);
    } else {
      updateNested("calculation", "enabled", checked);
    }
  };

  // Get available NUMERIC fields (integer or decimal) with db_field (excluding active field itself)
  const availableFields = React.useMemo(() => {
    const seen = new Set();
    const list = [];
    (allFormFields || []).forEach((f) => {
      const isNumeric =
        f?.type === "number" ||
        f?.number_type === "integer" ||
        f?.number_type === "decimal" ||
        f?.data_type === "integer" ||
        f?.data_type === "double precision" ||
        f?.data_type === "numeric" ||
        f?.data_type === "decimal" ||
        f?.calculation?.enabled;

      if (
        isNumeric &&
        f?.db_field &&
        f?.id !== activeField?.id &&
        !seen.has(f.db_field)
      ) {
        seen.add(f.db_field);
        list.push(f);
      }
    });
    return list;
  }, [allFormFields, activeField?.id]);

  const availableTokens = React.useMemo(() => {
    return availableFields.map((f) => f.db_field || f.id).filter(Boolean);
  }, [availableFields]);

  const formulaValidation = React.useMemo(() => {
    if (!isEnabled) return { isValid: true };
    return validateFormula(calc?.formula, availableTokens);
  }, [isEnabled, calc?.formula, availableTokens]);

  const insertTokenIntoFormula = (token) => {
    const currentFormula = calc?.formula || "";
    const space = currentFormula && !currentFormula.endsWith(" ") ? " " : "";
    updateCalc("formula", `${currentFormula}${space}${token} `);
  };

  const isDecimalField =
    activeField?.number_type === "decimal" ||
    activeField?.data_type === "double precision";

  const selectedPrecision =
    calc?.precision !== undefined ? calc.precision : isDecimalField ? 2 : 0;
  const selectedRounding = calc?.rounding || "round";

  // Calculate live preview sample
  const sampleInput = 1234.5678;
  const getSamplePreview = () => {
    const factor = Math.pow(10, selectedPrecision);
    let result = sampleInput;
    if (selectedPrecision === 0) {
      if (selectedRounding === "floor") result = Math.floor(sampleInput);
      else if (selectedRounding === "ceil") result = Math.ceil(sampleInput);
      else result = Math.round(sampleInput);
      return String(result);
    }
    if (selectedRounding === "floor") result = Math.floor(sampleInput * factor) / factor;
    else if (selectedRounding === "ceil") result = Math.ceil(sampleInput * factor) / factor;
    else result = Math.round(sampleInput * factor) / factor;
    return result.toFixed(selectedPrecision);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>
      {/* Enable Calculation Toggle Box */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderRadius: 10,
          border: isEnabled ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
          background: isEnabled ? "#eef2ff" : "#f8fafc",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Switch checked={isEnabled} onChange={handleToggleEnable} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
            Enable Calculation
          </span>
        </div>
        {isEnabled && (
          <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700, margin: 0 }}>
            Active
          </Tag>
        )}
      </div>

      {isEnabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Read-Only Toggle Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              👁️ Read-Only Field in Form
            </span>
            <Switch
              size="small"
              checked={calc?.read_only !== false}
              onChange={(checked) => updateCalc("read_only", checked)}
            />
          </div>

          {/* Formula Textarea Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <CalculatorOutlined style={{ color: "#4f46e5" }} /> Calculation Formula
              </span>
              {calc?.formula && (
                <button
                  type="button"
                  onClick={() => updateCalc("formula", "")}
                  style={{
                    fontSize: 11,
                    color: "#ef4444",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 4px",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <ClearOutlined style={{ fontSize: 10 }} /> Clear Formula
                </button>
              )}
            </div>

            <Input.TextArea
              rows={3}
              status={isEnabled && !formulaValidation.isValid ? "error" : ""}
              value={calc?.formula || ""}
              onChange={(e) => updateCalc("formula", e.target.value)}
              placeholder="e.g. [unit_cost] * [number_of_unit]"
              style={{
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: 12.5,
                borderRadius: 8,
                borderColor:
                  isEnabled && !formulaValidation.isValid
                    ? "#ef4444"
                    : isEnabled && formulaValidation.isValid && calc?.formula?.trim()
                    ? "#22c55e"
                    : "#cbd5e1",
                backgroundColor: "#ffffff",
                padding: "8px 10px",
                boxShadow:
                  isEnabled && !formulaValidation.isValid
                    ? "0 0 0 2px rgba(239, 68, 68, 0.12)"
                    : isEnabled && formulaValidation.isValid && calc?.formula?.trim()
                    ? "0 0 0 2px rgba(34, 197, 94, 0.12)"
                    : "none",
              }}
            />

            {isEnabled && !formulaValidation.isValid && (
              <div
                style={{
                  fontSize: 11.5,
                  color: "#b91c1c",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  fontWeight: 500,
                  background: "#fef2f2",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid #fecaca",
                  lineHeight: 1.45,
                }}
              >
                <ExclamationCircleOutlined style={{ fontSize: 13, color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
                <span>{formulaValidation.error}</span>
              </div>
            )}
            {isEnabled && formulaValidation.isValid && calc?.formula?.trim() && (
              <div
                style={{
                  fontSize: 11.5,
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 500,
                  background: "#f0fdf4",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #bbf7d0",
                }}
              >
                <CheckCircleOutlined style={{ fontSize: 13, color: "#22c55e", flexShrink: 0 }} />
                <span>Formula is valid and ready to calculate.</span>
              </div>
            )}

            <div style={{ fontSize: 11, color: "#64748b" }}>
              Format: <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 4, color: "#4f46e5" }}>[field_1] * [field_2]</code> (Click fields or operators below to insert)
            </div>
          </div>

          {/* Available Fields Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
              🔢 Available Fields (Click to insert):
            </label>
            {availableFields.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto", padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                {availableFields.map((f, idx) => (
                  <Tag
                    key={`${f.id || f.db_field}_${idx}`}
                    color="purple"
                    style={{
                      cursor: "pointer",
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      margin: 0,
                    }}
                    onClick={() => insertTokenIntoFormula(`[${f.db_field}]`)}
                  >
                    <PlusOutlined style={{ fontSize: 10 }} />
                    {f.label || f.db_field}
                  </Tag>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', padding: 10, borderRadius: 8, border: '1px solid #fde68a' }}>
                ℹ️ No other Numeric fields found in section. Add Number fields to perform calculations.
              </div>
            )}
          </div>

          {/* Math Operators */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
              🧮 Math Operators:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {[
                { label: "+ (Add)", value: "+" },
                { label: "- (Sub)", value: "-" },
                { label: "× (Mul)", value: "*" },
                { label: "÷ (Div)", value: "/" },
                { label: "% (Mod)", value: "%" },
                { label: "( (Left)", value: "(" },
                { label: ") (Right)", value: ")" },
              ].map((op) => (
                <Button
                  key={op.value}
                  size="small"
                  onClick={() => insertTokenIntoFormula(op.value)}
                  style={{ borderRadius: 6, fontWeight: 700, fontFamily: "monospace", fontSize: 11.5 }}
                >
                  {op.label}
                </Button>
              ))}
            </div>
          </div>

          <Divider style={{ margin: "4px 0" }} />

          {/* Format & Precision Settings */}
          <div style={{ background: "#ffffff", padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                ⚙️ Result Format & Precision
              </span>
              <Tag color={isDecimalField ? "blue" : "gold"} style={{ borderRadius: 6, margin: 0, fontWeight: 600 }}>
                {isDecimalField ? "Decimal" : "Integer"}
              </Tag>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                  Decimal Places
                </label>
                <Select
                  style={{ width: "100%" }}
                  value={selectedPrecision}
                  onChange={(val) => updateCalc("precision", val)}
                  options={[
                    { label: "0 (Integer)", value: 0 },
                    { label: "1 Decimal", value: 1 },
                    { label: "2 Decimals", value: 2 },
                    { label: "3 Decimals", value: 3 },
                    { label: "4 Decimals", value: 4 },
                  ]}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                  Rounding Mode
                </label>
                <Select
                  style={{ width: "100%" }}
                  value={selectedRounding}
                  onChange={(val) => updateCalc("rounding", val)}
                  options={[
                    { label: "Nearest", value: "round" },
                    { label: "Floor (Down)", value: "floor" },
                    { label: "Ceil (Up)", value: "ceil" },
                    { label: "Exact", value: "exact" },
                  ]}
                />
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6, fontSize: 11, color: "#475569", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Sample Preview (1234.5678):</span>
              <strong style={{ color: "#4f46e5", fontFamily: "monospace", fontSize: 12 }}>{getSamplePreview()}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
