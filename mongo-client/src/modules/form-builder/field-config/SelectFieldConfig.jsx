import { useEffect, useState } from "react";
import { Input, Switch, Tabs, Button, Popconfirm, Select as AntSelect, Radio, Spin } from "antd";
import FieldConfigLayout from "../FieldConfigLayout";
import "./css/FieldConfig.css";
import { privateHttpClient } from "@/services/api/httpClient";

const deduplicateOptions = (opts = []) => {
  const seen = new Set();
  const result = [];
  (opts || []).forEach((opt, idx) => {
    if (!opt || opt.value === undefined || opt.value === null) return;
    const val = String(opt.value).trim();
    if (!val || seen.has(val)) return;
    seen.add(val);
    result.push({
      ...opt,
      key: opt.key || `opt_${val}_${idx}`,
    });
  });
  return result;
};

export default function SelectFieldConfig({
  activeField,
  updateField,
  updateNested,
  setFields,
  errors,
  allFormFields = [],
}) {
  const [masterForms, setMasterForms] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);

  // Load master forms from API
  useEffect(() => {
    const fetchMasters = async () => {
      setMasterLoading(true);
      try {
        const res = await privateHttpClient.get("configurator/form-schemas/masters");
        if (res?.data?.data) {
          setMasterForms(res.data.data);
        }
      } catch (e) {
        console.error("Failed to load master forms:", e);
      } finally {
        setMasterLoading(false);
      }
    };
    fetchMasters();
  }, []);

  // Build options list: dynamic master forms from API
  const masterOptions = deduplicateOptions(
    masterForms.map((f, i) => ({
      label: `${f.title || f.slug} (${f.table_name || "master"})`,
      value: f.slug || `master-${i}`,
      table_name: f.table_name,
      primary_key: f.primary_key || "id",
      fields: f.fields || [],
    }))
  );

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

    if (!activeField?.ui?.placeholder) {
      updateNested("ui", "placeholder", val ? `Select ${val}` : "Select option");
    }
  };

  const handleDbField = (val) => {
    const db = val
      ?.toLowerCase()
      ?.replace(/\s+/g, "_")
      ?.replace(/[^a-z0-9_]/g, "");
    updateField("db_field", db);
  };

  const optionType = activeField?.data_source ? "master" : "static";
  const hasDependency = !!activeField?.dependency;

  const handleOptionTypeChange = (type) => {
    if (type === "static") {
      updateField("data_source", null);
      if (!activeField?.options?.length) {
        updateField("options", [{ label: "", value: "" }]);
      }
    } else {
      updateField("options", []);
      // default to first master form if available
      const first = masterForms[0];
      if (first) {
        updateField("data_source", {
          name: first.slug,
          type: "master",
          table_name: first.table_name,
          primary_key: first.primary_key || "id",
          label_key: first.fields?.[0]?.db_field || "name",
        });
      } else {
        updateField("data_source", {
          name: "",
          type: "master",
          table_name: "",
          primary_key: "id",
          label_key: "name",
        });
      }
    }
  };

  // Local state to track selected master slug — immediately reactive
  const [selectedSlug, setSelectedSlug] = useState(null);

  // Sync selectedSlug when activeField changes (switching between fields or loading saved value)
  useEffect(() => {
    if (masterForms.length === 0) return;
    const matched = masterForms.find(
      (f) => f.table_name === activeField?.data_source?.table_name ||
             f.slug === activeField?.data_source?.name
    );
    setSelectedSlug(matched?.slug || null);
  }, [activeField?.id, activeField?.data_source?.table_name, masterForms]);

  const selectedMasterForm = masterForms.find((f) => f.slug === selectedSlug);

  const handleMasterPresetSelect = (slug) => {
    const chosen = masterForms.find((f) => f.slug === slug);
    if (!chosen) return;
    setSelectedSlug(slug);  // update local state immediately
    updateField("data_source", {
      name: chosen.slug,
      type: "master",
      table_name: chosen.table_name,
      primary_key: chosen.primary_key || "id",
      label_key: chosen.fields?.[0]?.db_field || "name",
    });
  };

  const handleDependencyToggle = (checked) => {
    if (checked) {
      updateField("dependency", {
        parent: "",
        parent_db_field: "",
        clear_on_change: true,
        fetch_on_parent_change: true,
      });
    } else {
      updateField("dependency", null);
      if (activeField?.data_source) {
        const ds = { ...activeField.data_source };
        delete ds.filters;
        updateField("data_source", ds);
      }
    }
  };

  const handleParentFieldChange = (parentDbField) => {
    setFields((prev) => {
      const allSearchable = allFormFields?.length ? allFormFields : prev;
      const parentField = allSearchable.find((f) => f.db_field === parentDbField);
      const parentSourceName =
        parentField?.data_source?.name ||
        parentField?.data_source?.table_name ||
        "";

      return prev.map((f) => {
        if (f.id !== activeField.id) return f;
        return {
          ...f,
          dependency: {
            ...f.dependency,
            parent_db_field: parentDbField,
            parent: parentSourceName || f.dependency?.parent || "",
          },
          data_source: f.data_source ? {
            ...f.data_source,
            filters: parentDbField ? [parentDbField] : [],
          } : null
        };
      });
    });
  };

  // ===== STATIC OPTION HANDLERS =====
  const addOption = () => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== activeField.id) return f;
        return { ...f, options: [...(f.options || []), { label: "", value: "" }] };
      }),
    );
  };

  const updateOption = (index, key, val) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== activeField.id) return f;
        const updatedOptions = [...(f.options || [])];
        updatedOptions[index] = { ...updatedOptions[index], [key]: val };
        return { ...f, options: updatedOptions };
      }),
    );
  };

  const removeOption = (index) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== activeField.id) return f;
        return { ...f, options: (f.options || []).filter((_, i) => i !== index) };
      }),
    );
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
                    placeholder="e.g. Select option"
                  />
                  {errors?.label && <div className="error text-danger">{errors?.label}</div>}
                </div>

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
                  {errors?.db_field && <div className="error text-danger">{errors?.db_field}</div>}
                </div>

                <div className="tfc-field tfc-field--full">
                  <label className="tfc-label">Placeholder</label>
                  <Input
                    placeholder="e.g. Select an option"
                    value={activeField?.ui?.placeholder || ""}
                    onChange={(e) => updateNested("ui", "placeholder", e.target.value)}
                  />
                </div>

                <div>
                  <label className="tfc-label">Multiple Select</label>
                  <Switch
                    checked={activeField?.multiple}
                    onChange={(checked) => {
                      setFields((prev) =>
                        prev.map((f) => {
                          if (f.id !== activeField.id) return f;
                          return { ...f, multiple: checked, data_type: checked ? "jsonb" : "varchar(255)" };
                        }),
                      );
                    }}
                  />
                </div>
              </div>
            ),
          },

          // ================= OPTIONS SOURCE =================
          {
            key: "options",
            label: "Options Source",
            children: (
              <div className="tfc-val-list space-y-4">
                <div className="mb-3">
                  <label className="tfc-label block mb-1">Source Type</label>
                  <Radio.Group
                    value={optionType}
                    onChange={(e) => handleOptionTypeChange(e.target.value)}
                  >
                    <Radio.Button value="static">Static List</Radio.Button>
                    <Radio.Button value="master">Master Form Source</Radio.Button>
                  </Radio.Group>
                </div>

                {optionType === "master" ? (
                  <div className="space-y-3 bg-gray-50 p-3 rounded-lg border">
                    <div>
                      <label className="tfc-label block mb-1">
                        Select Master Form
                        {masterLoading && <Spin size="small" className="ml-2" />}
                      </label>
                      {masterForms.length === 0 && !masterLoading ? (
                        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded">
                          No master forms found. Create a form in Form Builder and toggle it as <b>Master</b>.
                        </div>
                      ) : (
                        <AntSelect
                          className="w-full"
                          placeholder="Choose Master Form"
                          value={selectedSlug}
                          options={masterOptions}
                          onChange={handleMasterPresetSelect}
                          loading={masterLoading}
                          showSearch
                          filterOption={(input, option) =>
                            option?.label?.toLowerCase().includes(input.toLowerCase())
                          }
                        />
                      )}
                    </div>

                    {/* Manual override fields */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Table Name</label>
                        <Input
                          size="small"
                          placeholder="e.g. t_frm_state"
                          value={activeField?.data_source?.table_name || ""}
                          onChange={(e) => updateNested("data_source", "table_name", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Value Key (PK)</label>
                        <Input
                          size="small"
                          placeholder="e.g. id"
                          value={activeField?.data_source?.primary_key || ""}
                          onChange={(e) => updateNested("data_source", "primary_key", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Label Column</label>
                        <AntSelect
                          size="small"
                          className="w-full"
                          placeholder="Select label column"
                          value={activeField?.data_source?.label_key || undefined}
                          onChange={(val) => updateNested("data_source", "label_key", val)}
                          options={deduplicateOptions(
                            (selectedMasterForm?.fields || [])
                              .filter((f) => f && (f.db_field || f.column_name))
                              .map((field) => {
                                const val = field.db_field || field.column_name;
                                return {
                                  label: `${field.label || val} (${val})`,
                                  value: val,
                                };
                              })
                          )}
                          popupRender={(menu) => (
                            <>
                              {menu}
                              <div className="p-1 border-t">
                                <Input
                                  size="small"
                                  placeholder="Or type column name manually"
                                  value={activeField?.data_source?.label_key || ""}
                                  onChange={(e) => updateNested("data_source", "label_key", e.target.value)}
                                />
                              </div>
                            </>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeField?.options?.map((opt, index) => (
                      <div key={index} className="tfc-val-row">
                        <div className="tfc-val-left flex gap-2">
                          <Input
                            placeholder="Label"
                            value={opt.label}
                            onChange={(e) => updateOption(index, "label", e.target.value)}
                          />
                          <Input
                            placeholder="Value"
                            value={opt.value}
                            onChange={(e) => updateOption(index, "value", e.target.value)}
                          />
                        </div>
                        <div>
                          <Popconfirm
                            title="Delete this option?"
                            onConfirm={() => removeOption(index)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button danger size="small" onClick={(e) => e.stopPropagation()}>
                              Delete
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                    <Button type="dashed" onClick={addOption}>+ Add Option</Button>
                  </div>
                )}
              </div>
            ),
          },

          // ================= CASCADING PARENT =================
          {
            key: "dependency",
            label: "Cascading Parent",
            children: (
              <div className="tfc-val-list space-y-4">
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                  <Switch checked={hasDependency} onChange={handleDependencyToggle} />
                  <div>
                    <div className="font-medium text-sm text-gray-800">Enable Parent Field Filter</div>
                    <div className="text-xs text-gray-500">
                      Filter options in this dropdown based on the selected value of a parent field (e.g. Filter District by State).
                    </div>
                  </div>
                </div>

                {hasDependency && (
                  <div className="bg-white p-3 rounded-lg border space-y-4">
                    <div>
                      <label className="tfc-label block mb-1">Parent Form Field</label>
                      <AntSelect
                        className="w-full"
                        placeholder="Select Parent Field"
                        value={activeField?.dependency?.parent_db_field || undefined}
                        onChange={handleParentFieldChange}
                        options={deduplicateOptions(
                          (allFormFields?.length ? allFormFields : [])
                            .filter((f) => f.id !== activeField?.id && (f.db_field || f.column_name))
                            .map((f) => {
                              const val = f.db_field || f.column_name;
                              const rawLabel = f.label || val;
                              const formattedLabel = rawLabel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                              return {
                                label: formattedLabel !== val ? `${formattedLabel} (${val})` : val,
                                value: val,
                              };
                            })
                        )}
                        showSearch
                        allowClear
                        filterOption={(input, option) =>
                          option?.label?.toLowerCase().includes(input.toLowerCase())
                        }
                        popupRender={(menu) => (
                          <>
                            {menu}
                            <div className="p-2 border-t bg-gray-50">
                              <div className="text-xs text-gray-500 mb-1">Or enter DB field manually:</div>
                              <Input
                                size="small"
                                placeholder="e.g. state_id"
                                value={activeField?.dependency?.parent_db_field || ""}
                                onChange={(e) => handleParentFieldChange(e.target.value)}
                              />
                            </div>
                          </>
                        )}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Select the parent field in this form that controls this dropdown.
                      </div>
                    </div>

                    <div>
                      <label className="tfc-label block mb-1">
                        Parent Master Source
                        {masterLoading && <Spin size="small" className="ml-2" />}
                      </label>
                      <AntSelect
                        className="w-full"
                        placeholder="Select Parent Master Source"
                        value={activeField?.dependency?.parent || undefined}
                        onChange={(val) => updateNested("dependency", "parent", val)}
                        options={deduplicateOptions(
                          masterForms.map((f, idx) => {
                            const title = f.title && f.title !== f.slug
                              ? f.title
                              : (f.slug || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                            const slug = f.slug || f.table_name || `master-${idx}`;
                            return {
                              label: title && title !== slug ? `${title} (${slug})` : slug,
                              value: slug,
                            };
                          })
                        )}
                        loading={masterLoading}
                        showSearch
                        allowClear
                        filterOption={(input, option) =>
                          option?.label?.toLowerCase().includes(input.toLowerCase())
                        }
                        popupRender={(menu) => (
                          <>
                            {menu}
                            <div className="p-2 border-t bg-gray-50">
                              <div className="text-xs text-gray-500 mb-1">Or enter slug manually:</div>
                              <Input
                                size="small"
                                placeholder="e.g. states"
                                value={activeField?.dependency?.parent || ""}
                                onChange={(e) => updateNested("dependency", "parent", e.target.value)}
                              />
                            </div>
                          </>
                        )}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Select the master data source or table for the parent field.
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3">
                      <div>
                        <div className="font-medium text-xs text-gray-700">Reset Value on Parent Change</div>
                        <div className="text-xs text-gray-400">Clear child selection when parent value changes</div>
                      </div>
                      <Switch 
                        size="small"
                        checked={activeField?.dependency?.clear_on_change ?? true} 
                        onChange={(checked) => updateNested("dependency", "clear_on_change", checked)} 
                      />
                    </div>

                    <div className="flex items-center justify-between border-t pt-3">
                      <div>
                        <div className="font-medium text-xs text-gray-700">Fetch Options on Parent Change</div>
                        <div className="text-xs text-gray-400">Fetch fresh dropdown data when parent selection changes</div>
                      </div>
                      <Switch 
                        size="small"
                        checked={activeField?.dependency?.fetch_on_parent_change ?? true} 
                        onChange={(checked) => updateNested("dependency", "fetch_on_parent_change", checked)} 
                      />
                    </div>
                  </div>
                )}
              </div>
            ),
          },

          // ================= VALIDATION =================
          {
            key: "validation",
            label: "Validation",
            children: (
              <div className="tfc-val-list">
                <div className={`tfc-val-row ${activeField?.required ? "tfc-val-row--active" : ""}`}>
                  <div className="tfc-val-left">
                    <Switch
                      checked={activeField?.required}
                      onChange={(checked) => {
                        setFields((prev) =>
                          prev.map((f) => {
                            if (f.id !== activeField.id) return f;
                            return { ...f, required: checked };
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
                        onChange={(e) => updateNested("messages", "required", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </FieldConfigLayout>
  );
}
