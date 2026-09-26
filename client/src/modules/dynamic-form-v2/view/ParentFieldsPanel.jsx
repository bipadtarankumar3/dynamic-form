import React, { useEffect, useState } from "react";
import { Row, Col, Spin, Tag, Alert, Tooltip, Button, Card } from "antd";
import {
  BranchesOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  BankOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  PaperClipOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CopyOutlined,
  CheckOutlined,
  ApartmentOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { dynamicParentRecordAPI } from "@/services/dynamicForm-service";
import dayjs from "dayjs";
import "@/app/(ngo)/_components/NgoDetailsView.css";

/**
 * Helper to determine icon and color theme for a field
 */
const getFieldTheme = (field) => {
  const type = String(field?.type || "").toLowerCase();
  const label = String(field?.label || field?.column_name || "").toLowerCase();

  if (label.includes("email") || type === "email") {
    return {
      icon: <MailOutlined style={{ color: "#3b82f6" }} />,
      bg: "#eff6ff",
      border: "#dbeafe",
    };
  }
  if (label.includes("phone") || label.includes("mobile") || label.includes("contact") || type === "phone") {
    return {
      icon: <PhoneOutlined style={{ color: "#10b981" }} />,
      bg: "#ecfdf5",
      border: "#d1fae5",
    };
  }
  if (label.includes("website") || label.includes("link") || label.includes("url") || label.includes("web")) {
    return {
      icon: <GlobalOutlined style={{ color: "#6366f1" }} />,
      bg: "#eef2ff",
      border: "#e0e7ff",
    };
  }
  if (label.includes("date") || label.includes("submission") || label.includes("created") || type === "date") {
    return {
      icon: <CalendarOutlined style={{ color: "#f59e0b" }} />,
      bg: "#fffbeb",
      border: "#fef3c7",
    };
  }
  if (
    label.includes("bank") ||
    label.includes("ifsc") ||
    label.includes("account") ||
    label.includes("budget") ||
    label.includes("amount") ||
    label.includes("cost") ||
    label.includes("fund") ||
    type === "currency" ||
    type === "number"
  ) {
    return {
      icon: <BankOutlined style={{ color: "#8b5cf6" }} />,
      bg: "#f5f3ff",
      border: "#ede9fe",
    };
  }
  if (
    label.includes("pan") ||
    label.includes("reg") ||
    label.includes("darpan") ||
    label.includes("csr") ||
    label.includes("cin") ||
    label.includes("gst") ||
    label.includes("id")
  ) {
    return {
      icon: <IdcardOutlined style={{ color: "#0d9488" }} />,
      bg: "#f0fdfa",
      border: "#ccfbf1",
    };
  }
  if (
    label.includes("address") ||
    label.includes("location") ||
    label.includes("city") ||
    label.includes("state") ||
    label.includes("district") ||
    label.includes("pin")
  ) {
    return {
      icon: <EnvironmentOutlined style={{ color: "#0284c7" }} />,
      bg: "#f0f9ff",
      border: "#e0f2fe",
    };
  }
  if (
    label.includes("name") ||
    label.includes("person") ||
    label.includes("user") ||
    label.includes("partner") ||
    label.includes("organization") ||
    label.includes("org")
  ) {
    return {
      icon: <UserOutlined style={{ color: "#059669" }} />,
      bg: "#f0fdf4",
      border: "#dcfce7",
    };
  }
  if (["file", "upload", "document"].includes(type) || label.includes("file") || label.includes("doc")) {
    return {
      icon: <PaperClipOutlined style={{ color: "#6366f1" }} />,
      bg: "#eef2ff",
      border: "#e0e7ff",
    };
  }
  if (label.includes("valid") || label.includes("status") || label.includes("active")) {
    return {
      icon: <SafetyCertificateOutlined style={{ color: "#16a34a" }} />,
      bg: "#f0fdf4",
      border: "#dcfce7",
    };
  }

  return {
    icon: <InfoCircleOutlined style={{ color: "#0ea5e9" }} />,
    bg: "#f0fdf4",
    border: "#dcfce7",
  };
};

/**
 * ParentFieldsPanel
 *
 * Renders selected parent form fields as read-only field cards
 * at the top of a child form's view/details page.
 */
const ParentFieldsPanel = ({
  form_slug,
  parent_id,
  user_id,
  record_id,
  display_fields = [],
  parent_form_title = "Parent Record",
}) => {
  const [loading, setLoading] = useState(false);
  const [parentData, setParentData] = useState(null);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (!form_slug || (!parent_id && !user_id && !record_id)) return;

    const fetchParentRecord = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await dynamicParentRecordAPI({ form_slug, parent_id, user_id, record_id });
        setParentData(res?.data?.data || null);
      } catch (err) {
        console.error("[ParentFieldsPanel] Failed to fetch parent record:", err);
        setError("Could not load parent record.");
      } finally {
        setLoading(false);
      }
    };

    fetchParentRecord();
  }, [form_slug, parent_id, user_id, record_id]);

  const effectiveDisplayFields = (display_fields && display_fields.length > 0)
    ? display_fields
    : (parentData
        ? Object.keys(parentData)
            .filter((k) => !["id", "created_at", "updated_at", "created_by", "updated_by", "deleted_at", "status", "version", "is_draft", "profile_data"].includes(k) && parentData[k] !== null && parentData[k] !== "")
            .slice(0, 12)
            .map((k) => ({
              column_name: k,
              label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            }))
        : []);

  if (!parent_id && !user_id && !record_id && !parentData) return null;
  if (!loading && !parentData) return null;

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderFieldValue = (field, rawVal, key) => {
    if (rawVal === undefined || rawVal === null || rawVal === "") {
      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>—</span>;
    }

    if (typeof rawVal === "boolean") {
      return (
        <Tag color={rawVal ? "success" : "default"} style={{ borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
          {rawVal ? "Yes" : "No"}
        </Tag>
      );
    }

    const fieldLabel = String(field.label || field.column_name || "").toLowerCase();
    const valStr = String(rawVal).trim();

    // Date formatting (check ISO or date pattern)
    if (
      (fieldLabel.includes("date") || fieldLabel.includes("submission") || /^\d{4}-\d{2}-\d{2}/.test(valStr)) &&
      dayjs(valStr).isValid()
    ) {
      return (
        <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
          {dayjs(valStr).format("DD MMMM YYYY")}
        </span>
      );
    }

    // Email value with link and copy
    if (fieldLabel.includes("email")) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <a
            href={`mailto:${valStr}`}
            style={{ color: "#0f172a", fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}
          >
            {valStr}
          </a>
          <Tooltip title={copiedKey === key ? "Copied!" : "Copy Email"}>
            <Button
              type="text"
              size="small"
              icon={copiedKey === key ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={() => handleCopy(valStr, key)}
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0 }}
            />
          </Tooltip>
        </div>
      );
    }

    // Website link
    if (valStr.startsWith("http://") || valStr.startsWith("https://") || fieldLabel.includes("website") || fieldLabel.includes("url")) {
      const href = valStr.startsWith("http") ? valStr : `https://${valStr}`;
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb", fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}
          >
            {valStr}
          </a>
          <Tooltip title={copiedKey === key ? "Copied!" : "Copy URL"}>
            <Button
              type="text"
              size="small"
              icon={copiedKey === key ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={() => handleCopy(valStr, key)}
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0 }}
            />
          </Tooltip>
        </div>
      );
    }

    // Default string / number
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 6 }}>
        <span
          style={{
            color: "#0f172a",
            fontWeight: 700,
            fontSize: 14,
            wordBreak: "break-word",
            lineHeight: 1.4,
          }}
        >
          {valStr}
        </span>
        {valStr.length > 0 && (
          <Tooltip title={copiedKey === key ? "Copied!" : "Copy"}>
            <Button
              type="text"
              size="small"
              icon={copiedKey === key ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={() => handleCopy(valStr, key)}
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0, flexShrink: 0 }}
            />
          </Tooltip>
        )}
      </div>
    );
  };

  return (
    <Card
      style={{
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        background: "#ffffff",
        overflow: "hidden",
        marginBottom: 20,
      }}
      styles={{
        header: { padding: 0 },
        body: { padding: "20px 22px" },
      }}
      title={
        <div className="ngo-section-header--basic ngo-section-header__row">
          <div className="ngo-section-header__left">
            <div className="ngo-section-header__icon-badge">
              <FolderOpenOutlined />
            </div>
            <div className="ngo-section-header__meta">
              <span className="ngo-section-header__title">
                {parent_form_title || "Implementation Partner Details"}
              </span>
              <span className="ngo-section-header__subtitle">
                View and manage {String(parent_form_title || "Implementation Partner").toLowerCase()} details
              </span>
            </div>
          </div>

          <div className="ngo-section-header__right">
            <span className="ngo-section-header__count-label">
              {effectiveDisplayFields.length} reference fields
            </span>
            <Tag
              color="success"
              style={{ borderRadius: 6, fontWeight: 700, fontSize: 11.5, padding: "2px 10px" }}
            >
              Complete
            </Tag>
          </div>
        </div>
      }
    >
      {/* Loading state */}
      {loading && (
        <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#ffffff", color: "#0369a1" }}>
          <Spin size="small" />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Loading reference information…</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ padding: "12px 16px", background: "#ffffff" }}>
          <Alert message={error} type="error" showIcon />
        </div>
      )}

      {/* Field Cards Grid */}
      {!loading && !error && parentData && (
        <Row gutter={[16, 16]}>
          {effectiveDisplayFields.map((field, idx) => {
            const theme = getFieldTheme(field);
            const col = field.column_name;
            let val = parentData[col];
            if (val === undefined || val === null || val === "") {
              val = parentData?.profile_data?.[col];
            }
            if (val === undefined || val === null || val === "") {
              const aliases = {
                name: ["person_name", "full_name", "contact_person"],
                person_name: ["name", "full_name"],
                designation: ["person_designation"],
                person_designation: ["designation"],
                contact: ["phone_no", "mobile", "phone"],
                phone_no: ["contact", "mobile", "phone"],
                organization_name: ["name_of_the_organization", "org_name"],
                darpan_no: ["ngo_darpan_id", "darpan_id", "csr_registration_number"],
                darpan_link: ["ngo_darpan_link", "website"],
              };
              for (const alias of aliases[col] || []) {
                const candidate = parentData[alias] ?? parentData?.profile_data?.[alias];
                if (candidate !== undefined && candidate !== null && candidate !== "") {
                  val = candidate;
                  break;
                }
              }
            }
            const isFilled = val !== undefined && val !== null && val !== "";
            const key = `parent_${col}_${idx}`;

            return (
              <Col xs={24} sm={12} md={12} lg={8} key={key}>
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
                    boxShadow: isFilled ? "0 1px 3px rgba(15, 23, 42, 0.03)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Left: Icon in soft pastel badge */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: theme.bg,
                      border: `1px solid ${theme.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 19,
                    }}
                  >
                    {theme.icon}
                  </div>

                  {/* Middle / Right: Label & Value */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {field.label || field.column_name}
                    </div>
                    <div style={{ minHeight: 22, display: "flex", alignItems: "center" }}>
                      {renderFieldValue(field, val, key)}
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </Card>
  );
};

export default ParentFieldsPanel;
