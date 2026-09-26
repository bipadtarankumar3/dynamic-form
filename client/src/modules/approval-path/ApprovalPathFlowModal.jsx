"use client";
// client/src/modules/approval-path/ApprovalPathFlowModal.jsx
// Visual Architecture & Sequential Flow Viewer with Multi-Level Matrix Branch Inspection

import React, { useEffect, useState, useCallback } from "react";
import { Button, Card, Modal, Tag } from "antd";
import {
  ApartmentOutlined,
  BranchesOutlined,
  FormOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import {
  parseConditions,
  parseInitiators,
  parseSteps,
  parseRules,
  getRoleLabel,
} from "./utils/approvalPathHelpers";
import FlowModalHeader from "./components/flow/FlowModalHeader";
import FlowVisualPipeline from "./components/flow/FlowVisualPipeline";
import FlowMatrixRulesTable from "./components/flow/FlowMatrixRulesTable";
import { privateHttpClient } from "@/services/api/httpClient";
import "./approval-path.css";

const ApprovalPathFlowModal = ({ open, onClose, workflow, roles = [] }) => {
  const [masterOptionsMap, setMasterOptionsMap] = useState({});
  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0);

  const fetchMasterOptions = useCallback(
    async (masterKey) => {
      if (!masterKey || masterOptionsMap[masterKey]) return;
      try {
        const res = await privateHttpClient.post("dynamic-form/master-details", {
          master: masterKey,
        });
        const rawData = res?.data?.data || [];
        const opts = rawData.map((item) => ({
          label: item.label || item.name || item.title || String(item.value || item.id),
          value: String(item.value !== undefined ? item.value : item.id),
        }));
        setMasterOptionsMap((prev) => ({ ...prev, [masterKey]: opts }));
      } catch (e) {
        console.warn("Could not fetch master options for:", masterKey, e.message);
      }
    },
    [masterOptionsMap]
  );

  useEffect(() => {
    if (open && workflow) {
      setSelectedRuleIndex(0);
      const conds = parseConditions(workflow);
      conds.forEach((c) => {
        if (c.master) fetchMasterOptions(c.master);
      });
    }
  }, [open, workflow, fetchMasterOptions]);

  const getDynamicLevelColumns = useCallback(
    (maxLevels = 5) => {
      const totalCols = Math.max(3, maxLevels);
      return Array.from({ length: totalCols }, (_, idx) => {
        const levelNum = idx + 1;
        const suffix = levelNum === 1 ? "st" : levelNum === 2 ? "nd" : levelNum === 3 ? "rd" : "th";
        const title = `${levelNum}${suffix} Level`;

        return {
          title: (
            <div style={{ textAlign: "center", fontWeight: 800, color: "#1e293b", fontSize: "13px" }}>
              {title}
            </div>
          ),
          key: `level_col_${levelNum}`,
          width: 150,
          align: "center",
          render: (_, record) => {
            const step = (record.steps || [])[idx];
            if (!step) {
              return <span style={{ color: "#94a3b8", fontSize: "14px" }}>—</span>;
            }
            const roleLabel = step.role_name || getRoleLabel(step.role_id || step.role, roles);

            return (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "13px" }}>
                  {roleLabel}
                </span>
              </div>
            );
          },
        };
      });
    },
    [roles]
  );

  if (!workflow) return null;

  const wfName = workflow.wdf_name || workflow.name || "Approval Architecture";
  const triggerForm = workflow.wdf_trigger_form || workflow.trigger_form || "N/A";
  const isMulti = workflow.flow_type === "multi_level" || Boolean(workflow.has_conditions);
  const rulesList = parseRules(workflow, roles);

  const activeRule = rulesList[selectedRuleIndex] || rulesList[0] || {
    rule_name: "Default Path",
    conditions: [],
    initiator_roles: parseInitiators(workflow, roles),
    steps: parseSteps(workflow, roles),
  };

  const initiatorRoles = activeRule.initiator_roles || parseInitiators(workflow, roles);
  const steps =
    activeRule.steps && activeRule.steps.length > 0
      ? activeRule.steps
      : parseSteps(workflow, roles);
  const conditions = activeRule.conditions || [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width="100vw"
      rootClassName="approval-flow-fullscreen-modal"
      style={{ top: 0, padding: 0 }}
    >
      <div className="approval-studio-layout">
        {/* Top Control Bar */}
        <FlowModalHeader
          wfName={wfName}
          isMulti={isMulti}
          isActive={workflow.is_active}
          triggerForm={triggerForm}
          rulesCount={rulesList.length}
          onClose={onClose}
        />

        {/* Scrollable Body */}
        <div className="approval-studio-body">
          {/* Top Metric Strip */}
          <div className="approval-verify-stats-grid">
            <div className="approval-stat-tile">
              <div className="approval-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                <FormOutlined />
              </div>
              <div>
                <div className="approval-stat-title">Trigger Model</div>
                <div className="approval-stat-value" style={{ color: "#1e3a8a", fontSize: "14px" }}>
                  {triggerForm}
                </div>
              </div>
            </div>

            <div className="approval-stat-tile">
              <div className="approval-stat-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>
                <ApartmentOutlined />
              </div>
              <div>
                <div className="approval-stat-title">Architecture Paradigm</div>
                <div className="approval-stat-value" style={{ color: "#581c87", fontSize: "14px" }}>
                  {isMulti ? `${rulesList.length} Matrix Branches` : "Sequential Flow"}
                </div>
              </div>
            </div>

            <div className="approval-stat-tile">
              <div className="approval-stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                <BranchesOutlined />
              </div>
              <div>
                <div className="approval-stat-title">Inspecting Branch</div>
                <div className="approval-stat-value" style={{ color: "#14532d", fontSize: "14px" }}>
                  {activeRule.rule_name || `Tier ${selectedRuleIndex + 1}`}
                </div>
              </div>
            </div>

            <div className="approval-stat-tile">
              <div className="approval-stat-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
                <ThunderboltFilled />
              </div>
              <div>
                <div className="approval-stat-title">Approval Depth</div>
                <div className="approval-stat-value" style={{ color: "#78350f", fontSize: "14px" }}>
                  {steps.length} Sequential Level(s)
                </div>
              </div>
            </div>
          </div>

          {/* If Multi-Level Matrix: Interactive Branch Switcher */}
          {isMulti && rulesList.length > 1 && (
            <Card
              className="approval-card-main"
              style={{
                marginBottom: 24,
                background: "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)",
                border: "1.5px solid #e9d5ff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ApartmentOutlined style={{ color: "#9333ea", fontSize: "18px" }} />
                    <strong style={{ color: "#581c87", fontSize: "15px" }}>
                      Interactive Matrix Branch Selector
                    </strong>
                  </div>
                  <span style={{ color: "#7e22ce", fontSize: "12px" }}>
                    Select a rule tier below to dynamically inspect its criteria clauses and sequential approver pipeline.
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {rulesList.map((r, i) => {
                    const isSelected = i === selectedRuleIndex;
                    return (
                      <Button
                        key={i}
                        type={isSelected ? "primary" : "default"}
                        onClick={() => setSelectedRuleIndex(i)}
                        className={`branch-pill-btn ${isSelected ? "branch-pill-active" : ""}`}
                      >
                        <span style={{ marginRight: 6 }}>
                          Tier {i + 1}: {r.rule_name || `Rule ${i + 1}`}
                        </span>
                        {r.conditions && r.conditions.length > 0 && (
                          <Tag
                            color={isSelected ? "white" : "purple"}
                            style={{
                              margin: 0,
                              fontSize: "10px",
                              lineHeight: "16px",
                              fontWeight: 800,
                              borderRadius: 4,
                              color: isSelected ? "#9333ea" : undefined,
                            }}
                          >
                            {r.conditions.length} cond
                          </Tag>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Visual Pipeline Container */}
          <FlowVisualPipeline
            activeRule={activeRule}
            selectedRuleIndex={selectedRuleIndex}
            triggerForm={triggerForm}
            initiatorRoles={initiatorRoles}
            conditions={conditions}
            steps={steps}
            roles={roles}
          />

          {/* Full Matrix Ruleset Table */}
          {isMulti && (
            <FlowMatrixRulesTable
              rulesList={rulesList}
              selectedRuleIndex={selectedRuleIndex}
              onSelectRule={setSelectedRuleIndex}
              roles={roles}
              dynamicLevelColumns={getDynamicLevelColumns(
                rulesList.reduce((max, r) => Math.max(max, (r.steps || []).length), 0)
              )}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ApprovalPathFlowModal;
