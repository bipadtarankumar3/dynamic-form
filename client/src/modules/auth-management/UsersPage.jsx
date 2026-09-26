"use client";
// client/src/modules/auth-management/UsersPage.jsx
// Enterprise User Account Management Dashboard

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar, Button, Form, Input, Modal, Popconfirm,
  Select, Space, Spin, Switch, Table, Tag, Tooltip, message
} from "antd";
import {
  AppstoreOutlined,
  BankOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  IdcardOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SolutionOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import "./permissions-page.css";

const BASE = "/auth";

const UsersPage = () => {
  const [messageApi, ctx] = message.useMessage();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form] = Form.useForm();

  // ── Fetch Users and Roles ───────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        privateHttpClient.get(`${BASE}/users`),
        privateHttpClient.get(`${BASE}/roles`),
      ]);
      setUsers(uRes?.data?.data || []);
      setRoles(rRes?.data?.data || []);
    } catch {
      messageApi.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ── Modal Actions ────────────────────────────────────────────
  const openAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    form.setFieldsValue({
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      role_id: u.role_id,
      employee_code: u.employee_code,
      department: u.department,
      designation: u.designation,
      is_active: u.is_active !== false,
    });
    setModalOpen(true);
  };

  // ── Save User ────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editingUser) {
        await privateHttpClient.put(`${BASE}/users/${editingUser.id}`, vals);
        messageApi.success("User updated successfully");
      } else {
        await privateHttpClient.post(`${BASE}/users`, vals);
        messageApi.success("User created successfully");
      }
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      if (msg) messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete User ──────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await privateHttpClient.delete(`${BASE}/users/${id}`);
      messageApi.success("User deleted successfully");
      loadUsers();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Delete failed");
    }
  };

  // ── Toggle Active Status ─────────────────────────────────────
  const handleToggle = async (u) => {
    try {
      await privateHttpClient.patch(`${BASE}/users/${u.id}/toggle-active`);
      messageApi.success(`User ${u.is_active ? "deactivated" : "activated"}`);
      loadUsers();
    } catch {
      messageApi.error("Failed to update status");
    }
  };

  // ── Stats Calculations ──
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active !== false).length;
  const inactiveUsers = totalUsers - activeUsers;
  const configuratorUsers = users.filter((u) => {
    const r = roles.find((role) => role.id === u.role_id);
    return r?.is_configurator;
  }).length;

  // ── Filtered Users ──
  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      const matchesSearch =
        !searchQuery ||
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.mobile && u.mobile.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.role_name && u.role_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.employee_code && u.employee_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.designation && u.designation.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = u.is_active !== false;
      if (statusFilter === "inactive") matchesStatus = u.is_active === false;
      if (statusFilter === "config") {
        const r = roles.find((role) => role.id === u.role_id);
        matchesStatus = !!r?.is_configurator;
      }

      return matchesSearch && matchesStatus;
    });
  }, [users, roles, searchQuery, statusFilter]);

  // ── Table Columns ──
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
      title: "User Profile",
      dataIndex: "name",
      key: "name",
      width: 260,
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
      render: (v, u) => {
        const initial = (v || "U")[0].toUpperCase();
        return (
          <div className="ap-wf-identity">
            <div
              className="ap-wf-avatar"
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                boxShadow: "0 3px 10px rgba(2, 132, 199, 0.25)",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>{v}</div>
              <div style={{ color: "#64748b", fontSize: "11.5px" }}>{u.email}</div>
              {u.mobile && (
                <div style={{ color: "#94a3b8", fontSize: "10.5px", marginTop: 1 }}>
                  📞 {u.mobile}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Role & Code",
      dataIndex: "role_name",
      key: "role_name",
      width: 200,
      sorter: (a, b) => (a.role_name || "").localeCompare(b.role_name || ""),
      render: (v, u) => {
        const roleObj = roles.find((r) => r.id === u.role_id);
        const isConf = roleObj?.is_configurator;
        return (
          <div>
            <span
              className="conf-badge-master-yes"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: isConf ? "#faf5ff" : "#f0f9ff",
                color: isConf ? "#9333ea" : "#0284c7",
                border: isConf ? "1px solid #d8b4fe" : "1px solid #bae6fd",
              }}
            >
              {isConf ? <KeyOutlined style={{ fontSize: 11 }} /> : <SafetyCertificateOutlined style={{ fontSize: 11 }} />}
              {v || u.role_slug || "Role Assigned"}
            </span>
            {u.employee_code && (
              <div style={{ marginTop: 3 }}>
                <span
                  className="conf-slug-code"
                  style={{
                    fontSize: "10.5px",
                    padding: "1px 6px",
                    background: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  EMP: {u.employee_code}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Department & Designation",
      dataIndex: "department",
      key: "department",
      render: (_, u) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: "13px", color: "#334155" }}>
            {u.department || "—"}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {u.designation || "—"}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 140,
      align: "center",
      sorter: (a, b) => (a.is_active !== false ? 1 : 0) - (b.is_active !== false ? 1 : 0),
      render: (v, u) => {
        const isActive = v !== false;
        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Tooltip title={isActive ? "Click to deactivate user" : "Click to activate user"}>
              <Switch
                size="small"
                checked={isActive}
                onChange={() => handleToggle(u)}
                style={{ backgroundColor: isActive ? "#16a34a" : "#cbd5e1" }}
              />
            </Tooltip>
            <span className={isActive ? "conf-badge-published" : "conf-badge-draft"}>
              {isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      align: "center",
      sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
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
      render: (_, u) => (
        <div className="db-views-action-btns">
          <Tooltip title="Edit User Account" color="#7c3aed">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(u)}
              className="conf-action-outline-btn conf-action-edit-view-btn"
            />
          </Tooltip>

          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user account?"
            onConfirm={() => handleDelete(u.id)}
            okText="Delete"
            okButtonProps={{ danger: true, style: { borderRadius: 6 } }}
            cancelButtonProps={{ style: { borderRadius: 6 } }}
          >
            <Tooltip title="Delete User" color="#dc2626">
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
            <UserOutlined />
          </div>
          <div>
            <h1 className="perm-page-title">Users Management</h1>
            <p className="perm-page-subtitle">
              Provision user accounts, assign system roles, and configure organization attributes.
            </p>
          </div>
        </div>

        <div className="perm-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={loadUsers}
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
            Add User
          </Button>
        </div>
      </div>

      {/* ── 2. KPI STATS CARDS ── */}
      <div className="perm-stats-grid">
        <div className="perm-stat-card perm-stat-card--blue">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Total Users</span>
            <span className="perm-stat-val">{totalUsers}</span>
            <span className="perm-stat-sub">
              <TeamOutlined /> Registered User Accounts
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <TeamOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--green">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Active Users</span>
            <span className="perm-stat-val">{activeUsers}</span>
            <span className="perm-stat-sub">
              <CheckCircleOutlined /> Enabled Platform Accounts
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <CheckCircleOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--orange">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Inactive Users</span>
            <span className="perm-stat-val">{inactiveUsers}</span>
            <span className="perm-stat-sub">
              <StopOutlined /> Suspended / Inactive
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <StopOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--purple">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Configurator Users</span>
            <span className="perm-stat-val">{configuratorUsers}</span>
            <span className="perm-stat-sub">
              <KeyOutlined /> Super Admin Privileges
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <KeyOutlined />
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
      <div className="perm-toolbar">
        <div className="perm-toolbar-left">
          <div className="perm-tab-track">
            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--all ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <span className="perm-pill-icon"><AppstoreOutlined /></span>
              <span>All Users</span>
              <span className="perm-pill-count">{totalUsers}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--active ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              <span className="perm-pill-icon"><CheckCircleOutlined /></span>
              <span>Active</span>
              <span className="perm-pill-count">{activeUsers}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--inactive ${statusFilter === "inactive" ? "active" : ""}`}
              onClick={() => setStatusFilter("inactive")}
            >
              <span className="perm-pill-icon"><StopOutlined /></span>
              <span>Inactive</span>
              <span className="perm-pill-count">{inactiveUsers}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--config ${statusFilter === "config" ? "active" : ""}`}
              onClick={() => setStatusFilter("config")}
            >
              <span className="perm-pill-icon"><KeyOutlined /></span>
              <span>Configurators</span>
              <span className="perm-pill-count">{configuratorUsers}</span>
            </button>
          </div>
        </div>

        <div className="perm-toolbar-right">
          <Input
            className="perm-search-input"
            placeholder="Search name, email, mobile, role, emp code..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* ── 4. USERS TABLE ── */}
      <div className="ap-card-table conf-card-table perm-card-table">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
          />
        </Spin>
      </div>

      {/* ── 5. ADD / EDIT USER MODAL ── */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--primary-gradient, var(--primary-color, #15803d))",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16
            }}>
              <UserOutlined />
            </div>
            <span>{editingUser ? "Edit User Account" : "Add New User Account"}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingUser ? "Update User" : "Create User"}
        width={680}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item
              name="name"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Full Name</span>}
              rules={[{ required: true, message: "Full name is required" }]}
            >
              <Input prefix={<UserOutlined style={{ color: "#94a3b8" }} />} placeholder="e.g. John Doe" style={{ height: 38, borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Email Address</span>}
              rules={[{ required: true, type: "email", message: "Valid email is required" }]}
            >
              <Input prefix={<MailOutlined style={{ color: "#94a3b8" }} />} placeholder="e.g. john@company.com" style={{ height: 38, borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>{editingUser ? "New Password (optional)" : "Password"}</span>}
              rules={editingUser ? [] : [{ required: true, min: 6, message: "Min 6 characters" }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: "#94a3b8" }} />} placeholder={editingUser ? "Leave blank to keep current" : "Min 6 characters"} style={{ height: 38, borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="role_id"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Assigned Role</span>}
              rules={[{ required: true, message: "Role is required" }]}
            >
              <Select
                showSearch
                size="middle"
                optionFilterProp="label"
                placeholder="Choose system role"
                options={roles.map((r) => ({ label: `${r.name} (${r.slug})`, value: r.id }))}
                style={{ width: "100%", height: 38 }}
                listHeight={350}
              />
            </Form.Item>

            <Form.Item
              name="mobile"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Mobile Number</span>}
            >
              <Input prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />} placeholder="e.g. +91 9876543210" style={{ height: 38, borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="employee_code"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Employee Code</span>}
            >
              <Input prefix={<IdcardOutlined style={{ color: "#94a3b8" }} />} placeholder="e.g. EMP-1042" style={{ height: 38, borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="department"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Department</span>}
            >
              <Input prefix={<BankOutlined style={{ color: "#94a3b8" }} />} placeholder="e.g. CSR Operations" style={{ height: 38, borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="designation"
              label={<span style={{ fontWeight: 700, color: "#0f172a" }}>Designation</span>}
            >
              <Input prefix={<SolutionOutlined style={{ color: "#94a3b8" }} />} placeholder="e.g. Senior Project Manager" style={{ height: 38, borderRadius: 8 }} />
            </Form.Item>
          </div>

          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
          }}>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>Account Active Status</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>Enable or temporarily suspend platform login access</div>
            </div>
            <Form.Item name="is_active" valuePropName="checked" initialValue={true} noStyle>
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
