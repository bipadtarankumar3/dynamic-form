import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Table,
  Select,
  Space,
  Tag,
  Typography,
  Card,
  Popconfirm,
  App,
  Tooltip,
} from 'antd';
import {
  SafetyCertificateOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  GlobalOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

const RoleAccessModal = ({
  open,
  onClose,
  roles = [],
  currentRoles = [], // can be array of IDs or array of { role_id, role_name, data_scope }
  onSaveRoleAccess,
}) => {
  const { message } = App.useApp();
  const [roleConfigs, setRoleConfigs] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedScope, setSelectedScope] = useState('all');
  const [selectedMasterField, setSelectedMasterField] = useState('unit_id');

  // Normalize incoming roles prop
  useEffect(() => {
    if (open) {
      const normalized = (Array.isArray(currentRoles) ? currentRoles : []).map((r) => {
        if (typeof r === 'object' && r !== null) {
          const rId = r.role_id || r._id || r.id || r.slug;
          const matched = roles.find(
            (rl) => String(rl._id || rl.id || rl.role_id || rl.slug) === String(rId)
          );
          return {
            role_id: rId,
            role_name: r.role_name || r.name || matched?.name || `Role #${rId}`,
            data_scope: r.data_scope || 'all',
            master_field: r.master_field || (r.data_scope === 'master_scoped' ? 'unit_id' : null),
          };
        } else {
          const matched = roles.find(
            (rl) => String(rl._id || rl.id || rl.role_id || rl.slug) === String(r)
          );
          return {
            role_id: r,
            role_name: matched?.name || `Role #${r}`,
            data_scope: 'all',
            master_field: null,
          };
        }
      });
      setRoleConfigs(normalized);
      setSelectedRoleId('');
      setSelectedScope('all');
      setSelectedMasterField('unit_id');
    }
  }, [open, currentRoles, roles]);

  const handleAddRole = () => {
    if (!selectedRoleId) {
      message.error('Please select a Role');
      return;
    }

    const matched = roles.find(
      (r) => String(r._id || r.id || r.role_id || r.slug) === String(selectedRoleId)
    );
    const roleName = matched?.name || matched?.slug || `Role #${selectedRoleId}`;

    const existingIndex = roleConfigs.findIndex(
      (rc) => String(rc.role_id) === String(selectedRoleId)
    );

    const newConfig = {
      role_id: selectedRoleId,
      role_name: roleName,
      data_scope: selectedScope,
      master_field: selectedScope === 'master_scoped' ? selectedMasterField : null,
    };

    if (existingIndex >= 0) {
      const updated = [...roleConfigs];
      updated[existingIndex] = newConfig;
      setRoleConfigs(updated);
      message.success(`Updated permission for "${roleName}"`);
    } else {
      setRoleConfigs([...roleConfigs, newConfig]);
      message.success(`Added role permission for "${roleName}"`);
    }

    setSelectedRoleId('');
    setSelectedScope('all');
    setSelectedMasterField('unit_id');
  };

  const handleUpdateScope = (roleId, newScope, newMasterField = null) => {
    setRoleConfigs((prev) =>
      prev.map((rc) =>
        String(rc.role_id) === String(roleId)
          ? {
              ...rc,
              data_scope: newScope,
              master_field: newScope === 'master_scoped' ? (newMasterField || rc.master_field || 'unit_id') : null,
            }
          : rc
      )
    );
  };

  const handleUpdateMasterField = (roleId, masterField) => {
    setRoleConfigs((prev) =>
      prev.map((rc) =>
        String(rc.role_id) === String(roleId) ? { ...rc, master_field: masterField } : rc
      )
    );
  };

  const handleRemoveRole = (roleId) => {
    setRoleConfigs((prev) => prev.filter((rc) => String(rc.role_id) !== String(roleId)));
  };

  const handleSave = () => {
    onSaveRoleAccess(roleConfigs);
    onClose();
  };

  // Roles available to add (not yet in list)
  const availableToAdd = roles.filter(
    (r) => !roleConfigs.some((rc) => String(rc.role_id) === String(r._id || r.id || r.role_id || r.slug))
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SafetyCertificateOutlined style={{ color: '#15803d', fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>
            Role-Wise Access & Permissions
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={780}
      style={{ top: 40 }}
      footer={[
        <Button key="cancel" size="large" onClick={onClose} style={{ borderRadius: 6 }}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          size="large"
          onClick={handleSave}
          style={{
            background: '#15803d',
            borderColor: '#15803d',
            fontWeight: 600,
            borderRadius: 6,
          }}
        >
          Save Permissions ({roleConfigs.length} Role{roleConfigs.length !== 1 ? 's' : ''})
        </Button>,
      ]}
    >
      <div
        style={{
          marginBottom: '16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          padding: '12px 16px',
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: '13px', color: '#166534' }}>
          Assign which user roles can access this dashboard and define their data visibility level.
          Users with <b>Created By User</b> will automatically see only records they created in the system.
        </Text>
      </div>

      {/* Add Role Card */}
      <Card
        size="small"
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          marginBottom: '20px',
          padding: '10px 14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: '#0f172a' }}>
          + Add Role Permission
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1.2', minWidth: '180px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              SELECT ROLE
            </span>
            <Select
              showSearch
              placeholder="Select Role"
              value={selectedRoleId || undefined}
              onChange={setSelectedRoleId}
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={availableToAdd.map((r, idx) => {
                const val = r._id || r.id || r.role_id || r.slug || `role_${idx}`;
                return {
                  label: r.name || r.slug || val,
                  value: val,
                };
              })}
            />
          </div>

          <div style={{ flex: '1.2', minWidth: '200px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              DATA VISIBILITY SCOPE
            </span>
            <Select
              value={selectedScope}
              onChange={setSelectedScope}
              style={{ width: '100%' }}
              options={[
                { label: '🌐 Full Company Access', value: 'all' },
                { label: '🎯 Scoped to User Master', value: 'master_scoped' },
                { label: '👤 Created By User Only', value: 'created_by' },
              ]}
            />
          </div>

          {selectedScope === 'master_scoped' && (
            <div style={{ flex: '1.2', minWidth: '190px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                MATCHING MASTER FIELD
              </span>
              <Select
                value={selectedMasterField}
                onChange={setSelectedMasterField}
                style={{ width: '100%' }}
                options={[
                  { label: '🏢 Plant Unit (unit_id)', value: 'unit_id' },
                  { label: '🗺️ State (state_id)', value: 'state_id' },
                  { label: '📍 District (district_id)', value: 'district_id' },
                  { label: '🎨 CSR Theme (theme_id)', value: 'theme_id' },
                  { label: '🤝 Partner NGO (ngo_id)', value: 'ngo_id' },
                ]}
              />
            </div>
          )}

          <div style={{ paddingTop: '18px' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddRole}
              disabled={!selectedRoleId}
              style={{
                background: '#15803d',
                borderColor: '#15803d',
                fontWeight: 600,
                height: '36px',
                padding: '0 18px',
                borderRadius: 6,
              }}
            >
              Add Role
            </Button>
          </div>
        </div>
      </Card>

      {/* Configured Roles Table */}
      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: '#0f172a' }}>
        Assigned Role Access ({roleConfigs.length})
      </div>

      {roleConfigs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '28px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px dashed #cbd5e1',
            color: '#64748b',
          }}
        >
          <GlobalOutlined style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '8px' }} />
          <div style={{ fontWeight: 600 }}>Available to All Users (Shared Dashboard)</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            No specific role restrictions. Add roles above if you want to restrict this dashboard to specific roles and data scopes.
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <Table
            dataSource={roleConfigs.map((r, i) => ({ ...r, key: `${r.role_id}-${i}` }))}
            pagination={false}
            size="middle"
            columns={[
              {
                title: 'Role Name',
                dataIndex: 'role_name',
                render: (txt, record) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      <UserOutlined />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{txt}</div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {record.role_id}</span>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Data Visibility Scope',
                dataIndex: 'data_scope',
                render: (scope, record) => (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Select
                      value={scope || 'all'}
                      onChange={(val) => handleUpdateScope(record.role_id, val)}
                      style={{ width: 190 }}
                      options={[
                        {
                          label: (
                            <Space size={6}>
                              <GlobalOutlined style={{ color: '#16a34a' }} />
                              <span>Full Access</span>
                            </Space>
                          ),
                          value: 'all',
                        },
                        {
                          label: (
                            <Space size={6}>
                              <span style={{ fontSize: '13px' }}>🎯</span>
                              <span>Master Scoped</span>
                            </Space>
                          ),
                          value: 'master_scoped',
                        },
                        {
                          label: (
                            <Space size={6}>
                              <UserOutlined style={{ color: '#2563eb' }} />
                              <span>Created By User</span>
                            </Space>
                          ),
                          value: 'created_by',
                        },
                      ]}
                    />

                    {scope === 'master_scoped' && (
                      <Select
                        value={record.master_field || 'unit_id'}
                        onChange={(val) => handleUpdateMasterField(record.role_id, val)}
                        style={{ width: 170 }}
                        options={[
                          { label: '🏢 Plant Unit', value: 'unit_id' },
                          { label: '🗺️ State', value: 'state_id' },
                          { label: '📍 District', value: 'district_id' },
                          { label: '🎨 CSR Theme', value: 'theme_id' },
                          { label: '🤝 Partner NGO', value: 'ngo_id' },
                        ]}
                      />
                    )}
                  </div>
                ),
              },
              {
                title: 'Applied Scope Rule',
                render: (_, record) => {
                  if (record.data_scope === 'master_scoped') {
                    return (
                      <Tag color="purple" style={{ fontWeight: 600 }}>
                        🎯 Scoped by {record.master_field || 'unit_id'}
                      </Tag>
                    );
                  }
                  if (record.data_scope === 'created_by') {
                    return (
                      <Tag color="blue" style={{ fontWeight: 600 }}>
                        👤 Created By User
                      </Tag>
                    );
                  }
                  return (
                    <Tag color="green" style={{ fontWeight: 600 }}>
                      🌐 Full Company
                    </Tag>
                  );
                },
              },
              {
                title: 'Action',
                align: 'right',
                render: (_, record) => (
                  <Popconfirm
                    title="Remove role access"
                    description={`Remove "${record.role_name}" from this dashboard?`}
                    onConfirm={() => handleRemoveRole(record.role_id)}
                    okText="Remove"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
};

export default RoleAccessModal;
