"use client";
import React from "react";
import { Button, Popconfirm, Switch, Table, Tag, Tooltip } from "antd";
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FormOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { parseSteps, parseRules, getRoleLabel } from "../../utils/approvalPathHelpers";

export const ListPageTable = ({
  workflows = [],
  loading = false,
  roles = [],
  formList = [],
  onToggleStatus,
  onViewFlow,
  onEdit,
  onClone,
  onDelete,
}) => {
  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      align: "center",
      sorter: (a, b) => ((a.wdf_id || a.id || 0) > (b.wdf_id || b.id || 0) ? 1 : -1),
      render: (_, __, idx) => (
        <span className="conf-index-badge">
          {idx + 1}
        </span>
      ),
    },
    {
      title: "Workflow Name & Identifier",
      dataIndex: "wdf_name",
      key: "wdf_name",
      sorter: (a, b) =>
        (a.wdf_name || a.name || "").localeCompare(b.wdf_name || b.name || ""),
      render: (text, record) => {
        const isActive = record.is_active !== false && !record.is_draft;
        return (
          <div className="ap-wf-identity">
            <div
              className={`ap-wf-avatar ${
                isActive ? "ap-wf-avatar--active" : "ap-wf-avatar--inactive"
              }`}
            >
              <ApartmentOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                {record.wdf_name || record.name || text}
              </div>
              <span
                className="conf-slug-code"
                style={{
                  color: "#2563eb",
                  background: "#eff6ff",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: "11px",
                  fontWeight: 600,
                  display: "inline-block",
                  marginTop: 2,
                }}
              >
                {record.wdf_slug || record.slug}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Trigger Form",
      dataIndex: "wdf_trigger_form",
      key: "wdf_trigger_form",
      sorter: (a, b) => {
        const formA = a.wdf_trigger_form || a.trigger_form || "";
        const formB = b.wdf_trigger_form || b.trigger_form || "";
        return formA.localeCompare(formB);
      },
      render: (_, record) => {
        const formSlug = record.wdf_trigger_form || record.trigger_form;
        if (!formSlug) {
          return (
            <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
              — Not Connected
            </span>
          );
        }
        const matched = formList.find(
          (f) => f.slug === formSlug || f.value === formSlug
        );
        const formTitle =
          matched?.title || matched?.name || matched?.label || formSlug;
        return (
          <Tag
            color="blue"
            style={{
              borderRadius: 6,
              padding: "2px 8px",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "12px",
              fontWeight: 600,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
            }}
          >
            <FormOutlined style={{ fontSize: 11 }} />
            <span>{formTitle}</span>
            <span style={{ opacity: 0.65, fontSize: "10.5px" }}>({formSlug})</span>
          </Tag>
        );
      },
    },
    {
      title: "Paradigm & Rules",
      dataIndex: "flow_type",
      key: "flow_type",
      sorter: (a, b) => (a.flow_type || "").localeCompare(b.flow_type || ""),
      render: (_, record) => {
        const isMulti = record.flow_type === "multi_level" || record.has_conditions;
        const rulesList = parseRules(record, roles);
        return isMulti ? (
          <div>
            <span
              className="conf-badge-master-yes"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <ApartmentOutlined style={{ fontSize: 12 }} />
              MULTI-LEVEL MATRIX ({rulesList.length} RULE{rulesList.length !== 1 ? "S" : ""})
            </span>
            <div style={{ color: "#64748b", fontSize: "11px", marginTop: 2 }}>
              Location &amp; Amount-wise tiers
            </div>
          </div>
        ) : (
          <div>
            <span
              className="conf-badge-master-yes"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <ApartmentOutlined style={{ fontSize: 12 }} />
              STANDARD FLOW
            </span>
            <div style={{ color: "#64748b", fontSize: "11px", marginTop: 2 }}>
              Single sequential chain
            </div>
          </div>
        );
      },
    },
    {
      title: "Approval Architecture & Stages",
      key: "architecture",
      render: (_, record) => {
        const isMulti = record.flow_type === "multi_level" || record.has_conditions;
        const rulesList = parseRules(record, roles);

        if (isMulti) {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {rulesList.slice(0, 2).map((r, ri) => (
                <div key={ri} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag color="purple" style={{ margin: 0, borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                    {r.rule_name}
                  </Tag>
                  <span style={{ color: "#64748b", fontSize: 11 }}>
                    ({(r.steps || []).length} Level{(r.steps || []).length !== 1 ? "s" : ""})
                  </span>
                </div>
              ))}
              {rulesList.length > 2 && (
                <span style={{ color: "#7c3aed", fontSize: 11, fontWeight: 700 }}>
                  +{rulesList.length - 2} more matrix rules
                </span>
              )}
            </div>
          );
        }

        const stepsArr = parseSteps(record, roles);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Tag color="geekblue" style={{ width: "fit-content", margin: 0, borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
              {stepsArr.length} Level{stepsArr.length !== 1 ? "s" : ""}
            </Tag>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {stepsArr.map((st, i) => {
                const rName = st.role_name || getRoleLabel(st.role_id || st.role, roles);
                return (
                  <Tag
                    key={i}
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      fontSize: 11,
                      borderRadius: 4,
                      padding: "1px 6px",
                      margin: 0,
                    }}
                  >
                    L{st.level || st.step || i + 1}: <strong>{rName}</strong>
                  </Tag>
                );
              })}
            </div>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 140,
      align: "center",
      sorter: (a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0),
      render: (_, record) => {
        const isActive = record.is_active !== false && !record.is_draft;
        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Switch
              size="small"
              checked={isActive}
              onChange={(checked) => onToggleStatus && onToggleStatus(record, checked)}
              style={{ backgroundColor: isActive ? "#16a34a" : "#cbd5e1" }}
            />
            <span
              className={
                isActive ? "conf-badge-published" : "conf-badge-draft"
              }
            >
              {isActive ? "ACTIVE" : record.is_draft ? "DRAFT" : "INACTIVE"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      align: "center",
      sorter: (a, b) =>
        new Date(a.created_at || a.wdf_created_at || 0) -
        new Date(b.created_at || b.wdf_created_at || 0),
      render: (date, record) => {
        const rawDate = date || record.wdf_created_at || Date.now();
        return (
          <span style={{ color: "#64748b", fontSize: "13px" }}>
            {new Date(rawDate).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      align: "center",
      onHeaderCell: () => ({
        className: "ap-actions-header-cell",
      }),
      render: (_, record) => (
        <div
          className="db-views-action-btns"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Tooltip title="Preview Pipeline Flow" color="#16a34a">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewFlow && onViewFlow(record)}
              className="conf-action-edit-btn conf-action-preview-btn"
            />
          </Tooltip>

          <Tooltip title="Edit Approval Path" color="#7c3aed">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit && onEdit(record)}
              className="conf-action-outline-btn conf-action-edit-view-btn"
            />
          </Tooltip>

          <Tooltip title="Clone Workflow" color="#ea580c">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => (onClone ? onClone(record) : onEdit && onEdit(record))}
              className="conf-action-outline-btn conf-action-refresh-btn"
            />
          </Tooltip>

          <Tooltip title="Stages Architecture" color="#2563eb">
            <Button
              size="small"
              icon={<ApartmentOutlined />}
              onClick={() => onViewFlow && onViewFlow(record)}
              className="conf-action-outline-btn conf-action-sql-btn"
            />
          </Tooltip>

          <Popconfirm
            title="Delete this approval path?"
            description="Are you sure you want to permanently delete this workflow?"
            onConfirm={() => onDelete && onDelete(record)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete" color="#dc2626">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                className="conf-action-delete-btn"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="conf-card-table ap-card-table">
      <Table
        dataSource={workflows}
        columns={columns}
        rowKey={(r) => r.wdf_id || r.id || r.wdf_slug || r.slug}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
};

export default ListPageTable;
