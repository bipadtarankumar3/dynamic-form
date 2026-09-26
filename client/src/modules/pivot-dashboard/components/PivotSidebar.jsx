import React, { useState, useEffect, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Popover, Input, Button, Space, Typography, Select, Tabs, Badge, Empty, Tooltip } from 'antd';
import { getFieldValues } from '@/services/pivot-service';
import { 
  SearchOutlined, 
  RightOutlined, 
  FontSizeOutlined, 
  NumberOutlined, 
  CalendarOutlined, 
  EnvironmentOutlined,
  DatabaseOutlined,
  EyeOutlined,
  FilterOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const getTypeMeta = (type) => {
  const t = (type || '').toLowerCase();
  if (['number', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real'].includes(t)) {
    return {
      label: 'Numeric',
      icon: <NumberOutlined />,
      color: '#16a34a',
      bg: '#f0fdf4',
      badgeColor: 'green',
    };
  }
  if (['date', 'timestamp', 'timestamptz', 'datetime', 'time'].includes(t) || t.endsWith('_date') || t.endsWith('_at')) {
    return {
      label: 'Date',
      icon: <CalendarOutlined />,
      color: '#d97706',
      bg: '#fffbeb',
      badgeColor: 'orange',
    };
  }
  if (['geo', 'location', 'coordinates', 'address'].includes(t)) {
    return {
      label: 'Geo',
      icon: <EnvironmentOutlined />,
      color: '#9333ea',
      bg: '#faf5ff',
      badgeColor: 'purple',
    };
  }
  return {
    label: 'Text',
    icon: <FontSizeOutlined />,
    color: '#2563eb',
    bg: '#eff6ff',
    badgeColor: 'blue',
  };
};

const ValuePopover = ({ field, tableName }) => {
  const [search, setSearch] = useState('');
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchValues = async () => {
      if (!tableName || !field.id) return;
      setLoading(true);
      try {
        const res = await getFieldValues(tableName, field.id, search);
        if (res.data?.status) setValues(res.data.data);
      } catch (err) {
        console.error('Failed to fetch values', err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchValues, 300);
    return () => clearTimeout(timer);
  }, [tableName, field.id, search]);

  const content = (
    <div className="md-val-popover-box">
      <div className="md-val-popover-title">
        {field.label} — Sample Values
      </div>
      <Input
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        placeholder="Filter values..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="md-val-popover-search"
      />
      <div className="md-val-popover-scroll">
        {loading ? (
          <div className="md-val-popover-loading">Loading sample values...</div>
        ) : (
          values.map((v, i) => (
            <div
              key={i}
              className="md-val-popover-row"
            >
              <span className="md-val-popover-val">
                {v.value ?? 'N/A'}
              </span>
              <span className="md-val-popover-badge">
                {v.count}
              </span>
            </div>
          ))
        )}
        {!loading && values.length === 0 && (
          <div className="md-val-popover-empty">No sample values</div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="click"
      placement="right"
      styles={{ body: { borderRadius: 12, padding: 14, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}
    >
      <Tooltip title="View sample values">
        <Button
          type="text"
          size="small"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          icon={<EyeOutlined />}
          className="md-field-preview-btn"
        />
      </Tooltip>
    </Popover>
  );
};

const DraggableField = ({ field, tableName }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${field.id}`,
    data: { type: 'field', field },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 9999,
      }
    : undefined;

  const meta = getTypeMeta(field.type);

  const getBadgeClass = (type) => {
    const t = (type || '').toLowerCase();
    if (['number', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real'].includes(t)) return 'numeric';
    if (['date', 'timestamp', 'timestamptz', 'datetime', 'time'].includes(t) || t.endsWith('_date') || t.endsWith('_at')) return 'date';
    if (['geo', 'location', 'coordinates', 'address'].includes(t)) return 'geo';
    return 'text';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`md-field-card-item${isDragging ? ' is-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="md-field-info-wrap">
        <div className={`md-field-type-badge ${getBadgeClass(field.type)}`}>
          {meta.icon}
        </div>
        <div className="md-field-text-group">
          <div
            className="md-field-name"
            title={field.label}
          >
            {field.label}
          </div>
          <div className="md-field-meta">
            {meta.label} • {field.id}
          </div>
        </div>
      </div>
      <ValuePopover field={field} tableName={tableName} />
    </div>
  );
};

const PivotSidebar = ({ 
  tables = [], 
  fields = [], 
  selectedTable, 
  onTableChange, 
  selectedFields = [],
  loading = false,
  tableError = false,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const tableOptions = useMemo(() => {
    return (tables || []).map((t) => ({
      value: t.id || t.table_name,
      label: t.label || t.table_name || t.id,
    }));
  }, [tables]);

  const filteredFields = useMemo(() => {
    return (fields || []).filter((f) => {
      const matchesSearch =
        !search ||
        (f.label || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.id || '').toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const t = (f.type || '').toLowerCase();
      if (activeTab === 'numbers') {
        return ['number', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double'].includes(t);
      }
      if (activeTab === 'dates') {
        return ['date', 'timestamp', 'timestamptz', 'datetime', 'time'].includes(t) || t.endsWith('_date') || t.endsWith('_at');
      }
      if (activeTab === 'dimensions') {
        const isNum = ['number', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double'].includes(t);
        const isDate = ['date', 'timestamp', 'timestamptz', 'datetime', 'time'].includes(t) || t.endsWith('_date') || t.endsWith('_at');
        return !isNum && !isDate;
      }
      return true;
    });
  }, [fields, search, activeTab]);

  const counts = useMemo(() => {
    let dimensions = 0;
    let numbers = 0;
    let dates = 0;
    (fields || []).forEach((f) => {
      const t = (f.type || '').toLowerCase();
      if (['number', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double'].includes(t)) {
        numbers++;
      } else if (['date', 'timestamp', 'timestamptz', 'datetime', 'time'].includes(t) || t.endsWith('_date') || t.endsWith('_at')) {
        dates++;
      } else {
        dimensions++;
      }
    });
    return { all: fields.length, dimensions, numbers, dates };
  }, [fields]);

  return (
    <div className={`md-sidebar-root${collapsed ? ' is-collapsed' : ''}`}>
      <div className="md-sidebar-header">
        <div className="md-sidebar-title-row">
          <div className="md-sidebar-title-left">
            <DatabaseOutlined className="md-sidebar-title-icon" />
            <Text strong className="md-sidebar-title-text">
              Available Fields
            </Text>
          </div>
          <Space size={4}>
            <span className="md-sidebar-hint-pill">
              Drag to Dropzones
            </span>
            {onToggleCollapse && (
              <Tooltip title="Collapse sidebar">
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  onClick={onToggleCollapse}
                  className="md-sidebar-collapse-btn"
                />
              </Tooltip>
            )}
          </Space>
        </div>

        {/* Database View Dropdown */}
        <div className="md-sidebar-select-wrap">
          <Select
            showSearch
            placeholder="— Select Database View —"
            value={selectedTable || undefined}
            onChange={(val) => onTableChange(val || null)}
            options={tableOptions}
            loading={loading}
            allowClear
            status={tableError && !selectedTable ? 'error' : ''}
            className="md-sidebar-view-select"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          {tableError && !selectedTable && (
            <div className="md-sidebar-error-text">
              ⚠️ Please select a database view
            </div>
          )}
        </div>

        {selectedTable && (
          <>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="small"
              className="md-sidebar-tabs"
              items={[
                {
                  key: 'all',
                  label: (
                    <span style={{ fontWeight: 600 }}>
                      All <Badge count={counts.all} size="small" className="md-sidebar-tab-badge" />
                    </span>
                  ),
                },
                {
                  key: 'dimensions',
                  label: <span style={{ fontWeight: 600 }}>Text ({counts.dimensions})</span>,
                },
                {
                  key: 'numbers',
                  label: <span style={{ fontWeight: 600 }}>Numbers ({counts.numbers})</span>,
                },
                {
                  key: 'dates',
                  label: <span style={{ fontWeight: 600 }}>Dates ({counts.dates})</span>,
                },
              ]}
            />
            <Input
              placeholder="Search fields..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              size="small"
              className="md-sidebar-search-input"
            />
          </>
        )}
      </div>

      <div className="md-sidebar-field-list">
        {selectedTable ? (
          filteredFields.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: '12px', color: '#94a3b8' }}>No fields match your filter</span>}
              style={{ margin: '40px 0' }}
            />
          ) : (
            filteredFields.map((field) => (
              <DraggableField
                key={field.id}
                field={field}
                tableName={selectedTable}
              />
            ))
          )
        ) : (
          <div className="md-sidebar-empty-box">
            <div className="md-sidebar-empty-icon-wrap">
              <DatabaseOutlined />
            </div>
            <div className="md-sidebar-empty-title">
              Select a Database View
            </div>
            <div className="md-sidebar-empty-desc">
              Choose a database view above to inspect available columns and build your widget.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PivotSidebar;
