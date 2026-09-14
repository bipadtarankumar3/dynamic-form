'use client';

import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Tag,
  Empty,
  Typography,
  Tooltip,
  Button,
  App,
  Divider,
} from "antd";
import {
  FolderOpenOutlined,
  FileTextOutlined,
  CopyOutlined,
  CheckOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  BankOutlined,
  IdcardOutlined,
  CheckCircleTwoTone,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./NgoDetailsView.css";

const { Text } = Typography;

export default function NgoDetailsView({
  schema,
  data = {},
  hasRecord = false,
  emptyPlaceholder = "Not provided",
}) {
  const { message } = App.useApp();
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    message.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sections = schema?.sections || [];

  if (sections.length === 0) {
    return (
      <Card
        style={{
          borderRadius: 16,
          textAlign: "center",
          padding: "60px 20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <div style={{ fontWeight: 600, color: "#334155", fontSize: 15 }}>
                No Form Sections Configured
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                This form schema has no registered fields.
              </div>
            </div>
          }
        />
      </Card>
    );
  }

  // Choose appropriate icon for field type or label
  const getFieldIcon = (field) => {
    const type = String(field?.type || "").toLowerCase();
    const label = String(field?.label || field?.name || "").toLowerCase();

    if (label.includes("email") || type === "email") return <MailOutlined style={{ color: "#3b82f6" }} />;
    if (label.includes("phone") || label.includes("mobile") || type === "phone") return <PhoneOutlined style={{ color: "#10b981" }} />;
    if (label.includes("website") || label.includes("link") || label.includes("url")) return <GlobalOutlined style={{ color: "#6366f1" }} />;
    if (label.includes("date") || type === "date") return <CalendarOutlined style={{ color: "#f59e0b" }} />;
    if (label.includes("bank") || label.includes("ifsc") || label.includes("account")) return <BankOutlined style={{ color: "#8b5cf6" }} />;
    if (label.includes("pan") || label.includes("reg") || label.includes("darpan") || label.includes("csr"))
      return <IdcardOutlined style={{ color: "#0ea5e9" }} />;
    if (label.includes("valid") || label.includes("cert") || label.includes("status"))
      return <SafetyCertificateOutlined style={{ color: "#15803d" }} />;

    return <InfoCircleOutlined style={{ color: "#94a3b8" }} />;
  };

  // Helper to format field value with rich UI
  const renderValue = (field, rawVal, fieldKey) => {
    if (rawVal === undefined || rawVal === null || rawVal === "") {
      return (
        <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13.5 }}>
          {emptyPlaceholder}
        </span>
      );
    }

    if (typeof rawVal === "boolean") {
      return (
        <Tag
          color={rawVal ? "success" : "default"}
          style={{
            borderRadius: 6,
            padding: "2px 10px",
            fontWeight: 700,
            fontSize: 12.5,
          }}
        >
          {rawVal ? "Yes" : "No"}
        </Tag>
      );
    }

    if (Array.isArray(rawVal)) {
      if (rawVal.length === 0) {
        return <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{emptyPlaceholder}</span>;
      }
      // Check if array contains file objects
      const firstItem = rawVal[0];
      if (firstItem && typeof firstItem === "object" && (firstItem.name || firstItem.url || firstItem.uid)) {
        // File array — render each file with a Download button
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rawVal.map((fileItem, idx) => {
              const fileName = fileItem.name || fileItem.filename || fileItem.originalname || `File ${idx + 1}`;
              const fileUrl = fileItem.url || fileItem.filePath || fileItem.file_path || null;
              return (
                <div key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileName}>
                    <FileTextOutlined style={{ color: "#1677ff", marginRight: 6 }} />
                    {fileName}
                  </span>
                  {fileUrl ? (
                    <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <Button size="small" type="primary" ghost icon={<DownloadOutlined />} style={{ fontSize: 11, height: 26, padding: "0 10px", borderRadius: 4 }}>
                        Download
                      </Button>
                    </a>
                  ) : (
                    <Tag color="blue" style={{ borderRadius: 4, fontSize: 11, margin: 0 }}>Attached</Tag>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {rawVal.map((item, idx) => (
            <Tag
              key={idx}
              color="blue"
              style={{
                borderRadius: 6,
                padding: "2px 8px",
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              {typeof item === "object" ? JSON.stringify(item) : String(item)}
            </Tag>
          ))}
        </div>
      );
    }

    const type = String(field?.type || "").toLowerCase();
    const isFileField = ["file", "upload", "document"].includes(type) || (typeof rawVal === "object" && rawVal && (rawVal.name || rawVal.url || (Array.isArray(rawVal) && rawVal[0]?.name)));

    if (isFileField) {
      let fileItem = Array.isArray(rawVal) ? rawVal[0] : rawVal;
      if (!fileItem) return <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{emptyPlaceholder}</span>;
      const fileName = fileItem.name || fileItem.filename || fileItem.originalname || "Attached Document";
      const fileUrl = fileItem.url || fileItem.filePath || fileItem.file_path || (typeof rawVal === "string" ? rawVal : null);

      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            <FileTextOutlined style={{ color: "#1677ff", marginRight: 6 }} />
            {fileName}
          </span>
          {fileUrl && (
            <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Button size="small" type="primary" ghost icon={<DownloadOutlined />} style={{ fontSize: 11, height: 26, padding: "0 10px", borderRadius: 4 }}>
                Download
              </Button>
            </a>
          )}
        </div>
      );
    }

    if (typeof rawVal === "object") {
      return (
        <pre
          style={{
            background: "#f8fafc",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            margin: 0,
            overflowX: "auto",
            border: "1px solid #e2e8f0",
          }}
        >
          {JSON.stringify(rawVal, null, 2)}
        </pre>
      );
    }

    const valStr = String(rawVal).trim();
    const labelLower = String(field?.label || field?.name || "").toLowerCase();

    // Check if URL / File link
    if (valStr.startsWith("http://") || valStr.startsWith("https://") || valStr.includes("/static/") || valStr.includes("/uploads/")) {
      const isExternalSite = valStr.startsWith("http") && !valStr.includes("/static/") && !valStr.includes("/uploads/");
      return (
        <a
          href={valStr}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#1677ff",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "4px 12px",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 13,
            transition: "all 0.2s ease",
            wordBreak: "break-all",
          }}
        >
          {isExternalSite ? <GlobalOutlined /> : <FileTextOutlined />}
          <span>{isExternalSite ? "Open Website Link" : "View Attached Document"}</span>
        </a>
      );
    }

    // Email value with quick copy
    if (labelLower.includes("email") || type === "email") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", width: "100%" }}>
          <a
            href={`mailto:${valStr}`}
            style={{ color: "#0f172a", fontWeight: 600, fontSize: 14, wordBreak: "break-all" }}
          >
            {valStr}
          </a>
          <Tooltip title="Copy Email">
            <Button
              type="text"
              size="small"
              icon={copiedKey === fieldKey ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={() => handleCopy(valStr, fieldKey)}
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0, opacity: 0.7 }}
            />
          </Tooltip>
        </div>
      );
    }

    // Select or Radio pills
    if (type === "select" || type === "radio") {
      return (
        <Tag
          color="geekblue"
          style={{
            borderRadius: 6,
            padding: "3px 10px",
            fontWeight: 600,
            fontSize: 13,
            border: "1px solid #bfdbfe",
          }}
        >
          {valStr}
        </Tag>
      );
    }

    // Date formatting
    if (type === "date" && dayjs(valStr).isValid()) {
      return (
        <span style={{ color: "#0f172a", fontWeight: 600, fontSize: 14 }}>
          {dayjs(valStr).format("DD MMMM YYYY")}
        </span>
      );
    }

    // Default string or number
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", width: "100%" }}>
        <span
          style={{
            color: "#0f172a",
            fontWeight: 600,
            fontSize: 14,
            wordBreak: "break-word",
            lineHeight: 1.5,
          }}
        >
          {valStr}
        </span>
        {valStr.length > 3 && (
          <Tooltip title="Copy">
            <Button
              type="text"
              size="small"
              icon={copiedKey === fieldKey ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={() => handleCopy(valStr, fieldKey)}
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0, opacity: 0.7 }}
            />
          </Tooltip>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {sections.map((section, sIdx) => {
        const fields = section?.fields || [];
        const isAddMore = section?.type === "add_more";
        const sectionTitle = section.title || section.section_label || `Section ${sIdx + 1}`;
        const titleLower = String(sectionTitle).toLowerCase();
        const headerClassName = "ngo-section-header--basic";

        // Count completed fields & required fields
        const requiredFields = fields.filter((f) => f.required === true || f.required === "true");
        const completedCount = fields.filter((f) => {
          const k = f.db_field || f.slug || f.field_id || f.name;
          const v = data?.[k] !== undefined ? data[k] : data?.[f.name];
          return v !== undefined && v !== null && v !== "";
        }).length;

        const completedRequiredCount = requiredFields.filter((f) => {
          const k = f.db_field || f.slug || f.field_id || f.name;
          const v = data?.[k] !== undefined ? data[k] : data?.[f.name];
          return v !== undefined && v !== null && v !== "";
        }).length;

        const isSectionComplete = requiredFields.length > 0
          ? completedRequiredCount === requiredFields.length
          : completedCount === fields.length && fields.length > 0;

        if (isAddMore) {
          let rawRows =
            data?.[section.slug] ??
            data?.[section.section_id] ??
            data?.[section.table] ??
            data?.[section.slug || section.section_id];

          if (typeof rawRows === "string") {
            try {
              rawRows = JSON.parse(rawRows);
            } catch (_) {
              rawRows = [];
            }
          }
          const addMoreRows = Array.isArray(rawRows) ? rawRows : [];

          const isMasterDriven = Boolean(
            section.is_master_driven ||
            section.context?.is_master_driven ||
            section.master_source ||
            section.context?.master_source ||
            (section.slug?.includes("reg") || (section.title || section.section_label || "").toLowerCase().includes("registration"))
          );

          return (
            <Card
              classNames="ngo-card-header"
              key={section.section_id || `sec-${sIdx}`}
              style={{
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                background: "#ffffff",
                overflow: "hidden",
              }}
              styles={{
                header: { padding: 0 },
                body: { padding: "20px 22px" },
              }}
              title={
                <div className={`${headerClassName} ngo-section-header__row`}>
                  <div className="ngo-section-header__left">
                    <div className="ngo-section-header__icon-badge">
                      <FolderOpenOutlined />
                    </div>
                    <div className="ngo-section-header__meta">
                      <span className="ngo-section-header__title">{sectionTitle}</span>
                      <span className="ngo-section-header__subtitle">
                        View and manage {String(sectionTitle).toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <Tag
                    color={addMoreRows.length > 0 ? "success" : "default"}
                    style={{ borderRadius: 6, fontWeight: 700, fontSize: 12, padding: "2px 10px" }}
                  >
                    {addMoreRows.length} {addMoreRows.length === 1 ? "Record" : "Records"}
                  </Tag>
                </div>
              }
            >
              {addMoreRows.length === 0 ? (
                <div className="ngo-section-empty">
                  No records submitted for this section yet.
                </div>
              ) : isMasterDriven ? (() => {
                const secFields = section.fields || [];
                const labelCol =
                  secFields.find((f) => {
                    const k = (f.db_field || f.slug || f.name || "").toLowerCase();
                    return k.includes("reg") || k.includes("document") || k.includes("type") || k === "name" || k === "title";
                  }) || secFields[0];

                const dataFields = secFields.length > 0
                  ? secFields.filter((f) => f !== labelCol)
                  : [
                    { db_field: "available", label: "Status", type: "select" },
                    { db_field: "registration_no", label: "Registration No.", type: "text" },
                    { db_field: "valid_till", label: "Valid Till", type: "date" },
                    { db_field: "document", label: "Certificate", type: "file" },
                  ];

                const renderViewCell = (fld, rowItem) => {
                  const fKey = fld.db_field || fld.slug || fld.field_id || fld.name;
                  const val = rowItem[fKey] ?? rowItem[fld.column_name];
                  const type = String(fld.type || "").toLowerCase();

                  if (fKey === "available" || fKey === "status") {
                    const isAvail = String(val || "").toLowerCase() === "yes" || val === true;
                    return (
                      <Tag
                        color={isAvail ? "success" : "default"}
                        style={{ borderRadius: 6, fontWeight: 700, padding: "2px 10px", fontSize: 12 }}
                      >
                        {isAvail ? "Available (Yes)" : (val || "Not Available")}
                      </Tag>
                    );
                  }

                  if (fKey === "applicable") {
                    const isApp = String(val || "").toLowerCase() === "yes" || val === true;
                    return (
                      <Tag color={isApp ? "blue" : "default"} style={{ borderRadius: 6, fontWeight: 600 }}>
                        {val ? String(val).toUpperCase() : "-"}
                      </Tag>
                    );
                  }

                  if (type === "date" || fKey === "valid_till") {
                    return val ? dayjs(val).format("DD MMM YYYY") : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>-</span>;
                  }

                  if (["file", "upload", "document"].includes(type) || fKey === "file_upload" || fKey === "document") {
                    let fileItem = null;
                    if (Array.isArray(val) && val.length > 0) {
                      fileItem = val[0];
                    } else if (val && typeof val === "object" && !Array.isArray(val)) {
                      // Only treat as fileItem if it has expected file properties
                      if (val.name || val.url || val.uid || val.filePath || val.file_path) {
                        fileItem = val;
                      }
                    } else if (typeof val === "string" && val.trim() !== "") {
                      fileItem = { name: val.split("/").pop(), url: val };
                    }

                    if (!fileItem) {
                      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 12 }}>-</span>;
                    }

                    const fileName = fileItem.name || fileItem.filename || fileItem.originalname || "Attached Document";
                    const fileUrl = fileItem.url || fileItem.filePath || fileItem.file_path || (typeof val === "string" ? val : null);

                    return (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "#0f172a",
                          }}
                          title={fileName}
                        >
                          <FileTextOutlined style={{ color: "#1677ff", marginRight: 5 }} />
                          {fileName}
                        </span>
                        {fileUrl ? (
                          <a
                            href={fileUrl}
                            download={fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            <Button
                              size="small"
                              type="primary"
                              icon={<DownloadOutlined />}
                              style={{ fontSize: 11, height: 24, padding: "0 10px", borderRadius: 4 }}
                            >
                              Download
                            </Button>
                          </a>
                        ) : (
                          <Tag color="orange" style={{ borderRadius: 4, fontSize: 11, margin: 0 }}>
                            Attached (no URL)
                          </Tag>
                        )}
                      </div>
                    );
                  }

                  return val !== undefined && val !== null && val !== "" ? (
                    String(val)
                  ) : (
                    <span style={{ color: "#94a3b8", fontStyle: "italic" }}>-</span>
                  );
                };

                return (
                  /* ── COMPLIANCE CHECKLIST STATUS TABLE ── */
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 700, color: "#334155", minWidth: 180 }}>
                            {labelCol ? (labelCol.label || labelCol.title || labelCol.name) : "Registration / Compliance"}
                          </th>
                          {dataFields.map((fld) => (
                            <th
                              key={fld.field_id || fld.id || fld.db_field || fld.slug}
                              style={{ padding: "12px 14px", fontSize: 12.5, fontWeight: 700, color: "#334155" }}
                            >
                              {fld.label || fld.title || fld.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {addMoreRows.map((rowItem, rIdx) => {
                          const labelKey = labelCol?.db_field || labelCol?.slug || "registration";
                          const docTitle =
                            rowItem[labelKey] ||
                            rowItem.registration ||
                            rowItem.registration_name ||
                            rowItem.type_name ||
                            rowItem.document_type ||
                            rowItem.name ||
                            `Registration #${rIdx + 1}`;

                          return (
                            <tr
                              key={rIdx}
                              style={{
                                background: rIdx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                                borderBottom: "1px solid #f1f5f9",
                              }}
                            >
                              <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                                {docTitle}
                              </td>
                              {dataFields.map((fld) => (
                                <td
                                  key={fld.field_id || fld.id || fld.db_field || fld.slug}
                                  style={{ padding: "12px 14px", fontSize: 13, color: "#334155" }}
                                >
                                  {renderViewCell(fld, rowItem)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })() : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {addMoreRows.map((rowItem, rIdx) => (
                    <div
                      key={rIdx}
                      style={{
                        background: "#f8fafc",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        padding: "16px 18px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 14,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#15803d",
                        }}
                      >
                        <Tag color="green" style={{ borderRadius: 4, fontWeight: 700 }}>
                          #{rIdx + 1}
                        </Tag>
                        <span>Entry Details</span>
                      </div>
                      <Row gutter={[16, 16]}>
                        {fields.map((field, fIdx) => {
                          const fieldKey = field.db_field || field.slug || field.field_id || field.name;
                          const val = rowItem?.[fieldKey];
                          return (
                            <Col xs={24} sm={12} md={8} key={field.field_id || `add-${fIdx}`}>
                              <div
                                style={{
                                  background: "#ffffff",
                                  borderRadius: 8,
                                  padding: "12px 14px",
                                  border: "1px solid #e2e8f0",
                                  height: "100%",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    marginBottom: 6,
                                  }}
                                >
                                  {field.label || field.title || field.name}
                                </div>
                                <div>{renderValue(field, val, `${fieldKey}_${rIdx}`)}</div>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        }

        // Standard Section
        return (
          <Card
            key={section.section_id || `sec-${sIdx}`}
            style={{
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              background: "#ffffff",
              overflow: "hidden",
            }}
            styles={{
              header: { padding: 0 },
              body: { padding: "20px 22px" },
            }}
            title={
              <div className={`${headerClassName} ngo-section-header__row`}>
                <div className="ngo-section-header__left">
                  <div className="ngo-section-header__icon-badge">
                    <FolderOpenOutlined />
                  </div>
                  <div className="ngo-section-header__meta">
                    <span className="ngo-section-header__title">{sectionTitle}</span>
                    <span className="ngo-section-header__subtitle">
                      View and manage {String(sectionTitle).toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="ngo-section-header__right">
                  <span className="ngo-section-header__count-label">
                    {requiredFields.length > 0
                      ? `${completedRequiredCount} of ${requiredFields.length} required filled`
                      : `${completedCount} of ${fields.length} filled`}
                  </span>
                  <Tag
                    color={isSectionComplete ? "success" : "default"}
                    style={{ borderRadius: 6, fontWeight: 700, fontSize: 11.5 }}
                  >
                    {isSectionComplete
                      ? "Complete"
                      : requiredFields.length > 0
                      ? `${Math.round((completedRequiredCount / requiredFields.length) * 100)}%`
                      : `${Math.round((completedCount / (fields.length || 1)) * 100)}%`}
                  </Tag>
                </div>
              </div>
            }
          >
            <Row gutter={[16, 16]}>
              {fields.map((field, fIdx) => {
                const fieldKey = field.db_field || field.slug || field.field_id || field.name;
                const val = data?.[fieldKey] !== undefined ? data[fieldKey] : data?.[field.name];
                const isFilled = val !== undefined && val !== null && val !== "";
                const isWideField = field.type === "textarea" || String(val || "").length > 60;

                return (
                  <Col
                    xs={24}
                    sm={isWideField ? 24 : 12}
                    md={isWideField ? 24 : 8}
                    key={field.field_id || `fld-${fIdx}`}
                  >
                    <div
                      style={{
                        background: isFilled ? "#ffffff" : "#f8fafc",
                        border: isFilled ? "1px solid #e2e8f0" : "1px dashed #cbd5e1",
                        borderRadius: 12,
                        padding: "14px 16px",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        boxShadow: isFilled ? "0 2px 6px rgba(15, 23, 42, 0.02)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Left: Icon in a colored rounded square */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: isFilled ? "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)" : "#f1f5f9",
                          border: isFilled ? "1px solid #dcfce7" : "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                      >
                        {/* Render icon with its original color */}
                        {getFieldIcon(field)}
                      </div>

                      {/* Right: Label and Value */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {field.label || field.title || field.name}
                          </span>
                          {field.required && (
                            <Tooltip title="Mandatory statutory field">
                              <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, marginLeft: 4 }}>*</span>
                            </Tooltip>
                          )}
                        </div>

                        <div style={{ minHeight: 24 }}>
                          {renderValue(field, val, fieldKey)}
                        </div>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        );
      })}
    </div>
  );
}
