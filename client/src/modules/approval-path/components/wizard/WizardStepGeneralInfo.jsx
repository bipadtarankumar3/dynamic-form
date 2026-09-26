"use client";
import React from "react";
import { Card, Col, Form, Input, Radio, Row, Select, Switch, Tag } from "antd";
import { ApartmentOutlined, ThunderboltFilled } from "@ant-design/icons";

export const WizardStepGeneralInfo = ({
  workflowNameValue,
  onNameChange,
  formSelectOptions = [],
  formsLoading = false,
  loadFormOptions,
  onFormSelect,
  flowType,
  onFlowTypeToggle,
  applyConditions,
}) => {
  return (
    <Row gutter={24} justify="start">
      <Col xs={24}>
        <Card className="approval-card-main">
          <div style={{ marginBottom: 22 }}>
            <h3 className="approval-card-section-title">
              1. General Architecture & Form Binding
            </h3>
            <p className="approval-card-section-desc">
              Specify the approval workflow title, select the trigger form, and choose the approval architecture paradigm.
            </p>
          </div>

          <Row gutter={20}>
            <Col xs={24} md={14}>
              <Form.Item
                name="name"
                label={<span className="approval-form-label">Workflow Name *</span>}
                rules={[{ required: true, message: "Please provide a workflow name" }]}
              >
                <Input
                  size="large"
                  placeholder="e.g. Material / Service PO Approval Architecture"
                  value={workflowNameValue}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="approval-form-input"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={10}>
              <Form.Item
                name="trigger_form"
                label={<span className="approval-form-label">Trigger Form (Main Form) *</span>}
                rules={[{ required: true, message: "Select the trigger form" }]}
              >
                <Select
                  size="large"
                  placeholder="Select form..."
                  showSearch
                  allowClear
                  loading={formsLoading}
                  optionFilterProp="label"
                  getPopupContainer={(trigger) => trigger.parentNode || document.body}
                  onOpenChange={(open) => {
                    if (open && loadFormOptions) loadFormOptions();
                  }}
                  onChange={onFormSelect}
                  options={formSelectOptions}
                  className="approval-form-input"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Paradigm Selection Cards */}
          <div style={{ marginTop: 8, marginBottom: 22 }}>
            <span className="paradigm-section-title">
              Approval Architecture Paradigm
            </span>

            <Row gutter={18}>
              {/* Normal Flow Card */}
              <Col xs={24} md={12}>
                <div
                  onClick={() => onFlowTypeToggle("normal")}
                  className={`paradigm-card ${flowType === "normal" ? "active-normal" : ""}`}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        className={`paradigm-icon-box ${
                          flowType === "normal" ? "normal-active" : "inactive"
                        }`}
                      >
                        <ThunderboltFilled />
                      </div>
                      <div>
                        <div className="paradigm-card-heading">Normal Flow</div>
                        <span className="paradigm-card-subheading" style={{ color: "#64748b" }}>
                          Standard Linear Sequence
                        </span>
                      </div>
                    </div>
                    <Radio checked={flowType === "normal"} />
                  </div>

                  <p className="paradigm-card-desc">
                    A single linear approval path applied to all submissions. Configure standard Initiator role(s) and Stage Levels (1st, 2nd, 3rd...).
                  </p>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Tag
                      color="blue"
                      style={{ borderRadius: 4, margin: 0, fontSize: "10px", fontWeight: 700 }}
                    >
                      Single Path
                    </Tag>
                    <Tag color="default" style={{ borderRadius: 4, margin: 0, fontSize: "10px" }}>
                      Fast Setup
                    </Tag>
                  </div>
                </div>
              </Col>

              {/* Multi-Level Matrix Flow Card */}
              <Col xs={24} md={12}>
                <div
                  onClick={() => onFlowTypeToggle("multi_level")}
                  className={`paradigm-card ${flowType === "multi_level" ? "active-matrix" : ""}`}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        className={`paradigm-icon-box ${
                          flowType === "multi_level" ? "matrix-active" : "inactive"
                        }`}
                      >
                        <ApartmentOutlined />
                      </div>
                      <div>
                        <div className="paradigm-card-heading">Multi-Level Matrix Flow</div>
                        <span
                          className="paradigm-card-subheading"
                          style={{ color: "#9333ea", fontWeight: 700 }}
                        >
                          Enterprise Multi-Criteria
                        </span>
                      </div>
                    </div>
                    <Radio checked={flowType === "multi_level"} />
                  </div>

                  <p className="paradigm-card-desc">
                    Location/SBU & Amount-wise matrix. Add multiple custom rule rows each with its own Initiator, Conditions, and Multi-Level Approvers.
                  </p>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Tag
                      color="purple"
                      style={{ borderRadius: 4, margin: 0, fontSize: "10px", fontWeight: 700 }}
                    >
                      Location & Amount Tiers
                    </Tag>
                    <Tag
                      color="purple"
                      style={{ borderRadius: 4, margin: 0, fontSize: "10px" }}
                    >
                      Multi-Initiator
                    </Tag>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Bottom Settings Bar */}
          <div className="approval-settings-strip">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                checked={applyConditions}
                onChange={(checked) => onFlowTypeToggle(checked ? "multi_level" : "normal")}
              />
              <div>
                <strong className="approval-settings-text-title">
                  Apply Rule Matching Conditions & Multi-Level Matrix
                </strong>
                <span className="approval-settings-text-desc">
                  Enable to define Location/Amount-wise branching rules
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                Active Status:
              </span>
              <Form.Item name="is_active" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default WizardStepGeneralInfo;
