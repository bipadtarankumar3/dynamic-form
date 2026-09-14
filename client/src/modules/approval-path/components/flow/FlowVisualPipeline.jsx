"use client";
import React from "react";
import { Card, Tag } from "antd";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  FilterFilled,
  SafetyCertificateFilled,
  SendOutlined,
  SwapOutlined,
  TeamOutlined,
  UndoOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { decodeOp, getRoleLabel } from "../../utils/approvalPathHelpers";

export const FlowVisualPipeline = ({
  activeRule,
  selectedRuleIndex = 0,
  triggerForm,
  initiatorRoles = [],
  conditions = [],
  steps = [],
  roles = [],
}) => {
  return (
    <Card className="approval-card-main" style={{ marginBottom: 28 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SafetyCertificateFilled style={{ color: "#4f46e5", fontSize: "18px" }} />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
              {activeRule?.rule_name || "Approval Execution Pipeline"}
            </h3>
            <Tag color="purple" style={{ fontWeight: 800, borderRadius: 4, margin: 0 }}>
              Tier {selectedRuleIndex + 1}
            </Tag>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
            Sequential execution timeline from submission to multi-tier signoff and completion.
          </p>
        </div>

        {conditions.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#9333ea" }}>
              Trigger Match Criteria:
            </span>
            {conditions.map((c, i) => (
              <Tag
                key={i}
                color="purple"
                style={{
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "3px 8px",
                  background: "#f5f3ff",
                  border: "1px solid #ddd6fe",
                  color: "#5b21b6",
                }}
              >
                {c.field} {decodeOp(c.operator)} {c.value_label || c.value}
              </Tag>
            ))}
          </div>
        ) : (
          <Tag
            color="default"
            icon={<FilterFilled />}
            style={{ fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}
          >
            Unconditional (Default Catch-All)
          </Tag>
        )}
      </div>

      <div className="pipeline-track-container">
        {/* Node 1: Submission / Initiator Trigger */}
        <div className="pipeline-node pipeline-node-trigger">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SendOutlined style={{ color: "#16a34a", fontSize: "15px" }} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#15803d",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                01. Form Submission
              </span>
            </div>
            <Tag
              color="green"
              style={{ margin: 0, fontSize: "10px", fontWeight: 800, borderRadius: 4 }}
            >
              TRIGGER
            </Tag>
          </div>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px", marginBottom: 8 }}>
            {triggerForm}
          </div>
          <div
            style={{ fontSize: "11px", color: "#64748b", marginBottom: 6, fontWeight: 600 }}
          >
            Permitted Initiators:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {initiatorRoles.length > 0 ? (
              initiatorRoles.map((rId, ri) => (
                <Tag
                  key={ri}
                  color="cyan"
                  icon={<UserOutlined />}
                  style={{
                    fontSize: "11px",
                    borderRadius: 4,
                    fontWeight: 700,
                    padding: "1px 6px",
                  }}
                >
                  {getRoleLabel(rId, roles)} (ID: {rId})
                </Tag>
              ))
            ) : (
              <Tag
                color="cyan"
                icon={<TeamOutlined />}
                style={{ fontSize: "11px", borderRadius: 4, fontWeight: 700 }}
              >
                Any Authenticated Role
              </Tag>
            )}
          </div>
        </div>

        <div className="pipeline-arrow">
          <ArrowRightOutlined />
        </div>

        {/* Node 2: Matrix Condition Logic */}
        <div className="pipeline-node pipeline-node-criteria">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FilterFilled style={{ color: "#9333ea", fontSize: "15px" }} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#7e22ce",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                02. Criteria Match
              </span>
            </div>
            <Tag
              color="purple"
              style={{ margin: 0, fontSize: "10px", fontWeight: 800, borderRadius: 4 }}
            >
              DECISION
            </Tag>
          </div>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px", marginBottom: 8 }}>
            {conditions.length > 0 ? `${conditions.length} Clause(s) Active` : "Unconditional"}
          </div>
          <div
            style={{ fontSize: "11px", color: "#64748b", marginBottom: 6, fontWeight: 600 }}
          >
            Matched Filters:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {conditions.length > 0 ? (
              conditions.map((c, ci) => (
                <Tag
                  key={ci}
                  color="purple"
                  style={{ fontSize: "11px", borderRadius: 4, fontWeight: 700 }}
                >
                  {c.field} {decodeOp(c.operator)} {c.value_label || c.value}
                </Tag>
              ))
            ) : (
              <Tag color="default" style={{ fontSize: "11px", borderRadius: 4 }}>
                Passes All Records
              </Tag>
            )}
          </div>
        </div>

        <div className="pipeline-arrow">
          <ArrowRightOutlined />
        </div>

        {/* Sequential Level Nodes */}
        {steps.map((s, idx) => {
          const acts =
            Array.isArray(s.actions) && s.actions.length > 0
              ? s.actions
              : [s.action || "approve"];
          return (
            <React.Fragment key={idx}>
              <div className="pipeline-node pipeline-node-level">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <SafetyCertificateFilled style={{ color: "#d97706", fontSize: "15px" }} />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#b45309",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Stage Level {s.level || s.step || idx + 1}
                    </span>
                  </div>
                  <Tag
                    color="gold"
                    style={{ margin: 0, fontSize: "10px", fontWeight: 900, borderRadius: 4 }}
                  >
                    L{s.level || s.step || idx + 1}
                  </Tag>
                </div>

                <div
                  style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px", marginBottom: 4 }}
                >
                  {s.role_name || getRoleLabel(s.role_id || s.role, roles)}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: 8 }}>
                  Role ID: <strong>{s.role_id || s.role || "N/A"}</strong>
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                >
                  Allowed Actions:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {acts.map((act, ai) => {
                    const actLower = String(act).toLowerCase();
                    if (actLower === "approve") {
                      return (
                        <Tag
                          key={ai}
                          color="success"
                          icon={<CheckCircleFilled />}
                          style={{
                            fontSize: "10px",
                            margin: 0,
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          Approve
                        </Tag>
                      );
                    }
                    if (actLower === "reject") {
                      return (
                        <Tag
                          key={ai}
                          color="error"
                          icon={<CloseCircleFilled />}
                          style={{
                            fontSize: "10px",
                            margin: 0,
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          Reject
                        </Tag>
                      );
                    }
                    if (actLower === "forward") {
                      return (
                        <Tag
                          key={ai}
                          color="processing"
                          icon={<SwapOutlined />}
                          style={{
                            fontSize: "10px",
                            margin: 0,
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          Forward
                        </Tag>
                      );
                    }
                    if (actLower === "resend") {
                      return (
                        <Tag
                          key={ai}
                          color="warning"
                          icon={<UndoOutlined />}
                          style={{
                            fontSize: "10px",
                            margin: 0,
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          Resend
                        </Tag>
                      );
                    }
                    return (
                      <Tag
                        key={ai}
                        style={{
                          fontSize: "10px",
                          margin: 0,
                          padding: "1px 5px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        {act}
                      </Tag>
                    );
                  })}
                </div>
              </div>

              <div className="pipeline-arrow">
                <ArrowRightOutlined />
              </div>
            </React.Fragment>
          );
        })}

        {/* Final Node: Complete */}
        <div className="pipeline-node pipeline-node-complete">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#d1fae5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <CheckCircleFilled style={{ color: "#059669", fontSize: "28px" }} />
          </div>
          <div
            style={{ fontWeight: 800, color: "#065f46", fontSize: "14px", marginBottom: 2 }}
          >
            Approved & Finalized
          </div>
          <span style={{ fontSize: "11px", color: "#047857", fontWeight: 600 }}>
            Workflow Final Signoff
          </span>
        </div>
      </div>
    </Card>
  );
};

export default FlowVisualPipeline;
