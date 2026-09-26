// client/src/modules/masters/event-type/EventTypeMasterView.jsx
"use client";

import React, { useState } from "react";
import { Table, Button, Tag, Input, Modal, Form, Switch, Popconfirm, message, Card, Tooltip } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { EVENT_TYPES } from "@/modules/volunteering/constants/volunteeringConstants";
import { hasModulePermissions } from "@/context/PermissionContext";
import "@/modules/volunteering/volunteering.css";

export default function EventTypeMasterView() {
  // ── Dynamic Permissions ─────────────────────────────────────
  const eventTypePermissions = hasModulePermissions("event_type");
  const canList = eventTypePermissions.includes("list") || eventTypePermissions.includes("view");
  const canAdd = eventTypePermissions.includes("add");
  const canEdit = eventTypePermissions.includes("edit");
  const canDelete = eventTypePermissions.includes("delete");

  const [types, setTypes] = useState(
    EVENT_TYPES.map((t, index) => ({
      key: t.id,
      id: index + 1,
      type_code: t.id.toUpperCase(),
      type_name: t.name,
      color: t.color,
      status: true,
      description: `Volunteering activities focused on ${t.name.toLowerCase()}.`
    }))
  );

  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const handleOpenAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      type_name: record.type_name,
      type_code: record.type_code,
      color: record.color,
      description: record.description,
      status: record.status
    });
    setIsModalOpen(true);
  };

  const handleSave = (values) => {
    if (editingItem) {
      setTypes(types.map(t => t.key === editingItem.key ? { ...t, ...values } : t));
      message.success("Event type updated successfully!");
    } else {
      const newKey = values.type_name.toLowerCase().replace(/\s+/g, "_");
      const newItem = {
        key: newKey,
        id: types.length + 1,
        type_code: values.type_code || newKey.toUpperCase(),
        ...values,
        status: values.status !== undefined ? values.status : true
      };
      setTypes([...types, newItem]);
      message.success("New event type added successfully!");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (key) => {
    setTypes(types.filter(t => t.key !== key));
    message.success("Event type removed.");
  };

  const handleToggleStatus = (key) => {
    setTypes(types.map(t => t.key === key ? { ...t, status: !t.status } : t));
  };

  const filteredTypes = types.filter(t =>
    t.type_name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.type_code.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "#",
      width: 50,
      render: (_, __, i) => <span className="font-semibold text-slate-400">{i + 1}</span>
    },
    {
      title: "Event Type",
      dataIndex: "type_name",
      render: (name, r) => (
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full inline-block"
            style={{ backgroundColor: r.color || "#2563eb" }}
          />
          <span className="font-bold text-slate-800">{name}</span>
        </div>
      )
    },
    {
      title: "Type Code",
      dataIndex: "type_code",
      width: 160,
      render: (code) => <Tag color="blue" className="font-mono font-bold text-xs">{code}</Tag>
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (desc) => <span className="text-xs text-slate-600">{desc || "—"}</span>
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (st, r) => (
        <Switch
          checked={st}
          disabled={!canEdit}
          onChange={() => handleToggleStatus(r.key)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      )
    },
    {
      title: "Actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleOpenEdit(record)}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Delete this event type?"
              onConfirm={() => handleDelete(record.key)}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          )}
        </div>
      )
    }
  ];

  if (!canList) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", background: "#f8fafc", minHeight: "80vh" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", background: "#fff", padding: "40px 32px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>
            <AppstoreOutlined />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Access Restricted</h3>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            You do not have permission to view or manage Event Type Master. Please contact your CSR Administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="volunteering-container">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <AppstoreOutlined className="text-blue-600 text-xl" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-0">Event Type Master</h1>
            <p className="text-xs text-slate-500 mb-0">Manage volunteering category masters and event types</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search event type..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
          {canAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
              className="bg-blue-600"
            >
              Add Event Type
            </Button>
          )}
        </div>
      </div>

      <Table
        dataSource={filteredTypes}
        columns={columns}
        rowKey="key"
        pagination={{ pageSize: 15 }}
        className="bg-white rounded-xl shadow-sm border border-slate-200"
      />

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        title={editingItem ? "Edit Event Type" : "Add New Event Type"}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{ color: "#2563eb", status: true }}
          className="pt-2"
        >
          <Form.Item
            name="type_name"
            label="Event Type Name"
            rules={[{ required: true, message: "Please enter event type name" }]}
          >
            <Input placeholder="e.g. Tree plantation" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="type_code"
              label="Type Code"
            >
              <Input placeholder="e.g. TREE_PLANTATION" />
            </Form.Item>

            <Form.Item
              name="color"
              label="Color Code"
            >
              <Input placeholder="#16a34a" />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={2} placeholder="Description of activities under this type" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="bg-blue-600">
              Save Event Type
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
