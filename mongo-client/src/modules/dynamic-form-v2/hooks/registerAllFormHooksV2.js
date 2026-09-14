// client/src/modules/dynamic-form-v2/hooks/registerAllFormHooksV2.js
// ============================================================
// Central Developer Hook Registration Index V2
// Developers can import and register custom hooks, menus, sub-menus,
// and CUSTOM FIELDS for any form slug here!
// ============================================================

import React, { useState } from "react";
import {
  Input, Select, DatePicker, Alert, InputNumber, Progress,
  Col, Row, Tag, Button, Card, Avatar, Dropdown, Pagination, Empty, Spin, Tooltip
} from "antd";
import dayjs from "dayjs";
import {
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  SendOutlined,
  StarOutlined,
  PlusOutlined,
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  RocketOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { registerDynamicFormHook, getDynamicFormHooks, insertColumn } from "./dynamicFormHookRegistryV2";
import KpiMonitoringSection from "@/modules/monitoring/KpiMonitoringSection";
import ProjectHeaderCard from "@/modules/project/ProjectHeaderCard";
import ProjectCustomListPage from "@/modules/project/ProjectCustomListPage";
import MonitoringHubHeader, { MONITORING_TABS } from "@/modules/monitoring/MonitoringHubHeader";

/**
 * Custom Hook Registration for "request_for_proposal"
 */
registerDynamicFormHook("request_for_proposal", {
  getColumns: ({ defaultColumns, schema }) => {
    return defaultColumns.map((col) => {
      // 1. Project Details / Title Column
      if (["project_details", "rfp_title", "title", "name", "project_name"].includes(col.key)) {
        return {
          ...col,
          label: "Project Details / Title",
          render: (text, row) => {
            const rawVal = text || row.project_details || row.rfp_title || row.title || row.name || "—";
            return (
              <div style={{ maxWidth: 260, minWidth: 160 }} className="flex items-center gap-2">
                <FileTextOutlined style={{ color: "#2563eb", flexShrink: 0, fontSize: 14 }} />
                <Tooltip title={rawVal}>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }} className="truncate">
                    {rawVal}
                  </span>
                </Tooltip>
              </div>
            );
          }
        };
      }

      // 2. Budget / Amount Column
      if (["budget_range", "budget", "total_budget", "amount"].includes(col.key)) {
        return {
          ...col,
          label: "Budget Range",
          render: (val) => {
            if (!val || val === "-") return <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>;
            const num = Number(val);
            const formatted = !isNaN(num) ? `₹${num.toLocaleString("en-IN")}` : val;
            return <Tag color="green" style={{ borderRadius: 6, fontWeight: 700, fontSize: 12, padding: "2px 8px" }}>{formatted}</Tag>;
          }
        };
      }

      // 3. Status Column
      if (col.key === "status") {
        return {
          ...col,
          label: "Status",
          render: (statusVal, row) => {
            const statusStr = String(statusVal || row.status || "").toLowerCase();
            if (statusStr.includes("selected") || statusStr.includes("tagged") || row.tagged_ngo_id) {
              return (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, padding: "2px 8px" }}>
                  NGO Selected ({row.tagged_ngo_name || "Partner"})
                </Tag>
              );
            }
            if (statusStr.includes("floated")) {
              return (
                <Tag color="processing" icon={<SendOutlined />} style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, padding: "2px 8px" }}>
                  Floated to NGOs
                </Tag>
              );
            }
            return (
              <Tag color="default" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, padding: "2px 8px" }}>
                {statusVal || "Draft"}
              </Tag>
            );
          }
        };
      }

      return col;
    });
  },

  rowActions: ({ row, actions, onView, onEdit, onDelete, onParentAction, schema }) => {
    return [
      ...actions,
    ];
  }
});

/**
 * Register Project Details Header Card hook for non-monitoring project child forms
 */
["mou", "pan", "deviation", "project_closure", "pregnant_women"].forEach((childSlug) => {
  registerDynamicFormHook(childSlug, {
    getListHeader: ({ parent_id, parent_slug }) => {
      if (!parent_id) return null;
      if (parent_slug && parent_slug !== "project") return null;
      return <ProjectHeaderCard projectId={parent_id} />;
    }
  });
});

/**
 * Register Tabbed Monitoring Hub Header for all monitoring report tab form slugs
 */
MONITORING_TABS.forEach((tab) => {
  registerDynamicFormHook(tab.form_slug, {
    getListHeader: ({ parent_id, parent_slug, activeTab, onTabChange }) => {
      if (!parent_id) return null;
      if (parent_slug && parent_slug !== "project") return null;
      return (
        <MonitoringHubHeader
          projectId={parent_id}
          activeTab={activeTab || tab.key}
          onTabChange={onTabChange}
        />
      );
    }
  });
});

/**
 * Custom Hook Registration for "monitoring"
 */
registerDynamicFormHook("monitoring", {
  getListHeader: ({ parent_id, activeTab, onTabChange }) => {
    if (!parent_id) return null;
    return (
      <MonitoringHubHeader
        projectId={parent_id}
        activeTab={activeTab || "monitoring"}
        onTabChange={onTabChange}
      />
    );
  },
  getExtraFields: ({ form_slug, mode, data, parentId, recordId, selectedData, childrenInformation, extraFieldsRef, position }) => {
    if (position !== "after_all_sections") {
      return null;
    }
    const projectId = parentId || data?.parent_id || data?.project_id || data?.project || selectedData?.parent_id || childrenInformation?.parent_primary_key_value || null;
    const monitoringId = recordId || data?.id || selectedData?.id || null;

    return (
      <KpiMonitoringSection
        ref={extraFieldsRef}
        projectId={projectId}
        monitoringId={monitoringId}
        mode={mode}
      />
    );
  }
});

/**
 * Custom Hook Registration for "monthly_review_meeting"
 */
registerDynamicFormHook("monthly_review_meeting", {
  getExtraFields: ({ form_slug, mode, data, values, onChange, fieldDbField, position }) => {
    if (position === "before" && fieldDbField === "remarks") {
      if (mode === "view") {
        return (
          <div style={{ padding: "4px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
              Meeting Amount
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
              {data?.amount ? `₹ ${Number(data.amount).toLocaleString("en-IN")}` : "NA"}
            </div>
          </div>
        );
      }

      const currentAmount = values?.amount !== undefined ? values?.amount : (data?.amount || null);

      return (
        <Col span={12}>
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
              Meeting Amount (₹)
            </label>
          </div>
          <InputNumber
            placeholder="Enter Amount"
            style={{ width: "100%", borderRadius: 7 }}
            value={currentAmount}
            onChange={(val) => {
              if (onChange) {
                onChange({ amount: val });
              }
            }}
          />
        </Col>
      );
    }

    if (position === "after" && fieldDbField === "remarks") {
      if (mode === "view") {
        return (
          <React.Fragment>
            <div style={{ padding: "4px 0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                Date of Birth (DOB) / Meeting Date
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                {data?.dob ? dayjs(data.dob).format("DD-MM-YYYY") : "NA"}
              </div>
            </div>
            <div style={{ padding: "4px 0", marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                GST Number
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                {data?.gst_number || "NA"}
              </div>
            </div>
          </React.Fragment>
        );
      }

      const rawDateValue = values?.dob !== undefined ? values?.dob : data?.dob;
      const parsedDate = rawDateValue ? dayjs(rawDateValue) : null;
      const currentGst = values?.gst_number !== undefined ? values?.gst_number : (data?.gst_number || "");

      return (
        <React.Fragment>
          <Col span={12}>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Date of Birth (DOB) / Meeting Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
            </div>
            <DatePicker
              format="DD-MM-YYYY"
              placeholder="Select Date of Birth / Meeting Date"
              style={{ width: "100%", borderRadius: 7 }}
              value={parsedDate && parsedDate.isValid() ? parsedDate : null}
              onChange={(date) => {
                if (onChange) {
                  onChange({
                    dob: date ? date.format("YYYY-MM-DD") : null
                  });
                }
              }}
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                GST Number
              </label>
            </div>
            <Input
              placeholder="Enter GST Number (e.g. 22AAAAA0000A1Z5)"
              maxLength={15}
              style={{ width: "100%", borderRadius: 7 }}
              value={currentGst}
              onChange={(e) => {
                if (onChange) {
                  onChange({
                    gst_number: e.target.value.toUpperCase()
                  });
                }
              }}
            />
          </Col>
        </React.Fragment>
      );
    }
    return null;
  },

  getColumns: ({ defaultColumns }) => {
    const amountColumn = {
      label: "Amount (₹)",
      title: "Amount (₹)",
      dataIndex: "amount",
      key: "amount",
      sortable: true,
      getValue: (row) => {
        const amt = row?.amount;
        if (amt === null || amt === undefined) return null;
        return (
          <Tag color="green" style={{ fontWeight: 600 }}>
            ₹ {Number(amt).toLocaleString("en-IN")}
          </Tag>
        );
      }
    };

    const dobColumn = {
      label: "DOB / Meeting Date",
      title: "DOB / Meeting Date",
      dataIndex: "dob",
      key: "dob",
      sortable: true,
      getValue: (row) => {
        const rawDate = row?.dob;
        if (!rawDate) return null;
        return (
          <Tag color="blue" style={{ fontWeight: 600 }}>
            {dayjs(rawDate).format("DD-MM-YYYY")}
          </Tag>
        );
      }
    };

    const gstColumn = {
      label: "GST Number",
      title: "GST Number",
      dataIndex: "gst_number",
      key: "gst_number",
      sortable: true,
      getValue: (row) => {
        const gst = row?.gst_number;
        if (!gst) return null;
        return (
          <Tag color="purple" style={{ fontWeight: 600 }}>
            {gst}
          </Tag>
        );
      }
    };

    let cols = [...(defaultColumns || [])];
    cols = insertColumn(cols, { ...amountColumn, position: { before: "remarks" } });
    cols = insertColumn(cols, { ...dobColumn, position: { after: "remarks" } });
    cols = insertColumn(cols, { ...gstColumn, position: { after: "dob" } });
    return cols;
  }
});

registerDynamicFormHook("project1", {
  customPage: (props) => <ProjectCustomListPage {...props} />
});

export { registerDynamicFormHook, getDynamicFormHooks, insertColumn };
