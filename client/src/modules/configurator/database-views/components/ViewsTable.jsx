import React from "react";
import { Table, Tag, Button, Space, Popconfirm } from "antd";
import { CodeOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

export default function ViewsTable({ views, loading, onShowSql, onShowPreview, onEditView, onDeleteView }) {
  const columns = [
    {
      title: "View Display Name",
      dataIndex: "view_name",
      key: "view_name",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "14px" }}>{text}</div>
          <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>{record.database_view_name}</div>
        </div>
      )
    },
    {
      title: "View Type",
      dataIndex: "view_type",
      key: "view_type",
      render: (type) => (
        <Tag color={type === "MATERIALIZED" ? "purple" : "blue"} style={{ fontWeight: 600 }}>
          {type || "STANDARD"}
        </Tag>
      )
    },
    {
      title: "Base Table",
      dataIndex: "base_table",
      key: "base_table",
      render: (text) => <span style={{ fontFamily: "monospace", color: "#334155" }}>{text}</span>
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "PUBLISHED" ? "success" : "warning"} style={{ fontWeight: 600 }}>
          {status || "DRAFT"}
        </Tag>
      )
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<CodeOutlined />}
            onClick={() => onShowSql(record)}
          >
            SQL
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
            onClick={() => onShowPreview(record)}
          >
            Preview
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditView(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Database View"
            description="Are you sure you want to delete this database view?"
            onConfirm={() => onDeleteView(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Table
      dataSource={views}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  );
}
