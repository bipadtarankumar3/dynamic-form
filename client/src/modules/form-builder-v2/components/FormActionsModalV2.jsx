'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, Tabs, Button, Input, Select, Switch, Popconfirm, Tag, Tooltip, Checkbox, Space, Empty
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  EyeOutlined,
  DownOutlined,
  UpOutlined,
  CloseOutlined,
  LinkOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  TableOutlined,
  HolderOutlined,
  SearchOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  SyncOutlined,
  SaveOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import IconPickerModalV2, { getAntdIconComponent } from './IconPickerModalV2';
import { privateHttpClient } from '@/services/api/httpClient';
import '../styles/form-builder-v2.css';

/* Sortable Row Component for Column Drag & Drop */
function SortableColumnItem({
  col,
  onToggleCheck,
  onUpdateCol,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.key });

  const isChecked = col.checked !== false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 9999 : 'auto',
    opacity: isDragging ? 0.7 : isChecked ? 1 : 0.6,
    background: isDragging ? '#f0fdf4' : isChecked ? '#ffffff' : '#f8fafc',
    border: `1px solid ${isDragging ? 'var(--primary-color, #15803d)' : isChecked ? '#e2e8f0' : '#f1f5f9'}`,
    borderRadius: 10,
    padding: '8px 16px',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: isDragging
      ? '0 12px 28px -4px rgba(21, 128, 61, 0.25)'
      : isChecked
      ? '0 1px 3px 0 rgba(0, 0, 0, 0.03)'
      : 'none',
    transition: 'all 0.15s ease',
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-column-row">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 6,
          userSelect: 'none',
          background: '#f1f5f9',
          transition: 'all 0.15s',
        }}
        title="Drag up or down to reorder column order"
      >
        <HolderOutlined style={{ fontSize: 16 }} />
      </div>

      {/* Checkbox */}
      <Checkbox
        checked={isChecked}
        onChange={(e) => onToggleCheck(col.key, e.target.checked)}
      />

      {/* Field DB Key */}
      <div style={{ minWidth: 190, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <Tooltip title={`Database column: ${col.key}`}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              background: isChecked ? '#f1f5f9' : '#f8fafc',
              color: isChecked ? '#0f172a' : '#94a3b8',
              border: `1px solid ${isChecked ? '#e2e8f0' : '#e2e8f0'}`,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <DatabaseOutlined style={{ fontSize: 11, color: isChecked ? 'var(--primary-color, #15803d)' : '#94a3b8' }} />
            {col.key}
          </span>
        </Tooltip>
      </div>

      {/* Editable Display Label */}
      <div style={{ flex: 1 }}>
        <Input
          placeholder="Display Header Label (e.g. State Name)"
          value={col.label}
          disabled={!isChecked}
          onChange={(e) => onUpdateCol(col.key, 'label', e.target.value)}
          style={{
            borderRadius: 8,
            height: 38,
            fontWeight: 600,
            fontSize: 13.5,
            borderColor: '#cbd5e1',
          }}
        />
      </div>

      {/* Column Alignment */}
      <div style={{ width: 110 }}>
        <Select
          value={col.align || 'left'}
          disabled={!isChecked}
          onChange={(val) => onUpdateCol(col.key, 'align', val)}
          style={{ width: '100%', height: 38 }}
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ]}
        />
      </div>

      {/* Sortable Switch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 100, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 12, color: isChecked ? '#475569' : '#94a3b8', fontWeight: 600 }}>Sortable</span>
        <Switch
          size="small"
          checked={col.sortable !== false}
          disabled={!isChecked}
          onChange={(val) => onUpdateCol(col.key, 'sortable', val)}
        />
      </div>
    </div>
  );
}

export default function FormActionsModalV2({
  open,
  onClose,
  schema = {},
  onUpdateSchema,
  onSave,
  saving = false,
  allFormsList = [],
}) {
  const [activeTab, setActiveTab] = useState('columns');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconTargetIdx, setIconTargetIdx] = useState(null);
  const [expandedConditions, setExpandedConditions] = useState({});
  const [enableApproval, setEnableApproval] = useState(false);

  useEffect(() => {
    if (open && schema) {
      setEnableApproval(Boolean(schema.enable_approval));
    }
  }, [open, schema?.enable_approval]);

  // View & Table Columns State
  const [dbViews, setDbViews] = useState([]);
  const [loadingViews, setLoadingViews] = useState(false);
  const [selectedView, setSelectedView] = useState('');
  const [tableColumns, setTableColumns] = useState([]);
  const [columnSearch, setColumnSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /* Build initial default column list from schema */
  const buildDefaultColumns = (sch) => {
    if (!sch) return [];
    const cols = [];
    const seen = new Set();

    cols.push({ key: 'id', label: 'ID', checked: true, sortable: true, align: 'left' });
    seen.add('id');

    const sections = sch.sections || sch.tabs || sch.definition?.sections || [];
    for (const sec of sections) {
      if (sec.type === 'add_more') continue;
      const fields = typeof sec.fields === 'string' ? JSON.parse(sec.fields || '[]') : (sec.fields || []);
      for (const f of fields) {
        const colKey = f.column_name || f.db_field;
        if (!colKey || seen.has(colKey)) continue;
        seen.add(colKey);

        const isMaster = f.data_source?.type === 'master' || f.dataSource?.type === 'master';
        const rawLabel = f.label || colKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        cols.push({
          key: colKey,
          label: rawLabel,
          checked: f.visible !== false && f.add_to_list !== false,
          sortable: true,
          align: 'left',
          is_master: isMaster,
        });
      }
    }

    // Direct fields on schema
    if (Array.isArray(sch.fields)) {
      for (const f of sch.fields) {
        const colKey = f.column_name || f.db_field;
        if (!colKey || seen.has(colKey)) continue;
        seen.add(colKey);
        const rawLabel = f.label || colKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        cols.push({
          key: colKey,
          label: rawLabel,
          checked: f.visible !== false && f.add_to_list !== false,
          sortable: true,
          align: 'left',
        });
      }
    }

    if (!seen.has('created_by')) {
      cols.push({ key: 'created_by', label: 'Created By', checked: true, sortable: true, align: 'left' });
      seen.add('created_by');
    }
    if (!seen.has('created_at')) {
      cols.push({ key: 'created_at', label: 'Created At', checked: true, sortable: true, align: 'left' });
      seen.add('created_at');
    }

    return cols;
  };

  const isBaseTableSource = (sourceName) => {
    if (!sourceName) return false;
    const baseTbl = schema.table_name || `t_frm_${schema.slug}`;
    return sourceName === baseTbl || sourceName.startsWith('t_frm_');
  };

  const fetchColumnsForView = async (viewNameOrSlug, viewsList = dbViews) => {
    if (!viewNameOrSlug) return [];
    const matchedView = (viewsList || []).find(
      (v) => v.database_view_name === viewNameOrSlug || v.view_slug === viewNameOrSlug || v.view_name === viewNameOrSlug
    );
    const identifier = matchedView ? matchedView.id : viewNameOrSlug;
    try {
      const previewRes = await privateHttpClient.get(`configurator/database-views/${identifier}/preview?limit=1`);
      if (previewRes.data?.success && Array.isArray(previewRes.data.columns)) {
        return previewRes.data.columns.map((c) => {
          const cName = c.column_name || c.field || (typeof c === 'string' ? c : '');
          return {
            key: cName,
            label: cName.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
            checked: true,
            sortable: true,
            align: 'left',
            is_custom_view: true,
          };
        }).filter((c) => !!c.key);
      }
    } catch (pErr) {
      console.warn('[FormActionsModal] View preview error:', pErr.message);
    }
    return [];
  };

  /* Fetch available views from PostgreSQL database-views API and discover joined view columns */
  useEffect(() => {
    if (open && schema?.slug) {
      const fetchViews = async () => {
        try {
          setLoadingViews(true);
          const res = await privateHttpClient.get('configurator/database-views');
          const viewsList = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
          setDbViews(viewsList);

          const defaultView = schema.view_name || schema.view_slug || `v_${schema.slug}`;
          setSelectedView(defaultView);

          if (!isBaseTableSource(defaultView)) {
            // Database View Source is a View -> load ONLY view columns
            const viewCols = await fetchColumnsForView(defaultView, viewsList);
            if (viewCols.length > 0) {
              if (Array.isArray(schema.table_columns) && schema.table_columns.length > 0) {
                const viewColKeys = new Set(viewCols.map((c) => c.key));
                const keptCols = schema.table_columns.filter((c) => viewColKeys.has(c.key));
                const keptKeys = new Set(keptCols.map((c) => c.key));
                const newFromView = viewCols.filter((c) => !keptKeys.has(c.key));
                setTableColumns([...keptCols, ...newFromView]);
              } else {
                setTableColumns(viewCols);
              }
            } else if (Array.isArray(schema.table_columns) && schema.table_columns.length > 0) {
              setTableColumns(schema.table_columns);
            } else {
              setTableColumns(buildDefaultColumns(schema));
            }
          } else {
            // Base Table Source -> load base table/form columns
            if (Array.isArray(schema.table_columns) && schema.table_columns.length > 0) {
              setTableColumns(schema.table_columns);
            } else {
              setTableColumns(buildDefaultColumns(schema));
            }
          }
        } catch (err) {
          console.warn('[FormActionsModal] Error loading database views:', err.message);
        } finally {
          setLoadingViews(false);
        }
      };
      fetchViews();
    }
  }, [open, schema?.slug]);

  /* Auto-populate default 2 rows (View & Edit) ONLY if completely empty */
  useEffect(() => {
    if (open && schema && schema.slug) {
      const existingActions = schema.actions || schema.fsc_actions;
      if (!existingActions || existingActions.length === 0) {
        if (onUpdateSchema) {
          onUpdateSchema({
            actions: [
              { name: 'View', slug: 'view', type: 'OPEN_MODAL', icon: 'EyeOutlined', roles: ['admin'], conditions: [] },
              { name: 'Edit', slug: 'edit', type: 'OPEN_MODAL', icon: 'EditOutlined', roles: ['admin'], conditions: [] },
            ],
          });
        }
      }
    }
  }, [open, schema?.slug]);

  const actions = schema?.actions && schema.actions.length > 0 ? schema.actions : [];
  const enableActionTabs = schema?.enable_action_tabs !== undefined ? schema.enable_action_tabs : false;
  const actionTabs = schema?.action_tabs || [];

  const allFormFields = useMemo(() => {
    return (schema?.sections || []).flatMap((sec) => sec.fields || []);
  }, [schema?.sections]);

  const fieldOptions = useMemo(() => {
    const rawOptions = [
      ...allFormFields
        .filter((f) => f.db_field || f.label)
        .map((f) => {
          const val = f.db_field || f.label;
          return { label: `${f.label || f.db_field} (${val})`, value: val };
        }),
      { label: 'Status (status)', value: 'status' },
      { label: 'Amount / Total (amount)', value: 'amount' },
      { label: 'Is Active (is_active)', value: 'is_active' },
      { label: 'ID (id)', value: 'id' },
    ];

    const fieldMap = new Map();
    rawOptions.forEach((opt) => {
      if (opt.value && !fieldMap.has(opt.value)) {
        fieldMap.set(opt.value, opt);
      }
    });
    return Array.from(fieldMap.values());
  }, [allFormFields]);

  const viewSelectOptions = useMemo(() => {
    const opts = [];
    const seenValues = new Set();

    if (schema?.slug) {
      const defaultAutoViewVal = `v_${schema.slug}`;
      opts.push({
        label: `⭐ Default Auto View (${defaultAutoViewVal})`,
        value: defaultAutoViewVal,
      });
      seenValues.add(defaultAutoViewVal);

      const baseTblVal = schema.table_name || `t_frm_${schema.slug}`;
      opts.push({
        label: `📁 Base Table (${baseTblVal})`,
        value: baseTblVal,
      });
      seenValues.add(baseTblVal);
    }

    (dbViews || []).forEach((v) => {
      const val = v.database_view_name || v.view_slug;
      if (val && !seenValues.has(val)) {
        seenValues.add(val);
        opts.push({
          label: `📊 ${v.view_name} (${val})`,
          value: val,
        });
      }
    });

    return opts;
  }, [schema?.slug, schema?.table_name, dbViews]);

  /* Filter columns by search */
  const filteredColumns = useMemo(() => {
    if (!columnSearch.trim()) return tableColumns;
    const q = columnSearch.toLowerCase().trim();
    return tableColumns.filter(
      (c) => c.key.toLowerCase().includes(q) || (c.label && c.label.toLowerCase().includes(q))
    );
  }, [tableColumns, columnSearch]);

  const checkedCount = useMemo(() => {
    return tableColumns.filter((c) => c.checked).length;
  }, [tableColumns]);

  /* Action Handlers */
  const handleAddAction = () => {
    const newAction = {
      name: 'Action',
      slug: `action_${Date.now()}`,
      type: 'OPEN_MODAL',
      icon: 'EyeOutlined',
      roles: ['admin'],
      conditions: [],
      enable_approval: false,
    };
    if (onUpdateSchema) {
      onUpdateSchema({ actions: [...actions, newAction] });
    }
  };

  const handleUpdateAction = (idx, key, val) => {
    const updated = [...actions];
    updated[idx] = { ...updated[idx], [key]: val };
    if (onUpdateSchema) {
      onUpdateSchema({ actions: updated });
    }
  };

  const handleDeleteAction = (idx) => {
    const updated = actions.filter((_, i) => i !== idx);
    if (onUpdateSchema) {
      onUpdateSchema({ actions: updated });
    }
  };

  /* Action Conditions */
  const handleAddActionCondition = (actIdx) => {
    const act = actions[actIdx];
    const updatedConds = [...(act.conditions || []), { field: 'status', operator: 'equals', value: '' }];
    handleUpdateAction(actIdx, 'conditions', updatedConds);
  };

  const handleUpdateActionCondition = (actIdx, cIdx, key, val) => {
    const act = actions[actIdx];
    const updatedConds = [...(act.conditions || [])];
    updatedConds[cIdx] = { ...updatedConds[cIdx], [key]: val };
    handleUpdateAction(actIdx, 'conditions', updatedConds);
  };

  const handleDeleteActionCondition = (actIdx, cIdx) => {
    const act = actions[actIdx];
    const updatedConds = (act.conditions || []).filter((_, i) => i !== cIdx);
    handleUpdateAction(actIdx, 'conditions', updatedConds);
  };

  /* Action Tabs Handlers */
  const handleAddActionTab = () => {
    const newTab = {
      id: `tab_${Date.now()}`,
      title: 'New Tab',
      match_type: 'ALL',
      color: 'blue',
      conditions: [{ field: 'status', operator: 'equals', value: '' }],
    };
    if (onUpdateSchema) {
      onUpdateSchema({
        enable_action_tabs: true,
        action_tabs: [...actionTabs, newTab],
      });
    }
  };

  const handleUpdateActionTab = (idx, key, val) => {
    const updated = [...actionTabs];
    updated[idx] = { ...updated[idx], [key]: val };
    if (onUpdateSchema) {
      onUpdateSchema({ action_tabs: updated });
    }
  };

  const handleDeleteActionTab = (idx) => {
    const updated = actionTabs.filter((_, i) => i !== idx);
    if (onUpdateSchema) {
      onUpdateSchema({ action_tabs: updated });
    }
  };

  const handleAddTabCondition = (tabIdx) => {
    const tabItem = actionTabs[tabIdx];
    const conds = [...(tabItem.conditions || []), { field: 'status', operator: 'equals', value: '' }];
    handleUpdateActionTab(tabIdx, 'conditions', conds);
  };

  const handleUpdateTabCondition = (tabIdx, cIdx, key, val) => {
    const tabItem = actionTabs[tabIdx];
    const conds = [...(tabItem.conditions || [])];
    conds[cIdx] = { ...conds[cIdx], [key]: val };
    handleUpdateActionTab(tabIdx, 'conditions', conds);
  };

  const handleDeleteTabCondition = (tabIdx, cIdx) => {
    const tabItem = actionTabs[tabIdx];
    const conds = (tabItem.conditions || []).filter((_, i) => i !== cIdx);
    handleUpdateActionTab(tabIdx, 'conditions', conds);
  };

  /* Column Drag and Drop & State Handlers */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTableColumns((items) => {
        const oldIndex = items.findIndex((item) => item.key === active.id);
        const newIndex = items.findIndex((item) => item.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleColumnCheck = (key, checked) => {
    setTableColumns((items) =>
      items.map((col) => (col.key === key ? { ...col, checked } : col))
    );
  };

  const handleUpdateColumnProp = (key, prop, value) => {
    setTableColumns((items) =>
      items.map((col) => (col.key === key ? { ...col, [prop]: value } : col))
    );
  };

  const handleSelectAllColumns = (selectAll) => {
    setTableColumns((items) => items.map((col) => ({ ...col, checked: selectAll })));
  };

  const handleSyncNewFields = async () => {
    if (isBaseTableSource(selectedView)) {
      const defaultCols = buildDefaultColumns(schema);
      const existingKeys = new Set(tableColumns.map((c) => c.key));
      const newCols = defaultCols.filter((c) => !existingKeys.has(c.key)).map((c) => ({ ...c, checked: true }));
      if (newCols.length > 0) {
        setTableColumns([...tableColumns, ...newCols]);
      }
    } else {
      const viewCols = await fetchColumnsForView(selectedView, dbViews);
      const existingKeys = new Set(tableColumns.map((c) => c.key));
      const newCols = viewCols.filter((c) => !existingKeys.has(c.key));
      if (newCols.length > 0) {
        setTableColumns([...tableColumns, ...newCols]);
      }
    }
  };

  /* When configurator changes database view source */
  const handleSelectView = async (val) => {
    setSelectedView(val);
    if (isBaseTableSource(val)) {
      const defaultCols = buildDefaultColumns(schema);
      setTableColumns(defaultCols);
    } else {
      const viewCols = await fetchColumnsForView(val, dbViews);
      if (viewCols.length > 0) {
        // Map existing properties if user had customized label/checked/align/sortable for these view columns
        const existingMap = new Map(tableColumns.map((tc) => [tc.key, tc]));
        const mergedViewCols = viewCols.map((vc) => {
          const existing = existingMap.get(vc.key);
          return {
            ...vc,
            label: existing?.label || vc.label,
            checked: existing?.checked !== undefined ? existing.checked : true,
            sortable: existing?.sortable !== undefined ? existing.sortable : true,
            align: existing?.align || 'left',
          };
        });
        setTableColumns(mergedViewCols);
      }
    }
  };

  const handleSave = () => {
    const payload = {
      ...schema,
      enable_approval: enableApproval,
      actions,
      enable_action_tabs: enableActionTabs,
      action_tabs: actionTabs,
      table_columns: tableColumns,
      view_name: selectedView,
      view_slug: selectedView,
    };

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 36, lineHeight: 'normal' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                flexShrink: 0,
              }}
            >
              <SettingOutlined style={{ color: '#ffffff', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h4 style={{ fontWeight: 800, fontSize: 17, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                  Form Actions & Listing Columns Setup
                </h4>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '2px 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {schema?.title || schema?.name || 'Form'}
                </span>
                {selectedView && (
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.18)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: 12,
                      fontWeight: 600,
                      fontSize: 11.5,
                      padding: '2px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    View: {selectedView}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.88)', fontWeight: 500, margin: '2px 0 0 0', lineHeight: 1.3 }}>
                Configure table listing columns from Database Views, customize row action buttons, and setup filter tabs
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '4px 14px',
                borderRadius: 16,
                fontWeight: 600,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {checkedCount} / {tableColumns.length} Columns Visible
            </span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '4px 14px',
                borderRadius: 16,
                fontWeight: 600,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {actions.length} Row Actions
            </span>
          </div>
        </div>
      }
      open={!!open}
      onCancel={onClose}
      className="form-actions-modal-v2"
      width="96vw"
      style={{ top: 16, maxWidth: 1440, paddingBottom: 16 }}
      styles={{
        body: {
          height: 'calc(90vh - 100px)',
          maxHeight: 840,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 24px',
        },
      }}
      destroyOnHidden
      footer={[
        activeTab === 'actions' && (
          <Button key="add" type="dashed" icon={<PlusOutlined />} onClick={handleAddAction} style={{ borderRadius: 8, fontWeight: 600 }}>
            Add Action
          </Button>
        ),
        activeTab === 'tabs' && (
          <Button key="add_tab" type="dashed" icon={<PlusOutlined />} onClick={handleAddActionTab} style={{ borderRadius: 8, fontWeight: 600 }}>
            Add Filter Tab
          </Button>
        ),
        <Button key="cancel" onClick={onClose} style={{ borderRadius: 8 }}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          style={{
            borderRadius: 8,
            fontWeight: 700,
            padding: '0 24px',
            background: 'var(--primary-gradient, var(--primary-color, #15803d))',
            border: 'none',
            boxShadow: '0 4px 14px rgba(var(--primary-color-rgb, 21, 128, 61), 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Save & Apply Settings
        </Button>,
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        items={[
          {
            key: 'columns',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <TableOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                Admin Listing Columns
                {checkedCount > 0 && (
                  <span
                    style={{
                      background: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.12)',
                      color: 'var(--primary-color, #15803d)',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 8px',
                    }}
                  >
                    {checkedCount} Visible
                  </span>
                )}
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, flex: 1, overflow: 'hidden' }}>
                {/* View Selection & Database View Builder Link */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 16px',
                    marginBottom: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                      <DatabaseOutlined style={{ fontSize: 16, color: 'var(--primary-color, #15803d)' }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                        Database View Source:
                      </span>
                    </div>

                    <Select
                      showSearch
                      placeholder="Select Database View or Table"
                      value={selectedView || (schema?.slug ? `v_${schema.slug}` : '')}
                      onChange={handleSelectView}
                      loading={loadingViews}
                      style={{ minWidth: 280, flex: 1, maxWidth: 460, height: 38 }}
                      options={viewSelectOptions}
                    />

                    {selectedView && (
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          padding: '4px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                        Active: {selectedView}
                      </span>
                    )}
                  </div>

                  <a
                    href="/techcsr/configurator/database-views"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13,
                      color: 'var(--primary-color, #15803d)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <LinkOutlined /> Open Database Views Builder ↗
                  </a>
                </div>

                {/* Toolbar for column search & select all */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    gap: 16,
                    flexShrink: 0,
                  }}
                >
                  <Input
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="Search column keys or header labels..."
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    style={{ maxWidth: 360, borderRadius: 8, height: 38 }}
                    allowClear
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginRight: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HolderOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                      <span>Drag rows up/down to sort column order</span>
                    </div>

                    <Space>
                      <Button
                        icon={<CheckSquareOutlined />}
                        onClick={() => handleSelectAllColumns(true)}
                        style={{ borderRadius: 8, fontSize: 12.5, fontWeight: 600, height: 36 }}
                      >
                        Select All
                      </Button>
                      <Button
                        icon={<BorderOutlined />}
                        onClick={() => handleSelectAllColumns(false)}
                        style={{ borderRadius: 8, fontSize: 12.5, fontWeight: 600, height: 36 }}
                      >
                        Deselect All
                      </Button>
                      <Button
                        icon={<SyncOutlined />}
                        onClick={handleSyncNewFields}
                        style={{
                          borderRadius: 8,
                          fontSize: 12.5,
                          color: 'var(--primary-color, #15803d)',
                          borderColor: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.4)',
                          fontWeight: 700,
                          height: 36,
                          background: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.05)',
                        }}
                      >
                        Sync New Fields
                      </Button>
                    </Space>
                  </div>
                </div>

                {/* Drag & Drop Column Sortable List */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 6, margin: '4px 0' }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredColumns.map((c) => c.key)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredColumns.length === 0 ? (
                        <Empty description="No columns match your search" style={{ padding: '40px 0' }} />
                      ) : (
                        filteredColumns.map((col) => (
                          <SortableColumnItem
                            key={col.key}
                            col={col}
                            onToggleCheck={handleToggleColumnCheck}
                            onUpdateCol={handleUpdateColumnProp}
                          />
                        ))
                      )}
                    </SortableContext>
                  </DndContext>
                </div>

                {/* Live Admin Table Header Preview */}
                <div
                  style={{
                    marginTop: 8,
                    padding: '8px 14px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexShrink: 0,
                    overflowX: 'auto',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <EyeOutlined style={{ color: 'var(--primary-color, #15803d)' }} /> Live Table Preview:
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, overflowX: 'auto', paddingBottom: 2 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 11,
                        borderRadius: 6,
                        padding: '2px 8px',
                        background: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #fecdd3',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      ACTIONS
                    </span>
                    {tableColumns.filter((c) => c.checked !== false).map((c) => (
                      <span
                        key={c.key}
                        style={{
                          fontWeight: 600,
                          fontSize: 11.5,
                          borderRadius: 6,
                          padding: '2px 9px',
                          background: '#ffffff',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        {c.label || c.key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'actions',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ThunderboltOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                Row Form Actions
                {actions.length > 0 && (
                  <span
                    style={{
                      background: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.12)',
                      color: 'var(--primary-color, #15803d)',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 8px',
                    }}
                  >
                    {actions.length}
                  </span>
                )}
              </span>
            ),
            children: (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 4px' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Configure Form Actions</span>
                    <a
                      href="https://ant.design/components/icon"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: 'var(--primary-color, #15803d)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                    >
                      Open Ant Design Icons Website ↗
                    </a>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddAction}
                    style={{
                      borderRadius: 8,
                      fontWeight: 700,
                      background: 'var(--primary-gradient, var(--primary-color, #15803d))',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(var(--primary-color-rgb, 21, 128, 61), 0.25)',
                    }}
                  >
                    Add Action
                  </Button>
                </div>

                {/* Actions List */}
                {actions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', marginBottom: 12 }}>No custom row actions configured yet.</p>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddAction}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        background: 'var(--primary-gradient, var(--primary-color, #15803d))',
                        border: 'none',
                      }}
                    >
                      Add Default Actions (View & Edit)
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {actions.map((act, idx) => {
                      const IconComp = getAntdIconComponent(act.icon || 'EyeOutlined');
                      const isCondExpanded = expandedConditions[idx];

                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: 12,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {/* Row 1: Main Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {/* Display Type */}
                            <div style={{ width: 210 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                Display Type
                              </label>
                              <Select
                                value={act.type || 'OPEN_MODAL'}
                                onChange={(val) => handleUpdateAction(idx, 'type', val)}
                                style={{ width: '100%' }}
                                options={[
                                  { label: 'Open Modal (Pop-up Form)', value: 'OPEN_MODAL' },
                                  { label: 'Navigate to Full Page', value: 'PAGE' },
                                  { label: 'API Call (e.g. Delete/Approve)', value: 'API' },
                                  { label: 'Child Form Grid View', value: 'CHILD_FORM' },
                                  { label: 'Custom Modal Dialog', value: 'CUSTOM_MODAL' },
                                  { label: 'Custom Page (URL & Data Load)', value: 'CUSTOM_PAGE' },
                                ]}
                              />
                            </div>

                            {/* Action Name */}
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                Name
                              </label>
                              <Input
                                placeholder="Action Label"
                                value={act.name}
                                onChange={(e) => handleUpdateAction(idx, 'name', e.target.value)}
                                style={{ borderRadius: 6 }}
                              />
                            </div>

                            {/* Slug / Key */}
                            <div style={{ width: 110 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                Slug
                              </label>
                              <Input
                                placeholder="slug"
                                value={act.slug}
                                onChange={(e) => handleUpdateAction(idx, 'slug', e.target.value)}
                                style={{ borderRadius: 6 }}
                              />
                            </div>

                            {/* Icon Picker Button */}
                            <div style={{ width: 140 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                Icon
                              </label>
                              <Button
                                onClick={() => {
                                  setIconTargetIdx(idx);
                                  setShowIconPicker(true);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  borderRadius: 6,
                                  border: '1px solid #cbd5e1',
                                }}
                              >
                                {IconComp ? <IconComp style={{ fontSize: 14, color: '#4f46e5' }} /> : <EyeOutlined />}
                                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                                  {act.icon || 'Choose'}
                                </span>
                              </Button>
                            </div>

                            {/* Conditions Toggle Button */}
                            <div style={{ width: 130 }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                Conditions
                              </label>
                              <Button
                                onClick={() =>
                                  setExpandedConditions((prev) => ({
                                    ...prev,
                                    [idx]: !prev[idx],
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  borderRadius: 6,
                                  color: (act.conditions || []).length > 0 ? '#4f46e5' : '#64748b',
                                  borderColor: (act.conditions || []).length > 0 ? '#818cf8' : '#cbd5e1',
                                  fontWeight: 600,
                                }}
                              >
                                Conditions {(act.conditions || []).length > 0 && `(${(act.conditions || []).length})`}
                                {isCondExpanded ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
                              </Button>
                            </div>

                            {/* Delete Action Button */}
                            <div style={{ paddingTop: 20 }}>
                              <Popconfirm
                                title="Delete this action?"
                                onConfirm={() => handleDeleteAction(idx)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  style={{ borderRadius: 6, width: 36, height: 36 }}
                                />
                              </Popconfirm>
                            </div>
                          </div>

                          {/* Row 2: Target Child Form (if CHILD_FORM selected) */}
                          {act.type === 'CHILD_FORM' && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0', display: 'flex', gap: 12, alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4f46e5', marginBottom: 4 }}>
                                  Target Child Form Schema
                                </label>
                                <Select
                                  placeholder="Select Child Form"
                                  value={act.target_child_form_schema || act.child_form_slug}
                                  onChange={(val) => {
                                    handleUpdateAction(idx, 'target_child_form_schema', val);
                                    handleUpdateAction(idx, 'child_form_slug', val);
                                  }}
                                  style={{ width: '100%' }}
                                  options={allFormsList.map((f) => ({
                                    label: `${f.title || f.name} (${f.slug})`,
                                    value: f.slug,
                                  }))}
                                />
                              </div>
                            </div>
                          )}

                          {/* Row 2.5: Custom Page Configuration (if CUSTOM_PAGE selected) */}
                          {act.type === 'CUSTOM_PAGE' && (
                            <div
                              style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: '1px dashed #cbd5e1',
                                background: '#f0fdf4',
                                borderRadius: 8,
                                padding: 12,
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'center' }}>
                                {/* Custom Page URL */}
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                                    Custom Page URL
                                  </label>
                                  <Input
                                    placeholder="e.g. dd-form or /admin/custom-page/dd-form"
                                    value={act.custom_url || ''}
                                    onChange={(e) => handleUpdateAction(idx, 'custom_url', e.target.value)}
                                    style={{ borderRadius: 6 }}
                                  />
                                </div>

                                {/* Target Form Builder Schema */}
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                                    Form Builder Data to Load
                                  </label>
                                  <Select
                                    placeholder="Select Form Schema"
                                    value={act.target_form_schema || act.child_form_slug}
                                    onChange={(val) => {
                                      handleUpdateAction(idx, 'target_form_schema', val);
                                      handleUpdateAction(idx, 'child_form_slug', val);
                                    }}
                                    style={{ width: '100%' }}
                                    options={allFormsList.map((f) => ({
                                      label: `${f.title || f.name} (${f.slug})`,
                                      value: f.slug,
                                    }))}
                                  />
                                </div>

                                {/* Mode: Listing vs Details */}
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                                    Data Load Mode
                                  </label>
                                  <Select
                                    value={act.custom_page_mode || 'details'}
                                    onChange={(val) => handleUpdateAction(idx, 'custom_page_mode', val)}
                                    style={{ width: '100%' }}
                                    options={[
                                      { label: 'Details View', value: 'details' },
                                      { label: 'Listing View', value: 'listing' },
                                    ]}
                                  />
                                </div>
                              </div>

                              {/* Details-specific settings */}
                              {(act.custom_page_mode || 'details') === 'details' && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    paddingTop: 10,
                                    borderTop: '1px dashed #86efac',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 20,
                                    alignItems: 'center',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                      size="small"
                                      checked={act.always_last_row !== false}
                                      onChange={(checked) => handleUpdateAction(idx, 'always_last_row', checked)}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                                      Always Show Last Row Details (Latest Version)
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                      size="small"
                                      checked={Boolean(act.enable_approval)}
                                      onChange={(checked) => handleUpdateAction(idx, 'enable_approval', checked)}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                                      Enable Approval Workflow (Review &amp; Track)
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Row 3: Expanded Conditions */}
                          {isCondExpanded && (
                            <div
                              style={{
                                marginTop: 12,
                                paddingTop: 10,
                                borderTop: '1px dashed #cbd5e1',
                                background: '#f1f5f9',
                                borderRadius: 8,
                                padding: 10,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                                  Show Action When Conditions Match:
                                </span>
                                <Button
                                  type="dashed"
                                  size="small"
                                  icon={<PlusOutlined />}
                                  onClick={() => handleAddActionCondition(idx)}
                                  style={{ borderRadius: 6, fontSize: 11 }}
                                >
                                  Add Condition
                                </Button>
                              </div>

                              {(act.conditions || []).length === 0 ? (
                                <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0' }}>
                                  No condition rules set. Action will show on all rows unconditionally.
                                </p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {(act.conditions || []).map((cond, cIdx) => (
                                    <div key={cIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      <Select
                                        size="small"
                                        placeholder="Field"
                                        value={cond.field}
                                        onChange={(val) => handleUpdateActionCondition(idx, cIdx, 'field', val)}
                                        options={fieldOptions}
                                        style={{ width: 220 }}
                                      />
                                      <Select
                                        size="small"
                                        value={cond.operator || 'equals'}
                                        onChange={(val) => handleUpdateActionCondition(idx, cIdx, 'operator', val)}
                                        style={{ width: 140 }}
                                        options={[
                                          { label: 'Equals (=)', value: 'equals' },
                                          { label: 'Not Equals (!=)', value: 'not_equals' },
                                          { label: 'Contains', value: 'contains' },
                                          { label: 'Greater Than (>)', value: 'gt' },
                                          { label: 'Less Than (<)', value: 'lt' },
                                          { label: 'Is Not Empty', value: 'is_not_empty' },
                                          { label: 'Is Empty', value: 'is_empty' },
                                        ]}
                                      />
                                      <Input
                                        size="small"
                                        placeholder="Expected Value"
                                        value={cond.value}
                                        onChange={(e) => handleUpdateActionCondition(idx, cIdx, 'value', e.target.value)}
                                        style={{ flex: 1, borderRadius: 6 }}
                                      />
                                      <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<CloseOutlined />}
                                        onClick={() => handleDeleteActionCondition(idx, cIdx)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'tabs',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FilterOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                Filter Action Tabs
                {actionTabs.length > 0 && (
                  <span
                    style={{
                      background: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.12)',
                      color: 'var(--primary-color, #15803d)',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 8px',
                    }}
                  >
                    {actionTabs.length}
                  </span>
                )}
              </span>
            ),
            children: (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                      Status & Action Filter Tabs
                    </span>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      Add horizontal filter tabs above the table (e.g. All, Draft, Submitted, Approved)
                    </p>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddActionTab}
                    style={{
                      borderRadius: 8,
                      fontWeight: 700,
                      background: 'var(--primary-gradient, var(--primary-color, #15803d))',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(var(--primary-color-rgb, 21, 128, 61), 0.25)',
                    }}
                  >
                    Add Tab
                  </Button>
                </div>

                {/* Tabs List */}
                {actionTabs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', marginBottom: 12 }}>No filter action tabs configured.</p>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddActionTab}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        background: 'var(--primary-gradient, var(--primary-color, #15803d))',
                        border: 'none',
                      }}
                    >
                      Create First Tab
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {actionTabs.map((tabItem, tabIdx) => (
                      <div
                        key={tabIdx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 140 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                              Tab ID / Key
                            </label>
                            <Input
                              value={tabItem.id}
                              onChange={(e) => handleUpdateActionTab(tabIdx, 'id', e.target.value)}
                              placeholder="e.g. DRAFT"
                              style={{ borderRadius: 6 }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                              Tab Title Label
                            </label>
                            <Input
                              value={tabItem.title}
                              onChange={(e) => handleUpdateActionTab(tabIdx, 'title', e.target.value)}
                              placeholder="e.g. Draft Proposals"
                              style={{ borderRadius: 6 }}
                            />
                          </div>
                          <div style={{ width: 110 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                              Badge Color
                            </label>
                            <Select
                              value={tabItem.color || 'blue'}
                              onChange={(val) => handleUpdateActionTab(tabIdx, 'color', val)}
                              style={{ width: '100%' }}
                              options={[
                                { label: 'Blue', value: 'blue' },
                                { label: 'Green', value: 'green' },
                                { label: 'Gold / Orange', value: 'gold' },
                                { label: 'Red', value: 'red' },
                                { label: 'Purple', value: 'purple' },
                                { label: 'Cyan', value: 'cyan' },
                                { label: 'Gray', value: 'default' },
                              ]}
                            />
                          </div>
                          <div style={{ width: 110 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                              Match Logic
                            </label>
                            <Select
                              value={tabItem.match_type || 'ALL'}
                              onChange={(val) => handleUpdateActionTab(tabIdx, 'match_type', val)}
                              style={{ width: '100%' }}
                              options={[
                                { label: 'ALL (AND)', value: 'ALL' },
                                { label: 'ANY (OR)', value: 'ANY' },
                              ]}
                            />
                          </div>
                          <div style={{ paddingTop: 20 }}>
                            <Popconfirm
                              title="Delete this filter tab?"
                              onConfirm={() => handleDeleteActionTab(tabIdx)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button type="text" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                            </Popconfirm>
                          </div>
                        </div>

                        {/* Conditions */}
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Filter Criteria:</span>
                            <Button
                              type="dashed"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => handleAddTabCondition(tabIdx)}
                              style={{ borderRadius: 6, fontSize: 11 }}
                            >
                              Add Criterion
                            </Button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(tabItem.conditions || []).map((c, cIdx) => (
                              <div key={cIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <Select
                                  size="small"
                                  placeholder="Field"
                                  value={c.field}
                                  onChange={(val) => handleUpdateTabCondition(tabIdx, cIdx, 'field', val)}
                                  options={fieldOptions}
                                  style={{ width: 220 }}
                                />
                                <Select
                                  size="small"
                                  value={c.operator || 'equals'}
                                  onChange={(val) => handleUpdateTabCondition(tabIdx, cIdx, 'operator', val)}
                                  style={{ width: 140 }}
                                  options={[
                                    { label: 'Equals (=)', value: 'equals' },
                                    { label: 'Not Equals (!=)', value: 'not_equals' },
                                    { label: 'Contains', value: 'contains' },
                                    { label: 'Greater Than (>)', value: 'gt' },
                                    { label: 'Less Than (<)', value: 'lt' },
                                    { label: 'Is Not Empty', value: 'is_not_empty' },
                                    { label: 'Is Empty', value: 'is_empty' },
                                  ]}
                                />
                                <Input
                                  size="small"
                                  placeholder="Target Value"
                                  value={c.value}
                                  onChange={(e) => handleUpdateTabCondition(tabIdx, cIdx, 'value', e.target.value)}
                                  style={{ flex: 1, borderRadius: 6 }}
                                />
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<CloseOutlined />}
                                  onClick={() => handleDeleteTabCondition(tabIdx, cIdx)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'approval',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ApartmentOutlined style={{ color: '#4f46e5' }} />
                Approval Workflow
                {enableApproval && (
                  <span
                    style={{
                      background: 'rgba(79, 70, 229, 0.12)',
                      color: '#4f46e5',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 8px',
                    }}
                  >
                    Enabled
                  </span>
                )}
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, flex: 1, overflowY: 'auto', padding: '16px 8px' }}>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '24px 28px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '18px 22px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      gap: 24,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                        Enable Multi-Step Approval Workflow for this Form
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                        When enabled, submitted records for <strong>{schema?.title || schema?.slug}</strong> will display the Approval Stepper and reviewer sign-off panel on their detail/view pages. Approvers can Approve, Reject, or Request Changes based on the workflow steps defined in Approval Path.
                      </div>
                    </div>
                    <Switch
                      checked={enableApproval}
                      onChange={setEnableApproval}
                    />
                  </div>

                  <div
                    style={{
                      background: enableApproval ? '#eef2ff' : '#f8fafc',
                      border: `1px solid ${enableApproval ? '#c7d2fe' : '#e2e8f0'}`,
                      borderRadius: 10,
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <ApartmentOutlined style={{ fontSize: 28, color: enableApproval ? '#4f46e5' : '#94a3b8' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: enableApproval ? '#1e1b4b' : '#64748b' }}>
                          Workflow Path Definition (Trigger Form: <code style={{ color: '#4f46e5' }}>{schema?.slug}</code>)
                        </div>
                        <div style={{ fontSize: 12.5, color: enableApproval ? '#4338ca' : '#94a3b8', marginTop: 2 }}>
                          Define sequential approver roles, stage names, actions, and criteria for this form.
                        </div>
                      </div>
                    </div>
                    <a
                      href="/techcsr/admin/forms/approval-path/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#4f46e5',
                        color: '#ffffff',
                        padding: '8px 18px',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        textDecoration: 'none',
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                      }}
                    >
                      <LinkOutlined /> Open Approval Path Settings ↗
                    </a>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Ant Design Icon Picker Modal */}
      {showIconPicker && (
        <IconPickerModalV2
          open={showIconPicker}
          onClose={() => {
            setShowIconPicker(false);
            setIconTargetIdx(null);
          }}
          selectedIcon={iconTargetIdx !== null ? actions[iconTargetIdx]?.icon : ''}
          onSelect={(iconName) => {
            if (iconTargetIdx !== null) {
              handleUpdateAction(iconTargetIdx, 'icon', iconName);
            }
            setShowIconPicker(false);
            setIconTargetIdx(null);
          }}
        />
      )}
    </Modal>
  );
}
