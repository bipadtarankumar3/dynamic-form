import React, { useState, useEffect } from "react";
import { Card, Table, Checkbox, Select, Button, Tabs, App, Space, Typography, Tag, List } from "antd";
import { LockOutlined, TeamOutlined, MenuOutlined } from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";

const { Title, Text } = Typography;
const { Option } = Select;

export default function RbacBuilder() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [fieldPermissions, setFieldPermissions] = useState([]);
  const [menusList, setMenusList] = useState([]);
  const [menuPermissionsMap, setMenuPermissionsMap] = useState({});
  const [saving, setSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [rolesRes, permsRes, formsRes, menusRes] = await Promise.all([
          privateHttpClient.get("/configurator/rbac/roles"),
          privateHttpClient.get("/configurator/rbac/permissions"),
          privateHttpClient.get("/configurator/form-schemas"),
          privateHttpClient.get("/configurator/menus")
        ]);

        setRoles(rolesRes.data?.data || []);
        setPermissions(permsRes.data?.data || []);
        setForms(formsRes.data?.data || []);
        setMenusList(menusRes.data?.data || []);

        if (rolesRes.data?.data?.length > 0) {
          setSelectedRole(rolesRes.data.data[0].rol_id || rolesRes.data.data[0].id);
        }
        if (formsRes.data?.data?.length > 0) {
          setSelectedForm(formsRes.data.data[0].slug);
        }
      } catch (err) {
        message.error("Failed to load initial RBAC configuration data");
      }
    };
    loadInitialData();
  }, []);

  // Load permissions for selected role
  useEffect(() => {
    if (!selectedRole) return;
    const fetchRolePerms = async () => {
      try {
        const res = await privateHttpClient.get(`/configurator/rbac/roles/${selectedRole}/permissions`);
        setRolePermissions(res.data?.data || []);
      } catch (err) {
        message.error("Failed to load role permissions");
      }
    };
    fetchRolePerms();
  }, [selectedRole]);

  // Load field permissions for selected role + form
  useEffect(() => {
    if (!selectedRole || !selectedForm) return;
    const fetchFieldPerms = async () => {
      try {
        const res = await privateHttpClient.get(
          `/configurator/rbac/roles/${selectedRole}/field-permissions?form_slug=${selectedForm}`
        );
        const mapped = res.data?.data || {};
        // Convert map of { field_name: { can_view, can_edit } } to table list
        const formObj = forms.find(f => f.slug === selectedForm);
        const fields = [];
        if (formObj) {
          const sections = formObj.sections || [];
          sections.forEach(sec => {
            (sec.fields || []).forEach(f => {
              const colName = f.column_name || f.db_field;
              if (colName) {
                fields.push({
                  field_name: colName,
                  label: f.label || colName,
                  can_view: mapped[colName]?.can_view !== false,
                  can_edit: mapped[colName]?.can_edit !== false,
                });
              }
            });
          });
        }
        setFieldPermissions(fields);
      } catch (err) {
        message.error("Failed to load field permissions");
      }
    };
    fetchFieldPerms();
  }, [selectedRole, selectedForm, forms]);

  const handleTogglePermission = (permKey) => {
    setRolePermissions(prev =>
      prev.includes(permKey) ? prev.filter(k => k !== permKey) : [...prev, permKey]
    );
  };

  const handleToggleField = (fieldName, property) => {
    setFieldPermissions(prev =>
      prev.map(f => f.field_name === fieldName ? { ...f, [property]: !f[property] } : f)
    );
  };

  const handleToggleMenuPerm = (menuId, action) => {
    setMenuPermissionsMap(prev => {
      const current = prev[menuId] || { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true };
      return {
        ...prev,
        [menuId]: {
          ...current,
          [action]: !current[action]
        }
      };
    });
  };

  const saveActionPermissions = async () => {
    try {
      setSaving(true);
      // Map keys to IDs
      const mappedIds = permissions
        .filter(p => rolePermissions.includes(p.per_key))
        .map(p => p.per_id);

      await privateHttpClient.put(`/configurator/rbac/roles/${selectedRole}/permissions`, {
        permission_ids: mappedIds
      });
      message.success("Role action permissions saved successfully");
    } catch (err) {
      message.error("Failed to save action permissions");
    } finally {
      setSaving(false);
    }
  };

  const saveFieldPermissions = async () => {
    try {
      setSaving(true);
      await privateHttpClient.put(`/configurator/rbac/roles/${selectedRole}/field-permissions`, {
        form_slug: selectedForm,
        field_permissions: fieldPermissions
      });
      message.success("Field level permissions saved successfully");
    } catch (err) {
      message.error("Failed to save field permissions");
    } finally {
      setSaving(false);
    }
  };

  const permColumns = [
    {
      title: "Module",
      dataIndex: "per_module",
      key: "per_module",
      width: "25%",
      render: t => <Tag color="indigo" style={{ borderRadius: "4px", fontWeight: 600 }}>{t ? t.toUpperCase() : "GENERAL"}</Tag>
    },
    {
      title: "Permission Action",
      dataIndex: "per_label",
      key: "per_label",
      render: text => <span style={{ fontWeight: 600, color: "#1e293b" }}>{text}</span>
    },
    {
      title: "Key",
      dataIndex: "per_key",
      key: "per_key",
      render: k => (
        <code style={{
          fontSize: "12px",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          background: "#f1f5f9",
          color: "#475569",
          padding: "3px 6px",
          borderRadius: "4px"
        }}>
          {k}
        </code>
      )
    },
    {
      title: "Allowed",
      key: "allowed",
      width: "15%",
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={rolePermissions.includes(record.per_key)}
          onChange={() => handleTogglePermission(record.per_key)}
          style={{ transform: "scale(1.1)" }}
        />
      )
    }
  ];

  const tabItems = [
    {
      key: "1",
      label: (
        <span style={{ fontWeight: 600, fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <LockOutlined />
          Action Permissions
        </span>
      ),
      children: (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <Button
              type="primary"
              onClick={saveActionPermissions}
              loading={saving}
              style={{
                background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
                border: "none",
                boxShadow: "0 4px 14px rgba(21, 128, 61, 0.25)",
                height: "38px",
                borderRadius: "8px",
                fontWeight: 600
              }}
            >
              Save Action Permissions
            </Button>
          </div>
          <Table
            dataSource={permissions}
            columns={permColumns}
            rowKey="per_id"
            pagination={{ pageSize: 15 }}
            size="middle"
            bordered={false}
            style={{ background: "#ffffff", borderRadius: "8px", overflow: "hidden" }}
          />
        </>
      )
    },
    {
      key: "2",
      label: (
        <span style={{ fontWeight: 600, fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <TeamOutlined />
          Field-Level Permissions
        </span>
      ),
      children: (
        <>
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px", alignItems: "center" }}>
            <div>
              <Text strong style={{ marginRight: "12px", color: "#334155" }}>Target Form Schema:</Text>
              <Select
                style={{ width: 280 }}
                placeholder="Select Form"
                value={selectedForm}
                onChange={setSelectedForm}
              >
                {forms.map(f => (
                  <Option key={f.slug} value={f.slug}>{f.title || f.name}</Option>
                ))}
              </Select>
            </div>
            <Button
              type="primary"
              style={{
                marginLeft: "auto",
                background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
                border: "none",
                boxShadow: "0 4px 14px rgba(21, 128, 61, 0.25)",
                height: "38px",
                borderRadius: "8px",
                fontWeight: 600
              }}
              onClick={saveFieldPermissions}
              loading={saving}
            >
              Save Field Permissions
            </Button>
          </div>

          <Table
            dataSource={fieldPermissions}
            rowKey="field_name"
            pagination={false}
            size="middle"
            bordered={false}
            style={{ background: "#ffffff", borderRadius: "8px", overflow: "hidden" }}
            columns={[
              {
                title: "Field Label",
                dataIndex: "label",
                key: "label",
                render: l => <strong style={{ color: "#1e293b" }}>{l}</strong>
              },
              {
                title: "Column Identifier",
                dataIndex: "field_name",
                key: "field_name",
                render: fn => (
                  <code style={{
                    fontSize: "12px",
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    background: "#f1f5f9",
                    color: "#475569",
                    padding: "3px 6px",
                    borderRadius: "4px"
                  }}>
                    {fn}
                  </code>
                )
              },
              {
                title: "Can View",
                key: "can_view",
                width: "15%",
                align: "center",
                render: (_, r) => (
                  <Checkbox
                    checked={r.can_view}
                    onChange={() => handleToggleField(r.field_name, "can_view")}
                    style={{ transform: "scale(1.1)" }}
                  />
                )
              },
              {
                title: "Can Edit",
                key: "can_edit",
                width: "15%",
                align: "center",
                render: (_, r) => (
                  <Checkbox
                    checked={r.can_edit}
                    onChange={() => handleToggleField(r.field_name, "can_edit")}
                    style={{ transform: "scale(1.1)" }}
                  />
                )
              }
            ]}
          />
        </>
      )
    },
    {
      key: "3",
      label: (
        <span style={{ fontWeight: 600, fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <MenuOutlined />
          Menu & Button Permissions
        </span>
      ),
      children: (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <Button
              type="primary"
              onClick={saveActionPermissions}
              loading={saving}
              style={{
                background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
                border: "none",
                boxShadow: "0 4px 14px rgba(21, 128, 61, 0.25)",
                height: "38px",
                borderRadius: "8px",
                fontWeight: 600
              }}
            >
              Save Menu & Button Permissions
            </Button>
          </div>

          <Table
            dataSource={menusList}
            rowKey="id"
            pagination={{ pageSize: 12 }}
            size="middle"
            bordered={false}
            style={{ background: "#ffffff", borderRadius: "8px", overflow: "hidden" }}
            columns={[
              {
                title: "Menu Label",
                dataIndex: "label",
                key: "label",
                render: (l, r) => (
                  <div>
                    <strong style={{ color: "#0f172a" }}>{l}</strong>
                    {r.is_public ? (
                      <Tag color="cyan" size="small" style={{ marginLeft: 8 }}>Public</Tag>
                    ) : (
                      <Tag color="green" size="small" style={{ marginLeft: 8 }}>CSR Role</Tag>
                    )}
                  </div>
                )
              },
              {
                title: "Route Link",
                dataIndex: "url",
                key: "url",
                render: u => (
                  <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                    {u || "(Folder)"}
                  </code>
                )
              },
              {
                title: "View Menu",
                key: "can_view",
                align: "center",
                render: (_, r) => (
                  <Checkbox
                    checked={menuPermissionsMap[r.id]?.can_view !== false}
                    onChange={() => handleToggleMenuPerm(r.id, "can_view")}
                  />
                )
              },
              {
                title: "Add / Create",
                key: "can_create",
                align: "center",
                render: (_, r) => (
                  <Checkbox
                    checked={menuPermissionsMap[r.id]?.can_create !== false}
                    onChange={() => handleToggleMenuPerm(r.id, "can_create")}
                  />
                )
              },
              {
                title: "Edit / Update",
                key: "can_edit",
                align: "center",
                render: (_, r) => (
                  <Checkbox
                    checked={menuPermissionsMap[r.id]?.can_edit !== false}
                    onChange={() => handleToggleMenuPerm(r.id, "can_edit")}
                  />
                )
              },
              {
                title: "Delete",
                key: "can_delete",
                align: "center",
                render: (_, r) => (
                  <Checkbox
                    checked={menuPermissionsMap[r.id]?.can_delete !== false}
                    onChange={() => handleToggleMenuPerm(r.id, "can_delete")}
                  />
                )
              },
              {
                title: "Export Data",
                key: "can_export",
                align: "center",
                render: (_, r) => (
                  <Checkbox
                    checked={menuPermissionsMap[r.id]?.can_export !== false}
                    onChange={() => handleToggleMenuPerm(r.id, "can_export")}
                  />
                )
              }
            ]}
          />
        </>
      )
    }
  ];

  return (
    <div className="conf-page-container">
      {/* Top Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <LockOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">RBAC & Permissions</h1>
            <p className="conf-page-subtitle">Define action permissions and field-level visibility across user roles</p>
          </div>
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-box">
            <TeamOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Roles</span>
            <span className="conf-stat-val">{roles.length}</span>
            <span className="conf-stat-sub">Configured system roles</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-box">
            <LockOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Forms Protected</span>
            <span className="conf-stat-val">{forms.length}</span>
            <span className="conf-stat-sub">Secured form schemas</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-box">
            <LockOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Action Permissions</span>
            <span className="conf-stat-val">{permissions.length}</span>
            <span className="conf-stat-sub">Granular access rules</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-box">
            <MenuOutlined />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">System Menus</span>
            <span className="conf-stat-val">{menusList.length}</span>
            <span className="conf-stat-sub">Secured route paths</span>
          </div>
        </div>
      </div>

      {/* Main Content Area Card */}
      <div className="conf-card-table" style={{ padding: "20px" }}>
        <div style={{ marginBottom: "20px", background: "#f8fafc", padding: "14px 18px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "inline-flex", alignItems: "center" }}>
          <Space size="middle">
            <Text strong style={{ color: "#334155", fontSize: "13.5px" }}>Select Role to Configure:</Text>
            <Select
              style={{ width: 280 }}
              placeholder="Select Role"
              value={selectedRole}
              onChange={setSelectedRole}
            >
              {roles.map(r => (
                <Option key={r.rol_id} value={r.rol_id}>
                  {r.rol_name} {r.rol_is_configurator && " (Configurator)"}
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        <Tabs defaultActiveKey="1" items={tabItems} size="large" />
      </div>
    </div>
  );
}
