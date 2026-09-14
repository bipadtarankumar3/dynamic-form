import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Alert, Button, Card, Col, DatePicker, Input, message,
  Popconfirm, Row, Select, Upload,
} from "antd";
const { RangePicker } = DatePicker;
import dayjs from "dayjs";
import React, {
  forwardRef, memo, useCallback, useEffect,
  useImperativeHandle, useMemo, useRef, useState,
} from "react";
import { deleteFileById } from "@/services/common-service";
import { dynamicMasterDetailsAPI } from "@/services/dynamicForm-service";
import { resolveDateValue } from "./helper/date.helper";
import { getDefaultValueByType } from "./helper/defaultValue.helper";
import { buildFileListFromDocuments, resolveSelectValue } from "./helper/hydrateForm.helper";
import { buildDependencyMeta, buildFilters, normalizeKey } from "./helper/master.helper";
import { isWithinRange, NUMBER_REGEX } from "./helper/number.helper";
import { getFieldRuntimeState } from "@/modules/dynamic-form-v2/helper/runTimeCondition.helper";
import { buildYupSchema } from "./helper/validation.helper";
import { evaluateRowCalculations } from "@/modules/dynamic-form-v2/add-edit/add-more-section/helper/calculation.helper";
import AddMoreSectionV2 from "@/modules/dynamic-form-v2/add-edit/add-more-section/AddMoreSectionV2";
import RichTextEditor from "@/components/common/RichTextEditor";
import { getDynamicFormHooks } from "@/modules/dynamic-form-v2/hooks/registerAllFormHooksV2";

/**
 * Wrapper around AddMoreSectionV2 embedded inside a GeneralSection field.
 * Keeping the `section` object and `onChange` stable prevents an infinite
 * re-render loop that occurred because the inline arrow
 *   onChange={(newEntries) => handleChange({ [fieldKey]: newEntries })}
 * produced a new function reference on every render, which re-triggered
 * the entries-change effect inside AddMoreSectionV2.
 */
const EmbeddedAddMore = memo(({ field, fieldKey, values, mode, form_slug, serverError, handleChange }) => {
  const section = useMemo(() => ({
    section_id: field.id || field.db_field,
    section_label: field.label,
    slug: field.db_field,
    storage_type: field.storage_type || "jsonb",
    fields: field.fields || [],
  }), [field]);

  const onChange = useCallback(
    (newEntries) => handleChange({ [fieldKey]: newEntries }),
    // handleChange is stable (useCallback in parent), fieldKey is a primitive string
    [handleChange, fieldKey]
  );

  return (
    <AddMoreSectionV2
      section={section}
      data={values?.[fieldKey]}
      allData={values}
      mode={mode}
      form_slug={form_slug}
      serverError={serverError?.[fieldKey]}
      onChange={onChange}
    />
  );
});

function formatSelectValue(val, isMultiple) {
  if (val === null || val === undefined || val === "") return isMultiple ? [] : undefined;
  if (!isMultiple) return String(val);
  if (Array.isArray(val)) return val.map((v) => String(v));
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      } catch (e) {}
    }
  }
  return [String(val)];
}

const GeneralSectionV2 = forwardRef(
  ({ section, data, mode, form_slug, serverError, allFormValues, onValuesChange }, ref) => {
    const [values, setValues] = useState({});
    const [errors, setErrors] = useState({});
    const [options, setOptions] = useState({});
    const [fileLists, setFileLists] = useState({});

    // Stable ref so callbacks can read latest values without being in dep arrays
    const valuesRef = React.useRef(values);
    valuesRef.current = values;

    const yupSchema = useMemo(() => buildYupSchema(section?.fields), [section?.section_id]);
    const dependencyMeta = useMemo(() => buildDependencyMeta(section?.fields), [section?.section_id]);

    const deleteFile = useCallback(async (file) => {
      if (file?.id) {
        try {
          const res = await deleteFileById(file?.id);
          message.success(res?.data?.message);
        } catch (error) {
          message.error(error?.response?.data?.originalError || error?.response?.data?.message);
          return false;
        }
      }
      return true;
    }, []);

    const fetchOptions = useCallback(
      async (fieldKey, payloadFilters = {}) => {
        try {
          const field = section?.fields?.find((f) => (f?.db_field || f?.id) === fieldKey);
          if (!field) return;

          const ds = field?.data_source;
          const masterName = ds?.name || ds?.slug || ds?.table_name || field?.db_field || payloadFilters?.master_name || payloadFilters?.master;
          if (!masterName) return;

          const parentDbField = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;
          const currentValues = valuesRef.current;
          const filters = payloadFilters?.filters !== undefined ? payloadFilters.filters : buildFilters(ds?.filters || {}, currentValues, parentDbField);

          if (parentDbField && !filters) return;

          const res = await dynamicMasterDetailsAPI({
            master: masterName,
            filters: filters || {},
            table_name: ds?.table_name,
            label_key: ds?.label_key,
            primary_key: ds?.primary_key || ds?.value_key,
          });

          const rawData = res?.data?.data || res?.data || [];
          const formattedData = Array.isArray(rawData)
            ? rawData.map((opt) => {
                const val = opt?.value !== undefined && opt?.value !== null ? opt.value : (opt?.id || opt?._id);
                const lbl = opt?.label || (ds?.label_key && opt?.[ds.label_key]) || opt?.name || opt?.state_name || opt?.title || String(val);
                return {
                  ...opt,
                  value: val !== null && val !== undefined ? String(val) : "",
                  label: lbl,
                };
              })
            : [];

          setOptions((prev) => ({ ...prev, [fieldKey]: formattedData }));
        } catch (error) {
          console.error("Failed to fetch master options:", error);
        }
      },
      [section?.fields]
    );

    useEffect(() => {
      if (!data || mode !== "edit") return;
      const newValues = {};
      const newFileLists = {};
      section?.fields?.forEach((field) => {
        const fieldKey = field?.db_field || field?.column_name || field?.name || field?.id;
        let val = data?.[fieldKey];
        if (val === undefined || val === null) {
          const foundK = Object.keys(data).find((k) => normalizeKey(k) === normalizeKey(fieldKey));
          if (foundK) val = data[foundK];
        }
        if (field?.type === "file") {
          const list = buildFileListFromDocuments(val, field);
          newFileLists[fieldKey] = list;
          newValues[fieldKey] = list;
        } else if (field?.type === "date") {
          newValues[fieldKey] = val ? dayjs(val, "YYYY-MM-DD") : null;
        } else if (["date_range", "date_range_picker", "daterange"].includes(field?.type)) {
          let rangeVal = val;
          if (typeof rangeVal === "string") {
            try {
              rangeVal = JSON.parse(rangeVal);
            } catch (e) {
              if (rangeVal.includes(",")) rangeVal = rangeVal.split(",").map((s) => s.trim());
            }
          }
          newValues[fieldKey] = Array.isArray(rangeVal) ? rangeVal : null;
        } else if (field?.type === "select") {
          newValues[fieldKey] = resolveSelectValue(field, val);
        } else if (field?.type === "add_more") {
          newValues[fieldKey] = Array.isArray(val) ? val : (val ? JSON.parse(val) : []);
        } else {
          newValues[fieldKey] = val !== undefined ? val : getDefaultValueByType(field);
        }
      });
      setValues(newValues);
      setFileLists(newFileLists);

      // Fetch options for dependent fields if parent value is already present in hydrated data
      section?.fields?.forEach((field) => {
        const fieldKey = field?.db_field || field?.id;
        if (field?.type === "select" && field?.data_source) {
          const parentKey = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;
          if (parentKey && (newValues[parentKey] !== undefined && newValues[parentKey] !== null && newValues[parentKey] !== "")) {
            const filters = buildFilters(field?.data_source?.filters || {}, newValues, parentKey);
            if (filters) {
              fetchOptions(fieldKey, {
                master_name: field?.data_source?.name,
                filters,
              });
            }
          }
        }
      });
    }, [data, mode, section?.section_id, section?.fields, fetchOptions]);

    useEffect(() => {
      section?.fields?.forEach((field) => {
        const fieldKey = field?.db_field || field?.id;
        if (field?.type === "select" && field?.data_source) {
          const parentKey = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;
          if (!parentKey) fetchOptions(fieldKey, { master_name: field?.data_source?.name });
        }
      });
    }, [section?.section_id, fetchOptions]);

    const handleChange = useCallback(
      (newValuesObj, meta = {}) => {
        let calculatedSnapshot = {};
        setValues((prev) => {
          let updated = { ...prev, ...newValuesObj };
          const changedKey = meta?.db_field || Object.keys(newValuesObj)[0];
          if (changedKey && dependencyMeta?.childrenMap?.[changedKey]) {
            dependencyMeta.childrenMap[changedKey].forEach((childKey) => {
              const childField = section?.fields?.find((f) => (f?.db_field || f?.id) === childKey);
              updated[childKey] = childField?.multiple ? [] : undefined;
              const parentVal = updated[changedKey];
              if (parentVal) {
                fetchOptions(childKey, {
                  master_name: childField?.data_source?.name,
                  filters: buildFilters(childField?.dependency?.filters || [], updated, changedKey),
                });
              } else {
                setOptions((prevOpts) => ({ ...prevOpts, [childKey]: [] }));
              }
            });
          }
          // Evaluate calculations for general section fields
          updated = evaluateRowCalculations(updated, section?.fields);
          calculatedSnapshot = updated;
          return updated;
        });
        const changedKey = meta?.db_field || Object.keys(newValuesObj)[0];
        // Use functional updater so `errors` doesn't need to be in the dep array
        // (having `errors` in deps caused handleChange to recreate on every validation,
        //  which in turn caused re-renders of all child inputs -> potential loop).
        setErrors((prev) => {
          if (changedKey && prev[changedKey]) {
            return { ...prev, [changedKey]: undefined };
          }
          return prev;
        });
        if (onValuesChange) {
          const merged = { ...valuesRef.current, ...newValuesObj, ...calculatedSnapshot };
          onValuesChange(merged);
        }
      },
      // `errors` deliberately omitted — cleared via functional updater
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dependencyMeta, fetchOptions, section?.fields, onValuesChange]
    );

    const getData = useCallback(async () => {
      try {
        const normalizedValues = { ...values };
        section?.fields?.forEach((f) => {
          const k = f?.db_field || f?.column_name || f?.name || f?.id;
          if (["date_range", "date_range_picker", "daterange"].includes(f?.type)) {
            let v = normalizedValues[k];
            if (typeof v === "string") {
              try {
                v = JSON.parse(v);
              } catch {
                if (v.includes(",")) v = v.split(",").map((s) => s.trim());
              }
            }
            normalizedValues[k] = Array.isArray(v) ? v : (v || null);
          }
        });

        const effectiveValues = { ...(allFormValues || {}), ...normalizedValues };

        await yupSchema.validate(normalizedValues, { abortEarly: false });
        setErrors({});
        return { valid: true, data: normalizedValues };
      } catch (err) {
        const effectiveValues = { ...(allFormValues || {}), ...values };
        const validationErrors = {};
        if (err.inner) {
          err.inner.forEach((e) => {
            const targetFld = section?.fields?.find(
              (f) => (f?.db_field || f?.column_name || f?.name || f?.id) === e.path
            );
            const isFldVisible = targetFld
              ? getFieldRuntimeState(targetFld, effectiveValues, "admin").visible
              : true;
            if (isFldVisible && !validationErrors[e.path]) {
              validationErrors[e.path] = e.message;
            }
          });
        }
        if (Object.keys(validationErrors).length === 0) {
          setErrors({});
          return { valid: true, data: values };
        }
        setErrors(validationErrors);
        return { valid: false, errors: validationErrors };
      }
    }, [yupSchema, values, allFormValues, section?.fields]);

    useImperativeHandle(ref, () => ({
      getData,
      reset: () => { setValues({}); setErrors({}); setFileLists({}); },
    }));

    const hooks = useMemo(() => getDynamicFormHooks(form_slug), [form_slug]);

    const renderExtraFields = (fieldDbField, position) => {
      if (!hooks?.getExtraFields) return null;
      return hooks.getExtraFields({
        form_slug,
        mode,
        data,
        values,
        onChange: handleChange,
        sectionSlug: section?.section_id || section?.slug || "general",
        fieldDbField,
        position,
      });
    };

    return (
      <Card title={section?.section_label}>
        <Row gutter={[8, 16]}>
          {section?.fields?.map((field, idx) => {
            if (field?.visible === false) return null;
            const effectiveValues = { ...(allFormValues || {}), ...values };
            const { visible, disabled, readOnly } = getFieldRuntimeState(field, effectiveValues, "admin");
            if (!visible) return null;
            const fieldKey = field?.db_field || field?.column_name || field?.name || field?.id || `field_${idx}`;
            const isCalcReadOnly = field?.calculation?.enabled && field?.calculation?.read_only !== false;
            const isDisabled = disabled || isCalcReadOnly;
            const isReadOnly = readOnly || isCalcReadOnly;
            const isLayoutElement = ["heading", "note", "custom_html", "add_more"].includes(field?.type);
            const colSpan = isLayoutElement ? 24 : (field?.ui?.colSpan || 12);

            return (
              <React.Fragment key={fieldKey}>
                {renderExtraFields(fieldKey, "before")}
                <Col span={colSpan}>
                  {!isLayoutElement && (
                    <label style={{ fontWeight: 600, fontSize: 13, color: "#334155", display: "block", marginBottom: 4 }}>
                      {field?.label}{field?.required && <span style={{ color: "#ff4d4f" }}> *</span>}
                    </label>
                  )}

                  {field?.type === "heading" && (
                    <div className="w-full my-1">
                      <h3 className="text-base font-semibold text-slate-800 m-0">{field?.label}</h3>
                      {field?.show_divider !== false && <div className="border-b border-slate-200 mt-2 mb-1" />}
                    </div>
                  )}

                  {field?.type === "note" && (
                    <Alert message={field?.label} description={field?.content} type={["info","warning","success","error"].includes(field?.note_type) ? field?.note_type : "info"} showIcon />
                  )}

                  {field?.type === "text" && (
                    <Input
                      disabled={isDisabled}
                      readOnly={isReadOnly}
                      style={{
                        background: isReadOnly ? "#f1f5f9" : "#ffffff",
                        cursor: isReadOnly ? "not-allowed" : "text",
                        color: isReadOnly ? "#475569" : "#0f172a",
                      }}
                      placeholder={field?.ui?.placeholder || (isCalcReadOnly ? "Auto-calculated" : "")}
                      value={values?.[fieldKey] !== undefined ? values[fieldKey] : ""}
                      onChange={(e) => {
                        if (isReadOnly) return;
                        handleChange({ [fieldKey]: e.target.value });
                      }}
                    />
                  )}

                  {field?.type === "textarea" && (
                    (field?.ui?.is_text_editor || field?.is_text_editor) ? (
                      <RichTextEditor value={values?.[fieldKey] || ""} disabled={isDisabled} readOnly={isReadOnly}
                        placeholder={field?.ui?.placeholder || "Enter text..."} rows={field?.ui?.rows || 4}
                        onChange={(content) => {
                          if (isReadOnly) return;
                          handleChange({ [fieldKey]: content });
                        }} />
                    ) : (
                      <Input.TextArea
                        value={values?.[fieldKey] !== undefined ? values[fieldKey] : ""}
                        disabled={isDisabled}
                        readOnly={isReadOnly}
                        style={{
                          background: isReadOnly ? "#f1f5f9" : "#ffffff",
                          cursor: isReadOnly ? "not-allowed" : "text",
                          color: isReadOnly ? "#475569" : "#0f172a",
                        }}
                        rows={field?.ui?.rows || 3}
                        placeholder={field?.ui?.placeholder}
                        onChange={(e) => {
                          if (isReadOnly) return;
                          handleChange({ [fieldKey]: e.target.value });
                        }}
                      />
                    )
                  )}

                  {field?.type === "number" && (
                    <Input
                      type="number"
                      disabled={isDisabled}
                      readOnly={isReadOnly}
                      style={{
                        background: isReadOnly ? "#f1f5f9" : "#ffffff",
                        cursor: isReadOnly ? "not-allowed" : "text",
                        color: isReadOnly ? "#334155" : "#0f172a",
                        fontWeight: isCalcReadOnly ? 600 : 400,
                      }}
                      placeholder={field?.ui?.placeholder || (isCalcReadOnly ? "Auto-calculated" : "")}
                      value={values?.[fieldKey] !== undefined ? values[fieldKey] : ""}
                      onChange={(e) => {
                        if (isReadOnly) return;
                        handleChange({ [fieldKey]: e.target.value });
                      }}
                    />
                  )}

                  {field?.type === "date" && (
                    <DatePicker allowClear disabled={isDisabled} style={{ width: "100%" }} format="DD-MM-YYYY"
                      value={values?.[fieldKey] ? dayjs(values[fieldKey], "YYYY-MM-DD") : null}
                      onChange={(date) => handleChange({ [fieldKey]: date ? date.format("YYYY-MM-DD") : null })} />
                  )}

                  {["date_range", "date_range_picker", "daterange"].includes(field?.type) && (
                    <RangePicker allowClear disabled={isDisabled} style={{ width: "100%" }} format="DD-MM-YYYY"
                      value={(() => {
                        let curVal = values?.[fieldKey];
                        if (typeof curVal === "string") {
                          try {
                            curVal = JSON.parse(curVal);
                          } catch {
                            if (curVal.includes(",")) curVal = curVal.split(",").map((s) => s.trim());
                          }
                        }
                        if (Array.isArray(curVal) && curVal.length >= 2) {
                          return [
                            curVal[0] ? dayjs(curVal[0], "YYYY-MM-DD") : null,
                            curVal[1] ? dayjs(curVal[1], "YYYY-MM-DD") : null,
                          ];
                        }
                        return null;
                      })()}
                      onChange={(dates) => {
                        if (!dates || dates.length < 2 || !dates[0] || !dates[1]) {
                          handleChange({ [fieldKey]: null });
                          return;
                        }
                        handleChange({ [fieldKey]: [dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD")] });
                      }} />
                  )}

                  {field?.type === "select" && (
                    <Select
                      showSearch allowClear disabled={isDisabled}
                      mode={field?.multiple ? "multiple" : undefined}
                      style={{ width: "100%" }}
                      placeholder={field?.ui?.placeholder || "Select"}
                      value={formatSelectValue(values?.[fieldKey], !!field?.multiple)}
                      options={(options?.[fieldKey] || field?.options || []).map((opt) => ({
                        value: String(opt.value), label: opt.label,
                      }))}
                      onChange={(val) => handleChange({ [fieldKey]: val })}
                      filterOption={(input, option) => String(option?.label || "").toLowerCase().includes(input.toLowerCase())}
                    />
                  )}

                  {field?.type === "file" && (
                    <Upload
                      fileList={fileLists?.[fieldKey] || []}
                      multiple={field?.file?.multiple || false}
                      accept={field?.file?.allowed_types?.length > 0 ? field.file.allowed_types.join(",") : undefined}
                      beforeUpload={() => false}
                      onChange={({ fileList }) => {
                        const finalList = field?.file?.multiple ? fileList : fileList.slice(-1);
                        setFileLists((prev) => ({ ...prev, [fieldKey]: finalList }));
                        handleChange({ [fieldKey]: finalList });
                      }}
                    >
                      <Button icon={<UploadOutlined />}>Choose File</Button>
                    </Upload>
                  )}

                  {field?.type === "add_more" && (
                    <EmbeddedAddMore
                      field={field}
                      fieldKey={fieldKey}
                      values={values}
                      mode={mode}
                      form_slug={form_slug}
                      serverError={serverError}
                      handleChange={handleChange}
                    />
                  )}

                  {errors?.[fieldKey] && (
                    <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors[fieldKey]}</div>
                  )}
                </Col>
                {renderExtraFields(fieldKey, "after")}
              </React.Fragment>
            );
          })}
        </Row>
      </Card>
    );
  }
);

export default memo(GeneralSectionV2);
