import React from "react";
import { Switch, Select, Input, Button, Tag, Space, Divider } from "antd";

export default function CalculationTabConfig({
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

  // Get available NUMERIC fields (integer or decimal) with db_field (excluding active field itself and deduplicated by db_field)
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
    <div className="tfc-val-list p-2 space-y-4">
      {/* Enable Calculation Toggle */}
      <div className={`tfc-val-row ${isEnabled ? "tfc-val-row--active" : ""}`}>
        <div className="tfc-val-left">
          <Switch checked={isEnabled} onChange={handleToggleEnable} />
          <span className="tfc-val-name font-semibold text-sm">
            Enable Calculation
          </span>
        </div>
        {isEnabled && (
          <div className="text-xs text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
            Active
          </div>
        )}
      </div>

      {isEnabled && (
        <div className="mt-4 space-y-5">
          {/* Read Only Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>👁️</span> Read-Only Field in Form
            </span>
            <Switch
              size="small"
              checked={calc?.read_only !== false}
              onChange={(checked) => updateCalc("read_only", checked)}
            />
          </div>

          {/* Calculation Formula Input */}
          <div className="tfc-field space-y-1">
            <div className="flex justify-between items-center mb-1">
              <label className="tfc-label text-xs font-bold text-slate-800 m-0 flex items-center gap-1.5">
                <span>📝</span> Calculation Formula
              </label>
              {calc?.formula && (
                <button
                  type="button"
                  onClick={() => updateCalc("formula", "")}
                  className="text-[11px] text-red-500 font-medium hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  Clear Formula
                </button>
              )}
            </div>
            <Input.TextArea
              rows={2}
              value={calc?.formula || ""}
              onChange={(e) => updateCalc("formula", e.target.value)}
              placeholder="e.g. [unit_cost] * [no_of_unit]"
              className="font-mono text-xs p-2.5 rounded-lg border-purple-200 focus:border-purple-500 shadow-2xs"
            />
            <span className="text-[11px] text-slate-400 block mt-1">
              Format: <code>[field_1] * [field_2]</code> (Click field tags or operator buttons below to insert)
            </span>
          </div>

          {/* Available Number Fields (Pills) */}
          {availableFields.length > 0 ? (
            <div className="space-y-2 mt-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>🔢</span> Available Fields (Click to insert):
              </label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                {availableFields.map((f, idx) => (
                  <Tag
                    key={`${f.id || f.db_field}_${idx}`}
                    color="purple"
                    className="cursor-pointer hover:bg-purple-100 hover:border-purple-400 font-sans py-1 px-3 text-xs flex items-center gap-1.5 transition-all shadow-2xs rounded-md"
                    onClick={() => insertTokenIntoFormula(`[${f.db_field}]`)}
                  >
                    <span className="text-purple-600 font-bold">➕</span>
                    <span className="font-semibold text-purple-900">{f.label || f.db_field}</span>
                  </Tag>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 my-2">
              ℹ️ No other Integer or Decimal fields found in section. Add Number fields to perform calculations.
            </div>
          )}

          {/* Quick Math Operators */}
          <div className="space-y-2 mt-4">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>🧮</span> Math Operators:
            </label>
            <Space wrap size={[8, 8]}>
              {[
                { label: "+ (Add)", value: "+" },
                { label: "- (Subtract)", value: "-" },
                { label: "× (Multiply)", value: "*" },
                { label: "÷ (Divide)", value: "/" },
                { label: "% (Percentage)", value: "%" },
                { label: "(", value: "(" },
                { label: ")", value: ")" },
              ].map((op) => (
                <Button
                  key={op.value}
                  size="small"
                  type="default"
                  className="font-mono font-bold text-xs bg-white hover:bg-purple-50 hover:text-purple-700 border-slate-300 shadow-2xs px-3"
                  onClick={() => insertTokenIntoFormula(op.value)}
                >
                  {op.label}
                </Button>
              ))}
            </Space>
          </div>

          <Divider className="my-4" />

          {/* User Friendly Number Type & Precision Box */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>⚙️</span> Result Format & Precision
              </span>
              <Tag color={isDecimalField ? "blue" : "gold"} className="font-semibold rounded-full px-2.5">
                {isDecimalField ? "Decimal Field" : "Integer Field"}
              </Tag>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-700 font-semibold mb-1 block">
                  Decimal Places
                </label>
                <Select
                  className="w-full"
                  value={selectedPrecision}
                  onChange={(val) => updateCalc("precision", val)}
                  options={[
                    { label: "0 — Integer (e.g. 100)", value: 0 },
                    { label: "1 — 1 Decimal (e.g. 100.5)", value: 1 },
                    { label: "2 — 2 Decimals (e.g. 100.50)", value: 2 },
                    { label: "3 — 3 Decimals (e.g. 100.500)", value: 3 },
                    { label: "4 — 4 Decimals (e.g. 100.5000)", value: 4 },
                  ]}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 font-semibold mb-1 block">
                  Rounding Mode
                </label>
                <Select
                  className="w-full"
                  value={selectedRounding}
                  onChange={(val) => updateCalc("rounding", val)}
                  options={[
                    { label: "Standard Rounding (Nearest)", value: "round" },
                    { label: "Floor (Round Down)", value: "floor" },
                    { label: "Ceil (Round Up)", value: "ceil" },
                    { label: "Exact / No Rounding", value: "exact" },
                  ]}
                />
              </div>
            </div>

            {/* Live Result Preview Box */}
            <div className="mt-2 p-2.5 bg-white border border-purple-100 rounded-lg flex items-center justify-between text-xs">
              <span className="text-purple-900 font-medium flex items-center gap-1">
                <span>💡</span> <strong className="font-semibold">Sample Result Preview:</strong>
              </span>
              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                1234.5678 ➔ {getSamplePreview()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
