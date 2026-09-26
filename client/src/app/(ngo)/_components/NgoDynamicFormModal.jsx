'use client';

import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Upload,
  Button,
  Row,
  Col,
  Card,
  Divider,
  App,
  Space,
  Switch,
  Checkbox,
  TimePicker,
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  MailOutlined,
  PhoneOutlined,
  LinkOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { privateHttpClient } from "@/services/api/httpClient";
import { dynamicMasterDetailsAPI } from "@/services/dynamicForm-service";

const { TextArea } = Input;

const normFile = (e) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

export default function NgoDynamicFormModal({
  open,
  onClose,
  schema,
  initialValues = {},
  mode = "add",
  formSlug = "implementation_partner",
  apiEndpoint = "ngo/profile",
  isVersioned = false,
  title = "Update Profile",
  onSuccess,
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileListMap, setFileListMap] = useState({});

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const setupFormValues = async () => {
      const formatted = { ...initialValues };
      const sections = schema?.sections || [];

      for (const sec of sections) {
        if (sec.type === "add_more") {
          const secKey = sec.slug || sec.section_id;
          let rows =
            initialValues?.[sec.slug] ??
            initialValues?.[sec.section_id] ??
            initialValues?.[sec.table] ??
            initialValues?.[secKey];

          if (typeof rows === "string") {
            try {
              rows = JSON.parse(rows);
            } catch (_) { }
          }

          const isMasterDriven = Boolean(
            sec.is_master_driven ||
            sec.context?.is_master_driven ||
            sec.master_source ||
            sec.context?.master_source ||
            (formSlug === "due_diligence" && (sec.slug?.includes("reg") || sec.title?.toLowerCase().includes("registration")))
          );

          const masterSource =
            sec.master_source ||
            sec.context?.master_source ||
            (isMasterDriven ? "dd_document_type" : null);

          // If master-driven, auto-populate from master table if rows empty or missing master items
          if (isMasterDriven && masterSource) {
            try {
              const masterRes = await dynamicMasterDetailsAPI({ master: masterSource });
              const masterItems = masterRes?.data?.data || [];

              if (Array.isArray(masterItems) && masterItems.length > 0) {
                // If it's statutory registrations, strictly filter the 8 compliance items requested
                const isRegSection =
                  formSlug === "due_diligence" ||
                  sec.slug?.includes("reg") ||
                  sec.title?.toLowerCase().includes("registration") ||
                  sec.section_label?.toLowerCase().includes("registration") ||
                  sec.context?.master_source === "dd_document_type" ||
                  sec.master_source === "dd_document_type";

                let targetItems = masterItems;
                if (isRegSection) {
                  const STATUTORY_ITEMS = [
                    "12A Registration",
                    "80G Certificate",
                    "CSR-1 Registration",
                    "FCRA Registration",
                    "NITI Aayog NGO DARPAN ID",
                    "Professional Tax Registration",
                    "EPF Registration",
                    "ESIC Registration",
                  ];
                  const normalize = (str) => String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const matched = [];
                  STATUTORY_ITEMS.forEach((stat) => {
                    const normStat = normalize(stat);
                    const found = masterItems.find((item) => {
                      const norm = normalize(item.label || item.type_name || item.name);
                      return norm === normStat;
                    });
                    if (found) {
                      matched.push(found);
                    } else {
                      matched.push({ id: stat, type_name: stat, label: stat });
                    }
                  });
                  if (matched.length > 0) targetItems = matched;
                }

                // Map existing saved rows by name
                const existingMap = new Map();
                if (Array.isArray(rows)) {
                  rows.forEach((r) => {
                    const k = String(r.registration || r.registration_name || r.document_type || r.type_name || r.name || "").toLowerCase().trim();
                    if (k) existingMap.set(k, r);
                  });
                }

                const secFields = sec.fields || [];
                const labelCol =
                  secFields.find((f) => {
                    const k = (f.db_field || f.slug || f.name || "").toLowerCase();
                    return k.includes("reg") || k.includes("document") || k.includes("type") || k === "name" || k === "title";
                  }) || secFields[0];

                // Auto-generate rows from master with all section fields mapped
                const masterRows = targetItems.map((m) => {
                  const label = m.label || m.type_name || m.name;
                  const key = String(label).toLowerCase().trim();
                  const saved = existingMap.get(key) || {};

                  const rowObj = {
                    id: saved.id || undefined,
                    ...saved,
                  };

                  if (labelCol) {
                    const lKey = labelCol.db_field || labelCol.slug || labelCol.name;
                    rowObj[lKey] = label;
                  }
                  rowObj.registration = label;
                  rowObj.registration_name = label;
                  rowObj.document_type = label;
                  rowObj.type_name = label;
                  rowObj.name = label;

                  // Pre-populate defaults for all section fields
                  secFields.forEach((f) => {
                    const fKey = f.db_field || f.slug || f.field_id || f.name;
                    if (rowObj[fKey] === undefined || rowObj[fKey] === null) {
                      if (f.type === "select") {
                        if (fKey === "applicable") rowObj[fKey] = "yes";
                        else if (fKey === "available") rowObj[fKey] = "No";
                        else rowObj[fKey] = f.options?.[0]?.value ?? f.options?.[0] ?? "";
                      } else if (["file", "upload", "document"].includes(String(f.type || "").toLowerCase())) {
                        rowObj[fKey] = [];
                      } else {
                        rowObj[fKey] = "";
                      }
                    } else {
                      if (["file", "upload", "document"].includes(String(f.type || "").toLowerCase())) {
                        const raw = rowObj[fKey];
                        if (raw && typeof raw === "string") {
                          rowObj[fKey] = [{ uid: "-1", name: raw.split("/").pop(), status: "done", url: raw }];
                        } else if (!Array.isArray(raw)) {
                          rowObj[fKey] = [];
                        }
                      } else if (f.type === "date" && rowObj[fKey]) {
                        rowObj[fKey] = dayjs(rowObj[fKey]);
                      }
                    }
                  });

                  return rowObj;
                });

                rows = masterRows;
              }
            } catch (masterErr) {
              console.warn("Failed to load master rows:", masterErr);
            }
          }

          if (Array.isArray(rows)) {
            const processedRows = rows.map((r) => {
              if (!r || typeof r !== "object") return r;
              const rCopy = { ...r };
              (sec.fields || []).forEach((f) => {
                const k = f.db_field || f.slug || f.field_id || f.name;
                if (f.type === "date" && rCopy[k]) {
                  rCopy[k] = dayjs(rCopy[k]);
                }
                if (["file", "upload", "document"].includes(String(f.type || "").toLowerCase())) {
                  const val = rCopy[k];
                  if (val && typeof val === "string") {
                    rCopy[k] = [{ uid: "-1", name: val.split("/").pop(), status: "done", url: val }];
                  } else if (!Array.isArray(val)) {
                    rCopy[k] = [];
                  }
                }
              });
              return rCopy;
            });
            formatted[secKey] = processedRows;
            if (sec.slug) formatted[sec.slug] = processedRows;
            if (sec.section_id) formatted[sec.section_id] = processedRows;
          }
        } else {
          (sec.fields || []).forEach((f) => {
            const key = f.db_field || f.slug || f.field_id || f.name;
            if (f.type === "date" && formatted[key]) {
              formatted[key] = dayjs(formatted[key]);
            }
          });
        }
      }

      if (isMounted) {
        form.setFieldsValue(formatted);
      }
    };

    setupFormValues();

    return () => {
      isMounted = false;
    };
  }, [open, initialValues, schema, form, formSlug]);

  const handleModalClose = () => {
    form.resetFields();
    setFileListMap({});
    onClose();
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);

      // Helper: convert a File/Blob to a base64 Data URL
      const toBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });

      // Helper: convert a file list item to a serialisable object
      const serializeFileItem = async (item) => {
        const rawFile = item?.originFileObj || (item instanceof File || item instanceof Blob ? item : null);
        if (rawFile) {
          try {
            const b64 = await toBase64(rawFile);
            return {
              uid: item.uid || String(Date.now()),
              name: rawFile.name || item.name || "attached_file",
              size: rawFile.size || item.size,
              type: rawFile.type || item.type,
              url: b64,
              status: "done",
            };
          } catch (_) {
            return item;
          }
        }
        // Already serialisable (previously stored file object)
        const { originFileObj: _ofo, ...rest } = item || {};
        return rest;
      };

      // Build the JSON payload
      const payload = {
        form_slug: formSlug,
      };

      if (values.id || initialValues?.id) {
        payload.id = values.id || initialValues.id;
      }

      // Process all form values — convert dayjs dates, convert files to base64
      for (const [k, v] of Object.entries(values)) {
        if (v === undefined || v === null) {
          payload[k] = v;
          continue;
        }

        if (dayjs.isDayjs(v)) {
          payload[k] = v.format("YYYY-MM-DD");
          continue;
        }

        // Array: could be add-more rows OR a top-level file list
        if (Array.isArray(v)) {
          if (v.length === 0) {
            payload[k] = [];
            continue;
          }

          const firstItem = v[0];

          // Top-level file list (antd Upload fileList items have uid / originFileObj)
          if (firstItem && typeof firstItem === "object" && (firstItem.uid !== undefined || firstItem.originFileObj)) {
            payload[k] = await Promise.all(v.map(serializeFileItem));
            continue;
          }

          // Add-more rows: iterate rows and convert any nested file lists
          const rowCopies = [];
          for (const row of v) {
            if (row && typeof row === "object") {
              const rowCopy = { ...row };
              for (const [fK, fV] of Object.entries(rowCopy)) {
                if (dayjs.isDayjs(fV)) {
                  rowCopy[fK] = fV.format("YYYY-MM-DD");
                } else if (Array.isArray(fV) && fV.length > 0 && fV[0] && typeof fV[0] === "object" && (fV[0].uid !== undefined || fV[0].originFileObj)) {
                  rowCopy[fK] = await Promise.all(fV.map(serializeFileItem));
                }
              }
              rowCopies.push(rowCopy);
            } else {
              rowCopies.push(row);
            }
          }
          payload[k] = rowCopies;
          continue;
        }

        payload[k] = v;
      }

      // Also handle top-level fileListMap fields (file pickers not backed by antd Form)
      for (const [fieldKey, fileList] of Object.entries(fileListMap)) {
        if (Array.isArray(fileList) && fileList.length > 0) {
          payload[fieldKey] = await Promise.all(fileList.map(serializeFileItem));
        }
      }

      // Send as JSON — avoids Multer field-size limits entirely
      const res = await privateHttpClient.post(apiEndpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (res?.data?.success) {
        message.success(res.data.message || `${title} saved successfully!`);
        if (onSuccess) {
          await onSuccess(res.data);
        }
        onClose();
      } else {
        message.error(res?.data?.message || "Failed to save details");
      }
    } catch (err) {
      console.error("Save error:", err);
      message.error(err.response?.data?.message || err.message || "An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldInput = (field) => {
    const type = String(field.type || "text").toLowerCase();
    const fieldKey = field.db_field || field.slug || field.field_id || field.name;

    if (type === "textarea") {
      return <TextArea rows={3} placeholder={`Enter ${field.label || field.name}`} />;
    }

    if (type === "number" || type === "currency") {
      return (
        <InputNumber
          style={{ width: "100%" }}
          placeholder={`Enter ${field.label || field.name}`}
          formatter={type === "currency" ? (value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : undefined}
        />
      );
    }

    if (type === "date") {
      return <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />;
    }

    if (type === "time") {
      return <TimePicker style={{ width: "100%" }} format="HH:mm" />;
    }

    if (type === "switch" || type === "boolean") {
      return <Switch checkedChildren="Yes" unCheckedChildren="No" />;
    }

    if (type === "checkbox") {
      return <Checkbox>{field.placeholder || field.label || field.name}</Checkbox>;
    }

    if (type === "select" || type === "dropdown") {
      let opts = [];
      if (Array.isArray(field.options)) {
        opts = field.options.map((o) => {
          if (typeof o === "string") return { label: o, value: o };
          return { label: o.label || o.name || o.value, value: o.value ?? o.id };
        });
      }
      return (
        <Select
          placeholder={`Select ${field.label || field.name}`}
          options={opts}
          allowClear
          showSearch
          optionFilterProp="label"
        />
      );
    }

    if (type === "multiselect" || type === "multi_select" || type === "tags") {
      let opts = [];
      if (Array.isArray(field.options)) {
        opts = field.options.map((o) => {
          if (typeof o === "string") return { label: o, value: o };
          return { label: o.label || o.name || o.value, value: o.value ?? o.id };
        });
      }
      return (
        <Select
          mode="multiple"
          placeholder={`Select ${field.label || field.name}`}
          options={opts}
          allowClear
        />
      );
    }

    if (type === "file" || type === "upload" || type === "document") {
      const existingFile = initialValues?.[fieldKey];
      return (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            fileList={fileListMap[fieldKey] || []}
            onChange={({ fileList }) => {
              setFileListMap((prev) => ({ ...prev, [fieldKey]: fileList }));
            }}
          >
            <Button icon={<UploadOutlined />}>Choose Document</Button>
          </Upload>
          {existingFile && typeof existingFile === "string" && (
            <div style={{ fontSize: 12, color: "#166534" }}>
              <FileTextOutlined style={{ marginRight: 4 }} />
              Current: <a href={existingFile} target="_blank" rel="noreferrer">View Uploaded File</a>
            </div>
          )}
        </Space>
      );
    }

    if (type === "radio") {
      let opts = [];
      if (Array.isArray(field.options)) {
        opts = field.options.map((o) => {
          if (typeof o === "string") return { label: o, value: o };
          return { label: o.label || o.name || o.value, value: o.value ?? o.id };
        });
      }
      return <Radio.Group options={opts} />;
    }

    if (type === "email") {
      return <Input prefix={<MailOutlined style={{ color: "#94a3b8" }} />} placeholder={`Enter email`} type="email" />;
    }

    if (type === "phone" || type === "mobile" || type === "tel") {
      return <Input prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />} placeholder={`Enter phone number`} />;
    }

    if (type === "url" || type === "website" || type === "link") {
      return <Input prefix={<LinkOutlined style={{ color: "#94a3b8" }} />} placeholder="https://" />;
    }

    return <Input placeholder={`Enter ${field.label || field.name}`} />;
  };

  const sections = schema?.sections || [];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SaveOutlined style={{ color: "#ffffff", fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#ffffff", letterSpacing: "-0.2px" }}>
            {mode === "add" ? `Add ${title}` : `Edit ${title}`}
          </span>
        </div>
      }
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={1320}
      className="ngo-dynamic-modal"
      destroyOnHidden
      style={{
        maxWidth: "94vw",
        top: 18,
        paddingBottom: 20,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(88vh - 70px)",
        }}
      >
        <div
          style={{
            overflowY: "auto",
            overflowX: "hidden",
            padding: "16px 4px 10px 4px",
            flex: "1 1 auto",
          }}
          className="ngo-modal-form-scroll"
        >
          {/* Dynamic Sections and Fields */}
          {sections.map((section, sIdx) => {
            const fields = section.fields || [];
            const isAddMore = section.type === "add_more";
            const isMasterDriven = Boolean(
              section.is_master_driven ||
              section.context?.is_master_driven ||
              section.master_source ||
              section.context?.master_source ||
              (formSlug === "due_diligence" && (section.slug?.includes("reg") || section.title?.toLowerCase().includes("registration")))
            );

            if (isAddMore) {
              const allowAdd = section.allow_add_rows ?? section.context?.allow_add_rows ?? !isMasterDriven;
              const allowDelete = section.allow_delete_rows ?? section.context?.allow_delete_rows ?? !isMasterDriven;

              return (
                <Card
                  key={section.section_id || `sec-${sIdx}`}
                  title={
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffffff", fontSize: 14, fontWeight: 700 }}>
                        <FolderOpenOutlined style={{ color: "#ffffff" }} />
                        <span>{section.title || section.section_label || `Section ${sIdx + 1}`}</span>
                      </div>
                      {isMasterDriven && (
                        <span style={{ fontSize: 12, color: "#15803d", fontWeight: 700, background: "#ffffff", padding: "2px 10px", borderRadius: 12 }}>
                          Master Checklist
                        </span>
                      )}
                    </div>
                  }
                  style={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    marginBottom: 16,
                    background: "#ffffff",
                  }}
                  styles={{ body: { padding: "16px 20px" } }}
                >
                  <Form.List name={section.slug || section.section_id}>
                    {(fieldsList, { add, remove }) => (
                      <>
                        {isMasterDriven ? (() => {
                          const secFields = section.fields || [];
                          const labelCol =
                            secFields.find((f) => {
                              const k = (f.db_field || f.slug || f.name || "").toLowerCase();
                              return k.includes("reg") || k.includes("document") || k.includes("type") || k === "name" || k === "title";
                            }) || secFields[0];

                          // If section has configured fields in Form Builder, render all of them!
                          // Otherwise fallback to default compliance columns
                          const dataFields = secFields.length > 0
                            ? secFields.filter((f) => f !== labelCol)
                            : [
                              { db_field: "available", label: "Available (Yes/No)", type: "select", options: ["Yes", "No"] },
                              { db_field: "registration_no", label: "Registration No.", type: "text" },
                              { db_field: "valid_till", label: "Valid Till", type: "date" },
                              { db_field: "document", label: "Certificate", type: "file" },
                            ];

                          const renderTableCellInput = (fld, rowName, restF) => {
                            const type = String(fld.type || "text").toLowerCase();
                            const fKey = fld.db_field || fld.slug || fld.field_id || fld.name;

                            if (type === "select") {
                              let opts = [];
                              if (Array.isArray(fld.options)) {
                                opts = fld.options.map((o) => {
                                  if (typeof o === "string") return { label: o, value: o };
                                  return { label: o.label || o.name || o.value, value: o.value ?? o.id };
                                });
                              }
                              return (
                                <Form.Item {...restF} name={[rowName, fKey]} style={{ margin: 0 }}>
                                  <Select
                                    size="middle"
                                    style={{ width: "100%", minWidth: 110 }}
                                    placeholder={fld.ui?.placeholder || `Select ${fld.label || fld.name}`}
                                    options={opts}
                                    allowClear
                                  />
                                </Form.Item>
                              );
                            }

                            if (type === "date") {
                              return (
                                <Form.Item {...restF} name={[rowName, fKey]} style={{ margin: 0 }}>
                                  <DatePicker
                                    size="middle"
                                    style={{ width: "100%", minWidth: 130 }}
                                    format="YYYY-MM-DD"
                                    placeholder={fld.ui?.placeholder || "Select Date"}
                                  />
                                </Form.Item>
                              );
                            }

                            if (["file", "upload", "document"].includes(type)) {
                              return (
                                <Form.Item
                                  {...restF}
                                  name={[rowName, fKey]}
                                  valuePropName="fileList"
                                  getValueFromEvent={normFile}
                                  style={{ margin: 0 }}
                                >
                                  <Upload maxCount={1} beforeUpload={() => false}>
                                    <Button size="middle" icon={<UploadOutlined />}>Attach</Button>
                                  </Upload>
                                </Form.Item>
                              );
                            }

                            if (type === "textarea") {
                              return (
                                <Form.Item {...restF} name={[rowName, fKey]} style={{ margin: 0 }}>
                                  <TextArea
                                    size="middle"
                                    rows={1}
                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                    placeholder={fld.ui?.placeholder || `Enter ${fld.label || fld.name}`}
                                    style={{ width: "100%", minWidth: 130 }}
                                  />
                                </Form.Item>
                              );
                            }

                            if (["switch", "boolean", "checkbox"].includes(type)) {
                              return (
                                <Form.Item
                                  {...restF}
                                  name={[rowName, fKey]}
                                  valuePropName="checked"
                                  style={{ margin: 0, textAlign: "center" }}
                                >
                                  <Switch size="small" />
                                </Form.Item>
                              );
                            }

                            return (
                              <Form.Item {...restF} name={[rowName, fKey]} style={{ margin: 0 }}>
                                <Input
                                  size="middle"
                                  placeholder={fld.ui?.placeholder || `Enter ${fld.label || fld.name}`}
                                  style={{ width: "100%", minWidth: 120 }}
                                />
                              </Form.Item>
                            );
                          };

                          return (
                            /* ── MASTER DRIVEN DYNAMIC TABLE CHECKLIST LAYOUT ── */
                            <div
                              style={{
                                overflowX: "auto",
                                WebkitOverflowScrolling: "touch",
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                              }}
                            >
                              <table
                                style={{
                                  width: "100%",
                                  minWidth: Math.max(780, (dataFields.length + 1) * 135),
                                  borderCollapse: "separate",
                                  borderSpacing: 0,
                                }}
                              >
                                <thead>
                                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                    <th style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "left", minWidth: 180, width: "22%" }}>
                                      {labelCol ? (labelCol.label || labelCol.title || labelCol.name) : "Registration"}
                                    </th>
                                    {dataFields.map((fld) => (
                                      <th
                                        key={fld.field_id || fld.id || fld.db_field || fld.slug}
                                        style={{ padding: "12px 12px", fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "left" }}
                                      >
                                        {fld.label || fld.title || fld.name}
                                        {fld.required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
                                      </th>
                                    ))}
                                    {allowDelete && (
                                      <th style={{ padding: "12px 10px", fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "center", width: 60 }}>
                                        Action
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {fieldsList.map(({ key, name, ...restField }, rIdx) => {
                                    const rowVal = form.getFieldValue([section.slug || section.section_id, name]) || {};
                                    const labelKey = labelCol?.db_field || labelCol?.slug || "registration";
                                    const docLabel =
                                      rowVal[labelKey] ||
                                      rowVal.registration ||
                                      rowVal.registration_name ||
                                      rowVal.type_name ||
                                      rowVal.document_type ||
                                      rowVal.name ||
                                      `Compliance Item #${rIdx + 1}`;

                                    return (
                                      <tr
                                        key={key}
                                        style={{
                                          background: rIdx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                                          borderBottom: "1px solid #f1f5f9",
                                        }}
                                      >
                                        <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13, color: "#1e293b", verticalAlign: "middle" }}>
                                          <Form.Item {...restField} name={[name, "id"]} hidden>
                                            <Input type="hidden" />
                                          </Form.Item>
                                          {labelCol && (
                                            <Form.Item {...restField} name={[name, labelKey]} hidden>
                                              <Input type="hidden" />
                                            </Form.Item>
                                          )}
                                          <Form.Item {...restField} name={[name, "registration"]} hidden>
                                            <Input type="hidden" />
                                          </Form.Item>
                                          <Form.Item {...restField} name={[name, "registration_name"]} hidden>
                                            <Input type="hidden" />
                                          </Form.Item>
                                          <Form.Item {...restField} name={[name, "type_name"]} hidden>
                                            <Input type="hidden" />
                                          </Form.Item>
                                          <span>{docLabel}</span>
                                        </td>
                                        {dataFields.map((fld) => (
                                          <td
                                            key={fld.field_id || fld.id || fld.db_field || fld.slug}
                                            style={{ padding: "8px 10px", verticalAlign: "middle" }}
                                          >
                                            {renderTableCellInput(fld, name, restField)}
                                          </td>
                                        ))}
                                        {allowDelete && (
                                          <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "middle" }}>
                                            <Button
                                              type="text"
                                              danger
                                              icon={<DeleteOutlined />}
                                              onClick={() => remove(name)}
                                            />
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })() : (
                          /* ── STANDARD DYNAMIC ADD-MORE CARDS ── */
                          fieldsList.map(({ key, name, ...restField }, rIdx) => (
                            <Card
                              key={key}
                              size="small"
                              style={{ marginBottom: 12, background: "#f8fafc", borderRadius: 8 }}
                              title={<span style={{ fontWeight: 600 }}>Entry #{rIdx + 1}</span>}
                              extra={
                                allowDelete && (
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => remove(name)}
                                  >
                                    Remove
                                  </Button>
                                )
                              }
                            >
                              <Form.Item {...restField} name={[name, "id"]} hidden>
                                <Input type="hidden" />
                              </Form.Item>
                              <Row gutter={[16, 8]}>
                                {fields.map((f, fIdx) => {
                                  const fType = String(f.type || "").toLowerCase();
                                  const isFull = ["textarea", "long_text", "rich_text", "richtext", "editor", "address"].includes(fType) || f.full_width || f.col_span === 24;
                                  return (
                                    <Col xs={24} sm={isFull ? 24 : 12} md={isFull ? 24 : (fields.length > 2 && fields.length % 3 === 0 ? 8 : 12)} key={f.field_id || `add-${fIdx}`}>
                                      <Form.Item
                                        {...restField}
                                        name={[name, f.db_field || f.slug || f.field_id || f.name]}
                                        valuePropName={
                                          ["switch", "boolean", "checkbox"].includes(String(f.type || "").toLowerCase())
                                            ? "checked"
                                            : ["file", "upload", "document"].includes(String(f.type || "").toLowerCase())
                                              ? "fileList"
                                              : undefined
                                        }
                                        getValueFromEvent={
                                          ["file", "upload", "document"].includes(String(f.type || "").toLowerCase())
                                            ? normFile
                                            : undefined
                                        }
                                        label={
                                          <span>
                                            {f.label || f.title || f.name}
                                            {f.required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
                                          </span>
                                        }
                                        rules={[{ required: f.required, message: `${f.label || f.name} is required` }]}
                                      >
                                        {renderFieldInput(f)}
                                      </Form.Item>
                                    </Col>
                                  );
                                })}
                              </Row>
                            </Card>
                          ))
                        )}

                        {allowAdd && (
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            icon={<PlusOutlined />}
                            style={{ width: "100%", marginTop: 8, borderRadius: 6 }}
                          >
                            Add Row
                          </Button>
                        )}
                      </>
                    )}
                  </Form.List>
                </Card>
              );
            }

            // Standard Section
            return (
              <Card
                key={section.section_id || `sec-${sIdx}`}
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffffff", fontSize: 14, fontWeight: 700 }}>
                    <FolderOpenOutlined style={{ color: "#ffffff" }} />
                    <span>{section.title || section.section_label || `Section ${sIdx + 1}`}</span>
                  </div>
                }
                style={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  marginBottom: 16,
                  background: "#ffffff",
                }}
                styles={{ body: { padding: "16px 20px" } }}
              >
                <Row gutter={[16, 8]}>
                  {fields.map((f, fIdx) => {
                    const fType = String(f.type || "").toLowerCase();
                    const isFull = ["textarea", "long_text", "rich_text", "richtext", "editor", "address"].includes(fType) || f.full_width || f.col_span === 24;
                    return (
                      <Col xs={24} sm={isFull ? 24 : 12} md={isFull ? 24 : (fields.length > 2 && fields.length % 3 === 0 ? 8 : 12)} key={f.field_id || `fld-${fIdx}`}>
                        <Form.Item
                          name={f.db_field || f.slug || f.field_id || f.name}
                          valuePropName={
                            ["switch", "boolean", "checkbox"].includes(String(f.type || "").toLowerCase())
                              ? "checked"
                              : ["file", "upload", "document"].includes(String(f.type || "").toLowerCase())
                                ? "fileList"
                                : undefined
                          }
                          getValueFromEvent={
                            ["file", "upload", "document"].includes(String(f.type || "").toLowerCase())
                              ? normFile
                              : undefined
                          }
                          label={
                            <span>
                              {f.label || f.title || f.name}
                              {f.required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
                            </span>
                          }
                          rules={[{ required: f.required, message: `${f.label || f.name} is required` }]}
                        >
                          {renderFieldInput(f)}
                        </Form.Item>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            );
          })}
        </div>

        {/* Modal Action Buttons Sticky Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px 6px 16px",
            borderTop: "none",
            background: "#ffffff",
            flexShrink: 0,
          }}
        >
          <Button
            onClick={handleModalClose}
            disabled={submitting}
            size="middle"
            style={{ borderRadius: 6, minWidth: 90, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            size="middle"
            style={{
              background: "#15803d",
              borderColor: "#15803d",
              fontWeight: 700,
              borderRadius: 6,
              minWidth: 150,
              boxShadow: "0 2px 8px rgba(21, 128, 61, 0.25)",
            }}
          >
            {isVersioned ? "Submit New Version" : "Save Changes"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
