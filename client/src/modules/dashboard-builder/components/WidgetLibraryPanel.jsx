import React, { useState } from 'react';
import { Input, Typography, Tag, Button, Empty, Tooltip, Badge, Tabs } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  DragOutlined,
  AppstoreOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  LineOutlined,
  InfoCircleOutlined,
  LayoutOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';

const { Text, Title } = Typography;

const ELEMENTOR_ELEMENTS = [
  {
    type: 'heading_block',
    title: 'Heading (H Tag)',
    icon: <FontSizeOutlined style={{ color: '#2563eb', fontSize: '16px' }} />,
    bg: '#eff6ff',
    description: 'H1 - H4 section titles & headers',
    defaultConfig: { text: 'Section Heading', level: 'h2', align: 'left', color: '#0f172a' },
  },
  {
    type: 'paragraph_block',
    title: 'Text / Paragraph (P Tag)',
    icon: <AlignLeftOutlined style={{ color: '#7c3aed', fontSize: '16px' }} />,
    bg: '#f5f3ff',
    description: 'Rich description, notes or commentary',
    defaultConfig: { text: 'Enter your explanatory text or description paragraph here...', align: 'left', color: '#475569' },
  },
  {
    type: 'divider_block',
    title: 'Divider / Line Break',
    icon: <LineOutlined style={{ color: '#f59e0b', fontSize: '16px' }} />,
    bg: '#fffbeb',
    description: 'Clean visual section separator line',
    defaultConfig: { style: 'solid', color: '#e2e8f0', height: 20 },
  },
  {
    type: 'alert_block',
    title: 'Callout / Notice Box',
    icon: <InfoCircleOutlined style={{ color: '#059669', fontSize: '16px' }} />,
    bg: '#ecfdf5',
    description: 'Highlighted notice or warning alert',
    defaultConfig: { message: 'Important Notice', description: 'This is an information callout for users.', type: 'info' },
  },
];

const getChartIcon = (type) => {
  switch (type) {
    case 'kpi_card':
      return { icon: <AppstoreOutlined style={{ color: '#2563eb' }} />, bg: '#eff6ff' };
    case 'column':
    case 'bar':
      return { icon: <BarChartOutlined style={{ color: '#16a34a' }} />, bg: '#f0fdf4' };
    case 'line':
    case 'spline':
      return { icon: <LineChartOutlined style={{ color: '#0284c7' }} />, bg: '#f0f9ff' };
    case 'pie':
    case 'doughnut':
      return { icon: <PieChartOutlined style={{ color: '#ea580c' }} />, bg: '#fff7ed' };
    case 'area':
      return { icon: <AreaChartOutlined style={{ color: '#9333ea' }} />, bg: '#faf5ff' };
    case 'scatter':
      return { icon: <DotChartOutlined style={{ color: '#db2777' }} />, bg: '#fdf2f8' };
    case 'heatmap':
      return { icon: <FireOutlined style={{ color: '#dc2626' }} />, bg: '#fef2f2' };
    default:
      return { icon: <TableOutlined style={{ color: '#475569' }} />, bg: '#f8fafc' };
  }
};

const getTableColor = (tableName) => {
  if (!tableName) return { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
  const lower = tableName.toLowerCase();
  if (lower.includes('pan')) return { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
  if (lower.includes('project')) return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  if (lower.includes('fy') || lower.includes('year')) return { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
};

const DraggableWidgetItem = ({ widget, onAdd }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `widget-lib-${widget.id || widget.tpsr_id}`,
    data: { widget, type: 'library-widget' },
  });

  const chartType = widget.chart_type || widget.tpsr_chart_type || 'column';
  const name = widget.report_name || widget.tpsr_report_name || 'Untitled Widget';
  const tableName = widget.table_name || widget.tpsr_table_name || 'General';
  const iconMeta = getChartIcon(chartType);
  const tableColor = getTableColor(tableName);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="db-widget-item-card"
      style={{
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: iconMeta.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              flexShrink: 0,
              border: `1px solid ${iconMeta.bg}`,
            }}
          >
            {iconMeta.icon}
          </div>
          <Text
            strong
            style={{
              fontSize: '13px',
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 600,
            }}
          >
            {name}
          </Text>
        </div>
        <Tooltip title="Add to Active Row">
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined style={{ fontSize: '11px' }} />}
            style={{
              background: '#f0fdf4',
              borderColor: '#86efac',
              color: '#15803d',
              borderRadius: '6px',
              height: '26px',
              fontWeight: 600,
              padding: '0 8px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onAdd(widget);
            }}
          >
            Add
          </Button>
        </Tooltip>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '11px',
            color: tableColor.color,
            background: tableColor.bg,
            border: `1px solid ${tableColor.border}`,
            padding: '1px 7px',
            borderRadius: '5px',
            fontWeight: 500,
          }}
        >
          {tableName}
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize', fontWeight: 500 }}>
          {chartType === 'kpi_card' ? 'KPI Stat' : chartType}
        </span>
      </div>
    </div>
  );
};

const WidgetLibraryPanel = ({ widgets = [], onAddWidget, onAddElement }) => {
  const [activeTab, setActiveTab] = useState('widgets');
  const [search, setSearch] = useState('');

  const filteredWidgets = widgets.filter((w) => {
    const name = (w.report_name || w.tpsr_report_name || '').toLowerCase();
    const table = (w.table_name || w.tpsr_table_name || '').toLowerCase();
    return name.includes(search.toLowerCase()) || table.includes(search.toLowerCase());
  });

  return (
    <div className="db-widget-library">
      <div className="db-widget-library-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppstoreOutlined style={{ color: '#15803d', fontSize: '17px' }} />
            <Text strong style={{ fontSize: '15px', color: '#0f172a', letterSpacing: '-0.2px' }}>
              Toolbox
            </Text>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
            Drag or Click +
          </span>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          items={[
            {
              key: 'widgets',
              label: (
                <span style={{ fontWeight: 600 }}>
                  Charts & Data <Badge count={filteredWidgets.length} size="small" style={{ backgroundColor: '#15803d', marginLeft: 4 }} />
                </span>
              ),
            },
            {
              key: 'elements',
              label: (
                <span style={{ fontWeight: 600 }}>
                  Layout & Typography
                </span>
              ),
            },
          ]}
        />

        {activeTab === 'widgets' && (
          <Input
            placeholder="Search widgets & charts..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            size="small"
            style={{ borderRadius: 8, marginTop: '8px', padding: '5px 10px' }}
          />
        )}
      </div>

      <div className="db-widget-list">
        {activeTab === 'widgets' ? (
          filteredWidgets.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: '12px', color: '#94a3b8' }}>No saved widgets found</span>}
              style={{ margin: '40px 0' }}
            />
          ) : (
            filteredWidgets.map((widget) => (
              <DraggableWidgetItem
                key={widget.id || widget.tpsr_id}
                widget={widget}
                onAdd={onAddWidget}
              />
            ))
          )
        ) : (
          ELEMENTOR_ELEMENTS.map((el) => (
            <div
              key={el.type}
              className="db-widget-item-card"
              onClick={() => onAddElement(el)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: el.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {el.icon}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                      {el.title}
                    </Text>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {el.description}
                    </span>
                  </div>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  style={{ color: '#15803d', background: '#f0fdf4', borderRadius: 6, fontWeight: 600 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddElement(el);
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WidgetLibraryPanel;
