import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  message,
  Popconfirm,
  Row,
  Select,
  Upload,
} from "antd";

const { RangePicker } = DatePicker;
import dayjs from "dayjs";
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { deleteFileById } from "@/services/common-service";
import { dynamicMasterDetailsAPI } from "@/services/dynamicForm-service";
import {
  buildRootOptionsForNewEntry,
  createEmptyEntry,
} from "./helper/addMoreEntry.helper";
import { resolveDateValue } from "./helper/date.helper";
import { getDefaultValueByType } from "./helper/defaultValue.helper";
import { buildDependencyMeta, buildFilters, normalizeKey } from "./helper/master.helper";
import { isWithinRange, NUMBER_REGEX } from "./helper/number.helper";
import { getFieldRuntimeState } from "./helper/runTimeCondition.helper";
import { buildYupSchema } from "./helper/validation.helper";
import RichTextEditor from "@/components/common/RichTextEditor";
import { hydrateAddMoreEntries } from "./helper/hydrateForm.helper";
import { evaluateRowCalculations, formatCalculatedNumber } from "./helper/calculation.helper";
import { getDynamicFormHooks } from "../../hooks/dynamicFormHookRegistry";
function formatSelectValue(val, isMultiple) {
  if (val === null || val === undefined || val === "") {
    return isMultiple ? [] : undefined;
  }
  if (!isMultiple) {
    return String(val);
  }
  if (Array.isArray(val)) {
    return val.map((v) => String(v));
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v));
        }
      } catch (e) {}
    }
  }
  return [String(val)];
}

const AddMoreSection = forwardRef(({ section, data, serverError, allData = {}, form_slug }, ref) => {
  const [entries, setEntries] = useState([]);
  const [errors, setErrors] = useState({});
  const [options, setOptions] = useState([{}]);
  const [fileLists, setFileLists] = useState([{}]);

  const hooks = useMemo(() => getDynamicFormHooks(form_slug), [form_slug]);
  // for validation
  const yupSchema = useMemo(
    () => buildYupSchema(section?.fields),
    [section?.fields]
  );
  // for dependency
  const dependencyMeta = useMemo(
    () => buildDependencyMeta(section.fields),
    [section.fields]
  );

  // add entry
  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyEntry(section)]);
    setFileLists((prev) => [...prev, {}]);
    setOptions((prev) => [...prev, buildRootOptionsForNewEntry(section, prev)]);
  }, [section?.section_id]);

  // remove entry (guarantees at least 1 row remains)
  const removeEntry = useCallback((index) => {
    setEntries((prev) => {
      if (prev.length <= 1) {
        return [createEmptyEntry(section)];
      }
      return prev.filter((_, i) => i !== index);
    });

    setFileLists((prev) => {
      if (prev.length <= 1) {
        return [{}];
      }
      return prev.filter((_, i) => i !== index);
    });

    setOptions((prev) => {
      if (prev.length <= 1) {
        return [prev[0] || {}];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, [section]);

  // delete file
  const deleteFile = useCallback(async (file) => {
    if (file?.id) {
      try {
        const res = await deleteFileById(file?.id);
        message.success(res?.data?.message);
      } catch (error) {
        message.error(
          error?.response?.data?.originalError || error?.response?.data?.message
        );
        return false;
      }
    }
    return true;
  }, []);

  /* ---------- LOAD MASTER DATA ---------- */
  const loadMasterOptions = useCallback(async (field, values, index) => {
    try {
      const ds = field?.data_source;

      if (!ds || ds?.type !== "master") return;

      const parentDbField = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;
      const filters = buildFilters(ds?.filters, values, parentDbField);

      if (parentDbField && !filters) return;

      const masterName = ds?.name || ds?.slug || ds?.table_name || field?.db_field;
      if (!masterName) return;

      const res = await dynamicMasterDetailsAPI({
        master: masterName,
        filters,
      });

      const rawData = res?.data?.data || [];
      const formattedData = rawData.map((opt) => ({
        ...opt,
        value:
          opt?.value !== null && opt?.value !== undefined
            ? String(opt.value)
            : opt?.value,
      }));

      setOptions((prev) => {
        const newOptions = [...prev];
        if (!newOptions?.[index]) newOptions[index] = {};
        newOptions[index][field?.db_field] = formattedData;
        return newOptions;
      });
    } catch (error) {
      message.error(
        error?.response?.data?.originalError || error?.response?.data?.message
      );
    }
  }, []);

  // handle change
  const handleChange = useCallback(
    (index, payload, meta = {}) => {
      let updatedEntry = {
        ...entries[index],
        ...payload,
      };

      // Run live calculations for row
      updatedEntry = evaluateRowCalculations(updatedEntry, section?.fields);

      const changedField = meta?.db_field || Object.keys(payload || {})[0];
      const normField = normalizeKey(changedField);

      const dependents = Array.from(new Set([
        ...(dependencyMeta?.allDependentsMap?.[changedField] || []),
        ...(dependencyMeta?.allDependentsMap?.[normField] || []),
      ]));

      // clear values of dependents
      dependents.forEach((dep) => {
        updatedEntry[dep] = undefined;
      });

      // clear options of dependents
      if (dependents.length > 0) {
        setOptions((prev) => {
          const next = [...prev];
          if (!next?.[index]) next[index] = {};

          dependents.forEach((dep) => {
            next[index][dep] = [];
          });

          return next;
        });
      }

      // update entries
      setEntries((prev) => {
        const next = [...prev];
        next[index] = updatedEntry;
        return next;
      });

      // reload immediate children options
      const children = Array.from(new Set([
        ...(dependencyMeta?.childrenMap?.[changedField] || []),
        ...(dependencyMeta?.childrenMap?.[normField] || []),
      ]));

      children.forEach((child) => {
        const childField = section?.fields?.find(
          (f) =>
            f?.db_field === child ||
            f?.column_name === child ||
            (f?.db_field && normalizeKey(f.db_field) === normalizeKey(child)) ||
            (f?.column_name && normalizeKey(f.column_name) === normalizeKey(child))
        );

        if (childField) {
          loadMasterOptions(childField, updatedEntry, index);
        }
      });
    },
    [entries, dependencyMeta, section?.section_id, section?.fields, loadMasterOptions]
  );

  // from parent by using ref what will be called
  useImperativeHandle(ref, () => ({
    async getData() {
      try {
        const allErrors = {};
        let hasErrors = false;
        const validatedEntries = [];
        for (let i = 0; i < entries?.length; i++) {
          try {
            const validatedEntry = await yupSchema.validate(entries?.[i], { abortEarly: false });
            validatedEntries.push(validatedEntry);
          } catch (err) {
            err.inner.forEach((e) => {
              allErrors[`${i}_${e.path}`] = e.message;
            });
            hasErrors = true;
          }
        }

        if (hasErrors) {
          setErrors(allErrors);
          return { valid: false };
        }
        setErrors({});
        return { valid: true, data: validatedEntries };
      } catch (err) {
        const e = {};
        if (err.inner) {
          err.inner.forEach((x) => {
            e[`${x.path}`] = x.message;
          });
        }
        setErrors(e);
        return { valid: false };
      }
    },

    reset: () => {
      setOptions([]);
      setErrors({});
      setEntries([]);
      setFileLists([]);
    },
  }));

  const loadOptionsForEntry = useCallback(
    async (entry, index) => {
      for (const field of section?.fields || []) {
        if (field?.visible === false) continue;
        if (field.type !== "select") continue;

        const ds = field.data_source;
        if (!ds || ds.type !== "master") continue;

        const parentField = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;

        // ROOT select
        if (!parentField) {
          await loadMasterOptions(field, entry, index);
          continue;
        }

        // DEPENDENT select
        const parentValue = entry?.[parentField] || (parentField ? Object.entries(entry || {}).find(([k, v]) => normalizeKey(k) === normalizeKey(parentField) && v !== undefined && v !== null && v !== "")?.[1] : null);
        if (parentValue !== undefined && parentValue !== null && parentValue !== "") {
          await loadMasterOptions(field, entry, index);
        }
      }
    },
    [section?.fields, loadMasterOptions]
  );

  useEffect(() => {
    let alive = true;

    const hydrateEdit = async () => {
      if (Array.isArray(data) && data.length > 0) {
        const { entries, fileLists } = hydrateAddMoreEntries(section, data, allData);

        if (!alive) return;

        setEntries(entries);
        setOptions(entries.map(() => ({})));
        setFileLists(fileLists);

        await Promise.all(
          entries.map((entry, index) =>
            alive ? loadOptionsForEntry(entry, index) : null
          )
        );
        return;
      }

      if (!alive) return;

      const empty = createEmptyEntry(section);
      setEntries([empty]);
      setFileLists([{}]);

      const rootOpts = {};

      await Promise.all(
        section.fields
          .filter(
            (field) =>
              field.type === "select" &&
              !field.dependency &&
              field?.visible !== false &&
              field.data_source?.type === "master"
          )
          .map(async (field) => {
            const ds = field.data_source;
            const filters = buildFilters(ds.filters || {}, {});
            if (ds.filters && !filters) return;

            const res = await dynamicMasterDetailsAPI({
              master: ds.name,
              filters,
            });

            if (!alive) return;
            const rawData = res.data.data || [];
            rootOpts[field.db_field] = rawData.map((opt) => ({
              ...opt,
              value:
                opt?.value !== null && opt?.value !== undefined
                  ? String(opt.value)
                  : opt?.value,
            }));
          })
      );

      if (alive) {
        setOptions([rootOpts]);
      }
    };

    hydrateEdit();

    return () => {
      alive = false;
    };
  }, [data, section?.section_id]);
  useEffect(() => {
    if (serverError) {
      setErrors((prev) => {
        return {
          ...prev,
          ...serverError,
        };
      });
    }
  }, [serverError]);
  const renderCellField = (field, entry, index) => {
    const { visible, disabled, readOnly } = getFieldRuntimeState(field, entry, "admin");
    if (!visible) return null;

    const fieldKey = field?.db_field || field?.column_name || field?.id;
    const parentField = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;
    const parentVal = parentField ? (entry?.[parentField] || Object.entries(entry || {}).find(([k, v]) => normalizeKey(k) === normalizeKey(parentField) && v !== undefined && v !== null && v !== "")?.[1]) : null;
    const isParentMissing = !!parentField && (parentVal === undefined || parentVal === null || parentVal === "");
    const isCalcReadOnly = field?.calculation?.enabled && field?.calculation?.read_only !== false;
    const isDisabled = disabled || isParentMissing || isCalcReadOnly;
    const isReadOnly = readOnly || isCalcReadOnly;

    return (
      <div style={{ minWidth: field?.type === "textarea" ? 180 : field?.type === "date_range" ? 220 : field?.type === "select" ? 160 : 130 }}>
        {field?.type === "text" && (
          <Input
            disabled={isDisabled || false}
            readOnly={isReadOnly || false}
            placeholder={field?.ui?.placeholder || ""}
            maxLength={field?.validation?.max_length || undefined}
            value={entry?.[field?.db_field]}
            onChange={(e) =>
              handleChange(index, {
                [field.db_field]: e.target.value,
              })
            }
            style={{ width: "100%" }}
          />
        )}

        {field?.type === "textarea" && (
          (field?.ui?.is_text_editor || field?.is_text_editor) ? (
            <RichTextEditor
              key={`${index}_${field?.db_field || field?.id}`}
              value={entry?.[field?.db_field] || ""}
              disabled={isDisabled || false}
              readOnly={isReadOnly || false}
              placeholder={field?.ui?.placeholder || "Enter text..."}
              minHeight={80}
              onChange={(content) =>
                handleChange(index, {
                  [field.db_field]: content,
                })
              }
            />
          ) : (
            <Input.TextArea
              value={entry?.[field?.db_field] || ""}
              disabled={isDisabled || false}
              readOnly={isReadOnly || false}
              rows={1}
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder={field?.ui?.placeholder}
              maxLength={field?.validation?.max_length}
              showCount={Boolean(field?.ui?.max_length_hint && field?.validation?.max_length)}
              onChange={(e) =>
                handleChange(index, {
                  [field.db_field]: e.target.value,
                })
              }
              style={{ width: "100%" }}
            />
          )
        )}

        {field?.type === "date" && (
          <DatePicker
            allowClear
            disabled={isDisabled || false}
            style={{ width: "100%" }}
            format="DD-MM-YYYY"
            value={
              entry?.[field?.db_field]
                ? dayjs(entry?.[field?.db_field], "YYYY-MM-DD")
                : null
            }
            onChange={(date) => {
              handleChange(index, {
                [field?.db_field]: date ? date.format("YYYY-MM-DD") : null,
              });
            }}
            disabledDate={(current) => {
              if (!current) return false;
              const min = resolveDateValue(field?.validation?.min_date, entry);
              const max = resolveDateValue(field?.validation?.max_date, entry);
              if (min && current.isBefore(min, "day")) return true;
              if (max && current.isAfter(max, "day")) return true;
              return false;
            }}
          />
        )}

        {field?.type === "date_range" && (
          <RangePicker
            allowClear
            disabled={isDisabled || false}
            style={{ width: "100%" }}
            format="DD-MM-YYYY"
            value={
              entry?.[field?.db_field]
                ? [
                    entry?.[field?.db_field]?.[0] ? dayjs(entry[field.db_field][0], "YYYY-MM-DD") : null,
                    entry?.[field?.db_field]?.[1] ? dayjs(entry[field.db_field][1], "YYYY-MM-DD") : null,
                  ]
                : null
            }
            onChange={(dates) => {
              if (!dates) {
                handleChange(index, { [field.db_field]: null });
                return;
              }
              handleChange(index, {
                [field.db_field]: [dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD")],
              });
            }}
          />
        )}

        {field?.type === "number" && (
          <Input
            value={entry?.[field?.db_field]}
            disabled={isDisabled || false}
            readOnly={isReadOnly || false}
            maxLength={field?.validation?.max_length || undefined}
            placeholder={field?.ui?.placeholder || ""}
            inputMode="decimal"
            onChange={(e) => {
              const val = e.target.value;
              const regex = NUMBER_REGEX?.[field?.regex_type];
              if (regex && !regex.test(val)) return;
              if (!isWithinRange(val, field)) return;
              handleChange(index, { [field.db_field]: val });
            }}
            style={{ width: "100%" }}
          />
        )}

        {field?.type === "select" && (
          <Select
            showSearch
            allowClear
            disabled={isDisabled || false}
            placeholder={field?.ui?.placeholder}
            mode={field?.multiple ? "multiple" : undefined}
            value={formatSelectValue(
              entry?.[fieldKey] !== undefined ? entry?.[fieldKey] : entry?.[field?.db_field],
              !!field?.multiple
            )}
            style={{ width: "100%" }}
            options={
              options?.[index]?.[fieldKey] ||
              options?.[index]?.[field?.db_field] ||
              options?.[index]?.[field?.column_name] ||
              field?.options ||
              []
            }
            onChange={(value) =>
              handleChange(
                index,
                { [fieldKey]: value },
                { db_field: fieldKey, type: field?.type }
              )
            }
            filterOption={(input, option) =>
              String(option?.label || "").toLowerCase().includes(input.toLowerCase())
            }
          />
        )}

        {field?.type === "file" && (
          <Upload
            fileList={fileLists?.[index]?.[field.db_field] || []}
            multiple={field?.file?.multiple || false}
            accept={
              field?.file?.allowed_types?.length > 0
                ? field.file.allowed_types.join(",")
                : undefined
            }
            beforeUpload={() => false}
            onChange={({ fileList }) => {
              const finalList = field?.file?.multiple ? fileList : fileList.slice(-1);
              setFileLists((prev) => {
                const newFileLists = [...prev];
                if (!newFileLists?.[index]) newFileLists[index] = {};
                newFileLists[index][field.db_field] = finalList;
                return newFileLists;
              });
              handleChange(index, { [field.db_field]: finalList });
            }}
          >
            <Button size="small" icon={<UploadOutlined />}>Upload</Button>
          </Upload>
        )}

        {errors?.[`${index}_${fieldKey}`] && (
          <div style={{ color: "#ff4d4f", fontSize: "11px", marginTop: 2 }}>
            {errors[`${index}_${fieldKey}`]}
          </div>
        )}
      </div>
    );
  };

  const renderExtraFields = useCallback(
    (fieldDbField = null, position = "after", extraProps = {}) => {
      if (!hooks.getExtraFields) return null;
      return hooks.getExtraFields({
        form_slug,
        mode: "add_more",
        sectionSlug: section?.section_id || section?.slug || "add_more",
        fieldDbField,
        position,
        entries,
        setEntries,
        ...extraProps,
      });
    },
    [hooks, form_slug, section?.section_id, section?.slug, entries]
  );

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{section?.section_label}</span>
          <Button
            type="primary"
            size="small"
            onClick={addEntry}
            style={{ fontWeight: 600 }}
          >
            + Add Row
          </Button>
        </div>
      }
      style={{
        overflow: "visible",
        width: "100%",
        marginBottom: 20,
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {renderExtraFields(null, "section_top")}
      <div style={{ overflowX: "auto", width: "100%", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "var(--primary-gradient, var(--primary-color, #15803d))", color: "#ffffff" }}>
              <th style={{ padding: "10px 12px", width: "40px", textAlign: "center", fontWeight: 700, color: "#ffffff" }}>#</th>
              {section?.fields?.map((field, idx) => {
                if (field?.visible === false) return null;
                return (
                  <React.Fragment key={`${field?.db_field || field?.column_name || field?.id}_${idx}`}>
                    {renderExtraFields(field?.db_field, "before_header", { isHeader: true })}
                    <th
                      style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap" }}
                    >
                      {field?.label}
                      {field?.required && <span style={{ color: "#fca5a5", marginLeft: 4 }}>*</span>}
                    </th>
                    {renderExtraFields(field?.db_field, "after_header", { isHeader: true })}
                  </React.Fragment>
                );
              })}
              <th style={{ padding: "10px 12px", width: "70px", textAlign: "center", fontWeight: 700, color: "#ffffff" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {entries?.length > 0 ? (
              entries.map((entry, index) => (
                <tr
                  key={entry?.__row_id || `row_${index}`}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#64748b" }}>
                    {index + 1}
                  </td>
                  {section?.fields?.map((field, idx) => {
                    if (field?.visible === false) return null;
                    const fieldKey = field?.db_field || field?.column_name || field?.id;
                    return (
                      <React.Fragment key={`${fieldKey}_${idx}`}>
                        {renderExtraFields(field?.db_field, "before", { index, entry, onChange: (payload) => handleChange(index, payload) })}
                        <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                          {renderCellField(field, entry, index)}
                        </td>
                        {renderExtraFields(field?.db_field, "after", { index, entry, onChange: (payload) => handleChange(index, payload) })}
                      </React.Fragment>
                    );
                  })}
                  <td style={{ padding: "8px 12px", textAlign: "center", verticalAlign: "top" }}>
                    <Popconfirm
                      title="Delete Row"
                      description="Are you sure you want to delete this row?"
                      onConfirm={() => removeEntry(index)}
                      okText="Yes, Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined style={{ fontSize: 14, color: "#dc2626" }} />}
                        style={{
                          backgroundColor: "#fef2f2",
                          borderColor: "#fca5a5",
                          color: "#dc2626",
                          borderRadius: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      />
                    </Popconfirm>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={(section?.fields?.filter((f) => f?.visible !== false)?.length || 0) + 2}
                  style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}
                >
                  No entries added. Click <strong>"+ Add Row"</strong> to add a new record.
                </td>
              </tr>
            )}
          </tbody>
          {entries?.length > 0 && (
            <tfoot>
              <tr style={{ background: "#f1f5f9", fontWeight: 700, borderTop: "2px solid #cbd5e1" }}>
                <td style={{ padding: "10px 12px", textAlign: "center", color: "#334155" }}>
                  Total
                </td>
                {section?.fields?.map((field, idx) => {
                  if (field?.visible === false) return null;
                  const isNumeric = field?.type === "number" || field?.calculation?.enabled;
                  if (!isNumeric) {
                    return <td key={`${field?.db_field || field?.id}_${idx}`} style={{ padding: "10px 12px" }} />;
                  }

                  let targetField = field?.db_field;
                  if (field?.calculation?.type === "summary_total" && field?.calculation?.target_field) {
                    targetField = field.calculation.target_field;
                  }

                  const sum = entries.reduce((acc, row) => {
                    const rawVal = row?.[targetField];
                    const num = rawVal !== undefined && rawVal !== null && rawVal !== "" ? Number(rawVal) : 0;
                    return acc + (isNaN(num) ? 0 : num);
                  }, 0);

                  const formattedSum = formatCalculatedNumber(
                    sum,
                    field?.number_type,
                    field?.calculation?.precision,
                    field?.calculation?.rounding || "round"
                  );

                  return (
                    <td
                      key={`${field?.db_field || field?.id}_${idx}`}
                      style={{ padding: "10px 12px", color: "#1e293b", fontWeight: 700 }}
                    >
                      {formattedSum}
                    </td>
                  );
                })}
                <td style={{ padding: "10px 12px" }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {renderExtraFields(null, "section_bottom")}
    </Card>
  );
});

export default memo(AddMoreSection);
