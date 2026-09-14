// client/src/modules/dynamic-form/hooks/registerAllFormHooks.js
// ============================================================
// Central Developer Hook Registration Index
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
import { registerDynamicFormHook, getDynamicFormHooks, insertColumn } from "./dynamicFormHookRegistry";
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

      // 4. Any long text field (Objective, Scope of Work, Deliverables, Eligibility, Evaluation Criteria, etc.)
      const isLongTextField = [
        "objective", "description", "project_objective",
        "scope_of_work", "deliverables", "eligibility_criteria",
        "evaluation_criteria", "submission_guidelines", "remarks"
      ].includes(col.key);

      if (isLongTextField) {
        return {
          ...col,
          render: (text) => {
            if (!text || text === "-") return <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>;
            const strVal = typeof text === "object" ? JSON.stringify(text) : String(text);
            return (
              <Tooltip title={strVal}>
                <div style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#334155", fontSize: 12 }}>
                  {strVal}
                </div>
              </Tooltip>
            );
          }
        };
      }

      return col;
    });
  },
  getRowActions: ({ row, defaultActions, handleFloatRFP }) => {
    const customItems = [...defaultActions];

    const isFloated =
      String(row.status || "").toLowerCase() === "floated" ||
      (Array.isArray(row.floated_ngos) && row.floated_ngos.length > 0) ||
      Boolean(row.float_date) ||
      Boolean(row.floated_date);

    const isTagged =
      (Boolean(row.tagged_ngo_id) || Boolean(row.tagged_ngo_name)) &&
      (String(row.status || "").toLowerCase().includes("tagged") ||
       String(row.status || "").toLowerCase().includes("selected") ||
       String(row.status || "").toLowerCase().includes("approved"));

    // 1. Show "🚀 Create Project (NGO Name)" when NGO partner is tagged/approved for RFP
    if (isTagged) {
      customItems.unshift({
        key: "create_project_action",
        label: (
          <span className="flex items-center gap-2 text-[13px] font-bold text-emerald-600">
            <RocketOutlined style={{ color: "#16a34a" }} />
            <span>🚀 Create Project ({row.tagged_ngo_name || "Tagged NGO"})</span>
          </span>
        ),
        onClick: () => {
          if (typeof window !== "undefined") {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
            const ngoId = row.tagged_ngo_id || "";
            const ngoName = encodeURIComponent(row.tagged_ngo_name || "");
            window.location.href = `${baseUrl}/admin/forms/project?rfp_id=${row.id}&ngo_id=${ngoId}&ngo_name=${ngoName}`;
          }
        },
      });
    }

    // 2. Show "Float RFP to NGOs" ONLY if the RFP has not been floated yet
    if (!isFloated && typeof handleFloatRFP === "function") {
      customItems.unshift({
        key: "float_rfp_action",
        label: (
          <span className="flex items-center gap-2 text-[13px] font-semibold text-blue-600">
            <SendOutlined style={{ color: "#2563eb" }} />
            <span>Float RFP to NGOs</span>
          </span>
        ),
        onClick: () => handleFloatRFP(row),
      });
    }

    // 3. Show "⭐ View NGO Proposals & Score" ONLY AFTER the RFP form has been floated
    if (isFloated) {
      customItems.unshift({
        key: "view_submitted_proposals_action",
        label: (
          <span className="flex items-center gap-2 text-[13px] font-semibold text-purple-600">
            <StarOutlined style={{ color: "#7c3aed" }} />
            <span>⭐ View NGO Proposals & Score</span>
          </span>
        ),
        onClick: () => {
          if (typeof window !== "undefined") {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
            window.location.href = `${baseUrl}/ngo/rfp-assessment?rfp_id=${row.id}`;
          }
        },
      });
    }

    return customItems;
  },
});


/**
 * Custom Hook Registration for "implementation_partner"
 */
registerDynamicFormHook("implementation_partner", {
  /**
   * Pure Hook-Driven Row Actions & Sub-Menus Handler
   * @param {Object} param0 - { row, defaultActions, handleApproveNGO }
   */
  getRowActions: ({ row, defaultActions, handleApproveNGO }) => {
    const customItems = [...defaultActions];

    // 1. Add "Approve NGO" Action purely from Hook if status is not Approved
    if (String(row.status || "").toLowerCase() !== "approved") {
      customItems.push({
        key: "approve_ngo",
        label: (
          <span className="flex items-center gap-2 text-[13px] text-emerald-600 font-semibold">
            <CheckCircleOutlined style={{ color: "#16a34a" }} />
            <span>Approve NGO</span>
          </span>
        ),
        onClick: () => handleApproveNGO(row)
      });
    }

    // 2. Add Custom Sub-Menu Example
    customItems.push({
      key: "ngo_more_tools",
      label: (
        <span className="flex items-center gap-2 text-[13px] text-slate-700">
          <SafetyCertificateOutlined style={{ color: "#0284c7" }} />
          <span>Partner Verification &amp; Tools</span>
        </span>
      ),
      children: [
        {
          key: "sub_audit_log",
          label: "View Compliance Audit Log",
          onClick: () => alert(`Viewing Audit Log for NGO "${row.name || row.organization_name || 'Partner'}"`)
        },
        {
          key: "sub_export_cert",
          label: "Export Eligibility Certificate (PDF)",
          onClick: () => alert(`Exporting PDF for ID #${row.id}`)
        }
      ]
    });

    return customItems;
  },

  /**
   * Custom Fields injected after each section.
   * Return null to skip for a given sectionSlug.
   * Return a React element to inject it below the matching section.
   *
   * @param {Object} context - { form_slug, mode, data, sectionSlug }
   */
  getExtraFields: ({ form_slug, mode, data, sectionSlug, position }) => {
    // Render ONCE below all sections at the form bottom
    if (position !== "after_all_sections") {
      return null;
    }
    // Only inject after the first (general) section
    // sectionSlug will be the slug/section_id of the current section
    // Return null for sections where you don't need extra fields
    if (sectionSlug !== "general" && !String(sectionSlug || "").includes("partner")) {
      return null;
    }

    return (
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 10,
          padding: "16px 18px",
          marginTop: 4
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            fontWeight: 700,
            fontSize: 13,
            color: "#166534"
          }}
        >
          <InfoCircleOutlined />
          Additional Information (Custom Fields via Hook)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 4 }}>
              GST / Tax Registration Number
            </label>
            <Input
              placeholder="Enter GST / Tax Number"
              style={{ borderRadius: 7 }}
              id="hook_gst_number"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 4 }}>
              Organization Category
            </label>
            <Select
              placeholder="Select category"
              style={{ width: "100%", borderRadius: 7 }}
              id="hook_org_category"
              options={[
                { label: "NGO / Non-Profit", value: "ngo" },
                { label: "Private Limited", value: "pvt_ltd" },
                { label: "Government Body", value: "govt" },
                { label: "Section 8 Company", value: "sec8" },
              ]}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 4 }}>
              Date of Establishment
            </label>
            <DatePicker
              placeholder="Select date"
              style={{ width: "100%", borderRadius: 7 }}
              id="hook_est_date"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, display: "block", marginBottom: 4 }}>
              Annual Turnover (INR)
            </label>
            <Input
              type="number"
              placeholder="e.g. 5000000"
              style={{ borderRadius: 7 }}
              id="hook_annual_turnover"
            />
          </div>
        </div>
      </div>
    );
  },

  // Before submission validation / transformation hook
  onBeforeSubmit: async (formData) => {
    console.log("[Hook: implementation_partner] Pre-submit validation:", formData);
    return formData;
  },

  // After submission callback hook
  onAfterSubmit: async (result, formData) => {
    console.log("[Hook: implementation_partner] Post-submit callback:", result);
  }
});

/**
 * Custom Hook Registration for "partner_due_dilligence"
 */
registerDynamicFormHook("partner_due_dilligence", {
  getRowActions: ({ row, defaultActions }) => {
    return [
      ...defaultActions,
      {
        key: "quick_review",
        label: "Quick Scorecard Review",
        icon: <FileTextOutlined style={{ color: "#eab308" }} />,
        onClick: () => alert(`Viewing Due Diligence Scorecard for Application #${row.id}`)
      }
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
 *
 * URL pattern: /admin/forms/project/monitoring/3/
 *   → parentId = 3  (the project id from the URL)
 *   → recordId  = monitoring row id (available in edit mode from selectedData)
 *
 * Replaces the Add More "KPI tracking" section that was previously configured
 * in the form builder — the hook renders a premium KPI tracking table instead.
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
    // Render ONCE below all sections at the form bottom
    if (position !== "after_all_sections") {
      return null;
    }
    // parentId  = project id (from URL: /project/monitoring/3/ or data.parent_id)
    // recordId  = monitoring record id (selectedData.id in edit/view mode or data.id)
    const projectId   = parentId || data?.parent_id || data?.project_id || data?.project || selectedData?.parent_id || childrenInformation?.parent_primary_key_value || null;
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
 * Injects a custom Date of Birth (DOB) / Meeting Date field directly into the form!
 */
registerDynamicFormHook("monthly_review_meeting", {
  getExtraFields: ({ form_slug, mode, data, values, onChange, fieldDbField, position }) => {
    // 📍 Render BEFORE "remarks" field
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

    // 📍 Render AFTER "remarks" field
    if (position === "after" && fieldDbField === "remarks") {
      // 👁️ VIEW MODE: Render read-only formatted values
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

      // ✏️ EDIT / ADD MODE: Render DOB DatePicker & GST Number Input
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

  /**
   * Custom Table Columns Hook for List View
   * Injects Amount, DOB / Meeting Date & GST Number columns into the data table!
   */
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
  // 🌟 Clean 1-Line Component Delegation for Project Module
  customPage: (props) => <ProjectCustomListPage {...props} />
});