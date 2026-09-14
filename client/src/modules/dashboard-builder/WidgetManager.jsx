import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  Tag,
  Switch,
  Space,
  Typography,
  Popconfirm,
  App,
  Segmented,
  Table,
  Spin,
  Empty,
  Badge,
  Modal,
  Alert,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  AreaChartOutlined,
  TableOutlined,
  FireOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  NumberOutlined,
  WarningFilled,
  DashboardOutlined,PlusCircleOutlined,
  ExclamationCircleFilled,
  ArrowRightOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import {
  getAllPivotReports,
  deletePivotReport,
  togglePivotReportStatus,
} from '@/services/pivot-service';
import { getCustomDashboards } from '@/services/dashboard-builder-service';
import { useNavigate } from '@/hooks/useNextRouter';
import PivotDashboard from '@/modules/pivot-dashboard/PivotDashboard';
import './WidgetManager.css';
import './DashboardBuilder.css';
import Image from "next/image";
import TotalWidgets from '@/assets/images/dashboard/TotalWidgets.png';
import ActiveWidgets from '@/assets/images/dashboard/ActiveWidgets.png';
import DatabaseViews from '@/assets/images/dashboard/DatabaseViews.png';
import KPIMetric from '@/assets/images/dashboard/KPIMetric.png';

const { Title, Text } = Typography;

const getChartTypeMeta = (type) => {
  switch (type) {
    case 'kpi_card':
      return { label: 'KPI Card', icon: <NumberOutlined />, color: '#0d9488', bg: '#f0fdfa' };
    case 'bar':
      return { label: 'Bar Chart', icon: <BarChartOutlined />, color: '#0284c7', bg: '#f0f9ff' };
    case 'pie':
      return { label: 'Pie Chart', icon: <PieChartOutlined />, color: '#db2777', bg: '#fdf2f8' };
    case 'doughnut':
      return { label: 'Doughnut', icon: <PieChartOutlined />, color: '#7c3aed', bg: '#faf5ff' };
    case 'line':
      return { label: 'Line Chart', icon: <LineChartOutlined />, color: '#059669', bg: '#f0fdf4' };
    case 'area':
      return { label: 'Area Chart', icon: <AreaChartOutlined />, color: '#d97706', bg: '#fffbeb' };
    case 'heatmap':
      return { label: 'Heatmap', icon: <FireOutlined />, color: '#e11d48', bg: '#fff1f2' };
    default:
      return { label: 'Pivot Table', icon: <TableOutlined />, color: 'var(--primary-color, #15803d)', bg: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.08)' };
  }
};

const WidgetManager = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [viewFilter, setViewFilter] = useState('ALL');
  const [displayMode, setDisplayMode] = useState('table'); // 'table' | 'grid'

  // Dependency Warning Modal (AWS style)
  const [dependencyModal, setDependencyModal] = useState({
    visible: false,
    widgetTitle: '',
    dashboards: [],
  });

  // Editor mode
  const [editingWidget, setEditingWidget] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchWidgets = async () => {
    setLoading(true);
    try {
      const [widgetRes, dashRes] = await Promise.allSettled([
        getAllPivotReports(),
        getCustomDashboards(),
      ]);
      if (widgetRes.status === 'fulfilled' && widgetRes.value.data?.status) {
        setWidgets(widgetRes.value.data.data || []);
      }
      if (dashRes.status === 'fulfilled' && dashRes.value.data?.status) {
        setDashboards(dashRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load widgets', err);
      message.error('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  const getWidgetDashboards = (widgetId) => {
    if (!widgetId || !Array.isArray(dashboards)) return [];
    const targetIdStr = String(widgetId).trim().toLowerCase();

    const traverse = (node) => {
      if (!node || typeof node !== 'object') return false;
      if (Array.isArray(node)) {
        return node.some((el) => traverse(el));
      }
      const possibleIds = [
        node.widgetId,
        node.widget_id,
        node.tcdw_id,
        node.tdw_id,
        node.tpsr_id,
        node.type === 'library-widget' ? node.id : null,
        node.widget ? (node.widget.id || node.widget.tcdw_id || node.widget.tpsr_id) : null,
        node.widgetId || (node.table_name && node.id ? node.id : null),
      ].filter(Boolean);

      for (const pid of possibleIds) {
        if (String(pid).trim().toLowerCase() === targetIdStr) {
          return true;
        }
      }

      if (node.instanceId && node.id && String(node.id).trim().toLowerCase() === targetIdStr) {
        return true;
      }

      for (const key of Object.keys(node)) {
        const val = node[key];
        if (val && typeof val === 'object') {
          if (traverse(val)) return true;
        }
      }
      return false;
    };

    return dashboards.filter((d) => {
      if (!d || d.tdb_deleted_at) return false;
      let layout = d.tdb_widgets_layout;
      if (typeof layout === 'string') {
        try {
          layout = JSON.parse(layout);
        } catch {
          return false;
        }
      }
      return traverse(layout);
    });
  };

  const onRequestDelete = (widget, e) => {
    e?.stopPropagation();
    const widgetId = widget.id || widget.tcdw_id || widget.tdw_id || widget.tpsr_id;
    const title = widget.title || widget.report_name || widget.tdw_title || widget.tpsr_report_name || 'Widget';
    const attachedDashboards = getWidgetDashboards(widgetId);

    if (attachedDashboards.length > 0) {
      setDependencyModal({
        visible: true,
        widgetTitle: title,
        dashboards: attachedDashboards,
      });
      return true;
    }
    return false;
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      const res = await deletePivotReport(id);
      if (res.data?.status) {
        message.success('Widget deleted successfully');
        fetchWidgets();
      } else {
        if (res.data?.code === 'WIDGET_IN_USE' || res.data?.data?.dashboards) {
          setDependencyModal({
            visible: true,
            widgetTitle: 'Widget',
            dashboards: res.data?.data?.dashboards || [],
          });
        } else {
          message.error(res.data?.message || 'Failed to delete widget');
        }
      }
    } catch (err) {
      const respData = err?.response?.data;
      if (respData?.code === 'WIDGET_IN_USE' || respData?.data?.dashboards) {
        setDependencyModal({
          visible: true,
          widgetTitle: 'Widget',
          dashboards: respData?.data?.dashboards || [],
        });
      } else {
        console.error('Delete error', err);
        message.error(respData?.message || 'Failed to delete widget');
      }
    }
  };

  const handleToggleStatus = async (id, e) => {
    e?.stopPropagation();
    try {
      const res = await togglePivotReportStatus(id);
      if (res.data?.status) {
        message.success('Widget status updated');
        fetchWidgets();
      }
    } catch (err) {
      console.error('Status toggle error', err);
      message.error('Failed to update status');
    }
  };

  // Extract unique database views for filter dropdown
  const uniqueViews = [
    ...new Set(
      widgets.map((w) => w.table_name || w.tcdw_table_name || w.tdw_table_name || w.tpsr_table_name).filter(Boolean)
    ),
  ];

  // Filtered widgets
  const filteredWidgets = widgets.filter((w) => {
    const title = w.title || w.report_name || w.tcdw_title || w.tdw_title || w.tpsr_report_name || '';
    const tableName = w.table_name || w.tcdw_table_name || w.tdw_table_name || w.tpsr_table_name || '';

    const matchSearch =
      !searchText.trim() ||
      title.toLowerCase().includes(searchText.toLowerCase()) ||
      tableName.toLowerCase().includes(searchText.toLowerCase());

    const matchView = viewFilter === 'ALL' || tableName === viewFilter;
    return matchSearch && matchView;
  });
  const activeCount = widgets.filter((w) => (w.is_active ?? w.tcdw_is_active ?? w.tdw_is_active ?? w.tpsr_is_active)).length;
  const kpiCount = widgets.filter((w) => (w.chart_type || w.tcdw_chart_type || w.tdw_chart_type || w.tpsr_chart_type) === 'kpi_card').length;

  return (
    <div className="conf-page-container">
      {/* 1. Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <AppstoreAddOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Dashboard Wizard & Widgets</h1>
            <p className="conf-page-subtitle">Create, design, and manage database view charts, pivot tables, and KPI stat cards for dashboards.</p>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={() => {
            setEditingWidget(null);
            setIsCreating(true);
          }}
          className="conf-create-btn"
        >
          Create New Widget
        </Button>
      </div>

      {/* 2. 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-boxs">
            <Image src={TotalWidgets} alt="CSR Dashboard UI" className="total-widgets-icon" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Widgets</span>
            <span className="conf-stat-val">{widgets.length}</span>
            <span className="conf-stat-sub">Defined charts & KPIs</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-boxs">
             <Image src={ActiveWidgets} alt="CSR Dashboard UI" className="active-widgets-icon" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Active Widgets</span>
            <span className="conf-stat-val">{activeCount}</span>
            <span className="conf-stat-sub">Live on dashboards</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-boxs">
            <Image src={DatabaseViews} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Database Views</span>
            <span className="conf-stat-val">{uniqueViews.length}</span>
            <span className="conf-stat-sub">Data source views</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-boxs">
             <Image src={KPIMetric} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">KPI Metric Cards</span>
            <span className="conf-stat-val">{kpiCount}</span>
            <span className="conf-stat-sub">Quick metric blocks</span>
          </div>
        </div>
      </div>

      {/* 3. Controls Filter Bar */}
      <div className="conf-toolbar">
        <div className="conf-toolbar-left">
          <div className="conf-pill-tab active">
            <span>All Widgets</span>
            <span className="conf-pill-count">{filteredWidgets.length}</span>
          </div>

          <Select
            value={viewFilter}
            onChange={setViewFilter}
            style={{ width: 220 }}
            options={[
              { label: 'All Database Views', value: 'ALL' },
              ...uniqueViews.map((v) => ({ label: v, value: v })),
            ]}
          />
        </div>

        <div className="conf-toolbar-right">
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search widget name or view..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="conf-search-input"
            allowClear
          />

          <Segmented
            options={[
              { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
              { label: 'List', value: 'table', icon: <UnorderedListOutlined /> },
            ]}
            value={displayMode}
            onChange={setDisplayMode}
            className="wm-view-toggle"
          />
        </div>
      </div>

      {/* 4. Widgets List or Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredWidgets.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '60px 20px',
            textAlign: 'center',
          }}
        >
          <Empty
            description={
              <div>
                <Title level={5} style={{ color: '#64748b' }}>
                  No widgets found
                </Title>
                <Text type="secondary">
                  Click "Create New Widget" to build custom charts, pivot reports, and KPI count cards.
                </Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingWidget(null);
                setIsCreating(true);
              }}
              className="conf-create-btn"
              style={{ marginTop: 12 }}
            >
              Create New Widget
            </Button>
          </Empty>
        </div>
      ) : displayMode === 'table' ? (
        <div className="conf-card-table">
          <Table
            dataSource={filteredWidgets.map((w, idx) => ({ ...w, key: w.id || w.tdw_id || w.tpsr_id || `row-${idx}` }))}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} widgets` }}
            columns={[
              {
                title: '#',
                key: 'index',
                width: 70,
                align: 'center',
                sorter: (a, b) => ((a.id || a.tdw_id || a.tpsr_id || 0)) - ((b.id || b.tdw_id || b.tpsr_id || 0)),
                render: (_, __, idx) => (
                  <span className="conf-index-badge">
                    {idx + 1}
                  </span>
                ),
              },
              {
                title: 'Widget Name',
                dataIndex: 'title',
                sorter: (a, b) => {
                  const nameA = a.title || a.report_name || a.tdw_title || a.tpsr_report_name || '';
                  const nameB = b.title || b.report_name || b.tdw_title || b.tpsr_report_name || '';
                  return nameA.localeCompare(nameB);
                },
                render: (txt, r) => {
                  const chartType = r.chart_type || r.tdw_chart_type || r.tpsr_chart_type;
                  const name = txt || r.report_name || r.tdw_title || r.tpsr_report_name;
                  const meta = getChartTypeMeta(chartType);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 15,
                        }}
                      >
                        {meta.icon}
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>{name}</span>
                    </div>
                  );
                },
              },
              {
                title: 'Database View',
                dataIndex: 'table_name',
                sorter: (a, b) => {
                  const tblA = a.table_name || a.tdw_table_name || a.tpsr_table_name || '';
                  const tblB = b.table_name || b.tdw_table_name || b.tpsr_table_name || '';
                  return tblA.localeCompare(tblB);
                },
                render: (tbl, r) => (
                  <span className="conf-slug-code" style={{ color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: 4 }}>
                    {tbl || r.tdw_table_name || r.tpsr_table_name}
                  </span>
                ),
              },
              {
                title: 'Visual Style',
                dataIndex: 'chart_type',
                sorter: (a, b) => {
                  const ctA = a.chart_type || a.tdw_chart_type || a.tpsr_chart_type || '';
                  const ctB = b.chart_type || b.tdw_chart_type || b.tpsr_chart_type || '';
                  return ctA.localeCompare(ctB);
                },
                render: (ct, r) => {
                  const chartType = ct || r.tdw_chart_type || r.tpsr_chart_type;
                  const meta = getChartTypeMeta(chartType);
                  return (
                    <span
                      className="wm-badge-type"
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        borderColor: typeof meta.color === 'string' && !meta.color.startsWith('var') ? `${meta.color}40` : undefined,
                      }}
                    >
                      {meta.label}
                    </span>
                  );
                },
              },
              {
                title: 'Dashboards',
                key: 'dashboards',
                render: (_, r) => {
                  const widgetId = r.id || r.tdw_id || r.tpsr_id;
                  const attached = getWidgetDashboards(widgetId);
                  if (attached.length === 0) {
                    return <Text type="secondary" style={{ fontSize: '12px' }}>—</Text>;
                  }
                  return (
                    <div
                      className="wm-dashboard-link-pill active"
                      style={{ cursor: 'pointer', display: 'inline-flex' }}
                      onClick={() => {
                        const title = r.title || r.report_name || r.tdw_title || r.tpsr_report_name || 'Widget';
                        setDependencyModal({
                          visible: true,
                          widgetTitle: title,
                          dashboards: attached,
                        });
                      }}
                    >
                      <DashboardOutlined />
                      <span>{attached.length} Dashboard{attached.length > 1 ? 's' : ''}</span>
                    </div>
                  );
                },
              },
              {
                title: 'Status',
                dataIndex: 'is_active',
                align: 'center',
                sorter: (a, b) => {
                  const actA = (a.is_active ?? a.tdw_is_active ?? a.tpsr_is_active ?? true) ? 1 : 0;
                  const actB = (b.is_active ?? b.tdw_is_active ?? b.tpsr_is_active ?? true) ? 1 : 0;
                  return actA - actB;
                },
                render: (active, r) => {
                  const isActive = active ?? r.tdw_is_active ?? r.tpsr_is_active ?? true;
                  const widgetId = r.id || r.tdw_id || r.tpsr_id;
                  return (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span className={isActive ? "conf-badge-published" : "conf-badge-draft"}>
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <Switch
                        size="small"
                        checked={isActive}
                        onChange={() => handleToggleStatus(widgetId)}
                      />
                    </div>
                  );
                },
              },
              {
                title: 'Actions',
                key: 'actions',
                align: 'center',
                render: (_, r) => {
                  const widgetId = r.id || r.tdw_id || r.tpsr_id;
                  const attached = getWidgetDashboards(widgetId);
                  return (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Tooltip title="Edit" color="#7c3aed">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setEditingWidget(r)}
                          className="wm-action-btn wm-action-edit-btn"
                        />
                      </Tooltip>
                      {attached.length > 0 ? (
                        <Tooltip title="Widget is in use by dashboards" color="#dc2626">
                          <Button
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(e) => onRequestDelete(r, e)}
                            className="wm-action-btn wm-action-delete-btn"
                          />
                        </Tooltip>
                      ) : (
                        <Popconfirm
                          title="Delete Widget"
                          description="Are you sure you want to delete this widget?"
                          onConfirm={(e) => handleDelete(widgetId, e)}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Delete" color="#dc2626">
                            <Button
                              size="small"
                              icon={<DeleteOutlined />}
                              className="wm-action-btn wm-action-delete-btn"
                            />
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      ) : (
        <div className="wm-grid">
          {filteredWidgets.map((w, idx) => {
            const chartType = w.chart_type || w.tdw_chart_type || w.tpsr_chart_type || 'bar';
            const meta = getChartTypeMeta(chartType);
            let conf = w.configuration || w.tdw_configuration || w.tpsr_configuration || {};
            if (typeof conf === 'string') {
              try { conf = JSON.parse(conf); } catch (e) { conf = {}; }
            }
            const rows = Array.isArray(conf.rows) ? conf.rows : [];
            const cols = Array.isArray(conf.columns) ? conf.columns : [];
            const vals = Array.isArray(conf.values) ? conf.values : [];
            const title = w.title || w.report_name || w.tdw_title || w.tpsr_report_name || 'Widget';
            const tableName = w.table_name || w.tdw_table_name || w.tpsr_table_name || '';
            const isActive = w.is_active ?? w.tdw_is_active ?? w.tpsr_is_active ?? true;
            const widgetId = w.id || w.tdw_id || w.tpsr_id || `widget-${idx}`;
            const attachedDashboards = getWidgetDashboards(widgetId);
            const isAttached = attachedDashboards.length > 0;

            return (
              <div
                key={widgetId}
                className="wm-card"
                onClick={() => setEditingWidget(w)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <div className="wm-card-top">
                    <div className="wm-card-title-group">
                      <div
                        className="wm-card-icon-box"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.icon}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="wm-card-title">{title}</div>
                        <div className="wm-card-subtitle">{tableName}</div>
                      </div>
                    </div>
                    <span
                      className="wm-badge-type"
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        borderColor: typeof meta.color === 'string' && !meta.color.startsWith('var') ? `${meta.color}40` : undefined,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="wm-card-metrics">
                    <div className="wm-metric-pill">
                      <span className="wm-metric-label">Dimensions</span>
                      <span className="wm-metric-val">
                        {[...rows, ...cols].length || 0} fields
                      </span>
                    </div>
                    <div className="wm-metric-pill">
                      <span className="wm-metric-label">Aggregates</span>
                      <span className="wm-metric-val">{vals.length || 0} metrics</span>
                    </div>
                  </div>

                  <div className="wm-card-dashboards">
                    {isAttached ? (
                      <div
                        className="wm-dashboard-link-pill active"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDependencyModal({
                            visible: true,
                            widgetTitle: title,
                            dashboards: attachedDashboards,
                          });
                        }}
                      >
                        <DashboardOutlined />
                        <span>Used in {attachedDashboards.length} Dashboard{attachedDashboards.length > 1 ? 's' : ''}</span>
                      </div>
                    ) : (
                      <div className="wm-dashboard-link-pill unlinked">
                        <span>Not linked to any dashboard</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="wm-card-footer" onClick={(e) => e.stopPropagation()}>
                  <div className="wm-footer-status">
                    <Switch
                      size="small"
                      checked={isActive}
                      onChange={() => handleToggleStatus(widgetId)}
                    />
                    <span className={`wm-status-label ${isActive ? 'wm-status-label--active' : 'wm-status-label--inactive'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="wm-footer-actions">
                    <Tooltip title="Edit">
                      <Button
                        icon={<EditOutlined />}
                        size="small"
                        className="wm-action-btn wm-action-edit-btn"
                        onClick={() => setEditingWidget(w)}
                      />
                    </Tooltip>
                    {isAttached ? (
                      <Tooltip title="Widget is in use by dashboards">
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          className="wm-action-btn wm-action-delete-btn"
                          onClick={(e) => onRequestDelete(w, e)}
                        />
                      </Tooltip>
                    ) : (
                      <Popconfirm
                        title="Delete Widget"
                        description="Are you sure you want to delete this widget?"
                        onConfirm={(e) => handleDelete(widgetId, e)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Delete">
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            className="wm-action-btn wm-action-delete-btn"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. AWS-Style Dependency Warning Modal */}
      <Modal
        open={dependencyModal.visible}
        onCancel={() => setDependencyModal({ visible: false, widgetTitle: '', dashboards: [] })}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              <WarningFilled />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                Cannot Delete Widget (Dependency Conflict)
              </div>
              <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
                Resource is currently referenced by other platform components
              </div>
            </div>
          </div>
        }
        footer={[
          <Button
            key="close"
            onClick={() => setDependencyModal({ visible: false, widgetTitle: '', dashboards: [] })}
          >
            Close
          </Button>,
          <Button
            key="goto"
            type="primary"
            icon={<DashboardOutlined />}
            style={{ background: '#15803d', borderColor: '#15803d', fontWeight: 600 }}
            onClick={() => {
              setDependencyModal({ visible: false, widgetTitle: '', dashboards: [] });
              navigate('/configurator/dashboard-builder/dashboards');
            }}
          >
            Go to Dashboards Manager
          </Button>,
        ]}
        width={620}
        destroyOnHidden
      >
        <div style={{ paddingTop: '8px' }}>
          {/* AWS Style Amber Callout Notice */}
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '13px', marginBottom: '4px' }}>
              Resource in use: Attached to {dependencyModal.dashboards.length} Dashboard{dependencyModal.dashboards.length > 1 ? 's' : ''}
            </div>
            <div style={{ color: '#b45309', fontSize: '12.5px', lineHeight: 1.5 }}>
              Widget <b>"{dependencyModal.widgetTitle}"</b> cannot be deleted because it is actively placed inside the custom dashboard layout(s) listed below. To delete this widget, you must first remove it from each dashboard in Dashboard Builder and save changes.
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Associated Dashboards ({dependencyModal.dashboards.length})</span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>
                Action required before deletion
              </span>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <Table
                size="small"
                pagination={dependencyModal.dashboards.length > 4 ? { pageSize: 4 } : false}
                dataSource={dependencyModal.dashboards.map((d, i) => ({
                  ...d,
                  key: d.id || d.tdb_id || `dash-${i}`,
                }))}
                columns={[
                  {
                    title: 'Dashboard Name',
                    dataIndex: 'tdb_name',
                    render: (name, r) => (
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                          {name || r.name || 'Custom Dashboard'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          ID: {r.tdb_id || r.id}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'tdb_is_active',
                    width: 100,
                    render: (act, r) => {
                      const isActive = act ?? r.is_active ?? true;
                      return (
                        <Badge
                          status={isActive ? 'success' : 'default'}
                          text={isActive ? 'Active' : 'Inactive'}
                        />
                      );
                    },
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    align: 'right',
                    width: 150,
                    render: (_, r) => (
                      <Button
                        size="small"
                        type="link"
                        icon={<ArrowRightOutlined />}
                        style={{ color: '#2563eb', padding: 0, fontWeight: 500 }}
                        onClick={() => {
                          setDependencyModal({ visible: false, widgetTitle: '', dashboards: [] });
                          navigate('/configurator/dashboard-builder/dashboards');
                        }}
                      >
                        Edit Dashboard
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Full Width Full Screen Modal for Add / Edit Widget Wizard matching Dashboards page */}
      <Modal
        className="db-designer-fullscreen-modal"
        rootClassName="db-designer-fullscreen-modal-root"
        open={isCreating || editingWidget !== null}
        onCancel={() => {
          setEditingWidget(null);
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
        {(isCreating || editingWidget !== null) && (
          <PivotDashboard
            editingReport={editingWidget}
            onBack={() => {
              setEditingWidget(null);
              setIsCreating(false);
              fetchWidgets();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default WidgetManager;
