import { Input, Select, Switch, Tabs } from "antd";
import FieldConfigLayout from "../FieldConfigLayout";
import EncryptionValidationConfig from "./EncryptionValidationConfig";
import "./css/FieldConfig.css";

export default function TextAreaFieldConfig({
  activeField,
  updateField,
  updateNested,
  errors,
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

  const updateAutoSize = (key, value) => {
    const currentUi = activeField?.ui || {};
    const currentAutoSize = currentUi.auto_size || {};
    updateField("ui", {
      ...currentUi,
      auto_size: {
        ...currentAutoSize,
        [key]: value !== "" && value !== null && value !== undefined ? Number(value) : undefined,
      },
    });
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
                    value={activeField?.label || ""}
                    onChange={(e) => handleLabel(e.target.value)}
                    placeholder="e.g. Remark"
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
                    value={activeField?.ui?.placeholder || ""}
                    onChange={(e) =>
                      updateNested("ui", "placeholder", e.target.value)
                    }
                    placeholder="e.g. Enter Remarks"
                  />
                  {errors?.[`ui.placeholder`] && (
                    <div className="error text-danger">
                      {errors[`ui.placeholder`]}
                    </div>
                  )}
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">Data Type</label>
                  <Select
                    className="tfc-input"
                    value={activeField?.data_type || "text"}
                    onChange={(val) => updateField("data_type", val)}
                    options={[
                      { label: "Text", value: "text" },
                      { label: "Varchar", value: "varchar(255)" },
                    ]}
                  />
                  {errors?.data_type && (
                    <div className="error text-danger">{errors?.data_type}</div>
                  )}
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">Rows</label>
                  <Input
                    type="number"
                    min={1}
                    onKeyDown={blockInvalidNumKeys}
                    value={activeField?.ui?.rows ?? 4}
                    onChange={(e) =>
                      updateNested(
                        "ui",
                        "rows",
                        e.target.value ? Number(e.target.value) : 4
                      )
                    }
                    placeholder="4"
                  />
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">Auto Size (Min Rows)</label>
                  <Input
                    type="number"
                    min={1}
                    onKeyDown={blockInvalidNumKeys}
                    value={activeField?.ui?.auto_size?.minRows ?? 3}
                    onChange={(e) => updateAutoSize("minRows", e.target.value)}
                    placeholder="3"
                  />
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">Auto Size (Max Rows)</label>
                  <Input
                    type="number"
                    min={1}
                    onKeyDown={blockInvalidNumKeys}
                    value={activeField?.ui?.auto_size?.maxRows ?? 6}
                    onChange={(e) => updateAutoSize("maxRows", e.target.value)}
                    placeholder="6"
                  />
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">Is Text Editor?</label>
                  <Select
                    className="tfc-input"
                    value={activeField?.ui?.is_text_editor || activeField?.is_text_editor ? "yes" : "no"}
                    onChange={(val) => {
                      const isEditor = val === "yes";
                      updateNested("ui", "is_text_editor", isEditor);
                      updateField("is_text_editor", isEditor);
                    }}
                    options={[
                      { label: "No (Standard Text Area)", value: "no" },
                      { label: "Yes (Rich Text Editor)", value: "yes" },
                    ]}
                  />
                </div>

                <div className="tfc-field tfc-field--full flex items-center gap-2 mt-2">
                  <Switch
                    checked={Boolean(activeField?.ui?.max_length_hint)}
                    onChange={(checked) =>
                      updateNested("ui", "max_length_hint", checked)
                    }
                  />
                  <span className="tfc-label mb-0">Show Max Length Hint / Character Count</span>
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
        ]}
      />
    </FieldConfigLayout>
  );
}
