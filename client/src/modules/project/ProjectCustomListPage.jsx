"use client";

import React, { useState } from "react";
import {
  Input, Select, Row, Col, Tag, Button, Card, Avatar, Dropdown, Pagination, Empty, Spin
} from "antd";
import dayjs from "dayjs";
import {
  PlusOutlined,
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  StarOutlined
} from "@ant-design/icons";
import { getDynamicFormHooks } from "@/modules/dynamic-form-v2/hooks/registerAllFormHooksV2";

/**
 * Custom Project Directory List View Page
 * Modular component registered in dynamic form hooks registry
 */
export default function ProjectCustomListPage({
  form_slug = "project",
  schema,
  columns,
  actions = [],
  rows = [],
  filteredDisplayRows = [],
  dataFetchLoading = false,
  fetchData,
  perms = [],
  handleOpenDynamicAddEditForm,
  handleOpenDynamicViewForm,
  handleOpenChildrenAddEditForm
}) {
  // Filter States
  const [typeFilter, setTypeFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [fyFilter, setFyFilter] = useState(null);
  const [partnerFilter, setPartnerFilter] = useState(null);
  const [searchText, setSearchText] = useState("");

  // Pagination State (Default 10 items per page)
  const [cardPage, setCardPage] = useState(1);
  const cardPageSize = 10;

  // ── Helper: Flexible field extractor for Form Builder rows ──
  const getFieldValue = (item, keys) => {
    if (!item) return "";
    for (const k of keys) {
      if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k];
      if (item.data && item.data[k] !== undefined && item.data[k] !== null && item.data[k] !== "") return item.data[k];
    }
    const allKeys = Object.keys(item);
    for (const k of keys) {
      const kClean = k.toLowerCase();
      const foundKey = allKeys.find((ak) => ak.toLowerCase() === kClean);
      if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null && item[foundKey] !== "") {
        return item[foundKey];
      }
    }
    return "";
  };

  const sourceData = (rows && rows.length > 0) ? rows : (filteredDisplayRows || []);

  // ── Step 1: Derive Filter Options Dynamically from Loaded DB Records ──
  const typeOptions = Array.from(new Set(sourceData.map((r) => getFieldValue(r, ["project_type", "type", "category_type"])).filter(Boolean)));
  const categoryOptions = Array.from(new Set(sourceData.map((r) => getFieldValue(r, ["project_category", "schedule_vii_name_schedule_vii", "goal_sdg_goal", "sector", "category"])).filter(Boolean)));
  const fyOptions = Array.from(new Set(sourceData.map((r) => getFieldValue(r, ["financial_year_name", "financial_year", "fy", "year"])).filter(Boolean)));
  const partnerOptions = Array.from(new Set(sourceData.map((r) => getFieldValue(r, ["project_funding_partner", "partner_name", "partner", "ngo_name", "ngo", "implementing_partner"])).filter(Boolean)));

  // Real-time filtering
  const displayData = sourceData.filter((item) => {
    const typeVal = String(getFieldValue(item, ["project_type", "type"])).toLowerCase();
    const catVal = String(getFieldValue(item, ["project_category", "schedule_vii_name_schedule_vii", "sector", "category"])).toLowerCase();
    const fyVal = String(getFieldValue(item, ["financial_year_name", "financial_year", "fy", "year"])).toLowerCase();
    const partVal = String(getFieldValue(item, ["project_funding_partner", "partner_name", "partner", "ngo_name", "ngo"])).toLowerCase();

    if (typeFilter && typeVal !== typeFilter.toLowerCase()) return false;
    if (categoryFilter && catVal !== categoryFilter.toLowerCase()) return false;
    if (fyFilter && fyVal !== fyFilter.toLowerCase()) return false;
    if (partnerFilter && partVal !== partnerFilter.toLowerCase()) return false;

    if (searchText) {
      const q = searchText.toLowerCase();
      const match = Object.values(item).some((val) => typeof val === "string" || typeof val === "number" ? String(val).toLowerCase().includes(q) : false);
      if (!match) return false;
    }
    return true;
  });

  const paginatedData = displayData.slice((cardPage - 1) * cardPageSize, cardPage * cardPageSize);

  // ── Helper: Action Icon Renderer ──
  const renderActionIcon = (act) => {
    const iconVal = act.icon || act.fsc_icon || act.action_icon || act.image;
    if (iconVal) {
      if (typeof iconVal === "string" && (iconVal.startsWith("http") || iconVal.startsWith("data:") || iconVal.includes("/"))) {
        return <img src={iconVal} alt="" style={{ width: 16, height: 16, objectFit: "contain", marginRight: 6 }} />;
      }
      if (typeof iconVal === "string") {
        return <span className={iconVal} style={{ fontSize: 14, marginRight: 6 }} />;
      }
      return iconVal;
    }
    if (act.slug === "view") return <EyeOutlined style={{ color: "#2563eb", marginRight: 6 }} />;
    if (act.slug === "edit") return <EditOutlined style={{ color: "#16a34a", marginRight: 6 }} />;
    if (act.slug === "delete") return <DeleteOutlined style={{ color: "#dc2626", marginRight: 6 }} />;
    if (act.type === "child" || act.child_form_slug) return <FolderAddOutlined style={{ color: "#8b5cf6", marginRight: 6 }} />;
    return <StarOutlined style={{ color: "#ea580c", marginRight: 6 }} />;
  };

  return (
    <div style={{ padding: "20px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* ── Step 2: Header Banner Bar with Prominent + Add Button ── */}
      <div
        style={{
          background: "var(--primary-gradient, linear-gradient(135deg, #ea580c 0%, #c2410c 100%))",
          color: "#ffffff",
          padding: "14px 24px",
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)"
        }}
      >
        <div>
          <h3 style={{ color: "#ffffff", margin: 0, fontWeight: 700, fontSize: 18 }}>
            {schema?.title || "Project Directory"}
          </h3>
          <span style={{ fontSize: 12, opacity: 0.9 }}>
            Total Projects: <strong>{displayData.length}</strong>
          </span>
        </div>

        {perms?.includes("add") && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => handleOpenDynamicAddEditForm && handleOpenDynamicAddEditForm({ mode: "add" })}
            style={{
              background: "#ffffff",
              color: "#c2410c",
              borderColor: "#ffffff",
              fontWeight: 800,
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
            }}
          >
            + Add Project
          </Button>
        )}
      </div>

      {/* ── Step 3: Inline Filter Controls Bar ── */}
      <div
        style={{
          background: "#ffffff",
          padding: "14px 20px",
          borderRadius: 8,
          marginTop: 14,
          border: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#475569", fontWeight: 600, fontSize: 13 }}>Project Type:</span>
          <Select
            placeholder="All Types"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            style={{ width: 140 }}
            allowClear
          >
            {typeOptions.map((opt) => (
              <Select.Option key={opt} value={opt}>{opt}</Select.Option>
            ))}
          </Select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#475569", fontWeight: 600, fontSize: 13 }}>Category / Sector:</span>
          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v)}
            style={{ width: 150 }}
            allowClear
          >
            {categoryOptions.map((opt) => (
              <Select.Option key={opt} value={opt}>{opt}</Select.Option>
            ))}
          </Select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#475569", fontWeight: 600, fontSize: 13 }}>Financial Year:</span>
          <Select
            placeholder="All Years"
            value={fyFilter}
            onChange={(v) => setFyFilter(v)}
            style={{ width: 130 }}
            allowClear
          >
            {fyOptions.map((opt) => (
              <Select.Option key={opt} value={opt}>{opt}</Select.Option>
            ))}
          </Select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#475569", fontWeight: 600, fontSize: 13 }}>Funding Partner:</span>
          <Select
            placeholder="All Partners"
            value={partnerFilter}
            onChange={(v) => setPartnerFilter(v)}
            style={{ width: 150 }}
            allowClear
          >
            {partnerOptions.map((opt) => (
              <Select.Option key={opt} value={opt}>{opt}</Select.Option>
            ))}
          </Select>
        </div>

        <Input
          placeholder="Search title, impact, location..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 210, borderRadius: 6 }}
        />

        <Button
          style={{
            background: "#b8d200",
            color: "#1e293b",
            fontWeight: 700,
            borderRadius: 16,
            border: "none",
            paddingInline: 20
          }}
        >
          Search
        </Button>

        <Button
          onClick={() => {
            setTypeFilter(null);
            setCategoryFilter(null);
            setFyFilter(null);
            setPartnerFilter(null);
            setSearchText("");
          }}
          style={{ borderRadius: 16, fontWeight: 600, paddingInline: 16 }}
        >
          Reset
        </Button>
      </div>

      {/* ── Step 4: Project Cards Grid (Card-wise Form Builder Sections Layout) ── */}
      {dataFetchLoading ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <Spin size="large" />
        </div>
      ) : (!displayData || displayData.length === 0) ? (
        <Empty description="No projects found in database" style={{ margin: "60px 0" }} />
      ) : (
        <>
          <Row gutter={[18, 18]} style={{ marginTop: 16 }}>
            {paginatedData.map((item, idx) => {
              const title = getFieldValue(item, ["project_title", "project_name", "title", "name"]) || `Project #${item.id || idx + 1}`;
              const projectType = getFieldValue(item, ["project_type", "type", "category_type"]) || "Standard";
              const projectCategory = getFieldValue(item, ["project_category", "schedule_vii_name_schedule_vii", "goal_sdg_goal", "sector", "category"]) || "CSR Initiative";
              const startDate = getFieldValue(item, ["project_duration_start_date", "start_date"]);
              const endDate = getFieldValue(item, ["project_duration_end_date", "end_date"]);
              const durationStr = (startDate || endDate)
                ? `${startDate ? dayjs(startDate).format("DD/MM/YYYY") : "—"} to ${endDate ? dayjs(endDate).format("DD/MM/YYYY") : "—"}`
                : "—";

              const directBen = getFieldValue(item, ["tentative_beneficiary_number_direct", "direct_beneficiary"]);
              const indirectBen = getFieldValue(item, ["tentative_beneficiary_number_indirect", "indirect_beneficiary"]);
              const benStr = (directBen || indirectBen)
                ? `${directBen ? Number(directBen).toLocaleString("en-IN") + " Direct" : ""}${directBen && indirectBen ? " | " : ""}${indirectBen ? Number(indirectBen).toLocaleString("en-IN") + " Indirect" : ""}`
                : "—";

              const location = getFieldValue(item, ["project_project_location", "location", "city", "state_name", "district_name", "address"]) || "—";
              const fundingPartner = getFieldValue(item, ["project_funding_partner", "company_name", "company", "donor_name", "partner_name"]) || "—";
              
              const rawBudget = getFieldValue(item, ["project_project_budget", "budget", "amount", "project_cost", "total_budget"]);
              let budgetStr = "—";
              if (rawBudget) {
                if (typeof rawBudget === "number") budgetStr = `₹${rawBudget.toLocaleString("en-IN")}`;
                else if (Array.isArray(rawBudget)) {
                  const totalAmt = rawBudget.reduce((acc, curr) => acc + (Number(curr.amount || curr.unit_cost || 0) * Number(curr.no_of_unit || 1)), 0);
                  budgetStr = totalAmt > 0 ? `₹${totalAmt.toLocaleString("en-IN")}` : "Defined in Budget";
                } else budgetStr = String(rawBudget);
              }

              const sdg = getFieldValue(item, ["goal_sdg_goal", "sdg_goal"]);
              const scheduleVii = getFieldValue(item, ["schedule_vii_name_schedule_vii", "schedule_vii"]);

              // Build card actions dynamically from Form Builder actions
              const configuredActions = actions && actions.length > 0 ? actions : (schema?.actions || []);
              const defaultCardActions = [];

              configuredActions.forEach((act) => {
                // RBAC Permission Check
                if (act.slug && perms && perms.length > 0 && !perms.includes(act.slug)) return;

                // Condition Evaluation Check
                if (act.conditions && Array.isArray(act.conditions) && act.conditions.length > 0) {
                  const matchType = act.match_type || "ALL";
                  const isConditionMet = act.conditions[matchType === "ANY" ? "some" : "every"]((cond) => {
                    if (!cond || !cond.field) return true;
                    const val = getFieldValue(item, [cond.field]);
                    const expected = String(cond.value || "").toLowerCase();
                    const actual = String(val || "").toLowerCase();
                    if (cond.operator === "equals" || cond.operator === "==") return actual === expected;
                    if (cond.operator === "not_equals" || cond.operator === "!=") return actual !== expected;
                    if (cond.operator === "contains") return actual.includes(expected);
                    return true;
                  });
                  if (!isConditionMet) return;
                }

                const iconEl = renderActionIcon(act);
                const labelText = act.name || act.title || act.slug || "Action";

                if (act.slug === "view") {
                  defaultCardActions.push({
                    key: "view",
                    label: (
                      <span style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 500 }}>
                        {iconEl}
                        <span>{labelText}</span>
                      </span>
                    ),
                    onClick: () => handleOpenDynamicViewForm && handleOpenDynamicViewForm({ data: item, mode: "view" }),
                  });
                } else if (act.slug === "edit") {
                  defaultCardActions.push({
                    key: "edit",
                    label: (
                      <span style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 500 }}>
                        {iconEl}
                        <span>{labelText}</span>
                      </span>
                    ),
                    onClick: () => handleOpenDynamicAddEditForm && handleOpenDynamicAddEditForm({ data: item, mode: "edit" }),
                  });
                } else if (act.slug === "delete") {
                  defaultCardActions.push({
                    key: "delete",
                    label: (
                      <span style={{ display: "flex", alignItems: "center", color: "#dc2626", fontSize: 13, fontWeight: 500 }}>
                        {iconEl}
                        <span>{labelText}</span>
                      </span>
                    ),
                    onClick: () => {
                      if (confirm(`Are you sure you want to delete ${title}?`)) {
                        fetchData && fetchData();
                      }
                    },
                  });
                } else if (act.type === "child" || act.child_form_slug || act.form_details?.form_slug) {
                  defaultCardActions.push({
                    key: act.slug || act.id || `child_${labelText}`,
                    label: (
                      <span style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 500 }}>
                        {iconEl}
                        <span>{labelText}</span>
                      </span>
                    ),
                    onClick: () => handleOpenChildrenAddEditForm && handleOpenChildrenAddEditForm({ data: item, mode: "add", action: act }),
                  });
                } else {
                  defaultCardActions.push({
                    key: act.slug || act.id || act.name,
                    label: (
                      <span style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 500 }}>
                        {iconEl}
                        <span>{labelText}</span>
                      </span>
                    ),
                    onClick: () => {
                      if (typeof act.onClick === "function") act.onClick(item);
                      else handleOpenDynamicViewForm && handleOpenDynamicViewForm({ data: item, mode: "view" });
                    },
                  });
                }
              });

              if (defaultCardActions.length === 0) {
                if (!perms || perms.includes("view")) {
                  defaultCardActions.push({
                    key: "view",
                    label: <span style={{ display: "flex", alignItems: "center", fontSize: 13 }}><EyeOutlined style={{ color: "#2563eb", marginRight: 6 }} /><span>View Details</span></span>,
                    onClick: () => handleOpenDynamicViewForm && handleOpenDynamicViewForm({ data: item, mode: "view" }),
                  });
                }
                if (!perms || perms.includes("edit")) {
                  defaultCardActions.push({
                    key: "edit",
                    label: <span style={{ display: "flex", alignItems: "center", fontSize: 13 }}><EditOutlined style={{ color: "#16a34a", marginRight: 6 }} /><span>Edit Details</span></span>,
                    onClick: () => handleOpenDynamicAddEditForm && handleOpenDynamicAddEditForm({ data: item, mode: "edit" }),
                  });
                }
              }

              const formHooks = getDynamicFormHooks(form_slug);
              const cardActions = formHooks?.getRowActions
                ? formHooks.getRowActions({ row: item, defaultActions: defaultCardActions, perms })
                : defaultCardActions;

              return (
                <Col xs={24} sm={12} lg={8} key={item.id || idx}>
                  <Card
                    hoverable
                    styles={{ body: { padding: "16px" } }}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
                      background: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%"
                    }}
                  >
                    {/* Cover Photo Banner */}
                    <div
                      style={{
                        height: 140,
                        margin: "-16px -16px 14px -16px",
                        background: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%), url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80) center/cover no-repeat`,
                        position: "relative"
                      }}
                    >
                      <Avatar
                        size={54}
                        style={{
                          position: "absolute",
                          bottom: -22,
                          left: 16,
                          border: "3px solid #ffffff",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                          background: "#ffffff",
                          color: "#c2410c",
                          fontWeight: 900,
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {String(fundingPartner !== "—" ? fundingPartner : title).substring(0, 3).toUpperCase()}
                      </Avatar>
                    </div>

                    {/* Header Title & Badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10, gap: 10 }}>
                      <div style={{ flex: 1, paddingLeft: 56 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", lineHeight: 1.3 }}>
                          {title}
                        </div>
                        <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Tag color="green" style={{ fontSize: 11, fontWeight: 600 }}>{projectCategory}</Tag>
                          <Tag color="blue" style={{ fontSize: 11, fontWeight: 600 }}>{projectType}</Tag>
                        </div>
                      </div>

                      <Dropdown menu={{ items: cardActions }} trigger={["click"]}>
                        <Button
                          type="default"
                          size="small"
                          icon={<MoreOutlined />}
                          style={{ borderRadius: 6, width: 32, height: 32, padding: 0 }}
                        />
                      </Dropdown>
                    </div>

                    {/* Structured Metadata List */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9", fontSize: 12, lineHeight: 1.9, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b", fontWeight: 700 }}>🗓️ Duration:</span>
                        <span style={{ color: "#334155", fontWeight: 600 }}>{durationStr}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b", fontWeight: 700 }}>📍 Location:</span>
                        <span style={{ color: "#334155", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{location}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b", fontWeight: 700 }}>💼 Funding Partner:</span>
                        <span style={{ color: "#334155", fontWeight: 600 }}>{fundingPartner}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b", fontWeight: 700 }}>💰 Budget:</span>
                        <span style={{ color: "#0f172a", fontWeight: 800 }}>{budgetStr}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b", fontWeight: 700 }}>👥 Beneficiaries:</span>
                        <span style={{ color: "#c2410c", fontWeight: 700 }}>{benStr}</span>
                      </div>
                      {(sdg || scheduleVii) && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b", fontWeight: 700 }}>🎯 SDG / VII:</span>
                          <span style={{ color: "#475569", fontWeight: 600 }}>{sdg || scheduleVii}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Quick Action */}
                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                      <Button
                        type="link"
                        onClick={() => handleOpenDynamicViewForm && handleOpenDynamicViewForm({ data: item, mode: "view" })}
                        style={{ fontWeight: 600, color: "#c2410c", padding: 0 }}
                      >
                        👁️ View Full Form & Milestones
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Pagination Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, padding: "12px 18px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Showing {displayData.length === 0 ? 0 : (cardPage - 1) * cardPageSize + 1} to {Math.min(cardPage * cardPageSize, displayData.length)} of {displayData.length} entries
            </span>
            <Pagination
              current={cardPage}
              pageSize={cardPageSize}
              total={displayData.length}
              onChange={(p) => setCardPage(p)}
              showSizeChanger={false}
            />
          </div>
        </>
      )}
    </div>
  );
}
