"use client";
// client/src/modules/auth-management/PermissionsPage.jsx
// Enterprise Role-Based Access Control (RBAC) & Permissions Management Dashboard

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Checkbox, Form, Input, Modal,
  Select, Space, Spin, Switch, Table, Tag, Tooltip, message
} from "antd";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileProtectOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import "./permissions-page.css";

const BASE = "/auth";

const PermissionsPage = () => {
  const [messageApi, ctx] = message.useMessage();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]); // all system modules
  const [formSchemas, setFormSchemas] = useState([]); // form builder schemas
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleTypeFilter, setSelectedRoleTypeFilter] = useState("all");

  // Config Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoleId, setModalRoleId] = useState(null);
  const [saving, setSaving] = useState(false);

  // View Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRoleData, setViewRoleData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [form] = Form.useForm();

  // ── Load roles, system modules, and form builder schemas ──────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, mRes, fRes] = await Promise.allSettled([
        privateHttpClient.get(`${BASE}/roles`),
        privateHttpClient.get(`${BASE}/permissions`),
        privateHttpClient.get(`/configurator/form-schemas?limit=200`),
      ]);

      if (rRes.status === "fulfilled") setRoles(rRes.value?.data?.data || []);
      if (mRes.status === "fulfilled") setModules(mRes.value?.data?.data || []);
      if (fRes.status === "fulfilled") setFormSchemas(fRes.value?.data?.data || []);
    } catch {
      messageApi.error("Failed to load permission data");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Combined modules list (System Modules + Form Builder Schemas) ──
  const combinedModules = useMemo(() => {
    const list = [...modules];
    (formSchemas || []).forEach((f) => {
      const slug = f.slug;
      const label = f.title || f.name || slug;
      if (slug && !list.some((m) => String(m.slug).toLowerCase() === String(slug).toLowerCase())) {
        list.push({
          slug: slug,
          label: `${label} [Form Builder]`,
          category: "Form Builder",
          actions: f.actions || [],
        });
      }
    });
    return list;
  }, [modules, formSchemas]);

  // ── Quick map of module_slug -> all_actions for Modal select ──
  const moduleActionsMap = useMemo(() => {
    const map = new Map();
    const formSchemaMap = new Map();
    (formSchemas || []).forEach((f) => {
      const slug = f.slug;
      if (slug && Array.isArray(f.actions)) {
        formSchemaMap.set(slug.toLowerCase(), f.actions);
      }
    });

    combinedModules.forEach((m) => {
      const base = [
        { slug: "list", name: "List Table" },
        { slug: "view", name: "View Details" },
        { slug: "add", name: "Add Record" },
        { slug: "edit", name: "Edit Record" },
        { slug: "delete", name: "Delete Record" },
        { slug: "export", name: "Export Data" },
      ];

      const schemaActs = formSchemaMap.get(String(m.slug || "").toLowerCase()) || [];
      const customRaw = [
        ...(m.customActions || []),
        ...(m.actions || []),
        ...(m.fsc_actions || []),
        ...(m.custom_actions || []),
        ...(m.all_actions || []),
        ...schemaActs,
      ];

      const custom = customRaw.map((ca) => {
        if (typeof ca === "string") return { slug: ca, name: ca };
        return {
          slug: ca.slug || ca.key,
          name: ca.name || ca.label || ca.title || ca.slug || ca.key,
        };
      });

      const combined = [...base];
      custom.forEach((c) => {
        if (c.slug && !combined.some((b) => b.slug === c.slug)) {
          combined.push(c);
        }
      });
      map.set(m.slug, combined);
    });
    return map;
  }, [combinedModules, formSchemas]);

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

  // ── Open Config Modal ────────────────────────────────────────
  const openConfigModal = (roleIdToConfig) => {
    const targetRoleId = roleIdToConfig || roles[0]?.id;
    setModalRoleId(targetRoleId);
    setModalOpen(true);

    if (targetRoleId) {
      privateHttpClient.get(`${BASE}/roles/${targetRoleId}/permissions`).then((res) => {
        const perms = res?.data?.data || [];
        const moduleRules = perms
          .filter((p) => Array.isArray(p.allowed_actions) && p.allowed_actions.length > 0)
          .map((p) => ({
            module_slug: p.module_slug,
            allowed_actions: Array.from(new Set(p.allowed_actions)),
          }));

        form.setFieldsValue({
          role_id: targetRoleId,
          modules:
            moduleRules.length > 0
              ? moduleRules
              : [{ module_slug: null, allowed_actions: ["list", "view", "add", "edit"] }],
        });
      });
    } else {
      form.setFieldsValue({
        role_id: null,
        modules: [{ module_slug: null, allowed_actions: ["list", "view", "add", "edit"] }],
      });
    }
  };

  // ── Open View Modal ──────────────────────────────────────────
  const openViewModal = (roleIdToView) => {
    const roleObj = roles.find((r) => r.id === roleIdToView);
    if (!roleIdToView) return;

    setViewLoading(true);
    setViewModalOpen(true);
    privateHttpClient
      .get(`${BASE}/roles/${roleIdToView}/permissions`)
      .then((res) => {
        setViewRoleData({
          roleId: roleIdToView,
          roleName: roleObj?.name || "Role",
          permissions: res?.data?.data || [],
        });
      })
      .catch(() => {
        messageApi.error("Failed to load permissions for viewing");
        setViewModalOpen(false);
      })
      .finally(() => {
        setViewLoading(false);
      });
  };

  // ── Handle Modal Role Select Change ──────────────────────────
  const handleModalRoleChange = async (roleId) => {
    setModalRoleId(roleId);
    try {
      const res = await privateHttpClient.get(`${BASE}/roles/${roleId}/permissions`);
      const perms = res?.data?.data || [];
      const moduleRules = perms
        .filter((p) => Array.isArray(p.allowed_actions) && p.allowed_actions.length > 0)
        .map((p) => ({
          module_slug: p.module_slug,
          allowed_actions: Array.from(new Set(p.allowed_actions)),
        }));

      form.setFieldsValue({
        modules:
          moduleRules.length > 0
            ? moduleRules
            : [{ module_slug: null, allowed_actions: ["list", "view", "add", "edit"] }],
      });
    } catch {
      messageApi.error("Failed to load permissions for selected role");
    }
  };

  // ── Save Permissions ─────────────────────────────────────────
  const handleSaveModalPermissions = async () => {
    try {
      const vals = await form.validateFields();
      const roleId = vals.role_id;
      if (!roleId) return messageApi.warning("Please select a role");

      // Duplicate module check
      const moduleSlugs = (vals.modules || []).map((m) => m?.module_slug).filter(Boolean);
      const uniqueSlugs = new Set(moduleSlugs);
      if (uniqueSlugs.size < moduleSlugs.length) {
        return messageApi.error("Duplicate module detected! Please remove duplicate entries.");
      }

      setSaving(true);
      const payload = (vals.modules || [])
        .filter((m) => m && m.module_slug && Array.isArray(m.allowed_actions) && m.allowed_actions.length > 0)
        .map((m) => ({
          module_slug: m.module_slug,
          allowed_actions: m.allowed_actions,
        }));

      await privateHttpClient.put(`${BASE}/roles/${roleId}/permissions`, { permissions: payload });
      messageApi.success("Role permissions updated successfully!");
      setModalOpen(false);
      loadInitialData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      if (msg) messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Stats Calculations ──
  const totalRoles = roles.length;
  const configRoles = roles.filter((r) => r.is_configurator).length;
  const standardRoles = totalRoles - configRoles;
  const systemModulesCount = modules.length;
  const formSchemasCount = formSchemas.length;

  // ── Roles Table Columns (Original Data with Modern Design) ──
  const roleColumns = [
    {
      title: "#",
      key: "index",
      width: 50,
      align: "center",
      sorter: (a, b) => ((a.id || 0) > (b.id || 0) ? 1 : -1),
      render: (_, __, idx) => (
        <span className="conf-index-badge">{idx + 1}</span>
      ),
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
      title: "Actions",
      key: "actions",
      width: 140,
      align: "center",
      onHeaderCell: () => ({
        className: "ap-actions-header-cell",
      }),
      render: (_, r) => (
        <div className="db-views-action-btns">
          <Tooltip title="View Permissions Breakdown" color="#16a34a">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openViewModal(r.id)}
              className="conf-action-edit-btn conf-action-preview-btn"
            />
          </Tooltip>

          <Tooltip title="Configure Role Rules" color="#7c3aed">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openConfigModal(r.id)}
              className="conf-action-outline-btn conf-action-edit-view-btn"
            />
          </Tooltip>
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
            <KeyOutlined />
          </div>
          <div>
            <h1 className="perm-page-title">Permissions Management</h1>
            <p className="perm-page-subtitle">
              Configure fine-grained module access, CRUD rules, and custom action permissions per role.
            </p>
          </div>
        </div>

        <div className="perm-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={loadInitialData}
            loading={loading}
            className="perm-btn-refresh"
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openConfigModal(roles[0]?.id)}
            className="perm-btn-create"
          >
            Configure Role Permissions
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
              <TeamOutlined /> {standardRoles} Standard Roles
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
            <span className="perm-stat-label">System Modules</span>
            <span className="perm-stat-val">{systemModulesCount}</span>
            <span className="perm-stat-sub">
              <AppstoreOutlined /> Core Application Modules
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <AppstoreOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--orange">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Form Builder Schemas</span>
            <span className="perm-stat-val">{formSchemasCount}</span>
            <span className="perm-stat-sub">
              <FileProtectOutlined /> Dynamic Custom Entities
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <FileProtectOutlined />
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
            placeholder="Search role name, identifier slug, or description..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* ── 4. ROLES TABLE (Exact match to Approval Path Table Design) ── */}
      <div className="ap-card-table conf-card-table perm-card-table">
        <Spin spinning={loading}>
          <Table
            columns={roleColumns}
            dataSource={filteredRoles}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
          />
        </Spin>
      </div>

      {/* ========================================================= */}
      {/* 1. CONFIG MODAL: Dynamic Role Picker & Module Action Grid */}
      {/* ========================================================= */}
      <Modal
        forceRender
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--primary-gradient, var(--primary-color, #15803d))",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16
            }}>
              <KeyOutlined />
            </div>
            <span>Configure Role Permissions</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSaveModalPermissions}
        okText="Save Permissions"
        confirmLoading={saving}
        width="94vw"
        style={{ top: 15, maxWidth: 1380 }}
        styles={{ body: { maxHeight: "calc(88vh - 110px)", overflowY: "auto", padding: "16px 20px" } }}
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
        <Form form={form} layout="vertical" size="small">
          {/* Target Role Selector Card */}
          <div style={{
            background: "radial-gradient(100% 100% at 90% 10%, rgba(var(--primary-color-rgb, 21, 128, 61), 0.08) 0%, rgba(var(--primary-color-rgb, 21, 128, 61), 0.02) 100%)",
            border: "1px solid rgba(var(--primary-color-rgb, 21, 128, 61), 0.2)",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}>
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5, whiteSpace: "nowrap" }}>
              Target Role:
            </span>
            <Form.Item
              name="role_id"
              noStyle
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select
                showSearch
                size="middle"
                optionFilterProp="label"
                placeholder="Choose a role to configure"
                onChange={handleModalRoleChange}
                options={roles.map((r) => ({ label: `${r.name} (${r.slug})`, value: r.id }))}
                style={{ width: 320 }}
                listHeight={350}
              />
            </Form.Item>
            <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>
              💡 Select a module in each card below — standard actions <strong>[List, Add, Edit]</strong> will load automatically.
            </span>
          </div>

          {/* Modules Repeater Grid */}
          <Form.List name="modules">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", alignItems: "start" }}>
                  {fields.map(({ key, name, ...restField }, index) => {
                    const currentModuleSlug = form.getFieldValue(["modules", name, "module_slug"]);
                    const allFormModules = form.getFieldValue("modules") || [];
                    const selectedOtherSlugs = allFormModules
                      .map((m, idx) => (idx !== name ? m?.module_slug : null))
                      .filter(Boolean);

                    const rawActions = moduleActionsMap.get(currentModuleSlug) || [
                      { slug: "list", name: "List Table" },
                      { slug: "view", name: "View Details" },
                      { slug: "add", name: "Add Record" },
                      { slug: "edit", name: "Edit Record" },
                      { slug: "delete", name: "Delete Record" },
                      { slug: "export", name: "Export Data" },
                    ];
                    const seenActSlugs = new Set();
                    const availableActions = rawActions.filter((a) => {
                      if (seenActSlugs.has(a.slug)) return false;
                      seenActSlugs.add(a.slug);
                      return true;
                    });

                    const handleSelectAll = (checked) => {
                      const allSlugs = availableActions.map((a) => a.slug);
                      const modulesVals = form.getFieldValue("modules") || [];
                      modulesVals[name] = {
                        ...modulesVals[name],
                        allowed_actions: checked ? allSlugs : [],
                      };
                      form.setFieldsValue({ modules: [...modulesVals] });
                    };

                    const currentSelectedActions = form.getFieldValue(["modules", name, "allowed_actions"]) || [];
                    const isAllSelected = availableActions.length > 0 && currentSelectedActions.length === availableActions.length;

                    return (
                      <div
                        key={key}
                        style={{
                          background: "#ffffff",
                          border: "1.5px solid #e2e8f0",
                          borderRadius: 12,
                          padding: "12px 14px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {/* Card Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: "var(--primary-color, #15803d)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em"
                          }}>
                            Module #{index + 1}
                          </span>
                          {fields.length > 1 && (
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              size="small"
                              style={{ padding: "0 6px", height: 24, fontSize: 11.5, borderRadius: 6 }}
                              onClick={() => remove(name)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>

                        {/* Module Select */}
                        <Form.Item
                          {...restField}
                          name={[name, "module_slug"]}
                          rules={[{ required: true, message: "Required" }]}
                          style={{ marginBottom: 10 }}
                        >
                          <Select
                            showSearch
                            size="middle"
                            optionFilterProp="label"
                            placeholder="Choose module (e.g. Project, Proposal)"
                            options={combinedModules.map((m) => ({
                              label: `${m.label || m.name} [${m.category || "General"}]`,
                              value: m.slug,
                              disabled: selectedOtherSlugs.includes(m.slug),
                            }))}
                            onChange={(slug) => {
                              if (selectedOtherSlugs.includes(slug)) {
                                messageApi.warning(`Module "${slug}" is already inserted in this list!`);
                                const modulesVals = form.getFieldValue("modules") || [];
                                modulesVals[name] = { ...modulesVals[name], module_slug: null, allowed_actions: [] };
                                form.setFieldsValue({ modules: [...modulesVals] });
                                return;
                              }

                              const modulesVals = form.getFieldValue("modules") || [];
                              modulesVals[name] = {
                                ...modulesVals[name],
                                module_slug: slug,
                                allowed_actions: ["list", "view", "add", "edit"],
                              };
                              form.setFieldsValue({ modules: [...modulesVals] });
                            }}
                            listHeight={350}
                          />
                        </Form.Item>

                        {/* Actions Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>
                            Actions ({currentSelectedActions.length}/{availableActions.length}):
                          </label>
                          {currentModuleSlug && (
                            <Checkbox
                              checked={isAllSelected}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              style={{ fontSize: 11, color: "var(--primary-color, #15803d)", fontWeight: 700 }}
                            >
                              Select All
                            </Checkbox>
                          )}
                        </div>

                        {/* Actions Multi-Select */}
                        <Form.Item
                          {...restField}
                          name={[name, "allowed_actions"]}
                          rules={[{ required: true, message: "Select actions" }]}
                          normalize={(vals) => (Array.isArray(vals) ? Array.from(new Set(vals)) : vals)}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            mode="multiple"
                            size="middle"
                            allowClear
                            placeholder={currentModuleSlug ? "Select allowed actions" : "Select module first"}
                            options={availableActions.map((a) => ({ label: a.name, value: a.slug }))}
                            disabled={!currentModuleSlug}
                            maxTagCount="responsive"
                            style={{ fontSize: 12 }}
                          />
                        </Form.Item>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="dashed"
                  size="middle"
                  onClick={() => add({ module_slug: null, allowed_actions: ["list", "view", "add", "edit"] })}
                  icon={<PlusOutlined />}
                  block
                  style={{
                    borderRadius: 10,
                    marginTop: 14,
                    fontWeight: 700,
                    height: 40,
                    color: "var(--primary-color, #15803d)",
                    borderColor: "rgba(var(--primary-color-rgb, 21, 128, 61), 0.3)",
                    background: "rgba(var(--primary-color-rgb, 21, 128, 61), 0.02)",
                  }}
                >
                  + Add Another Module Rule
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* 2. VIEW MODAL: Read-Only Overview of All Role Permissions */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16
            }}>
              <EyeOutlined />
            </div>
            <span>Permissions Breakdown — {viewRoleData?.roleName}</span>
          </div>
        }
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        width={880}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: "calc(80vh - 100px)", overflowY: "auto", padding: "16px 20px" } }}
        footer={[
          <Button key="close" size="middle" style={{ borderRadius: 8, fontWeight: 600 }} onClick={() => setViewModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            size="middle"
            icon={<EditOutlined />}
            style={{
              background: "var(--primary-gradient, var(--primary-color, #15803d))",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
            }}
            onClick={() => {
              setViewModalOpen(false);
              openConfigModal(viewRoleData?.roleId);
            }}
          >
            Edit {viewRoleData?.roleName} Permissions
          </Button>,
        ]}
      >
        <Spin spinning={viewLoading}>
          {viewRoleData && (
            <div>
              {/* Role Header Banner */}
              <div style={{
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                border: "1px solid #bae6fd",
                borderRadius: 12,
                padding: "12px 18px",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <SafetyCertificateOutlined style={{ color: "#0284c7", fontSize: 20 }} />
                  <span style={{ fontWeight: 800, color: "#0369a1", fontSize: 14 }}>
                    Role: {viewRoleData.roleName}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6, padding: "2px 10px" }}>
                    Configured Modules: {(viewRoleData.permissions || []).filter((p) => p.allowed_actions?.length > 0).length}
                  </Tag>
                  <Tag color="purple" style={{ fontWeight: 700, borderRadius: 6, padding: "2px 10px" }}>
                    Total Active Actions: {(viewRoleData.permissions || []).reduce((acc, p) => acc + (p.allowed_actions?.length || 0), 0)}
                  </Tag>
                </div>
              </div>

              {/* Modules Breakdown List */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {(viewRoleData.permissions || [])
                  .filter((p) => p.allowed_actions && p.allowed_actions.length > 0)
                  .map((perm, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "12px 14px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                          {perm.label || perm.module_slug}
                        </span>
                        {perm.category && (
                          <Tag
                            style={{ fontSize: 10, borderRadius: 6, fontWeight: 700 }}
                            color={
                              perm.category === "Auth" ? "purple" :
                              perm.category === "Master" ? "cyan" : "blue"
                            }
                          >
                            {perm.category}
                          </Tag>
                        )}
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(perm.allowed_actions || []).map((act) => {
                          const isStandard = ["list", "add", "edit", "delete", "export", "view"].includes(act);
                          const ACTION_COLORS = {
                            list: "blue",
                            view: "cyan",
                            add: "green",
                            edit: "gold",
                            delete: "red",
                            export: "geekblue",
                          };
                          const color = isStandard ? ACTION_COLORS[act] : "purple";
                          return (
                            <Tag
                              key={act}
                              color={color}
                              style={{ borderRadius: 6, fontSize: 10.5, padding: "2px 7px", fontWeight: 700 }}
                            >
                              {act.toUpperCase()}
                            </Tag>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default PermissionsPage;
