'use client';

import React, { useState, useEffect } from 'react';
import {
  Row, Col, Table, Tag, Typography, Space, Badge, Progress,
  Button, Spin, Empty, Statistic, Tooltip
} from 'antd';
import {
  FormOutlined, SettingOutlined, MenuOutlined,
  FileProtectOutlined, ArrowRightOutlined,
  PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ProjectOutlined, UserOutlined, DollarOutlined, FileTextOutlined,
  AppstoreOutlined, ReloadOutlined, BarChartOutlined, PieChartOutlined,
  PieChartTwoTone
} from '@ant-design/icons';
import { privateHttpClient } from '@/services/api/httpClient';
import {
  getDashboardCountsAPI,
  getProjectCountThemeWiseAPI,
  getProposalCountThemeWiseAPI,
  getBudgetDetailsAPI
} from '@/services/dashboard-service';
import { useSettings } from '@/context/SettingsContext';
import * as AntdIcons from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

const gradientCard = (from, to) => ({
  background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  borderRadius: 14,
  border: 'none',
  color: '#fff',
});

const glassCard = {
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: 14,
  border: '1px solid rgba(226, 232, 240, 0.8)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
};

function MenuIcon({ iconStr, style }) {
  if (!iconStr) return <AppstoreOutlined style={style} />;
  const Comp = AntdIcons[iconStr] || AntdIcons[iconStr + 'Outlined'];
  return Comp ? <Comp style={style} /> : <AppstoreOutlined style={style} />;
}

export default function Page() {
  const { settings } = useSettings();
  const primaryColor = settings?.primary_color || '#15803d';
  const secondaryColor = settings?.secondary_color || '#16a34a';

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Real Dashboard API Data States
  const [dashCounts, setDashCounts] = useState(null);
  const [projectThemes, setProjectThemes] = useState([]);
  const [budgetDetails, setBudgetDetails] = useState([]);

  // Configurator Schemas States
  const [formsList, setFormsList] = useState([]);
  const [masterList, setMasterList] = useState([]);
  const [menusList, setMenusList] = useState([]);
  const [reportsList, setReportsList] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await privateHttpClient.get('configurator/dashboard/overview');
      if (res.data?.success && res.data?.data) {
        const stats = res.data.data;
        const forms = (stats.forms_list || []).map((f, i) => ({
          ...f,
          _rowKey: f.id || f.fsc_id || f.slug || f.title || f.name || `form-${i}`,
        }));
        const rawMasters = stats.master_list || (stats.forms_list || []).filter(f => f.is_master);
        const masters = rawMasters.map((m, i) => ({
          ...m,
          _rowKey: m.id || m.fsc_id || m.slug || m.title || m.name || `master-${i}`,
        }));
        const menus = (stats.menus_list || []).map((m, i) => ({
          ...m,
          _rowKey: m.id || m.menu_id || m.url || m.label || `menu-${i}`,
        }));
        const reports = (stats.reports_list || []).map((r, i) => ({
          ...r,
          _rowKey: r.id || r.rdf_id || r.report_name || r.name || `report-${i}`,
        }));

        setDashCounts(stats);
        setFormsList(forms);
        setMasterList(masters);
        setMenusList(menus);
        setReportsList(reports);
      }
    } catch (err) {
      console.warn("Error fetching configurator dashboard overview from server:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute live statistics from dashboard API
  const totalProjects = parseInt(dashCounts?.project_count?.total_count || 0, 10);
  const approvedProjects = parseInt(dashCounts?.project_count?.approved_count || 0, 10);
  const pendingProjects = parseInt(dashCounts?.project_count?.pending_count || 0, 10);

  const totalProposals = parseInt(dashCounts?.proposal_count?.total_count || 0, 10);
  const approvedProposals = parseInt(dashCounts?.proposal_count?.approved_count || 0, 10);
  const pendingProposals = parseInt(dashCounts?.proposal_count?.pending_count || 0, 10);

  const totalNGOs = parseInt(dashCounts?.ngo_count?.total_count || 0, 10);

  const rawTotalBudget = parseFloat(dashCounts?.budget_total?.total_budget || 0);
  const rawUtilization = parseFloat(dashCounts?.utilization_total?.total_utilization || 0);
  const utilizationPercent = rawTotalBudget > 0 ? Math.min(100, Math.round((rawUtilization / rawTotalBudget) * 100)) : 0;

  const totalForms = dashCounts?.kpis?.forms_count !== undefined ? dashCounts.kpis.forms_count : (dashCounts?.total_forms || 0);
  const totalMasters = dashCounts?.kpis?.master_configs_count !== undefined ? dashCounts.kpis.master_configs_count : (dashCounts?.total_masters || 0);
  const totalMenus = dashCounts?.kpis?.sidebar_menus_count !== undefined ? dashCounts.kpis.sidebar_menus_count : (dashCounts?.total_menus || 0);
  const totalReports = dashCounts?.kpis?.reports_count !== undefined ? dashCounts.kpis.reports_count : (dashCounts?.total_reports || 0);

  const pageStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    .config-dashboard { font-family: 'Plus Jakarta Sans', sans-serif; padding: 24px; background: #f8fafc; min-height: 100%; width: 100%; box-sizing: border-box; }

    .kpi-card { position: relative; overflow: hidden; padding: 20px 22px; border-radius: 14px; color: #fff; min-height: 115px; display: flex; flex-direction: column; justify-content: space-between; }
    .kpi-bg-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); }
    .kpi-value { font-size: 32px; font-weight: 800; line-height: 1; margin: 4px 0; }
    .kpi-title { font-size: 13px; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-sub { font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 4px; margin-top: 6px; }

    .section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .section-sub   { font-size: 12px; color: #64748b; }

    .tab-btn { padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
    .tab-btn.active { background: var(--primary-color, ${primaryColor}); color: #fff; box-shadow: 0 4px 12px ${primaryColor}40; }
    .tab-btn.inactive { background: #ffffff; color: #64748b; border: 1px solid #e2e8f0; }
    .tab-btn.inactive:hover { background: #f1f5f9; color: #0f172a; }

    .bar-chart { display: flex; align-items: flex-end; gap: 10px; height: 100px; padding-top: 10px; }
    .bar-item  { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; }
    .bar-col   { border-radius: 6px 6px 0 0; background: linear-gradient(180deg, ${secondaryColor}, ${primaryColor}); width: 100%; transition: height 0.5s ease; min-height: 6px; }
    .bar-label { font-size: 11px; color: #64748b; font-weight: 600; }
  `;

  // Configurator Module Navigation Bar
  const moduleTabs = [
    { key: 'overview', label: 'Overview', icon: <AppstoreOutlined /> },
    { key: 'formsbuilder', label: 'Forms Builder', icon: <FormOutlined />, count: totalForms },
    { key: 'masterconfigs', label: 'Master Configs', icon: <SettingOutlined />, count: totalMasters },
    { key: 'menus', label: 'Sidebar Menus', icon: <MenuOutlined />, count: totalMenus },
    { key: 'reports', label: 'Report Builder', icon: <FileProtectOutlined />, count: totalReports },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <div className="config-dashboard">

        {/* ── Header ── */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
              📊 CSR & Configurator Dashboard
            </Title>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              Real-time counts & stats powered by system Dashboard API
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} loading={loading}>
              Refresh Data
            </Button>
            <Button type="primary" style={{ background: primaryColor, borderColor: primaryColor }} icon={<PlusOutlined />} onClick={() => router.push('/configurator/formsbuilder')}>
              Create Form
            </Button>
          </Space>
        </div>

        {/* ── Module Tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {moduleTabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : 'inactive'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <Tag color={activeTab === tab.key ? 'white' : undefined} style={{ borderRadius: 10, margin: 0, fontSize: 11, fontWeight: 700, color: activeTab === tab.key ? primaryColor : undefined }}>
                  {tab.count}
                </Tag>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: 600 }}>Loading dashboard API counts...</div>
          </div>
        ) : (
          <>
            {/* ══════════════ OVERVIEW TAB ══════════════ */}
            {activeTab === 'overview' && (
              <>
                {/* Configurator Menu KPI Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={12} lg={6}>
                    <div
                      className="kpi-card"
                      style={{ ...gradientCard(primaryColor, secondaryColor), cursor: 'pointer' }}
                      onClick={() => router.push('/configurator/formsbuilder')}
                    >
                      <FormOutlined className="kpi-bg-icon" style={{ fontSize: 42, opacity: 0.25 }} />
                      <div>
                        <div className="kpi-title">Forms Builder</div>
                        <div className="kpi-value">{totalForms}</div>
                        <div className="kpi-sub">
                          <span>Published: {dashCounts?.kpis?.published_count || 0}</span> · <span>Drafts: {dashCounts?.kpis?.drafts_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <div
                      className="kpi-card"
                      style={{ ...gradientCard('#0369a1', '#38bdf8'), cursor: 'pointer' }}
                      onClick={() => router.push('/configurator/masterconfigs')}
                    >
                      <SettingOutlined className="kpi-bg-icon" style={{ fontSize: 42, opacity: 0.25 }} />
                      <div>
                        <div className="kpi-title">Master Configs</div>
                        <div className="kpi-value">{totalMasters}</div>
                        <div className="kpi-sub">
                          <CheckCircleOutlined /> Configured Master Tables
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <div
                      className="kpi-card"
                      style={{ ...gradientCard('#b45309', '#f59e0b'), cursor: 'pointer' }}
                      onClick={() => router.push('/configurator/menus')}
                    >
                      <MenuOutlined className="kpi-bg-icon" style={{ fontSize: 42, opacity: 0.25 }} />
                      <div>
                        <div className="kpi-title">Sidebar Menus</div>
                        <div className="kpi-value">{totalMenus}</div>
                        <div className="kpi-sub">
                          <CheckCircleOutlined /> Active Navigation Routes
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <div
                      className="kpi-card"
                      style={{ ...gradientCard('#7c3aed', '#a78bfa'), cursor: 'pointer' }}
                      onClick={() => router.push('/configurator/reports')}
                    >
                      <FileProtectOutlined className="kpi-bg-icon" style={{ fontSize: 42, opacity: 0.25 }} />
                      <div>
                        <div className="kpi-title">Report Builder</div>
                        <div className="kpi-value">{totalReports}</div>
                        <div className="kpi-sub">
                          <CheckCircleOutlined /> Active Dynamic Reports
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* Second Row: Theme Distribution & Configurator Quick Stats */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  {/* System Configurations Breakdown */}
                  <Col xs={24} lg={14}>
                    <div style={{ ...glassCard, padding: '20px 24px', height: '100%' }}>
                      <div className="section-title">
                        <PieChartOutlined style={{ color: primaryColor, marginRight: 6 }} /> System Configurations Breakdown
                      </div>
                      <div className="section-sub" style={{ marginBottom: 16 }}>
                        Distribution of active forms, master configs, and navigation items
                      </div>

                      {dashCounts?.schema_breakdown && dashCounts.schema_breakdown.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {dashCounts.schema_breakdown.map((item, idx) => {
                            const maxCount = Math.max(...dashCounts.schema_breakdown.map(s => s.count), 1);
                            const percent = Math.min(100, Math.round((item.count / maxCount) * 100));

                            return (
                              <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                                  <Text strong>{item.name}</Text>
                                  <Text style={{ color: '#64748b' }}>{item.count} items</Text>
                                </div>
                                <Progress percent={percent} strokeColor={item.color} showInfo={false} size="small" />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No schema configuration metrics found" />
                      )}
                    </div>
                  </Col>

                  {/* Configurator System Quick Snapshot */}
                  <Col xs={24} lg={10}>
                    <div style={{ ...glassCard, padding: '20px 24px', height: '100%' }}>
                      <div className="section-title">
                        <CheckCircleOutlined style={{ color: primaryColor, marginRight: 6 }} /> Configurator System Snapshot
                      </div>
                      <div className="section-sub" style={{ marginBottom: 16 }}>Live count of system entities & builders</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                          <Space size={10}>
                            <div style={{ padding: 8, background: 'rgba(var(--primary-color-rgb, 21,128,61), 0.12)', borderRadius: 6, color: primaryColor }}><FormOutlined /></div>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 13 }}>Active Form Schemas</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>Configured in Forms Builder</Text>
                            </div>
                          </Space>
                          <Tag color="green" style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px' }}>{totalForms}</Tag>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                          <Space size={10}>
                            <div style={{ padding: 8, background: '#e0f2fe', borderRadius: 6, color: '#0369a1' }}><SettingOutlined /></div>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 13 }}>Master Tables</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>Configured Master Forms</Text>
                            </div>
                          </Space>
                          <Tag color="blue" style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px' }}>{totalMasters}</Tag>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                          <Space size={10}>
                            <div style={{ padding: 8, background: '#fef3c7', borderRadius: 6, color: '#b45309' }}><MenuOutlined /></div>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 13 }}>Sidebar Navigation Items</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>Configured in Menu Builder</Text>
                            </div>
                          </Space>
                          <Tag color="orange" style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px' }}>{totalMenus}</Tag>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                          <Space size={10}>
                            <div style={{ padding: 8, background: '#f3e8ff', borderRadius: 6, color: '#7c3aed' }}><FileProtectOutlined /></div>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 13 }}>Dynamic Reports</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>Configured in Report Builder</Text>
                            </div>
                          </Space>
                          <Tag color="purple" style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px' }}>{totalReports}</Tag>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* Main 2-Column Section for Form Schemas & Master Configs */}
                <Row gutter={[16, 16]}>
                  {/* Forms Builder Summary */}
                  <Col xs={24} lg={12}>
                    <div style={{ ...glassCard, padding: '20px 24px', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <div className="section-title"><FormOutlined style={{ color: primaryColor, marginRight: 6 }} /> Forms Builder Schemas</div>
                          <div className="section-sub">Live list of active form schemas from Database</div>
                        </div>
                        <Button type="link" style={{ color: primaryColor, fontWeight: 600 }} onClick={() => router.push('/configurator/formsbuilder')}>
                          View All <ArrowRightOutlined />
                        </Button>
                      </div>

                      <Table
                        dataSource={formsList.slice(0, 5)}
                        rowKey="_rowKey"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: 'Form Name', dataIndex: 'title', key: 'title', render: (t, r) => <Text strong>{t || r.name}</Text> },
                          { title: 'Slug', dataIndex: 'slug', key: 'slug', render: text => <code style={{ color: '#0284c7', fontSize: 11 }}>{text}</code> },
                          { title: 'Table', dataIndex: 'table_name', key: 'table_name', render: text => <Text type="secondary" style={{ fontSize: 11 }}>{text || 'N/A'}</Text> },
                          {
                            title: 'Status', dataIndex: 'is_draft', key: 'is_draft',
                            render: isDraft => <Tag color={isDraft ? 'orange' : 'green'}>{isDraft ? 'Draft' : 'Submitted'}</Tag>
                          }
                        ]}
                      />
                    </div>
                  </Col>

                  {/* Master Configs Summary */}
                  <Col xs={24} lg={12}>
                    <div style={{ ...glassCard, padding: '20px 24px', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <div className="section-title"><SettingOutlined style={{ color: '#0369a1', marginRight: 6 }} /> Master Configurations</div>
                          <div className="section-sub">Configured system lookup tables & master forms</div>
                        </div>
                        <Button type="link" style={{ color: '#0369a1', fontWeight: 600 }} onClick={() => router.push('/configurator/masterconfigs')}>
                          Manage Masters <ArrowRightOutlined />
                        </Button>
                      </div>

                      <Table
                        dataSource={masterList.length > 0 ? masterList.slice(0, 5) : formsList.filter(f => f.is_master).slice(0, 5)}
                        rowKey="_rowKey"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: 'Master Title', dataIndex: 'title', key: 'title', render: (t, r) => <Text strong>{t || r.name}</Text> },
                          { title: 'Slug', dataIndex: 'slug', key: 'slug', render: (t, r) => <code style={{ color: '#0284c7', fontSize: 11 }}>{t || r.slug}</code> },
                          { title: 'Table Name', dataIndex: 'table_name', key: 'table_name', render: (t, r) => <Text type="secondary" style={{ fontSize: 11 }}>{t || r.tableName || 'N/A'}</Text> },
                          { title: 'Type', key: 'type', render: () => <Tag color="blue">Master Form</Tag> }
                        ]}
                      />
                    </div>
                  </Col>
                </Row>
              </>
            )}

            {/* ══════════════ FORMS BUILDER TAB ══════════════ */}
            {activeTab === 'formsbuilder' && (
              <div style={{ ...glassCard, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div className="section-title" style={{ fontSize: 18 }}>📝 All Configured Forms</div>
                    <div className="section-sub">Full list of dynamic form schemas created via Forms Builder</div>
                  </div>
                  <Button type="primary" style={{ background: primaryColor, borderColor: primaryColor }} icon={<PlusOutlined />} onClick={() => router.push('/configurator/formsbuilder')}>
                    Go to Forms Builder
                  </Button>
                </div>

                <Table
                  dataSource={formsList}
                  rowKey="_rowKey"
                  size="middle"
                  columns={[
                    { title: '#', key: 'idx', render: (_, __, i) => i + 1 },
                    { title: 'Form Name', dataIndex: 'fsc_name', key: 'fsc_name', render: (t, r) => <Text strong>{t || r.title || r.name}</Text> },
                    { title: 'Slug', dataIndex: 'fsc_slug', key: 'fsc_slug', render: (t, r) => <code style={{ color: '#0284c7' }}>{t || r.slug}</code> },
                    { title: 'SQL Table', dataIndex: 'fsc_table_name', key: 'fsc_table_name', render: (t, r) => <code>{t || r.table_name || r.tableName || 'N/A'}</code> },
                    {
                      title: 'Type', dataIndex: 'fsc_is_master', key: 'fsc_is_master',
                      render: isMaster => <Tag color={isMaster ? 'purple' : 'blue'}>{isMaster ? 'Master Form' : 'General Form'}</Tag>
                    },
                    {
                      title: 'Status', dataIndex: 'fsc_is_draft', key: 'fsc_is_draft',
                      render: isDraft => <Tag color={isDraft ? 'orange' : 'green'}>{isDraft ? 'Draft' : 'Submitted'}</Tag>
                    },
                    {
                      title: 'Action', key: 'act',
                      render: (_, record) => (
                        <Button size="small" onClick={() => router.push('/configurator/formsbuilder')}>
                          Edit Form
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )}

            {/* ══════════════ MASTER CONFIGS TAB ══════════════ */}
            {activeTab === 'masterconfigs' && (
              <div style={{ ...glassCard, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div className="section-title" style={{ fontSize: 18 }}>⚙️ Master Configurations</div>
                    <div className="section-sub">Master forms & tables configured in the system</div>
                  </div>
                  <Button type="primary" style={{ background: '#0369a1' }} icon={<SettingOutlined />} onClick={() => router.push('/configurator/masterconfigs')}>
                    Go to Master Configs
                  </Button>
                </div>

                <Table
                  dataSource={masterList.length > 0 ? masterList : formsList.filter(f => f.fsc_is_master)}
                  rowKey="_rowKey"
                  size="middle"
                  columns={[
                    { title: '#', key: 'idx', render: (_, __, i) => i + 1 },
                    { title: 'Master Title', dataIndex: 'fsc_name', key: 'fsc_name', render: (t, r) => <Text strong>{t || r.title || r.name}</Text> },
                    { title: 'Slug', dataIndex: 'fsc_slug', key: 'fsc_slug', render: (t, r) => <code style={{ color: '#0284c7' }}>{t || r.slug}</code> },
                    { title: 'Table Name', dataIndex: 'fsc_table_name', key: 'fsc_table_name', render: (t, r) => <code>{t || r.table_name || r.tableName}</code> },
                    {
                      title: 'Action', key: 'act',
                      render: () => (
                        <Button size="small" onClick={() => router.push('/configurator/masterconfigs')}>
                          Manage Config
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )}

            {/* ══════════════ SIDEBAR MENUS TAB ══════════════ */}
            {activeTab === 'menus' && (
              <div style={{ ...glassCard, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div className="section-title" style={{ fontSize: 18 }}>☰ Sidebar Navigation Menus</div>
                    <div className="section-sub">Configured menu tree structure</div>
                  </div>
                  <Button type="primary" style={{ background: '#b45309' }} icon={<MenuOutlined />} onClick={() => router.push('/configurator/menus')}>
                    Go to Sidebar Menus
                  </Button>
                </div>

                <Table
                  dataSource={menusList}
                  rowKey="_rowKey"
                  size="middle"
                  columns={[
                    { title: '#', key: 'idx', render: (_, __, i) => i + 1 },
                    {
                      title: 'Menu Label', dataIndex: 'label', key: 'label',
                      render: (t, r) => (
                        <Space>
                          <MenuIcon iconStr={r.icon} style={{ color: '#b45309' }} />
                          <Text strong>{t || r.name}</Text>
                        </Space>
                      )
                    },
                    { title: 'Route URL', dataIndex: 'url', key: 'url', render: t => <code style={{ color: '#0284c7' }}>{t || '-'}</code> },
                    {
                      title: 'Status', dataIndex: 'is_active', key: 'is_active',
                      render: active => <Badge status={active !== false ? 'success' : 'default'} text={active !== false ? 'Active' : 'Inactive'} />
                    },
                    {
                      title: 'Action', key: 'act',
                      render: () => (
                        <Button size="small" onClick={() => router.push('/configurator/menus')}>
                          Configure Menu
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )}

            {/* ══════════════ REPORTS TAB ══════════════ */}
            {activeTab === 'reports' && (
              <div style={{ ...glassCard, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div className="section-title" style={{ fontSize: 18 }}>📊 Configured Reports</div>
                    <div className="section-sub">Dynamic report definitions & saved views</div>
                  </div>
                  <Button type="primary" style={{ background: '#7c3aed' }} icon={<FileProtectOutlined />} onClick={() => router.push('/configurator/reports')}>
                    Go to Report Builder
                  </Button>
                </div>

                <Table
                  dataSource={reportsList}
                  rowKey="_rowKey"
                  size="middle"
                  columns={[
                    { title: '#', key: 'idx', render: (_, __, i) => i + 1 },
                    { title: 'Report Name', dataIndex: 'rdf_name', key: 'rdf_name', render: (t, r) => <Text strong>{t || r.report_name || r.title || 'Report'}</Text> },
                    { title: 'Target Table', dataIndex: 'rdf_target_table', key: 'rdf_target_table', render: (t, r) => <code style={{ color: '#0284c7' }}>{t || r.table_name || r.tableName || '-'}</code> },
                    {
                      title: 'Action', key: 'act',
                      render: () => (
                        <Button size="small" onClick={() => router.push('/configurator/reports')}>
                          Open Builder
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )}
          </>
        )}

      </div>
    </>
  );
}
