import { Input, Select, Switch, Tabs } from "antd";
import FieldConfigLayout from "../FieldConfigLayout";
import "./css/FieldConfig.css";

export default function FileFieldConfig({
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
                    value={activeField?.label || ""}
                    onChange={(e) => handleLabel(e.target.value)}
                    placeholder="e.g. Upload Document"
                  />
                  {errors?.label && (
                    <div className="error text-danger">{errors?.label}</div>
                  )}
                </div>

                <div className="tfc-field">
                  <label className="tfc-label">
                    DB Field <span className="tfc-badge">editable</span>
                  </label>
                  <Input
                    className="tfc-input tfc-input--mono"
                    value={activeField?.db_field || ""}
                    onChange={(e) => handleDbField(e.target.value)}
                    placeholder="e.g. document_file"
                  />
                  {errors?.db_field && (
                    <div className="error text-danger">{errors?.db_field}</div>
                  )}
                </div>

                <div className="tfc-field tfc-field--full">
                  <label className="tfc-label">Placeholder</label>
                  <Input
                    value={activeField?.ui?.placeholder || ""}
                    onChange={(e) =>
                      updateNested("ui", "placeholder", e.target.value)
                    }
                    placeholder="e.g. Upload file"
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
                  className={`tfc-val-row ${activeField?.required ? "tfc-val-row--active" : ""}`}
                >
                  <div className="tfc-val-left">
                    <Switch
                      checked={activeField?.required}
                      onChange={(checked) => {
                        setFields((prev) =>
                          prev.map((f) => {
                            if (f.id !== activeField.id) return f;

                            const updated = {
                              ...f,
                              required: checked,
                            };

                            return updated;
                          }),
                        );
                      }}
                    />
                    <span className="tfc-val-name">Required</span>
                  </div>

                  {activeField?.required && (
                    <div className="tfc-val-right">
                      <span className="tfc-msg-label">Message</span>
                      <Input
                        placeholder="Required message"
                        value={activeField?.messages?.required || ""}
                        onChange={(e) =>
                          updateNested("messages", "required", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* MAX FILE SIZE */}
                <div
                  className={`tfc-val-row ${activeField?.file?.max_size_mb ? "tfc-val-row--active" : ""}`}
                >
                  <div className="flex flex-col">
                    <span className="tfc-val-name">Max File Size (MB)</span>

                    <Input
                      type="number"
                      min={1}
                      max={20}
                      onKeyDown={blockInvalidNumKeys}
                      placeholder="MB"
                      value={activeField?.file?.max_size_mb || ""}
                      onChange={(e) => {
                        const val = e.target.value;

                        setFields((prev) =>
                          prev.map((f) => {
                            if (f.id !== activeField.id) return f;

                            const updated = {
                              ...f,
                              file: {
                                ...f.file,
                                max_size_mb: val,
                              },
                            };

                            return updated;
                          }),
                        );
                      }}
                    />
                  </div>
                  {activeField?.file?.max_size_mb && (
                    <div>
                      <span className="tfc-msg-label">Message</span>
                      <Input
                        placeholder="File size message"
                        value={activeField?.messages?.file_size || ""}
                        onChange={(e) =>
                          updateNested("messages", "file_size", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* ALLOWED TYPES */}
                <div
                  className={`tfc-val-row ${activeField?.file?.allowed_types?.length ? "tfc-val-row--active" : ""}`}
                >
                  <div className="flex flex-col">
                    <span className="tfc-val-name">Allowed Types</span>

                    <Select
                      allowClear
                      mode="multiple"
                      placeholder="Select file types"
                      value={activeField?.file?.allowed_types || []}
                      style={{ width: 220 }}
                      onChange={(val) => {
                        setFields((prev) =>
                          prev.map((f) => {
                            if (f.id !== activeField.id) return f;

                            const updated = {
                              ...f,
                              file: {
                                ...f.file,
                                allowed_types: val,
                              },
                            };

                            return updated;
                          }),
                        );
                      }}
                      options={[
                        // ===== DOCUMENTS =====
                        { label: "PDF", value: "application/pdf" },
                        { label: "DOC", value: "application/msword" },
                        {
                          label: "DOCX",
                          value:
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        },

                        // ===== EXCEL =====
                        { label: "XLS", value: "application/vnd.ms-excel" },
                        {
                          label: "XLSX",
                          value:
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        },
                        { label: "CSV", value: "text/csv" },

                        // ===== PRESENTATION =====
                        {
                          label: "PPT",
                          value: "application/vnd.ms-powerpoint",
                        },
                        {
                          label: "PPTX",
                          value:
                            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        },

                        // ===== IMAGES =====
                        { label: "JPG", value: "image/jpeg" },
                        { label: "PNG", value: "image/png" },
                      ]}
                    />
                  </div>

                  {activeField?.file?.allowed_types?.length > 0 && (
                    <div>
                      <span className="tfc-msg-label">Message</span>
                      <Input
                        placeholder="File type message"
                        value={activeField?.messages?.file_type || ""}
                        onChange={(e) =>
                          updateNested("messages", "file_type", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* MULTIPLE */}
                <div className="tfc-val-row">
                  <div className="tfc-val-left">
                    <Switch
                      checked={activeField?.file?.multiple}
                      onChange={(checked) => {
                        setFields((prev) =>
                          prev.map((f) => {
                            if (f.id !== activeField.id) return f;

                            const updated = {
                              ...f,
                              file: {
                                ...f.file,
                                multiple: checked,
                              },
                              validation: { ...f.validation },
                            };

                            if (!checked) {
                              updated.validation.min_items = "";
                              updated.validation.max_items = "";
                            }

                            return updated;
                          }),
                        );
                      }}
                    />
                    <span className="tfc-val-name">Allow Multiple</span>
                  </div>
                </div>

                {/* MIN ITEMS */}
                {activeField?.file?.multiple && (
                  <div className="tfc-val-row">
                    <div className="flex flex-col">
                      <span className="tfc-val-name">Min Items</span>

                      <Input
                        type="number"
                        min={1}
                        max={100}
                        onKeyDown={blockInvalidNumKeys}
                        placeholder="Min"
                        value={activeField?.validation?.min_items || ""}
                        onChange={(e) => {
                          const val = e.target.value;

                          setFields((prev) =>
                            prev.map((f) => {
                              if (f.id !== activeField.id) return f;

                              const updated = {
                                ...f,
                                validation: {
                                  ...f.validation,
                                  min_items: val,
                                },
                              };

                              return updated;
                            }),
                          );
                        }}
                      />
                    </div>

                    {activeField?.validation?.min_items && (
                      <div className="">
                        <span className="tfc-msg-label">Message</span>
                        <Input
                          placeholder="Min items message"
                          value={activeField?.messages?.min_items || ""}
                          onChange={(e) =>
                            updateNested(
                              "messages",
                              "min_items",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* MAX ITEMS */}
                {activeField?.file?.multiple && (
                  <div className="tfc-val-row">
                    <div className="flex flex-col">
                      <span className="tfc-val-name">Max Items</span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        onKeyDown={blockInvalidNumKeys}
                        placeholder="Max"
                        value={activeField?.validation?.max_items || ""}
                        onChange={(e) => {
                          const val = e.target.value;

                          setFields((prev) =>
                            prev.map((f) => {
                              if (f.id !== activeField.id) return f;

                              const updated = {
                                ...f,
                                validation: {
                                  ...f.validation,
                                  max_items: val,
                                },
                              };

                              return updated;
                            }),
                          );
                        }}
                      />
                    </div>

                    {activeField?.validation?.max_items && (
                      <div className="">
                        <span className="tfc-msg-label">Message</span>
                        <Input
                          placeholder="Max items message"
                          value={activeField?.messages?.max_items || ""}
                          onChange={(e) =>
                            updateNested(
                              "messages",
                              "max_items",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </FieldConfigLayout>
  );
}
