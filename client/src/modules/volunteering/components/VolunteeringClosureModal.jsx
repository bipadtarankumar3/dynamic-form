// client/src/modules/volunteering/components/VolunteeringClosureModal.jsx
"use client";

import React, { useState } from "react";
import { Modal, Form, Input, InputNumber, Rate, Button, message, Alert, Card } from "antd";
import { CheckCircleOutlined, AuditOutlined } from "@ant-design/icons";

export default function VolunteeringClosureModal(props) {
  if (!props.open || !props.event) return null;
  return <VolunteeringClosureModalContent {...props} />;
}

function VolunteeringClosureModalContent({ open, onCancel, event, onUpdateEvent }) {
  const [form] = Form.useForm();
  const [msgApi, msgContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  const currentSummary = event.closure_summary || {};

  const handleFinish = (values) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const updatedClosure = {
        status: "Closed",
        closed_at: new Date().toISOString(),
        ...values
      };
      if (onUpdateEvent) {
        onUpdateEvent(event.id, {
          closure_summary: updatedClosure,
          approval_status: "CLOSED"
        });
      }
      msgApi.success("Event post-closure report submitted and marked as CLOSED!");
      setTimeout(() => {
        onCancel();
      }, 400);
    }, 400);
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2">
          <AuditOutlined className="text-emerald-600 text-lg" />
          <span className="font-bold text-base">Post-Event Closure & Impact Sign-Off</span>
        </div>
      }
      width={650}
      footer={null}
    >
      {msgContextHolder}
      <div className="py-2 space-y-4">
        <Alert
          message="Final Closure Report"
          description="Submit the actual impact metrics, actual budget utilization, and learnings to officially sign off and close this volunteering event."
          type="info"
          showIcon
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            actual_beneficiaries: currentSummary.actual_beneficiaries || 1000,
            actual_hours_logged: currentSummary.actual_hours_logged || (event.attended_count ? event.attended_count * 4 : 120),
            actual_spend: currentSummary.actual_spend || event.total_budget || 50000,
            rating: currentSummary.rating || 5,
            key_learnings: currentSummary.key_learnings || "Event completed successfully with active volunteer participation.",
            closure_notes: currentSummary.closure_notes || ""
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Form.Item
              name="actual_beneficiaries"
              label="Actual Beneficiaries"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="actual_hours_logged"
              label="Actual Hours Logged"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={0} step={0.5} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              name="actual_spend"
              label="Actual Spend (₹)"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item
            name="rating"
            label="Overall Event Feedback & Quality Rating"
          >
            <Rate allowHalf />
          </Form.Item>

          <Form.Item
            name="key_learnings"
            label="Key Learnings & NGO Feedback"
            rules={[{ required: true, message: "Please enter key learnings" }]}
          >
            <Input.TextArea rows={3} placeholder="Highlights, feedback from partner NGO, areas of improvement..." />
          </Form.Item>

          <Form.Item
            name="closure_notes"
            label="Closure Sign-Off Remarks"
          >
            <Input.TextArea rows={2} placeholder="Any final sign-off remarks..." />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<CheckCircleOutlined />}
              className="bg-emerald-600 hover:bg-emerald-500"
              loading={loading}
            >
              Sign-Off & Close Event
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
