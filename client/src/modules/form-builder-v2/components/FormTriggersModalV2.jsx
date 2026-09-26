'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Card,
  Button,
  Tag,
  Switch,
  Input,
  Select,
  Checkbox,
  Space,
  Popconfirm,
  Tooltip,
  Divider,
  Badge,
  App,
  Empty,
  Row,
  Col,
  InputNumber,
} from 'antd';
import {
  ThunderboltOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
  SaveOutlined,
  EyeOutlined,
  CheckOutlined,
  TableOutlined,
  KeyOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { privateHttpClient } from '@/services/api/httpClient';
import '../styles/form-builder-v2.css';
import TriggerFlowVisualizer from './TriggerFlowVisualizer';

const normalizeActionTerms = (act) => {
  if (Array.isArray(act.terms) && act.terms.length > 0) {
    return act.terms;
  }
  const mode = (act.action_type || 'sum_rollup').toLowerCase();
  const sourceCol = Array.isArray(act.source_amount_field)
    ? act.source_amount_field[0]
    : (act.source_amount_field || 'amount');

  if (mode === 'recalculate_balance' || mode === 'subtract_from_total') {
    return [
      { source_type: 'target_column', field: act.target_total_field || 'total_amount' },
      { operator: '-', source_type: 'child_field', method: 'sum', field: sourceCol || 'amount' },
    ];
  }
  return [
    { source_type: 'child_field', method: mode === 'count' ? 'count' : 'sum', field: sourceCol || 'amount' },
  ];
};

const formatTermsFormula = (terms) => {
  if (!Array.isArray(terms) || terms.length === 0) return '';
  return terms.map((t, idx) => {
    const op = idx === 0 ? '' : ` ${t.operator || '+'} `;
    if (t.source_type === 'target_column') {
      return `${op}Target.${t.field || 'field'}`;
    }
    if (t.source_type === 'constant') {
      return `${op}${t.constant_value || 0}`;
    }
    const m = (t.method || 'sum').toLowerCase();
    if (m === 'value' || m === 'none') {
      return `${op}${t.field || 'field'}`;
    }
    return `${op}${m.toUpperCase()}(${t.field || 'field'})`;
  }).join('');
};

export default function FormTriggersModalV2({
  open,
  onClose,
  schema,
  onSave,
  allFormsList = [],
}) {
  const { message } = App.useApp();
  const [triggers, setTriggers] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [tablesList, setTablesList] = useState([]);
  const [tableColumnsMap, setTableColumnsMap] = useState({});
  const [currentTableColumns, setCurrentTableColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingTriggerId, setViewingTriggerId] = useState(null);

  useEffect(() => {
    if (open && schema) {
      setTriggers(Array.isArray(schema.triggers) ? schema.triggers : []);
    }
  }, [open, schema]);

  // Load all available DB tables
  useEffect(() => {
    if (!open) return;
    const curTbl = schema?.table_name || (schema?.slug ? `t_frm_${schema.slug}` : '');
    const fetchTables = async () => {
      try {
        const res = await privateHttpClient.get('configurator/form-schemas/all-tables');
        const items = res?.data?.data || [];
        const tableNames = items.map((t) => (typeof t === 'string' ? t : t.table_name || t.value || t.label)).filter(Boolean);
        const combined = Array.from(new Set([curTbl, ...tableNames].filter(Boolean)));
        if (combined.length > 0) {
          setTablesList(combined);
          return;
        }
      } catch (err) {
        console.warn('Failed to load tables list from all-tables:', err);
      }
      const fallback = (allFormsList || [])
        .map((f) => f.table_name || `t_frm_${f.slug}`)
        .filter(Boolean);
      setTablesList(Array.from(new Set([curTbl, ...fallback].filter(Boolean))));
    };
    fetchTables();
  }, [open, schema, allFormsList]);

  // Fetch columns for any given table from PostgreSQL
  const fetchColumnsForTable = async (tableName) => {
    if (!tableName || !tableName.trim()) return [];
    const key = tableName.trim().toLowerCase();
    if (tableColumnsMap[key]?.length > 0) return tableColumnsMap[key];

    try {
      setLoadingColumns(true);
      const res = await privateHttpClient.get(`configurator/form-schemas/table-columns/${encodeURIComponent(tableName.trim())}`);
      let cols = [];
      if (res?.data?.columns && Array.isArray(res.data.columns)) {
        cols = res.data.columns.map((c) => (typeof c === 'string' ? c : c.column_name)).filter(Boolean);
      } else if (res?.data?.fields && Array.isArray(res.data.fields)) {
        cols = res.data.fields.map((f) => f.db_field || f.column_name).filter(Boolean);
      }
      if (cols.length > 0) {
        setTableColumnsMap((prev) => ({
          ...prev,
          [key]: cols,
        }));
        return cols;
      }
    } catch (err) {
      console.warn(`Failed to fetch columns for table ${tableName}:`, err);
    } finally {
      setLoadingColumns(false);
    }
    return [];
  };

  // Fetch ALL columns and fields of the CURRENT form
  useEffect(() => {
    if (!open || !schema) return;
    const currentTable = schema.table_name || `t_frm_${schema.slug}`;

    const fetchCurrentFields = async () => {
      const fieldSet = new Set(['id', 'parent_id']);

      // 1. Try fetching directly from physical PostgreSQL table columns
      if (currentTable) {
        try {
          const res = await privateHttpClient.get(`configurator/form-schemas/table-columns/${encodeURIComponent(currentTable)}`);
          if (res?.data?.columns && Array.isArray(res.data.columns)) {
            res.data.columns.forEach((c) => {
              const col = typeof c === 'string' ? c : c.column_name;
              if (col) fieldSet.add(col);
            });
          }
          if (res?.data?.fields && Array.isArray(res.data.fields)) {
            res.data.fields.forEach((f) => {
              const col = f.db_field || f.column_name;
              if (col) fieldSet.add(col);
            });
          }
        } catch (e) {
          console.warn('Could not inspect table columns for current table:', currentTable, e);
        }
      }

      // 2. Also inspect schema sections and fields
      let sections = schema.sections;
      if (!Array.isArray(sections) || sections.length === 0) {
        const schemaId = schema.id || schema.form_id || schema.slug;
        if (schemaId) {
          try {
            const sRes = await privateHttpClient.get(`configurator/form-schemas/${schemaId}`);
            sections = sRes?.data?.data?.sections || sRes?.data?.sections;
          } catch { }
        }
      }

      if (Array.isArray(sections)) {
        sections.forEach((sec) => {
          const fList = Array.isArray(sec.fields) ? sec.fields : [];
          fList.forEach((f) => {
            const col = f.db_field || f.column_name || f.slug;
            if (col) fieldSet.add(col);
          });
        });
      }

      setCurrentTableColumns(Array.from(fieldSet));
    };

    fetchCurrentFields();
  }, [open, schema]);

  const currentFormColumns = useMemo(() => {
    const cols = currentTableColumns.length > 0
      ? currentTableColumns
      : ['id', 'parent_id'];
    return cols.map((c) => ({ label: c, value: c }));
  }, [currentTableColumns]);

  const currentTargetColumns = useMemo(() => {
    if (!editingTrigger?.target_table) return [];
    const key = editingTrigger.target_table.trim().toLowerCase();
    const raw = tableColumnsMap[key] || [];
    const withId = raw.includes('id') ? raw : ['id', ...raw];
    return withId.map((col) => ({ label: col, value: col }));
  }, [editingTrigger?.target_table, tableColumnsMap]);

  // Ensure target table columns are always loaded when edit modal is active
  useEffect(() => {
    if (isEditModalOpen && editingTrigger?.target_table) {
      fetchColumnsForTable(editingTrigger.target_table);
    }
  }, [isEditModalOpen, editingTrigger?.target_table]);

  const handleOpenEditModal = (triggerToEdit = null) => {
    if (triggerToEdit) {
      const cloned = JSON.parse(JSON.stringify(triggerToEdit));
      if (Array.isArray(cloned.actions)) {
        cloned.actions = cloned.actions.map((act) => ({
          ...act,
          terms: normalizeActionTerms(act),
        }));
      }
      setEditingTrigger(cloned);
      if (cloned.target_table) {
        fetchColumnsForTable(cloned.target_table);
      }
    } else {
      const defaultTarget = tablesList[0] || '';
      setEditingTrigger({
        id: `trg_${Date.now()}`,
        name: `Rollup Calculation ${triggers.length + 1}`,
        description: '',
        is_active: true,
        events: ['insert', 'update', 'delete'],
        update_fields: [],
        target_table: defaultTarget,
        target_pk: 'id',
        source_fk_field: 'parent_id',
        actions: [
          {
            id: `act_${Date.now()}`,
            target_column: '',
            terms: [
              {
                source_type: 'child_field',
                method: 'sum',
                field: currentFormColumns[0]?.value || 'amount',
              },
            ],
          },
        ],
      });
      if (defaultTarget) {
        fetchColumnsForTable(defaultTarget);
      }
    }
    setIsEditModalOpen(true);
  };

  const handleSaveTriggerInModal = async () => {
    if (!editingTrigger) return;
    if (!editingTrigger.name?.trim()) {
      message.error('Please provide a trigger rule name.');
      return;
    }
    if (!editingTrigger.target_table) {
      message.error('Please select a Target Table.');
      return;
    }
    if (!editingTrigger.source_fk_field) {
      message.error('Please select a Foreign Key Linking Field.');
      return;
    }

    const cleanedActions = (editingTrigger.actions || []).map((act) => {
      const terms = Array.isArray(act.terms) && act.terms.length > 0
        ? act.terms
        : normalizeActionTerms(act);
      return {
        ...act,
        terms,
      };
    });

    const triggerToSave = {
      ...editingTrigger,
      actions: cleanedActions,
    };

    let updatedList;
    const exists = triggers.some((t) => t.id === triggerToSave.id);
    if (exists) {
      updatedList = triggers.map((t) => (t.id === triggerToSave.id ? triggerToSave : t));
    } else {
      updatedList = [...triggers, triggerToSave];
    }

    setTriggers(updatedList);
    setIsEditModalOpen(false);
    setEditingTrigger(null);

    // Persist immediately
    try {
      setSaving(true);
      await onSave(updatedList);
      message.success('Trigger saved and applied to PostgreSQL successfully!');
    } catch {
      message.error('Failed to sync trigger with database.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTrigger = async (id, enabled) => {
    const updated = triggers.map((t) => (t.id === id ? { ...t, enabled } : t));
    setTriggers(updated);
    try {
      setSaving(true);
      await onSave(updated);
      message.success(`Trigger ${enabled ? 'activated' : 'deactivated'} successfully!`);
    } catch {
      message.error('Failed to update trigger status.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrigger = async (id) => {
    const updated = triggers.filter((t) => t.id !== id);
    setTriggers(updated);
    try {
      setSaving(true);
      await onSave(updated);
      message.success('Trigger deleted and removed from PostgreSQL successfully!');
    } catch {
      message.error('Failed to delete trigger.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      closeIcon={null}
      title={null}
      className="fb-v2-fullscreen-modal"
      width="100vw"
      style={{ top: 0, left: 0, margin: 0, padding: 0, maxWidth: '100vw', height: '100vh' }}
      styles={{
        body: { padding: 0, height: '100vh', overflow: 'hidden' },
        content: { padding: 0, borderRadius: 0, height: '100vh', overflow: 'hidden' },
      }}
    >
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <header className="fb-v2-header">
          <div className="fb-v2-header-left">
            <button
              type="button"
              className="fb-v2-back-btn"
              onClick={onClose}
              title="Back to Forms"
            >
              <ArrowLeftOutlined />
            </button>
            <div>
              <h1 className="fb-v2-form-title">
                {schema?.title || schema?.name || 'Untitled Form'}
                <Tag
                  color={schema?.is_draft ? 'warning' : 'success'}
                  style={{ borderRadius: 12, padding: '0 10px', fontSize: 11, fontWeight: 700 }}
                >
                  {schema?.is_draft ? 'DRAFT' : 'PUBLISHED'}
                </Tag>
              </h1>
            </div>
          </div>

          <div className="fb-v2-header-actions">
            <button
              type="button"
              className="fb-v2-btn fb-v2-btn-primary"
              onClick={() => handleOpenEditModal()}
            >
              <PlusOutlined /> Add New Trigger
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Hero Banner Card */}
            <div
              style={{
                width: '100%',
                background: 'var(--primary-gradient, var(--primary-color, #15803d))',
                borderRadius: 16,
                padding: '26px 32px',
                color: '#ffffff',
                boxShadow: '0 12px 28px -6px rgba(var(--primary-color-rgb, 21, 128, 61), 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <ThunderboltOutlined style={{ fontSize: 24, color: '#fde047' }} />
                  <h2 style={{ fontSize: 21, fontWeight: 700, margin: 0, color: '#ffffff', letterSpacing: '-0.3px' }}>
                    Real-Time Database Calculation Triggers
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#e0e7ff', maxWidth: 850, lineHeight: 1.55 }}>
                  Automatically calculate and update parent table columns (e.g. update <code>remaining_amount</code>, <code>total_paid</code>, <code>item_count</code>) in PostgreSQL whenever rows are inserted, updated, or deleted.
                </p>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => handleOpenEditModal()}
                style={{
                  background: '#ffffff',
                  color: '#4f46e5',
                  borderColor: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 10,
                  height: 44,
                  padding: '0 24px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                }}
              >
                Add Trigger
              </Button>
            </div>

            {/* List of Triggers */}
            {triggers.length === 0 ? (
              <Card
                style={{
                  borderRadius: 14,
                  textAlign: 'center',
                  padding: '48px 24px',
                  background: '#ffffff',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#334155', marginBottom: 4 }}>
                        No Cross-Table Triggers Configured
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', maxWidth: 500, margin: '0 auto 18px' }}>
                        Add a database trigger to link this form to a parent entity (like Projects) for automatic balance recalculations and rollups.
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenEditModal()}
                        style={{ borderRadius: 8, height: 38, fontWeight: 600 }}
                      >
                        Create Your First Trigger
                      </Button>
                    </div>
                  }
                />
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {triggers.map((trg, idx) => (
                  <Card
                    key={trg.id || idx}
                    hoverable
                    style={{
                      width: '100%',
                      borderRadius: 14,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: '#ffffff',
                    }}
                    styles={{ body: { padding: '20px 24px' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      {/* Left: Info with side icon badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                        <div className="trg-icon-badge">
                          <ThunderboltOutlined />
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{trg.name}</span>
                            <Tag color={trg.enabled ? 'success' : 'default'} style={{ borderRadius: 10, fontWeight: 600 }}>
                              {trg.enabled ? 'Active' : 'Disabled'}
                            </Tag>
                            {(trg.events || []).map((ev) => {
                              if (ev === 'update' && (trg.watch_update_fields || []).length > 0) {
                                return (
                                  <Tag key={ev} color="purple" style={{ borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                                    UPDATE OF: {trg.watch_update_fields.join(', ')}
                                  </Tag>
                                );
                              }
                              return (
                                <Tag key={ev} color="geekblue" style={{ borderRadius: 4, textTransform: 'uppercase', fontSize: 10 }}>
                                  ON {ev === 'create' ? 'INSERT' : ev}
                                </Tag>
                              );
                            })}
                          </div>

                          {/* Relationship Pill */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '4px 12px',
                              background: '#f1f5f9',
                              borderRadius: 6,
                              fontSize: 12,
                              color: '#334155',
                              marginBottom: 12,
                            }}
                          >
                            <DatabaseOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                            <span>
                              Target Table: <strong>{trg.target_table}</strong>
                            </span>
                            <span style={{ color: '#94a3b8' }}>•</span>
                            <LinkOutlined style={{ color: '#0284c7' }} />
                            <span>
                              Linked via: <code>{schema?.table_name || `t_frm_${schema?.slug}`}.{trg.source_fk_field}</code> ➔ <code>{trg.target_table}.{trg.target_pk || 'id'}</code>
                            </span>
                          </div>

                          {/* Action Rollups Badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {(trg.actions || []).map((act, aIdx) => {
                              const terms = normalizeActionTerms(act);
                              const equation = formatTermsFormula(terms);
                              return (
                                <Tag
                                  key={act.id || aIdx}
                                  icon={<CalculatorOutlined style={{ color: '#16a34a' }} />}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: 6,
                                    background: '#f0fdf4',
                                    borderColor: '#bbf7d0',
                                    color: '#15803d',
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  Update <code style={{ color: '#b91c1c' }}>{act.target_field}</code> = {equation}
                                </Tag>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
                        <Switch
                          checked={trg.enabled}
                          onChange={(checked) => handleToggleTrigger(trg.id, checked)}
                          style={{
                            background: trg.enabled ? 'var(--primary-color, #15803d)' : undefined,
                          }}
                        />
                        <Button
                          className={viewingTriggerId === (trg.id || idx) ? "trg-action-btn trg-action-btn-active" : "trg-action-btn"}
                          icon={<EyeOutlined />}
                          onClick={() => setViewingTriggerId(viewingTriggerId === (trg.id || idx) ? null : (trg.id || idx))}
                        >
                          {viewingTriggerId === (trg.id || idx) ? 'Hide Flow' : 'View Flow'}
                        </Button>
                        <Button
                          className="trg-action-btn"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEditModal(trg)}
                        >
                          Edit
                        </Button>
                        <Popconfirm
                          title="Delete Trigger"
                          description="Are you sure you want to delete this trigger automation?"
                          onConfirm={() => handleDeleteTrigger(trg.id)}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Delete Rule">
                            <Button className="trg-delete-btn" icon={<DeleteOutlined />} />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </div>

                    {/* Expanded Trigger Flow Visualizer for this specific trigger */}
                    {viewingTriggerId === (trg.id || idx) && (
                      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ThunderboltOutlined style={{ color: '#f59e0b' }} />
                            Live Execution Flow for &ldquo;{trg.name || `Rule #${idx + 1}`}&rdquo;
                          </span>
                          <Button
                            size="small"
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => setViewingTriggerId(null)}
                            style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}
                          >
                            Close View
                          </Button>
                        </div>
                        <TriggerFlowVisualizer triggers={[trg]} schema={schema} />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inner Add/Edit Trigger Rule Modal */}
      {isEditModalOpen && editingTrigger && (
        <Modal
          open={isEditModalOpen}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingTrigger(null);
          }}
          className="fb-v2-fullscreen-modal"
          width="100vw"
          style={{ top: 0, left: 0, margin: 0, padding: 0, maxWidth: '100vw', height: '100vh' }}
          styles={{
            body: { padding: 0, height: '100vh', overflow: 'hidden' },
            content: { padding: 0, borderRadius: 0, height: '100vh', overflow: 'hidden' },
          }}
          footer={null}
          destroyOnHidden
          closeIcon={null}
          title={null}
        >
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            <header className="fb-v2-header">
              <div className="fb-v2-header-left">
                <button
                  type="button"
                  className="fb-v2-back-btn"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTrigger(null);
                  }}
                  title="Back to Triggers"
                >
                  <ArrowLeftOutlined />
                </button>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--primary-color, #15803d)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <ThunderboltOutlined style={{ fontSize: 11 }} /> Form Automation / Trigger Engine
                  </div>
                  <h1 className="fb-v2-form-title">
                    {schema?.title || schema?.name || 'Untitled Form'}
                    <Tag
                      color={schema?.is_draft ? 'warning' : 'success'}
                      style={{ borderRadius: 12, padding: '0 10px', fontSize: 11, fontWeight: 700 }}
                    >
                      {schema?.is_draft ? 'DRAFT' : 'PUBLISHED'}
                    </Tag>
                    <span style={{ color: '#cbd5e1', fontWeight: 300, margin: '0 4px' }}>/</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                      {editingTrigger.name || 'New Trigger Rule'}
                    </span>
                  </h1>
                </div>
              </div>

              <div className="fb-v2-header-actions">
                <div className="trg-active-status-pill">
                  <div className={`trg-status-dot ${editingTrigger.enabled ? 'active' : ''}`} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: editingTrigger.enabled ? '#15803d' : '#64748b' }}>
                    {editingTrigger.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <Switch
                    size="small"
                    checked={editingTrigger.enabled}
                    onChange={(checked) => setEditingTrigger({ ...editingTrigger, enabled: checked })}
                  />
                </div>
                <button
                  type="button"
                  className="fb-v2-btn fb-v2-btn-secondary"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTrigger(null);
                  }}
                >
                  <CloseOutlined /> Cancel
                </button>
                <button
                  type="button"
                  className="fb-v2-btn fb-v2-btn-primary"
                  onClick={handleSaveTriggerInModal}
                  disabled={saving}
                >
                  <SaveOutlined /> Save & Apply Trigger
                </button>
              </div>
            </header>            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              <div className="trg-edit-container">
                {/* Top Rule Settings Card */}
                <div className="trg-edit-card">
                  <Row gutter={24} align="middle">
                    <Col span={14}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <EditOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                        <span>Trigger Rule Name <span style={{ color: '#ef4444' }}>*</span></span>
                      </label>
                      <Input
                        size="large"
                        value={editingTrigger.name}
                        onChange={(e) => setEditingTrigger({ ...editingTrigger, name: e.target.value })}
                        placeholder="e.g. Sync Project Payment with Budget"
                        style={{ borderRadius: 9, fontSize: 14, height: 42 }}
                      />
                    </Col>

                    <Col span={10}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <ThunderboltOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                        <span>Trigger Execution Events <span style={{ color: '#ef4444' }}>*</span></span>
                      </label>
                      <div className="trg-events-pill-group">
                        {[
                          { key: 'insert', label: 'On Insert' },
                          { key: 'update', label: 'On Update' },
                          { key: 'delete', label: 'On Delete' },
                        ].map((ev) => {
                          const currentEvents = (editingTrigger.events || ['insert', 'update', 'delete']).map((e) => e === 'create' ? 'insert' : e);
                          const isSelected = currentEvents.includes(ev.key);
                          return (
                            <div
                              key={ev.key}
                              className={`trg-event-pill ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                let nextEvents;
                                if (isSelected) {
                                  if (currentEvents.length <= 1) {
                                    message.warning('Trigger must listen to at least one event.');
                                    return;
                                  }
                                  nextEvents = currentEvents.filter((e) => e !== ev.key);
                                } else {
                                  nextEvents = [...currentEvents, ev.key];
                                }
                                setEditingTrigger({ ...editingTrigger, events: nextEvents });
                              }}
                            >
                              <span className="trg-pill-dot" />
                              <span>{ev.label}</span>
                              {isSelected && <CheckOutlined style={{ fontSize: 11, color: 'var(--primary-color, #15803d)', marginLeft: 2 }} />}
                            </div>
                          );
                        })}
                      </div>
                    </Col>
                  </Row>

                  {/* Conditional Field Update Filter */}
                  {(editingTrigger.events || []).some((e) => e === 'update') && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>Update Trigger Condition: Fire only when specific field(s) update</span>
                          <Tooltip title="In PostgreSQL, this generates 'AFTER UPDATE OF col1, col2'. The trigger only fires when at least one of these columns is modified.">
                            <InfoCircleOutlined style={{ color: '#6366f1' }} />
                          </Tooltip>
                        </label>
                        <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
                          {(editingTrigger.watch_update_fields || []).length === 0 ? 'Fires on ANY field update' : `Fires only when selected fields change (${(editingTrigger.watch_update_fields || []).length})`}
                        </span>
                      </div>
                      <Select
                        mode="multiple"
                        size="middle"
                        style={{ width: '100%' }}
                        placeholder="Leave empty to fire on any field update, or select watched field(s) like amount, status, tax..."
                        value={editingTrigger.watch_update_fields || []}
                        onChange={(vals) => setEditingTrigger({ ...editingTrigger, watch_update_fields: vals })}
                        options={currentFormColumns}
                        allowClear
                      />
                    </div>
                  )}
                </div>

                {/* 1. Entity Relationship Mapping */}
                <div className="trg-edit-card">
                  <div className="trg-section-header">
                    <div className="trg-section-title-wrap">
                      <div className="trg-step-badge">01</div>
                      <div>
                        <h3 className="trg-section-title">
                          <DatabaseOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                          Entity Relationship Mapping
                        </h3>
                        <div className="trg-section-subtitle">
                          Connects present form records with the target table via relational foreign key
                        </div>
                      </div>
                    </div>

                    <Button
                      size="small"
                      type="dashed"
                      icon={<ThunderboltOutlined style={{ color: 'var(--primary-color, #15803d)' }} />}
                      onClick={() => {
                        const activeTbl = editingTrigger.source_table || schema?.table_name || `t_frm_${schema?.slug}` || '';
                        setEditingTrigger({
                          ...editingTrigger,
                          source_table: activeTbl,
                          source_fk_field: 'id',
                          target_table: activeTbl,
                          target_pk: 'id',
                        });
                        if (activeTbl) fetchColumnsForTable(activeTbl);
                      }}
                      style={{ borderRadius: 8, color: 'var(--primary-color, #15803d)', borderColor: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.35)', fontWeight: 600, fontSize: 12, height: 32 }}
                    >
                      Set Same Table (Self-Automation: id = id)
                    </Button>
                  </div>

                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={6}>
                      <div className="trg-pipeline-col">
                        <label>
                          <TableOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                          <span>Present / Source Table <span style={{ color: '#ef4444' }}>*</span></span>
                        </label>
                        <Select
                          showSearch
                          size="middle"
                          placeholder="Choose present table..."
                          value={editingTrigger.source_table || schema?.table_name || `t_frm_${schema?.slug}`}
                          onChange={(val) => {
                            setEditingTrigger({ ...editingTrigger, source_table: val });
                            fetchColumnsForTable(val);
                          }}
                          style={{ width: '100%' }}
                          options={tablesList.map((t) => ({ label: t, value: t }))}
                        />
                      </div>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <div className="trg-pipeline-col">
                        <label>
                          <KeyOutlined style={{ color: '#0284c7' }} />
                          <span>Present Linking Field (FK) <span style={{ color: '#ef4444' }}>*</span></span>
                        </label>
                        <Select
                          showSearch
                          size="middle"
                          placeholder="e.g. parent_id, id"
                          value={editingTrigger.source_fk_field || undefined}
                          onChange={(val) => setEditingTrigger({ ...editingTrigger, source_fk_field: val })}
                          style={{ width: '100%' }}
                          options={currentFormColumns}
                        />
                      </div>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <div className="trg-pipeline-col">
                        <label>
                          <TableOutlined style={{ color: '#6366f1' }} />
                          <span>Target Table to Update <span style={{ color: '#ef4444' }}>*</span></span>
                        </label>
                        <Select
                          showSearch
                          size="middle"
                          placeholder="Choose target table..."
                          value={editingTrigger.target_table || undefined}
                          onChange={(val) => {
                            setEditingTrigger({ ...editingTrigger, target_table: val, target_pk: 'id' });
                            fetchColumnsForTable(val);
                          }}
                          style={{ width: '100%' }}
                          options={tablesList.map((t) => ({ label: t, value: t }))}
                        />
                      </div>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <div className="trg-pipeline-col">
                        <label>
                          <KeyOutlined style={{ color: '#8b5cf6' }} />
                          <span>Target Primary Key ID <span style={{ color: '#ef4444' }}>*</span></span>
                        </label>
                        <Select
                          showSearch
                          size="middle"
                          placeholder="id"
                          loading={loadingColumns}
                          value={editingTrigger.target_pk || 'id'}
                          onChange={(val) => setEditingTrigger({ ...editingTrigger, target_pk: val })}
                          style={{ width: '100%' }}
                          options={currentTargetColumns.length > 0 ? currentTargetColumns : [{ label: 'id', value: 'id' }]}
                        />
                      </div>
                    </Col>
                  </Row>

                  {/* Relationship Live Diagram Bar */}
                  {editingTrigger.target_table && editingTrigger.source_fk_field && (
                    <div className="trg-relation-bar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <LinkOutlined style={{ color: 'var(--primary-color, #15803d)', fontSize: 14 }} />
                          <span>Relationship Pipeline:</span>
                        </span>
                        <span className="trg-relation-chip trg-relation-chip-primary">
                          {(editingTrigger.source_table || schema?.table_name || `t_frm_${schema?.slug}`)}.{editingTrigger.source_fk_field}
                        </span>
                        <ArrowRightOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
                        <span className="trg-relation-chip trg-relation-chip-secondary">
                          {editingTrigger.target_table}.{editingTrigger.target_pk || 'id'}
                        </span>
                      </div>

                      {(editingTrigger.target_table === (editingTrigger.source_table || schema?.table_name || `t_frm_${schema?.slug}`)) ? (
                        <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 6, padding: '3px 10px' }}>
                          ⚡ Same-Table Automation Active
                        </Tag>
                      ) : (
                        <Tag color="success" style={{ margin: 0, fontWeight: 600, borderRadius: 6, padding: '3px 10px' }}>
                          ✓ Relational Foreign Key Connected
                        </Tag>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Target Table Updates & Calculation Formulas */}
                <div className="trg-edit-card">
                  <div className="trg-section-header">
                    <div className="trg-section-title-wrap">
                      <div className="trg-step-badge">02</div>
                      <div>
                        <h3 className="trg-section-title">
                          <CalculatorOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                          Target Table Updates & Calculation Formulas
                        </h3>
                        <div className="trg-section-subtitle">
                          Build custom mathematical formulas across fields to calculate and update target table columns
                        </div>
                      </div>
                    </div>

                    <Button
                      size="middle"
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const newActions = [...(editingTrigger.actions || [])];
                        newActions.push({
                          id: `act_${Date.now()}`,
                          target_field: '',
                          terms: [
                            { source_type: 'child_field', method: 'sum', field: currentFormColumns[0]?.value || 'amount' },
                          ],
                          conditions: [],
                        });
                        setEditingTrigger({ ...editingTrigger, actions: newActions });
                      }}
                      style={{ color: 'var(--primary-color, #15803d)', borderColor: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.35)', fontWeight: 600, borderRadius: 8 }}
                    >
                      Update Another Target Column
                    </Button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {(editingTrigger.actions || []).map((act, actIdx) => {
                      const currentTerms = Array.isArray(act.terms) && act.terms.length > 0
                        ? act.terms
                        : normalizeActionTerms(act);
                      const equation = formatTermsFormula(currentTerms);

                      const updateTerm = (tIdx, termUpdates) => {
                        const nextActions = [...editingTrigger.actions];
                        const nextTerms = [...currentTerms];
                        nextTerms[tIdx] = { ...nextTerms[tIdx], ...termUpdates };
                        nextActions[actIdx] = { ...act, terms: nextTerms };
                        setEditingTrigger({ ...editingTrigger, actions: nextActions });
                      };

                      const addTerm = () => {
                        const nextActions = [...editingTrigger.actions];
                        const nextTerms = [
                          ...currentTerms,
                          {
                            operator: '+',
                            source_type: 'child_field',
                            method: 'sum',
                            field: currentFormColumns[0]?.value || 'amount',
                          },
                        ];
                        nextActions[actIdx] = { ...act, terms: nextTerms };
                        setEditingTrigger({ ...editingTrigger, actions: nextActions });
                      };

                      const removeTerm = (tIdx) => {
                        if (currentTerms.length <= 1) {
                          message.warning('At least one calculation term is required.');
                          return;
                        }
                        const nextActions = [...editingTrigger.actions];
                        const nextTerms = currentTerms.filter((_, i) => i !== tIdx);
                        nextActions[actIdx] = { ...act, terms: nextTerms };
                        setEditingTrigger({ ...editingTrigger, actions: nextActions });
                      };

                      return (
                        <div key={act.id || actIdx} className="trg-action-block">
                          {/* Target Column Selection Bar */}
                          <div className="trg-target-select-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                                Target Column to Update:
                              </span>
                              <Select
                                showSearch
                                size="large"
                                placeholder="Select column in target table (e.g. remaining_amount)..."
                                value={act.target_field || undefined}
                                onChange={(val) => {
                                  const nextActions = [...editingTrigger.actions];
                                  nextActions[actIdx] = { ...act, target_field: val };
                                  setEditingTrigger({ ...editingTrigger, actions: nextActions });
                                }}
                                style={{ minWidth: 280, flex: 1, maxWidth: 520 }}
                                options={currentTargetColumns}
                              />
                            </div>

                            {editingTrigger.actions.length > 1 && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  const nextActions = editingTrigger.actions.filter((_, i) => i !== actIdx);
                                  setEditingTrigger({ ...editingTrigger, actions: nextActions });
                                }}
                                style={{ fontWeight: 600 }}
                              >
                                Remove Column Action
                              </Button>
                            )}
                          </div>

                          {/* Formula Terms Builder */}
                          <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CalculatorOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                                <span>Calculation Terms & Operations</span>
                              </span>
                              {act.target_field && (
                                <div className="trg-formula-badge">
                                  <span className="trg-formula-fx">fx</span>
                                  <span>{act.target_field} =</span>
                                  <span className="trg-formula-code">{equation || '0'}</span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {currentTerms.map((term, tIdx) => (
                                <div key={tIdx} className="trg-term-row">
                                  {tIdx > 0 ? (
                                    <Select
                                      size="middle"
                                      value={term.operator || '+'}
                                      onChange={(op) => updateTerm(tIdx, { operator: op })}
                                      style={{ width: 110, flexShrink: 0 }}
                                      options={[
                                        { label: '+ Add', value: '+' },
                                        { label: '- Subtract', value: '-' },
                                        { label: '× Multiply', value: '*' },
                                        { label: '÷ Divide', value: '/' },
                                      ]}
                                    />
                                  ) : (
                                    <div className="trg-start-pill">
                                      START =
                                    </div>
                                  )}

                                  <Select
                                    size="middle"
                                    value={term.source_type || 'target_column'}
                                    onChange={(st) => updateTerm(tIdx, { source_type: st, field: st === 'target_column' ? currentTargetColumns[0]?.value : currentFormColumns[0]?.value })}
                                    style={{ width: 190, flexShrink: 0 }}
                                    options={[
                                      { label: 'Target Table Column', value: 'target_column' },
                                      { label: 'Current Form Field', value: 'child_field' },
                                      { label: 'Fixed Value (Number)', value: 'constant' },
                                    ]}
                                  />

                                  {term.source_type === 'child_field' && (
                                    <Select
                                      size="middle"
                                      value={term.method || 'sum'}
                                      onChange={(m) => updateTerm(tIdx, { method: m })}
                                      style={{ width: 160, flexShrink: 0 }}
                                      options={[
                                        { label: 'Field Value (Direct)', value: 'value' },
                                        { label: 'SUM (All)', value: 'sum' },
                                        { label: 'COUNT', value: 'count' },
                                        { label: 'AVERAGE', value: 'avg' },
                                        { label: 'MIN', value: 'min' },
                                        { label: 'MAX', value: 'max' },
                                      ]}
                                    />
                                  )}

                                  {term.source_type === 'child_field' && (
                                    <Select
                                      showSearch
                                      size="middle"
                                      placeholder="Choose column..."
                                      value={term.field || undefined}
                                      onChange={(f) => updateTerm(tIdx, { field: f })}
                                      style={{ flex: 1 }}
                                      options={currentFormColumns}
                                    />
                                  )}

                                  {term.source_type === 'target_column' && (
                                    <Select
                                      showSearch
                                      size="middle"
                                      placeholder="Choose target column..."
                                      value={term.field || undefined}
                                      onChange={(f) => updateTerm(tIdx, { field: f })}
                                      style={{ flex: 1 }}
                                      options={currentTargetColumns}
                                    />
                                  )}

                                  {term.source_type === 'constant' && (
                                    <InputNumber
                                      size="middle"
                                      placeholder="0"
                                      value={term.constant_value || 0}
                                      onChange={(val) => updateTerm(tIdx, { constant_value: val })}
                                      style={{ flex: 1 }}
                                    />
                                  )}

                                  {currentTerms.length > 1 && (
                                    <Tooltip title="Remove this term">
                                      <Button
                                        type="text"
                                        size="middle"
                                        danger
                                        icon={<CloseCircleOutlined style={{ fontSize: 18 }} />}
                                        onClick={() => removeTerm(tIdx)}
                                        style={{ flexShrink: 0 }}
                                      />
                                    </Tooltip>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div style={{ marginTop: 14 }}>
                              <Button
                                type="dashed"
                                size="middle"
                                icon={<PlusOutlined />}
                                onClick={addTerm}
                                style={{ color: 'var(--primary-color, #15803d)', borderColor: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.35)', fontWeight: 600, borderRadius: 8 }}
                              >
                                Add Field / Operation
                              </Button>
                            </div>
                          </div>

                          {/* Action Filter Conditions (WHERE clause) */}
                          <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FilterOutlined style={{ color: '#6366f1' }} />
                                <span>Calculation Filter Conditions (WHERE Clause)</span>
                                <Tooltip title="Only records matching these conditions will be calculated into the target table column.">
                                  <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                                </Tooltip>
                              </span>
                              <Button
                                size="small"
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  const nextActs = [...editingTrigger.actions];
                                  const curConds = Array.isArray(act.conditions) ? act.conditions : [];
                                  nextActs[actIdx] = {
                                    ...act,
                                    conditions: [...curConds, { field: currentFormColumns[0]?.value || 'status', operator: '=', value: '' }],
                                  };
                                  setEditingTrigger({ ...editingTrigger, actions: nextActs });
                                }}
                                style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary-color, #15803d)', borderColor: 'rgba(var(--primary-color-rgb, 21, 128, 61), 0.35)', borderRadius: 6 }}
                              >
                                Add Filter Condition
                              </Button>
                            </div>

                            {(!act.conditions || act.conditions.length === 0) ? (
                              <div style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FilterOutlined style={{ color: '#cbd5e1' }} />
                                <span>No filter conditions set. All records matching the foreign key will be calculated.</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {(act.conditions || []).map((cond, cIdx) => (
                                  <div
                                    key={cIdx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: '8px 12px',
                                      background: '#f8fafc',
                                      borderRadius: 8,
                                      border: '1px solid #e2e8f0',
                                      width: '100%',
                                    }}
                                  >
                                    <Select
                                      size="middle"
                                      placeholder="Field..."
                                      value={cond.field}
                                      onChange={(f) => {
                                        const nextActs = [...editingTrigger.actions];
                                        const curConds = [...(act.conditions || [])];
                                        curConds[cIdx] = { ...cond, field: f };
                                        nextActs[actIdx] = { ...act, conditions: curConds };
                                        setEditingTrigger({ ...editingTrigger, actions: nextActs });
                                      }}
                                      options={currentFormColumns}
                                      style={{ flex: 1 }}
                                    />
                                    <Select
                                      size="middle"
                                      value={cond.operator || '='}
                                      onChange={(op) => {
                                        const nextActs = [...editingTrigger.actions];
                                        const curConds = [...(act.conditions || [])];
                                        curConds[cIdx] = { ...cond, operator: op };
                                        nextActs[actIdx] = { ...act, conditions: curConds };
                                        setEditingTrigger({ ...editingTrigger, actions: nextActs });
                                      }}
                                      options={[
                                        { label: '= (Equals)', value: '=' },
                                        { label: '!= (Not Equals)', value: '!=' },
                                        { label: '> (Greater Than)', value: '>' },
                                        { label: '< (Less Than)', value: '<' },
                                        { label: '>= (Greater or Equal)', value: '>=' },
                                        { label: '<= (Less or Equal)', value: '<=' },
                                        { label: 'IS NOT NULL', value: 'IS NOT NULL' },
                                        { label: 'IS NULL', value: 'IS NULL' },
                                      ]}
                                      style={{ width: 180, flexShrink: 0 }}
                                    />
                                    {cond.operator !== 'IS NULL' && cond.operator !== 'IS NOT NULL' && (
                                      <Input
                                        size="middle"
                                        placeholder="Value (e.g. approved)"
                                        value={cond.value || ''}
                                        onChange={(e) => {
                                          const nextActs = [...editingTrigger.actions];
                                          const curConds = [...(act.conditions || [])];
                                          curConds[cIdx] = { ...cond, value: e.target.value };
                                          nextActs[actIdx] = { ...act, conditions: curConds };
                                          setEditingTrigger({ ...editingTrigger, actions: nextActs });
                                        }}
                                        style={{ flex: 1 }}
                                      />
                                    )}
                                    <Button
                                      type="text"
                                      danger
                                      size="middle"
                                      icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                                      onClick={() => {
                                        const nextActs = [...editingTrigger.actions];
                                        const curConds = (act.conditions || []).filter((_, i) => i !== cIdx);
                                        nextActs[actIdx] = { ...act, conditions: curConds };
                                        setEditingTrigger({ ...editingTrigger, actions: nextActs });
                                      }}
                                      style={{ flexShrink: 0 }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </Modal>
      )}
    </Modal>
  );
}
