import { Input, Select, Switch, Tabs, DatePicker } from "antd";
import FieldConfigLayout from "../FieldConfigLayout";
import "./css/FieldConfig.css";
import dayjs from "dayjs";

export default function DateFieldConfig({
  activeField,
  updateField,
  updateNested,
  setFields,
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
                {/* LABEL */}
                <div className="tfc-field">
                  <label className="tfc-label">Label</label>
                  <Input
                    value={activeField?.label || ""}
                    onChange={(e) => handleLabel(e.target.value)}
                    placeholder="e.g. Start Date"
                  />
                  {errors?.label && (
                    <div className="error text-danger">{errors?.label}</div>
                  )}
                </div>

                {/* DB FIELD */}
                <div className="tfc-field">
                  <label className="tfc-label">
                    DB Field <span className="tfc-badge">editable</span>
                  </label>
                  <Input
                    placeholder="e.g. state_id"
                    className="tfc-input tfc-input--mono"
                    value={activeField?.db_field || ""}
                    onChange={(e) => handleDbField(e.target.value)}
                  />
                  {errors?.db_field && (
                    <div className="error text-danger">{errors?.db_field}</div>
                  )}
                </div>

                {/* PLACEHOLDER */}
                <div className="tfc-field tfc-field--full">
                  <label className="tfc-label">Placeholder</label>
                  <Input
                    value={activeField?.ui?.placeholder || ""}
                    onChange={(e) =>
                      updateNested("ui", "placeholder", e.target.value)
                    }
                    placeholder="e.g. Select date"
                  />
                  {errors?.[`ui.placeholder`] && (
                    <div className="error text-danger">
                      {errors[`ui.placeholder`]}
                    </div>
                  )}
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
                  className={`tfc-val-row ${
                    activeField?.required ? "tfc-val-row--active" : ""
                  }`}
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

                {/* MIN DATE */}
                <div className="tfc-val-row">
                  <div>
                    <div className="tfc-val-left">
                      <span className="tfc-val-name">Min Date</span>
                    </div>

                    <div className="tfc-val-right flex gap-2">
                      <Select
                        allowClear
                        value={
                          activeField?.validation?.min_date_type || undefined
                        }
                        placeholder="Select"
                        style={{ width: 130 }}
                        onChange={(val) => {
                          setFields((prev) =>
                            prev.map((f) => {
                              if (f.id !== activeField.id) return f;

                              const updated = {
                                ...f,
                                validation: {
                                  ...f.validation,
                                  min_date_type: val,
                                  ...(val === "custom"
                                    ? { min_date: null }
                                    : { min_date: val }),
                                },
                              };

                              return updated;
                            }),
                          );
                        }}
                        options={[
                          { label: "Today", value: "today" },
                          { label: "Custom", value: "custom" },
                        ]}
                      />

                      {activeField?.validation?.min_date_type === "custom" && (
                        <DatePicker
                          style={{ width: "100%" }}
                          value={
                            activeField?.validation?.min_date
                              ? dayjs(activeField.validation.min_date).isValid()
                                ? dayjs(activeField.validation.min_date)
                                : null
                              : null
                          }
                          onChange={(date) =>
                            updateNested(
                              "validation",
                              "min_date",
                              date ? date.format("YYYY-MM-DD") : null,
                            )
                          }
                        />
                      )}

                      {activeField?.validation?.min_date_type && (
                        <Input
                          placeholder="Min date message"
                          value={activeField?.messages?.min_date || ""}
                          onChange={(e) =>
                            updateNested("messages", "min_date", e.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* MAX DATE */}
                <div className="tfc-val-row">
                  <div>
                    <div className="tfc-val-left">
                      <span className="tfc-val-name">Max Date</span>
                    </div>

                    <div className="tfc-val-right flex gap-2">
                      <Select
                        allowClear
                        value={
                          activeField?.validation?.max_date_type || undefined
                        }
                        placeholder="Select"
                        style={{ width: 130 }}
                        onChange={(val) => {
                          setFields((prev) =>
                            prev.map((f) => {
                              if (f.id !== activeField.id) return f;

                              const updated = {
                                ...f,
                                validation: {
                                  ...f.validation,
                                  max_date_type: val,
                                  ...(val === "custom"
                                    ? { max_date: null }
                                    : { max_date: val }),
                                },
                              };

                              return updated;
                            }),
                          );
                        }}
                        options={[
                          { label: "Today", value: "today" },
                          { label: "Custom", value: "custom" },
                        ]}
                      />

                      {activeField?.validation?.max_date_type === "custom" && (
                        <DatePicker
                          style={{ width: "100%" }}
                          value={
                            activeField?.validation?.max_date
                              ? dayjs(activeField.validation.max_date).isValid()
                                ? dayjs(activeField.validation.max_date)
                                : null
                              : null
                          }
                          onChange={(date) =>
                            updateNested(
                              "validation",
                              "max_date",
                              date ? date.format("YYYY-MM-DD") : null,
                            )
                          }
                        />
                      )}

                      {activeField?.validation?.max_date_type && (
                        <Input
                          placeholder="Max date message"
                          value={activeField?.messages?.max_date || ""}
                          onChange={(e) =>
                            updateNested("messages", "max_date", e.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
    </FieldConfigLayout>
  );
}
