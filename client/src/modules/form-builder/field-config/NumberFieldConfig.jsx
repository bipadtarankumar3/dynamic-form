import { Input, Select, Switch, Tabs } from "antd";
import FieldConfigLayout from "../FieldConfigLayout";
import CalculationTabConfig from "./CalculationTabConfig";
import EncryptionValidationConfig from "./EncryptionValidationConfig";
import "./css/FieldConfig.css"; // add this

export default function NumberFieldConfig({
  activeField,
  updateField,
  updateNested,
  setFields,
  errors,
  allFormFields = [],
}) {
  const handleLabel = (val) => {
    const currentLabel = activeField?.label || "";
    const currentDb = activeField?.db_field || "";
    const expectedDbFromOldLabel = currentLabel
      ?.toLowerCase()
      ?.replace(/\s+/g, "_")
      ?.replace(/[^a-z0-9_]/g, "");

    updateField("label", val);

    if (!currentDb || currentDb === expectedDbFromOldLabel) {
      const newDb = val
        ?.toLowerCase()
        ?.replace(/\s+/g, "_")
        ?.replace(/[^a-z0-9_]/g, "");
      updateField("db_field", newDb);
    }
  };

  const handleDbField = (val) => {
    const db = val
      ?.toLowerCase()
      ?.replace(/\s+/g, "_")
      ?.replace(/[^a-z0-9_]/g, "");
    updateField("db_field", db);
  };

  const blockInvalidNumKeys = (e) => {
    if (["e", "E", "+", "-", "."].includes(e?.key)) e.preventDefault();
  };

  return (
    <FieldConfigLayout>
      <Tabs
        defaultActiveKey="basic"
        className="tfc-tabs"
        items={[
          // ================= BASIC =================
          {
            key: "basic",
            label: "Basic",
            children: (
              <div className="tfc-basic-grid">
                <div className="tfc-field">
                  <label className="tfc-label">Label</label>
                  <Input
                    // className="tfc-input"
                    value={activeField?.label || ""}
                    onChange={(e) => handleLabel(e.target.value)}
                    placeholder="e.g. Name"
                  />
                  {errors?.label && (
                    <div className="error text-danger">{errors?.label}</div>
                  )}
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">
                    DB Field
                    <span className="tfc-badge">editable</span>
                  </label>
                  <Input
                    className="tfc-input tfc-input--mono"
                    value={activeField?.db_field || ""}
                    onChange={(e) => handleDbField(e.target.value)}
                    placeholder="e.g. state_id"
                  />
                  {errors?.db_field && (
                    <div className="error text-danger">{errors?.db_field}</div>
                  )}
                </div>

                <div className="tfc-field tfc-field--full">
                  <label className="tfc-label">Placeholder text</label>
                  <Input
                    // className="tfc-input"
                    value={activeField?.ui?.placeholder || ""}
                    onChange={(e) =>
                      updateNested("ui", "placeholder", e.target.value)
                    }
                    placeholder="e.g. Enter your value..."
                  />
                  {errors?.[`ui.placeholder`] && (
                    <div className="error text-danger">
                      {errors[`ui.placeholder`]}
                    </div>
                  )}
                </div>
                <div className="tfc-field fc-field--full">
                  <label className="tfc-label">Number Type</label>
                  <Select
                    className="tfc-input"
                    value={activeField?.number_type || "text"}
                    onChange={(val) => {
                      setFields((prev) =>
                        prev.map((f) => {
                          if (f.id !== activeField.id) return f;

                          return {
                            ...f,
                            number_type: val,
                            regex_type: val,
                            data_type:
                              val === "decimal"
                                ? "double precision"
                                : f.data_type,
                          };
                        }),
                      );
                    }}
                    options={[
                      { label: "Integer", value: "integer" },
                      { label: "Decimal", value: "decimal" },
                    ]}
                  />
                </div>
                <div className="tfc-field fc-field--full">
                  <label className="tfc-label">Data Type</label>
                  <Select
                    className="tfc-input"
                    disabled={activeField?.number_type === "decimal"}
                    value={activeField?.data_type || "text"}
                    onChange={(val) => updateField("data_type", val)}
                    options={[
                      { label: "Varchar", value: "varchar(255)" },
                      { label: "Integer", value: "integer" },
                      { label: "Decimal", value: "double precision" },
                    ]}
                  />
                </div>
              </div>
            ),
          },

          // ================= VALIDATION =================
          {
            key: "validation",
            label: "Validation",
            children: (
              <div className="tfc-val-list">
                {/* REQUIRED */}
                <div
                  className={`tfc-val-row ${activeField?.required ? "tfc-val-row--active" : ""}`}
                >
                  <div className="tfc-val-left">
                    <Switch
                      checked={activeField?.required}
                      onChange={(checked) => {
                        updateField("required", checked);
                      }}
                    />
                    <span className="tfc-val-name">Required</span>
                  </div>
                  {activeField.required && (
                    <div className="tfc-val-right">
                      <span className="tfc-msg-label">Message</span>
                      <Input
                        className="tfc-input tfc-input--msg"
                        placeholder="Required message"
                        value={activeField?.messages?.required || ""}
                        onChange={(e) =>
                          updateNested("messages", "required", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* MIN LENGTH */}
                <div
                  className={`tfc-val-row ${activeField?.validation?.min_length ? "tfc-val-row--active" : ""}`}
                >
                  <div className="tfc-val-left">
                    <Input
                      min={1}
                      onKeyDown={blockInvalidNumKeys}
                      type="number"
                      className="tfc-input tfc-input--num"
                      placeholder="Min"
                      value={activeField?.validation?.min_length || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateNested("validation", "min_length", val);
                      }}
                    />
                    <span className="tfc-val-name">Min length</span>
                  </div>
                  {activeField?.validation?.min_length && (
                    <div className="tfc-val-right">
                      <span className="tfc-msg-label">Message</span>
                      <Input
                        className="tfc-input tfc-input--msg"
                        placeholder="Min length message"
                        value={activeField?.messages?.min_length || ""}
                        onChange={(e) =>
                          updateNested("messages", "min_length", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* MAX LENGTH */}
                <div
                  className={`tfc-val-row ${activeField?.validation?.max_length ? "tfc-val-row--active" : ""}`}
                >
                  <div className="tfc-val-left">
                    <Input
                      min={1}
                      onKeyDown={blockInvalidNumKeys}
                      type="number"
                      className="tfc-input tfc-input--num"
                      placeholder="Max"
                      value={activeField?.validation?.max_length || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateNested("validation", "max_length", val);
                      }}
                    />
                    <span className="tfc-val-name">Max length</span>
                  </div>
                  {activeField?.validation?.max_length && (
                    <div className="tfc-val-right">
                      <span className="tfc-msg-label">Message</span>
                      <Input
                        className="tfc-input tfc-input--msg"
                        placeholder="Max length message"
                        value={activeField?.messages?.max_length || ""}
                        onChange={(e) =>
                          updateNested("messages", "max_length", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* ENCRYPTION & MASKING */}
                <EncryptionValidationConfig
                  activeField={activeField}
                  updateNested={updateNested}
                />
              </div>
            ),
          },

          // ================= CALCULATION =================
          {
            key: "calculation",
            label: "Calculation",
            children: (
              <CalculationTabConfig
                activeField={activeField}
                updateField={updateField}
                updateNested={updateNested}
                setFields={setFields}
                allFormFields={allFormFields}
              />
            ),
          },
        ]}
      />
    </FieldConfigLayout>
  );
}
