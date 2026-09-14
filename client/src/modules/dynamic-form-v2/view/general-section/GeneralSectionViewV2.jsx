import React, { memo, useMemo, useState } from "react";
import { Row, Col, Tag, Image, Alert, Tooltip, Button } from "antd";
import {
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
  FileTextOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getDynamicFormHooks } from "../../hooks/dynamicFormHookRegistryV2";
import AddMoreSectionViewV2 from "../add-more-section/AddMoreSectionViewV2";
import { getFieldRuntimeState } from "@/modules/dynamic-form-v2/helper/runTimeCondition.helper";

/**
 * Helper to determine icon and color theme for a field
 */
const getFieldTheme = (field) => {
  const type = String(field?.type || "").toLowerCase();
  const label = String(field?.label || field?.name || field?.db_field || "").toLowerCase();

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
  if (label.includes("date") || label.includes("submission") || label.includes("created") || type === "date" || type === "date_range") {
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
    label.includes("price") ||
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

const GeneralSectionViewV2 = ({ section, data, isActiveKey, form_slug }) => {
  const hooks = useMemo(() => getDynamicFormHooks(form_slug), [form_slug]);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderExtraFields = (fieldDbField = null, position = "after") => {
    if (!hooks.getExtraFields) return null;
    return hooks.getExtraFields({
      form_slug,
      mode: "view",
      data,
      sectionSlug: section?.section_id || section?.slug || "general",
      fieldDbField,
      position,
    });
  };

  const isNumericField = (field) => {
    if (field?.type === "number" || field?.type === "currency" || field?.is_numeric === true) {
      return true;
    }
    const name = (field?.db_field || "") + " " + (field?.label || "");
    return /budget|amount|total|cost|price|expense|allocation|fund|qty|quantity|rate/i.test(name);
  };

  const isCurrencyField = (field) => {
    if (field?.type === "currency") return true;
    const name = (field?.db_field || "") + " " + (field?.label || "");
    return /budget|amount|total|cost|price|expense|allocation|fund/i.test(name);
  };

  const cleanPath = (p) => {
    if (!p || typeof p !== "string") return "";
    const pathStr = p.trim();
    if (!pathStr || pathStr === "NA" || pathStr === "[]" || pathStr === "null") return "";

    if (pathStr.startsWith("blob:") || pathStr.startsWith("data:")) {
      return pathStr;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_API_URL || "http://localhost:6003/api/v1";

    if (/^https?:\/\//i.test(pathStr)) {
      return pathStr
        .replace(/\/api\/v1\/static\/uploads\//g, "/api/v1/static/")
        .replace(/\/static\/uploads\//g, "/static/");
    }

    const cleanRel = pathStr.replace(/^\/?(uploads\/)?/, "");
    return `${apiBaseUrl}/static/${cleanRel}`;
  };

  const renderFiles = (field) => {
    let files = data?.documents?.[field?.db_field];
    if (!files || (Array.isArray(files) && files.length === 0) || files === "NA" || files === "[]") {
      files = data?.[field?.db_field];
    }

    if (!files || files === "NA" || files === "[]" || files === "null") {
      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>—</span>;
    }

    if (typeof files === "string") {
      const trimmed = files.trim();
      if (!trimmed || trimmed === "NA" || trimmed === "[]" || trimmed === "null") {
        return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>—</span>;
      }
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          files = JSON.parse(trimmed);
        } catch (_) {}
      }
    }

    const fileList = (Array.isArray(files) ? files : [files])
      .filter(Boolean)
      .filter((f) => f !== "NA" && f !== "[]" && f !== "null");

    if (fileList.length === 0) {
      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>—</span>;
    }

    return (
      <div style={{ maxHeight: 120, overflowY: "auto", width: "100%" }}>
        <div className="flex gap-2 flex-wrap items-center">
          {fileList.map((rawItem, i) => {
            let item = rawItem;
            if (typeof item === "string" && (item.startsWith("{") || item.startsWith("["))) {
              try {
                item = JSON.parse(item);
              } catch (_) {}
            }

            const rawPath =
              typeof item === "string"
                ? item
                : item?.file_path || item?.url || item?.thumbUrl || item?.preview || item?.path || "";

            const filePath = cleanPath(rawPath);
            if (!filePath) return null;

            const isDataUrl = rawPath.startsWith("data:");
            const fileName =
              typeof item === "string"
                ? isDataUrl
                  ? "Uploaded File"
                  : item.split("/").pop()?.split("?")[0] || `File ${i + 1}`
                : item?.file_name ||
                  item?.name ||
                  item?.originalname ||
                  (isDataUrl ? "Uploaded File" : rawPath.split("/").pop()?.split("?")[0] || `File ${i + 1}`);

            const key = item?.tdoc_id || item?.uid || i;
            const isImage =
              Boolean(item?.type && String(item.type).startsWith("image/")) ||
              rawPath.startsWith("data:image/") ||
              rawPath.startsWith("blob:") ||
              /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(rawPath || filePath);

            return isImage ? (
              <Image
                key={key}
                src={filePath}
                alt={fileName}
                width={48}
                height={48}
                style={{ borderRadius: 6, objectFit: "cover" }}
                preview={{ mask: <span style={{ fontSize: 10 }}>View</span> }}
              />
            ) : (
              <a
                key={key}
                href={filePath}
                target="_blank"
                rel="noreferrer"
                download={!isDataUrl ? fileName : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  color: "#0f172a",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <FileTextOutlined style={{ color: "#2563eb" }} />
                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileName}
                </span>
                <DownloadOutlined style={{ color: "#64748b" }} />
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFieldValue = (field, key) => {
    const fieldKey = field?.db_field || "";
    const cleanKey = fieldKey.replace(/_(id|pk|code|select)$/, "");

    // 1. Date Range
    if (field?.type === "date_range" && field?.act_db_field) {
      const start = data[field?.act_db_field?.start];
      const end = data[field?.act_db_field?.end];
      return start && end ? (
        <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
          {dayjs(start).format("DD MMMM YYYY")} to {dayjs(end).format("DD MMMM YYYY")}
        </span>
      ) : (
        <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>—</span>
      );
    }

    // 2. Master / Lookup resolution
    const candidateNameKeys = [
      `${fieldKey}_name`,
      `${fieldKey}_label`,
      `${fieldKey}_title`,
      `name_${fieldKey}`,
      `title_${fieldKey}`,
      `label_${fieldKey}`,
      `${cleanKey}_name`,
      `${cleanKey}_title`,
      `${cleanKey}_label`,
      `name_${cleanKey}`,
    ];

    let resolvedName = null;
    for (const k of candidateNameKeys) {
      if (data?.[k] !== undefined && data?.[k] !== null && data?.[k] !== "") {
        resolvedName = data[k];
        break;
      }
    }

    if (!resolvedName) {
      const suffixKey = Object.keys(data || {}).find(
        (k) => (k.endsWith(`_${fieldKey}`) || k.endsWith(`_${cleanKey}`)) && k !== fieldKey
      );
      if (suffixKey && data?.[suffixKey]) {
        resolvedName = data[suffixKey];
      }
    }

    if (resolvedName) {
      const parentFieldKey =
        field?.dependency?.parent_db_field || field?.dependency?.parent || field?.parent_db_field;
      let parentValue = parentFieldKey ? data?.[parentFieldKey] : null;
      let parentNameKey = parentFieldKey
        ? Object.keys(data || {}).find(
            (k) => (k.endsWith(`_${parentFieldKey}`) || k === `${parentFieldKey}_name`) && k !== parentFieldKey
          )
        : null;
      let parentName = parentNameKey ? data?.[parentNameKey] : parentValue;

      if (Array.isArray(resolvedName)) {
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {resolvedName.map((item, i) => (
              <Tag key={i} color="blue" style={{ borderRadius: 6, fontWeight: 700, fontSize: 12.5 }}>
                {item?.label || item?.name || item}
              </Tag>
            ))}
          </div>
        );
      }

      if (parentName && typeof parentName === "string" && parentName !== resolvedName) {
        return (
          <span className="flex items-center gap-1 flex-wrap">
            <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600 }}>
              {parentName}
            </Tag>
            <span className="text-gray-400 text-xs">›</span>
            <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700 }}>
              {resolvedName}
            </Tag>
          </span>
        );
      }

      const valStr = String(resolvedName).trim();
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 6 }}>
          <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14, wordBreak: "break-word" }}>
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
    }

    // 3. Static options array
    const rawVal = data?.[fieldKey];
    if (field?.options && Array.isArray(field?.options) && rawVal !== undefined && rawVal !== null) {
      const opt = field.options.find((o) => String(o.value) === String(rawVal));
      if (opt) {
        return (
          <Tag color="geekblue" style={{ borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: 13 }}>
            {opt.label || opt.name || opt.title || opt.value}
          </Tag>
        );
      }
    }

    const value = data?.[field?.db_field];
    if (value === null || value === undefined || value === "") {
      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>—</span>;
    }

    // 4. Rich-Text Editor / Textarea
    if (
      field?.type === "textarea" &&
      (field?.ui?.is_text_editor || field?.is_text_editor || (typeof value === "string" && /<[a-z][\s\S]*>/i.test(value)))
    ) {
      return (
        <div
          className="rich-text-content border border-slate-200 rounded-lg p-3 bg-slate-50 text-slate-800 text-sm leading-relaxed"
          style={{ width: "100%", maxHeight: 200, overflowY: "auto" }}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      );
    }

    // 5. Active / Inactive status
    if (field?.db_field === isActiveKey) {
      const isActive = value === 1 || value === true;
      return (
        <Tag color={isActive ? "green" : "red"} style={{ fontWeight: 700, borderRadius: 6, fontSize: 12 }}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      );
    }

    // 6. Boolean
    if (typeof value === "boolean") {
      return (
        <Tag color={value ? "success" : "default"} style={{ borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
          {value ? "Yes" : "No"}
        </Tag>
      );
    }

    // 7. Date
    if (
      (field?.type === "date" || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))) &&
      dayjs(value).isValid()
    ) {
      return (
        <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
          {dayjs(value).format("DD MMMM YYYY")}
        </span>
      );
    }

    // 8. Number / Currency
    if (!isNaN(Number(value)) && typeof value !== "boolean" && isNumericField(field)) {
      const num = Number(value);
      const formattedNum = isCurrencyField(field) ? `₹${num.toLocaleString("en-IN")}` : num.toLocaleString("en-IN");
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 6 }}>
          <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{formattedNum}</span>
          <Tooltip title={copiedKey === key ? "Copied!" : "Copy"}>
            <Button
              type="text"
              size="small"
              icon={copiedKey === key ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={() => handleCopy(num, key)}
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0, flexShrink: 0 }}
            />
          </Tooltip>
        </div>
      );
    }

    // 9. Files
    if (field?.type === "file") {
      return renderFiles(field);
    }

    // 10. Spatial / JSON
    if ((["point", "multipolygon", "line"].includes(field?.type) || field?.data_type === "json") && !Array.isArray(value)) {
      let displayVal = value;
      if (typeof value === "object") {
        displayVal = JSON.stringify(value, null, 2);
      } else if (typeof value === "string") {
        try {
          displayVal = JSON.stringify(JSON.parse(value), null, 2);
        } catch (_) {}
      }
      return (
        <pre className="text-xs bg-slate-900 text-emerald-400 p-2 rounded font-mono m-0 max-h-36 overflow-auto border border-slate-800">
          {displayVal}
        </pre>
      );
    }

    // 11. Array
    if (Array.isArray(value)) {
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {value.map((item, i) => (
            <Tag key={i} color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
              {typeof item === "object" ? item?.label || JSON.stringify(item) : String(item)}
            </Tag>
          ))}
        </div>
      );
    }

    // 12. Object
    if (typeof value === "object") {
      return <span style={{ color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{value?.label || JSON.stringify(value)}</span>;
    }

    const valStr = String(value).trim();

    // 13. URL / Website Link
    if (valStr.startsWith("http://") || valStr.startsWith("https://")) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 6 }}>
          <a
            href={valStr}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb", fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}
          >
            {valStr}
          </a>
          <Tooltip title={copiedKey === key ? "Copied!" : "Copy Link"}>
            <Button
              type="text"
              size="small"
              icon={copiedKey === key ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
              onClick={() => handleCopy(valStr, key)}
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0, flexShrink: 0 }}
            />
          </Tooltip>
        </div>
      );
    }

    // 14. Email Link
    if (String(field?.label || field?.db_field || "").toLowerCase().includes("email") || field?.type === "email") {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 6 }}>
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
              style={{ color: "#94a3b8", height: 22, width: 22, padding: 0, flexShrink: 0 }}
            />
          </Tooltip>
        </div>
      );
    }

    // 15. Default string
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

  // Separate add_more/table_grid/repeater fields — they render as their own section cards
  const ADD_MORE_TYPES = ["add_more", "table_grid", "repeater"];
  const allVisibleFields = (section?.fields || []).filter((field) => {
    if (field?.visible === false) return false;
    const { visible } = getFieldRuntimeState(field, data || {}, "admin");
    return visible;
  });
  const visibleFields = allVisibleFields.filter((f) => !ADD_MORE_TYPES.includes(f?.type));
  const embeddedAddMoreFields = allVisibleFields.filter((f) => ADD_MORE_TYPES.includes(f?.type));
  const columnCount = section?.columns || 2;

  return (
    <div className="flex flex-col gap-4">
      {/* General section field cards */}
      {visibleFields.length > 0 && (
        <div
          className="ant-card ant-card-bordered view-user-modal shadow-sm rounded-lg overflow-hidden"
          style={{ border: "1px solid #e2e8f0", background: "#ffffff" }}
        >
          {/* Section Header */}
          <div
            className="ant-card-head"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              borderBottom: "none",
              padding: "10px 16px",
              minHeight: "auto",
            }}
          >
            <div
              className="ant-card-head-title font-bold text-base text-white"
              style={{ color: "#ffffff", margin: 0, fontSize: "14px", fontWeight: 700 }}
            >
              {section?.section_label}
            </div>
          </div>

          {/* Cards Body */}
          <div style={{ padding: "16px 18px", background: "#ffffff" }}>
            <Row gutter={[16, 16]}>
              {visibleFields.map((field, fIdx) => {
                const key = `gen_${field.db_field || field.id || fIdx}`;

                // Headings
                if (field?.type === "heading") {
                  return (
                    <Col span={24} key={key}>
                      <div className="py-2 border-b border-slate-100">
                        <h4 className="font-bold text-slate-800 text-sm m-0">{field?.label}</h4>
                        {field?.subtext && <p className="text-xs text-slate-500 m-0 mt-0.5">{field.subtext}</p>}
                      </div>
                    </Col>
                  );
                }

                // Notes
                if (field?.type === "note") {
                  return (
                    <Col span={24} key={key}>
                      <Alert
                        message={field?.label || undefined}
                        description={field?.content}
                        type={["info", "warning", "success", "error"].includes(field?.note_type) ? field?.note_type : "info"}
                        showIcon
                        style={{ borderRadius: 8 }}
                      />
                    </Col>
                  );
                }

                // Custom HTML
                if (field?.type === "custom_html") {
                  return (
                    <Col span={24} key={key}>
                      {field?.label && <div className="font-bold text-xs text-slate-600 mb-1">{field.label}</div>}
                      <div dangerouslySetInnerHTML={{ __html: field?.html_content || "" }} />
                    </Col>
                  );
                }

                const theme = getFieldTheme(field);
                const rawVal = data?.[field?.db_field];
                const isFilled = rawVal !== undefined && rawVal !== null && rawVal !== "";
                const isTextarea = field.type === "textarea" || (typeof rawVal === "string" && rawVal.length > 80);
                const requestedColSpan = Number(field?.col_span) || 1;

                // Responsive column span calculation
                let colSpanProps = { xs: 24, sm: 12, md: 12, lg: columnCount === 1 ? 24 : columnCount === 2 ? 12 : columnCount === 3 ? 8 : 6 };
                if (requestedColSpan >= columnCount || isTextarea) {
                  colSpanProps = { xs: 24, sm: 24, md: 24, lg: 24 };
                }

                return (
                  <Col {...colSpanProps} key={key}>
                    <div
                      style={{
                        background: isFilled ? "#ffffff" : "#f8fafc",
                        border: isFilled ? "1px solid #e2e8f0" : "1px dashed #cbd5e1",
                        borderRadius: 12,
                        padding: "14px 16px",
                        height: "100%",
                        display: "flex",
                        alignItems: isTextarea ? "flex-start" : "center",
                        gap: 14,
                        boxShadow: isFilled ? "0 1px 3px rgba(15, 23, 42, 0.03)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Left: Icon Badge */}
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
                          marginTop: isTextarea ? 2 : 0,
                        }}
                      >
                        {theme.icon}
                      </div>

                      {/* Middle / Right: Label & Value */}
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
                            {field.label || field.db_field}
                          </span>
                          {field.required && (
                            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, marginLeft: 4 }}>*</span>
                          )}
                        </div>
                        <div style={{ minHeight: 22, display: "flex", alignItems: "center" }}>
                          {renderFieldValue(field, key)}
                        </div>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        </div>
      )}

      {/* Embedded add_more/table_grid fields rendered as separate section cards */}
      {embeddedAddMoreFields.map((field) => {
        const rowData = Array.isArray(data?.[field.db_field]) ? data[field.db_field] : [];
        const syntheticSection = {
          section_id: field.id || field.db_field,
          section_label: field.label || field.db_field,
          slug: field.db_field,
          fields: field.fields || [],
          display_mode: field.display_mode || "table",
        };
        return (
          <AddMoreSectionViewV2
            key={field.id || field.db_field}
            section={syntheticSection}
            data={rowData}
            allData={data || {}}
            isActiveKey={isActiveKey}
          />
        );
      })}
    </div>
  );
};

export default memo(GeneralSectionViewV2);
