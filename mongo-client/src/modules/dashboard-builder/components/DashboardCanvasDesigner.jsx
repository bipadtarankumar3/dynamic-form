import React, { useState, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Input,
  Button,
  Select,
  Switch,
  Space,
  Tag,
  Typography,
  Tooltip,
  Dropdown,
  Spin,
  Empty,
  Popconfirm,
  App,
  Card,
  Modal,
  Popover,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ArrowLeftOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  HolderOutlined,
  DeleteOutlined,
  SettingOutlined,
  ColumnWidthOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
  AreaChartOutlined,
  DollarOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  BgColorsOutlined,
  SafetyCertificateOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  LineOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  AppstoreAddOutlined,
  EditOutlined,
  LayoutOutlined,
  FireOutlined,
} from '@ant-design/icons';

import WidgetLibraryPanel from './WidgetLibraryPanel';
import ConfigureFiltersModal from './ConfigureFiltersModal';
import RoleAccessModal from './RoleAccessModal';
import DynamicFilterBar from './DynamicFilterBar';
import PivotChart, { KPI_ICON_MAP, KPI_COLOR_THEMES } from '@/modules/pivot-dashboard/components/PivotChart';
import { executePivot } from '@/services/pivot-service';
import { fyListAPI } from '@/services/common-service';
import {
  createCustomDashboard,
  updateCustomDashboard,
} from '@/services/dashboard-builder-service';
import * as yup from 'yup';

const dashboardValidationSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required('Dashboard Title is required')
    .min(2, 'Dashboard Title must be at least 2 characters'),
  canvasRows: yup
    .array()
    .min(1, 'Please add at least one Row / Section with widgets to your dashboard before publishing'),
});

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Column layout presets for Elementor rows (Supporting 1 to 8 columns and unlimited custom columns)
export const ROW_PRESETS = [
  { id: '1-col', name: '1 Column (Full Width 100%)', spans: [24], label: '1 Col (100%)' },
  { id: '2-col-equal', name: '2 Columns (50% / 50%)', spans: [12, 12], label: '2 Cols (50% / 50%)' },
  { id: '3-col-equal', name: '3 Columns (33% × 3)', spans: [8, 8, 8], label: '3 Cols (33% × 3)' },
  { id: '4-col-equal', name: '4 Columns (25% × 4)', spans: [6, 6, 6, 6], label: '4 Cols (25% × 4)' },
  { id: '5-col-equal', name: '5 Columns (20% × 5)', spans: [4.8, 4.8, 4.8, 4.8, 4.8], label: '5 Cols (20% × 5)' },
  { id: '6-col-equal', name: '6 Columns (16.6% × 6)', spans: [4, 4, 4, 4, 4, 4], label: '6 Cols (16.6% × 6)' },
  { id: '7-col-equal', name: '7 Columns (14.3% × 7)', spans: [3.428, 3.428, 3.428, 3.428, 3.428, 3.428, 3.428], label: '7 Cols (14.3% × 7)' },
  { id: '8-col-equal', name: '8 Columns (12.5% × 8)', spans: [3, 3, 3, 3, 3, 3, 3, 3], label: '8 Cols (12.5% × 8)' },
  { id: '2-col-left-wide', name: '2 Columns (66% / 33%)', spans: [16, 8], label: '66% / 33%' },
  { id: '2-col-right-wide', name: '2 Columns (33% / 66%)', spans: [8, 16], label: '33% / 66%' },
];

const CHART_TYPES = [
  { label: 'KPI / Metric Card', value: 'kpi_card', icon: <DollarOutlined /> },
  { label: 'Vertical Column Chart (Bottom to Top)', value: 'column', icon: <BarChartOutlined /> },
  { label: 'Horizontal Bar Chart (Left to Right)', value: 'horizontal_bar', icon: <BarChartOutlined style={{ transform: 'rotate(90deg)' }} /> },
  { label: 'Line Chart', value: 'line', icon: <LineChartOutlined /> },
  { label: 'Pie Chart', value: 'pie', icon: <PieChartOutlined /> },
  { label: 'Doughnut Chart', value: 'doughnut', icon: <PieChartOutlined /> },
  { label: 'Area Chart', value: 'area', icon: <AreaChartOutlined /> },
  { label: 'Heatmap', value: 'heatmap', icon: <FireOutlined /> },
  { label: 'Table Grid', value: 'none', icon: <TableOutlined /> },
];

// Helper to convert flat widget list into structured rows if needed
const normalizeLayoutToRows = (layout) => {
  if (!Array.isArray(layout) || layout.length === 0) return [];
  // If already structured with columns
  if (layout[0] && Array.isArray(layout[0].columns)) {
    return layout;
  }
  // If legacy flat array, wrap widgets into rows based on section_headers or column spans
  const rows = [];
  let currentRow = {
    id: `row-${Date.now()}-0`,
    title: '',
    headingTag: 'h2',
    subtitle: '',
    preset: '2-col-equal',
    columns: [{ id: 'col-0', span: 24, items: [] }],
  };

  layout.forEach((w, idx) => {
    if (w.type === 'section_header' || w.chart_type === 'section_header') {
      if (currentRow.columns[0].items.length > 0) {
        rows.push(currentRow);
      }
      currentRow = {
        id: `row-${Date.now()}-${idx}`,
        title: w.title || '',
        headingTag: 'h2',
        subtitle: '',
        preset: '2-col-equal',
        columns: [{ id: 'col-0', span: 24, items: [] }],
      };
    } else {
      currentRow.columns[0].items.push(w);
    }
  });

  if (currentRow.columns[0].items.length > 0 || currentRow.title) {
    rows.push(currentRow);
  }
  return rows;
};

// ── RENDER CONTENT BLOCK WIDGETS (Heading, Paragraph, Divider, Alert) ──
const ContentBlockWidget = ({ item, onUpdateConfig, onRemove, isPreview }) => {
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
      <div className="el-heading-widget" style={{ textAlign: config.align || 'left', position: 'relative' }}>
        {!isPreview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Select
              size="small"
              value={config.level || 'h2'}
              onChange={(val) => onUpdateConfig?.(item.instanceId, { level: val })}
              style={{ width: 70 }}
              options={[
                { label: 'H1', value: 'h1' },
                { label: 'H2', value: 'h2' },
                { label: 'H3', value: 'h3' },
                { label: 'H4', value: 'h4' },
              ]}
            />
            <Input
              value={config.text || ''}
              placeholder="Enter Heading Text..."
              onChange={(e) => onUpdateConfig?.(item.instanceId, { text: e.target.value })}
              style={{ ...tagStyles[config.level || 'h2'], border: '1px dashed #cbd5e1', padding: '4px 8px', borderRadius: 6 }}
            />
            <Popconfirm title="Delete Heading?" onConfirm={() => onRemove?.(item.instanceId)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        ) : (
          <TagComponent style={tagStyles[config.level || 'h2']}>
            {config.text || 'Heading'}
          </TagComponent>
        )}
      </div>
    );
  }

  if (item.type === 'paragraph_block') {
    return (
      <div className="el-paragraph-widget" style={{ textAlign: config.align || 'left' }}>
        {!isPreview ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>PARAGRAPH (P TAG)</span>
              <Popconfirm title="Delete Paragraph?" onConfirm={() => onRemove?.(item.instanceId)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <TextArea
              rows={2}
              value={config.text || ''}
              placeholder="Enter description text, notes or commentary..."
              onChange={(e) => onUpdateConfig?.(item.instanceId, { text: e.target.value })}
              style={{ borderRadius: 6, fontSize: '13px', color: '#334155' }}
            />
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '14px', color: config.color || '#475569', lineHeight: 1.6 }}>
            {config.text}
          </p>
        )}
      </div>
    );
  }

  if (item.type === 'divider_block') {
    return (
      <div className="el-divider-widget">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <hr
            style={{
              flex: 1,
              border: 'none',
              borderTop: `${config.height || 1}px ${config.style || 'solid'} ${config.color || '#e2e8f0'}`,
              margin: '10px 0',
            }}
          />
          {!isPreview && (
            <Popconfirm title="Delete Divider?" onConfirm={() => onRemove?.(item.instanceId)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </div>
      </div>
    );
  }

  if (item.type === 'alert_block') {
    return (
      <div className="el-alert-widget">
        <Alert
          message={config.message || 'Important Notice'}
          description={config.description || 'Information message for dashboard users.'}
          type={config.type || 'info'}
          showIcon
          action={
            !isPreview && (
              <Popconfirm title="Delete Notice?" onConfirm={() => onRemove?.(item.instanceId)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )
          }
        />
      </div>
    );
  }

  return null;
};

// ── RENDER DATA CHART & KPI WIDGET ──
const DataWidgetCard = ({
  item,
  onUpdateChartType,
  onUpdateCustomConfig,
  onRemove,
  selectedFy,
  activeFilters = {},
  topFilters = [],
  dataScope = 'all',
  isPreview,
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
          const filterKey =
            filter.filter_key ||
            (filter.table_name && filter.field
              ? `${filter.table_name}__${filter.field}__${(filter.label || '').toLowerCase().replace(/\s+/g, '_')}`
              : filter.id);

          const values = activeFilters[filterKey] || (filter.id ? activeFilters[filter.id] : undefined);
          if (Array.isArray(values) && values.length > 0) {
            const targetField = filter.field || filter.id;
            existingFilters = existingFilters.filter((f) => f.id !== targetField && f.id !== filterKey);
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

  const isKpiCard = item.chart_type === 'kpi_card';

  const chartMenu = {
    items: CHART_TYPES.map((ct) => ({
      key: ct.value,
      icon: ct.icon,
      label: ct.label,
      onClick: () => onUpdateChartType?.(item.instanceId, ct.value),
    })),
  };

  return (
    <div className={`db-widget-card ${isKpiCard ? 'is-kpi-card' : ''}`} style={{ height: '100%' }}>
      <div
        className="db-widget-card-header"
        style={{
          padding: isKpiCard ? '6px 10px' : '8px 12px',
          background: isKpiCard ? '#f8fafc' : '#ffffff',
          borderBottom: isKpiCard ? '1px dashed #e2e8f0' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          {!isKpiCard && (
            <Text
              strong
              style={{
                fontSize: '13px',
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.title || item.report_name || 'Widget'}
            </Text>
          )}
          {item.table_name && (
            <Tag color="green" style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px', margin: 0, borderRadius: 3 }}>
              {item.table_name}
            </Tag>
          )}
        </div>

        {!isPreview && (
          <Space size={4}>
            {!isKpiCard && (
              <Popover
                trigger="click"
                placement="bottomRight"
                title={<span style={{ fontWeight: 700, color: '#0f172a' }}>Chart & Axis Controls</span>}
                content={
                  <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Show Data Numbers</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Display values on bars/points</div>
                      </div>
                      <Switch
                        size="small"
                        checked={Boolean(item.configuration?.customConfig?.showDataLabels)}
                        onChange={(checked) => onUpdateCustomConfig?.(item.instanceId, { showDataLabels: checked })}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>X-AXIS LABELS ROTATION</div>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={item.configuration?.customConfig?.labelRotation ?? -45}
                        onChange={(val) => onUpdateCustomConfig?.(item.instanceId, { labelRotation: val })}
                        options={[
                          { label: 'Slanted (-45°)', value: -45 },
                          { label: 'Horizontal (0°)', value: 0 },
                          { label: 'Vertical (-90°)', value: -90 },
                          { label: 'Hide Labels', value: 'hidden' },
                        ]}
                      />
                    </div>

                    {(item.chart_type === 'bar' || item.chart_type === 'column' || item.chart_type === 'horizontal_bar' || !item.chart_type || item.chart_type === 'area') && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>BAR STACKING MODE</div>
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          value={item.configuration?.customConfig?.stacking || 'none'}
                          onChange={(val) => onUpdateCustomConfig?.(item.instanceId, { stacking: val })}
                          options={[
                            { label: 'Grouped (Side-by-Side)', value: 'none' },
                            { label: 'Stacked on Top', value: 'normal' },
                            { label: '100% Percent Stacked', value: 'percent' },
                          ]}
                        />
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>NUMBER FORMATTING</div>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={item.configuration?.customConfig?.numberFormat || 'compact'}
                        onChange={(val) => onUpdateCustomConfig?.(item.instanceId, { numberFormat: val })}
                        options={[
                          { label: 'Compact (150M, 36.4k)', value: 'compact' },
                          { label: 'Indian Currency (₹ Cr / L)', value: 'currency_inr' },
                          { label: 'Raw Numbers (123,456)', value: 'raw' },
                        ]}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>LEGEND POSITION</div>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={item.configuration?.customConfig?.legendPosition || 'top'}
                        onChange={(val) => onUpdateCustomConfig?.(item.instanceId, { legendPosition: val })}
                        options={[
                          { label: 'Top Header', value: 'top' },
                          { label: 'Bottom Footer', value: 'bottom' },
                          { label: 'Right Sidebar', value: 'right' },
                          { label: 'Hide Legend', value: 'none' },
                        ]}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Show Background Grid</span>
                      <Switch
                        size="small"
                        checked={item.configuration?.customConfig?.showGridlines !== false}
                        onChange={(checked) => onUpdateCustomConfig?.(item.instanceId, { showGridlines: checked })}
                      />
                    </div>
                  </div>
                }
              >
                <Tooltip title="Chart & Axis Controls">
                  <Button
                    size="small"
                    type="text"
                    icon={<SettingOutlined style={{ color: '#2563eb', fontSize: '13px' }} />}
                    style={{ padding: '0 4px', height: '24px', minWidth: '24px' }}
                  />
                </Tooltip>
              </Popover>
            )}

            <Tooltip title={`Chart Type: ${item.chart_type || 'column'}`}>
              <Dropdown menu={chartMenu} trigger={['click']}>
                <Button
                  size="small"
                  type="text"
                  icon={
                    item.chart_type === 'heatmap' ? (
                      <FireOutlined style={{ fontSize: '12px', color: '#dc2626' }} />
                    ) : item.chart_type === 'line' ? (
                      <LineChartOutlined style={{ fontSize: '12px', color: '#059669' }} />
                    ) : item.chart_type === 'pie' || item.chart_type === 'doughnut' ? (
                      <PieChartOutlined style={{ fontSize: '12px', color: '#8b5cf6' }} />
                    ) : item.chart_type === 'area' ? (
                      <AreaChartOutlined style={{ fontSize: '12px', color: '#d97706' }} />
                    ) : item.chart_type === 'none' ? (
                      <TableOutlined style={{ fontSize: '12px', color: '#475569' }} />
                    ) : (
                      <BarChartOutlined style={{ fontSize: '12px', color: '#475569' }} />
                    )
                  }
                >
                  <span style={{ fontSize: '10px', textTransform: 'capitalize', fontWeight: 500 }}>
                    {item.chart_type === 'kpi_card'
                      ? 'KPI'
                      : item.chart_type === 'horizontal_bar'
                      ? 'Bar (H)'
                      : item.chart_type === 'heatmap'
                      ? 'Heatmap'
                      : item.chart_type || 'Column'}
                  </span>
                </Button>
              </Dropdown>
            </Tooltip>

            <Popconfirm title="Remove widget" onConfirm={() => onRemove?.(item.instanceId)} okButtonProps={{ danger: true }}>
              <Button size="small" type="text" danger icon={<DeleteOutlined style={{ fontSize: '12px' }} />} />
            </Popconfirm>
          </Space>
        )}
      </div>

      <div className="db-widget-card-body" style={{ minHeight: isKpiCard ? '86px' : '300px', padding: isKpiCard ? '12px' : '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isKpiCard ? '60px' : '260px' }}>
            <Spin size={isKpiCard ? 'small' : 'default'} />
          </div>
        ) : data.length > 0 ? (
          <div style={{ height: isKpiCard ? 'auto' : '340px', width: '100%' }}>
            <PivotChart
              type={item.chart_type && item.chart_type !== 'none' ? item.chart_type : 'column'}
              title={item.title || item.report_name}
              data={data}
              rows={item.configuration?.rows || []}
              columns={item.configuration?.columns || []}
              values={item.configuration?.values || []}
              customConfig={item.configuration?.customConfig || item.customConfig || {}}
            />
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ fontSize: '12px', color: '#94a3b8' }}>No data available</span>}
            style={{ margin: 'auto' }}
          />
        )}
      </div>
    </div>
  );
};

// ── ELEMENTOR-STYLE SECTION ROW CONTAINER ──
const ElementorSectionRow = ({
  row,
  rowIndex,
  totalRows,
  onUpdateRow,
  onMoveRow,
  onDeleteRow,
  onAddItemToColumn,
  onRemoveItem,
  onUpdateItemConfig,
  onUpdateChartType,
  savedWidgets = [],
  selectedFy,
  activeFilters,
  topFilters,
  dataScope,
  isPreview,
}) => {
  const [addModalColIndex, setAddModalColIndex] = useState(null);

  const preset = ROW_PRESETS.find((p) => p.id === row.preset) || ROW_PRESETS[1];
  const columns = row.columns || [];

  const TagHeading = row.headingTag || 'h2';

  return (
    <div className={`el-section-container ${row.isTransparent ? 'is-transparent' : ''} ${isPreview ? 'is-preview-mode' : ''}`}>
      {/* Row / Section Header Bar */}
      {(row.title || !isPreview) && (
        <div className="el-section-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {!isPreview && (
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <HolderOutlined style={{ fontSize: '16px' }} />
              </span>
            )}

            {!isPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <Select
                  size="small"
                  value={row.headingTag || 'h2'}
                  onChange={(val) => onUpdateRow(row.id, { headingTag: val })}
                  style={{ width: 65 }}
                  options={[
                    { label: 'H1', value: 'h1' },
                    { label: 'H2', value: 'h2' },
                    { label: 'H3', value: 'h3' },
                    { label: 'H4', value: 'h4' },
                  ]}
                />
                <Input
                  placeholder="Section Title (e.g. Key Performance Indicators, Yearly Trends...)"
                  value={row.title || ''}
                  onChange={(e) => onUpdateRow(row.id, { title: e.target.value })}
                  style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', border: 'none', background: 'transparent', flex: 1 }}
                />
              </div>
            ) : (
              <div>
                <TagHeading style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '18px' }}>
                  {row.title}
                </TagHeading>
                {row.subtitle && (
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    {row.subtitle}
                  </Text>
                )}
              </div>
            )}
          </div>

          {!isPreview && (
            <Space size={6}>
              {/* Row Container Style: Card vs Transparent (No Background Card) */}
              <Tooltip title={row.isTransparent ? 'Container: Transparent (No Background Card). Click to switch to White Card.' : 'Container: White Card Box. Click to make Transparent (No Card).'}>
                <Button
                  size="small"
                  icon={<BgColorsOutlined />}
                  onClick={() => onUpdateRow(row.id, { isTransparent: !row.isTransparent })}
                  style={{
                    color: row.isTransparent ? '#2563eb' : '#64748b',
                    borderColor: row.isTransparent ? '#93c5fd' : undefined,
                    background: row.isTransparent ? '#eff6ff' : undefined,
                    fontWeight: 600,
                  }}
                >
                  {row.isTransparent ? 'Transparent' : 'Card'}
                </Button>
              </Tooltip>

              {/* Add / Remove Column Buttons */}
              <Space size={4}>
                <Tooltip title="Add an extra column to this row (no limit)">
                  <Button
                    size="small"
                    icon={<PlusOutlined style={{ color: '#15803d' }} />}
                    onClick={() => {
                      const newCols = [
                        ...row.columns,
                        { id: `col-${row.columns.length}`, span: 24 / (row.columns.length + 1), items: [] },
                      ];
                      onUpdateRow(row.id, {
                        columns: newCols.map((c) => ({ ...c, span: 24 / newCols.length })),
                        preset: 'custom',
                      });
                    }}
                    style={{ borderColor: '#86efac', color: '#15803d', fontWeight: 600 }}
                  >
                    Col ({columns.length + 1})
                  </Button>
                </Tooltip>

                {columns.length > 1 && (
                  <Tooltip title="Remove last column from row">
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        const newCols = row.columns.slice(0, -1);
                        onUpdateRow(row.id, {
                          columns: newCols.map((c) => ({ ...c, span: 24 / newCols.length })),
                          preset: 'custom',
                        });
                      }}
                    >
                      - Col
                    </Button>
                  </Tooltip>
                )}
              </Space>

              {/* Column Layout Preset Dropdown */}
              <Dropdown
                menu={{
                  items: ROW_PRESETS.map((p) => ({
                    key: p.id,
                    label: p.name,
                    onClick: () => {
                      const newCols = p.spans.map((span, idx) => ({
                        id: `col-${idx}`,
                        span,
                        items: row.columns[idx]?.items || [],
                      }));
                      onUpdateRow(row.id, { preset: p.id, columns: newCols });
                    },
                  })),
                }}
              >
                <Button size="small" icon={<ColumnWidthOutlined />}>
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>{preset?.label || `${columns.length} Cols`}</span>
                </Button>
              </Dropdown>

              {/* Move Row Up / Down */}
              <Button
                size="small"
                disabled={rowIndex === 0}
                icon={<ArrowUpOutlined />}
                onClick={() => onMoveRow(rowIndex, rowIndex - 1)}
              />
              <Button
                size="small"
                disabled={rowIndex === totalRows - 1}
                icon={<ArrowDownOutlined />}
                onClick={() => onMoveRow(rowIndex, rowIndex + 1)}
              />

              {/* Delete Row */}
              <Popconfirm title="Delete this entire row/section?" onConfirm={() => onDeleteRow(row.id)} okButtonProps={{ danger: true }}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        </div>
      )}

      {/* Row Columns Body */}
      <div className="el-section-content-body">
        <div className="el-row-grid">
          {columns.map((col, colIdx) => {
            const colWidth = col.span ? `${(Number(col.span) / 24) * 100}%` : `${100 / Math.max(1, columns.length)}%`;
            const hasItems = (col.items || []).length > 0;

            return (
              <div
                key={col.id || colIdx}
                className="el-column-slot db-canvas-item"
                style={{
                  flex: `0 0 ${colWidth}`,
                  width: colWidth,
                  maxWidth: colWidth,
                  boxSizing: 'border-box',
                }}
              >
                <div className={`el-column-inner ${hasItems ? 'has-items' : ''}`}>
                  {col.items && col.items.length > 0 ? (
                    col.items.map((item, itIdx) => (
                      <div key={item.instanceId} style={{ marginBottom: itIdx === (col.items.length - 1) ? 0 : 8 }}>
                        {item.type && item.type.endsWith('_block') ? (
                          <ContentBlockWidget
                            item={item}
                            onUpdateConfig={onUpdateItemConfig}
                            onRemove={onRemoveItem}
                            isPreview={isPreview}
                          />
                        ) : (
                          <DataWidgetCard
                            item={item}
                            onUpdateChartType={onUpdateChartType}
                            onUpdateCustomConfig={onUpdateItemConfig}
                            onRemove={onRemoveItem}
                            selectedFy={selectedFy}
                            activeFilters={activeFilters}
                            topFilters={topFilters}
                            dataScope={dataScope}
                            isPreview={isPreview}
                          />
                        )}
                      </div>
                    ))
                  ) : !isPreview ? (
                    <div
                      className="el-column-empty-placeholder"
                      style={{ position: 'relative' }}
                      onClick={() => setAddModalColIndex(colIdx)}
                    >
                      {columns.length > 1 && (
                        <Tooltip title="Delete this specific column">
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newCols = columns.filter((_, idx) => idx !== colIdx);
                              onUpdateRow(row.id, {
                                columns: newCols.map((c) => ({ ...c, span: 24 / newCols.length })),
                                preset: 'custom',
                              });
                            }}
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              height: '24px',
                              width: '24px',
                              padding: 0,
                              background: '#ffffff',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          />
                        </Tooltip>
                      )}
                      <PlusOutlined style={{ fontSize: '20px', color: '#15803d' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Add Widget / Element</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Column {colIdx + 1} of {columns.length}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Add Modal inside Column */}
      <Modal
        title={`Add to Row ${rowIndex + 1} • Column ${(addModalColIndex || 0) + 1}`}
        open={addModalColIndex !== null}
        onCancel={() => setAddModalColIndex(null)}
        footer={null}
        width={550}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', marginBottom: '8px' }}>
              📊 CHARTS & DATA WIDGETS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: 200, overflowY: 'auto' }}>
              {savedWidgets.map((w) => (
                <div
                  key={w.id || w.tpsr_id}
                  onClick={() => {
                    onAddItemToColumn(row.id, addModalColIndex, {
                      instanceId: `cw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                      widgetId: w.id || w.tpsr_id,
                      title: w.report_name || w.tpsr_report_name || 'Widget',
                      table_name: w.table_name || w.tpsr_table_name,
                      chart_type: w.chart_type || 'column',
                      configuration: w.configuration || {},
                    });
                    setAddModalColIndex(null);
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: '#ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '12px', color: '#0f172a' }}>{w.report_name || w.tpsr_report_name}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{w.table_name} • {w.chart_type || 'column'}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>
              🧩 LAYOUT & CONTENT ELEMENTS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <Button
                icon={<FontSizeOutlined style={{ color: '#2563eb' }} />}
                onClick={() => {
                  onAddItemToColumn(row.id, addModalColIndex, {
                    instanceId: `el-${Date.now()}`,
                    type: 'heading_block',
                    title: 'Heading',
                    configuration: { text: 'Section Heading', level: 'h2', align: 'left', color: '#0f172a' },
                  });
                  setAddModalColIndex(null);
                }}
              >
                Heading (H Tag)
              </Button>
              <Button
                icon={<AlignLeftOutlined style={{ color: '#7c3aed' }} />}
                onClick={() => {
                  onAddItemToColumn(row.id, addModalColIndex, {
                    instanceId: `el-${Date.now()}`,
                    type: 'paragraph_block',
                    title: 'Paragraph',
                    configuration: { text: 'Enter your explanatory text or description paragraph here...', align: 'left' },
                  });
                  setAddModalColIndex(null);
                }}
              >
                Paragraph (P Tag)
              </Button>
              <Button
                icon={<LineOutlined style={{ color: '#f59e0b' }} />}
                onClick={() => {
                  onAddItemToColumn(row.id, addModalColIndex, {
                    instanceId: `el-${Date.now()}`,
                    type: 'divider_block',
                    title: 'Divider',
                    configuration: { style: 'solid', color: '#e2e8f0', height: 1 },
                  });
                  setAddModalColIndex(null);
                }}
              >
                Divider / Break
              </Button>
              <Button
                icon={<InfoCircleOutlined style={{ color: '#10b981' }} />}
                onClick={() => {
                  onAddItemToColumn(row.id, addModalColIndex, {
                    instanceId: `el-${Date.now()}`,
                    type: 'alert_block',
                    title: 'Callout Notice',
                    configuration: { message: 'Important Notice', description: 'Information banner for users.', type: 'info' },
                  });
                  setAddModalColIndex(null);
                }}
              >
                Callout Notice
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── MAIN DASHBOARD CANVAS DESIGNER ──
const DashboardCanvasDesigner = ({
  dashboard,
  savedWidgets = [],
  roles = [],
  onBack,
  onCancel,
  onSave,
  createDashboard = createCustomDashboard,
  updateDashboard = updateCustomDashboard,
}) => {
  const { message } = App.useApp();
  const handleBack = onBack || onCancel || (() => {});
  const [savingType, setSavingType] = useState(null); // 'draft' | 'publish' | null
  const [name, setName] = useState(dashboard?.tdb_name || '');
  const [description, setDescription] = useState(dashboard?.tdb_description || '');
  const [roleConfigs, setRoleConfigs] = useState(() => {
    if (!dashboard?.tdb_roles) return [];
    if (Array.isArray(dashboard.tdb_roles)) return dashboard.tdb_roles;
    try {
      return JSON.parse(dashboard.tdb_roles);
    } catch {
      return [];
    }
  });
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [dataScope, setDataScope] = useState(dashboard?.tdb_data_scope || 'all');
  const [isDefault, setIsDefault] = useState(dashboard?.tdb_is_default || false);
  const [isActive, setIsActive] = useState(dashboard?.tdb_is_active ?? true);

  const [topFilters, setTopFilters] = useState(
    dashboard?.tdb_filters_config || dashboard?.filters_config || []
  );
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  // Elementor Rows layout
  const [canvasRows, setCanvasRows] = useState(() =>
    normalizeLayoutToRows(dashboard?.tdb_widgets_layout || [])
  );

  const [newRowModalOpen, setNewRowModalOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const [fyList, setFyList] = useState([]);
  const [selectedFy, setSelectedFy] = useState(null);

  useEffect(() => {
    const fetchFys = async () => {
      try {
        const res = await fyListAPI({});
        if (res.data?.status) setFyList(res.data.data || []);
      } catch (e) {
        console.error('Failed to load FY list', e);
      }
    };
    fetchFys();
  }, []);

  // Add a new Elementor Row with selected Column preset
  const handleAddNewRow = (presetId) => {
    const preset = ROW_PRESETS.find((p) => p.id === presetId) || ROW_PRESETS[1];
    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      headingTag: 'h2',
      subtitle: '',
      preset: preset.id,
      columns: preset.spans.map((span, idx) => ({
        id: `col-${idx}`,
        span,
        items: [],
      })),
    };
    setCanvasRows([...canvasRows, newRow]);
    setNewRowModalOpen(false);
    setValidationError(null);
  };

  const handleUpdateRow = (rowId, updates) => {
    setCanvasRows(canvasRows.map((r) => (r.id === rowId ? { ...r, ...updates } : r)));
  };

  const handleMoveRow = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= canvasRows.length) return;
    setCanvasRows(arrayMove(canvasRows, fromIdx, toIdx));
  };

  const handleDeleteRow = (rowId) => {
    setCanvasRows(canvasRows.filter((r) => r.id !== rowId));
  };

  const handleAddItemToColumn = (rowId, colIndex, item) => {
    setValidationError(null);
    setCanvasRows(
      canvasRows.map((r) => {
        if (r.id === rowId) {
          const newCols = [...r.columns];
          if (!newCols[colIndex]) {
            newCols[colIndex] = { id: `col-${colIndex}`, span: 12, items: [] };
          }
          newCols[colIndex] = {
            ...newCols[colIndex],
            items: [...(newCols[colIndex].items || []), item],
          };
          return { ...r, columns: newCols };
        }
        return r;
      })
    );
  };

  const handleAddWidgetFromToolbox = (widget) => {
    setValidationError(null);
    // If no row exists, create one with 2 columns
    if (canvasRows.length === 0) {
      const preset = widget.chart_type === 'kpi_card' ? ROW_PRESETS[3] : ROW_PRESETS[1];
      const newRow = {
        id: `row-${Date.now()}`,
        title: '',
        headingTag: 'h2',
        subtitle: '',
        preset: preset.id,
        columns: preset.spans.map((span, idx) => ({
          id: `col-${idx}`,
          span,
          items: idx === 0 ? [{
            instanceId: `cw-${Date.now()}`,
            widgetId: widget.id,
            title: widget.report_name,
            table_name: widget.table_name,
            chart_type: widget.chart_type || 'column',
            configuration: widget.configuration || {},
          }] : [],
        })),
      };
      setCanvasRows([newRow]);
      return;
    }

    // Add into the first available column slot or last row
    const targetRow = canvasRows[canvasRows.length - 1];
    handleAddItemToColumn(targetRow.id, 0, {
      instanceId: `cw-${Date.now()}`,
      widgetId: widget.id,
      title: widget.report_name,
      table_name: widget.table_name,
      chart_type: widget.chart_type || 'column',
      configuration: widget.configuration || {},
    });
  };

  const handleAddElementFromToolbox = (element) => {
    setValidationError(null);
    const targetRow = canvasRows.length > 0 ? canvasRows[canvasRows.length - 1] : null;
    if (!targetRow) {
      const newRow = {
        id: `row-${Date.now()}`,
        title: '',
        headingTag: 'h2',
        preset: '1-col',
        columns: [{ id: 'col-0', span: 24, items: [{
          instanceId: `el-${Date.now()}`,
          type: element.type,
          title: element.title,
          configuration: element.defaultConfig || {},
        }] }],
      };
      setCanvasRows([newRow]);
      return;
    }
    handleAddItemToColumn(targetRow.id, 0, {
      instanceId: `el-${Date.now()}`,
      type: element.type,
      title: element.title,
      configuration: element.defaultConfig || {},
    });
  };

  const handleRemoveItem = (instanceId) => {
    setCanvasRows(
      canvasRows.map((r) => ({
        ...r,
        columns: r.columns.map((col) => ({
          ...col,
          items: (col.items || []).filter((it) => it.instanceId !== instanceId),
        })),
      })).filter(r => r.columns.some(c => c.items.length > 0) || r.title)
    );
  };

  const handleUpdateItemConfig = (instanceId, newConfig) => {
    setCanvasRows(
      canvasRows.map((r) => ({
        ...r,
        columns: r.columns.map((col) => ({
          ...col,
          items: (col.items || []).map((it) => {
            if (it.instanceId === instanceId) {
              return {
                ...it,
                configuration: {
                  ...(it.configuration || {}),
                  customConfig: {
                    ...((it.configuration || {}).customConfig || {}),
                    ...newConfig,
                  },
                  ...newConfig,
                },
              };
            }
            return it;
          }),
        })),
      }))
    );
  };

  const handleUpdateChartType = (instanceId, chartType) => {
    setCanvasRows(
      canvasRows.map((r) => ({
        ...r,
        columns: r.columns.map((col) => ({
          ...col,
          items: (col.items || []).map((it) =>
            it.instanceId === instanceId ? { ...it, chart_type: chartType } : it
          ),
        })),
      }))
    );
  };

  const handleSave = async (asDraft = false) => {
    try {
      if (!name || !name.trim()) {
        setNameError('Dashboard Title is required');
        setValidationError('Please enter a Dashboard Title.');
        message.warning('Please enter a Dashboard Title.');
        return;
      }

      if (!asDraft) {
        const totalWidgets = (canvasRows || []).reduce((acc, r) => {
          const colItems = (r.columns || []).reduce((cAcc, col) => cAcc + (col.items || []).length, 0);
          return acc + colItems;
        }, 0);

        if (totalWidgets === 0) {
          setValidationError('Please place at least one widget or chart in your rows before publishing.');
          message.warning('Please add at least one widget to your dashboard before publishing.');
          return;
        }
      }

      setNameError(null);
      setValidationError(null);
    } catch (err) {
      if (err.inner) {
        const nErr = err.inner.find((e) => e.path === 'name');
        const lErr = err.inner.find((e) => e.path === 'canvasRows');
        if (nErr) setNameError(nErr.message);
        setValidationError(nErr?.message || lErr?.message || 'Please complete all required fields.');
        message.warning(nErr?.message || lErr?.message || 'Please check required fields.');
        return;
      }
    }

    setSavingType(asDraft ? 'draft' : 'publish');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        roles: roleConfigs,
        is_default: isDefault,
        is_active: asDraft ? false : true,
        data_scope: dataScope,
        filters_config: topFilters,
        widgets_layout: canvasRows,
      };

      if (typeof onSave === 'function') {
        await onSave(payload);
      } else if (dashboard?.tdb_id) {
        const updateFn = typeof updateDashboard === 'function' ? updateDashboard : updateCustomDashboard;
        const res = await updateFn(dashboard.tdb_id, payload);
        if (res?.data?.status) {
          message.success(asDraft ? 'Dashboard saved as draft!' : 'Dashboard published successfully!');
          handleBack();
        }
      } else {
        const createFn = typeof createDashboard === 'function' ? createDashboard : createCustomDashboard;
        const res = await createFn(payload);
        if (res?.data?.status) {
          message.success(asDraft ? 'Dashboard saved as draft!' : 'Dashboard created and published successfully!');
          handleBack();
        }
      }
    } catch (err) {
      console.error('Save error', err);
      message.error(asDraft ? 'Failed to save draft' : 'Failed to publish dashboard');
    } finally {
      setSaving(false);
      setSavingType(null);
    }
  };

  return (
    <div className="dashboard-builder-container designer-fullscreen">
      {/* Top Designer Header Toolbar */}
      <div className="db-designer-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Popconfirm
            title="Exit Dashboard Designer?"
            description="Are you sure you want to leave? Any unsaved changes will be lost."
            onConfirm={handleBack}
            okText="Exit"
            cancelText="Stay"
            okButtonProps={{ danger: true }}
            placement="bottomLeft"
          >
            <Button
              icon={<ArrowLeftOutlined />}
              style={{ borderRadius: '8px', fontWeight: 500 }}
            >
              Back
            </Button>
          </Popconfirm>

          <Tooltip
            title={nameError}
            open={Boolean(nameError)}
            placement="bottomLeft"
            color="#ef4444"
            arrow={{ pointAtCenter: true }}
          >
            <Input
              placeholder="Dashboard Title * (e.g. Executive Overview)"
              value={name}
              status={nameError ? 'error' : ''}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) {
                  setNameError(null);
                  if (validationError && validationError.includes('Title')) {
                    setValidationError(null);
                  }
                }
              }}
              style={{
                width: 290,
                fontWeight: 700,
                borderRadius: '8px',
                border: nameError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
              }}
            />
          </Tooltip>

          <Button
            icon={<SafetyCertificateOutlined style={{ color: '#15803d' }} />}
            onClick={() => setRoleModalOpen(true)}
            style={{ borderRadius: '8px', fontWeight: 500 }}
          >
            Permissions ({roleConfigs.length})
          </Button>
        </div>

        <Space size={10}>
          <Button
            icon={<FilterOutlined style={{ color: '#0284c7' }} />}
            onClick={() => setFilterModalOpen(true)}
            style={{ borderRadius: '8px', fontWeight: 500 }}
          >
            Filters ({topFilters.length})
          </Button>
          <Button
            type={isPreview ? 'primary' : 'default'}
            icon={isPreview ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setIsPreview(!isPreview)}
            style={{ borderRadius: '8px', fontWeight: 500 }}
          >
            {isPreview ? 'Exit Preview' : 'Live Preview'}
          </Button>
          <Button
            icon={<FileTextOutlined style={{ color: '#d97706' }} />}
            loading={savingType === 'draft'}
            disabled={savingType !== null}
            onClick={() => handleSave(true)}
            style={{
              borderRadius: '8px',
              fontWeight: 600,
              color: '#b45309',
              borderColor: '#fcd34d',
              background: '#fffbeb',
            }}
          >
            Save Draft
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingType === 'publish'}
            disabled={savingType !== null}
            onClick={() => handleSave(false)}
            style={{
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              borderColor: '#15803d',
              borderRadius: '8px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
            }}
          >
            Save & Publish
          </Button>
        </Space>
      </div>

      {/* Main Designer Body */}
      <div className="db-designer-body">
        {/* Left Toolbox */}
        {!isPreview && (
          <WidgetLibraryPanel
            widgets={savedWidgets}
            onAddWidget={handleAddWidgetFromToolbox}
            onAddElement={handleAddElementFromToolbox}
          />
        )}

        {/* Central Elementor Canvas */}
        <div className="db-canvas-wrapper">
          {/* Red Validation Alert Banner */}
          {validationError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '10px 16px',
                color: '#dc2626',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
              <Button
                type="text"
                size="small"
                onClick={() => setValidationError(null)}
                style={{ color: '#dc2626', fontWeight: 700 }}
              >
                ✕
              </Button>
            </div>
          )}

          {/* Top Dynamic Filter Bar */}
          <DynamicFilterBar
            key={JSON.stringify(topFilters)}
            filters={topFilters}
            activeFilters={activeFilters}
            onFilterChange={(filterId, values) => setActiveFilters((prev) => ({ ...prev, [filterId]: values }))}
            onClearAll={() => { setActiveFilters({}); setSelectedFy(null); }}
            onOpenConfig={() => setFilterModalOpen(true)}
            isDesignerMode={!isPreview}
          />

          {/* Canvas Sub-Header Bar */}
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#0f172a', letterSpacing: '-0.3px' }}>
                {name || 'New Dashboard Canvas'}
              </Title>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {canvasRows.length} Section Row{canvasRows.length !== 1 ? 's' : ''} on layout
                {roleConfigs.length > 0 ? ` • Assigned to ${roleConfigs.length} role(s)` : ' • Available to all roles'}
              </Text>
            </div>

            {!isPreview && (
              <Space size={10}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setNewRowModalOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                    borderColor: '#15803d',
                    fontWeight: 600,
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  Add New Row / Section
                </Button>
                {canvasRows.length > 0 && (
                  <Button danger type="text" size="small" onClick={() => setCanvasRows([])}>
                    Clear Canvas
                  </Button>
                )}
              </Space>
            )}
          </div>

          {/* Elementor Rows Container */}
          {canvasRows.length === 0 ? (
            <div className="db-canvas-empty-dropzone" onClick={() => setNewRowModalOpen(true)} style={{ cursor: 'pointer' }}>
              <AppstoreAddOutlined style={{ fontSize: '48px', color: '#15803d', marginBottom: '16px' }} />
              <Title level={4} style={{ color: '#0f172a', marginBottom: '8px' }}>
                Start by Adding Your First Row / Section
              </Title>
              <Text type="secondary" style={{ maxWidth: '460px', display: 'block', margin: '0 auto 16px' }}>
                Click below to add a structured row with column presets (1 Col, 2 Cols, 3 Cols, 4 Cols) and place your charts, metrics, and headings inside!
              </Text>
              <Button type="primary" size="large" icon={<PlusOutlined />} style={{ background: '#15803d', borderColor: '#15803d', borderRadius: '8px' }}>
                Add New Row / Section
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {canvasRows.map((row, rIdx) => (
                <ElementorSectionRow
                  key={row.id}
                  row={row}
                  rowIndex={rIdx}
                  totalRows={canvasRows.length}
                  onUpdateRow={handleUpdateRow}
                  onMoveRow={handleMoveRow}
                  onDeleteRow={handleDeleteRow}
                  onAddItemToColumn={handleAddItemToColumn}
                  onRemoveItem={handleRemoveItem}
                  onUpdateItemConfig={handleUpdateItemConfig}
                  onUpdateChartType={handleUpdateChartType}
                  savedWidgets={savedWidgets}
                  selectedFy={selectedFy}
                  activeFilters={activeFilters}
                  topFilters={topFilters}
                  dataScope={dataScope}
                  isPreview={isPreview}
                />
              ))}

              {!isPreview && (
                <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                  <Button
                    type="dashed"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => setNewRowModalOpen(true)}
                    style={{
                      borderColor: '#86efac',
                      color: '#15803d',
                      fontWeight: 600,
                      width: '100%',
                      height: '46px',
                      borderRadius: '10px',
                      background: '#f0fdf4',
                    }}
                  >
                    Add New Row / Section
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Select Row Column Structure Preset (Elementor Style) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutOutlined style={{ color: '#15803d', fontSize: '18px' }} />
            <span style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>Select Column Structure</span>
          </div>
        }
        open={newRowModalOpen}
        onCancel={() => setNewRowModalOpen(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <div style={{ padding: '8px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: '16px', fontSize: '13px' }}>
            Choose your layout structure. You can add or remove columns anytime later:
          </Text>

          <div className="el-preset-grid">
            {ROW_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="el-preset-card"
                onClick={() => handleAddNewRow(preset.id)}
              >
                <div className="el-preset-visual">
                  {preset.spans.map((span, idx) => (
                    <div
                      key={idx}
                      className="el-preset-col"
                      style={{ flex: span }}
                    />
                  ))}
                </div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', textAlign: 'center' }}>
                  {preset.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Configure Filters Modal */}
      {filterModalOpen && (
        <ConfigureFiltersModal
          open={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          canvasWidgets={canvasRows.flatMap((r) => (r.columns || []).flatMap((c) => c.items || []))}
          currentFilters={topFilters}
          onSaveFilters={(newFilters) => setTopFilters(newFilters)}
        />
      )}

      {/* Role Access Modal */}
      {roleModalOpen && (
        <RoleAccessModal
          open={roleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          roles={roles}
          currentRoles={roleConfigs}
          onSaveRoleAccess={(updated) => setRoleConfigs(updated)}
        />
      )}
    </div>
  );
};

export default DashboardCanvasDesigner;
