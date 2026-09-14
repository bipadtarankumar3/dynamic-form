"use client";

import React from "react";
import { Row, Col, Card, Dropdown, Button, Spin, Empty, Tooltip, Tag, Modal, message } from "antd";
import {
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";

function resolveRawFieldValue(key, value, row) {
  if (key === "created_by" || key === "updated_by" || key === "modified_by" || key.endsWith("_by")) {
    const aliases = [
      `name_${key}`, `${key}_name`, `username_${key}`,
      `full_name_${key}`, `${key}_username`, `${key}_full_name`,
    ];
    for (const alias of aliases) {
      if (row[alias] !== undefined && row[alias] !== null && row[alias] !== "") return row[alias];
    }
    if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) {
      return `User #${value}`;
    }
  }
  if (typeof value === "string" && (key.endsWith("_at") || key.endsWith("_date") || key.includes("date"))) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "-";
  return String(value);
}

function renderFormattedFieldValue(label, value) {
  if (value === "-" || value === null || value === undefined || value === "") {
    return <span className="text-slate-300 italic font-normal">—</span>;
  }

  const lbl = String(label).toLowerCase();
  const valStr = String(value).trim();
  const lowVal = valStr.toLowerCase();

  // Status Badge
  if (lbl.includes("status") || lbl.includes("state")) {
    if (lowVal === "active" || lowVal === "published" || lowVal === "approved") {
      return <span className="conf-badge-published">{valStr.toUpperCase()}</span>;
    }
    if (lowVal === "draft" || lowVal === "pending" || lowVal === "in draft" || lowVal === "submit") {
      return <span className="conf-badge-draft">{valStr.toUpperCase()}</span>;
    }
    if (lowVal === "inactive" || lowVal === "rejected" || lowVal === "deleted") {
      return (
        <span
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            border: "1px dashed #f87171",
            fontWeight: 700,
            fontSize: "11px",
            borderRadius: "6px",
            padding: "2px 8px",
            letterSpacing: "0.3px",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {valStr.toUpperCase()}
        </span>
      );
    }
    return <span className="conf-badge-draft">{valStr.toUpperCase()}</span>;
  }

  // User formatting
  if (lbl.includes("user") || lbl.includes("created by") || lbl.includes("updated by") || lbl.includes("modified by") || lbl.includes("owner")) {
    const isUpdated = lbl.includes("updated") || lbl.includes("modified");
    return (
      <span className={`conf-user-chip ${isUpdated ? "conf-user-chip--updated" : "conf-user-chip--created"}`}>
        <span className="conf-user-avatar">
          <UserOutlined />
        </span>
        <span className="conf-user-name">{valStr}</span>
      </span>
    );
  }

  // Date formatting
  if (lbl.includes("date") || lbl.includes("created at") || lbl.includes("updated at")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium text-[12.5px]">
        <CalendarOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
        <span>{valStr}</span>
      </span>
    );
  }

  // Default string with tooltip limit
  return (
    <Tooltip title={valStr.length > 25 ? valStr : null} placement="topLeft">
      <span
        style={{
          maxWidth: "200px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "inline-block",
          verticalAlign: "middle",
        }}
        className="font-semibold text-slate-800 text-[12.5px]"
      >
        {valStr}
      </span>
    </Tooltip>
  );
}

export default function DefaultGridCardRenderV2({
  dataFetchLoading,
  filteredDisplayRows,
  columns = [],
  page = 1,
  pageSize = 20,
  formSlug,
  perms = [],
  handleOpenDynamicAddEditForm,
  handleOpenDynamicViewForm,
  fetchData,
}) {
  if (dataFetchLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!filteredDisplayRows || filteredDisplayRows.length === 0) {
    return <Empty description="No records found" style={{ margin: "40px 0" }} />;
  }

  const paginatedRows = filteredDisplayRows.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = (row) => {
    Modal.confirm({
      title: "Confirm Delete",
      content: "Are you sure you want to delete this record?",
      okText: "Yes, Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await privateHttpClient.delete(`dynamic-form/${formSlug}/${row.id}`);
          message.success("Record deleted successfully");
          fetchData && fetchData();
        } catch (err) {
          message.error(err?.response?.data?.message || "Failed to delete record");
        }
      },
    });
  };

  return (
    <Row gutter={[20, 20]}>
      {paginatedRows.map((row, idx) => {
        const canView = perms.includes("view") || perms.includes("*") || perms.length === 0;
        const canEdit = perms.includes("edit") || perms.includes("*") || perms.length === 0;
        const canDelete = perms.includes("delete") || perms.includes("*") || perms.length === 0;

        const cardTitle =
          row.name || row.title || row.financial_year || row.fy || row.state_name || row.project_name || `Record #${row.id || idx + 1}`;

        const displayFields =
          columns.length > 0
            ? columns
                .filter((col) => !["sl_no", "actions", "action"].includes(col.key))
                .slice(0, 6)
                .map((col) => ({
                  label: col.label || col.title || col.key,
                  value: col.getValue ? col.getValue(row) : resolveRawFieldValue(col.key, row[col.key], row),
                }))
            : Object.entries(row)
                .filter(([k]) =>
                  !["id", "data", "created_at", "updated_at", "created_by", "updated_by", "deleted_at"].includes(k) &&
                  typeof row[k] !== "object"
                )
                .slice(0, 6)
                .map(([k, v]) => ({
                  label: k.replace(/_/g, " "),
                  value: resolveRawFieldValue(k, v, row),
                }));

        return (
          <Col xs={24} sm={12} lg={8} xl={6} key={row.id || idx}>
            <div
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              style={{
                transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "rgba(var(--primary-color-rgb, 21, 128, 61), 0.4)";
                e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.04)";
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                  borderBottom: "1px solid #edf2f7",
                }}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "8px",
                      background: "rgba(var(--primary-color-rgb, 21, 128, 61), 0.1)",
                      color: "var(--primary-color, #15803d)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    <FileTextOutlined />
                  </span>
                  <Tooltip title={cardTitle} placement="topLeft">
                    <span
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "#0f172a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cardTitle}
                    </span>
                  </Tooltip>
                </div>

                {/* Direct Action Buttons */}
                <div className="db-views-action-btns" style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  {canEdit && (
                    <Tooltip title="Edit" color="#7c3aed">
                      <Button
                        size="small"
                        icon={<EditOutlined style={{ fontSize: 12 }} />}
                        onClick={() => handleOpenDynamicAddEditForm && handleOpenDynamicAddEditForm({ data: row, mode: "edit" })}
                        className="conf-action-outline-btn conf-action-edit-view-btn"
                        style={{ width: 28, height: 28, minWidth: 28 }}
                      />
                    </Tooltip>
                  )}

                  {canDelete && (
                    <Tooltip title="Delete" color="#dc2626">
                      <Button
                        size="small"
                        icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                        onClick={() => handleDelete(row)}
                        className="conf-action-delete-btn"
                        style={{ width: 28, height: 28, minWidth: 28 }}
                      />
                    </Tooltip>
                  )}

                  {canView && (
                    <Tooltip title="View" color="#16a34a">
                      <Button
                        size="small"
                        icon={<EyeOutlined style={{ fontSize: 12 }} />}
                        onClick={() => handleOpenDynamicViewForm && handleOpenDynamicViewForm({ data: row, mode: "view" })}
                        className="conf-action-edit-btn conf-action-preview-btn"
                        style={{ width: 28, height: 28, minWidth: 28 }}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Card Body Key-Value Rows */}
              <div style={{ padding: "14px 16px" }} className="flex flex-col gap-2.5 flex-1">
                {displayFields.map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      paddingBottom: "6px",
                      borderBottom: "1px dashed #f1f5f9",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "capitalize",
                        letterSpacing: "0.2px",
                      }}
                    >
                      {label}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      {renderFormattedFieldValue(label, value)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer Meta */}
              {(row.created_at || row.updated_at) && (
                <div
                  style={{
                    padding: "8px 16px",
                    background: "#f8fafc",
                    borderTop: "1px solid #f1f5f9",
                    fontSize: "11px",
                    color: "#94a3b8",
                  }}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-1">
                    <ClockCircleOutlined style={{ fontSize: 11 }} />
                    <span>Created: {resolveRawFieldValue("created_at", row.created_at, row)}</span>
                  </span>
                  <Tag
                    color="default"
                    style={{
                      margin: 0,
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "0 6px",
                      background: "#e2e8f0",
                      border: "none",
                      color: "#475569",
                    }}
                  >
                    #{row.id || idx + 1}
                  </Tag>
                </div>
              )}
            </div>
          </Col>
        );
      })}
    </Row>
  );
}

