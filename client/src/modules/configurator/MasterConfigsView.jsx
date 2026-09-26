import React, { useEffect, useState, useCallback } from "react";
import {
  PlusCircleOutlined,
  SettingOutlined,
  DatabaseOutlined,
  KeyOutlined,
  TagOutlined,
  SearchOutlined,
  SlidersOutlined,
  EditOutlined,
  SaveOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import {
  Button,
  Table,
  Spin,
  App,
  Modal,
  Input,
  Select,
  Form,
  Tag,
  Tooltip,
} from "antd";
import { privateHttpClient } from "@/services/api/httpClient";
import "@/assets/css/configurator/MasterConfigsView.css";
import Image from "next/image";
import DatabaseTables from '@/assets/images/dashboard/DatabaseTables.png';
import dynamicforms from '@/assets/images/dashboard/dynamicforms.png';

export default function MasterConfigsView() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const [records, setRecords] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  // Database inspection states
  const [dbTables, setDbTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableColumns, setSelectedTableColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Fetch Master Configs List with Server-Side Pagination and Search
  const fetchConfigs = useCallback(
    async (currentPage = page, currentLimit = pageSize, search = searchQuery) => {
      try {
        setLoadingTable(true);
        const res = await privateHttpClient.get("configurator/master-configs", {
          params: {
            page: currentPage,
            limit: currentLimit,
            search: search?.trim() || undefined,
          },
        });
        setRecords(res?.data?.data || []);
        setTotalRecords(res?.data?.total || 0);
      } catch {
        message.error("Failed to load master configurations");
      } finally {
        setLoadingTable(false);
      }
    },
    [message]
  );

  // Fetch Database Tables
  const fetchDbTables = async () => {
    try {
      setLoadingTables(true);
      const res = await privateHttpClient.get("configurator/master-configs/tables");
      setDbTables(res?.data?.data || []);
    } catch {
      message.error("Failed to load database tables");
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    fetchConfigs(page, pageSize, searchQuery);
  }, [page, pageSize, searchQuery, fetchConfigs]);

  useEffect(() => {
    if (openModal) {
      if (editingRecord) {
        form.setFieldsValue({
          slug: editingRecord.slug,
          table_name: editingRecord.table_name,
          primary_key: editingRecord.primary_key,
          label_key: editingRecord.label_key,
          is_active_key: editingRecord.is_active_key,
          foreign_key: editingRecord.foreign_key,
        });
        if (editingRecord.table_name) {
          handleInspectTable(editingRecord.table_name, false);
        }
      } else {
        form.resetFields();
        setSelectedTableColumns([]);
      }
    }
  }, [openModal, editingRecord]);

  // Open Modal for Create or Edit
  const handleOpenModal = (record = null) => {
    setEditingRecord(record);
    setOpenModal(true);
    fetchDbTables();
  };

  // Handle Table Selection -> Fetch Columns & Auto Populate Fields
  const handleInspectTable = async (tableName, autoPopulate = true) => {
    if (!tableName) return;
    try {
      setLoadingColumns(true);
      const res = await privateHttpClient.get(
        `configurator/master-configs/tables/${tableName}/columns`
      );
      const columns = res?.data?.columns || [];
      const autoPop = res?.data?.autoPopulated || {};

      setSelectedTableColumns(columns);

      if (autoPopulate && autoPop) {
        form.setFieldsValue({
          slug: autoPop.slug || form.getFieldValue("slug") || "",
          primary_key: autoPop.primary_key || "id",
          label_key: autoPop.label_key || "name",
          is_active_key: autoPop.is_active_key || null,
          foreign_key: autoPop.foreign_key || null,
        });
        message.info(
          `Auto-populated fields for table "${tableName}". You can edit or rename any values below.`
        );
      }
    } catch {
      message.error(`Failed to inspect columns for table ${tableName}`);
    } finally {
      setLoadingColumns(false);
    }
  };

  // Save (Create / Update)
  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      if (editingRecord) {
        await privateHttpClient.put(
          `configurator/master-configs/${editingRecord.id || editingRecord.slug}`,
          values
        );
        message.success("Master configuration updated successfully!");
      } else {
        await privateHttpClient.post("configurator/master-configs", values);
        message.success("Master configuration created successfully!");
      }
      setOpenModal(false);
      fetchConfigs(page, pageSize, searchQuery);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save master configuration");
    } finally {
      setSaving(false);
    }
  };

  // Antd Table Pagination Handler (Server Side)
  const handleTableChange = (paginationInfo) => {
    setPage(paginationInfo.current);
    setPageSize(paginationInfo.pageSize);
  };

  // Search Input Handler
  const handleSearch = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  // Table Columns Definition
  const columns = [
    {
      title: "#",
      key: "index",
      width: 70,
      align: "center",
      sorter: (a, b) => (a.id || 0) - (b.id || 0),
      render: (_, __, idx) => (
        <span className="conf-index-badge">
          {(page - 1) * pageSize + idx + 1}
        </span>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      sorter: (a, b) => (a.slug || "").localeCompare(b.slug || ""),
      render: (text) => <span className="conf-slug-code">{text}</span>,
    },
    {
      title: "Table Name",
      dataIndex: "table_name",
      key: "table_name",
      sorter: (a, b) => (a.table_name || "").localeCompare(b.table_name || ""),
      render: (text) => (
        <span className="mcv-table-badge">
          <DatabaseOutlined style={{ fontSize: 11 }} />
          {text}
        </span>
      ),
    },
    {
      title: "Primary Key",
      dataIndex: "primary_key",
      key: "primary_key",
      sorter: (a, b) => (a.primary_key || "").localeCompare(b.primary_key || ""),
      render: (text) => (
        <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
          <KeyOutlined style={{ marginRight: 4 }} />
          {text || "id"}
        </Tag>
      ),
    },
    {
      title: "Label Key",
      dataIndex: "label_key",
      key: "label_key",
      sorter: (a, b) => (a.label_key || "").localeCompare(b.label_key || ""),
      render: (text) => (
        <Tag color="green" style={{ borderRadius: 6, fontWeight: 600 }}>
          <TagOutlined style={{ marginRight: 4 }} />
          {text}
        </Tag>
      ),
    },
    {
      title: "Active Key",
      dataIndex: "is_active_key",
      key: "is_active_key",
      sorter: (a, b) => (a.is_active_key || "").localeCompare(b.is_active_key || ""),
      render: (text) =>
        text ? (
          <Tag color="purple" style={{ borderRadius: 6, fontWeight: 500 }}>
            {text}
          </Tag>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
        ),
    },
    {
      title: "Foreign Key",
      dataIndex: "foreign_key",
      key: "foreign_key",
      sorter: (a, b) => (a.foreign_key || "").localeCompare(b.foreign_key || ""),
      render: (text) =>
        text ? (
          <Tag color="orange" style={{ borderRadius: 6, fontWeight: 500 }}>
            {text}
          </Tag>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
        ),
    },
    {
      title: "Actions",
      key: "action",
      align: "center",
      width: 90,
      render: (_, row) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Tooltip title="Edit" color="#7c3aed">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(row)}
              className="mcv-action-edit-btn"
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  const uniqueTables = new Set(records.map(r => r.table_name).filter(Boolean)).size;
  const fkCount = records.filter(r => r.foreign_key).length;
  const activeCount = records.filter(r => r.is_active_key).length;

  return (
    <>
      <div className="conf-page-container">
        {/* Top Header */}
        <div className="conf-page-header">
          <div className="conf-page-header-left">
            <div className="conf-page-header-icon">
              <SlidersOutlined />
            </div>
            <div>
              <h1 className="conf-page-title">Master Configurations</h1>
              <p className="conf-page-subtitle">Configure dynamic database lookup tables, primary keys, label fields, and foreign keys</p>
            </div>
          </div>

          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={() => handleOpenModal(null)}
            className="conf-create-btn"
          >
            New Master Config
          </Button>
        </div>

        {/* 4 KPI Stat Cards */}
        <div className="conf-stats-grid">
          <div className="conf-stat-card conf-stat-card--blue">
            <div className="conf-stat-icon-boxs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" id="Database-Setting--Streamline-Core"  ><desc>{"\n    Database Setting Streamline Icon: https://streamlinehq.com\n  "}</desc><g id="database-setting--raid-storage-code-disk-programming-database-array-hard-disc-setting"><path id="Subtract" fill="#8fbffa" fillRule="evenodd" d="M0 9.882V2l11.5 0v3.122a1.907 1.907 0 0 0 -2.936 1.575A1.907 1.907 0 0 0 6.658 10a1.907 1.907 0 0 0 -0.788 2.356l-0.12 0C2.574 12.357 0 11.248 0 9.883Z" clipRule="evenodd" strokeWidth={1} /><path id="Subtract_2" fill="#2859c5" fillRule="evenodd" d="M6.214 7.093a14.23 14.23 0 0 1 -0.464 0.007c-1.72 0 -3.25 -0.27 -4.326 -0.684 -0.54 -0.207 -0.934 -0.44 -1.183 -0.665A1.128 1.128 0 0 1 0 5.459v1.656c0.292 0.176 0.622 0.332 0.975 0.468 1.248 0.48 2.929 0.765 4.754 0.767a1.898 1.898 0 0 1 0.485 -1.257Z" clipRule="evenodd" strokeWidth={1} /><path id="Union" fill="#2859c5" fillRule="evenodd" d="M10.463 6.063a0.75 0.75 0 0 1 0.75 0.75v0.74c0.386 0.116 0.734 0.32 1.021 0.589l0.641 -0.37a0.75 0.75 0 1 1 0.75 1.3l-0.64 0.369a2.596 2.596 0 0 1 0 1.181l0.64 0.369a0.75 0.75 0 0 1 -0.75 1.3l-0.64 -0.37a2.587 2.587 0 0 1 -1.022 0.59v0.739a0.75 0.75 0 0 1 -1.5 0v-0.74a2.585 2.585 0 0 1 -1.02 -0.59l-0.641 0.37a0.75 0.75 0 0 1 -0.75 -1.299l0.64 -0.37a2.597 2.597 0 0 1 0 -1.18l-0.64 -0.37a0.75 0.75 0 0 1 0.75 -1.299l0.64 0.37a2.587 2.587 0 0 1 1.021 -0.59v-0.74a0.75 0.75 0 0 1 0.75 -0.75ZM9.501 9.52a0.758 0.758 0 0 0 0.04 -0.069 1.088 1.088 0 1 1 0.926 1.668l-0.004 0 -0.003 0A1.089 1.089 0 0 1 9.5 9.52Z" clipRule="evenodd" strokeWidth={1} /><path id="Vector" fill="#2859c5" d="M5.75 4c3.176 0 5.75 -0.895 5.75 -2S8.926 0 5.75 0 0 0.895 0 2s2.574 2 5.75 2Z" strokeWidth={1} /></g></svg>
             {/* <Image src={Configurations} alt="CSR Dashboard UI" width={200} height={200} /> */}
            </div>
            <div className="conf-stat-content">
              <span className="conf-stat-label">Total Configurations</span>
              <span className="conf-stat-val">{totalRecords}</span>
              <span className="conf-stat-sub">Defined schema lookups</span>
            </div>
          </div>

          <div className="conf-stat-card conf-stat-card--green">
            <div className="conf-stat-icon-boxs">
                <Image src={DatabaseTables} alt="CSR Dashboard UI" width={200} height={200} />
            </div>
            <div className="conf-stat-content">
              <span className="conf-stat-label">Database Tables</span>
              <span className="conf-stat-val">{uniqueTables || totalRecords}</span>
              <span className="conf-stat-sub">Linked source tables</span>
            </div>
          </div>

          <div className="conf-stat-card conf-stat-card--orange">
            <div className="conf-stat-icon-boxs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                id="Login-Key--Streamline-Ultimate"
                width={200}
                height={200}
                style={{ display: 'block', objectFit: 'contain', filter: 'drop-shadow(10px 20px 40px #000000c9)' }}
              >
                <desc>Login Key Streamline Icon: https://streamlinehq.com</desc>
                <path d="m20.5 0.5 -9.782 9.784a7 7 0 1 0 3 3L17 10h1.5V8.5L19 8h1.5V6.5L21 6h1.5V4.5l1 -1v-3ZM5.5 20A1.5 1.5 0 1 1 7 18.5 1.5 1.5 0 0 1 5.5 20" fill="#9feaff" strokeWidth="1" />
                <path d="m2.551 21.449 1.888 -1.888a1.5 1.5 0 0 1 2.121 -2.122L23.5 0.5h-3l-9.782 9.784A7 7 0 0 0 2.55 21.449Z" fill="#dff9ff" strokeWidth="1" />
                <path d="m20.5 0.5 -9.782 9.784a7 7 0 1 0 3 3L17 10h1.5V8.5L19 8h1.5V6.5L21 6h1.5V4.5l1 -1v-3ZM5.5 20A1.5 1.5 0 1 1 7 18.5 1.5 1.5 0 0 1 5.5 20" fill="none" stroke="#00303e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
              </svg>
            </div>
            <div className="conf-stat-content">
              <span className="conf-stat-label">Foreign Keys</span>
              <span className="conf-stat-val">{fkCount}</span>
              <span className="conf-stat-sub">Relational foreign mappings</span>
            </div>
          </div>

          <div className="conf-stat-card conf-stat-card--purple">
            <div className="conf-stat-icon-boxs">
               <Image src={dynamicforms} alt="CSR Dashboard UI" width={200} height={200} />
            </div>
            <div className="conf-stat-content">
              <span className="conf-stat-label">Active Lookups</span>
              <span className="conf-stat-val">{activeCount || totalRecords}</span>
              <span className="conf-stat-sub">Available in dynamic forms</span>
            </div>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="conf-toolbar">
          <div className="conf-toolbar-left">
            <div className="conf-pill-tab active">
              <span>All Configurations</span>
              <span className="conf-pill-count">{totalRecords}</span>
            </div>
          </div>

          <div className="conf-toolbar-right">
            <Input
              placeholder="Search by slug, table name, label, or keys..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="conf-search-input"
              allowClear
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="conf-card-table">
          <Table
            rowKey={(record) => record.id || record.slug}
            columns={columns}
            dataSource={records}
            loading={loadingTable}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: totalRecords,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            }}
            onChange={handleTableChange}
            scroll={{ x: true }}
          />
        </div>
      </div>

      {/* MODAL: CREATE / EDIT MASTER CONFIG */}
      <Modal
        open={openModal}
        onCancel={() => setOpenModal(false)}
        className="mcv-config-modal"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#ffffff",
                color: "var(--primary-color, #15803d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                flexShrink: 0,
              }}
            >
              <SettingOutlined />
            </div>
            <div className="w-full">
              <h4 className="mb-0" style={{ fontWeight: 800, fontSize: 17, color: "#ffffff", margin: 0, lineHeight: 1.3 }}>
                {editingRecord ? "Edit Master Config" : "New Master Config"}
              </h4>
              <p className="mb-0" style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.92)", margin: "2px 0 0 0" }}>
                Configure database table lookup schema and key field relationships
              </p>
            </div>
          </div>
        }
        footer={null}
        width={840}
        centered
        destroyOnHidden
        closeIcon={<span style={{ color: '#ffffff', fontSize: 16 }}>✕</span>}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={handleSubmit}
          style={{ marginTop: 12 }}
        >
          {/* STEP 1: CHOOSE DATABASE TABLE */}
          <Form.Item
            name="table_name"
            label={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <span style={{ fontWeight: 600 }}>Database Table *</span>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }} className="italic">
                  Select a database table to auto-detect its columns
                </span>
              </div>
            }
            rules={[{ required: true, message: "Please select a database table" }]}
            style={{ marginBottom: 16 }}
          >
            <Select
              showSearch
              size="large"
              placeholder="Search or select database table..."
              loading={loadingTables}
              onChange={(val) => handleInspectTable(val, true)}
              options={dbTables.map((t) => ({
                label: (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                    <DatabaseOutlined style={{ color: "#2563eb", fontSize: 13 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{t}</span>
                  </div>
                ),
                value: t,
              }))}
              filterOption={(input, option) =>
                (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: "100%", borderRadius: 8 }}
            />
          </Form.Item>

          {/* COLUMNS PREVIEW NOTIFICATION */}
          {loadingColumns ? (
            <div style={{ textAlign: "center", padding: "14px 0", color: "var(--primary-color, #15803d)", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", marginBottom: 16 }}>
              <Spin size="small" style={{ marginRight: 8 }} /> Inspecting table columns & schema...
            </div>
          ) : selectedTableColumns.length > 0 ? (
            <div style={{ marginBottom: 18, background: "#f8fafc", padding: "12px 16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircleFilled style={{ color: "#16a34a" }} />
                  Detected Table Columns ({selectedTableColumns.length})
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedTableColumns.map((col) => (
                  <Tag key={col.column_name} color="blue" style={{ fontSize: 11.5, borderRadius: 6, padding: "2px 8px", margin: 0, border: "1px solid #bfdbfe" }}>
                    <strong>{col.column_name}</strong> <span style={{ opacity: 0.7, fontSize: 10.5 }}>({col.data_type})</span>
                  </Tag>
                ))}
              </div>
            </div>
          ) : null}

          {/* STEP 2: EDIT & RENAME FIELD VALUES */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {/* SLUG */}
            <Form.Item
              name="slug"
              label={<span style={{ fontWeight: 600 }}>Master Slug *</span>}
              extra={<span style={{ color: "#64748b", fontSize: 11.5 }}>Identifier used in APIs/Forms (e.g. states, cities)</span>}
              rules={[{ required: true, message: "Slug is required" }]}
              style={{ marginBottom: 16 }}
            >
              <Input size="large" placeholder="e.g. states" style={{ borderRadius: 8 }} />
            </Form.Item>

            {/* PRIMARY KEY */}
            <Form.Item
              name="primary_key"
              label={<span style={{ fontWeight: 600 }}>Primary Key Column *</span>}
              extra={<span style={{ color: "#64748b", fontSize: 11.5 }}>ID column of table (e.g. id, state_id)</span>}
              rules={[{ required: true, message: "Primary key is required" }]}
              style={{ marginBottom: 16 }}
            >
              <Select
                showSearch
                size="large"
                placeholder="e.g. id"
                style={{ width: "100%", borderRadius: 8 }}
                options={
                  selectedTableColumns.length > 0
                    ? selectedTableColumns.map((c) => ({ label: c.column_name, value: c.column_name }))
                    : [{ label: "id", value: "id" }]
                }
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            {/* LABEL KEY */}
            <Form.Item
              name="label_key"
              label={<span style={{ fontWeight: 600 }}>Label Key Column *</span>}
              extra={<span style={{ color: "#64748b", fontSize: 11.5 }}>Column displayed in dropdowns (e.g. name, state_name)</span>}
              rules={[{ required: true, message: "Label key is required" }]}
              style={{ marginBottom: 16 }}
            >
              <Select
                showSearch
                size="large"
                placeholder="e.g. name"
                style={{ width: "100%", borderRadius: 8 }}
                options={
                  selectedTableColumns.length > 0
                    ? selectedTableColumns.map((c) => ({ label: c.column_name, value: c.column_name }))
                    : [{ label: "name", value: "name" }]
                }
              />
            </Form.Item>

            {/* IS ACTIVE KEY */}
            <Form.Item
              name="is_active_key"
              label={<span style={{ fontWeight: 600 }}>Is Active Key Column</span>}
              extra={<span style={{ color: "#64748b", fontSize: 11.5 }}>Column used for active filtering (e.g. is_active, status)</span>}
              style={{ marginBottom: 16 }}
            >
              <Select
                showSearch
                size="large"
                allowClear
                placeholder="Select column (optional)"
                style={{ width: "100%", borderRadius: 8 }}
                options={selectedTableColumns.map((c) => ({ label: c.column_name, value: c.column_name }))}
              />
            </Form.Item>
          </div>

          {/* FOREIGN KEY */}
          <Form.Item
            name="foreign_key"
            label={<span style={{ fontWeight: 600 }}>Foreign Key Column</span>}
            extra={<span style={{ color: "#64748b", fontSize: 11.5 }}>Parent ID column for dependent dropdowns (e.g. country_id for state)</span>}
            style={{ marginBottom: 20 }}
          >
            <Select
              showSearch
              size="large"
              allowClear
              placeholder="Select parent foreign key (optional)"
              style={{ width: "100%", borderRadius: 8 }}
              options={selectedTableColumns.map((c) => ({ label: c.column_name, value: c.column_name }))}
            />
          </Form.Item>

          {/* FOOTER BUTTONS */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <Button onClick={() => setOpenModal(false)} size="middle" style={{ borderRadius: 8, height: 38, padding: "0 20px", fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              size="middle"
              icon={editingRecord ? <EditOutlined /> : <SaveOutlined />}
              className="conf-create-btn"
              style={{
                borderRadius: 8,
                fontWeight: 700,
                height: 38,
                padding: "0 22px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {editingRecord ? "Update Master Config" : "Save Master Config"}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

