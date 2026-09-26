"use client";
import React from "react";
import {
  Button,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
} from "antd";
import {
  ApartmentOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { STEP_ACTIONS } from "../../utils/approvalPathHelpers";
import MatrixConditionClauseRow from "./MatrixConditionClauseRow";

export const RuleDrawerModal = ({
  open,
  onClose,
  form,
  editingIndex,
  onSave,
  roles = [],
  currentFormFields = [],
  fieldsLoading = false,
  masterOptionsMap = {},
  fetchMasterOptions,
}) => {
  return (
    <Drawer
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ApartmentOutlined style={{ color: "#9333ea", fontSize: "18px" }} />
          <span style={{ fontWeight: 800, fontSize: "16px", color: "#1e293b" }}>
            {editingIndex !== null
              ? `Edit Matrix Rule (Row ${editingIndex + 1})`
              : "Add New Matrix Rule Row"}
          </span>
        </div>
      }
      width={720}
      open={open}
      forceRender
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={onSave}
            style={{
              borderRadius: 8,
              background: "#9333ea",
              borderColor: "#9333ea",
              fontWeight: 700,
            }}
          >
            Save Rule to Matrix
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="rule_name"
          label={<strong style={{ color: "#1e293b", fontSize: "14px" }}>Rule Name / Tier Label *</strong>}
          rules={[{ required: true, message: "Rule name required" }]}
        >
          <Input
            size="large"
            placeholder="e.g. Fertilizers - 0 to 20,00,000"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Divider
          orientation="left"
          style={{
            borderColor: "#e2e8f0",
            color: "#9333ea",
            fontWeight: 800,
            fontSize: "14px",
          }}
        >
          1. Rule Matching Criteria & Allowed Initiator Roles
        </Divider>

        <Form.Item
          name="initiator_roles"
          label={<strong style={{ color: "#1e293b", fontSize: "13px" }}>Allowed Initiator Roles for this Rule</strong>}
        >
          <Select
            mode="multiple"
            size="large"
            placeholder="Select initiator role(s) (e.g. Purchase Executive)"
            showSearch
            optionFilterProp="label"
            options={roles.map((r) => ({ label: `${r.name} (ID: ${r.id})`, value: r.id }))}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* Condition Clauses */}
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1e293b",
              display: "block",
              marginBottom: 6,
            }}
          >
            Field Match Criteria & Conditions (Location/SBU, Amount Range From–To, etc.)
          </span>
          <Form.List name="conditions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <MatrixConditionClauseRow
                    key={key}
                    name={name}
                    restField={restField}
                    remove={remove}
                    canRemove={fields.length > 1}
                    currentFormFields={currentFormFields}
                    fieldsLoading={fieldsLoading}
                    masterOptionsMap={masterOptionsMap}
                    fetchMasterOptions={fetchMasterOptions}
                    ruleDrawerForm={form}
                  />
                ))}

                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      logic: "AND",
                      field: currentFormFields[0]?.value || "location",
                      operator: "=",
                      value: "",
                      value_label: "",
                    })
                  }
                  icon={<PlusOutlined />}
                  style={{
                    borderRadius: 8,
                    color: "#9333ea",
                    borderColor: "#c084fc",
                    width: "100%",
                    marginTop: 4,
                  }}
                >
                  + Add Condition Clause
                </Button>
              </>
            )}
          </Form.List>
        </div>

        <Divider
          orientation="left"
          style={{
            borderColor: "#e2e8f0",
            color: "#ea580c",
            fontWeight: 800,
            fontSize: "14px",
            marginTop: 24,
          }}
        >
          2. Multi-Level Approval Chain for this Rule (1st Level, 2nd Level ... Nth Level)
        </Divider>

        <Form.List name="steps">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, idx) => (
                <div key={key} className="matrix-stage-level-row">
                  <div className="matrix-stage-level-badge">
                    Level {idx + 1}
                  </div>

                  <Row gutter={12} align="middle" style={{ marginTop: 6 }}>
                    <Col xs={24} md={10}>
                      <Form.Item
                        {...restField}
                        name={[name, "role_id"]}
                        label={<span style={{ fontSize: "12px", fontWeight: 700, color: "#78350f" }}>Approver Role *</span>}
                        rules={[{ required: true, message: "Role required" }]}
                        style={{ marginBottom: 4 }}
                      >
                        <Select
                          placeholder="Select role"
                          options={roles.map((r) => ({ label: `${r.name} (ID: ${r.id})`, value: r.id }))}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={20} md={12}>
                      <Form.Item
                        {...restField}
                        name={[name, "actions"]}
                        label={<span style={{ fontSize: "12px", fontWeight: 700, color: "#78350f" }}>Permitted Actions *</span>}
                        rules={[{ required: true, message: "Permitted actions required" }]}
                        style={{ marginBottom: 4 }}
                      >
                        <Select
                          mode="multiple"
                          options={STEP_ACTIONS.map((a) => ({ label: a.label, value: a.value }))}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={4} md={2} style={{ textAlign: "center", paddingTop: 16 }}>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        />
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
                  borderRadius: 10,
                  height: 42,
                  fontWeight: 700,
                  borderColor: "#f59e0b",
                  color: "#d97706",
                  background: "#fffbeb",
                }}
              >
                + Add Next Level to this Rule
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
};

export default RuleDrawerModal;
