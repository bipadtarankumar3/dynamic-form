"use client";

import React from "react";
import { Row, Col, Card, Dropdown, Button, Spin, Empty } from "antd";
import { MoreOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getDynamicFormHooks } from "@/modules/dynamic-form/hooks/dynamicFormHookRegistry";
import { privateHttpClient } from "@/services/api/httpClient";

/**
 * Resolves a display value for a row field, with user name alias support.
 * Used as a fallback when no column definition is available.
 */
function resolveRawFieldValue(key, value, row) {
  // Check user name aliases for *_by fields
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
  // Date fields
  if (typeof value === "string" && (key.endsWith("_at") || key.endsWith("_date"))) {
    const d = new Date(value);
    if (!isNaN(d)) {
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
  }
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "-";
  return String(value);
}

/**
 * Default Grid Card Layout Renderer for Dynamic General List View
 */
export default function DefaultGridCardRender({
  dataFetchLoading,
  filteredDisplayRows,
  columns = [],
  page,
  pageSize,
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

  return (
    <Row gutter={[18, 18]}>
      {paginatedRows.map((row, idx) => {
        const cardHooks = getDynamicFormHooks(formSlug);

        // ── Standard actions ──
        const defaultCardActions = [];
        if (perms.includes("view")) {
          defaultCardActions.push({
            key: "view",
            label: (
              <span className="flex items-center gap-2">
                <EyeOutlined style={{ color: "#2563eb" }} />
                <span>View Details</span>
              </span>
            ),
            onClick: () => handleOpenDynamicViewForm({ data: row, mode: "view" }),
          });
        }
        if (perms.includes("edit")) {
          defaultCardActions.push({
            key: "edit",
            label: (
              <span className="flex items-center gap-2">
                <EditOutlined style={{ color: "#16a34a" }} />
                <span>Edit Record</span>
              </span>
            ),
            onClick: () => handleOpenDynamicAddEditForm({ data: row, mode: "edit" }),
          });
        }
        if (perms.includes("delete")) {
          defaultCardActions.push({
            key: "delete",
            label: (
              <span className="flex items-center gap-2 text-red-600">
                <DeleteOutlined style={{ color: "#dc2626" }} />
                <span>Delete Record</span>
              </span>
            ),
            onClick: () => {
              if (confirm("Are you sure you want to delete this record?")) {
                privateHttpClient
                  .delete(`dynamic-form/${formSlug}/${row.id}`)
                  .then(() => fetchData && fetchData());
              }
            },
          });
        }

        const customActions = cardHooks?.getRowActions
          ? cardHooks.getRowActions({ row, defaultActions: defaultCardActions, perms })
          : defaultCardActions;

        // Allow hooks to fully override the card render
        const renderedCustomCard = cardHooks?.renderCustomCard
          ? cardHooks.renderCustomCard({
              row,
              actions: customActions,
              handleOpenDynamicViewForm,
              handleOpenDynamicAddEditForm,
            })
          : null;

        if (renderedCustomCard) {
          return (
            <Col xs={24} sm={12} lg={8} key={row.id || idx}>
              {renderedCustomCard}
            </Col>
          );
        }

        const cardTitle =
          row.title ||
          row.name ||
          row.project_title ||
          row.project_name ||
          `Record #${row.id || idx + 1}`;

        // ── Use schema column definitions (with getValue) if available ──
        // This ensures Created By shows username, dates are formatted, etc.
        const displayFields =
          columns.length > 0
            ? columns.slice(0, 5).map((col) => ({
                label: col.label || col.title || col.key,
                value: col.getValue
                  ? col.getValue(row)
                  : resolveRawFieldValue(col.key, row[col.key], row),
              }))
            : Object.entries(row)
                .filter(
                  ([k]) =>
                    !["id", "data", "created_at", "updated_at", "created_by", "updated_by"].includes(k) &&
                    typeof row[k] !== "object"
                )
                .slice(0, 5)
                .map(([k, v]) => ({
                  label: k.replace(/_/g, " "),
                  value: resolveRawFieldValue(k, v, row),
                }));

        // ── Always append system audit fields if present in the row ──
        const shownKeys = new Set(displayFields.map((f) => f.label?.toLowerCase().replace(/ /g, "_")));
        if (row.created_by !== undefined && !shownKeys.has("created_by")) {
          displayFields.push({
            label: "Created By",
            value: resolveRawFieldValue("created_by", row.created_by, row),
          });
        }
        if (row.created_at !== undefined && !shownKeys.has("created_at")) {
          displayFields.push({
            label: "Created At",
            value: resolveRawFieldValue("created_at", row.created_at, row),
          });
        }

        return (
          <Col xs={24} sm={12} lg={8} key={row.id || idx}>
            <Card
              hoverable
              styles={{ body: { padding: "16px" } }}
              style={{ borderRadius: 10, border: "1px solid #cbd5e1", background: "#ffffff" }}
              title={<span style={{ fontWeight: 700, fontSize: 14 }}>{cardTitle}</span>}
              extra={
                customActions.length > 0 && (
                  <Dropdown menu={{ items: customActions }} trigger={["click"]}>
                    <Button type="text" size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                )
              }
            >
              <div style={{ fontSize: 12, lineHeight: 1.8, color: "#475569" }}>
                {displayFields.map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{label}:</span>
                    <span style={{ maxWidth: "60%", textAlign: "right" }}>{value ?? "-"}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
