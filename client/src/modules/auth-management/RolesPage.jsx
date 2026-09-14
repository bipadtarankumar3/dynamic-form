"use client";
// client/src/modules/auth-management/RolesPage.jsx
// Enterprise Role Management Dashboard

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Form, Input, Modal, Popconfirm,
  Space, Spin, Switch, Table, Tag, Tooltip, message
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import "./permissions-page.css";

const BASE = "/auth";

const RolesPage = () => {
  const [messageApi, ctx] = message.useMessage();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleTypeFilter, setSelectedRoleTypeFilter] = useState("all");

  const [form] = Form.useForm();

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await privateHttpClient.get(`${BASE}/roles`);
      setRoles(res?.data?.data || []);
    } catch {
      messageApi.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const openAdd = () => {
    setEditingRole(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingRole(r);
    form.setFieldsValue({
      name: r.name,
      description: r.description,
      is_configurator: r.is_configurator,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editingRole) {
        await privateHttpClient.put(`${BASE}/roles/${editingRole.id}`, vals);
        messageApi.success("Role updated successfully");
      } else {
        await privateHttpClient.post(`${BASE}/roles`, vals);
        messageApi.success("Role created successfully");
      }
      setModalOpen(false);
      loadRoles();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      if (msg) messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await privateHttpClient.delete(`${BASE}/roles/${id}`);
      messageApi.success("Role deleted successfully");
      loadRoles();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Delete failed");
    }
  };

  // ── Stats Calculations ──
  const totalRoles = roles.length;
  const configRoles = roles.filter((r) => r.is_configurator).length;
  const standardRoles = totalRoles - configRoles;

  // ── Filtered Roles ──
  const filteredRoles = useMemo(() => {
    return (roles || []).filter((r) => {
      const matchesSearch =
        !searchQuery ||
        (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.slug && r.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesType = true;
      if (selectedRoleTypeFilter === "config") matchesType = !!r.is_configurator;
      if (selectedRoleTypeFilter === "standard") matchesType = !r.is_configurator;

      return matchesSearch && matchesType;
    });
  }, [roles, searchQuery, selectedRoleTypeFilter]);

  // ── Table Columns (Same modern enterprise design) ──
  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      align: "center",
      sorter: (a, b) => ((a.id || 0) > (b.id || 0) ? 1 : -1),
      render: (_, __, idx) => <span className="conf-index-badge">{idx + 1}</span>,
    },
    {
      title: "System Role",
      dataIndex: "name",
      key: "name",
      width: 280,
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
      render: (v, r) => (
        <div className="ap-wf-identity">
          <div
            className={`ap-wf-avatar ${
              r.is_configurator ? "ap-wf-avatar--config" : "ap-wf-avatar--active"
            }`}
          >
            {r.is_configurator ? <KeyOutlined /> : <SafetyCertificateOutlined />}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>{v}</div>
            {r.is_configurator ? (
              <Tag color="purple" style={{ fontSize: "10px", borderRadius: 4, marginTop: 2, fontWeight: 700 }}>
                Configurator (Full Access)
              </Tag>
            ) : (
              <span style={{ fontSize: "11px", color: "#64748b" }}>Standard Enterprise Role</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Role Identifier",
      dataIndex: "slug",
      key: "slug",
      width: 220,
      sorter: (a, b) => (a.slug || "").localeCompare(b.slug || ""),
      render: (v) => (
        <span
          className="conf-slug-code"
          style={{
            color: "#2563eb",
            background: "#eff6ff",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: "12px",
            fontWeight: 600,
            display: "inline-block",
            border: "1px solid #dbeafe",
          }}
        >
          {v}
        </span>
      ),
    },
    {
      title: "Role Type & Scope",
      dataIndex: "is_configurator",
      key: "is_configurator",
      width: 200,
      sorter: (a, b) => (a.is_configurator ? 1 : 0) - (b.is_configurator ? 1 : 0),
      render: (isConf) =>
        isConf ? (
          <span
            className="conf-badge-master-yes"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#faf5ff",
              color: "#9333ea",
              border: "1px solid #d8b4fe",
            }}
          >
            <KeyOutlined style={{ fontSize: 12 }} />
            CONFIGURATOR
          </span>
        ) : (
          <span
            className="conf-badge-master-yes"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <SafetyCertificateOutlined style={{ fontSize: 12 }} />
            STANDARD ROLE
          </span>
        ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (v) =>
        v ? (
          <span style={{ color: "#475569", fontSize: "13px" }}>{v}</span>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>—</span>
        ),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      align: "center",
      sorter: (a, b) =>
        new Date(a.created_at || 0) - new Date(b.created_at || 0),
      render: (v) => (
        <span style={{ color: "#64748b", fontSize: "13px" }}>
          {v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      onHeaderCell: () => ({
        className: "ap-actions-header-cell",
      }),
      render: (_, r) => (
        <div className="db-views-action-btns">
          <Tooltip title="Edit Role" color="#7c3aed">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
              className="conf-action-outline-btn conf-action-edit-view-btn"
            />
          </Tooltip>

          <Popconfirm
            title="Delete Role"
            description="Are you sure you want to delete this role?"
            onConfirm={() => handleDelete(r.id)}
            okText="Delete"
            okButtonProps={{ danger: true, style: { borderRadius: 6 } }}
            cancelButtonProps={{ style: { borderRadius: 6 } }}
          >
            <Tooltip title="Delete Role" color="#dc2626">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                className="conf-action-delete-btn"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(239, 68, 68, 0.6)",
                  color: "#dc2626",
                }}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="perm-page-container">
      {ctx}

      {/* ── 1. PAGE HEADER ── */}
      <div className="perm-page-header">
        <div className="perm-page-header-left">
          <div className="perm-page-header-icon">
            <TeamOutlined />
          </div>
          <div>
            <h1 className="perm-page-title">Roles Management</h1>
            <p className="perm-page-subtitle">
              Define and manage system user roles, configurator privileges, and access levels.
            </p>
          </div>
        </div>

        <div className="perm-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={loadRoles}
            loading={loading}
            className="perm-btn-refresh"
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAdd}
            className="perm-btn-create"
          >
            Add Role
          </Button>
        </div>
      </div>

      {/* ── 2. KPI STATS CARDS ── */}
      <div className="perm-stats-grid">
        <div className="perm-stat-card perm-stat-card--blue">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Total System Roles</span>
            <span className="perm-stat-val">{totalRoles}</span>
            <span className="perm-stat-sub">
              <TeamOutlined /> Registered User Roles
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <SafetyCertificateOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--purple">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Configurator Roles</span>
            <span className="perm-stat-val">{configRoles}</span>
            <span className="perm-stat-sub">
              <KeyOutlined /> Full Platform Access
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <KeyOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--green">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Standard Roles</span>
            <span className="perm-stat-val">{standardRoles}</span>
            <span className="perm-stat-sub">
              <UserOutlined /> Granular Access Roles
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <UserOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--orange">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Role Categories</span>
            <span className="perm-stat-val">2</span>
            <span className="perm-stat-sub">
              <AppstoreOutlined /> Configurator &amp; Standard
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <AppstoreOutlined />
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
      <div className="perm-toolbar">
        <div className="perm-toolbar-left">
          <div className="perm-tab-track">
            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--all ${selectedRoleTypeFilter === "all" ? "active" : ""}`}
              onClick={() => setSelectedRoleTypeFilter("all")}
            >
              <span className="perm-pill-icon"><AppstoreOutlined /></span>
              <span>All Roles</span>
              <span className="perm-pill-count">{totalRoles}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--config ${selectedRoleTypeFilter === "config" ? "active" : ""}`}
              onClick={() => setSelectedRoleTypeFilter("config")}
            >
              <span className="perm-pill-icon"><SafetyCertificateOutlined /></span>
              <span>Configurators</span>
              <span className="perm-pill-count">{configRoles}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--standard ${selectedRoleTypeFilter === "standard" ? "active" : ""}`}
              onClick={() => setSelectedRoleTypeFilter("standard")}
            >
              <span className="perm-pill-icon"><UserOutlined /></span>
              <span>Standard Roles</span>
              <span className="perm-pill-count">{standardRoles}</span>
            </button>
          </div>
        </div>

        <div className="perm-toolbar-right">
          <Input
            className="perm-search-input"
            placeholder="Search role name, identifier, or description..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* ── 4. ROLES TABLE ── */}
      <div className="ap-card-table conf-card-table perm-card-table">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredRoles}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
          />
        </Spin>
      </div>

      {/* ── 5. ADD / EDIT ROLE MODAL ── */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--primary-gradient, var(--primary-color, #15803d))",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16
            }}>
              <SafetyCertificateOutlined />
            </div>
            <span>{editingRole ? "Edit Role" : "Add New Role"}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingRole ? "Update Role" : "Create Role"}
        width={520}
        okButtonProps={{
          style: {
            background: "var(--primary-gradient, var(--primary-color, #15803d))",
            border: "none",
            fontWeight: 700,
            borderRadius: 8,
            height: 36,
            padding: "0 18px",
          },
        }}
        cancelButtonProps={{
          style: { borderRadius: 8, height: 36, fontWeight: 600 },
        }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Role Name</span>}
            rules={[{ required: true, message: "Role name is required" }]}
          >
            <Input placeholder="e.g. Project Manager, Field Officer" style={{ height: 38, borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Description</span>}
          >
            <Input.TextArea
              rows={3}
              placeholder="Brief description of this role's responsibilities"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>Configurator Access</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>Grant super-admin platform configuration privileges</div>
            </div>
            <Form.Item name="is_configurator" valuePropName="checked" initialValue={false} noStyle>
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage;
