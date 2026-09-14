import React, { useState } from "react";
import {
  Modal, Form, Input, InputNumber, Button, Space, Typography, Upload, Row, Col, Divider, App
} from "antd";
import {
  SendOutlined, UploadOutlined
} from "@ant-design/icons";
import { submitRfpProposalAPI } from "@/services/ngo-service";

import { message as antdMessage } from "antd";

const { TextArea } = Input;

const getMessageApi = (appMessage) => {
  if (appMessage && typeof appMessage.success === "function") {
    return appMessage;
  }
  return antdMessage;
};

function SubmitFloatedRfpModalInner({ open, onCancel, rfpRecord, formSlug = "request_for_proposal", onSuccess }) {
  const app = App.useApp();
  const messageApi = getMessageApi(app?.message);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleFinish = async (values) => {
    if (!rfpRecord?.id) {
      messageApi.error("Invalid RFP selected");
      return;
    }

    setSubmitting(true);
    try {
      // Convert file objects to base64 strings if present
      const getFile = (fieldVal) => fieldVal?.fileList?.[0]?.originFileObj || null;
      const toStr = async (fieldVal) => {
        const file = getFile(fieldVal);
        if (!file) return null;
        return await toBase64(file);
      };

      const payload = {
        rfp_id: rfpRecord.id,
        form_slug: formSlug,
        organization_profile: values.organization_profile || "",
        project_understanding: values.project_understanding || "",
        methodology: values.methodology || "",
        team: values.team || "",
        implementation_plan: values.implementation_plan || "",
        risk_plan: values.risk_plan || "",
        budget: values.budget ? String(values.budget) : "",
        timeline: values.timeline || "",
        sustainability: values.sustainability || "",
        monitoring_framework: values.monitoring_framework || "",
        proposal_pdf: await toStr(values.proposal_pdf),
        budget_excel: await toStr(values.budget_excel),
        team_cvs: await toStr(values.team_cvs),
        previous_experience: await toStr(values.previous_experience),
        case_studies: await toStr(values.case_studies),
      };

      const res = await submitRfpProposalAPI(payload);

      if (res.data?.success) {
        messageApi.success(`Proposal submitted to CSR Admin successfully!`);
        form.resetFields();
        onCancel();
        if (onSuccess) onSuccess();
      } else {
        messageApi.error(res.data?.message || "Failed to submit proposal.");
      }
    } catch (err) {
      console.error("Submit proposal error:", err);
      messageApi.error("Failed to submit proposal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProps = {
    maxCount: 1,
    beforeUpload: () => false, // prevent auto-upload
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png",
  };

  return (
    <Modal
      title={
        <Space>
          <SendOutlined style={{ color: "#16a34a" }} />
          <span>Submit Floated RFP Proposal</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={800}
      style={{ top: 20 }}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>

        {/* ── Proposal Sections ──────────────────────────────── */}
        <Divider orientation="left" style={{ fontWeight: 700, fontSize: 15 }}>
          Proposal Sections
        </Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Organization Profile"
              name="organization_profile"
              rules={[{ required: true, message: "Required" }]}
            >
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Project Understanding"
              name="project_understanding"
              rules={[{ required: true, message: "Required" }]}
            >
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Methodology"
              name="methodology"
              rules={[{ required: true, message: "Required" }]}
            >
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Team" name="team">
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Implementation Plan" name="implementation_plan">
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Risk Plan" name="risk_plan">
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Budget (₹)"
              name="budget"
              rules={[{ required: true, message: "Budget is required" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                placeholder="Enter number"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(val) => val.replace(/,/g, "")}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Timeline" name="timeline">
              <Input placeholder="Enter value" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Sustainability" name="sustainability">
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Monitoring Framework" name="monitoring_framework">
              <TextArea rows={3} placeholder="Enter value" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Attachments ──────────────────────────────── */}
        <Divider orientation="left" style={{ fontWeight: 700, fontSize: 15 }}>
          Attachments
        </Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Proposal PDF" name="proposal_pdf" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
                  Choose File
                </Button>
              </Upload>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Budget Excel" name="budget_excel" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
                  Choose File
                </Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Team CVs" name="team_cvs" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
                  Choose File
                </Button>
              </Upload>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Previous Experience" name="previous_experience" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
                  Choose File
                </Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Case Studies" name="case_studies" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} style={{ width: "100%" }}>
                  Choose File
                </Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        {/* ── Footer Actions ──────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={submitting}
            style={{
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              border: "none",
              fontWeight: 700,
              borderRadius: "8px",
              paddingInline: "20px"
            }}
          >
            Submit Proposal to Admin
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

export default function SubmitFloatedRfpModal(props) {
  return (
    <App>
      <SubmitFloatedRfpModalInner {...props} />
    </App>
  );
}
