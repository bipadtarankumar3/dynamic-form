import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Row,
  Col,
  Card,
  Tag,
  Input,
  Select,
  Switch,
  Space,
  Spin,
  Empty,
  Popconfirm,
  App,
  Tooltip,
  Badge,
  Modal,
  Table,
  Dropdown,
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DashboardOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  MoreOutlined,PlusCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  getCustomDashboards,
  createCustomDashboard,
  updateCustomDashboard,
  deleteCustomDashboard,
  toggleCustomDashboardStatus,
  getAvailableRoles,
} from '@/services/dashboard-builder-service';
import { getAllPivotReports } from '@/services/pivot-service';
import DashboardCanvasDesigner from './components/DashboardCanvasDesigner';
import './DashboardBuilder.css';
import Image from "next/image";
import TotalWidgets from '@/assets/images/dashboard/TotalWidgets.png';
import Dashboards from '@/assets/images/dashboard/Dashboards.png';
import Chartblocks from '@/assets/images/dashboard/Chartblocks.png';
import Users from '@/assets/images/dashboard/Users.png';


const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const DashboardBuilderManager = () => {
  const { message } = App.useApp();
  const [dashboards, setDashboards] = useState([]);
  const [savedWidgets, setSavedWidgets] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Currently editing / designing dashboard (null if in list view)
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, widgetRes, rolesData] = await Promise.all([
        getCustomDashboards(),
        getAllPivotReports(),
        getAvailableRoles(),
      ]);

      if (dashRes.data?.status) {
        setDashboards(dashRes.data.data || []);
      }
      if (widgetRes.data?.status) {
        setSavedWidgets(widgetRes.data.data || []);
      }
      setRoles(rolesData || []);
    } catch (err) {
      console.error('Failed to load dashboard builder data', err);
      message.error('Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNew = () => {
    setCurrentDashboard({
      tdb_name: '',
      tdb_description: '',
      tdb_roles: [],
      tdb_widgets_layout: [],
      tdb_is_active: true,
      tdb_is_default: false,
    });
    setIsCreating(true);
  };

  const handleEdit = (item) => {
    setCurrentDashboard(item);
    setIsCreating(false);
  };

  const handleSaveDashboard = async (payload) => {
    try {
      const isDraft = payload.is_active === false;
      if (isCreating) {
        const res = await createCustomDashboard(payload);
        if (res.data?.status) {
          message.success(
            isDraft
              ? 'Dashboard saved as draft successfully!'
              : 'Dashboard created and published successfully!'
          );
          setCurrentDashboard(null);
          setIsCreating(false);
          fetchData();
        }
      } else {
        const res = await updateCustomDashboard(currentDashboard.tdb_id, payload);
        if (res.data?.status) {
          message.success(
            isDraft
              ? 'Dashboard saved as draft successfully!'
              : 'Dashboard updated and published successfully!'
          );
          setCurrentDashboard(null);
          fetchData();
        }
      }
    } catch (err) {
      console.error('Save error', err);
      message.error(err.response?.data?.message || 'Failed to save dashboard');
    }
  };

  const handleToggleStatus = async (id, e) => {
    e?.stopPropagation();
    try {
      const res = await toggleCustomDashboardStatus(id);
      if (res.data?.status) {
        message.success(res.data.message || 'Status updated');
        fetchData();
      }
    } catch (err) {
      message.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteCustomDashboard(id);
      if (res.data?.status) {
        message.success('Dashboard deleted');
        fetchData();
      }
    } catch (err) {
      message.error('Failed to delete dashboard');
    }
  };

  const handleDuplicate = async (item, e) => {
    e?.stopPropagation();
    try {
      const payload = {
        name: `${item.tdb_name} (Copy)`,
        description: item.tdb_description,
        roles: item.tdb_roles || [],
        widgets_layout: item.tdb_widgets_layout || [],
        is_active: true,
        is_default: false,
      };
      const res = await createCustomDashboard(payload);
      if (res.data?.status) {
        message.success(`Duplicated "${item.tdb_name}"`);
        fetchData();
      }
    } catch (err) {
      message.error('Failed to duplicate dashboard');
    }
  };

  // Filtered dashboards
  const parseRoles = (rolesField) => {
    if (!rolesField) return [];
    if (Array.isArray(rolesField)) return rolesField;
    if (typeof rolesField === 'string') {
      try {
        const parsed = JSON.parse(rolesField);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getRoleName = (roleOrObj) => {
    if (!roleOrObj) return '';
    if (typeof roleOrObj === 'object') {
      if (roleOrObj.role_name) return roleOrObj.role_name;
      if (roleOrObj.name) return roleOrObj.name;
      const id = roleOrObj.role_id ?? roleOrObj.id;
      if (id !== undefined && id !== null) {
        const matched = roles.find((r) => String(r.id || r.role_id) === String(id));
        return matched ? (matched.name || matched.role_name) : `Role #${id}`;
      }
      return 'Unknown Role';
    }
    const matched = roles.find((r) => String(r.id || r.role_id) === String(roleOrObj));
    return matched ? (matched.name || matched.role_name) : `Role #${roleOrObj}`;
  };

  const getRoleId = (roleOrObj, fallbackIndex) => {
    if (typeof roleOrObj === 'object' && roleOrObj !== null) {
      return roleOrObj.role_id ?? roleOrObj.id ?? fallbackIndex;
    }
    return roleOrObj ?? fallbackIndex;
  };

  const filteredDashboards = dashboards.filter((d) => {
    const matchesSearch =
      (d.tdb_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.tdb_description || '').toLowerCase().includes(search.toLowerCase());

    const assignedRoles = parseRoles(d.tdb_roles);
    const matchesRole =
      roleFilter === 'all' ||
      assignedRoles.some((r) => {
        if (typeof r === 'object' && r !== null) {
          const id = r.role_id ?? r.id;
          return String(id) === String(roleFilter);
        }
        return String(r) === String(roleFilter);
      });

    return matchesSearch && matchesRole;
  });

  return (
    <div className="conf-page-container">
      {/* Top Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <DashboardOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Dashboards</h1>
            <p className="conf-page-subtitle">Create role-wise dashboards and design visual layouts with drag-and-drop widgets</p>
          </div>
        </div>

        <Space size="middle">
          <Button icon={<ReloadOutlined />} onClick={fetchData} className="conf-action-outline-btn" style={{ height: 40 }}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={handleCreateNew}
            className="conf-create-btn"
          >
            Create New Dashboard
          </Button>
        </Space>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-boxs">
               <Image src={TotalWidgets} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Dashboards</span>
            <span className="conf-stat-val">{dashboards.length}</span>
            <span className="conf-stat-sub">Custom designed boards</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-boxs">
               <Image src={Dashboards} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Active Dashboards</span>
            <span className="conf-stat-val">{dashboards.filter(d => d.tdb_is_active).length}</span>
            <span className="conf-stat-sub">Published to user roles</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-boxs">
              <Image src={Chartblocks} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Available Widgets</span>
            <span className="conf-stat-val">{savedWidgets.length}</span>
            <span className="conf-stat-sub">Configured KPI/Chart blocks</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-boxs">
           <Image src={Users} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Target Roles</span>
            <span className="conf-stat-val">{roles.length}</span>
            <span className="conf-stat-sub">Authorized system roles</span>
          </div>
        </div>
      </div>

      {/* Filter and Content Area */}
      <div>
        <div className="conf-toolbar">
          <div className="conf-toolbar-left">
            <div className="conf-pill-tab active">
              <span>All Dashboards</span>
              <span className="conf-pill-count">{filteredDashboards.length}</span>
            </div>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 180 }}
              className="conf-role-select"
            >
              <Option value="all">All Roles</Option>
              {roles.map((r) => (
                <Option key={r.id} value={r.id}>
                  {r.name}
                </Option>
              ))}
            </Select>
          </div>

          <div className="conf-toolbar-right">
            <Input
              placeholder="Search dashboards..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="conf-search-input"
              allowClear
            />

            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'table', icon: <UnorderedListOutlined />, label: 'List' },
                { value: 'grid', icon: <AppstoreOutlined />, label: 'Grid' },
              ]}
              className="db-view-toggle"
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', color: '#64748b' }}>Loading custom dashboards...</div>
          </div>
        ) : filteredDashboards.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={5} style={{ color: '#64748b' }}>
                  No Dashboards Found
                </Title>
                <Text type="secondary">
                  Click the <b>"Create New Dashboard"</b> button to design your first role-wise dashboard.
                </Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateNew}
              className="conf-create-btn"
            >
              Create Dashboard
            </Button>
          </Empty>
        ) : viewMode === 'table' ? (
          <div className="conf-card-table">
            <Table
              dataSource={filteredDashboards}
              rowKey="tdb_id"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} dashboards` }}
              columns={[
                {
                  title: '#',
                  key: 'index',
                  width: 70,
                  align: 'center',
                  sorter: (a, b) => (a.tdb_id || 0) - (b.tdb_id || 0),
                  render: (_, __, idx) => (
                    <span className="conf-index-badge">
                      {idx + 1}
                    </span>
                  ),
                },
                {
                  title: 'Dashboard Name',
                  key: 'name',
                  sorter: (a, b) => (a.tdb_name || "").localeCompare(b.tdb_name || ""),
                  render: (dash) => (
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        {dash.tdb_name}
                      </div>
                      {dash.tdb_description && (
                        <div style={{ color: "#64748b", fontSize: 12 }}>{dash.tdb_description}</div>
                      )}
                    </div>
                  ),
                },
                {
                  title: 'Assigned Roles',
                  key: 'roles',
                  render: (dash) => {
                    const assignedRoles = parseRoles(dash.tdb_roles);
                    if (assignedRoles.length === 0) return <Tag color="default">All Roles</Tag>;
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {assignedRoles.slice(0, 2).map((r, idx) => (
                          <Tag color="purple" key={getRoleId(r, idx)}>
                            {getRoleName(r)}
                          </Tag>
                        ))}
                        {assignedRoles.length > 2 && (
                          <Tag color="default">+{assignedRoles.length - 2} more</Tag>
                        )}
                      </div>
                    );
                  },
                },
                {
                  title: 'Widgets',
                  key: 'widgets',
                  align: 'center',
                  sorter: (a, b) => ((a.tdb_widgets_layout || []).length) - ((b.tdb_widgets_layout || []).length),
                  render: (dash) => {
                    const count = (dash.tdb_widgets_layout || []).length;
                    return (
                      <Tag color="cyan" icon={<AppstoreOutlined />}>
                        {count} Widget{count !== 1 ? 's' : ''}
                      </Tag>
                    );
                  },
                },
                {
                  title: 'Default Landing',
                  key: 'is_default',
                  align: 'center',
                  sorter: (a, b) => (a.tdb_is_default ? 1 : 0) - (b.tdb_is_default ? 1 : 0),
                  render: (dash) => (
                    <span className={dash.tdb_is_default ? "conf-badge-master-yes" : "conf-badge-master-no"}>
                      {dash.tdb_is_default ? 'YES' : 'NO'}
                    </span>
                  ),
                },
                {
                  title: 'Status',
                  key: 'status',
                  align: 'center',
                  sorter: (a, b) => (a.tdb_is_active ? 1 : 0) - (b.tdb_is_active ? 1 : 0),
                  render: (dash) => (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span className={dash.tdb_is_active ? "conf-badge-published" : "conf-badge-draft"}>
                        {dash.tdb_is_active ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                      <Switch
                        checked={dash.tdb_is_active}
                        size="small"
                        onChange={(val, e) => handleToggleStatus(dash.tdb_id, e)}
                      />
                    </div>
                  ),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  align: 'center',
                  render: (dash) => (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Tooltip title="Edit Canvas" color="#7c3aed">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEdit(dash)}
                          className="db-action-btn db-action-edit-btn"
                        />
                      </Tooltip>
                      <Tooltip title="Duplicate" color="#2563eb">
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={(e) => handleDuplicate(dash, e)}
                          className="db-action-btn db-action-copy-btn"
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Delete dashboard?"
                        description="Are you sure you want to delete this dashboard?"
                        onConfirm={() => handleDelete(dash.tdb_id)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Delete" color="#dc2626">
                          <Button size="small" icon={<DeleteOutlined />} className="db-action-btn db-action-delete-btn" />
                        </Tooltip>
                      </Popconfirm>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        ) : (
          <Row gutter={[20, 20]}>
            {filteredDashboards.map((dash) => {
              const widgetCount = (dash.tdb_widgets_layout || []).length;
              const assignedRoles = parseRoles(dash.tdb_roles);

              return (
                <Col xs={24} sm={12} lg={8} xl={6} key={dash.tdb_id}>
                  <Card
                    hoverable
                    className="db-list-card"
                    styles={{
                      body: { padding: 0 },
                    }}
                    onClick={() => handleEdit(dash)}
                  >
                    <div className="db-card-body">
                      {/* Header row */}
                      <div className="db-card-header">
                        <div className="db-card-title-group">
                          <div className="db-card-icon-box">
                            <DashboardOutlined />
                          </div>
                          <div>
                            <div className="db-card-title">{dash.tdb_name}</div>
                            {dash.tdb_is_default && (
                              <Tag color="blue" className="db-card-default-tag">
                                Default Landing
                              </Tag>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={dash.tdb_is_active}
                          size="small"
                          onChange={(val, e) => handleToggleStatus(dash.tdb_id, e)}
                          title="Toggle active status"
                          onClick={(checked, e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Description */}
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        className="db-card-description"
                      >
                        {dash.tdb_description || 'No description provided.'}
                      </Paragraph>

                      {/* Role Access */}
                      <div className="db-card-roles">
                        <div className="db-card-roles-label">
                          <TeamOutlined /> Role Access:
                        </div>
                        <div className="db-card-roles-tags">
                          {assignedRoles.length === 0 ? (
                            <Tag className="db-role-tag db-role-tag--all">All Roles</Tag>
                          ) : (
                            assignedRoles.slice(0, 3).map((r, idx) => (
                              <Tag color="purple" key={getRoleId(r, idx)} className="db-role-tag">
                                {getRoleName(r)}
                              </Tag>
                            ))
                          )}
                          {assignedRoles.length > 3 && (
                            <Tag color="default" className="db-role-tag">
                              +{assignedRoles.length - 3} more
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="db-card-footer" onClick={(e) => e.stopPropagation()}>
                      <Tag icon={<AppstoreOutlined />} className="db-widget-count-tag">
                        {widgetCount} Widget{widgetCount !== 1 ? 's' : ''}
                      </Tag>

                      <div className="db-card-actions">
                        <Tooltip title="Edit Canvas" color="#7c3aed">
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            className="db-action-btn db-action-edit-btn"
                            onClick={(e) => { e.stopPropagation(); handleEdit(dash); }}
                          />
                        </Tooltip>
                        <Tooltip title="Duplicate" color="#2563eb">
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            className="db-action-btn db-action-copy-btn"
                            onClick={(e) => handleDuplicate(dash, e)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Delete dashboard"
                          description="Are you sure you want to delete this dashboard?"
                          onConfirm={() => handleDelete(dash.tdb_id)}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Delete" color="#dc2626">
                            <Button
                              size="small"
                              icon={<DeleteOutlined />}
                              className="db-action-btn db-action-delete-btn"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Full Width Full Screen Modal for Add / Edit Dashboard Designer */}
      <Modal
        className="db-designer-fullscreen-modal"
        rootClassName="db-designer-fullscreen-modal-root"
        open={currentDashboard !== null}
        onCancel={() => {
          setCurrentDashboard(null);
          setIsCreating(false);
        }}
        footer={null}
        closable={false}
        width="100vw"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: 0,
          margin: 0,
          maxWidth: '100vw',
          width: '100vw',
          height: '100vh',
        }}
        styles={{
          wrapper: {
            overflow: 'hidden',
            padding: 0,
            margin: 0,
          },
          body: {
            padding: 0,
            margin: 0,
            height: '100vh',
            maxHeight: '100vh',
            width: '100vw',
            maxWidth: '100vw',
            overflow: 'hidden',
          },
          content: {
            padding: 0,
            margin: 0,
            borderRadius: 0,
            height: '100vh',
            maxHeight: '100vh',
            width: '100vw',
            maxWidth: '100vw',
          },
        }}
        destroyOnHidden
      >
        {currentDashboard !== null && (
          <DashboardCanvasDesigner
            dashboard={currentDashboard}
            savedWidgets={savedWidgets}
            roles={roles}
            onSave={handleSaveDashboard}
            onCancel={() => {
              setCurrentDashboard(null);
              setIsCreating(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default DashboardBuilderManager;
