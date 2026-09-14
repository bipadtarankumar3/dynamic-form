import React, { useState, useEffect } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Button, Typography, Space, Popover, Input, Checkbox, Spin, Badge, Tooltip, Popconfirm } from 'antd';
import { 
  CloseOutlined, 
  FilterOutlined, 
  MenuOutlined, 
  InsertRowRightOutlined, 
  CalculatorOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { getFieldValues } from '@/services/pivot-service';

const { Text } = Typography;

const FieldBadge = ({ item, onRemove, onUpdate, tableName, zoneId, index }) => {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `zone-${zoneId}-${item.id}-${index}`,
    data: { type: 'zone-field', zoneId, index, field: item },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-zone-${zoneId}-${item.id}-${index}`,
    data: { type: 'badge-target', zoneId, index },
  });

  const setCombinedRef = (node) => {
    setDragRef(node);
    setDropRef(node);
  };

  const [searchValue, setSearchValue] = useState('');
  const [availableValues, setAvailableValues] = useState([]);
  const [selectedValues, setSelectedValues] = useState(item.selectedValues || []);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // ── aggType: only used when zoneId === 'values' ───────────────────────────
  const AGG_OPTIONS = ['Count', 'Distinct Count', 'Sum', 'Avg', 'Max', 'Min'];

  const getInitialAggType = (itm) => {
    if (itm?.aggType) return itm.aggType;
    const a = String(itm?.agg || itm?.aggregate || '').toLowerCase().trim();
    if (a === 'distinct_count' || a === 'distinctcount' || a === 'distinct' || a === 'distinct counts') return 'Distinct Count';
    if (a === 'sum') return 'Sum';
    if (a === 'avg') return 'Avg';
    if (a === 'max') return 'Max';
    if (a === 'min') return 'Min';
    return 'Count';
  };

  const [aggType, setAggType] = useState(getInitialAggType(item));

  // ── dateGrouping: used when field is date type ─────────────────────────────
  const isDateField = item.type === 'date' || item.id?.endsWith('_at') || item.id?.endsWith('_date') || item.id === 'date';
  const DATE_GROUP_OPTIONS = [
    { label: 'Month (e.g. 2024-Jan)', value: 'month' },
    { label: 'Year (e.g. 2024)', value: 'year' },
    { label: 'Financial Year (e.g. FY 23-24)', value: 'fy' },
    { label: 'Quarter (e.g. Q1 2024)', value: 'quarter' },
    { label: 'Day (e.g. 2024-03-15)', value: 'day' },
    { label: 'Raw Timestamp', value: 'raw' },
  ];
  const [dateGrouping, setDateGrouping] = useState(item.dateGrouping || 'month');

  // Keep in sync when a saved report is loaded
  useEffect(() => { setAggType(getInitialAggType(item)); }, [item.aggType, item.agg, item.aggregate]);
  useEffect(() => { if (item.dateGrouping) setDateGrouping(item.dateGrouping); }, [item.dateGrouping]);

  const handleAggChange = (newAgg) => {
    setAggType(newAgg);
    const aggCode = newAgg === 'Distinct Count' ? 'distinct_count' : newAgg.toLowerCase();
    onUpdate({ aggType: newAgg, agg: aggCode, aggregate: aggCode });   // persists into zones state
  };

  const handleDateGroupingChange = (newGrp) => {
    setDateGrouping(newGrp);
    onUpdate({ dateGrouping: newGrp }); // persists into zones state
  };

  useEffect(() => {
    const fetchValues = async () => {
      if (!tableName || !item.id) return;
      setLoading(true);
      try {
        const res = await getFieldValues(tableName, item.id, searchValue, '', isDateField ? { dateGrouping } : {});
        if (res.data.status) setAvailableValues(res.data.data);
      } catch (err) {
        console.error('Failed to fetch field values', err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchValues, 300);
    return () => clearTimeout(timer);
  }, [tableName, item.id, searchValue, dateGrouping, isDateField]);

  const handleApply = () => {
    onUpdate({ selectedValues, dateGrouping });
    setPopoverOpen(false);
  };

  const filterContent = (
    <div className="md-filter-popover-box">
      <Input 
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} 
        placeholder="Search values..." 
        size="small"
        value={searchValue}
        onChange={e => setSearchValue(e.target.value)}
        className="md-filter-popover-search"
      />
      <div className="md-filter-popover-scroll">
        {loading ? (
          <div className="md-filter-popover-loading"><Spin size="small" /></div>
        ) : (
          availableValues.map(v => (
            <div key={v.value} className="md-filter-popover-row">
              <Checkbox 
                checked={selectedValues.includes(v.value)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedValues([...selectedValues, v.value]);
                  else setSelectedValues(selectedValues.filter(sv => sv !== v.value));
                }}
              >
                <Text className="md-filter-val-label">{v.value || 'N/A'}</Text>
                <Text type="secondary" className="md-filter-val-count">({v.count})</Text>
              </Checkbox>
            </div>
          ))
        )}
      </div>
      <div className="md-filter-popover-footer">
        <Button size="small" type="text" onClick={() => setSelectedValues([])}>Clear</Button>
        <Button size="small" type="primary" onClick={handleApply} className="md-filter-apply-btn">Apply</Button>
      </div>
    </div>
  );

  // ── Aggregation selector popover content ─────────────────────────────────
  const aggContent = (
    <div className="md-agg-popover-box">
      {AGG_OPTIONS.map(opt => (
        <div
          key={opt}
          onClick={() => handleAggChange(opt)}
          className={`md-agg-popover-item${aggType === opt ? ' is-selected' : ''}`}
        >
          {opt} of
        </div>
      ))}
    </div>
  );

  // ── Date grouping selector popover content ─────────────────────────────────
  const dateGroupingContent = (
    <div className="md-date-popover-box">
      <div className="md-date-popover-title">
        Date Grouping
      </div>
      {DATE_GROUP_OPTIONS.map(opt => (
        <div
          key={opt.value}
          onClick={() => handleDateGroupingChange(opt.value)}
          className={`md-date-popover-item${dateGrouping === opt.value ? ' is-selected' : ''}`}
        >
          <span>{opt.label}</span>
          {dateGrouping === opt.value && <span className="md-date-popover-check">✓</span>}
        </div>
      ))}
    </div>
  );

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  return (
    <span 
      ref={setCombinedRef}
      style={style}
      className={`md-badge-ref${isDragging ? ' dragging' : ''}${isOver ? ' badge-over' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="md-badge-content-left">

        {/* Values zone → aggregation type picker; other zones → value filter */}
        {zoneId === 'values' ? (
          <Popover content={aggContent} trigger="click" placement="bottomLeft">
            <span
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              className="md-agg-picker-pill"
            >
              {aggType} ▾
            </span>
          </Popover>
        ) : (
          <Popover
            content={filterContent}
            trigger="click"
            placement="bottomLeft"
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
          >
            <span
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              className="md-field-filter-trigger"
            >
              <FilterOutlined className={`md-field-filter-icon${selectedValues.length > 0 ? ' has-filters' : ''}`} />
            </span>
          </Popover>
        )}

        {/* Date Grouping badge for date fields in rows/columns/filters */}
        {zoneId !== 'values' && isDateField && (
          <Popover content={dateGroupingContent} trigger="click" placement="bottomLeft">
            <span
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              className="md-date-picker-pill"
              title="Click to change date grouping"
            >
              {DATE_GROUP_OPTIONS.find(o => o.value === dateGrouping)?.label.split(' ')[0] || 'Month'} ▾
            </span>
          </Popover>
        )}

        <span className="md-field-badge-name">
          {item.label}
        </span>
        {selectedValues.length > 0 && zoneId !== 'values' && (
          <span className="md-field-badge-count">
            ({selectedValues.length})
          </span>
        )}
      </div>
      
      <div className="md-badge-content-right">
        <MenuOutlined className="md-badge-drag-icon" />
        <Popconfirm
          title={`Remove "${item.label}"?`}
          description="Are you sure you want to remove this field?"
          onConfirm={(e) => {
            if (e) e.stopPropagation();
            onRemove();
          }}
          okText="Remove"
          cancelText="Cancel"
          okButtonProps={{ danger: true, size: 'small' }}
          cancelButtonProps={{ size: 'small' }}
          placement="topRight"
        >
          <span
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            className="md-badge-remove-wrap"
          >
            <CloseOutlined 
              className="md-badge-remove-ref" 
            />
          </span>
        </Popconfirm>
      </div>
    </span>
  );
};

const DroppableZone = ({ id, items, onRemove, onUpdate, tableName, placeholder, icon }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`md-zone-body-ref ${id}${isOver ? ' is-over' : ''}${items.length === 0 ? ` empty ${id}` : ''}`}
    >
      {items.length === 0 ? (
        <div className="md-empty-zone-content">
          <div className={`md-empty-zone-icon ${id}`}>
            {icon}
          </div>
          <div className="md-drop-placeholder">
            {placeholder}
          </div>
          <div className="md-drop-subtext">
            Drag dimensions or metrics from sidebar
          </div>
        </div>
      ) : (
        <div className="md-zone-items-list">
          {items.map((item, idx) => (
            <FieldBadge 
              key={`${id}-${item.id}-${idx}`} 
              item={item} 
              onRemove={() => onRemove(id, idx)} 
              onUpdate={(updates) => onUpdate(id, idx, updates)}
              tableName={tableName}
              zoneId={id}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PivotDropZones = ({ zones, onRemoveItem, onUpdateItem, tableName }) => {
  const handleClearZone = (zoneId) => {
    const list = zones[zoneId] || [];
    // remove all items in reverse
    for (let i = list.length - 1; i >= 0; i--) {
      onRemoveItem(zoneId, i);
    }
  };

  return (
    <div className="md-config-grid">
      {/* Filters */}
      <div className="md-config-card filters">
        <div className="md-config-header filters">
          <Space size={8} style={{ alignItems: 'center' }}>
            <FilterOutlined className="md-config-icon" />
            <Text strong className="md-config-title">
              Filters
            </Text>
            <Badge count={zones.filters?.length || 0} size="small" className="md-zone-badge" />
          </Space>
          {(zones.filters?.length || 0) > 0 && (
            <Popconfirm
              title="Clear all filters?"
              description="Are you sure you want to clear all fields from Filters?"
              onConfirm={() => handleClearZone('filters')}
              okText="Clear"
              cancelText="Cancel"
              okButtonProps={{ danger: true, size: 'small' }}
              cancelButtonProps={{ size: 'small' }}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                className="md-zone-clear-btn"
              >
                Clear
              </Button>
            </Popconfirm>
          )}
        </div>
        <DroppableZone
          id="filters"
          items={zones.filters || []}
          onRemove={onRemoveItem}
          onUpdate={onUpdateItem}
          tableName={tableName}
          placeholder="Drop filters"
          icon={<FilterOutlined />}
        />
      </div>

      {/* Columns */}
      <div className="md-config-card columns">
        <div className="md-config-header columns">
          <Space size={8} style={{ alignItems: 'center' }}>
            <InsertRowRightOutlined className="md-config-icon" />
            <Text strong className="md-config-title">
              Columns
            </Text>
            <Badge count={zones.columns?.length || 0} size="small" className="md-zone-badge" />
          </Space>
          {(zones.columns?.length || 0) > 0 && (
            <Popconfirm
              title="Clear all columns?"
              description="Are you sure you want to clear all fields from Columns?"
              onConfirm={() => handleClearZone('columns')}
              okText="Clear"
              cancelText="Cancel"
              okButtonProps={{ danger: true, size: 'small' }}
              cancelButtonProps={{ size: 'small' }}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                className="md-zone-clear-btn"
              >
                Clear
              </Button>
            </Popconfirm>
          )}
        </div>
        <DroppableZone
          id="columns"
          items={zones.columns || []}
          onRemove={onRemoveItem}
          onUpdate={onUpdateItem}
          tableName={tableName}
          placeholder="Drop columns"
          icon={<InsertRowRightOutlined />}
        />
      </div>

      {/* Rows */}
      <div className="md-config-card rows">
        <div className="md-config-header rows">
          <Space size={8} style={{ alignItems: 'center' }}>
            <MenuOutlined className="md-config-icon" />
            <Text strong className="md-config-title">
              Rows
            </Text>
            <Badge count={zones.rows?.length || 0} size="small" className="md-zone-badge" />
          </Space>
          {(zones.rows?.length || 0) > 0 && (
            <Popconfirm
              title="Clear all rows?"
              description="Are you sure you want to clear all fields from Rows?"
              onConfirm={() => handleClearZone('rows')}
              okText="Clear"
              cancelText="Cancel"
              okButtonProps={{ danger: true, size: 'small' }}
              cancelButtonProps={{ size: 'small' }}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                className="md-zone-clear-btn"
              >
                Clear
              </Button>
            </Popconfirm>
          )}
        </div>
        <DroppableZone
          id="rows"
          items={zones.rows || []}
          onRemove={onRemoveItem}
          onUpdate={onUpdateItem}
          tableName={tableName}
          placeholder="Drop rows"
          icon={<MenuOutlined />}
        />
      </div>

      {/* Values */}
      <div className="md-config-card values">
        <div className="md-config-header values">
          <Space size={8} style={{ alignItems: 'center' }}>
            <CalculatorOutlined className="md-config-icon" />
            <Text strong className="md-config-title">
              Values & Metrics
            </Text>
            <Badge count={zones.values?.length || 0} size="small" className="md-zone-badge" />
          </Space>
          {(zones.values?.length || 0) > 0 && (
            <Popconfirm
              title="Clear all metrics?"
              description="Are you sure you want to clear all fields from Values?"
              onConfirm={() => handleClearZone('values')}
              okText="Clear"
              cancelText="Cancel"
              okButtonProps={{ danger: true, size: 'small' }}
              cancelButtonProps={{ size: 'small' }}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                className="md-zone-clear-btn"
              >
                Clear
              </Button>
            </Popconfirm>
          )}
        </div>
        <DroppableZone
          id="values"
          items={zones.values || []}
          onRemove={onRemoveItem}
          onUpdate={onUpdateItem}
          tableName={tableName}
          placeholder="Drop values"
          icon={<CalculatorOutlined />}
        />
      </div>
    </div>
  );
};

export default PivotDropZones;
