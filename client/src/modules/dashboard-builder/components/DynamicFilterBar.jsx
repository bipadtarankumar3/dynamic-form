import React, { useState, useEffect } from 'react';
import { Select, DatePicker, Button, Space, Tag, Typography, Tooltip, Badge } from 'antd';
import dayjs from 'dayjs';
import {
  FilterOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { getFilterFieldOptions } from '@/services/pivot-service';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Single dynamic filter dropdown item
export const DynamicFilterSelect = ({
  filter,
  filterKey,
  selectedValues = [],
  allFilters = [],
  activeFilters = {},
  onChange,
  fullWidth = false,
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const isDateRange = filter.filter_type === 'date_range' || filter.type === 'date_range';
  const isSingleDate = filter.filter_type === 'date' || filter.type === 'date';

  const resolvedKey =
    filterKey ||
    filter.filter_key ||
    (filter.table_name && filter.field
      ? `${filter.table_name}__${filter.field}__${(filter.label || '').toLowerCase().replace(/\s+/g, '_')}`
      : filter.id);

  // Resolve parent filter (Explicit depends_on OR Intelligent auto-detection)
  let parentFilter = null;
  let autoParentMatchField = filter.parent_match_field || null;

  if (filter.depends_on) {
    parentFilter = allFilters.find(
      (f) =>
        (f.filter_key || f.id) === filter.depends_on ||
        f.id === filter.depends_on ||
        f.filter_key === filter.depends_on ||
        f.field === filter.depends_on ||
        (f.table_name && String(filter.depends_on).includes(f.table_name)) ||
        (f.label && String(filter.depends_on).toLowerCase().includes(String(f.label).toLowerCase()))
    );
  }

  // Auto-detect cascading relationship if not explicitly configured:
  // e.g. District -> State, Village -> District, Project -> Unit/Theme/State
  if (!parentFilter) {
    const cleanTable = (filter.table_name || '').toLowerCase();
    const cleanLabel = (filter.label || '').toLowerCase();

    if (cleanTable.includes('district') || cleanLabel.includes('district')) {
      parentFilter = allFilters.find(
        (f) =>
          f !== filter &&
          ((f.table_name && f.table_name.toLowerCase().includes('state')) ||
            (f.label && f.label.toLowerCase().includes('state')))
      );
      if (parentFilter) {
        autoParentMatchField = autoParentMatchField || 'state_id';
      }
    } else if (cleanTable.includes('block') || cleanLabel.includes('block') || cleanTable.includes('village') || cleanLabel.includes('village')) {
      parentFilter = allFilters.find(
        (f) =>
          f !== filter &&
          ((f.table_name && f.table_name.toLowerCase().includes('district')) ||
            (f.label && f.label.toLowerCase().includes('district')))
      );
      if (parentFilter) {
        autoParentMatchField = autoParentMatchField || 'district_id';
      }
    }
  }

  let parentSelectedValues = [];
  if (parentFilter) {
    const candidateKeys = [
      parentFilter.filter_key,
      parentFilter.id,
      parentFilter.field,
      parentFilter.table_name && parentFilter.field
        ? `${parentFilter.table_name}__${parentFilter.field}__${(parentFilter.label || '').toLowerCase().replace(/\s+/g, '_')}`
        : null,
    ].filter(Boolean);

    for (const key of candidateKeys) {
      if (Array.isArray(activeFilters[key]) && activeFilters[key].length > 0) {
        parentSelectedValues = activeFilters[key];
        break;
      }
    }
  }

  useEffect(() => {
    const fetchDistinctValues = async () => {
      if (!filter.table_name || !filter.field || isDateRange || isSingleDate) return;
      setLoading(true);
      try {
        const resolvedParentField =
          autoParentMatchField ||
          filter.parent_match_field ||
          (parentFilter?.table_name ? `${parentFilter.table_name.replace(/^v_/, '')}_id` : null) ||
          parentFilter?.field ||
          'state_id';

        const hasParentSelected = parentFilter && parentSelectedValues.length > 0;

        const res = await getFilterFieldOptions({
          tableName: filter.table_name,
          valueField: filter.field,
          labelField: filter.label_field || filter.field,
          parentField: hasParentSelected ? resolvedParentField : undefined,
          parentValues: hasParentSelected ? parentSelectedValues : undefined,
        });

        if (res.data?.status && Array.isArray(res.data.data)) {
          const formatted = res.data.data
            .map((item) => {
              if (typeof item === 'object' && item !== null) {
                const val = item.value !== undefined ? item.value : item.id;
                const lbl = item.label !== undefined ? item.label : val;
                if (val === null || val === undefined || val === '') return null;
                return {
                  label: String(lbl).trim(),
                  value: String(val).trim(),
                };
              } else {
                if (item === null || item === undefined || item === '') return null;
                const str = String(item).trim();
                return { label: str, value: str };
              }
            })
            .filter(Boolean);

          // Deduplicate
          const unique = [];
          const seen = new Set();
          for (const opt of formatted) {
            if (!seen.has(opt.value)) {
              seen.add(opt.value);
              unique.push(opt);
            }
          }
          setOptions(unique);
        }
      } catch (err) {
        console.error(`Failed to fetch values for filter ${filter.label}`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchDistinctValues();
  }, [
    filter.table_name,
    filter.field,
    filter.label_field,
    filter.label,
    filter.depends_on,
    filter.parent_match_field,
    JSON.stringify(parentSelectedValues),
  ]);

  const safeSelected = Array.isArray(selectedValues)
    ? selectedValues.map((v) => (typeof v === 'object' && v !== null ? String(v.value || v.id || '') : String(v)))
    : [];

  const placeholderText =
    filter.depends_on && parentFilter && parentSelectedValues.length === 0
      ? `All ${filter.label} (${parentFilter.label} not selected)`
      : `All ${filter.label || filter.field}`;

  if (isDateRange) {
    const rangeValue =
      Array.isArray(selectedValues) &&
        selectedValues.length === 2 &&
        selectedValues[0] &&
        selectedValues[1]
        ? [dayjs(selectedValues[0]), dayjs(selectedValues[1])]
        : null;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
          minWidth: fullWidth ? '100%' : 240,
          maxWidth: fullWidth ? '100%' : 300,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            letterSpacing: '0.01em',
          }}
        >
          {filter.label || filter.field}
        </span>
        <RangePicker
          allowClear
          value={rangeValue}
          format="YYYY-MM-DD"
          placeholder={['From Date', 'To Date']}
          onChange={(dates, dateStrings) => {
            if (dates && dateStrings && dateStrings[0] && dateStrings[1]) {
              onChange(resolvedKey, [dateStrings[0], dateStrings[1]]);
            } else {
              onChange(resolvedKey, []);
            }
          }}
          size="middle"
          style={{ width: '100%', borderRadius: '6px' }}
        />
      </div>
    );
  }

  if (isSingleDate) {
    const singleDateValue =
      Array.isArray(selectedValues) && selectedValues[0]
        ? dayjs(selectedValues[0])
        : typeof selectedValues === 'string' && selectedValues
          ? dayjs(selectedValues)
          : null;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
          minWidth: fullWidth ? '100%' : 150,
          maxWidth: fullWidth ? '100%' : 200,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            letterSpacing: '0.01em',
          }}
        >
          {filter.label || filter.field}
        </span>
        <DatePicker
          allowClear
          value={singleDateValue}
          format="YYYY-MM-DD"
          placeholder="Select Date"
          onChange={(date, dateString) => {
            if (dateString) {
              onChange(resolvedKey, [dateString]);
            } else {
              onChange(resolvedKey, []);
            }
          }}
          size="middle"
          style={{ width: '100%', borderRadius: '6px' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        boxSizing: 'border-box',
        minWidth: fullWidth ? '100%' : (filter.is_multi ? 160 : 130),
        maxWidth: fullWidth ? '100%' : 240,
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#475569',
          letterSpacing: '0.01em',
        }}
      >
        {filter.label || filter.field}
      </span>
      <Select
        mode={filter.is_multi ? 'multiple' : undefined}
        allowClear
        showSearch
        placeholder={placeholderText}
        value={safeSelected.length > 0 ? (filter.is_multi ? safeSelected : safeSelected[0]) : undefined}
        onChange={(val) => {
          if (Array.isArray(val)) {
            onChange(resolvedKey, val.map(String));
          } else if (val !== undefined && val !== null) {
            onChange(resolvedKey, [String(val)]);
          } else {
            onChange(resolvedKey, []);
          }
        }}
        loading={loading}
        maxTagCount={1}
        size="middle"
        style={{ width: '100%' }}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        options={options}
      />
    </div>
  );
};

const DynamicFilterBar = ({
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearAll,
  onSearch,
  onReset,
  loading = false,
  onOpenConfig,
  isDesignerMode = false,
}) => {
  if ((!filters || filters.length === 0) && !isDesignerMode) {
    return null;
  }

  const activeCount = Object.values(activeFilters).filter(
    (v) => Array.isArray(v) && v.length > 0
  ).length;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700, fontSize: '13px', marginRight: '4px' }}>
          <FilterOutlined />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge count={activeCount} style={{ backgroundColor: '#15803d', fontSize: '10px' }} />
          )}
        </div>

        {filters.map((filter, idx) => {
          const filterKey =
            filter.filter_key ||
            (filter.table_name && filter.field
              ? `${filter.table_name}__${filter.field}__${(filter.label || '').toLowerCase().replace(/\s+/g, '_')}`
              : filter.id);

          return (
            <DynamicFilterSelect
              key={`${filterKey}-${idx}`}
              filter={filter}
              filterKey={filterKey}
              selectedValues={activeFilters[filterKey] || (filter.id ? activeFilters[filter.id] : [])}
              allFilters={filters}
              activeFilters={activeFilters}
              onChange={onFilterChange}
            />
          );
        })}

        {filters.length === 0 && isDesignerMode && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            No top filters configured. Click "Configure Filters" to add multi-select dropdowns.
          </Text>
        )}
      </div>

      <Space size={10} style={{ alignItems: 'center' }}>
        {onSearch && (
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={onSearch}
            loading={loading}
            style={{
              background: 'var(--primary-gradient, var(--primary-color, #15803d))',
              borderColor: 'transparent',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: 8,
              height: '38px',
              padding: '0 20px',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(var(--primary-color-rgb, 21, 128, 61), 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Search
          </Button>
        )}

        {(onReset || onClearAll) && (
          <Button
            icon={<ReloadOutlined />}
            onClick={onReset || onClearAll}
            style={{
              borderRadius: 8,
              height: '38px',
              padding: '0 16px',
              color: '#475569',
              fontWeight: 600,
              fontSize: '13px',
              borderColor: '#e2e8f0',
              background: '#f8fafc',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Reset
          </Button>
        )}

        {isDesignerMode && onOpenConfig && (
          <Button
            icon={<SettingOutlined />}
            onClick={onOpenConfig}
            style={{
              color: 'var(--primary-color, #15803d)',
              borderColor: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.4)',
              background: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.05)',
              height: '38px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Configure Filters ({filters.length})
          </Button>
        )}
      </Space>
    </div>
  );
};

export default DynamicFilterBar;
