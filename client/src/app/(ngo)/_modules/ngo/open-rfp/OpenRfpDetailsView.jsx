'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Typography,
  Space,
  Divider,
  Tabs,
  Badge,
  Tooltip,
  Spin,
  App,
} from "antd";
import {
  AuditOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  SendOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AimOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { dynamicSchemaDetailsAPI } from "@/services/dynamicForm-service";

const { Title, Paragraph, Text } = Typography;

export default function OpenRfpDetailsView({
  rfp,
  schema: propSchema = null,
  formSlug = "request_for_proposal",
  onApply,
  onViewProposal,
  isModal = false,
}) {
  const app = App.useApp();
  const messageApi = app?.message;
  const [schema, setSchema] = useState(propSchema);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Fetch dynamic schema if not provided as prop
  const fetchSchema = useCallback(async () => {
    if (propSchema) {
      setSchema(propSchema);
      return;
    }
    try {
      setLoadingSchema(true);
      const res = await dynamicSchemaDetailsAPI({ form_slug: formSlug || "request_for_proposal" });
      if (res?.data?.success && res?.data?.data) {
        setSchema(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic form schema:", err);
    } finally {
      setLoadingSchema(false);
    }
  }, [propSchema, formSlug]);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  if (!rfp) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
        No RFP details available.
      </div>
    );
  }

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    messageApi?.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyRfpId = () => {
    const code = `RFP-${String(rfp.id || "").padStart(4, "0")}`;
    navigator.clipboard.writeText(code);
    messageApi?.success(`Copied RFP ID ${code} to clipboard`);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return null;
    const num = Number(String(amount).replace(/[^0-9.-]+/g, ""));
    if (isNaN(num)) return String(amount);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  // Parse string / json / multiline arrays
  const parseListValue = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "object") return Object.values(val);
    if (typeof val === "string") {
      const trimmed = val.trim();
      if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
          if (typeof parsed === "object") return Object.values(parsed);
        } catch (_) {}
      }
      if (val.includes("\n")) {
        return val.split("\n").map((s) => s.replace(/^[-*•\d.]\s*/, "").trim()).filter(Boolean);
      }
    }
    return [String(val)];
  };

  // Pick dynamic field icon
  const getFieldIcon = (field) => {
    const type = String(field?.type || "").toLowerCase();
    const label = String(field?.label || field?.name || field?.db_field || "").toLowerCase();

    if (label.includes("budget") || label.includes("amount") || label.includes("cost") || label.includes("price"))
      return <DollarOutlined style={{ color: "#059669" }} />;
    if (label.includes("deadline") || label.includes("date") || type === "date")
      return <CalendarOutlined style={{ color: "#2563eb" }} />;
    if (label.includes("timeline") || label.includes("duration") || label.includes("schedule"))
      return <ClockCircleOutlined style={{ color: "#0891b2" }} />;
    if (label.includes("deliverable") || label.includes("milestone"))
      return <CheckSquareOutlined style={{ color: "#7c3aed" }} />;
    if (label.includes("objective") || label.includes("goal") || label.includes("aim"))
      return <AimOutlined style={{ color: "#059669" }} />;
    if (label.includes("scope"))
      return <ProjectOutlined style={{ color: "#2563eb" }} />;
    if (label.includes("eligibility") || label.includes("criteria") || label.includes("evaluat"))
      return <SafetyCertificateOutlined style={{ color: "#d97706" }} />;
    if (label.includes("document") || label.includes("file") || type === "file")
      return <FileProtectOutlined style={{ color: "#2563eb" }} />;
    if (label.includes("contact") || label.includes("person") || label.includes("user"))
      return <UserOutlined style={{ color: "#475569" }} />;
    if (label.includes("email"))
      return <MailOutlined style={{ color: "#3b82f6" }} />;
    if (label.includes("phone") || label.includes("mobile"))
      return <PhoneOutlined style={{ color: "#10b981" }} />;

    return <InfoCircleOutlined style={{ color: "#64748b" }} />;
  };

  // Extract sections and fields from dynamic schema
  const sections = schema?.sections || [];

  // Build a list of all fields across sections
  const allSchemaFields = [];
  sections.forEach((sec) => {
    (sec.fields || []).forEach((f) => {
      allSchemaFields.push(f);
    });
  });

  // 1. Dynamic Title detection
  const titleField = allSchemaFields.find((f) => {
    const key = String(f.db_field || f.column_name || f.name || "").toLowerCase();
    return ["project_details", "title", "name", "project_name", "heading"].includes(key);
  }) || allSchemaFields[0];
  const titleKey = titleField ? (titleField.db_field || titleField.column_name || titleField.name) : null;
  const titleText = (titleKey && rfp[titleKey]) || rfp.title || rfp.project_details || `Request for Proposal #${rfp.id}`;

  // 2. Dynamic Coordinator / Contact detection
  const contactField = allSchemaFields.find((f) => {
    const key = String(f.db_field || f.column_name || f.name || "").toLowerCase();
    return key.includes("contact") || key.includes("coordinator") || key.includes("lead");
  });
  const contactKey = contactField ? (contactField.db_field || contactField.column_name || contactField.name) : null;
  const contactText = (contactKey && rfp[contactKey]) || rfp.contact_person || null;

  // 3. Dynamic Deadline detection
  const deadlineField = allSchemaFields.find((f) => {
    const key = String(f.db_field || f.column_name || f.name || "").toLowerCase();
    return key.includes("deadline") || (f.type === "date" && key.includes("submi"));
  });
  const deadlineKey = deadlineField ? (deadlineField.db_field || deadlineField.column_name || deadlineField.name) : null;
  const rawDeadline = (deadlineKey && rfp[deadlineKey]) || rfp.submission_deadline || null;
  const deadline = rawDeadline ? dayjs(rawDeadline) : null;
  const isExpired = deadline ? deadline.isBefore(dayjs(), "day") : false;

  // 4. Dynamic Top Highlight Fields from Schema
  // Picks fields from schema that have values, prioritizing add_to_list and short attributes
  const highlightCandidates = allSchemaFields.filter((f) => {
    const key = f.db_field || f.column_name || f.name;
    if (!key || key === titleKey) return false;
    const val = rfp[key];
    if (val === undefined || val === null || val === "") return false;
    const type = String(f.type || "").toLowerCase();
    return type !== "textarea" && (typeof val !== "string" || val.length <= 80);
  });

  const listDriven = highlightCandidates.filter((f) => f.add_to_list === true);
  const topHighlightFields = (listDriven.length >= 2 ? listDriven : highlightCandidates).slice(0, 4);

  // Helper to render dynamic field value
  const renderDynamicFieldValue = (field, val, fieldKey) => {
    if (val === undefined || val === null || val === "") {
      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>Not specified</span>;
    }

    if (typeof val === "boolean") {
      return (
        <Tag color={val ? "success" : "default"} style={{ fontWeight: 700, borderRadius: 6 }}>
          {val ? "Yes" : "No"}
        </Tag>
      );
    }

    const type = String(field?.type || "").toLowerCase();

    // Date type
    if (type === "date" || fieldKey.includes("date") || fieldKey.includes("deadline")) {
      const d = dayjs(val);
      return d.isValid() ? (
        <span style={{ fontWeight: 600, color: "#0f172a" }}>{d.format("DD MMMM YYYY")}</span>
      ) : (
        String(val)
      );
    }

    // Select type with options
    if (type === "select" && Array.isArray(field?.options)) {
      const matchOpt = field.options.find((o) => String(o.value) === String(val) || String(o.id) === String(val));
      const displayLabel = matchOpt ? matchOpt.label || matchOpt.name : String(val);
      return (
        <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>
          {displayLabel}
        </Tag>
      );
    }

    // File / Document type
    const isFile = ["file", "upload", "document"].includes(type) || (typeof val === "object" && val && (val.url || val.filePath || val.name));
    if (isFile) {
      const files = Array.isArray(val) ? val : [val];
      return (
        <Space size={8} wrap>
          {files.map((fileItem, idx) => {
            const fileName = typeof fileItem === "object" ? fileItem.name || fileItem.filename || `Document ${idx + 1}` : String(fileItem).split("/").pop() || "Document";
            const fileUrl = typeof fileItem === "object" ? fileItem.url || fileItem.filePath || fileItem.file_path : (typeof fileItem === "string" ? fileItem : null);
            return (
              <div
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                }}
              >
                <FileTextOutlined style={{ color: "#2563eb" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileName}
                </span>
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
                    <Button size="small" type="link" icon={<DownloadOutlined />} style={{ padding: 0, height: "auto" }} />
                  </a>
                )}
              </div>
            );
          })}
        </Space>
      );
    }

    // Array value
    if (Array.isArray(val)) {
      return (
        <Space size={[6, 6]} wrap>
          {val.map((item, idx) => (
            <Tag key={idx} color="geekblue" style={{ borderRadius: 6, fontWeight: 600 }}>
              {typeof item === "object" ? JSON.stringify(item) : String(item)}
            </Tag>
          ))}
        </Space>
      );
    }

    // If long multiline text
    if (typeof val === "string" && (val.includes("\n") || val.length > 120)) {
      const listItems = parseListValue(val);
      if (listItems.length > 1 && val.includes("\n")) {
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listItems.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div
                  style={{
                    minWidth: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#2563eb",
                    marginTop: 8,
                  }}
                />
                <span style={{ color: "#334155", fontSize: 14, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div style={{ whiteSpace: "pre-line", color: "#334155", fontSize: 14, lineHeight: 1.7 }}>
          {val}
        </div>
      );
    }

    // Currency if key matches
    if (fieldKey.includes("budget") || fieldKey.includes("amount") || fieldKey.includes("grant")) {
      const curr = formatCurrency(val);
      if (curr) return <span style={{ fontWeight: 700, color: "#059669", fontSize: 15 }}>{curr}</span>;
    }

    return <span style={{ color: "#1e293b", fontSize: 14, fontWeight: 500 }}>{String(val)}</span>;
  };

  return (
    <div style={{ background: "#f8fafc", borderRadius: isModal ? "0" : "12px", padding: isModal ? "4px" : "20px" }}>
      {/* Top Banner Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "14px",
          padding: "24px 28px",
          color: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
          marginBottom: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={17}>
            <Space size={8} wrap style={{ marginBottom: 10 }}>
              <Tag
                color="#059669"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "none",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Open RFP
              </Tag>
              {rfp.is_already_submitted ? (
                <Tag
                  color="blue"
                  icon={<CheckCircleOutlined />}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "6px",
                    border: "none",
                  }}
                >
                  Proposal Submitted
                </Tag>
              ) : isExpired ? (
                <Tag
                  color="error"
                  icon={<ClockCircleOutlined />}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "6px",
                    border: "none",
                  }}
                >
                  Submission Closed
                </Tag>
              ) : (
                <Tag
                  color="success"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                  }}
                >
                  ● Active &amp; Accepting Proposals
                </Tag>
              )}
              <Tooltip title="Click to copy RFP code">
                <Tag
                  onClick={copyRfpId}
                  style={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.12)",
                    color: "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "6px",
                    fontSize: 12,
                    padding: "2px 8px",
                  }}
                >
                  <Space size={4}>
                    <span>RFP-{String(rfp.id || "").padStart(4, "0")}</span>
                    <CopyOutlined style={{ fontSize: 11 }} />
                  </Space>
                </Tag>
              </Tooltip>
            </Space>

            <Title
              level={3}
              style={{
                color: "#ffffff",
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {titleText}
            </Title>

            <div style={{ marginTop: 8, color: "#94a3b8", fontSize: "13px" }}>
              <Space size={16} wrap>
                <span>
                  Published:{" "}
                  <strong style={{ color: "#e2e8f0" }}>
                    {rfp.created_at ? dayjs(rfp.created_at).format("DD MMM YYYY") : "Recent"}
                  </strong>
                </span>
                {contactText && (
                  <span>
                    Coordinator: <strong style={{ color: "#e2e8f0" }}>{contactText}</strong>
                  </span>
                )}
              </Space>
            </div>
          </Col>

          <Col xs={24} lg={7} style={{ textAlign: "right" }}>
            <Space direction="vertical" size={8} style={{ width: "100%", alignItems: "flex-end" }}>
              {rfp.is_already_submitted ? (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  size="large"
                  onClick={() => onViewProposal && onViewProposal(rfp)}
                  style={{
                    background: "#2563eb",
                    borderColor: "#2563eb",
                    borderRadius: "8px",
                    fontWeight: 700,
                    height: "44px",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                  }}
                >
                  View My Proposal
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  size="large"
                  disabled={isExpired}
                  onClick={() => onApply && onApply(rfp)}
                  style={{
                    background: isExpired ? "#475569" : "#059669",
                    borderColor: isExpired ? "#475569" : "#059669",
                    borderRadius: "8px",
                    fontWeight: 700,
                    height: "44px",
                    boxShadow: isExpired ? "none" : "0 4px 14px rgba(5, 150, 105, 0.4)",
                  }}
                >
                  {isExpired ? "Deadline Expired" : "Submit Proposal"}
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Dynamic Stat Highlights Cards (Schema Driven) */}
      {topHighlightFields.length > 0 && (
        <Row gutter={[14, 14]} style={{ marginBottom: "20px" }}>
          {topHighlightFields.map((field, idx) => {
            const key = field.db_field || field.column_name || field.name;
            const val = rfp[key];
            const ACCENT_COLORS = ["#059669", "#2563eb", "#7c3aed", "#0284c7"];
            const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
            const count = topHighlightFields.length;
            const colSpan = count === 1 ? 24 : count === 2 ? 12 : count === 3 ? 8 : 6;

            return (
              <Col xs={12} sm={12} md={colSpan} key={field.id || key || idx}>
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    background: "#ffffff",
                    borderLeft: `4px solid ${color}`,
                    height: "100%",
                  }}
                  styles={{ body: { padding: "16px 18px" } }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={field.label || field.field_label || key}
                  >
                    {field.label || field.field_label || key.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                    {renderDynamicFieldValue(field, val, key)}
                  </div>
                  <div style={{ fontSize: "11px", color, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    {getFieldIcon(field)} <span style={{ textTransform: "capitalize" }}>{field.type || "Attribute"}</span>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Dynamic Content Sections */}
      {loadingSchema ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b" }}>Loading form structure...</div>
        </div>
      ) : sections.length > 0 ? (
        sections.map((section, sIdx) => {
          const sectionTitle = section.section_label || section.title || section.name || `Section ${sIdx + 1}`;
          const fields = section.fields || [];

          // Categorize fields into long content (textarea / multi-line) vs short fields (grid)
          const longFields = [];
          const gridFields = [];

          fields.forEach((field) => {
            const key = field.db_field || field.column_name || field.name;
            if (!key) return;

            const type = String(field.type || "").toLowerCase();
            const val = rfp[key];
            const isMultiline = type === "textarea" || (typeof val === "string" && (val.includes("\n") || val.length > 90));

            if (isMultiline) {
              longFields.push({ field, key, val });
            } else {
              gridFields.push({ field, key, val });
            }
          });

          return (
            <Card
              key={section.section_id || section.slug || sIdx}
              variant="borderless"
              style={{
                borderRadius: "14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                background: "#ffffff",
                marginBottom: 20,
              }}
              styles={{ body: { padding: "24px 28px" } }}
            >
              {/* Section Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 16,
                  marginBottom: 20,
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "#f0fdf4",
                      color: "#16a34a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    <ProjectOutlined />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                      {sectionTitle}
                    </h3>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {fields.length} dynamic attributes defined
                    </div>
                  </div>
                </div>

                <Badge
                  count={`${fields.filter((f) => rfp[f.db_field || f.column_name || f.name] !== undefined && rfp[f.db_field || f.column_name || f.name] !== "").length} of ${fields.length} filled`}
                  style={{ backgroundColor: "#059669", fontWeight: 600, fontSize: 11 }}
                />
              </div>

              {/* 1. Render Short / Metadata Fields in Sleek Modern Cards Grid */}
              {gridFields.length > 0 && (
                <Row gutter={[16, 16]} style={{ marginBottom: longFields.length > 0 ? 24 : 0 }}>
                  {gridFields.map(({ field, key, val }, fIdx) => (
                    <Col xs={24} sm={12} md={8} key={field.id || key || fIdx}>
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "14px 16px",
                          transition: "all 0.2s ease",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <Space size={6}>
                              {getFieldIcon(field)}
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#64748b",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {field.label || field.field_label || key}
                              </span>
                            </Space>
                            {val && (
                              <Tooltip title="Copy value">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<CopyOutlined />}
                                  onClick={() => handleCopy(val, key)}
                                  style={{
                                    padding: 0,
                                    width: 22,
                                    height: 22,
                                    color: copiedKey === key ? "#059669" : "#94a3b8",
                                  }}
                                />
                              </Tooltip>
                            )}
                          </div>
                          <div style={{ marginTop: 2 }}>
                            {renderDynamicFieldValue(field, val, key)}
                          </div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}

              {/* 2. Render Long Content Fields (Textarea / Multi-line / Scope) */}
              {longFields.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {longFields.map(({ field, key, val }, fIdx) => (
                    <div
                      key={field.id || key || fIdx}
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "18px 20px",
                        borderLeft: "4px solid #059669",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <Space size={8}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: "#ecfdf5",
                              color: "#059669",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {getFieldIcon(field)}
                          </div>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                            {field.label || field.field_label || key}
                          </h4>
                        </Space>
                        {val && (
                          <Tooltip title="Copy text">
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => handleCopy(val, key)}
                              style={{
                                color: copiedKey === key ? "#059669" : "#94a3b8",
                              }}
                            />
                          </Tooltip>
                        )}
                      </div>

                      <div style={{ paddingLeft: 4 }}>
                        {renderDynamicFieldValue(field, val, key)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })
      ) : (
        /* Fallback: If no schema sections, dynamically discover and display all non-system fields from rfp */
        <Card
          variant="borderless"
          style={{ borderRadius: "14px", background: "#ffffff" }}
          styles={{ body: { padding: "24px 28px" } }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 16 }}>
            RFP Attributes &amp; Specifications
          </div>
          <Row gutter={[16, 16]}>
            {Object.keys(rfp)
              .filter((k) => !["id", "created_by", "updated_by", "deleted_at", "full_count", "submission_id"].includes(k))
              .map((key) => {
                const val = rfp[key];
                return (
                  <Col xs={24} md={typeof val === "string" && val.length > 80 ? 24 : 12} key={key}>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                        {key.replace(/_/g, " ")}
                      </div>
                      <div>{renderDynamicFieldValue({}, val, key)}</div>
                    </div>
                  </Col>
                );
              })}
          </Row>
        </Card>
      )}
    </div>
  );
}
