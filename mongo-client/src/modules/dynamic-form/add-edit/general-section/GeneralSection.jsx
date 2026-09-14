import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Alert,
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
import { resolveDateValue } from "./helper/date.helper";
import { getDefaultValueByType } from "./helper/defaultValue.helper";
import {
  buildFileListFromDocuments,
  resolveSelectValue,
} from "./helper/hydrateForm.helper";
import { buildDependencyMeta, buildFilters, normalizeKey } from "./helper/master.helper";
import { isWithinRange, NUMBER_REGEX } from "./helper/number.helper";
import { getFieldRuntimeState } from "./helper/runTimeCondition.helper";
import { buildYupSchema } from "./helper/validation.helper";
import { evaluateRowCalculations } from "../add-more-section/helper/calculation.helper";
import RichTextEditor from "@/components/common/RichTextEditor";
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

const GeneralSection = forwardRef(
  ({ section, data, mode, form_slug, serverError }, ref) => {
    const [values, setValues] = useState({});
    const [errors, setErrors] = useState({});
    const [options, setOptions] = useState({});
    const [fileLists, setFileLists] = useState({});

    const hooks = useMemo(() => getDynamicFormHooks(form_slug), [form_slug]);

    // for validation
    const yupSchema = useMemo(
      () => buildYupSchema(section?.fields),
      [section?.section_id]
    );
    // for dependency
    const dependencyMeta = useMemo(
      () => buildDependencyMeta(section?.fields),
      [section?.section_id]
    );

    // for file upload
    const deleteFile = useCallback(async (file) => {
      if (file?.id) {
        try {
          const res = await deleteFileById(file?.id);
          message.success(res?.data?.message);
        } catch (error) {
          message.error(
            error?.response?.data?.originalError ||
            error?.response?.data?.message
          );
          return false;
        }
      }
      return true;
    }, []);

    /* ---------- LOAD MASTER DATA ---------- */
    const loadMasterOptions = useCallback(async (field, values) => {
      try {
        const ds = field?.data_source;

        if (!ds || ds?.type !== "master") return;

        const parentDbField = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;
        const filters = buildFilters(ds?.filters || {}, values, parentDbField);

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
          value: opt?.value !== null && opt?.value !== undefined ? String(opt.value) : opt?.value,
        }));

        setOptions((prev) => ({
          ...prev,
          [field.db_field]: formattedData,
        }));
      } catch (error) {
        message.error(
          error?.response?.data?.originalError || error?.response?.data?.message
        );
      }
    }, []);

    const handleChange = useCallback(
      (payload, meta = {}) => {
        const changedField = meta?.db_field || Object.keys(payload || {})[0];
        const normField = normalizeKey(changedField);

        const dependents = Array.from(new Set([
          ...(dependencyMeta?.allDependentsMap?.[changedField] || []),
          ...(dependencyMeta?.allDependentsMap?.[normField] || []),
        ]));

        // clear dependent OPTIONS
        if (dependents.length > 0) {
          setOptions((prev) => {
            const next = { ...prev };
            dependents.forEach((dep) => {
              next[dep] = [];
            });
            return next;
          });
        }

        setValues((prevValues) => {
          let updatedValues = { ...prevValues, ...payload };

          // Evaluate calculations for general section fields
          updatedValues = evaluateRowCalculations(updatedValues, section?.fields);

          // clear dependent VALUES
          dependents.forEach((dep) => {
            updatedValues[dep] = undefined;
          });

          // reload immediate children options
          const children = Array.from(new Set([
            ...(dependencyMeta?.childrenMap?.[changedField] || []),
            ...(dependencyMeta?.childrenMap?.[normField] || []),
          ]));

          children.forEach((child) => {
            const field = section?.fields?.find(
              (f) =>
                f?.db_field === child ||
                f?.column_name === child ||
                (f?.db_field && normalizeKey(f.db_field) === normalizeKey(child)) ||
                (f?.column_name && normalizeKey(f.column_name) === normalizeKey(child))
            );

            if (field) {
              loadMasterOptions(field, updatedValues);
            }
          });

          return updatedValues;
        });
      },
      [dependencyMeta, section?.section_id, section?.fields, loadMasterOptions]
    );

    // from parent by using ref what will be called
    useImperativeHandle(ref, () => ({
      async getData() {
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

          const validatedValues = await yupSchema.validate(normalizedValues, { abortEarly: false });
          setErrors({});
          return { valid: true, data: { ...normalizedValues, ...validatedValues } };
        } catch (err) {
          const errObj = {};
          if (err.inner) err.inner.forEach((e) => (errObj[e.path] = e.message));
          setErrors(errObj);
          return { valid: false, errors: errObj };
        }
      },
      reset: () => {
        setOptions({});
        setErrors({});
        setValues({});
        setFileLists({});
      },
    }));

    useEffect(() => {
      let alive = true;

      const hydrate = async () => {
        const initialValues = { ...(data || {}) };
        const initialFileLists = {};

        if (data?.[section?.primary_key]) {
          initialValues[section?.primary_key] = data?.[section?.primary_key];
        }
        /* ---------- VALUE + FILE HYDRATION ---------- */
        section.fields.forEach((field, index) => {
          if (field?.visible === false && field?.add_to_query !== true) return;
          /* FILE */
          if (field.type === "file") {
            const parent = field.dependency?.parent_db_field;

            if (parent && !data?.[parent]) {
              initialFileLists[field.db_field] = [];
              initialValues[field.db_field] = [];
            } else {
              const docs = data?.documents?.[field.db_field] || [];
              const files = buildFileListFromDocuments(docs, field);
              initialFileLists[field.db_field] = files;
              initialValues[field.db_field] = files;
            }
            return;
          }

          /* DATE RANGE */
          if (["date_range", "date_range_picker", "daterange"].includes(field.type)) {
            if (field.act_db_field) {
              const start = data?.[field.act_db_field.start];
              const end = data?.[field.act_db_field.end];
              initialValues[field.db_field] =
                start && end ? [start, end] : getDefaultValueByType(field);
            } else {
              let rangeVal = data?.[field.db_field];
              if (typeof rangeVal === "string") {
                try {
                  rangeVal = JSON.parse(rangeVal);
                } catch {
                  if (rangeVal.includes(",")) rangeVal = rangeVal.split(",").map((s) => s.trim());
                }
              }
              initialValues[field.db_field] = Array.isArray(rangeVal) ? rangeVal : getDefaultValueByType(field);
            }
            return;
          }

          /* SELECT */
          if (field.type === "select") {
            initialValues[field.db_field] = resolveSelectValue(
              field,
              data?.[field.db_field]
            );
            return;
          }
          /* NORMAL */
          initialValues[field.db_field] =
            data?.[field.db_field] ?? getDefaultValueByType(field);
        });

        if (!alive) return;

        setValues(initialValues);
        setFileLists(initialFileLists);
        setOptions({}); // reset before loading masters

        /* ---------- OPTIMIZED MASTER LOADING ---------- */
        await Promise.all(
          section.fields
            .filter((f) => f.type === "select" && f?.visible !== false)
            .map((field) => {
              // ROOT MASTER
              if (!field.dependency) {
                return loadMasterOptions(field, initialValues);
              }

              // DEPENDENT MASTER
              const parentValue =
                initialValues[field.dependency.parent_db_field];
              if (parentValue) {
                return loadMasterOptions(field, initialValues);
              }

              return Promise.resolve();
            })
        );
      };

      hydrate();

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

    const renderExtraFields = useCallback(
      (fieldDbField = null, position = "after") => {
        if (!hooks.getExtraFields) return null;
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
      },
      [hooks, form_slug, mode, data, values, handleChange, section?.section_id, section?.slug]
    );

    return (
      <Card title={section?.section_label}>
        <Row gutter={[8, 16]}>
          {renderExtraFields(null, "section_top")}
          {section?.fields?.map((field, idx) => {
            if (field?.visible === false) return null;
            const { visible, disabled, readOnly } = getFieldRuntimeState(
              field,
              values,
              "admin"
            );

            if (!visible) return null;

            const fieldKey = field?.db_field || field?.column_name || field?.name || field?.id || field?.key || `field_${idx}`;
            const parentField = field?.dependency?.parent_db_field || field?.dependency?.parent || field?.dependency?.parent_field || field?.parent_db_field;
            const parentVal = parentField ? (values?.[parentField] || Object.entries(values || {}).find(([k, v]) => normalizeKey(k) === normalizeKey(parentField) && v !== undefined && v !== null && v !== "")?.[1]) : null;
            const isParentMissing = !!parentField && (parentVal === undefined || parentVal === null || parentVal === "");
            const isCalcReadOnly = field?.calculation?.enabled && field?.calculation?.read_only !== false;
            const isDisabled = disabled || isParentMissing || isCalcReadOnly;
            const isReadOnly = readOnly || isCalcReadOnly;

            const isLayoutElement = ["heading", "note", "custom_html"].includes(field?.type);
            const defaultColSpan = isLayoutElement ? 24 : 12;

            return (
              <React.Fragment key={fieldKey}>
                {renderExtraFields(field?.db_field, "before")}
                <Col span={field?.ui?.colSpan || defaultColSpan}>
                {field?.type === "heading" && (
                  <div className="w-full my-1">
                    {field?.heading_level === "h1" ? (
                      <h1 className="text-2xl font-bold text-slate-800 m-0">{field?.label || "Heading"}</h1>
                    ) : field?.heading_level === "h2" ? (
                      <h2 className="text-xl font-bold text-slate-800 m-0">{field?.label || "Heading"}</h2>
                    ) : field?.heading_level === "h4" ? (
                      <h4 className="text-sm font-semibold text-slate-800 m-0">{field?.label || "Heading"}</h4>
                    ) : (
                      <h3 className="text-base font-semibold text-slate-800 m-0">{field?.label || "Heading"}</h3>
                    )}
                    {field?.subtext && <p className="text-xs text-slate-500 mt-1 mb-0">{field.subtext}</p>}
                    {field?.show_divider !== false && <div className="border-b border-slate-200 mt-2 mb-1" />}
                  </div>
                )}

                {field?.type === "note" && (
                  <div className="w-full my-1">
                    <Alert
                      message={field?.label || undefined}
                      description={field?.content || "Instructional note"}
                      type={["info", "warning", "success", "error"].includes(field?.note_type) ? field?.note_type : "info"}
                      showIcon
                    />
                  </div>
                )}

                {field?.type === "custom_html" && (
                  <div className="w-full my-1">
                    {field?.label && <div className="font-semibold text-sm mb-1">{field.label}</div>}
                    <div dangerouslySetInnerHTML={{ __html: field?.html_content || "" }} />
                  </div>
                )}

                {!isLayoutElement && (
                  <>
                    <label>{field?.label}</label>
                    {field?.required && (
                      <span style={{ color: "#ff4d4f" }}> *</span>
                    )}
                  </>
                )}

                {field?.type === "text" && (
                  <Input
                    disabled={isDisabled || false}
                    readOnly={isReadOnly || false}
                    placeholder={field?.ui?.placeholder || ""}
                    maxLength={field?.validation?.max_length || undefined}
                    value={values?.[field?.db_field]}
                    onChange={(e) =>
                      handleChange({
                        [field.db_field]: e.target.value,
                      })
                    }
                  />
                )}
                {field?.type === "textarea" && (
                  (field?.ui?.is_text_editor || field?.is_text_editor) ? (
                    <RichTextEditor
                      key={field?.db_field || field?.id}
                      value={values?.[field?.db_field] || ""}
                      disabled={isDisabled || false}
                      readOnly={isReadOnly || false}
                      placeholder={field?.ui?.placeholder || "Enter text..."}
                      rows={field?.ui?.rows || 4}
                      onChange={(content) =>
                        handleChange({
                          [field.db_field]: content,
                        })
                      }
                    />
                  ) : (
                    <Input.TextArea
                      value={values?.[field?.db_field] || ""}
                      disabled={isDisabled || false}
                      readOnly={isReadOnly || false}
                      rows={field?.ui?.rows || 3}
                      placeholder={field?.ui?.placeholder}
                      autoSize={field?.ui?.auto_size}
                      maxLength={field?.validation?.max_length}
                      showCount={Boolean(
                        field?.ui?.max_length_hint && field?.validation?.max_length
                      )}
                      onChange={(e) =>
                        handleChange({
                          [field.db_field]: e.target.value,
                        })
                      }
                    />
                  )
                )}
                {field?.type === "date" && (
                  <DatePicker
                    allowClear
                    disabled={isDisabled || false}
                    style={{ width: "100%" }}
                    format="DD-MM-YYYY"
                    allowEmpty={[true, true]}
                    value={
                      values?.[field?.db_field]
                        ? dayjs(values[field.db_field], "YYYY-MM-DD")
                        : null
                    }
                    onChange={(date) => {
                      handleChange({
                        [field.db_field]: date
                          ? date.format("YYYY-MM-DD")
                          : null,
                      });
                    }}
                    disabledDate={(current) => {
                      if (!current) return false;

                      const min = resolveDateValue(
                        field?.validation?.min_date,
                        values
                      );
                      const max = resolveDateValue(
                        field?.validation?.max_date,
                        values
                      );

                      if (min && current.isBefore(min, "day")) return true;
                      if (max && current.isAfter(max, "day")) return true;

                      return false;
                    }}
                  />
                )}

                {["date_range", "date_range_picker", "daterange"].includes(field?.type) && (
                  <RangePicker
                    allowClear
                    disabled={isDisabled || false}
                    style={{ width: "100%" }}
                    format="DD-MM-YYYY"
                    allowEmpty={[true, true]}
                    value={(() => {
                      let curVal = values?.[field?.db_field];
                      if (typeof curVal === "string") {
                        try {
                          curVal = JSON.parse(curVal);
                        } catch {
                          if (curVal.includes(",")) curVal = curVal.split(",").map(s => s.trim());
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
                      if (!dates) {
                        handleChange({
                          [field.db_field]: null,
                        });
                        return;
                      }

                      handleChange({
                        [field.db_field]: [
                          dates[0].format("YYYY-MM-DD"),
                          dates[1].format("YYYY-MM-DD"),
                        ],
                      });
                    }}
                    disabledDate={(current) => {
                      if (!current) return false;

                      const min = resolveDateValue(
                        field?.validation?.min_date,
                        values
                      );
                      const max = resolveDateValue(
                        field?.validation?.max_date,
                        values
                      );

                      if (min && current.isBefore(min, "day")) return true;
                      if (max && current.isAfter(max, "day")) return true;

                      return false;
                    }}
                  />
                )}
                {field?.type === "number" && (
                  <Input
                    value={values?.[field?.db_field]}
                    disabled={isDisabled || false}
                    readOnly={isReadOnly || false}
                    placeholder={field?.ui?.placeholder || ""}
                    maxLength={field?.validation?.max_length || undefined}
                    onChange={(e) => {
                      const val = e.target.value;

                      // regex check
                      const regex = NUMBER_REGEX?.[field?.regex_type];

                      if (!regex.test(val)) return;

                      // min / max check
                      if (!isWithinRange(val, field)) return;

                      // update state
                      handleChange({
                        [field.db_field]: val,
                      });
                    }}
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
                      values?.[fieldKey] !== undefined ? values?.[fieldKey] : values?.[field?.db_field],
                      !!field?.multiple
                    )}
                    style={{ width: "100%" }}
                    options={
                      (options?.[fieldKey] || options?.[field?.db_field] || field?.options || []).map((opt) => ({
                        ...opt,
                        value: opt?.value !== null && opt?.value !== undefined ? String(opt.value) : opt?.value,
                        label: opt?.label ?? opt?.value,
                      }))
                    }
                    onChange={(value) =>
                      handleChange(
                        { [fieldKey]: value },
                        { db_field: fieldKey, type: field?.type }
                      )
                    }
                    filterOption={(input, option) =>
                      String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                    }
                  />
                )}

                {["point", "multipolygon", "line"].includes(field?.type) && (
                  <div className="w-full my-1">
                    <Input.TextArea
                      disabled={isDisabled || false}
                      readOnly={isReadOnly || false}
                      rows={field?.ui?.rows || 4}
                      className="font-mono text-xs"
                      placeholder={
                        field?.ui?.placeholder ||
                        `Enter ${field?.type_name || field?.type} JSON (e.g. {"type": "${
                          field?.type === "point"
                            ? "Point"
                            : field?.type === "line"
                            ? "LineString"
                            : "MultiPolygon"
                        }", "coordinates": [...]})`
                      }
                      value={
                        typeof values?.[field?.db_field] === "object" && values?.[field?.db_field] !== null
                          ? JSON.stringify(values[field.db_field], null, 2)
                          : values?.[field?.db_field] || ""
                      }
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        try {
                          const parsed = JSON.parse(rawVal);
                          handleChange({ [field.db_field]: parsed });
                        } catch (_) {
                          handleChange({ [field.db_field]: rawVal });
                        }
                      }}
                    />
                    <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>Geometry Format:</span>
                        <span className="font-semibold text-purple-700 uppercase">
                          {field?.type} (JSON)
                        </span>
                      </span>
                      {!isDisabled && !isReadOnly && (
                        <button
                          type="button"
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium underline border-0 bg-transparent cursor-pointer"
                          onClick={() => {
                            let sampleVal = {};
                            if (field?.type === "point") {
                              sampleVal = { type: "Point", coordinates: [77.5946, 12.9716] };
                            } else if (field?.type === "line") {
                              sampleVal = {
                                type: "LineString",
                                coordinates: [
                                  [77.5946, 12.9716],
                                  [77.6046, 12.9816],
                                ],
                              };
                            } else if (field?.type === "multipolygon") {
                              sampleVal = {
                                type: "MultiPolygon",
                                coordinates: [
                                  [
                                    [
                                      [77.59, 12.97],
                                      [77.60, 12.97],
                                      [77.60, 12.98],
                                      [77.59, 12.98],
                                      [77.59, 12.97],
                                    ],
                                  ],
                                ],
                              };
                            }
                            handleChange({ [field.db_field]: sampleVal });
                          }}
                        >
                          + Insert Sample {field?.type_name || field?.type} JSON
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {field?.type === "file" && (
                  <>
                    <div
                      style={{
                        width: "100%",
                        maxHeight: "200px",
                        overflowY: "auto",
                        border: "1px solid #d9d9d9",
                        padding: "12px",
                        borderRadius: "6px",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Upload
                        fileList={fileLists?.[field?.db_field] || []}
                        multiple={field?.file?.multiple || false}
                        accept={
                          field?.file?.allowed_types?.length > 0
                            ? field.file.allowed_types.join(",")
                            : undefined
                        }
                        beforeUpload={() => false}
                        onChange={({ fileList }) => {
                          const finalList = field?.file?.multiple
                            ? fileList
                            : fileList.slice(-1);

                          setFileLists((prev) => ({
                            ...prev,
                            [field.db_field]: finalList,
                          }));

                          handleChange({
                            [field.db_field]: finalList,
                          });
                        }}
                        showUploadList={{ showRemoveIcon: false }}
                        itemRender={(originNode, file, currFileList) => {
                          return (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "4px 8px",
                                marginBottom: 6,
                                border: "1px solid #d9d9d9",
                                borderRadius: 6,
                                backgroundColor: "#fff",
                                transition: "background-color 0.2s",
                                cursor: "default",
                              }}
                              onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f5f5f5")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = "#fff")
                              }
                            >
                              <div style={{ flex: 1, fontSize: 14 }}>
                                {originNode}
                              </div>
                              <Popconfirm
                                title="Are you sure to delete this?"
                                okText="Yes"
                                cancelText="No"
                                onConfirm={async () => {
                                  const isDeleted = await deleteFile(file);
                                  if (isDeleted) {
                                    const updatedList = (
                                      currFileList || []
                                    ).filter((f) => f?.uid !== file?.uid);
                                    setFileLists((prev) => ({
                                      ...prev,
                                      [field.db_field]: updatedList,
                                    }));
                                    handleChange({
                                      [field.db_field]: updatedList,
                                    });
                                  }
                                }}
                              >
                                <DeleteOutlined
                                  style={{
                                    color: "red",
                                    marginLeft: 8,
                                    cursor: "pointer",
                                  }}
                                />
                              </Popconfirm>
                            </div>
                          );
                        }}
                      >
                        <Button
                          style={{ marginBottom: 4 }}
                          icon={<UploadOutlined />}
                        >
                          Choose File
                        </Button>
                      </Upload>
                    </div>
                  </>
                )}

                {/* ERROR DISPLAY */}
                {errors?.[field?.db_field] && (
                  <div className="error text-danger">
                    {errors?.[field?.db_field]}
                  </div>
                )}
              </Col>
                {renderExtraFields(field?.db_field, "after")}
              </React.Fragment>
            );
          })}
          {renderExtraFields(null, "section_bottom")}
        </Row>
      </Card>
    );
  }
);

export default memo(GeneralSection);
