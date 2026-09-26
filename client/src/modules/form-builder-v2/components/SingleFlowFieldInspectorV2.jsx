import React, { useState, useEffect } from 'react';
import { Select, Button, Tag, DatePicker, Switch, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CalculatorOutlined, LockOutlined, CalendarOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { privateHttpClient } from '@/services/api/httpClient';
import CalculationTabConfigV2 from './field-config/CalculationTabConfigV2';
import EncryptionValidationConfigV2 from './field-config/EncryptionValidationConfigV2';

export default function SingleFlowFieldInspectorV2({ field, onUpdateField, allFields = [] }) {
  const [allTables, setAllTables] = useState([]);
  const [masterForms, setMasterForms] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [tableColumnsMap, setTableColumnsMap] = useState({});
  const [loadingColumns, setLoadingColumns] = useState(false);

  const fetchColumnsForTable = async (tableName) => {
    if (!tableName || !tableName.trim()) return [];
    const tbl = tableName.trim();
    const key = tbl.toLowerCase();
    if (tableColumnsMap[key] && tableColumnsMap[key].length > 0) {
      return tableColumnsMap[key];
    }
    setLoadingColumns(true);
    try {
      const res = await privateHttpClient.get(`configurator/form-schemas/table-columns/${encodeURIComponent(tbl)}`);
      const IGNORED_KEYS = new Set(['_id', 'id', '__v', 'form_slug', 'form_version', 'parent_id', 'data', 'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at', 'tenant_id', 'selected_data']);
      let cols = [];
      if (res?.data?.columns && Array.isArray(res.data.columns)) {
        cols = res.data.columns
          .map((c) => (typeof c === 'string' ? c : c.column_name))
          .filter((c) => c && !IGNORED_KEYS.has(String(c).toLowerCase()));
      } else if (res?.data?.fields && Array.isArray(res.data.fields)) {
        cols = res.data.fields
          .map((f) => f.db_field || f.column_name)
          .filter((c) => c && !IGNORED_KEYS.has(String(c).toLowerCase()));
      }

      if (cols.length === 0) {
        const foundForm = masterForms.find(
          (m) => (m.table_name || `t_frm_${m.slug}`)?.toLowerCase() === key || m.slug?.toLowerCase() === key
        );
        if (foundForm?.fields) {
          cols = foundForm.fields
            .map((f) => f.db_field || f.name || f.column_name)
            .filter((c) => c && !IGNORED_KEYS.has(String(c).toLowerCase()));
        }
      }

      if (cols.length > 0) {
        setTableColumnsMap((prev) => ({ ...prev, [key]: cols }));
        return cols;
      }
    } catch (err) {
      const foundForm = masterForms.find(
        (m) => (m.table_name || `t_frm_${m.slug}`)?.toLowerCase() === key || m.slug?.toLowerCase() === key
      );
      if (foundForm?.fields) {
        const cols = foundForm.fields
          .map((f) => f.db_field || f.name || f.column_name)
          .filter((c) => c && !IGNORED_KEYS.has(String(c).toLowerCase()));
        setTableColumnsMap((prev) => ({ ...prev, [key]: cols }));
        return cols;
      }
    } finally {
      setLoadingColumns(false);
    }
    return [];
  };

  const isSelect = ['select', 'dropdown', 'multiselect', 'multi_select', 'radio', 'radio_group', 'checkbox', 'checkbox_group'].includes(field?.type);
  const isMultiple = Boolean(
    field?.multiple === true ||
    field?.multiple === 'true' ||
    field?.multiple === 1 ||
    field?.allow_multiple === true ||
    field?.allow_multiple === 'true' ||
    field?.allow_multiple === 1 ||
    field?.is_multiple === true ||
    field?.is_multiple === 'true' ||
    field?.is_multiple === 1 ||
    field?.mode === 'multiple' ||
    field?.ui?.multiple === true ||
    field?.ui?.multiple === 'true' ||
    field?.ui?.allow_multiple === true ||
    field?.ui?.allow_multiple === 'true' ||
    field?.ui?.mode === 'multiple' ||
    field?.validation?.multiple === true ||
    field?.validation?.allow_multiple === true ||
    field?.type === 'multiselect' ||
    field?.type === 'multi_select' ||
    (field?.type === 'select' && (field?.data_type === 'json' || field?.data_type === 'jsonb'))
  );

  useEffect(() => {
    if (isSelect || field?.type === 'number' || field?.type === 'lookup_table') {
      const fetchData = async () => {
        setMasterLoading(true);
        try {
          // Load all real DB tables
          const tablesRes = await privateHttpClient.get('configurator/form-schemas/all-tables');
          if (tablesRes?.data?.data) {
            setAllTables(tablesRes.data.data);
          }
          // Also load form schemas for label/pk metadata
          const formsRes = await privateHttpClient.get('configurator/form-schemas/masters');
          if (formsRes?.data?.data) {
            setMasterForms(formsRes.data.data);
          }
        } catch (e) {
          console.error('Failed to load tables:', e);
        } finally {
          setMasterLoading(false);
        }
      };
      fetchData();
    }
  }, [field?.type, isSelect]);

  useEffect(() => {
    if (field?.type === 'lookup_table') {
      const target = field.master_source || field.target_form || field.data_source?.table_name || field.data_source?.name;
      if (target) {
        fetchColumnsForTable(target);
      }
    } else if (isSelect && (field?.options_source === 'master' || field?.data_source)) {
      const currentTable = field.data_source?.table_name || (field.data_source?.name ? `t_${field.data_source.name}` : '');
      if (currentTable) {
        fetchColumnsForTable(currentTable);
      }
    } else if (field?.type === 'number' && field?.validation?.dynamic_limit?.target_table) {
      fetchColumnsForTable(field.validation.dynamic_limit.target_table);
    }
  }, [field?.type, isSelect, field?.master_source, field?.target_form, field?.data_source?.table_name, field?.data_source?.name, field?.options_source, field?.validation?.dynamic_limit?.target_table]);

  if (!field) return null;

  const updateProp = (key, val) => {
    onUpdateField({ ...field, [key]: val });
  };

  const updateUIProp = (key, val) => {
    onUpdateField({
      ...field,
      ui: { ...(field.ui || {}), [key]: val },
    });
  };

  const updateValProp = (key, val) => {
    onUpdateField({
      ...field,
      validation: { ...(field.validation || {}), [key]: val },
    });
  };

  const updateNested = (parentKey, childKey, value) => {
    onUpdateField({
      ...field,
      [parentKey]: {
        ...(field[parentKey] || {}),
        [childKey]: value,
      },
    });
  };

  const blockNegativeKeys = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e?.key)) {
      e.preventDefault();
    }
  };

  const handlePositiveIntChange = (valKey, rawVal, minAllowed = 0) => {
    if (rawVal === '' || rawVal === null || rawVal === undefined) {
      updateValProp(valKey, undefined);
      return;
    }
    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed)) {
      updateValProp(valKey, undefined);
    } else {
      updateValProp(valKey, Math.max(minAllowed, parsed));
    }
  };

  const handleLabelChange = (val) => {
    const autoDb = val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 63);
    const currentDb = field.db_field || '';
    const prevAutoDb = (field.label || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 63);

    const isGeneratedPattern =
      !currentDb ||
      currentDb.startsWith('col_') ||
      currentDb.startsWith('fld_') ||
      currentDb.startsWith('field_') ||
      /^[a-z]+_\d{3,}$/.test(currentDb) ||
      currentDb === prevAutoDb ||
      !field._is_db_manual;

    const newDbField = (isGeneratedPattern && autoDb) ? autoDb : currentDb;

    onUpdateField({
      ...field,
      label: val,
      db_field: newDbField,
      ui: {
        ...(field.ui || {}),
        placeholder: (!field.ui?.placeholder || field.ui?.placeholder.startsWith('Enter ')) ? (val ? `Enter ${val}` : '') : field.ui.placeholder,
      },
    });
  };

  const isText = field.type === 'text' || field.type === 'textarea';
  const isNumber = field.type === 'number';
  const isDate = field.type === 'date';
  const isDateRange = ['date_range', 'daterange', 'date_range_picker'].includes(field.type);
  const isFile = field.type === 'file';
  const isSwitch = field.type === 'switch';
  const isGeometry = ['point', 'multipolygon', 'line'].includes(field.type);
  const isLayout = ['heading', 'note', 'custom_html', 'add_more'].includes(field.type);

  const otherDateFields = (allFields || []).filter(
    (f) => f.id !== field.id && ['date', 'date_range', 'daterange', 'date_range_picker'].includes(f.type)
  );

  const getLabelError = () => {
    if (!field.label || !field.label.trim()) {
      return 'Field Label is required';
    }
    const isDuplicate = (allFields || []).some(
      (f) => f.id !== field.id && f.label && f.label.trim().toLowerCase() === field.label.trim().toLowerCase()
    );
    if (isDuplicate) {
      return `"${field.label}" is already used by another field in this form`;
    }
    return null;
  };

  const getDbFieldError = () => {
    const db = field.db_field;
    if (!db || !db.trim()) {
      return 'DB Field Name is required';
    }
    if (!/^[a-z_]/.test(db)) {
      return 'DB Field Name must start with a lowercase letter (a-z) or underscore';
    }
    if (!/^[a-z0-9_]+$/.test(db)) {
      return 'Only lowercase letters, numbers, and underscores are allowed (no spaces or special chars)';
    }
    if (db.length > 63) {
      return 'DB Field Name cannot exceed 63 characters (database column limit)';
    }
    const isDuplicate = (allFields || []).some(
      (f) => f.id !== field.id && f.db_field && f.db_field.toLowerCase() === db.toLowerCase()
    );
    if (isDuplicate) {
      return `"${db}" is already used by another field in this form`;
    }
    return null;
  };

  const labelError = getLabelError();
  const dbFieldError = getDbFieldError();

  const handleDbFieldChange = (val) => {
    // Database column name (PostgreSQL identifier limit) cannot exceed 63 characters
    const trimmed = (val || '').slice(0, 63);
    const formatted = trimmed.toLowerCase().replace(/\s+/g, '_');
    onUpdateField({ ...field, db_field: formatted, _is_db_manual: true });
  };

  return (
    <div className="fb-v2-single-flow-inspector" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 1. Header & ID */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700, textTransform: 'uppercase' }}>
          {field.type || 'Text'} Field
        </Tag>
        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
          ID: {field.id}
        </span>
      </div>

      {/* 2. Core Field Properties */}
      <div className="fb-v2-form-group">
        <label className="fb-v2-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Field Label <span style={{ color: '#ef4444' }}>*</span></span>
          {labelError && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Required</span>}
        </label>
        <input
          type="text"
          className="fb-v2-input"
          style={labelError ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
          value={field.label || ''}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Field Label"
        />
        {labelError && (
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExclamationCircleOutlined /> {labelError}
          </div>
        )}
      </div>

      <div className="fb-v2-form-group">
        <label className="fb-v2-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>DB Field Name <span style={{ color: '#ef4444' }}>*</span></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: (field.db_field || '').length >= 63 ? '#ef4444' : '#94a3b8', fontFamily: 'monospace' }}>
              {(field.db_field || '').length}/63
            </span>
            {dbFieldError && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Error</span>}
          </div>
        </label>
        <input
          type="text"
          maxLength={63}
          className="fb-v2-input"
          style={dbFieldError ? { borderColor: '#ef4444', backgroundColor: '#fef2f2', fontFamily: 'monospace' } : { fontFamily: 'monospace' }}
          value={field.db_field || ''}
          onChange={(e) => handleDbFieldChange(e.target.value)}
          placeholder="e.g. file_upload"
        />
        {dbFieldError ? (
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExclamationCircleOutlined /> {dbFieldError}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }} className="italic">
            Database column name (max 63 characters, lowercase letters, numbers, and underscores)
          </div>
        )}
      </div>

      <div className="fb-v2-form-group">
        <label className="fb-v2-form-label">Placeholder</label>
        <input
          type="text"
          className="fb-v2-input"
          value={field.ui?.placeholder || ''}
          onChange={(e) => updateUIProp('placeholder', e.target.value)}
          placeholder="e.g. Enter value..."
        />
      </div>

      <div className="fb-v2-form-group">
        <label className="fb-v2-form-label">Help Text / Instruction</label>
        <input
          type="text"
          className="fb-v2-input"
          value={field.ui?.help_text || ''}
          onChange={(e) => updateUIProp('help_text', e.target.value)}
          placeholder="e.g. Enter details..."
        />
      </div>

      {/* Number Field Specialized Settings (Number Type & Data Type) */}
      {field.type === 'number' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Number Type
            </label>
            <Select
              size="small"
              style={{ width: '100%' }}
              value={field.number_type || (field.data_type === 'integer' ? 'integer' : 'decimal')}
              onChange={(numType) => {
                const dataType = numType === 'integer' ? 'integer' : 'double precision';
                onUpdateField({
                  ...field,
                  number_type: numType,
                  data_type: dataType,
                });
              }}
              options={[
                { value: 'integer', label: 'Integer' },
                { value: 'decimal', label: 'Decimal' },
              ]}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Data Type
            </label>
            <Select
              size="small"
              style={{ width: '100%' }}
              value={field.data_type || (field.number_type === 'integer' ? 'integer' : 'double precision')}
              onChange={(dType) => updateProp('data_type', dType)}
              options={[
                { value: 'integer', label: 'Integer' },
                { value: 'double precision', label: 'Decimal (double precision)' },
                { value: 'numeric', label: 'Numeric' },
              ]}
            />
          </div>
        </div>
      )}

      {/* Number Field Currency & Suffix / Prefix Controls */}
      {field.type === 'number' && (
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block' }}>
                Currency / Amount (₹)
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Display with Rupee symbol (₹) and Indian currency format
              </span>
            </div>
            <Switch
              size="small"
              checked={!!(field.is_currency || field.ui?.is_currency || field.ui?.prefix === '₹')}
              onChange={(checked) => {
                onUpdateField({
                  ...field,
                  is_currency: checked,
                  ui: {
                    ...(field.ui || {}),
                    is_currency: checked,
                    prefix: checked ? '₹' : '',
                  },
                });
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>Prefix</label>
              <input
                type="text"
                className="fb-v2-input"
                style={{ height: 30, fontSize: 12 }}
                placeholder="e.g. ₹ or $"
                value={field.ui?.prefix || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateField({
                    ...field,
                    ui: {
                      ...(field.ui || {}),
                      prefix: val,
                      is_currency: val === '₹' ? true : field.ui?.is_currency,
                    },
                  });
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>Suffix</label>
              <input
                type="text"
                className="fb-v2-input"
                style={{ height: 30, fontSize: 12 }}
                placeholder="e.g. Units, %"
                value={field.ui?.suffix || ''}
                onChange={(e) => updateUIProp('suffix', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Show Column Total in Footer / Table Summary Option */}
      {(field.type === 'number' || field.calculation?.enabled) && (
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block' }}>
              Show Column Total in Footer
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Calculate and display summary total for this column at the bottom of the table
            </span>
          </div>
          <Switch
            size="small"
            checked={!!(field.show_total || field.ui?.show_total || field.show_column_total || field.calculation?.show_total)}
            onChange={(checked) => {
              onUpdateField({
                ...field,
                show_total: checked,
                show_column_total: checked,
                ui: {
                  ...(field.ui || {}),
                  show_total: checked,
                },
                calculation: {
                  ...(field.calculation || {}),
                  show_total: checked,
                },
              });
            }}
          />
        </div>
      )}

      {/* Dynamic Linked Table Field Specialized Settings */}
      {field?.type === 'lookup_table' && (
        <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
            🔗 Master Data Source & Display Columns
          </div>
          <div style={{ fontSize: 11, color: '#15803d', marginBottom: 12 }}>
            Select the master/form to query and choose which fields to display in this table.
          </div>

          <div className="fb-v2-form-group" style={{ marginBottom: 10 }}>
            <label className="fb-v2-form-label" style={{ fontSize: 11 }}>Target Master Form / Collection *</label>
            <Select
              size="small"
              showSearch
              allowClear
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              placeholder="Search or select Master Form..."
              value={field.master_source || field.target_form || field.data_source?.table_name || undefined}
              onChange={(val) => {
                onUpdateField({
                  ...field,
                  master_source: val,
                  target_form: val,
                  data_source: { ...(field.data_source || {}), type: 'master', table_name: val, name: val },
                });
                if (val) fetchColumnsForTable(val);
              }}
              options={(masterForms || []).map((m) => ({
                value: m.slug || m.table_name || m.fsc_id,
                label: `${m.title || m.fsc_name || m.slug} (${m.table_name || 'master'})`,
              }))}
            />
          </div>

          <div className="fb-v2-form-group" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="fb-v2-form-label" style={{ fontSize: 11, margin: 0 }}>
                Choose Fields to Display in Table
              </label>
              {(() => {
                const targetTbl = field.master_source || field.target_form || field.data_source?.table_name || field.data_source?.name || '';
                const availableCols = tableColumnsMap[targetTbl.toLowerCase()] || [];
                if (availableCols.length === 0) return null;
                const isAllSelected = (field.display_fields || []).length === availableCols.length;
                return (
                  <Button
                    size="small"
                    type="link"
                    style={{ fontSize: 10, padding: 0, height: 'auto' }}
                    onClick={() => {
                      onUpdateField({
                        ...field,
                        display_fields: isAllSelected ? [] : availableCols,
                      });
                    }}
                  >
                    {isAllSelected ? 'Clear All' : 'Select All'}
                  </Button>
                );
              })()}
            </div>

            {(() => {
              const targetTbl = field.master_source || field.target_form || field.data_source?.table_name || field.data_source?.name || '';
              const availableCols = tableColumnsMap[targetTbl.toLowerCase()] || [];
              return (
                <Select
                  mode="multiple"
                  size="small"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                  loading={loadingColumns}
                  placeholder={availableCols.length > 0 ? "Search and select fields to show (empty = show all)" : "Select a Master Form above first"}
                  value={field.display_fields || []}
                  onChange={(vals) => {
                    onUpdateField({
                      ...field,
                      display_fields: vals,
                    });
                  }}
                  options={availableCols.map((c) => ({
                    value: c,
                    label: c.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase()),
                  }))}
                />
              );
            })()}
            <div style={{ fontSize: 10, color: '#15803d', marginTop: 3 }}>
              {(field.display_fields || []).length > 0
                ? `Showing ${(field.display_fields || []).length} chosen field(s)`
                : 'Default: showing all master fields'}
            </div>
          </div>

          <div className="fb-v2-form-group" style={{ marginBottom: 10 }}>
            <label className="fb-v2-form-label" style={{ fontSize: 11 }}>Filter By Current Form Field (Optional)</label>
            <Select
              size="small"
              showSearch
              allowClear
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              placeholder="Search or match with form field (e.g. state, project_id)"
              value={field.filter_by_field || undefined}
              onChange={(val) => {
                onUpdateField({
                  ...field,
                  filter_by_field: val,
                });
              }}
              options={(allFields || [])
                .filter((f) => f.id !== field.id)
                .map((f) => ({
                  value: f.db_field || f.id,
                  label: `${f.label || f.db_field} (${f.db_field || f.id})`,
                }))}
            />
          </div>

          <div className="fb-v2-form-group" style={{ marginBottom: 4 }}>
            <label className="fb-v2-form-label" style={{ fontSize: 11 }}>Target Link Key in Master Collection</label>
            <input
              type="text"
              className="fb-v2-input"
              style={{ fontSize: 12, height: 30 }}
              placeholder="e.g. project_id, state_id, id"
              value={field.link_key || ''}
              onChange={(e) => {
                onUpdateField({
                  ...field,
                  link_key: e.target.value.trim(),
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Select Field Specialized Settings (Multiple Select) */}
      {isSelect && (
        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, cursor: 'pointer', margin: 0 }}>
            <span>Multiple Select</span>
            <input
              type="checkbox"
              checked={isMultiple}
              onChange={(e) => {
                const isChecked = e.target.checked;
                onUpdateField({
                  ...field,
                  multiple: isChecked,
                  allow_multiple: isChecked,
                  is_multiple: isChecked,
                  mode: isChecked ? 'multiple' : undefined,
                  data_type: isChecked ? 'jsonb' : (field.data_source?.type === 'master' ? 'integer' : (field.data_type && field.data_type !== 'jsonb' ? field.data_type : 'varchar(255)')),
                  ui: {
                    ...(field.ui || {}),
                    multiple: isChecked,
                    allow_multiple: isChecked,
                    is_multiple: isChecked,
                    mode: isChecked ? 'multiple' : undefined,
                  },
                });
              }}
            />
          </label>
        </div>
      )}

      {/* Date & Date Range Field Specialized Settings */}
      {(isDate || isDateRange) && (
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Date Display Format
          </label>
          <Select
            size="small"
            style={{ width: '100%' }}
            value={field.ui?.date_format || 'YYYY-MM-DD'}
            onChange={(fmt) => updateUIProp('date_format', fmt)}
            options={[
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO standard)' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Indian format)' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US format)' },
            ]}
          />
        </div>
      )}

      {/* TextArea Field Specialized Settings */}
      {field.type === 'textarea' && (
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Input Height (Rows)
          </label>
          <input
            type="number"
            min="1"
            onKeyDown={blockNegativeKeys}
            style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
            value={field.ui?.rows || 3}
            onChange={(e) => handlePositiveIntChange('rows', e.target.value, 1)}
            placeholder="3"
          />
        </div>
      )}

      {/* File Field Specialized Settings */}
      {isFile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Allowed Formats
            </label>
            <input
              type="text"
              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              value={field.validation?.allowed_types || '.pdf, .png, .jpg'}
              onChange={(e) => updateValProp('allowed_types', e.target.value)}
              placeholder=".pdf, .png, .jpg"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Max File Size (MB)
            </label>
            <input
              type="number"
              min="1"
              onKeyDown={blockNegativeKeys}
              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
              value={field.validation?.max_file_size !== undefined && field.validation?.max_file_size !== '' ? field.validation.max_file_size : 5}
              onChange={(e) => handlePositiveIntChange('max_file_size', e.target.value, 1)}
              placeholder="5"
            />
          </div>
        </div>
      )}

      {/* Checkboxes Row */}
      <div style={{ display: 'flex', gap: 24, background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        {!isLayout && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={(e) => updateProp('required', e.target.checked)}
            />
            Required Field
          </label>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={field.visible !== false && field.ui?.visible !== false}
            onChange={(e) => {
              const isVis = e.target.checked;
              onUpdateField({
                ...field,
                visible: isVis,
                ui: { ...(field.ui || {}), visible: isVis },
              });
            }}
          />
          Visible
        </label>
      </div>

      {/* 3. Validations Section */}
      {!isLayout && (
        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
            Validations
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* TEXT & TEXTAREA: Min Length, Max Length, Regex Pattern, Encryption */}
            {isText && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Min Length</span>
                  <input
                    type="number"
                    min="0"
                    onKeyDown={blockNegativeKeys}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    value={field.validation?.min_length !== undefined && field.validation?.min_length !== '' ? field.validation.min_length : ''}
                    onChange={(e) => handlePositiveIntChange('min_length', e.target.value, 0)}
                    placeholder="e.g. 3"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Max Length</span>
                  <input
                    type="number"
                    min="0"
                    onKeyDown={blockNegativeKeys}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    value={field.validation?.max_length !== undefined && field.validation?.max_length !== '' ? field.validation.max_length : ''}
                    onChange={(e) => handlePositiveIntChange('max_length', e.target.value, 0)}
                    placeholder="e.g. 200"
                  />
                </div>

                {field.validation?.min_length !== undefined && field.validation?.max_length !== undefined && Number(field.validation.min_length) > Number(field.validation.max_length) && (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: -4 }}>
                    <ExclamationCircleOutlined /> Min Length cannot exceed Max Length
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Regex Pattern</span>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                    value={field.validation?.pattern || ''}
                    onChange={(e) => updateValProp('pattern', e.target.value)}
                    placeholder="e.g. ^[a-zA-Z0-9 ]+$"
                  />
                </div>

                <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                  <EncryptionValidationConfigV2
                    activeField={field}
                    onUpdateField={onUpdateField}
                    updateNested={updateNested}
                  />
                </div>
              </>
            )}

            {/* NUMBER: Allow Negative, Number Format, Min Value, Static Max Value, Dynamic Limit, Encryption */}
            {isNumber && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block' }}>Allow Negative Numbers</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}  className="italic">
                      {field.validation?.allow_negative ? 'Negative numbers allowed' : 'Disallowed (Positive values only ≥ 0)'}
                    </span>
                  </div>
                  <Switch
                    size="small"
                    checked={field.validation?.allow_negative === true}
                    onChange={(checked) => {
                      updateValProp('allow_negative', checked);
                      if (!checked && field.validation?.min !== undefined && field.validation.min < 0) {
                        updateValProp('min', 0);
                      }
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Number Format</span>
                  <Select
                    size="small"
                    style={{ width: 140 }}
                    value={field.number_type || (field.data_type === 'double precision' ? 'decimal' : 'integer')}
                    onChange={(val) => {
                      onUpdateField({
                        ...field,
                        number_type: val,
                        data_type: val === 'decimal' ? 'double precision' : 'integer',
                      });
                    }}
                    options={[
                      { label: 'Integer (Whole)', value: 'integer' },
                      { label: 'Decimal (1.50)', value: 'decimal' },
                    ]}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Min Value</span>
                  <input
                    type="number"
                    min={!field.validation?.allow_negative ? 0 : undefined}
                    onKeyDown={!field.validation?.allow_negative ? blockNegativeKeys : undefined}
                    style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    value={field.validation?.min !== undefined ? field.validation.min : ''}
                    onChange={(e) => {
                      const val = e.target.value !== '' ? Number(e.target.value) : undefined;
                      if (!field.validation?.allow_negative && val !== undefined && val < 0) {
                        updateValProp('min', 0);
                      } else {
                        updateValProp('min', val);
                      }
                    }}
                    placeholder={!field.validation?.allow_negative ? '0 (or higher)' : 'e.g. -100'}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Static Max Value</span>
                  <input
                    type="number"
                    style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    value={field.validation?.max !== undefined ? field.validation.max : ''}
                    onChange={(e) => updateValProp('max', e.target.value !== '' ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 10000"
                  />
                </div>

                {field.validation?.min !== undefined && field.validation?.max !== undefined && Number(field.validation.min) > Number(field.validation.max) && (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: -4 }}>
                    <ExclamationCircleOutlined /> Min Value cannot exceed Static Max Value
                  </div>
                )}

                {/* Dynamic Cross-Table Balance & Limit Check */}
                <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={field.validation?.dynamic_limit?.enabled || false}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          const currentLimit = field.validation?.dynamic_limit || {};
                          const defTable = currentLimit.target_table || 'project';
                          updateValProp('dynamic_limit', {
                            enabled,
                            target_table: defTable,
                            target_limit_field: currentLimit.target_limit_field || 'project_amount',
                            source_fk_field: currentLimit.source_fk_field || 'parent_id',
                            auto_recalculate_balance: currentLimit.auto_recalculate_balance !== false,
                            remaining_field: currentLimit.remaining_field || 'remaining_amount',
                            error_message: currentLimit.error_message || 'Entered amount exceeds the remaining project balance.',
                          });
                          if (enabled && defTable) {
                            fetchColumnsForTable(defTable);
                          }
                        }}
                      />
                      <span style={{ color: 'var(--primary-color, #15803d)' }}>⚡ Check Remaining Balance (Parent Table)</span>
                    </label>
                  </div>

                  {field.validation?.dynamic_limit?.enabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: '12px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          Target Parent Table *
                        </label>
                        <Select
                          size="small"
                          showSearch
                          loading={masterLoading}
                          value={field.validation.dynamic_limit.target_table || undefined}
                          onChange={(val) => {
                            updateValProp('dynamic_limit', { ...field.validation.dynamic_limit, target_table: val });
                            fetchColumnsForTable(val);
                          }}
                          options={allTables.map((t) => ({ label: t.table_name || t.label, value: t.table_name || t.value }))}
                          placeholder="e.g. project"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          Foreign Key (Links to Parent) *
                        </label>
                        <Select
                          size="small"
                          showSearch
                          value={field.validation.dynamic_limit.source_fk_field || 'parent_id'}
                          onChange={(val) =>
                            updateValProp('dynamic_limit', { ...field.validation.dynamic_limit, source_fk_field: val })
                          }
                          options={[
                            { label: 'parent_id (Parent Record Link)', value: 'parent_id' },
                            ...(allFields || []).filter((f) => f.db_field && f.db_field !== 'parent_id').map((f) => ({
                              label: `${f.label || f.db_field} (${f.db_field})`,
                              value: f.db_field || f.column_name,
                            })),
                          ]}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          Parent Budget / Total Column *
                        </label>
                        <Select
                          size="small"
                          showSearch
                          value={field.validation.dynamic_limit.target_limit_field || undefined}
                          onChange={(val) =>
                            updateValProp('dynamic_limit', { ...field.validation.dynamic_limit, target_limit_field: val })
                          }
                          options={(tableColumnsMap[(field.validation.dynamic_limit.target_table || '').toLowerCase()] || []).map((c) => ({
                            label: c,
                            value: c,
                          }))}
                          placeholder="e.g. project_amount"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          Parent Remaining Column to Auto-Update
                        </label>
                        <Select
                          size="small"
                          showSearch
                          value={field.validation.dynamic_limit.remaining_field || 'remaining_amount'}
                          onChange={(val) =>
                            updateValProp('dynamic_limit', { ...field.validation.dynamic_limit, remaining_field: val })
                          }
                          options={(tableColumnsMap[(field.validation.dynamic_limit.target_table || '').toLowerCase()] || []).map((c) => ({
                            label: c,
                            value: c,
                          }))}
                          placeholder="e.g. remaining_amount"
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          Rejection Message (if over balance)
                        </label>
                        <input
                          type="text"
                          style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11 }}
                          value={field.validation.dynamic_limit.error_message || ''}
                          onChange={(e) =>
                            updateValProp('dynamic_limit', { ...field.validation.dynamic_limit, error_message: e.target.value })
                          }
                          placeholder="e.g. Entered amount exceeds remaining project balance."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                  <EncryptionValidationConfigV2
                    activeField={field}
                    onUpdateField={onUpdateField}
                    updateNested={updateNested}
                  />
                </div>
              </>
            )}

            {/* SELECT: Dropdown guidance for Single Select, Min/Max Selections for Multiple Select */}
            {isSelect && (
              <>
                {isMultiple ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Min Selections</span>
                      <input
                        type="number"
                        min="1"
                        onKeyDown={blockNegativeKeys}
                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        value={field.validation?.min_items !== undefined && field.validation?.min_items !== '' ? field.validation.min_items : ''}
                        onChange={(e) => handlePositiveIntChange('min_items', e.target.value, 1)}
                        placeholder="e.g. 1"
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Max Selections</span>
                      <input
                        type="number"
                        min="1"
                        onKeyDown={blockNegativeKeys}
                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        value={field.validation?.max_items !== undefined && field.validation?.max_items !== '' ? field.validation.max_items : ''}
                        onChange={(e) => handlePositiveIntChange('max_items', e.target.value, 1)}
                        placeholder="e.g. 5"
                      />
                    </div>

                    {field.validation?.min_items !== undefined && field.validation?.max_items !== undefined && Number(field.validation.min_items) > Number(field.validation.max_items) && (
                      <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: -4 }}>
                        <ExclamationCircleOutlined /> Min Selections cannot be greater than Max Selections
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9', lineHeight: 1.5 }}>
                    ℹ️ Dropdown choices are configured in the <strong>Dropdown Data Source</strong> section below. Toggle <strong>Required Field</strong> above to mandate option selection.
                  </div>
                )}

                <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                  <EncryptionValidationConfigV2
                    activeField={field}
                    onUpdateField={onUpdateField}
                    updateNested={updateNested}
                  />
                </div>
              </>
            )}

            {/* DATE: Disable Past/Future, Min Allowed Date, Max Allowed Date */}
            {isDate && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Disable Past</span>
                    <Switch
                      size="small"
                      checked={field.validation?.min_date === 'today'}
                      onChange={(checked) => {
                        updateValProp('min_date', checked ? 'today' : undefined);
                        updateValProp('min_date_type', checked ? 'today' : 'none');
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Disable Future</span>
                    <Switch
                      size="small"
                      checked={field.validation?.max_date === 'today'}
                      onChange={(checked) => {
                        updateValProp('max_date', checked ? 'today' : undefined);
                        updateValProp('max_date_type', checked ? 'today' : 'none');
                      }}
                    />
                  </div>
                </div>

                {/* Min Allowed Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Min Allowed Date</span>
                    <Select
                      size="small"
                      style={{ width: 140 }}
                      value={
                        field.validation?.min_date_type ||
                        (field.validation?.min_date === 'today' ? 'today' :
                          (field.validation?.min_date && dayjs(field.validation.min_date, 'YYYY-MM-DD', true).isValid()) ? 'custom' :
                          field.validation?.min_date ? 'field' : 'none')
                      }
                      onChange={(val) => {
                        updateValProp('min_date_type', val);
                        if (val === 'none') updateValProp('min_date', undefined);
                        else if (val === 'today') updateValProp('min_date', 'today');
                        else if (val === 'custom') updateValProp('min_date', dayjs().format('YYYY-MM-DD'));
                        else if (val === 'field') updateValProp('min_date', otherDateFields[0]?.db_field || otherDateFields[0]?.id || undefined);
                      }}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'today', label: 'Today' },
                        { value: 'custom', label: 'Specific Date' },
                        { value: 'field', label: 'Another Field' },
                      ]}
                    />
                  </div>

                  {(field.validation?.min_date_type === 'custom' || (field.validation?.min_date && field.validation.min_date !== 'today' && dayjs(field.validation.min_date, 'YYYY-MM-DD', true).isValid())) && (
                    <DatePicker
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      format="YYYY-MM-DD"
                      value={dayjs(field.validation?.min_date, 'YYYY-MM-DD', true).isValid() ? dayjs(field.validation.min_date) : null}
                      onChange={(dt) => updateValProp('min_date', dt ? dt.format('YYYY-MM-DD') : undefined)}
                    />
                  )}

                  {(field.validation?.min_date_type === 'field' || (field.validation?.min_date && field.validation.min_date !== 'today' && !dayjs(field.validation.min_date, 'YYYY-MM-DD', true).isValid())) && (
                    <Select
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      placeholder="Select Reference Date Field"
                      value={field.validation?.min_date || undefined}
                      onChange={(val) => updateValProp('min_date', val)}
                      options={otherDateFields.map((f) => ({
                        label: `${f.label || f.db_field} (${f.db_field})`,
                        value: f.db_field || f.id,
                      }))}
                    />
                  )}
                </div>

                {/* Max Allowed Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Max Allowed Date</span>
                    <Select
                      size="small"
                      style={{ width: 140 }}
                      value={
                        field.validation?.max_date_type ||
                        (field.validation?.max_date === 'today' ? 'today' :
                          (field.validation?.max_date && dayjs(field.validation.max_date, 'YYYY-MM-DD', true).isValid()) ? 'custom' :
                          field.validation?.max_date ? 'field' : 'none')
                      }
                      onChange={(val) => {
                        updateValProp('max_date_type', val);
                        if (val === 'none') updateValProp('max_date', undefined);
                        else if (val === 'today') updateValProp('max_date', 'today');
                        else if (val === 'custom') updateValProp('max_date', dayjs().format('YYYY-MM-DD'));
                        else if (val === 'field') updateValProp('max_date', otherDateFields[0]?.db_field || otherDateFields[0]?.id || undefined);
                      }}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'today', label: 'Today' },
                        { value: 'custom', label: 'Specific Date' },
                        { value: 'field', label: 'Another Field' },
                      ]}
                    />
                  </div>

                  {(field.validation?.max_date_type === 'custom' || (field.validation?.max_date && field.validation.max_date !== 'today' && dayjs(field.validation.max_date, 'YYYY-MM-DD', true).isValid())) && (
                    <DatePicker
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      format="YYYY-MM-DD"
                      value={dayjs(field.validation?.max_date, 'YYYY-MM-DD', true).isValid() ? dayjs(field.validation.max_date) : null}
                      onChange={(dt) => updateValProp('max_date', dt ? dt.format('YYYY-MM-DD') : undefined)}
                    />
                  )}

                  {(field.validation?.max_date_type === 'field' || (field.validation?.max_date && field.validation.max_date !== 'today' && !dayjs(field.validation.max_date, 'YYYY-MM-DD', true).isValid())) && (
                    <Select
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      placeholder="Select Reference Date Field"
                      value={field.validation?.max_date || undefined}
                      onChange={(val) => updateValProp('max_date', val)}
                      options={otherDateFields.map((f) => ({
                        label: `${f.label || f.db_field} (${f.db_field})`,
                        value: f.db_field || f.id,
                      }))}
                    />
                  )}
                </div>
              </>
            )}

            {/* DATE RANGE: Disable Past/Future, Min Start Date, Max End Date, Min Days Span, Max Days Span */}
            {isDateRange && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Disable Past</span>
                    <Switch
                      size="small"
                      checked={field.validation?.min_date === 'today'}
                      onChange={(checked) => {
                        updateValProp('min_date', checked ? 'today' : undefined);
                        updateValProp('min_date_type', checked ? 'today' : 'none');
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Disable Future</span>
                    <Switch
                      size="small"
                      checked={field.validation?.max_date === 'today'}
                      onChange={(checked) => {
                        updateValProp('max_date', checked ? 'today' : undefined);
                        updateValProp('max_date_type', checked ? 'today' : 'none');
                      }}
                    />
                  </div>
                </div>

                {/* Min Start Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Min Start Date</span>
                    <Select
                      size="small"
                      style={{ width: 140 }}
                      value={
                        field.validation?.min_date_type ||
                        (field.validation?.min_date === 'today' ? 'today' :
                          (field.validation?.min_date && dayjs(field.validation.min_date, 'YYYY-MM-DD', true).isValid()) ? 'custom' :
                          field.validation?.min_date ? 'field' : 'none')
                      }
                      onChange={(val) => {
                        updateValProp('min_date_type', val);
                        if (val === 'none') updateValProp('min_date', undefined);
                        else if (val === 'today') updateValProp('min_date', 'today');
                        else if (val === 'custom') updateValProp('min_date', dayjs().format('YYYY-MM-DD'));
                        else if (val === 'field') updateValProp('min_date', otherDateFields[0]?.db_field || otherDateFields[0]?.id || undefined);
                      }}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'today', label: 'Today' },
                        { value: 'custom', label: 'Specific Date' },
                        { value: 'field', label: 'Another Field' },
                      ]}
                    />
                  </div>

                  {(field.validation?.min_date_type === 'custom' || (field.validation?.min_date && field.validation.min_date !== 'today' && dayjs(field.validation.min_date, 'YYYY-MM-DD', true).isValid())) && (
                    <DatePicker
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      format="YYYY-MM-DD"
                      value={dayjs(field.validation?.min_date, 'YYYY-MM-DD', true).isValid() ? dayjs(field.validation.min_date) : null}
                      onChange={(dt) => updateValProp('min_date', dt ? dt.format('YYYY-MM-DD') : undefined)}
                    />
                  )}

                  {(field.validation?.min_date_type === 'field' || (field.validation?.min_date && field.validation.min_date !== 'today' && !dayjs(field.validation.min_date, 'YYYY-MM-DD', true).isValid())) && (
                    <Select
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      placeholder="Select Reference Date Field"
                      value={field.validation?.min_date || undefined}
                      onChange={(val) => updateValProp('min_date', val)}
                      options={otherDateFields.map((f) => ({
                        label: `${f.label || f.db_field} (${f.db_field})`,
                        value: f.db_field || f.id,
                      }))}
                    />
                  )}
                </div>

                {/* Max End Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Max End Date</span>
                    <Select
                      size="small"
                      style={{ width: 140 }}
                      value={
                        field.validation?.max_date_type ||
                        (field.validation?.max_date === 'today' ? 'today' :
                          (field.validation?.max_date && dayjs(field.validation.max_date, 'YYYY-MM-DD', true).isValid()) ? 'custom' :
                          field.validation?.max_date ? 'field' : 'none')
                      }
                      onChange={(val) => {
                        updateValProp('max_date_type', val);
                        if (val === 'none') updateValProp('max_date', undefined);
                        else if (val === 'today') updateValProp('max_date', 'today');
                        else if (val === 'custom') updateValProp('max_date', dayjs().format('YYYY-MM-DD'));
                        else if (val === 'field') updateValProp('max_date', otherDateFields[0]?.db_field || otherDateFields[0]?.id || undefined);
                      }}
                      options={[
                        { value: 'none', label: 'None' },
                        { value: 'today', label: 'Today' },
                        { value: 'custom', label: 'Specific Date' },
                        { value: 'field', label: 'Another Field' },
                      ]}
                    />
                  </div>

                  {(field.validation?.max_date_type === 'custom' || (field.validation?.max_date && field.validation.max_date !== 'today' && dayjs(field.validation.max_date, 'YYYY-MM-DD', true).isValid())) && (
                    <DatePicker
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      format="YYYY-MM-DD"
                      value={dayjs(field.validation?.max_date, 'YYYY-MM-DD', true).isValid() ? dayjs(field.validation.max_date) : null}
                      onChange={(dt) => updateValProp('max_date', dt ? dt.format('YYYY-MM-DD') : undefined)}
                    />
                  )}

                  {(field.validation?.max_date_type === 'field' || (field.validation?.max_date && field.validation.max_date !== 'today' && !dayjs(field.validation.max_date, 'YYYY-MM-DD', true).isValid())) && (
                    <Select
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                      placeholder="Select Reference Date Field"
                      value={field.validation?.max_date || undefined}
                      onChange={(val) => updateValProp('max_date', val)}
                      options={otherDateFields.map((f) => ({
                        label: `${f.label || f.db_field} (${f.db_field})`,
                        value: f.db_field || f.id,
                      }))}
                    />
                  )}
                </div>

                {/* Min & Max Range in Days */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Min Range (Days)</span>
                    <input
                      type="number"
                      min="1"
                      onKeyDown={blockNegativeKeys}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      value={field.validation?.min_range_days !== undefined && field.validation?.min_range_days !== '' ? field.validation.min_range_days : ''}
                      onChange={(e) => handlePositiveIntChange('min_range_days', e.target.value, 1)}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Max Range (Days)</span>
                    <input
                      type="number"
                      min="1"
                      onKeyDown={blockNegativeKeys}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                      value={field.validation?.max_range_days !== undefined && field.validation?.max_range_days !== '' ? field.validation.max_range_days : ''}
                      onChange={(e) => handlePositiveIntChange('max_range_days', e.target.value, 1)}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>

                {field.validation?.min_range_days !== undefined && field.validation?.max_range_days !== undefined && Number(field.validation.min_range_days) > Number(field.validation.max_range_days) && (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: -4 }}>
                    <ExclamationCircleOutlined /> Min Range Days cannot exceed Max Range Days
                  </div>
                )}
              </>
            )}

            {/* FILE: Allowed Formats, Max Size (MB) */}
            {isFile && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Allowed Formats</span>
                  <input
                    type="text"
                    style={{ width: 140, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    value={field.validation?.allowed_types || '.pdf, .png, .jpg'}
                    onChange={(e) => updateValProp('allowed_types', e.target.value)}
                    placeholder=".pdf, .png, .jpg"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Max File Size (MB)</span>
                  <input
                    type="number"
                    min="1"
                    onKeyDown={blockNegativeKeys}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    value={field.validation?.max_file_size !== undefined && field.validation?.max_file_size !== '' ? field.validation.max_file_size : 5}
                    onChange={(e) => handlePositiveIntChange('max_file_size', e.target.value, 1)}
                    placeholder="5"
                  />
                </div>
              </>
            )}

            {/* SWITCH: Must be checked to submit */}
            {isSwitch && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block' }}>Mandatory Toggle</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Must be switched ON to submit form</span>
                </div>
                <Switch
                  size="small"
                  checked={!!field.validation?.must_be_true}
                  onChange={(checked) => {
                    updateValProp('must_be_true', checked);
                    updateProp('required', checked);
                  }}
                />
              </div>
            )}

            {/* GEOMETRY: Spatial coordinates info */}
            {isGeometry && (
              <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9', lineHeight: 1.5 }}>
                📍 Coordinates and geometries are validated on the interactive map widget. Enable <strong>Required Field</strong> above to enforce placement.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Dropdown Options & Master Source (If Dropdown) */}
      {isSelect && (
        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
            Dropdown Data Source
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <Button
              size="small"
              type={field.options_source === 'master' || field.data_source ? 'default' : 'primary'}
              onClick={() => {
                onUpdateField({
                  ...field,
                  options_source: 'static',
                  data_source: null,
                  options: field.options?.length ? field.options : [{ label: 'Option 1', value: 'opt_1' }],
                });
              }}
              style={{ flex: 1, borderRadius: 6 }}
            >
              Static List
            </Button>
            <Button
              size="small"
              type={field.options_source === 'master' || field.data_source ? 'primary' : 'default'}
              onClick={() => {
                onUpdateField({
                  ...field,
                  options_source: 'master',
                  data_source: { type: 'master', name: 'state' },
                });
              }}
              style={{ flex: 1, borderRadius: 6 }}
            >
              Master Form Source
            </Button>
          </div>

          {/* Master Form Source Config */}
          {(field.options_source === 'master' || field.data_source) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Select Master Form / Table
                </label>
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                  loading={masterLoading}
                  value={field.data_source?.table_name || undefined}
                  onChange={async (tableName) => {
                    // Try to find metadata from loaded form schemas
                    const selectedForm = masterForms.find(
                      (m) => (m.table_name || `t_frm_${m.slug}`) === tableName || m.slug === tableName
                    );
                    const pk = selectedForm?.primary_key || 'id';
                    // Derive a friendly name from the table name
                    const name = selectedForm?.slug || tableName.replace(/^t_frm_/, '').replace(/^t_/, '');

                    // Fetch columns for the newly chosen table
                    const cols = await fetchColumnsForTable(tableName);

                    const autoValKey = cols.includes(pk) ? pk : (cols.includes('id') ? 'id' : (cols[0] || 'id'));

                    let autoLabelKey = field.data_source?.label_key;
                    if (!autoLabelKey || !cols.includes(autoLabelKey)) {
                      const candidates = ['name', 'title', 'label', 'unit_name', 'project_name', 'code', 'display_name', 'description'];
                      const matched = candidates.find((c) => cols.includes(c)) ||
                        cols.find((c) => c.toLowerCase().endsWith('_name') || c.toLowerCase().includes('name') || c.toLowerCase().includes('title')) ||
                        cols.find((c) => c !== autoValKey) ||
                        cols[0] ||
                        'name';
                      autoLabelKey = matched;
                    }

                    onUpdateField({
                      ...field,
                      options_source: 'master',
                      data_source: {
                        ...(field.data_source || {}),
                        type: 'master',
                        name,
                        table_name: tableName,
                        primary_key: autoValKey,
                        value_key: autoValKey,
                        label_key: autoLabelKey,
                      },
                    });
                  }}
                  options={(() => {
                    const seen = new Set();
                    return (allTables || [])
                      .map((t) => ({
                        value: t.table_name || t.value,
                        label: t.table_name || t.label,
                      }))
                      .filter((opt) => {
                        if (!opt.value || seen.has(opt.value)) return false;
                        seen.add(opt.value);
                        return true;
                      });
                  })()}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>
                    Table Name
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                    value={field.data_source?.table_name || (field.data_source?.name ? `t_${field.data_source.name}` : 't_state')}
                    onChange={(e) => {
                      onUpdateField({
                        ...field,
                        data_source: { ...(field.data_source || {}), table_name: e.target.value },
                      });
                    }}
                    onBlur={(e) => {
                      if (e.target.value) {
                        fetchColumnsForTable(e.target.value);
                      }
                    }}
                    placeholder="e.g. t_state"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>
                    Value Key (ID Column)
                  </label>
                  {(() => {
                    const currentTable = field.data_source?.table_name || (field.data_source?.name ? `t_${field.data_source.name}` : '');
                    const activeCols = Array.from(new Set((currentTable && tableColumnsMap[currentTable.toLowerCase()]) || []));
                    const currentValueKey = field.data_source?.primary_key || field.data_source?.value_key || 'id';

                    const valueKeyOptions = activeCols.length > 0
                      ? activeCols.map((c) => ({
                          value: c,
                          label: c === 'id' ? 'id (Primary Key)' : c,
                        }))
                      : [
                          { value: 'id', label: 'id (Primary Key)' },
                          { value: 'code', label: 'code' },
                          { value: 'name', label: 'name' },
                        ];

                    const finalValueKeyOptions = valueKeyOptions.some((o) => o.value === currentValueKey)
                      ? valueKeyOptions
                      : [{ value: currentValueKey, label: currentValueKey }, ...valueKeyOptions];

                    return (
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        showSearch
                        loading={loadingColumns}
                        optionFilterProp="label"
                        filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                        placeholder="Select Value Key (id)"
                        value={currentValueKey}
                        onChange={(valKey) => {
                          onUpdateField({
                            ...field,
                            data_source: {
                              ...(field.data_source || {}),
                              primary_key: valKey,
                              value_key: valKey,
                            },
                          });
                        }}
                        options={finalValueKeyOptions}
                      />
                    );
                  })()}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>
                  Label Column Name (Display Text)
                </label>
                {(() => {
                  const currentTable = field.data_source?.table_name || (field.data_source?.name ? `t_${field.data_source.name}` : '');
                  const activeCols = Array.from(new Set((currentTable && tableColumnsMap[currentTable.toLowerCase()]) || []));
                  const currentLabelKey = field.data_source?.label_key || 'name';

                  const labelKeyOptions = activeCols.length > 0
                    ? activeCols.map((c) => ({
                        value: c,
                        label: c,
                      }))
                    : [
                        { value: 'name', label: 'name (Default)' },
                        { value: 'title', label: 'title' },
                        { value: 'label', label: 'label' },
                      ];

                  const finalLabelKeyOptions = labelKeyOptions.some((o) => o.value === currentLabelKey)
                    ? labelKeyOptions
                    : [{ value: currentLabelKey, label: currentLabelKey }, ...labelKeyOptions];

                  return (
                    <Select
                      size="small"
                      style={{ width: '100%' }}
                      showSearch
                      loading={loadingColumns}
                      optionFilterProp="label"
                      filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                      placeholder="Select Label Column (name)"
                      value={currentLabelKey}
                      onChange={(lblKey) => {
                        onUpdateField({
                          ...field,
                          data_source: { ...(field.data_source || {}), label_key: lblKey },
                        });
                      }}
                      options={finalLabelKeyOptions}
                    />
                  );
                })()}
              </div>

              <div style={{ paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                  🔗 Cascading Parent Field (Filter)
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      Parent Form Field
                    </label>
                    <Select
                      size="small"
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                      placeholder="None (Independent)"
                      allowClear
                      value={field.dependency?.parent_db_field || field.dependency?.parent || undefined}
                      onChange={(parentColDb) => {
                        if (!parentColDb) {
                          onUpdateField({
                            ...field,
                            dependency: null,
                          });
                        } else {
                          const currentTable = field.data_source?.table_name || (field.data_source?.name ? `t_${field.data_source.name}` : '');
                          const activeCols = Array.from(new Set((currentTable && tableColumnsMap[currentTable.toLowerCase()]) || []));
                          let defaultCol = field.dependency?.filter_column || '';
                          if (!defaultCol) {
                            if (activeCols.includes(parentColDb)) {
                              defaultCol = parentColDb;
                            } else if (activeCols.includes(`${parentColDb}_id`)) {
                              defaultCol = `${parentColDb}_id`;
                            } else {
                              defaultCol = parentColDb;
                            }
                          }
                          onUpdateField({
                            ...field,
                            dependency: {
                              ...(field.dependency || {}),
                              parent_db_field: parentColDb,
                              parent: parentColDb,
                              filter_column: defaultCol,
                            },
                          });
                        }
                      }}
                      options={(() => {
                        const seen = new Set();
                        const list = [];
                        (allFields || []).forEach((f) => {
                          if (f.id === field.id || f.type !== 'select') return;
                          const val = f.db_field || f.id;
                          if (!val || seen.has(val)) return;
                          seen.add(val);
                          list.push({
                            value: val,
                            label: `${f.label || f.db_field || val} (${val})`,
                          });
                        });
                        return list;
                      })()}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      Filter Column in Master Table
                    </label>
                    {(() => {
                      const currentTable = field.data_source?.table_name || (field.data_source?.name ? `t_${field.data_source.name}` : '');
                      const activeCols = Array.from(new Set((currentTable && tableColumnsMap[currentTable.toLowerCase()]) || []));
                      const currentFilterCol = field.dependency?.filter_column || '';

                      const filterColOptions = activeCols.length > 0
                        ? activeCols.map((c) => ({
                            value: c,
                            label: c,
                          }))
                        : [
                            { value: 'state_id', label: 'state_id' },
                            { value: 'district_id', label: 'district_id' },
                            { value: 'block_id', label: 'block_id' },
                            { value: 'village_id', label: 'village_id' },
                          ];

                      const finalFilterColOptions = (currentFilterCol && !filterColOptions.some((o) => o.value === currentFilterCol))
                        ? [{ value: currentFilterCol, label: currentFilterCol }, ...filterColOptions]
                        : filterColOptions;

                      return (
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          showSearch
                          allowClear
                          loading={loadingColumns}
                          disabled={!field.dependency?.parent_db_field && !field.dependency?.parent}
                          optionFilterProp="label"
                          filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
                          placeholder={loadingColumns ? 'Loading...' : 'e.g. block_id'}
                          value={currentFilterCol || undefined}
                          onChange={(colVal) => {
                            if (!field.dependency) return;
                            onUpdateField({
                              ...field,
                              dependency: {
                                ...field.dependency,
                                filter_column: colVal || '',
                              },
                            });
                          }}
                          popupRender={(menu) => (
                            <>
                              {menu}
                              <div style={{ padding: 6, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Or type column manually:</div>
                                <input
                                  style={{ width: '100%', padding: '3px 6px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1' }}
                                  placeholder="e.g. block_id"
                                  value={field.dependency?.filter_column || ''}
                                  onChange={(e) => {
                                    if (!field.dependency) return;
                                    onUpdateField({
                                      ...field,
                                      dependency: {
                                        ...field.dependency,
                                        filter_column: e.target.value,
                                      },
                                    });
                                  }}
                                />
                              </div>
                            </>
                          )}
                          options={finalFilterColOptions}
                        />
                      );
                    })()}
                  </div>
                </div>

                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                  {field.dependency?.parent_db_field && field.dependency?.filter_column ? (
                    <span style={{ color: '#0369a1' }}>
                      Filters <code>{field.data_source?.table_name || 'master table'}</code> where <code>{field.dependency.filter_column}</code> = selected <code>{field.dependency.parent_db_field}</code>.
                    </span>
                  ) : (
                    <span>The selected parent field's value will match against the master table's foreign key column.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Static Options Editor with both Label and Value inputs */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 24px', gap: 6, fontSize: 10, fontWeight: 700, color: '#64748b' }}>
                <span>Option Label</span>
                <span>Option Value</span>
                <span></span>
              </div>
              {(field.options || []).map((opt, oIdx) => (
                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="text"
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    placeholder="Label"
                    value={opt.label || ''}
                    onChange={(e) => {
                      const opts = [...(field.options || [])];
                      const val = e.target.value;
                      const autoVal = val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                      const currentVal = opts[oIdx]?.value || '';
                      const prevAutoVal = (opts[oIdx]?.label || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                      const isDerived = !currentVal || currentVal.startsWith('opt_') || currentVal === prevAutoVal;

                      opts[oIdx] = {
                        ...opts[oIdx],
                        label: val,
                        value: (isDerived && autoVal) ? autoVal : (currentVal.startsWith('opt_') ? autoVal : currentVal),
                      };
                      onUpdateField({ ...field, options: opts });
                    }}
                  />
                  <input
                    type="text"
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                    placeholder="Value"
                    value={opt.value || ''}
                    onChange={(e) => {
                      const opts = [...(field.options || [])];
                      opts[oIdx] = { ...opts[oIdx], value: e.target.value };
                      onUpdateField({ ...field, options: opts });
                    }}
                  />
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const opts = (field.options || []).filter((_, i) => i !== oIdx);
                      onUpdateField({ ...field, options: opts });
                    }}
                  />
                </div>
              ))}
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const opts = [...(field.options || [])];
                  const num = opts.length + 1;
                  opts.push({ label: `Option ${num}`, value: `opt_${num}` });
                  onUpdateField({ ...field, options: opts });
                }}
              >
                + Add Option
              </Button>
            </div>
          )}
        </div>
      )}


      {/* 6. Formula & Calculation Builder (For Number & Calculated Fields) */}
      {(field.type === 'number' || field.calculation?.enabled) && (
        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalculatorOutlined style={{ color: 'var(--primary-color, #15803d)' }} /> Formula & Calculation
          </div>
          <CalculationTabConfigV2
            activeField={field}
            updateField={(key, val) => updateProp(key, val)}
            updateNested={updateNested}
            allFormFields={allFields}
          />
        </div>
      )}
    </div>
  );
}
