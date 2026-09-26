import React, { useState, useEffect, useMemo } from 'react';
import { Button, Typography, Select, Card, Spin, Empty, Row, Col, Badge, Space, Alert, Drawer, Tag } from 'antd';
import { DashboardOutlined, FilterOutlined, ReloadOutlined, CheckOutlined, CloseOutlined, ClearOutlined } from '@ant-design/icons';
import { executePivot } from '@/services/pivot-service';
import { fyListAPI } from '@/services/common-service';
import PivotChart from '@/modules/pivot-dashboard/components/PivotChart';
import DynamicFilterBar, { DynamicFilterSelect } from '@/modules/dashboard-builder/components/DynamicFilterBar';
import '@/modules/dashboard-builder/DashboardBuilder.css';
import '@/modules/approval-path/approval-path-new.css';

const { Title, Text } = Typography;
const { Option } = Select;

const RoleContentBlockRenderer = ({ item }) => {
  const config = item.configuration || {};

  if (item.type === 'heading_block') {
    const TagComponent = config.level || 'h2';
    const tagStyles = {
      h1: { fontSize: '28px', fontWeight: 800, margin: '8px 0', color: config.color || '#0f172a' },
      h2: { fontSize: '22px', fontWeight: 700, margin: '6px 0', color: config.color || '#0f172a' },
      h3: { fontSize: '18px', fontWeight: 600, margin: '4px 0', color: config.color || '#0f172a' },
      h4: { fontSize: '15px', fontWeight: 600, margin: '4px 0', color: config.color || '#0f172a' },
    };
    return (
      <div className="el-heading-widget" style={{ textAlign: config.align || 'left' }}>
        <TagComponent style={tagStyles[config.level || 'h2']}>
          {config.text || 'Heading'}
        </TagComponent>
      </div>
    );
  }

  if (item.type === 'paragraph_block') {
    return (
      <div className="el-paragraph-widget" style={{ textAlign: config.align || 'left' }}>
        <p style={{ margin: 0, fontSize: '14px', color: config.color || '#475569', lineHeight: 1.6 }}>
          {config.text}
        </p>
      </div>
    );
  }

  if (item.type === 'divider_block') {
    return (
      <div className="el-divider-widget">
        <hr
          style={{
            border: 'none',
            borderTop: `${config.height || 1}px ${config.style || 'solid'} ${config.color || '#e2e8f0'}`,
            margin: '12px 0',
          }}
        />
      </div>
    );
  }

  if (item.type === 'alert_block') {
    return (
      <div className="el-alert-widget">
        <Alert
          message={config.message || 'Important Notice'}
          description={config.description || 'Information message for users.'}
          type={config.type || 'info'}
          showIcon
        />
      </div>
    );
  }

  return null;
};

const WidgetRenderer = ({ item, selectedFy, activeFilters = {}, topFilters = [], dataScope = 'all', masterField = null }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item.type && item.type.endsWith('_block')) return;
    const fetchWidgetData = async () => {
      if (!item.configuration || !item.table_name) return;
      setLoading(true);
      try {
        let zonesConfig = { ...(item.configuration || {}) };
        let existingFilters = [...(zonesConfig.filters || [])];

        if (selectedFy) {
          existingFilters = existingFilters.filter((f) => f.id !== 'tfy_id');
          existingFilters.push({
            id: 'tfy_id',
            type: 'text',
            label: 'Financial Year',
            selectedValues: [selectedFy],
          });
        }

        topFilters.forEach((filter) => {
          const filterKey = filter.filter_key || (filter.table_name && filter.field ? `${filter.table_name}__${filter.field}__${(filter.label || '').toLowerCase().replace(/\s+/g, '_')}` : filter.id);
          const values = activeFilters[filterKey] || (filter.id ? activeFilters[filter.id] : undefined);
          if (Array.isArray(values) && values.length > 0) {
            const targetField = filter.field || filter.id;
            existingFilters = existingFilters.filter(
              (f) =>
                f.filterKey !== filterKey &&
                f.filter_key !== filterKey &&
                f.id !== filterKey &&
                !(f.filter_table_name === filter.table_name && f.id === targetField)
            );
            existingFilters.push({
              id: targetField,
              filterKey,
              filter_key: filterKey,
              type: filter.type || filter.filter_type || 'text',
              filter_type: filter.filter_type || (filter.type === 'date_range' ? 'date_range' : 'select'),
              label: filter.label || targetField,
              filter_table_name: filter.table_name,
              parent_match_field: filter.parent_match_field,
              selectedValues: values,
            });
          }
        });

        zonesConfig.filters = existingFilters;
        const res = await executePivot({
          tableName: item.table_name,
          zones: zonesConfig,
          dataScope,
          masterField,
        });
        if (res.data?.status) {
          setData(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load widget data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWidgetData();
  }, [item.table_name, JSON.stringify(item.configuration), selectedFy, JSON.stringify(activeFilters), JSON.stringify(topFilters), dataScope]);

  if (item.type && item.type.endsWith('_block')) {
    return <RoleContentBlockRenderer item={item} />;
  }

  const isKpiCard = item.chart_type === 'kpi_card';
  if (isKpiCard) {
    return (
      <div style={{ height: '100%' }}>
        {loading ? (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '86px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
            <Spin size="small" />
          </div>
        ) : data.length > 0 ? (
          <PivotChart type="kpi_card" title={item.title || item.report_name} data={data} rows={item.configuration?.rows || []} columns={item.configuration?.columns || []} values={item.configuration?.values || []} customConfig={item.configuration?.customConfig || item.customConfig || {}} />
        ) : (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '86px', color: '#94a3b8', fontSize: '12px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>No data available</div>
        )}
      </div>
    );
  }

  if (item.type === 'section_header' || item.chart_type === 'section_header') {
    return (
      <div className="db-canvas-item span-24">
        <div style={{ background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)', border: '1px solid #e2e8f0', borderLeft: '4px solid #15803d', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginTop: '8px' }}>
          <span style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.2px' }}>{item.title || 'Section Title'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="db-widget-card" style={{ height: '100%' }}>
      <div className="db-widget-card-header">
        <Text strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.title || item.report_name}</Text>
        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>{item.chart_type || 'column'}</span>
      </div>
      <div className="db-widget-card-body" style={{ minHeight: '300px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px' }}><Spin /></div>
        ) : data.length > 0 ? (
          <div style={{ height: '340px', width: '100%' }}>
            <PivotChart type={item.chart_type && item.chart_type !== 'none' ? item.chart_type : 'column'} title={item.title || item.report_name} data={data} rows={item.configuration?.rows || []} columns={item.configuration?.columns || []} values={item.configuration?.values || []} customConfig={item.configuration?.customConfig || item.customConfig || {}} />
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ fontSize: '12px', color: '#94a3b8' }}>No data available</span>} style={{ margin: 'auto' }} />
        )}
      </div>
    </div>
  );
};

const DynamicRoleDashboard = ({ dashboard, userRoleId = null, userRoleName = '' }) => {
  const [topFilters, setTopFilters] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [stagedFilters, setStagedFilters] = useState({});
  const [searching, setSearching] = useState(false);
  const [selectedFy, setSelectedFy] = useState(null);

  const layout = useMemo(() => {
    if (!dashboard?.tdb_widgets_layout) return [];
    const raw = dashboard.tdb_widgets_layout;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return raw;
  }, [dashboard]);

  const isStructuredRows = useMemo(() => {
    return Array.isArray(layout) && layout.length > 0 && Array.isArray(layout[0]?.columns);
  }, [layout]);

  useEffect(() => {
    if (dashboard?.tdb_filters_config) {
      setTopFilters(dashboard.tdb_filters_config);
    } else if (dashboard?.filters_config) {
      setTopFilters(dashboard.filters_config);
    }
  }, [dashboard]);

  const currentRoleId = userRoleId ? String(userRoleId) : null;
  const { effectiveDataScope, effectiveMasterField } = useMemo(() => {
    if (!dashboard) return { effectiveDataScope: 'all', effectiveMasterField: null };
    const rolesConfig = Array.isArray(dashboard.tdb_roles) ? dashboard.tdb_roles : typeof dashboard.tdb_roles === 'string' ? JSON.parse(dashboard.tdb_roles || '[]') : [];
    if (currentRoleId && rolesConfig.length > 0) {
      const match = rolesConfig.find((r) => String(r.role_id) === currentRoleId);
      if (match) {
        return { effectiveDataScope: match.data_scope || dashboard.tdb_data_scope || 'all', effectiveMasterField: match.master_field || null };
      }
    }
    return { effectiveDataScope: dashboard?.tdb_data_scope || 'all', effectiveMasterField: null };
  }, [dashboard, currentRoleId]);

  const handleFilterChange = (filterId, values) => {
    setStagedFilters((prev) => {
      const next = { ...prev, [filterId]: values };
      topFilters.forEach((f) => {
        if (f.depends_on && (f.depends_on === filterId || filterId.includes(f.depends_on) || f.depends_on.includes(filterId) || (f.parent_match_field && filterId.includes(f.parent_match_field)))) {
          const childKey = f.filter_key || (f.table_name && f.field ? `${f.table_name}__${f.field}__${(f.label || '').toLowerCase().replace(/\s+/g, '_')}` : f.id);
          delete next[childKey]; delete next[f.id]; delete next[f.field];
        }
      });
      return next;
    });
  };

  const handleSearch = () => { setSearching(true); setAppliedFilters({ ...stagedFilters }); setTimeout(() => setSearching(false), 400); };
  const handleReset = () => { setStagedFilters({}); setAppliedFilters({}); setSelectedFy(null); };

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    return Object.values(stagedFilters).filter(
      (v) => (Array.isArray(v) && v.length > 0) || (typeof v === 'string' && v.trim() !== '')
    ).length;
  }, [stagedFilters]);

  const appliedFilterCount = useMemo(() => {
    return Object.values(appliedFilters).filter(
      (v) => (Array.isArray(v) && v.length > 0) || (typeof v === 'string' && v.trim() !== '')
    ).length;
  }, [appliedFilters]);

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 120px)', padding: '0 4px 16px 4px' }}>
      {/* ── 1. ENTERPRISE PAGE HEADER ── */}
      <div className="ap-page-header">
        <div className="ap-page-header-left">
          <div className="ap-page-header-icon">
            <DashboardOutlined />
          </div>
          <div>
            <h1 className="ap-page-title">{dashboard?.tdb_name || `${userRoleName || 'Admin'} Dashboard`}</h1>
            <p className="ap-page-subtitle">{dashboard?.tdb_description || `Overview for ${userRoleName || 'Admin'}`}</p>
          </div>
        </div>

        <div className="ap-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              handleSearch();
            }}
            loading={searching}
            className="ap-btn-refresh"
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={() => setFilterDrawerOpen(true)}
            className="ap-btn-create"
          >
            Filters{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>
      </div>

      {/* ── 2. ACTIVE FILTERS CHIPS BAR (IF FILTERS APPLIED) ── */}
      {appliedFilterCount > 0 && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '10px 16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-color, #15803d)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FilterOutlined /> Active Filters:
            </span>
            {topFilters.map((f) => {
              const filterKey = f.filter_key || (f.table_name && f.field ? `${f.table_name}__${f.field}__${(f.label || '').toLowerCase().replace(/\s+/g, '_')}` : f.id);
              const vals = appliedFilters[filterKey] || (f.id ? appliedFilters[f.id] : null);
              if (!vals || (Array.isArray(vals) && vals.length === 0)) return null;
              const displayVal = Array.isArray(vals) ? vals.join(', ') : String(vals);
              return (
                <Tag
                  key={filterKey}
                  closable
                  onClose={() => {
                    handleFilterChange(filterKey, []);
                    setAppliedFilters((prev) => {
                      const next = { ...prev };
                      delete next[filterKey];
                      return next;
                    });
                  }}
                  style={{
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: 'rgba(21, 128, 61, 0.08)',
                    borderColor: 'rgba(21, 128, 61, 0.25)',
                    color: 'var(--primary-color, #15803d)',
                  }}
                >
                  <strong>{f.label || f.field}:</strong> {displayVal}
                </Tag>
              );
            })}
          </div>

          <Button
            size="small"
            type="link"
            onClick={handleReset}
            style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, padding: 0 }}
          >
            Clear All
          </Button>
        </div>
      )}

      {/* ── 3. RIGHT-SIDE FILTER DRAWER ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '16px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                }}
              >
                <FilterOutlined />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                  Dashboard Filters
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500, marginTop: '2px' }}>
                  Customize your dashboard view
                </div>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '20px',
                  padding: '3px 10px',
                  letterSpacing: '0.02em',
                }}
              >
                {activeFilterCount} active
              </span>
            )}
          </div>
        }
        placement="right"
        width={410}
        rootClassName="ap-filter-drawer"
        className="ap-filter-drawer"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
        styles={{
          header: {
            background: 'var(--primary-gradient, var(--primary-color, #15803d))',
            padding: '16px 20px',
            borderBottom: 'none',
          },
          body: {
            padding: '18px 20px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowX: 'hidden',
          },
        }}
        footer={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: '#ffffff',
              gap: '10px',
              overflow: 'hidden',
            }}
          >
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={activeFilterCount === 0 && appliedFilterCount === 0 && !selectedFy}
              className="ap-btn-reset"
            >
              Reset All
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                icon={<CloseOutlined />}
                onClick={() => setFilterDrawerOpen(false)}
                className="ap-btn-cancel"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={searching}
                onClick={() => {
                  handleSearch();
                  setFilterDrawerOpen(false);
                }}
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  background: 'var(--primary-gradient, var(--primary-color, #15803d))',
                  borderColor: 'transparent',
                  color: '#ffffff',
                  padding: '0 18px',
                  boxShadow: '0 2px 8px rgba(var(--primary-color-rgb, 21, 128, 61), 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        }
      >
        {topFilters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                color: '#64748b',
                fontSize: '20px',
              }}
            >
              <FilterOutlined />
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>No Filters Configured</p>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '12px', lineHeight: 1.5 }}>
              No custom filters have been configured for this dashboard in Dashboard Builder.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {topFilters.map((filter, idx) => {
              const filterKey =
                filter.filter_key ||
                (filter.table_name && filter.field
                  ? `${filter.table_name}__${filter.field}__${(filter.label || '').toLowerCase().replace(/\s+/g, '_')}`
                  : filter.id);

              return (
                <div
                  key={`${filterKey}-${idx}`}
                  style={{
                    background: '#ffffff',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <DynamicFilterSelect
                    filter={filter}
                    filterKey={filterKey}
                    selectedValues={stagedFilters[filterKey] || (filter.id ? stagedFilters[filter.id] : [])}
                    allFilters={topFilters}
                    activeFilters={stagedFilters}
                    onChange={handleFilterChange}
                    fullWidth={true}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {layout.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px 24px', textAlign: 'center' }}>
          <Empty description={<div><Title level={5} style={{ color: '#64748b' }}>No widgets placed in this dashboard</Title><Text type="secondary">Please configure widgets in Dashboard Builder.</Text></div>} />
        </div>
      ) : isStructuredRows ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {layout.map((row, rIdx) => {
            const TagHeading = row.headingTag || 'h2';
            const activeCols = (row.columns || []).filter((c) => (c.items || []).length > 0);
            if (activeCols.length === 0) return null;

            return (
              <div
                key={row.id || `row-${rIdx}`}
                className={`el-section-container ${row.isTransparent ? 'is-transparent is-preview-mode' : ''}`}
              >
                {row.title && (
                  <div className="el-section-header-bar">
                    <div>
                      <TagHeading style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '18px' }}>{row.title}</TagHeading>
                      {row.subtitle && <Text type="secondary" style={{ fontSize: '13px' }}>{row.subtitle}</Text>}
                    </div>
                  </div>
                )}
                <div className="el-section-content-body">
                  <div className="el-row-grid">
                    {activeCols.map((col, cIdx) => {
                      const colWidth = col.span && activeCols.length === (row.columns || []).length
                        ? `${(Number(col.span) / 24) * 100}%`
                        : `${100 / activeCols.length}%`;

                      return (
                        <div
                          key={col.id || cIdx}
                          className="el-column-slot db-canvas-item"
                          style={{
                            flex: `0 0 ${colWidth}`,
                            width: colWidth,
                            maxWidth: colWidth,
                            boxSizing: 'border-box',
                          }}
                        >
                          <div className="el-column-inner has-items">
                            {(col.items || []).map((item, itIdx) => (
                              <div
                                key={item.instanceId || `item-${itIdx}`}
                                style={{ marginBottom: itIdx === (col.items.length - 1) ? 0 : 8 }}
                              >
                                <WidgetRenderer
                                  item={item}
                                  selectedFy={selectedFy}
                                  activeFilters={appliedFilters}
                                  topFilters={topFilters}
                                  dataScope={effectiveDataScope}
                                  masterField={effectiveMasterField}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="db-canvas-grid">
          {layout.map((item, idx) => (
            <div key={item.instanceId || `widget-${idx}`} className={`db-canvas-item span-${item.col_span || 12}`}>
              <WidgetRenderer item={item} selectedFy={selectedFy} activeFilters={appliedFilters} topFilters={topFilters} dataScope={effectiveDataScope} masterField={effectiveMasterField} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DynamicRoleDashboard;
