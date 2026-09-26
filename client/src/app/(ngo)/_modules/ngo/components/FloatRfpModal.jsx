import React, { useEffect } from "react";
import { Modal, Form, Select, Input, DatePicker, Button, Space, Typography } from "antd";
import { SendOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import useFloatRfp from "../hooks/useFloatRfp";

const { Text, Title } = Typography;

export default function FloatRfpModal({ open, onCancel, rfpRecord, onSuccess }) {
  const [form] = Form.useForm();
  const { ngos, loadingNgos, submitting, fetchApprovedNgos, floatRfpToNgos } = useFloatRfp();

  useEffect(() => {
    if (open) {
      fetchApprovedNgos();
      form.setFieldsValue({
        float_date: dayjs(),
        remarks: "",
      });
    }
  }, [open]);

  const handleFinish = (values) => {
    floatRfpToNgos(
      {
        rfpId: rfpRecord?.id,
        selectedNgoIds: values.selected_ngos,
        floatDate: values.float_date ? values.float_date.format("YYYY-MM-DD") : null,
        remarks: values.remarks,
      },
      () => {
        form.resetFields();
        onCancel();
        if (onSuccess) onSuccess();
      }
    );
  };

  return (
    <Modal
      title={
        <Space>
          <SendOutlined style={{ color: "#2563eb" }} />
          <span>Float RFP to Selected NGOs</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 16 }}>
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 16, border: "1px solid #e2e8f0" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>SELECTED RFP</Text>
          <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
            {rfpRecord?.title || rfpRecord?.rfp_title || rfpRecord?.name || `RFP #${rfpRecord?.id}`}
          </Title>
        </div>

        {/* 1. Targeted NGOs Multi-Select */}
        <Form.Item
          label="Targeted NGOs (Choose Multiple)"
          name="selected_ngos"
          rules={[{ required: true, message: "You must choose at least one NGO to float this RFP." }]}
        >
          <Select
            mode="multiple"
            placeholder="Select NGO users to float this RFP..."
            loading={loadingNgos}
            style={{ width: "100%" }}
            optionFilterProp="children"
          >
            {ngos.map((ngo) => (
              <Select.Option key={ngo.user_id} value={ngo.user_id}>
                {ngo.name} ({ngo.email})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* 2. Float Date Field */}
        <Form.Item
          label="Float Date"
          name="float_date"
          rules={[{ required: true, message: "Please select float date" }]}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            suffixIcon={<CalendarOutlined style={{ color: "#2563eb" }} />}
          />
        </Form.Item>

        {/* 3. Remarks Field */}
        <Form.Item
          label="Remarks / Floating Instructions"
          name="remarks"
        >
          <Input.TextArea
            rows={4}
            placeholder="Enter remarks, instructions, or scope notes for the selected NGOs..."
          />
        </Form.Item>

        <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 20 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={submitting}
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", border: "none", fontWeight: 700 }}
          >
            Float RFP Now
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
