import React, { useState, useEffect } from "react";
import { Card, Table, Button, Modal, Form, Input, Select, Space, Typography, Tag, App, Divider } from "antd";
import { DatabaseOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";

const { Title, Text } = Typography;
const { Option } = Select;

export default function MasterBuilder() {
  const { message } = App.useApp();
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [columns, setColumns] = useState([]);
  const [form] = Form.useForm();

  const loadMasters = async () => {
    try {
      setLoading(true);
      const res = await privateHttpClient.get("/configurator/master-schemas");
      setMasters(res.data?.data || []);
    } catch (err) {
      message.error("Failed to load master schemas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  const handleCreate = () => {
    setEditingMaster(null);
    form.resetFields();
    setColumns([{ name: "", type: "text" }]);
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      const filteredCols = columns.filter(c => c.name.trim() !== "");
      if (filteredCols.length === 0) {
        message.error("At least one column definition is required");
        return;
      }

      const payload = {
        name: values.name,
        slug: values.slug.toLowerCase().replace(/[^a-z0-9_]/g, ""),
        fields: filteredCols.map(c => ({
          column_name: c.name.toLowerCase().replace(/[^a-z0-9_]/g, ""),
          type: c.type,
          label: c.name
        })),
        label_field: filteredCols[0]?.name.toLowerCase().replace(/[^a-z0-9_]/g, "") || null
      };

      if (editingMaster) {
        await privateHttpClient.put(`/configurator/master-schemas/${editingMaster.msc_id}`, payload);
        message.success("Master schema updated successfully");
      } else {
        await privateHttpClient.post("/configurator/master-schemas", payload);
        message.success("Master schema table created dynamically");
      }
      setModalOpen(false);
      loadMasters();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save master schema");
    }
  };

  const handleAddCol = () => {
    setColumns(prev => [...prev, { name: "", type: "VARCHAR" }]);
  };

  const handleColChange = (index, field, value) => {
    setColumns(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const handleRemoveCol = (index) => {
    setColumns(prev => prev.filter((_, i) => i !== index));
  };

  const tableColumns = [
    { title: "Master Name", dataIndex: "msc_name", key: "msc_name", render: t => <strong>{t}</strong> },
    { title: "Table Identifier (Slug)", dataIndex: "msc_slug", key: "msc_slug", render: s => <code>{s}</code> },
    {
      title: "Columns Defs",
      dataIndex: "msc_fields",
      key: "msc_fields",
      render: fields => {
        const parsed = typeof fields === "string" ? JSON.parse(fields) : fields;
        return (parsed || []).map(c => (
          <Tag key={c.column_name} color="blue" style={{ marginBottom: "4px" }}>
            {c.column_name} ({c.type})
          </Tag>
        ));
      }
    },
    {
      title: "Actions",
      key: "actions",
      width: "15%",
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<DeleteOutlined />} danger onClick={async () => {
            try {
              await privateHttpClient.delete(`/configurator/master-schemas/${record.msc_id}`);
              message.success("Master table dropped and schema deleted");
              loadMasters();
            } catch (err) {
              message.error("Failed to delete master schema");
            }
          }} />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Card variant="borderless" className="glassmorphism-card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space align="center" size="middle">
            <DatabaseOutlined style={{ fontSize: "28px", color: "#1a73e8" }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>Master Builder & Schema Sync</Title>
              <Text type="secondary">Define tables, column types, and sync database schemas dynamically at runtime</Text>
            </div>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Build Master Table
          </Button>
        </div>
      </Card>

      <Card variant="borderless" className="glassmorphism-card">
        <Table
          dataSource={masters}
          columns={tableColumns}
          rowKey="msc_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      {/* Editor Modal */}
      <Modal
        title="Create Custom Master Table"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <div style={{ display: "flex", gap: "16px" }}>
            <Form.Item name="name" label="Master Display Name" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Input placeholder="e.g. Project Sectors" />
            </Form.Item>
            <Form.Item name="slug" label="Table Identifier Slug (no prefix needed)" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Input placeholder="e.g. sectors" disabled={!!editingMaster} />
            </Form.Item>
          </div>

          <Divider style={{ margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <Text strong>Column Definitions (Audit columns and prefix will be added automatically):</Text>
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddCol}>
              Add Column
            </Button>
          </div>

          {columns.map((c, idx) => (
            <div key={idx} style={{ display: "flex", gap: "12px", marginBottom: "8px", alignItems: "center" }}>
              <Input
                style={{ flex: 2 }}
                placeholder="Column Name (e.g. sector_name)"
                value={c.name}
                onChange={e => handleColChange(idx, "name", e.target.value)}
              />
              <Select
                style={{ flex: 1 }}
                value={c.type}
                onChange={val => handleColChange(idx, "type", val)}
              >
                <Option value="text">VARCHAR (Text)</Option>
                <Option value="number">INTEGER (Number)</Option>
                <Option value="checkbox">BOOLEAN (Yes/No)</Option>
                <Option value="textarea">TEXT (Long Text)</Option>
                <Option value="datetime">TIMESTAMPTZ (Date/Time)</Option>
              </Select>
              <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveCol(idx)} disabled={columns.length === 1} />
            </div>
          ))}
        </Form>
      </Modal>
    </div>
  );
}
