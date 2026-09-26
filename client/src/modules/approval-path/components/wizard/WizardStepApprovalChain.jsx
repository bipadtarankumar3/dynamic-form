"use client";
import React from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import {
  ApartmentOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterFilled,
  InfoCircleFilled,
  MinusCircleOutlined,
  PlusOutlined,
  SafetyCertificateFilled,
  UserOutlined,
} from "@ant-design/icons";
import { STEP_ACTIONS, decodeOp, getRoleLabel } from "../../utils/approvalPathHelpers";

export const WizardStepApprovalChain = ({
  flowType,
  roles = [],
  matrixRules = [],
  onOpenRuleDrawer,
  onCloneRule,
  onDeleteRule,
  dynamicLevelColumns = [],
}) => {
  return (
    <div style={{ width: "100%" }}>
      {/* ── CASE A: NORMAL FLOW ── */}
      {flowType === "normal" && (
        <Row gutter={24} justify="start">
          <Col xs={24}>
            {/* Section 1: Allowed Initiator Roles */}
            <Card className="normal-initiators-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <UserOutlined style={{ color: "#0284c7", fontSize: "18px" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0c4a6e" }}>
                  1. Rule Matching Criteria & Allowed Initiator Roles
                </h3>
              </div>

              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: 16 }}>
                Specify which user roles are permitted to submit this form and initiate this approval path. If left unselected, any user role can initiate.
              </p>

              <Form.Item
                name="normal_initiator_roles"
                label={<span className="approval-form-label">Allowed Initiator Roles</span>}
              >
                <Select
                  mode="multiple"
                  size="large"
                  placeholder="Select role(s) (e.g. Purchase Executive, Employee...)"
                  showSearch
                  optionFilterProp="label"
                  options={roles.map((r) => ({ label: `${r.name} (ID: ${r.id})`, value: r.id }))}
                  className="approval-form-input"
                />
              </Form.Item>

              <Tag color="blue" icon={<InfoCircleFilled />}>
                Rule criteria conditions disabled — this sequential path triggers for all submitted records.
              </Tag>
            </Card>

            {/* Section 2: Sequential Approval Levels */}
            <Card className="normal-steps-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <SafetyCertificateFilled style={{ color: "#ea580c", fontSize: "18px" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#7c2d12" }}>
                  2. Sequential Approval Levels (1st Level, 2nd Level ... Nth Level)
                </h3>
              </div>

              <Form.List name="normal_steps">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, idx) => (
                      <div key={key} className="normal-stage-item">
                        <div className="normal-stage-badge">
                          Stage Level {idx + 1}
                        </div>

                        <Row gutter={16} align="middle" style={{ marginTop: 6 }}>
                          <Col xs={24} md={8}>
                            <Form.Item
                              {...restField}
                              name={[name, "role_id"]}
                              label={<span className="approval-form-label" style={{ fontSize: "13px" }}>Approver Role *</span>}
                              rules={[{ required: true, message: "Approver role required" }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Select
                                size="large"
                                placeholder="Select role"
                                options={roles.map((r) => ({ label: `${r.name} (ID: ${r.id})`, value: r.id }))}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={9}>
                            <Form.Item
                              {...restField}
                              name={[name, "actions"]}
                              label={<span className="approval-form-label" style={{ fontSize: "13px" }}>Allowed Actions *</span>}
                              rules={[{ required: true, message: "Allowed actions required" }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Select
                                mode="multiple"
                                size="large"
                                options={STEP_ACTIONS.map((a) => ({ label: a.label, value: a.value }))}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={20} md={6}>
                            <Form.Item
                              {...restField}
                              name={[name, "label"]}
                              label={<span className="approval-form-label" style={{ fontSize: "13px" }}>Stage Purpose / Label</span>}
                              style={{ marginBottom: 8 }}
                            >
                              <Input size="large" placeholder={`Level ${idx + 1} Verification`} />
                            </Form.Item>
                          </Col>

                          <Col xs={4} md={1} style={{ textAlign: "center", paddingTop: 14 }}>
                            {fields.length > 1 && (
                              <Tooltip title="Remove Level">
                                <Button
                                  type="text"
                                  danger
                                  icon={<MinusCircleOutlined style={{ fontSize: "18px" }} />}
                                  onClick={() => remove(name)}
                                />
                              </Tooltip>
                            )}
                          </Col>
                        </Row>
                      </div>
                    ))}

                    <Button
                      type="dashed"
                      onClick={() =>
                        add({
                          level: fields.length + 1,
                          step: fields.length + 1,
                          role_id: null,
                          actions: ["approve", "reject"],
                          label: "",
                        })
                      }
                      block
                      icon={<PlusOutlined />}
                      style={{
                        borderRadius: 12,
                        height: 46,
                        fontWeight: 700,
                        borderColor: "#f59e0b",
                        color: "#d97706",
                        background: "#fffbeb",
                      }}
                    >
                      + Add Next Approval Level
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>
          </Col>
        </Row>
      )}

      {/* ── CASE B: MULTI-LEVEL MATRIX FLOW ── */}
      {flowType === "multi_level" && (
        <Card className="approval-card-main">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ApartmentOutlined style={{ color: "#9333ea", fontSize: "22px" }} />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#581c87" }}>
                  Location & Amount-Wise Multi-Level Approval Matrix
                </h3>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                Configure distinct approval matrices for specific SBUs, Locations, Amount Thresholds, and Initiators.
              </p>
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onOpenRuleDrawer(null)}
              style={{
                background: "#9333ea",
                borderColor: "#9333ea",
                fontWeight: 800,
                borderRadius: 10,
                height: 42,
                boxShadow: "0 4px 14px rgba(147, 51, 234, 0.3)",
              }}
            >
              + Add Matrix Rule Row
            </Button>
          </div>

          <Table
            dataSource={matrixRules.map((r, i) => ({
              ...r,
              _key: r.id || `matrix_rule_${i}`,
              idx: i,
            }))}
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
                render: (v) => <strong style={{ color: "#1e293b", fontSize: "13px" }}>{v}</strong>,
              },
              {
                title: "Match Criteria / Conditions",
                dataIndex: "conditions",
                width: 260,
                render: (conds) => {
                  if (!conds || conds.length === 0) {
                    return (
                      <Tag color="default" icon={<FilterFilled />}>
                        All Submissions
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
                width: 180,
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
              {
                title: "Actions",
                width: 120,
                align: "center",
                render: (_, __, idx) => (
                  <Space size={4}>
                    <Tooltip title="Edit Matrix Rule">
                      <Button
                        size="small"
                        icon={<EditOutlined style={{ color: "#4f46e5" }} />}
                        onClick={() => onOpenRuleDrawer(idx)}
                        style={{ borderColor: "#c7d2fe", background: "#eef2ff", borderRadius: 6 }}
                      />
                    </Tooltip>
                    <Tooltip title="Clone Rule">
                      <Button
                        size="small"
                        icon={<CopyOutlined style={{ color: "#9333ea" }} />}
                        onClick={() => onCloneRule(idx)}
                        style={{ borderColor: "#e9d5ff", background: "#faf5ff", borderRadius: 6 }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Delete this matrix rule?"
                      onConfirm={() => onDeleteRule(idx)}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Delete Rule">
                        <Button
                          size="small"
                          icon={<DeleteOutlined style={{ color: "#ef4444" }} />}
                          style={{ borderColor: "#fecaca", background: "#fef2f2", borderRadius: 6 }}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default WizardStepApprovalChain;
