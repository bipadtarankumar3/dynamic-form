'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Switch, Select, Button, Tag, Input, Popconfirm, Tabs, Tooltip, App } from 'antd';
import { RightOutlined, PlusOutlined, DeleteOutlined, SettingOutlined, ToolOutlined, BranchesOutlined, ThunderboltOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import FieldConfigRendererV2 from './FieldConfigRendererV2';
import SingleFlowFieldInspectorV2 from './SingleFlowFieldInspectorV2';
import IconPickerModalV2, { getAntdIconComponent } from './IconPickerModalV2';
import { privateHttpClient } from '@/services/api/httpClient';
import { dynamicMasterDetailsAPI } from '@/services/dynamicForm-service';

export default function InspectorPanelV2({
  selectedField,
  onUpdateField,
  selectedSubField,
  onUpdateSubField,
  onSelectSubField,
  onClearSubFieldSelection,
  selectedSection,
  onUpdateSection,
  formMeta,
  onUpdateFormMeta,
  allFields = [],
  allFormsList = [],
  width = 380,
  onCollapse,
}) {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('field'); // 'field' | 'section' | 'form'
  const [showIconPicker, setShowIconPicker] = useState(false);

  const [masterForms, setMasterForms] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);

  useEffect(() => {
    const fetchMasters = async () => {
      setMasterLoading(true);
      try {
        const res = await privateHttpClient.get('configurator/form-schemas/masters');
        if (res?.data?.data) {
          setMasterForms(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load master forms:', err);
      } finally {
        setMasterLoading(false);
      }
    };
    fetchMasters();
  }, []);

  const masterSelectOptions = useMemo(() => {
    const defaultOptions = [
      { value: 'state', label: 'State Master (t_state)' },
      { value: 'district', label: 'District Master (t_district)' },
      { value: 'block', label: 'Block Master (t_block)' },
      { value: 'village', label: 'Village Master (t_village)' },
      { value: 'partner', label: 'Implementation Partner Master' },
      { value: 'project', label: 'Project Master' },
    ];

    if (!masterForms || masterForms.length === 0) return defaultOptions;

    const dynamicOpts = masterForms.map((m) => ({
      value: m.slug || m.table_name || m.fsc_id,
      label: `${m.title || m.fsc_name || m.slug} (${m.table_name || 'master'})`,
    }));

    const seen = new Set();
    const merged = [];
    [...dynamicOpts, ...defaultOptions].forEach((opt) => {
      if (!seen.has(opt.value)) {
        seen.add(opt.value);
        merged.push(opt);
      }
    });

    return merged;
  }, [masterForms]);

  useEffect(() => {
    if (selectedField) {
      setActiveTab('field');
    }
  }, [selectedField?.id]);

  /* Field update helpers */
  const updateUIProp = (key, value) => {
    if (!selectedField) return;
    onUpdateField({
      ...selectedField,
      ui: {
        ...(selectedField.ui || {}),
        [key]: value,
      },
    });
  };

  const updateNested = (parent, key, value) => {
    if (!selectedField) return;
    onUpdateField({
      ...selectedField,
      [parent]: {
        ...(selectedField[parent] || {}),
        [key]: value,
      },
    });
  };

  // Helper expected by FieldConfigRenderer
  const updateFieldWrapper = (key, value) => {
    if (!selectedField) return;
    onUpdateField({
      ...selectedField,
      [key]: value,
    });
  };

  // setFields wrapper expected by field-config components (SelectFieldConfig, etc.)
  const setFieldsWrapper = (updater) => {
    if (!selectedField) return;
    const currentSectionFields = selectedSection?.fields || [selectedField];
    let newFields = [];
    if (typeof updater === 'function') {
      newFields = updater(currentSectionFields);
    } else if (Array.isArray(updater)) {
      newFields = updater;
    }
    const updatedTarget = newFields.find((f) => f.id === selectedField.id);
    if (updatedTarget) {
      onUpdateField(updatedTarget);
    }
  };

  /* Dynamic / Master / Static Options for Conditional Trigger Fields */
  const [triggerFieldOptionsMap, setTriggerFieldOptionsMap] = useState({});
  const [loadingOptionsMap, setLoadingOptionsMap] = useState({});

  const loadOptionsForTriggerField = async (fieldKey) => {
    if (!fieldKey || triggerFieldOptionsMap[fieldKey]) return;
    const f = (allFields || []).find(
      (x) => (x.db_field || x.id) === fieldKey || x.id === fieldKey || x.db_field === fieldKey
    );
    if (!f) return;

    // 1. Static options
    if (Array.isArray(f.options) && f.options.length > 0) {
      const opts = f.options.map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            label: String(opt.label || opt.name || opt.title || opt.value),
            value: String(opt.value !== undefined ? opt.value : opt.label),
          };
        }
        return { label: String(opt), value: String(opt) };
      });
      setTriggerFieldOptionsMap((prev) => ({ ...prev, [fieldKey]: opts }));
      return;
    }

    // 2. Switch / Checkbox
    if (f.type === 'switch' || f.type === 'checkbox') {
      setTriggerFieldOptionsMap((prev) => ({
        ...prev,
        [fieldKey]: [
          { label: 'Yes / True (Active)', value: 'true' },
          { label: 'No / False (Inactive)', value: 'false' },
        ],
      }));
      return;
    }

    // 3. Dynamic / Master Data Source
    const ds = f.data_source || (f.options_source === 'master' ? f : null);
    const masterName =
      ds?.name ||
      ds?.slug ||
      ds?.table_name ||
      (f.options_source === 'master' ? f.db_field : null);

    if (masterName) {
      setLoadingOptionsMap((prev) => ({ ...prev, [fieldKey]: true }));
      try {
        const res = await dynamicMasterDetailsAPI({ master: masterName });
        const rawItems = res?.data?.data || res?.data || [];
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const labelKey = ds?.label_key || 'name';
          const valKey = ds?.primary_key || ds?.value_key || 'id';
          const mapped = rawItems.map((item, idx) => ({
            label: item[labelKey] || item.name || item.title || item.label || item.fsc_name || `${f.label || 'Item'} ${idx + 1}`,
            value: String(item[valKey] ?? item.id ?? item.value ?? item[labelKey] ?? idx),
          }));
          setTriggerFieldOptionsMap((prev) => ({ ...prev, [fieldKey]: mapped }));
        }
      } catch (err) {
        // Silently catch to avoid displaying Axios 500 error toasts for unconfigured master sources
        console.warn('Could not load master options for field:', fieldKey, err?.message);
      } finally {
        setLoadingOptionsMap((prev) => ({ ...prev, [fieldKey]: false }));
      }
    }
  };

  /* Conditional Logic Rule Builder Helpers */
  const conditions = selectedField?.conditions || { match_type: 'all', rules: [] };

  const handleUpdateConditions = (newConditions) => {
    onUpdateField({
      ...selectedField,
      conditions: newConditions,
    });
  };

  const addRule = () => {
    const rules = [...(conditions.rules || [])];
    rules.push({ field: '', operator: 'equals', value: '' });
    handleUpdateConditions({ ...conditions, rules });
  };

  const removeRule = (idx) => {
    const rules = (conditions.rules || []).filter((_, i) => i !== idx);
    handleUpdateConditions({ ...conditions, rules });
  };

  const updateRule = (idx, key, val) => {
    const rules = [...(conditions.rules || [])];
    const oldField = rules[idx]?.field;
    rules[idx] = { ...rules[idx], [key]: val };
    if (key === 'field' && val && val !== oldField) {
      rules[idx].value = '';
      loadOptionsForTriggerField(val);
    }
    handleUpdateConditions({ ...conditions, rules });
  };

  /* Section Conditional Logic Rule Builder Helpers */
  const sectionConditions = selectedSection?.conditions || { match_type: 'all', rules: [] };

  const handleUpdateSectionConditions = (newConditions) => {
    if (onUpdateSection && selectedSection) {
      onUpdateSection({
        ...selectedSection,
        conditions: newConditions,
      });
    }
  };

  const addSectionRule = () => {
    const rules = [...(sectionConditions.rules || [])];
    rules.push({ field: '', operator: 'equals', value: '' });
    handleUpdateSectionConditions({ ...sectionConditions, rules });
  };

  const removeSectionRule = (idx) => {
    const rules = (sectionConditions.rules || []).filter((_, i) => i !== idx);
    handleUpdateSectionConditions({ ...sectionConditions, rules });
  };

  const updateSectionRule = (idx, key, val) => {
    const rules = [...(sectionConditions.rules || [])];
    const oldField = rules[idx]?.field;
    rules[idx] = { ...rules[idx], [key]: val };
    if (key === 'field' && val && val !== oldField) {
      rules[idx].value = '';
      loadOptionsForTriggerField(val);
    }
    handleUpdateSectionConditions({ ...sectionConditions, rules });
  };

  // Pre-load master options for existing rules
  useEffect(() => {
    const allRules = [
      ...(conditions.rules || []),
      ...(sectionConditions.rules || []),
    ];
    allRules.forEach((r) => {
      if (r?.field) {
        loadOptionsForTriggerField(r.field);
      }
    });
  }, [selectedField?.id, selectedSection?.id, allFields]);

  /* Render comparison value control (Dropdown for Select/Master, Text for others) */
  const renderRuleValueControl = (rule, onUpdate) => {
    if (['is_empty', 'is_not_empty'].includes(rule.operator)) return null;

    const fKey = rule.field;
    const targetFld = (allFields || []).find(
      (f) => (f.db_field || f.id) === fKey || f.id === fKey || f.db_field === fKey
    );
    const opts = fKey ? triggerFieldOptionsMap[fKey] : null;
    const isLoading = fKey ? loadingOptionsMap[fKey] : false;

    if (opts && opts.length > 0) {
      return (
        <Select
          size="small"
          showSearch
          allowClear
          loading={isLoading}
          style={{ width: '100%' }}
          placeholder="Select comparison value..."
          value={rule.value || undefined}
          onChange={(val) => onUpdate(val !== undefined && val !== null ? String(val) : '')}
          options={opts}
          filterOption={(input, option) =>
            String(option?.label || '').toLowerCase().includes(input.toLowerCase())
          }
        />
      );
    }

    if (targetFld?.type === 'select' && isLoading) {
      return (
        <Select
          size="small"
          loading
          disabled
          style={{ width: '100%' }}
          placeholder="Loading master options..."
        />
      );
    }

    return (
      <input
        type="text"
        className="fb-v2-input"
        style={{ padding: '4px 8px', fontSize: 12 }}
        placeholder="Comparison value (e.g. Yes, 100)"
        value={rule.value || ''}
        onChange={(e) => onUpdate(e.target.value)}
      />
    );
  };

  // Section validations
  const getSectionLabelError = () => {
    if (!selectedSection) return null;
    if (!selectedSection.section_label || !selectedSection.section_label.trim()) {
      return 'Section Label is required';
    }
    return null;
  };

  const getSectionSlugError = () => {
    if (!selectedSection) return null;
    const slug = selectedSection.slug;
    if (!slug || !slug.trim()) {
      return 'Section Slug / DB Name is required';
    }
    if (!/^[a-z_]/.test(slug)) {
      return 'Must start with a lowercase letter (a-z) or underscore';
    }
    if (!/^[a-z0-9_]+$/.test(slug)) {
      return 'Only lowercase letters, numbers, and underscores are allowed (no spaces or special chars)';
    }
    if (slug.length > 63) {
      return 'Section Slug cannot exceed 63 characters (PostgreSQL identifier limit)';
    }
    const allSections = formMeta?.sections || [];
    const isDuplicate = allSections.some(
      (s) => s.id !== selectedSection.id && s.slug && s.slug.toLowerCase() === slug.toLowerCase()
    );
    if (isDuplicate) {
      return `"${slug}" is already used by another section in this form`;
    }
    return null;
  };

  const getSubTableNameError = () => {
    if (!selectedSection || selectedSection.type !== 'add_more' || selectedSection.storage_type === 'jsonb') return null;
    const tbl = selectedSection.table_name;
    if (!tbl || !tbl.trim()) {
      return 'Sub-Table Name in Database is required';
    }
    if (!/^[a-z_]/.test(tbl)) {
      return 'Must start with a lowercase letter (a-z) or underscore';
    }
    if (!/^[a-z0-9_]+$/.test(tbl)) {
      return 'Only lowercase letters, numbers, and underscores are allowed';
    }
    if (tbl.length > 63) {
      return 'Table Name cannot exceed 63 characters (PostgreSQL identifier limit)';
    }
    return null;
  };

  const sectionLabelError = getSectionLabelError();
  const sectionSlugError = getSectionSlugError();
  const subTableNameError = getSubTableNameError();

  const formTitleError = !formMeta?.title || !formMeta.title.trim() ? 'Form Title is required' : null;
  const formSlugError = !formMeta?.slug || !formMeta.slug.trim()
    ? 'Form Slug is required'
    : !/^[a-z_]/.test(formMeta.slug)
    ? 'Must start with a lowercase letter (a-z) or underscore'
    : !/^[a-z0-9_]+$/.test(formMeta.slug)
    ? 'Only lowercase letters, numbers, and underscores are allowed'
    : null;

  /* Render Form / Section / No-Field Settings Tab */
  if (activeTab === 'form' || activeTab === 'section' || !selectedField) {
    return (
      <aside className="fb-v2-inspector" style={{ width: `${width}px`, minWidth: '260px', maxWidth: '650px' }}>
        <div className="fb-v2-inspector-tabs">
          <button
            className={`fb-v2-inspector-tab ${activeTab === 'field' ? 'active' : ''}`}
            onClick={() => setActiveTab('field')}
            disabled={!selectedField}
          >
            Field
          </button>
          <button
            className={`fb-v2-inspector-tab ${activeTab === 'section' ? 'active' : ''}`}
            onClick={() => setActiveTab('section')}
          >
            Section
          </button>
          <button
            className={`fb-v2-inspector-tab ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            Form Meta
          </button>
          {onCollapse && (
            <Tooltip title="Collapse inspector">
              <button
                type="button"
                className="fb-v2-icon-btn"
                onClick={onCollapse}
                style={{ width: 34, height: '100%', borderRadius: 0, borderLeft: '1px solid #e2e8f0' }}
              >
                <RightOutlined style={{ fontSize: 11 }} />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="fb-v2-inspector-scroll">
          {activeTab === 'section' ? (
            selectedSection ? (
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700 }}>Section Properties</h4>

              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Section Label <span style={{ color: '#ef4444' }}>*</span></span>
                  {sectionLabelError && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Required</span>}
                </label>
                <input
                  type="text"
                  className="fb-v2-input"
                  style={sectionLabelError ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
                  value={selectedSection.section_label || ''}
                  placeholder="e.g. Test Form Details"
                  onChange={(e) => {
                    const val = e.target.value;
                    const autoDb = val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                    const autoTbl = `t_${autoDb}`;
                    const currentSlug = selectedSection.slug || '';
                    const currentTbl = selectedSection.table_name || '';
                    const prevAutoDb = (selectedSection.section_label || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

                    const isSlugAuto = !currentSlug || currentSlug.startsWith('sec_') || currentSlug.startsWith('section_') || currentSlug.startsWith('general_') || currentSlug === prevAutoDb || !selectedSection._is_slug_manual;
                    const isTblAuto = !currentTbl || currentTbl.startsWith('t_sub_') || currentTbl === `t_${prevAutoDb}`;

                    onUpdateSection({
                      ...selectedSection,
                      section_label: val,
                      slug: (isSlugAuto && autoDb) ? autoDb : currentSlug,
                      table_name: (isTblAuto && autoDb) ? autoTbl : currentTbl,
                    });
                  }}
                />
                {sectionLabelError && (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExclamationCircleOutlined /> {sectionLabelError}
                  </div>
                )}
              </div>

              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Section Slug / DB Name <span style={{ color: '#ef4444' }}>*</span></span>
                  {sectionSlugError && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Required</span>}
                </label>
                <input
                  type="text"
                  className="fb-v2-input"
                  style={sectionSlugError ? { borderColor: '#ef4444', backgroundColor: '#fef2f2', fontFamily: 'monospace' } : { fontFamily: 'monospace' }}
                  value={selectedSection.slug || ''}
                  placeholder="e.g. test_form_details"
                  onChange={(e) => {
                    const formatted = e.target.value.toLowerCase().replace(/\s+/g, '_');
                    onUpdateSection({ ...selectedSection, slug: formatted, _is_slug_manual: true });
                  }}
                />
                {sectionSlugError ? (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExclamationCircleOutlined /> {sectionSlugError}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }} className="italic">
                    Lowercase letters, numbers, and underscores (e.g. <code>general_info</code>)
                  </div>
                )}
              </div>

              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label">Section Type</label>
                <Select
                  style={{ width: '100%' }}
                  value={selectedSection.type || 'general'}
                  onChange={(val) => {
                    const autoDb = (selectedSection.section_label || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
                    onUpdateSection({
                      ...selectedSection,
                      type: val,
                      table_name: selectedSection.table_name || `t_${autoDb || 'sub_table'}`,
                    });
                  }}
                  options={[
                    { value: 'general', label: 'General Section' },
                    { value: 'add_more', label: 'Add-More Table Section' },
                  ]}
                />
              </div>

              {selectedSection.type === 'add_more' && (
                <>
                  <div className="fb-v2-form-group">
                    <label className="fb-v2-form-label">Storage Type</label>
                    <Select
                      style={{ width: '100%' }}
                      value={selectedSection.storage_type || 'table'}
                      onChange={(val) => onUpdateSection({ ...selectedSection, storage_type: val })}
                      options={[
                        { value: 'table', label: 'Separate Database Table (Linked via parent_id)' },
                        { value: 'jsonb', label: 'JSONB Column in Main Table (Embedded)' },
                      ]}
                    />
                  </div>

                  <div className="fb-v2-form-group">
                    <label className="fb-v2-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Sub-Table Name in Database <span style={{ color: '#ef4444' }}>*</span></span>
                      {subTableNameError && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Required</span>}
                    </label>
                    <input
                      type="text"
                      className="fb-v2-input"
                      style={subTableNameError ? { borderColor: '#ef4444', backgroundColor: '#fef2f2', fontFamily: 'monospace' } : { fontFamily: 'monospace' }}
                      value={selectedSection.table_name || ''}
                      onChange={(e) => {
                        const formatted = e.target.value.toLowerCase().replace(/\s+/g, '_');
                        onUpdateSection({ ...selectedSection, table_name: formatted });
                      }}
                      placeholder="t_sub_table_name"
                    />
                    {subTableNameError ? (
                      <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ExclamationCircleOutlined /> {subTableNameError}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                        PostgreSQL table name (e.g. <code>t_project_members</code>)
                      </div>
                    )}
                  </div>

                  {/* Master Pre-Population / Checklist Mode */}
                  <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                          Pre-populate Rows from Master
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Show fixed default rows from a Master (e.g. Compliance Checklist)
                        </div>
                      </div>
                      <Switch
                        checked={!!(selectedSection.is_master_driven || selectedSection.context?.is_master_driven)}
                        onChange={(checked) => {
                          const updatedContext = {
                            ...(selectedSection.context || {}),
                            is_master_driven: checked,
                            master_source: checked ? (selectedSection.master_source || selectedSection.context?.master_source || 'dd_document_type') : undefined,
                            allow_add_rows: checked ? false : true,
                            allow_delete_rows: checked ? false : true,
                          };
                          onUpdateSection({
                            ...selectedSection,
                            is_master_driven: checked,
                            master_source: checked ? (selectedSection.master_source || selectedSection.context?.master_source || 'dd_document_type') : undefined,
                            allow_add_rows: checked ? false : true,
                            allow_delete_rows: checked ? false : true,
                            context: updatedContext,
                          });
                        }}
                      />
                    </div>

                    {!!(selectedSection.is_master_driven || selectedSection.context?.is_master_driven) && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label className="fb-v2-form-label" style={{ fontSize: 11 }}>Master Data Source *</label>
                          <Select
                            size="small"
                            style={{ width: '100%' }}
                            placeholder="Select Master Form"
                            value={selectedSection.master_source || selectedSection.context?.master_source || 'dd_document_type'}
                            onChange={(val) => {
                              const updatedContext = {
                                ...(selectedSection.context || {}),
                                is_master_driven: true,
                                master_source: val,
                              };
                              onUpdateSection({
                                ...selectedSection,
                                master_source: val,
                                is_master_driven: true,
                                context: updatedContext,
                              });
                            }}
                            options={masterSelectOptions}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: '#475569' }}>Allow User to Add Extra Rows</span>
                          <Switch
                            size="small"
                            checked={!!(selectedSection.allow_add_rows ?? selectedSection.context?.allow_add_rows)}
                            onChange={(checked) => {
                              const updatedContext = {
                                ...(selectedSection.context || {}),
                                allow_add_rows: checked,
                              };
                              onUpdateSection({
                                ...selectedSection,
                                allow_add_rows: checked,
                                context: updatedContext,
                              });
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: '#475569' }}>Allow User to Delete Rows</span>
                          <Switch
                            size="small"
                            checked={!!(selectedSection.allow_delete_rows ?? selectedSection.context?.allow_delete_rows)}
                            onChange={(checked) => {
                              const updatedContext = {
                                ...(selectedSection.context || {}),
                                allow_delete_rows: checked,
                              };
                              onUpdateSection({
                                ...selectedSection,
                                allow_delete_rows: checked,
                                context: updatedContext,
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Auto-Generate Fields from DB Table for Section */}
              <div style={{ marginTop: 20, padding: 12, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                    <ThunderboltOutlined style={{ marginRight: 4 }} /> Auto-Generate Fields from DB Table
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#15803d', marginBottom: 10 }}>
                  Inspect table columns in PostgreSQL and replace/populate section fields automatically.
                </div>
                <Button
                  type="primary"
                  className="conf-create-btn"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  style={{
                    background: '#16a34a',
                    borderColor: '#16a34a',
                    fontWeight: 700,
                    borderRadius: 6,
                    width: '100%',
                  }}
                  onClick={async () => {
                    const targetTable = selectedSection.table_name || selectedSection.table || formMeta?.table_name;
                    if (!targetTable) {
                      message.warning('Please enter a Database Table Name first');
                      return;
                    }
                    try {
                      const res = await privateHttpClient.get(`configurator/form-schemas/table-columns/${targetTable}`);
                      if (res?.data?.fields && res.data.fields.length > 0) {
                        onUpdateSection({
                          ...selectedSection,
                          fields: res.data.fields,
                        });
                        message.success(`Successfully auto-generated ${res.data.fields.length} fields from table "${targetTable}"!`);
                      } else {
                        message.warning(`No columns found for table "${targetTable}".`);
                      }
                    } catch (err) {
                      message.error(`Failed to inspect table "${targetTable}": ${err?.response?.data?.message || err.message}`);
                    }
                  }}
                >
                  Auto-Populate Section Fields from DB
                </Button>
              </div>

              {/* Section Conditional Visibility Logic */}
              <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      <BranchesOutlined style={{ marginRight: 6, color: 'var(--primary-color, #15803d)' }} /> Section Visibility Rules
                    </span>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Show or hide this entire section based on field values
                    </div>
                  </div>
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addSectionRule}>
                    Add Rule
                  </Button>
                </div>

                {(sectionConditions.rules || []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <Select
                      size="small"
                      style={{ width: '100%' }}
                      value={sectionConditions.match_type || 'all'}
                      onChange={(val) => handleUpdateSectionConditions({ ...sectionConditions, match_type: val })}
                      options={[
                        { value: 'all', label: 'Show section when ALL rules match (AND)' },
                        { value: 'any', label: 'Show section when ANY rule matches (OR)' },
                      ]}
                    />
                  </div>
                )}

                {(sectionConditions.rules || []).length === 0 ? (
                  <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                    No conditions set. This section is always visible.
                  </div>
                ) : (
                  (sectionConditions.rules || []).map((rule, rIdx) => (
                    <div key={rIdx} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 8, border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Rule #{rIdx + 1}</span>
                        <Popconfirm title="Delete rule?" onConfirm={() => removeSectionRule(rIdx)}>
                          <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ height: 20, width: 20, padding: 0 }} />
                        </Popconfirm>
                      </div>

                      <Select
                        size="small"
                        style={{ width: '100%', marginBottom: 6 }}
                        placeholder="Depends on field (outside this section)"
                        value={rule.field || undefined}
                        onChange={(val) => updateSectionRule(rIdx, 'field', val)}
                        showSearch
                        optionFilterProp="label"
                        options={(() => {
                          const seen = new Set();
                          const sectionFieldIds = new Set((selectedSection?.fields || []).map((x) => x.id));
                          const sectionDbFields = new Set((selectedSection?.fields || []).map((x) => x.db_field).filter(Boolean));
                          return (allFields || [])
                            .filter((f) => !sectionFieldIds.has(f.id) && !sectionDbFields.has(f.db_field))
                            .map((f) => ({
                              value: f.db_field || f.id,
                              label: `${f.label || f.db_field} (${f.db_field || f.id})`,
                            }))
                            .filter((opt) => {
                              if (!opt.value || seen.has(opt.value)) return false;
                              seen.add(opt.value);
                              return true;
                            });
                        })()}
                      />

                      <Select
                        size="small"
                        style={{ width: '100%', marginBottom: 6 }}
                        value={rule.operator || 'equals'}
                        onChange={(val) => updateSectionRule(rIdx, 'operator', val)}
                        options={[
                          { value: 'equals', label: 'Equals (=)' },
                          { value: 'not_equals', label: 'Not Equals (!=)' },
                          { value: 'contains', label: 'Contains' },
                          { value: 'not_contains', label: 'Does Not Contain' },
                          { value: 'is_empty', label: 'Is Empty' },
                          { value: 'is_not_empty', label: 'Is Not Empty' },
                          { value: 'greater_than', label: 'Greater Than (>)' },
                          { value: 'less_than', label: 'Less Than (<)' },
                          { value: 'greater_than_or_equal', label: 'Greater Than Or Equal (>=)' },
                          { value: 'less_than_or_equal', label: 'Less Than Or Equal (<=)' },
                        ]}
                      />

                      {renderRuleValueControl(rule, (newVal) => updateSectionRule(rIdx, 'value', newVal))}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 13 }}>
              Please select a section from the canvas to edit its properties.
            </div>
          )) : (
            <div>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700 }}>Form Meta Properties</h4>

              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Form Title <span style={{ color: '#ef4444' }}>*</span></span>
                  {formTitleError && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Required</span>}
                </label>
                <input
                  type="text"
                  className="fb-v2-input"
                  style={formTitleError ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
                  value={formMeta.title || ''}
                  placeholder="Enter Form Title"
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    if (formMeta.is_draft) {
                      const autoSlug = newTitle.toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
                      onUpdateFormMeta({
                        title: newTitle,
                        slug: autoSlug,
                        table_name: `t_frm_${autoSlug}`,
                      });
                    } else {
                      onUpdateFormMeta({ title: newTitle });
                    }
                  }}
                />
                {formTitleError && (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExclamationCircleOutlined /> {formTitleError}
                  </div>
                )}
              </div>

              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Form Slug <span style={{ color: '#ef4444' }}>*</span></span>
                  {formSlugError && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Required</span>}
                </label>
                <input
                  type="text"
                  className="fb-v2-input"
                  value={formMeta.slug || ''}
                  disabled={!formMeta.is_draft}
                  placeholder="e.g. quarterly_progress_report"
                  style={{
                    background: !formMeta.is_draft ? '#f1f5f9' : (formSlugError ? '#fef2f2' : undefined),
                    borderColor: formSlugError ? '#ef4444' : undefined,
                    color: !formMeta.is_draft ? '#64748b' : undefined,
                    cursor: !formMeta.is_draft ? 'not-allowed' : undefined,
                    fontFamily: 'monospace',
                  }}
                  onChange={(e) => {
                    const newSlug = e.target.value.toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_');
                    onUpdateFormMeta({
                      slug: newSlug,
                      table_name: `t_frm_${newSlug}`,
                    });
                  }}
                />
                {formSlugError ? (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExclamationCircleOutlined /> {formSlugError}
                  </div>
                ) : !formMeta.is_draft ? (
                  <span style={{ fontSize: 11, color: '#64748b' }} className="italic">Form slug is locked once published.</span>
                ) : (
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                    Unique identifier for PostgreSQL tables and routing
                  </div>
                )}
              </div>

              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label">Database Table Name</label>
                <input
                  type="text"
                  className="fb-v2-input"
                  value={formMeta.table_name || ''}
                  disabled={!formMeta.is_draft}
                  style={{
                    background: !formMeta.is_draft ? '#f1f5f9' : undefined,
                    color: !formMeta.is_draft ? '#64748b' : undefined,
                    cursor: !formMeta.is_draft ? 'not-allowed' : undefined,
                  }}
                  onChange={(e) => onUpdateFormMeta({ table_name: e.target.value })}
                />
                {!formMeta.is_draft && (
                  <span style={{ fontSize: 11, color: '#64748b' }} className="italic">Physical table is provisioned and locked in PostgreSQL.</span>
                )}
              </div>

              {/* Auto-Generate Fields from DB Table for Form */}
              <div style={{ margin: '14px 0', padding: 12, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                    <ThunderboltOutlined style={{ marginRight: 4 }} /> Auto-Generate Fields from DB Table
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#15803d', marginBottom: 8 }}>
                  Populate form canvas directly from columns of "{formMeta.table_name || 'table'}".
                </div>
                <Button 
                className="conf-create-btn"
                  type="primary"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  style={{
                    background: '#16a34a',
                    borderColor: '#16a34a',
                    fontWeight: 700,
                    borderRadius: 6,
                    width: '100%',
                  }}
                  onClick={async () => {
                    const targetTable = formMeta?.table_name;
                    if (!targetTable) {
                      message.warning('Please specify a Database Table Name first');
                      return;
                    }
                    try {
                      const res = await privateHttpClient.get(`configurator/form-schemas/table-columns/${targetTable}`);
                      if (res?.data?.fields && res.data.fields.length > 0) {
                        const updatedSections = [...(formMeta.sections || [])];
                        if (updatedSections.length === 0) {
                          updatedSections.push({
                            id: `sec_${Date.now()}`,
                            section_label: `${formMeta.title || 'Form'} Details`,
                            slug: `${formMeta.slug || 'general'}_details`,
                            type: 'general',
                            table_name: targetTable,
                            fields: res.data.fields,
                          });
                        } else {
                          updatedSections[0] = {
                            ...updatedSections[0],
                            fields: res.data.fields,
                          };
                        }
                        onUpdateFormMeta({ sections: updatedSections });
                        message.success(`Successfully auto-generated ${res.data.fields.length} fields from table "${targetTable}"!`);
                      } else {
                        message.warning(`No columns found for table "${targetTable}".`);
                      }
                    } catch (err) {
                      message.error(`Failed to inspect table "${targetTable}": ${err?.response?.data?.message || err.message}`);
                    }
                  }}
                >
                 Auto-Populate Form Fields from DB
                </Button>
              </div>

              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label">Parent Form Schema</label>
                <Select
                  showSearch
                  allowClear
                  placeholder="Search and Select Parent Form"
                  style={{ width: '100%' }}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase()) ||
                    String(option?.value || '').toLowerCase().includes(input.toLowerCase())
                  }
                  value={
                    formMeta.parent_form_id !== undefined && formMeta.parent_form_id !== null && formMeta.parent_form_id !== ''
                      ? String(formMeta.parent_form_id)
                      : undefined
                  }
                  onChange={async (val) => {
                    const parentFormId = val ? String(val) : null;
                    onUpdateFormMeta({ parent_form_id: parentFormId });

                    // Auto create column and sync FOREIGN KEY on backend
                    const formId = formMeta?.id || formMeta?.form_id;
                    const slug = formMeta?.slug;
                    const tableName = formMeta?.table_name || (slug ? `t_frm_${slug}` : null);

                    if (formId || slug || tableName) {
                      try {
                        const res = await privateHttpClient.post('configurator/form-schemas/sync-parent-foreign-key', {
                          form_id: formId,
                          slug,
                          table_name: tableName,
                          parent_form_id: parentFormId,
                        });
                        if (res?.data?.success) {
                          if (parentFormId) {
                            message.success(res.data.message || 'Parent form selected. Column parent_id & Foreign Key constraint updated.');
                          } else {
                            message.info('Parent form unlinked and Foreign Key constraint removed.');
                          }
                        }
                      } catch (err) {
                        console.warn('Error syncing parent foreign key:', err);
                      }
                    }
                  }}
                  options={(allFormsList || [])
                    .filter((f) => String(f.form_id || f.id) !== String(formMeta.id || formMeta.form_id))
                    .map((f) => ({
                      value: String(f.form_id || f.id),
                      label: `${f.title || f.name || f.slug} (${f.slug || 'form'})`,
                    }))}
                />
              </div>

              <div className="fb-v2-switch-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Is Master Form</div>
                  <div style={{ fontSize: 11, color: '#64748b' }} className="italic">Reusable global lookup schema</div>
                </div>
                <Switch
                  checked={formMeta.is_master || false}
                  onChange={(val) => onUpdateFormMeta({ is_master: val })}
                />
              </div>

              <div className="fb-v2-switch-row" style={{ marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Is Editable</div>
                  <div style={{ fontSize: 11, color: '#64748b' }} className="italic">Allow entry updates in list view</div>
                </div>
                <Switch
                  checked={formMeta.is_editable || false}
                  onChange={(val) => onUpdateFormMeta({ is_editable: val })}
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  /* Sub-Field Column Inspector View */
  if (selectedSubField && onUpdateSubField) {
    return (
      <aside className="fb-v2-inspector" style={{ width: `${width}px`, minWidth: '260px', maxWidth: '650px' }}>
        <div className="fb-v2-inspector-tabs">
          <button className="fb-v2-inspector-tab active">
            Column Settings
          </button>
          <button className="fb-v2-inspector-tab" onClick={onClearSubFieldSelection}>
            ← Back to Table
          </button>
          {onCollapse && (
            <Tooltip title="Collapse inspector">
              <button
                type="button"
                className="fb-v2-icon-btn"
                onClick={onCollapse}
                style={{ width: 34, height: '100%', borderRadius: 0, borderLeft: '1px solid #e2e8f0' }}
              >
                <RightOutlined style={{ fontSize: 11 }} />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="fb-v2-inspector-scroll">
          <div style={{ background: '#eef2ff', padding: '10px 14px', borderRadius: 10, border: '1px solid #c7d2fe', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', textTransform: 'uppercase' }}>
                Table Column Inspector
              </span>
              <Button
                size="small"
                type="link"
                onClick={onClearSubFieldSelection}
                style={{ padding: 0, height: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--primary-color, #15803d)' }}
              >
                Done
              </Button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b', marginTop: 2 }}>
              {selectedSubField.label || 'Sub-Column'}
            </div>
          </div>

          <FieldConfigRendererV2
            field={selectedSubField}
            onUpdateField={onUpdateSubField}
            onUpdateFieldProp={(k, v) => onUpdateSubField({ ...selectedSubField, [k]: v })}
            setFields={(updater) => {
              if (typeof updater === 'function') {
                const currentCols = selectedField?.fields || [];
                const updated = updater(currentCols);
                const found = updated.find((c) => c.id === selectedSubField.id);
                if (found) onUpdateSubField(found);
              }
            }}
            allFields={allFields}
            masterSelectOptions={masterSelectOptions}
            masterLoading={masterLoading}
          />
        </div>
      </aside>
    );
  }

  /* Single Field Inspector View */
  return (
    <aside className="fb-v2-inspector" style={{ width: `${width}px`, minWidth: '260px', maxWidth: '650px' }}>
      <div className="fb-v2-inspector-tabs">
        <button
          className={`fb-v2-inspector-tab ${activeTab === 'field' ? 'active' : ''}`}
          onClick={() => setActiveTab('field')}
        >
          Field
        </button>
        <button
          className={`fb-v2-inspector-tab ${activeTab === 'section' ? 'active' : ''}`}
          onClick={() => setActiveTab('section')}
        >
          Section
        </button>
        <button
          className={`fb-v2-inspector-tab ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          Form Meta
        </button>
        {onCollapse && (
          <Tooltip title="Collapse inspector">
            <button
              type="button"
              className="fb-v2-icon-btn"
              onClick={onCollapse}
              style={{ width: 34, height: '100%', borderRadius: 0, borderLeft: '1px solid #e2e8f0' }}
            >
              <RightOutlined style={{ fontSize: 11 }} />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="fb-v2-inspector-scroll">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
            {selectedField.label || 'Field Properties'}
          </h4>
          <Tag color="blue">{selectedField.type || 'text'}</Tag>
        </div>

        {selectedField.type === 'add_more' ? (
          <div>
            <div className="fb-v2-form-group">
              <label className="fb-v2-form-label">Table Title / Label *</label>
              <input
                type="text"
                className="fb-v2-input"
                value={selectedField.label || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const autoDb = val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                  const autoTbl = `t_${autoDb}`;
                  const currentDb = selectedField.db_field || '';
                  const currentTbl = selectedField.table_name || '';
                  const prevAutoDb = (selectedField.label || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

                  const isDbAuto = !currentDb || currentDb.startsWith('add_more_') || currentDb.startsWith('tbl_') || currentDb.startsWith('fld_') || currentDb === prevAutoDb;
                  const isTblAuto = !currentTbl || currentTbl.startsWith('t_add_more_') || currentTbl.startsWith('t_sub_') || currentTbl === `t_${prevAutoDb}`;

                  onUpdateField({
                    ...selectedField,
                    label: val,
                    db_field: (isDbAuto && autoDb) ? autoDb : currentDb,
                    table_name: (isTblAuto && autoDb) ? autoTbl : currentTbl,
                  });
                }}
              />
            </div>

            <div className="fb-v2-form-group">
              <label className="fb-v2-form-label">Database Field Name *</label>
              <input
                type="text"
                className="fb-v2-input"
                value={selectedField.db_field || ''}
                onChange={(e) => updateFieldWrapper('db_field', e.target.value)}
              />
            </div>

            <div className="fb-v2-form-group">
              <label className="fb-v2-form-label">Storage Type</label>
              <Select
                style={{ width: '100%' }}
                value={selectedField.storage_type || 'table'}
                onChange={(val) => updateFieldWrapper('storage_type', val)}
                options={[
                  { value: 'table', label: 'Separate Database Table (Linked via parent_id)' },
                  { value: 'jsonb', label: 'JSONB Column in Main Table (Embedded)' },
                ]}
              />
            </div>

            {selectedField.storage_type === 'table' && (
              <div className="fb-v2-form-group">
                <label className="fb-v2-form-label">Sub-Table Name in Database *</label>
                <input
                  type="text"
                  className="fb-v2-input"
                  value={selectedField.table_name || ''}
                  onChange={(e) => updateFieldWrapper('table_name', e.target.value)}
                  placeholder="t_sub_table_name"
                />
              </div>
            )}

            {/* Sub Columns List for Add More */}
            <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Table Columns</span>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    const currentCols = selectedField.fields || [];
                    const colNum = currentCols.length + 1;
                    const newCol = {
                      id: `sub_${Date.now()}_${colNum}`,
                      type: 'text',
                      label: `Column ${colNum}`,
                      db_field: `col_${colNum}`,
                      required: false,
                      ui: { placeholder: `Enter Column ${colNum}` },
                    };
                    onUpdateField({ ...selectedField, fields: [...currentCols, newCol] });
                  }}
                  style={{ borderRadius: 6, fontSize: 11, fontWeight: 700 }}
                >
                  + Add Column
                </Button>
              </div>

              {(selectedField.fields || []).map((col, cIdx) => (
                <div key={col.id || cIdx} style={{ background: '#ffffff', padding: 10, borderRadius: 8, marginBottom: 8, border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Column #{cIdx + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Button
                        size="small"
                        type="dashed"
                        icon={<SettingOutlined />}
                        onClick={() => {
                          if (onSelectSubField) {
                            onSelectSubField(col.id);
                          }
                        }}
                        style={{ borderRadius: 6, fontSize: 10, fontWeight: 600, color: '#6366f1', borderColor: '#c7d2fe', height: 22, padding: '0 6px' }}
                      >
                        Validation & Rules
                      </Button>
                      <Button
                        size="small"
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          const updatedCols = (selectedField.fields || []).filter((_, i) => i !== cIdx);
                          onUpdateField({ ...selectedField, fields: updatedCols });
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 2 }}>Label</label>
                      <input
                        className="fb-v2-input"
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        value={col.label || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const autoDb = val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                          const currentDb = col.db_field || '';
                          const prevAutoDb = (col.label || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                          const isDefaultOrDerived = !currentDb || currentDb.startsWith('col_') || currentDb.startsWith('fld_') || /^[a-z]+_\d+$/.test(currentDb) || currentDb === prevAutoDb;

                          const cols = [...(selectedField.fields || [])];
                          cols[cIdx] = {
                            ...cols[cIdx],
                            label: val,
                            db_field: (isDefaultOrDerived && autoDb) ? autoDb : currentDb,
                          };
                          onUpdateField({ ...selectedField, fields: cols });
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 2 }}>Type</label>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={col.type || 'text'}
                        onChange={(val) => {
                          const cols = [...(selectedField.fields || [])];
                          cols[cIdx] = { ...cols[cIdx], type: val };
                          onUpdateField({ ...selectedField, fields: cols });
                        }}
                        options={[
                          { value: 'text', label: 'Text' },
                          { value: 'number', label: 'Number' },
                          { value: 'select', label: 'Dropdown' },
                          { value: 'date', label: 'Date' },
                          { value: 'file', label: 'File' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <SingleFlowFieldInspectorV2
            field={selectedField}
            onUpdateField={onUpdateField}
            allFields={allFields}
          />
        )}

        {/* Conditional Logic Rules Editor */}
        <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              <BranchesOutlined /> Conditional Visibility Logic
            </span>
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addRule}>
              Add Rule
            </Button>
          </div>

          {(conditions.rules || []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <Select
                size="small"
                value={conditions.match_type || 'all'}
                onChange={(val) => handleUpdateConditions({ ...conditions, match_type: val })}
                options={[
                  { value: 'all', label: 'Match ALL rules' },
                  { value: 'any', label: 'Match ANY rule' },
                ]}
              />
            </div>
          )}

          {(conditions.rules || []).map((rule, rIdx) => (
            <div key={rIdx} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Rule #{rIdx + 1}</span>
                <Popconfirm title="Delete rule?" onConfirm={() => removeRule(rIdx)}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ height: 20 }} />
                </Popconfirm>
              </div>

              <Select
                size="small"
                style={{ width: '100%', marginBottom: 6 }}
                placeholder="Depends on field"
                value={rule.field || undefined}
                onChange={(val) => updateRule(rIdx, 'field', val)}
                showSearch
                optionFilterProp="label"
                options={(() => {
                  const seen = new Set();
                  return (allFields || [])
                    .filter((f) => f.id !== selectedField.id)
                    .map((f) => ({ value: f.db_field || f.id, label: `${f.label || f.db_field} (${f.db_field || f.id})` }))
                    .filter((opt) => {
                      if (!opt.value || seen.has(opt.value)) return false;
                      seen.add(opt.value);
                      return true;
                    });
                })()}
              />

              <Select
                size="small"
                style={{ width: '100%', marginBottom: 6 }}
                value={rule.operator || 'equals'}
                onChange={(val) => updateRule(rIdx, 'operator', val)}
                options={[
                  { value: 'equals', label: 'Equals (=)' },
                  { value: 'not_equals', label: 'Not Equals (!=)' },
                  { value: 'contains', label: 'Contains' },
                  { value: 'not_contains', label: 'Does Not Contain' },
                  { value: 'is_empty', label: 'Is Empty' },
                  { value: 'is_not_empty', label: 'Is Not Empty' },
                  { value: 'greater_than', label: 'Greater Than (>)' },
                  { value: 'less_than', label: 'Less Than (<)' },
                  { value: 'greater_than_or_equal', label: 'Greater Than Or Equal (>=)' },
                  { value: 'less_than_or_equal', label: 'Less Than Or Equal (<=)' },
                ]}
              />

              {renderRuleValueControl(rule, (newVal) => updateRule(rIdx, 'value', newVal))}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
