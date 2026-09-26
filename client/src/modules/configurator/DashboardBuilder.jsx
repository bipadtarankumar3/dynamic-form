import React, { useState, useEffect } from "react";
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Switch, Space, Typography, Tag, App } from "antd";
import { LayoutOutlined, PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, AppstoreAddOutlined, TableOutlined, SearchOutlined } from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";

const { Title, Text } = Typography;
const { Option } = Select;

export default function DashboardBuilder() {
  const { message } = App.useApp();
  const [widgets, setWidgets] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [editingWidget, setEditingWidget] = useState(null);
  const [form] = Form.useForm();

  const loadWidgets = async () => {
    try {
      setLoading(true);
      const res = await privateHttpClient.get("/dashboard-widgets?dashboard=main");
      setWidgets(res.data?.data || []);
    } catch (err) {
      message.error("Failed to load dashboard widgets");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await privateHttpClient.get("/configurator/rbac/roles");
      setRoles(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadWidgets();
    loadRoles();
  }, []);

  const handleEdit = (widget) => {
    setEditingWidget(widget);
    form.setFieldsValue({
      title: widget.dwg_title,
      type: widget.dwg_type,
      role_id: widget.dwg_role_id,
      order: widget.dwg_order,
      sql_query: widget.dwg_config?.sql_query,
      query_type: widget.dwg_config?.query_type || "sql"
    });
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingWidget(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await privateHttpClient.delete(`/configurator/dashboard-widgets/${id}`);
      message.success("Widget deleted");
      loadWidgets();
    } catch (err) {
      message.error("Failed to delete widget");
    }
  };

  const handleSave = async (values) => {
    try {
      const payload = {
        title: values.title,
        type: values.type,
        role_id: values.role_id,
        order: values.order,
        config: {
          query_type: values.query_type,
          sql_query: values.sql_query
        }
      };

      if (editingWidget) {
        await privateHttpClient.put(`/configurator/dashboard-widgets/${editingWidget.dwg_id}`, payload);
        message.success("Widget updated successfully");
      } else {
        await privateHttpClient.post("/configurator/dashboard-widgets", payload);
        message.success("Widget created successfully");
      }
      setModalOpen(false);
      loadWidgets();
    } catch (err) {
      message.error("Failed to save widget configuration");
    }
  };

  const handlePreview = async (widget) => {
    try {
      const res = await privateHttpClient.get(`/dashboard-widgets/${widget.dwg_id}`);
      setPreviewData(res.data?.data || []);
      setPreviewOpen(true);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to execute query");
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, idx) => (
        <span style={{ background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: 12, padding: "3px 8px", borderRadius: 6 }}>
          {idx + 1}
        </span>
      )
    },
    {
      title: "Order",
      dataIndex: "dwg_order",
      key: "dwg_order",
      width: "8%",
      align: "center",
      render: o => <code style={{ fontWeight: 600, color: "#64748b" }}>{o}</code>
    },
    {
      title: "Widget Title",
      dataIndex: "dwg_title",
      key: "dwg_title",
      render: t => <strong style={{ color: "#0f172a" }}>{t}</strong>
    },
    {
      title: "Visualization Type",
      dataIndex: "dwg_type",
      key: "dwg_type",
      render: t => {
        const typeColors = {
          kpi_card: "purple",
          bar_chart: "blue",
          pie_chart: "cyan",
          line_chart: "indigo",
          data_table: "orange"
        };
        const label = t ? t.replace("_", " ").toUpperCase() : "UNKNOWN";
        return <Tag color={typeColors[t] || "default"} style={{ borderRadius: "4px", fontWeight: 600 }}>{label}</Tag>;
      }
    },
    {
      title: "Role Visibility",
      dataIndex: "dwg_role_id",
      key: "dwg_role_id",
      render: roleId => {
        if (!roleId) return <Tag color="success" style={{ borderRadius: "4px", fontWeight: 600 }}>ALL ROLES</Tag>;
        const rObj = roles.find(r => r.rol_id === roleId);
        return <Tag color="warning" style={{ borderRadius: "4px", fontWeight: 600 }}>{(rObj ? rObj.rol_name : `Role ${roleId}`).toUpperCase()}</Tag>;
      }
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handlePreview(record)}
            className="conf-action-edit-btn"
          >
            Preview
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            className="conf-action-outline-btn"
          />
          <Button
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record.dwg_id)}
            style={{ borderRadius: 8 }}
          />
        </div>
      )
    }
  ];

  const kpiCount = widgets.filter(w => w.dwg_type === 'kpi_card').length;
  const chartCount = widgets.filter(w => w.dwg_type?.includes('chart')).length;
  const tableCount = widgets.filter(w => w.dwg_type === 'data_table').length;

  return (
    <div className="conf-page-container">
      {/* Top Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <AppstoreAddOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Dashboard Widget Wizard</h1>
            <p className="conf-page-subtitle">Create real-time KPI metrics and visualization charts for user dashboards</p>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          className="conf-create-btn"
        >
          Add Widget
        </Button>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-box">
            <AppstoreAddOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Widgets</span>
            <span className="conf-stat-val">{widgets.length}</span>
            <span className="conf-stat-sub">Defined dashboard elements</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-box">
            <LayoutOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">KPI Cards</span>
            <span className="conf-stat-val">{kpiCount}</span>
            <span className="conf-stat-sub">Summary metric cards</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-box">
            <PlayCircleOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Charts & Graphs</span>
            <span className="conf-stat-val">{chartCount}</span>
            <span className="conf-stat-sub">Visual data charts</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-box">
            <TableOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Data Tables</span>
            <span className="conf-stat-val">{tableCount}</span>
            <span className="conf-stat-sub">Tabular data lists</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="conf-toolbar">
        <div className="conf-toolbar-left">
          <div className="conf-pill-tab active">
            <span>All Widgets</span>
            <span className="conf-pill-count">{widgets.length}</span>
          </div>
        </div>

        <div className="conf-toolbar-right">
          <Input
            placeholder="Search widgets..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            className="conf-search-input"
            allowClear
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="conf-card-table">
        <Table
          dataSource={widgets}
          columns={columns}
          rowKey="dwg_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: true }}
        />
      </div>

      {/* Widget Editor Modal */}
      <Modal
        title={editingWidget ? "Edit Dashboard Widget" : "New Dashboard Widget"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={650}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label="Widget Display Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="e.g. Total Active Projects" />
          </Form.Item>

          <div style={{ display: "flex", gap: "16px" }}>
            <Form.Item name="type" label="Widget Visual Type" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select placeholder="Select widget type">
                <Option value="kpi_card">KPI Summary Card</Option>
                <Option value="bar_chart">Bar Chart</Option>
                <Option value="pie_chart">Pie Chart</Option>
                <Option value="line_chart">Line Chart</Option>
                <Option value="data_table">Data Table List</Option>
              </Select>
            </Form.Item>

            <Form.Item name="role_id" label="Role Limitation" style={{ flex: 1 }}>
              <Select placeholder="All Roles" allowClear>
                {roles.map(r => (
                  <Option key={r.rol_id} value={r.rol_id}>{r.rol_name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="order" label="Order Index" style={{ width: 120 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item name="query_type" label="Query Config Type" initialValue="sql">
            <Select>
              <Option value="sql">Custom SQL Select</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="sql_query"
            label="PostgreSQL Query (Must start with SELECT, no semicolons)"
            rules={[{ required: true, message: "SQL Query is required" }]}
          >
            <Input.TextArea
              rows={5}
              placeholder="e.g. SELECT count(*) as value, 'Completed' as label FROM t_projects WHERE prj_status = 'COMPLETED'"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Query Preview Modal */}
      <Modal
        title="Query Run Preview"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[<Button key="close" onClick={() => setPreviewOpen(false)}>Close</Button>]}
        width={750}
      >
        {previewData.length > 0 ? (
          <Table
            dataSource={previewData}
            columns={Object.keys(previewData[0]).map(k => ({ title: k, dataIndex: k, key: k }))}
            rowKey={(record) => record.id || record.key || JSON.stringify(record)}
            pagination={{ pageSize: 5 }}
            size="small"
          />
        ) : (
          <div style={{ padding: "24px", textAlign: "center", color: "#999" }}>
            Query returned 0 rows.
          </div>
        )}
      </Modal>
    </div>
  );
}
