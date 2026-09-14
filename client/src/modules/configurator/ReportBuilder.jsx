import React, { useState, useEffect } from "react";
import { Card, Table, Button, Modal, Form, Input, Select, Switch, Space, Typography, Tag, App } from "antd";
import { FileProtectOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CloudDownloadOutlined, PlayCircleOutlined, TableOutlined, SearchOutlined } from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import authUtils from "@/utils/authUtils";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ReportBuilder() {
  const { message } = App.useApp();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [editingReport, setEditingReport] = useState(null);
  const [form] = Form.useForm();

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await privateHttpClient.get("/reports");
      setReports(res.data?.data || []);
    } catch (err) {
      message.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleEdit = (report) => {
    setEditingReport(report);
    form.setFieldsValue({
      name: report.rdf_name,
      description: report.rdf_description,
      is_public: report.rdf_is_public,
      sql_query: report.rdf_query_config?.sql_query
    });
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingReport(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await privateHttpClient.delete(`/configurator/report-definitions/${id}`);
      message.success("Report definition deleted");
      loadReports();
    } catch (err) {
      message.error("Failed to delete report");
    }
  };

  const handleSave = async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        is_public: values.is_public === true,
        query_config: {
          sql_query: values.sql_query
        }
      };

      if (editingReport) {
        await privateHttpClient.put(`/configurator/report-definitions/${editingReport.rdf_id}`, payload);
        message.success("Report updated successfully");
      } else {
        await privateHttpClient.post("/configurator/report-definitions", payload);
        message.success("Report created successfully");
      }
      setModalOpen(false);
      loadReports();
    } catch (err) {
      message.error("Failed to save report");
    }
  };

  const handlePreview = async (report) => {
    try {
      const res = await privateHttpClient.get(`/reports/${report.rdf_id}`);
      setPreviewData(res.data?.data || []);
      setPreviewOpen(true);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to execute report query");
    }
  };

  const handleExport = (report) => {
    const token = authUtils.getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6003/api/v1";
    // Trigger download using standard endpoint link with token param or iframe
    window.open(`${apiUrl}/reports/${report.rdf_id}/export?token=${token}`, "_blank");
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, idx) => (
        <span className="conf-index-badge">
          {idx + 1}
        </span>
      )
    },
    {
      title: "Report Name",
      dataIndex: "rdf_name",
      key: "rdf_name",
      render: t => <strong style={{ color: "#0f172a", fontWeight: 700, fontSize: "13.5px" }}>{t}</strong>
    },
    {
      title: "Description",
      dataIndex: "rdf_description",
      key: "rdf_description",
      render: d => <span style={{ color: "#475569", fontWeight: 500 }}>{d || "—"}</span>
    },
    {
      title: "Availability",
      dataIndex: "rdf_is_public",
      key: "rdf_is_public",
      align: "center",
      render: pub => (
        <span className={pub ? "conf-badge-published" : "conf-badge-draft"}>
          {pub ? "PUBLIC" : "PRIVATE"}
        </span>
      )
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
            Run
          </Button>
          <Button
            size="small"
            icon={<CloudDownloadOutlined />}
            onClick={() => handleExport(record)}
            className="conf-action-outline-btn"
          >
            Excel
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
            onClick={() => handleDelete(record.rdf_id)}
            className="conf-action-delete-btn"
          />
        </div>
      )
    }
  ];

  const uniqueTables = new Set(reports.map(r => r.rdf_target_table).filter(Boolean)).size;

  return (
    <div className="conf-page-container">
      {/* Top Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <FileProtectOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Report Builder</h1>
            <p className="conf-page-subtitle">Define custom reports templates, run test queries, and compile data sheets</p>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          className="conf-create-btn"
        >
          Create Report
        </Button>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-box">
            <FileProtectOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Reports</span>
            <span className="conf-stat-val">{reports.length}</span>
            <span className="conf-stat-sub">Defined system reports</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-box">
            <TableOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Target Tables</span>
            <span className="conf-stat-val">{uniqueTables || reports.length}</span>
            <span className="conf-stat-sub">Source dataset tables</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-box">
            <CloudDownloadOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Export Formats</span>
            <span className="conf-stat-val">Excel / CSV</span>
            <span className="conf-stat-sub">Supported downloads</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-box">
            <PlayCircleOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Live Queries</span>
            <span className="conf-stat-val">{reports.length}</span>
            <span className="conf-stat-sub">Active report pipelines</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="conf-toolbar">
        <div className="conf-toolbar-left">
          <div className="conf-pill-tab active">
            <span>All Reports</span>
            <span className="conf-pill-count">{reports.length}</span>
          </div>
        </div>

        <div className="conf-toolbar-right">
          <Input
            placeholder="Search reports..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            className="conf-search-input"
            allowClear
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="conf-card-table">
        <Table
          dataSource={reports}
          columns={columns}
          rowKey="rdf_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: true }}
        />
      </div>

      {/* Editor Modal */}
      <Modal
        title={editingReport ? "Edit Report Template" : "New Report Template"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Report Title" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g. CSR Cumulative Spending Report" />
          </Form.Item>

          <Form.Item name="description" label="Report Description">
            <Input placeholder="Brief details about compiled metrics" />
          </Form.Item>

          <Form.Item name="is_public" label="Public Availability" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Public" unCheckedChildren="Private" />
          </Form.Item>

          <Form.Item
            name="sql_query"
            label="Template Query (SELECT only, no semicolons)"
            rules={[{ required: true, message: "Query template is required" }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="e.g. SELECT p.prp_name AS name, p.prp_budget AS budget, u.usr_name AS approved_by FROM t_proposals p LEFT JOIN t_users u ON u.usr_id = p.prp_updated_by"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Query Preview Modal */}
      <Modal
        title="Report Preview Data"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[<Button key="close" onClick={() => setPreviewOpen(false)}>Close</Button>]}
        width={800}
      >
        {previewData.length > 0 ? (
          <Table
            dataSource={previewData}
            columns={Object.keys(previewData[0]).map(k => ({ title: k, dataIndex: k, key: k }))}
            rowKey={(record) => record.id || record.key || JSON.stringify(record)}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        ) : (
          <div style={{ padding: "24px", textAlign: "center", color: "#999" }}>
            No rows returned.
          </div>
        )}
      </Modal>
    </div>
  );
}
