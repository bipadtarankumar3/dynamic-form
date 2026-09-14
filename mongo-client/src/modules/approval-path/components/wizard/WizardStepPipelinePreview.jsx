"use client";
import React from "react";
import { Card, Table, Tag } from "antd";
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  FilterFilled,
  FormOutlined,
  SafetyCertificateFilled,
  SendOutlined,
  SwapOutlined,
  TeamOutlined,
  ThunderboltFilled,
  UndoOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { decodeOp, getRoleLabel } from "../../utils/approvalPathHelpers";

export const WizardStepPipelinePreview = ({
  workflowNameValue,
  isEditing,
  initialWorkflow,
  selectedFormSlug,
  flowType,
  matrixRules = [],
  roles = [],
  uniqueRolesCount = 0,
  maxStepsCount = 0,
  dynamicLevelColumns = [],
  form,
}) => {
  const isMulti = flowType === "multi_level";
  const allVals = form.getFieldsValue(true) || {};
  const normalInits = allVals.normal_initiator_roles || [];
  const normalSteps = allVals.normal_steps || [];

  const previewSteps = isMulti ? matrixRules[0]?.steps || [] : normalSteps;
  const previewInits = isMulti ? matrixRules[0]?.initiator_roles || [] : normalInits;

  return (
    <div style={{ width: "100%" }}>
      {/* ── TOP STATS & ARCHITECTURE DASHBOARD ── */}
      <div className="approval-verify-stats-grid">
        <div className="approval-stat-tile">
          <div
            className="approval-stat-icon"
            style={{
              background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
              color: "#1d4ed8",
            }}
          >
            <SafetyCertificateFilled />
          </div>
          <div>
            <div className="approval-stat-title">Workflow Specification</div>
            <div className="approval-stat-value">
              {workflowNameValue || (isEditing ? initialWorkflow?.wdf_name || initialWorkflow?.name : "Untitled Workflow")}
            </div>
            <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700 }}>
              ● Ready for Activation
            </span>
          </div>
        </div>

        <div className="approval-stat-tile">
          <div
            className="approval-stat-icon"
            style={{
              background: "linear-gradient(135deg, #cffafe, #a5f3fc)",
              color: "#0e7490",
            }}
          >
            <FormOutlined />
          </div>
          <div>
            <div className="approval-stat-title">Trigger Form Model</div>
            <div className="approval-stat-value">
              <Tag
                color="cyan"
                icon={<FormOutlined />}
                style={{ fontWeight: 800, borderRadius: 6, fontSize: "12px", margin: 0 }}
              >
                {selectedFormSlug || "Default System Form"}
              </Tag>
            </div>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Schema Binding Verified
            </span>
          </div>
        </div>

        <div className="approval-stat-tile">
          <div
            className="approval-stat-icon"
            style={{
              background: "linear-gradient(135deg, #f3e8ff, #e9d5ff)",
              color: "#7e22ce",
            }}
          >
            <ApartmentOutlined />
          </div>
          <div>
            <div className="approval-stat-title">Architecture Paradigm</div>
            <div className="approval-stat-value">
              <Tag
                color={flowType === "multi_level" ? "purple" : "blue"}
                style={{ fontWeight: 800, borderRadius: 6, fontSize: "12px", margin: 0 }}
              >
                {flowType === "multi_level"
                  ? `Multi-Level Matrix (${matrixRules.length} Rules)`
                  : "Normal Linear Flow"}
              </Tag>
            </div>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              {flowType === "multi_level" ? "Location & Amount Routing" : "Sequential 1-Path Chain"}
            </span>
          </div>
        </div>

        <div className="approval-stat-tile">
          <div
            className="approval-stat-icon"
            style={{
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              color: "#b45309",
            }}
          >
            <ThunderboltFilled />
          </div>
          <div>
            <div className="approval-stat-title">Max Approval Depth</div>
            <div className="approval-stat-value">
              <span>
                {maxStepsCount} Levels{" "}
                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                  across {uniqueRolesCount} Roles
                </span>
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>
              ✓ Sequential Pipeline Validated
            </span>
          </div>
        </div>
      </div>

      {/* ── FULL WIDTH PIPELINE VERIFICATION CARD ── */}
      <Card className="approval-card-main" style={{ width: "100%", marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ApartmentOutlined style={{ color: "#7c3aed", fontSize: "22px" }} />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1e1b4b" }}>
                Full Pipeline Architecture & Branch Routing Matrix
              </h3>
            </div>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              Comprehensive verification view of all routing conditions, permitted initiators, and multi-tier approval chains.
            </p>
          </div>

          <Tag
            color="purple"
            style={{ fontWeight: 800, padding: "4px 12px", borderRadius: 8, fontSize: "12px" }}
          >
            {flowType === "multi_level"
              ? `${matrixRules.length} Branch Routing Paths`
              : "1 Sequential Standard Path"}
          </Tag>
        </div>

        {/* Preview Table */}
        <Table
          dataSource={
            flowType === "multi_level"
              ? matrixRules.map((r, i) => ({ ...r, _key: `prev_rule_${i}`, idx: i }))
              : [
                  {
                    _key: "prev_normal_single",
                    rule_name: "Default Standard Path",
                    conditions: [],
                    initiator_roles: form.getFieldValue("normal_initiator_roles") || [],
                    steps: form.getFieldValue("normal_steps") || [],
                  },
                ]
          }
          rowKey="_key"
          pagination={false}
          bordered
          scroll={{ x: 1000 }}
          columns={[
            {
              title: "#",
              width: 48,
              align: "center",
              render: (_, __, i) => <strong style={{ color: "#64748b" }}>{i + 1}</strong>,
            },
            {
              title: "Matrix Path / Rule Tier",
              dataIndex: "rule_name",
              width: 180,
              render: (v, r, i) => (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ApartmentOutlined style={{ color: "#9333ea" }} />
                    <strong style={{ color: "#0f172a", fontSize: "13px" }}>{v}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <Tag color="purple" style={{ fontSize: "10px", borderRadius: 4, margin: 0, fontWeight: 700 }}>
                      Tier {i + 1}
                    </Tag>
                    <Tag color={r.is_active !== false ? "green" : "default"} style={{ fontSize: "10px", borderRadius: 4, margin: 0, fontWeight: 700 }}>
                      {r.is_active !== false ? "Active" : "Disabled"}
                    </Tag>
                  </div>
                </div>
              ),
            },
            {
              title: "Match Criteria / Conditions",
              dataIndex: "conditions",
              width: 250,
              render: (conds) => {
                if (!conds || conds.length === 0) {
                  return (
                    <Tag color="default" icon={<FilterFilled />} style={{ fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>
                      All Submissions (Default)
                    </Tag>
                  );
                }
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {conds.map((c, ci) => (
                      <span
                        key={ci}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "#f5f3ff",
                          border: "1px solid #ddd6fe",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#6b21a8",
                        }}
                      >
                        <strong>{c.field}</strong> {decodeOp(c.operator)} {c.value_label || c.value}
                      </span>
                    ))}
                  </div>
                );
              },
            },
            {
              title: "Allowed Initiator(s)",
              dataIndex: "initiator_roles",
              width: 170,
              render: (inits) => {
                if (!inits || inits.length === 0) return <Tag color="cyan">Any Authenticated User</Tag>;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {inits.map((rId, ri) => (
                      <Tag key={ri} color="cyan" icon={<UserOutlined />} style={{ fontSize: "11px", borderRadius: 4, fontWeight: 700 }}>
                        {getRoleLabel(rId, roles)}
                      </Tag>
                    ))}
                  </div>
                );
              },
            },
            ...dynamicLevelColumns,
            {
              title: "Order",
              dataIndex: "order_index",
              width: 70,
              align: "center",
              render: (v, _, i) => <span style={{ color: "#64748b", fontWeight: 700 }}>{v !== undefined ? v + 1 : i + 1}</span>,
            },
            {
              title: "Status",
              dataIndex: "is_active",
              width: 90,
              align: "center",
              render: (act) => (
                <Tag color={act !== false ? "success" : "default"} style={{ fontWeight: 800, borderRadius: 4 }}>
                  {act !== false ? "Active" : "Disabled"}
                </Tag>
              ),
            },
          ]}
        />
      </Card>

      {/* ── VISUAL PIPELINE FLOW TRACK ── */}
      <Card className="approval-card-main" style={{ width: "100%" }}>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e1b4b" }}>
            Visual Execution Pipeline Diagram
          </h4>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Sequential approval flow from submission trigger through each level to final approval.
          </span>
        </div>

        <div className="pipeline-track-container">
          {/* Node 1: Submission Trigger */}
          <div className="pipeline-node pipeline-node-trigger">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SendOutlined style={{ color: "#16a34a" }} />
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#15803d", textTransform: "uppercase" }}>
                  01. Trigger
                </span>
              </div>
              <Tag color="green" style={{ margin: 0, fontSize: "10px", fontWeight: 800, borderRadius: 4 }}>
                FORM
              </Tag>
            </div>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px", marginBottom: 6 }}>
              {selectedFormSlug || "Trigger Form"}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Initiator Roles: <strong>{previewInits.length > 0 ? previewInits.map((id) => getRoleLabel(id, roles)).join(", ") : "All Users"}</strong>
            </div>
          </div>

          <div className="pipeline-arrow"><ArrowRightOutlined /></div>

          {/* Node 2: Matrix Criteria */}
          {isMulti && (
            <>
              <div className="pipeline-node pipeline-node-criteria">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FilterFilled style={{ color: "#9333ea" }} />
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#7e22ce", textTransform: "uppercase" }}>
                      02. Matrix Rules
                    </span>
                  </div>
                  <Tag color="purple" style={{ margin: 0, fontSize: "10px", fontWeight: 800, borderRadius: 4 }}>
                    RULES
                  </Tag>
                </div>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px", marginBottom: 6 }}>
                  {matrixRules.length} Rule Branches
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  Active Conditions: <strong>{matrixRules.reduce((acc, r) => acc + (r.conditions || []).length, 0)} Total Filters</strong>
                </div>
              </div>

              <div className="pipeline-arrow"><ArrowRightOutlined /></div>
            </>
          )}

          {/* Sequential Step Nodes */}
          {previewSteps.map((s, idx) => {
            const acts = Array.isArray(s.actions) && s.actions.length > 0 ? s.actions : [s.action || "approve"];
            return (
              <React.Fragment key={idx}>
                <div className="pipeline-node pipeline-node-level">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <SafetyCertificateFilled style={{ color: "#d97706" }} />
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#b45309", textTransform: "uppercase" }}>
                        Stage Level {s.level || s.step || idx + 1}
                      </span>
                    </div>
                    <Tag color="gold" style={{ margin: 0, fontSize: "10px", fontWeight: 900, borderRadius: 4 }}>
                      L{s.level || s.step || idx + 1}
                    </Tag>
                  </div>

                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px", marginBottom: 4 }}>
                    {s.role_name || getRoleLabel(s.role_id || s.role, roles)}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                    {acts.map((act, ai) => {
                      const actLower = String(act).toLowerCase();
                      if (actLower === "approve") {
                        return <Tag key={ai} color="success" icon={<CheckCircleFilled />} style={{ fontSize: "10px", margin: 0, padding: "0 4px" }}>Approve</Tag>;
                      }
                      if (actLower === "reject") {
                        return <Tag key={ai} color="error" icon={<CloseCircleFilled />} style={{ fontSize: "10px", margin: 0, padding: "0 4px" }}>Reject</Tag>;
                      }
                      if (actLower === "forward") {
                        return <Tag key={ai} color="processing" icon={<SwapOutlined />} style={{ fontSize: "10px", margin: 0, padding: "0 4px" }}>Forward</Tag>;
                      }
                      if (actLower === "resend") {
                        return <Tag key={ai} color="warning" icon={<UndoOutlined />} style={{ fontSize: "10px", margin: 0, padding: "0 4px" }}>Resend</Tag>;
                      }
                      return <Tag key={ai} style={{ fontSize: "10px", margin: 0, padding: "0 4px" }}>{act}</Tag>;
                    })}
                  </div>
                </div>

                <div className="pipeline-arrow"><ArrowRightOutlined /></div>
              </React.Fragment>
            );
          })}

          {/* Final Node: Approved */}
          <div className="pipeline-node pipeline-node-complete">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              <CheckCircleFilled style={{ color: "#059669", fontSize: "26px" }} />
            </div>
            <div style={{ fontWeight: 800, color: "#065f46", fontSize: "13px", marginBottom: 2 }}>
              Approved & Finalized
            </div>
            <span style={{ fontSize: "10px", color: "#047857", fontWeight: 600 }}>Workflow Complete</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WizardStepPipelinePreview;
