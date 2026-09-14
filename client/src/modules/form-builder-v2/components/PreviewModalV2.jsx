'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Tag, Table, Input, Select, DatePicker, Space, Tooltip, Upload, Switch, Row, Col } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  LockOutlined,
  UploadOutlined,
  PaperClipOutlined,
  ExclamationCircleOutlined,
  BranchesOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  MailOutlined,
  GlobalOutlined,
  BankOutlined,
  IdcardOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { dynamicMasterDetailsAPI } from '@/services/dynamicForm-service';
import { evaluateConditions } from '@/modules/dynamic-form-v2/helper/runTimeCondition.helper';
import { evaluateRowCalculations } from '@/modules/dynamic-form-v2/add-edit/add-more-section/helper/calculation.helper';

function PreviewSelectField({ fld, val, onChange, style, formState = {}, onFieldValueChange }) {
  const [masterOptions, setMasterOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [internalValue, setInternalValue] = useState(val || undefined);

  // Compute parent dependency values at component top level
  const dbFieldKey = (fld?.db_field || '').toLowerCase();
  const isDistrictField = dbFieldKey.includes('district') || (fld?.label || '').toLowerCase().includes('district');
  
  let parentDbField =
    fld?.dependency?.parent_db_field ||
    fld?.dependency?.parent ||
    fld?.dependency?.parent_field ||
    fld?.parent_db_field ||
    fld?.dependency?.parent_field_source ||
    fld?.dependency?.parent_master_source;

  if (!parentDbField && isDistrictField) {
    const stateKey = Object.keys(formState || {}).find((k) => k.toLowerCase().includes('state'));
    parentDbField = stateKey || 'state';
  }

  let parentValue = null;
  if (parentDbField) {
    parentValue =
      formState[parentDbField] ||
      formState[`${parentDbField}_id`] ||
      formState[parentDbField.replace(/_id$/, '')];
  }
  if (!parentValue && isDistrictField) {
    parentValue = formState.state || formState.state_id || formState.col_2 || formState.col_1;
  }

  useEffect(() => {
    setInternalValue(val || undefined);
  }, [val]);

  const handleChange = (selectedVal, optionObj) => {
    setInternalValue(selectedVal);
    if (onChange) {
      onChange({ target: { value: selectedVal } });
    }
    if (onFieldValueChange && fld?.db_field) {
      onFieldValueChange(fld.db_field, selectedVal, optionObj);
    }
  };

  useEffect(() => {
    const ds = fld.data_source || (fld.options_source === 'master' ? fld : null);
    const staticOpts = fld.options || [];

    // If field depends on a parent (like District depends on State) and parent is not chosen yet
    if (parentDbField && !parentValue) {
      setMasterOptions((prev) => (prev.length === 0 ? prev : []));
      setInternalValue((prev) => (prev === undefined ? prev : undefined));
      return;
    }

    // Static options
    if (Array.isArray(staticOpts) && staticOpts.length > 0) {
      setMasterOptions(staticOpts);
      return;
    }

    const masterName = ds?.name || ds?.slug || ds?.table_name || (fld.options_source === 'master' ? fld.db_field : null) || fld.db_field;

    if (masterName) {
      setLoading(true);

      const filters = {};
      if (parentDbField && parentValue) {
        let targetFilterKey = ds?.filters
          ? (Array.isArray(ds.filters) ? ds.filters[0] : Object.keys(ds.filters)[0])
          : null;

        if (!targetFilterKey) {
          const mLower = String(masterName).toLowerCase();
          if (mLower.includes('district')) {
            targetFilterKey = 'state_id';
          } else if (mLower.includes('block')) {
            targetFilterKey = 'district_id';
          } else if (mLower.includes('village')) {
            targetFilterKey = 'block_id';
          } else {
            targetFilterKey = parentDbField.endsWith('_id') ? parentDbField : `${parentDbField}_id`;
          }
        }
        filters[targetFilterKey] = parentValue;
      }

      dynamicMasterDetailsAPI({ master: masterName, filters })
        .then((res) => {
          const rawItems = res?.data?.data || res?.data || [];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const labelKey = ds?.label_key || 'name';
            const valKey = ds?.primary_key || ds?.value_key || 'id';
            const mapped = rawItems.map((item, idx) => ({
              label: item[labelKey] || item.name || item.title || item.label || item.fsc_name || `${fld.label || 'Master'} Item ${idx + 1}`,
              value: item[valKey] || item.id || item.value || idx,
            }));
            setMasterOptions(mapped);
          } else {
            // Preset district lists for State selection in preview simulator
            if (isDistrictField && parentValue) {
              const districtPresets = {
                'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur'],
                'West Bengal': ['Kolkata', 'Purulia', 'Howrah', 'Darjeeling', 'Murshidabad', 'Nadia', 'Hooghly'],
                'Karnataka': ['Bengaluru Urban', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Udupi'],
                'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'South Delhi'],
                'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar'],
                'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
              };

              const pValStr = String(parentValue).toLowerCase();
              let matchedStateKey = Object.keys(districtPresets).find(k => pValStr.includes(k.toLowerCase()));
              let list = matchedStateKey ? districtPresets[matchedStateKey] : [
                `District 1 (${parentValue})`,
                `District 2 (${parentValue})`,
                `District 3 (${parentValue})`,
              ];

              setMasterOptions(list.map((dName) => ({ label: dName, value: dName })));
            } else {
              setMasterOptions([
                { label: `${fld.label || 'Master'} Option 1`, value: 'opt_1' },
                { label: `${fld.label || 'Master'} Option 2`, value: 'opt_2' },
                { label: `${fld.label || 'Master'} Option 3`, value: 'opt_3' },
              ]);
            }
          }
        })
        .catch(() => {
          if (isDistrictField && parentValue) {
            setMasterOptions([
              { label: 'Purulia', value: 'Purulia' },
              { label: 'Kolkata', value: 'Kolkata' },
              { label: 'Howrah', value: 'Howrah' },
              { label: 'Darjeeling', value: 'Darjeeling' },
            ]);
          } else {
            setMasterOptions([
              { label: `${fld.label || 'Master'} Option 1`, value: 'opt_1' },
              { label: `${fld.label || 'Master'} Option 2`, value: 'opt_2' },
              { label: `${fld.label || 'Master'} Option 3`, value: 'opt_3' },
            ]);
          }
        })
        .finally(() => setLoading(false));
    } else {
      if (isDistrictField && parentValue) {
        setMasterOptions([
          { label: 'Purulia', value: 'Purulia' },
          { label: 'Kolkata', value: 'Kolkata' },
          { label: 'Howrah', value: 'Howrah' },
          { label: 'Darjeeling', value: 'Darjeeling' },
        ]);
      } else {
        setMasterOptions([
          { label: 'Maharashtra', value: 'Maharashtra' },
          { label: 'West Bengal', value: 'West Bengal' },
          { label: 'Karnataka', value: 'Karnataka' },
          { label: 'Gujarat', value: 'Gujarat' },
          { label: 'Tamil Nadu', value: 'Tamil Nadu' },
        ]);
      }
    }
  }, [fld?.id, fld?.db_field, fld?.options_source, parentValue]);

  return (
    <Select
      showSearch
      allowClear
      loading={loading}
      style={{ width: '100%', borderRadius: 8, ...style }}
      placeholder={
        loading
          ? 'Loading...'
          : fld.ui?.placeholder || `Select ${fld.label || 'option'}...`
      }
      value={internalValue}
      onChange={handleChange}
      optionFilterProp="label"
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      options={masterOptions}
    />
  );
}

function RepeatableSectionPreview({ section }) {
  const fields = section.fields || [];

  const isMasterDriven = Boolean(
    section.is_master_driven ||
    section.context?.is_master_driven ||
    section.master_source ||
    section.context?.master_source ||
    (section.slug?.includes('reg') || (section.section_label || '').toLowerCase().includes('registration'))
  );

  const masterSource =
    section.master_source ||
    section.context?.master_source ||
    (isMasterDriven ? 'dd_document_type' : null);

  const allowAdd = section.allow_add_rows ?? section.context?.allow_add_rows ?? !isMasterDriven;
  const allowDelete = section.allow_delete_rows ?? section.context?.allow_delete_rows ?? !isMasterDriven;

  const labelCol = useMemo(() => {
    return (
      fields.find((f) => {
        const k = (f.db_field || f.id || f.label || '').toLowerCase();
        return k.includes('reg') || k.includes('document') || k.includes('type') || k === 'name' || k === 'title';
      }) || fields[0]
    );
  }, [fields]);

  const [rows, setRows] = useState(() => [
    fields.reduce((acc, fld) => {
      acc[fld.db_field || fld.id] = '';
      return acc;
    }, { _key: 1 }),
  ]);

  useEffect(() => {
    if (isMasterDriven && masterSource) {
      dynamicMasterDetailsAPI({ master: masterSource })
        .then((res) => {
          const items = res?.data?.data || [];
          if (Array.isArray(items) && items.length > 0) {
            const isRegSection =
              section.slug?.includes('reg') ||
              (section.section_label || '').toLowerCase().includes('registration') ||
              section.master_source === 'dd_document_type' ||
              section.context?.master_source === 'dd_document_type';

            let targetItems = items;
            if (isRegSection) {
              const STATUTORY_ITEMS = [
                '12A Registration',
                '80G Certificate',
                'CSR-1 Registration',
                'FCRA Registration',
                'NITI Aayog NGO DARPAN ID',
                'Professional Tax Registration',
                'EPF Registration',
                'ESIC Registration',
              ];
              const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const matched = [];
              STATUTORY_ITEMS.forEach((stat) => {
                const normStat = normalize(stat);
                const found = items.find((item) => {
                  const norm = normalize(item.label || item.type_name || item.name);
                  return norm === normStat;
                });
                if (found) {
                  matched.push(found);
                } else {
                  matched.push({ id: stat, type_name: stat, label: stat });
                }
              });
              if (matched.length > 0) targetItems = matched;
            }

            const masterRows = targetItems.map((m, idx) => {
              const rowObj = fields.reduce((acc, fld) => {
                acc[fld.db_field || fld.id] = '';
                return acc;
              }, { _key: idx + 1 });

              if (labelCol) {
                rowObj[labelCol.db_field || labelCol.id] = m.label || m.type_name || m.name;
              }
              return evaluateRowCalculations(rowObj, fields);
            });

            setRows(masterRows);
          }
        })
        .catch((err) => console.warn('Preview master fetch notice:', err));
    }
  }, [isMasterDriven, masterSource, fields, labelCol, section]);

  const handleAddRow = () => {
    let newRow = fields.reduce((acc, fld) => {
      acc[fld.db_field || fld.id] = '';
      return acc;
    }, { _key: Date.now() });
    newRow = evaluateRowCalculations(newRow, fields);
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (index) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const handleValueChange = (index, dbField, val) => {
    const updated = [...rows];
    updated[index][dbField] = val;
    updated[index] = evaluateRowCalculations(updated[index], fields);
    setRows(updated);
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            {section.section_label || 'Add-More Section'}
          </h3>
          <Tag color="purple" style={{ borderRadius: 8, fontWeight: 600 }}>
            Add-More Table
          </Tag>
          {isMasterDriven && (
            <Tag color="cyan" style={{ borderRadius: 8, fontWeight: 700, fontSize: 11 }}>
              📋 Master Checklist ({masterSource})
            </Tag>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
          {rows.length} Row{rows.length !== 1 ? 's' : ''} {isMasterDriven ? 'Loaded from Master' : 'Added'}
        </span>
      </div>

      {fields.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 8, color: '#94a3b8', fontSize: 13 }}>
          No fields added to this Add-More section yet.
        </div>
      ) : (
        <div>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, width: 45, color: '#475569' }}>#</th>
                  {fields.map((fld) => (
                    <th key={fld.id} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>
                      {fld.label || fld.db_field}
                      {fld.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                      {fld.calculation?.enabled && (
                        <Tag color="purple" style={{ borderRadius: 4, fontSize: 9, padding: '0 4px', marginLeft: 4 }}>
                          calc
                        </Tag>
                      )}
                    </th>
                  ))}
                  {allowDelete && (
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, width: 60, color: '#475569' }}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={row._key || rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>{rIdx + 1}</td>
                    {fields.map((fld) => {
                      const dbKey = fld.db_field || fld.id;
                      const val = row[dbKey] !== undefined ? row[dbKey] : '';
                      const isCalcEnabled = !!fld.calculation?.enabled;
                      const isCalcReadOnly = isCalcEnabled && fld.calculation?.read_only !== false;
                      const isReadOnly = isCalcReadOnly || fld.read_only || fld.readonly || fld.is_readonly;
                      const isFixedLabel = isMasterDriven && labelCol && (fld.id === labelCol.id || fld.db_field === labelCol.db_field);

                      if (isFixedLabel) {
                        return (
                          <td key={fld.id} style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {val || fld.label}
                          </td>
                        );
                      }

                      const isFileField = fld.type === 'file' || fld.data_type === 'file';
                      const isSwitchField = fld.type === 'switch' || fld.data_type === 'boolean';

                      return (
                        <td key={fld.id} style={{ padding: '8px 10px' }}>
                          {fld.type === 'select' ? (
                            <PreviewSelectField
                              fld={fld}
                              val={val}
                              formState={row}
                              onFieldValueChange={(dbField, selectedVal) => handleValueChange(rIdx, dbField, selectedVal)}
                              style={{ width: '100%' }}
                            />
                          ) : isFileField ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {val ? (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#f8fafc',
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    fontSize: 12,
                                    maxWidth: 160,
                                  }}
                                >
                                  <PaperClipOutlined style={{ color: '#4f46e5', flexShrink: 0 }} />
                                  <span
                                    style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      color: '#1e293b',
                                      fontWeight: 500,
                                    }}
                                    title={typeof val === 'string' ? val : val?.name}
                                  >
                                    {typeof val === 'string' ? val : val?.name || 'File attached'}
                                  </span>
                                  {!isReadOnly && !fld.disabled && (
                                    <button
                                      type="button"
                                      onClick={() => handleValueChange(rIdx, dbKey, '')}
                                      style={{
                                        border: 'none',
                                        background: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: 14,
                                        lineHeight: 1,
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <Upload
                                  beforeUpload={(file) => {
                                    handleValueChange(rIdx, dbKey, file.name || 'document.pdf');
                                    return false;
                                  }}
                                  showUploadList={false}
                                  disabled={isReadOnly || fld.disabled}
                                >
                                  <Button
                                    size="small"
                                    icon={<UploadOutlined />}
                                    disabled={isReadOnly || fld.disabled}
                                    style={{
                                      borderRadius: 6,
                                      fontSize: 12,
                                      height: 30,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    Upload
                                  </Button>
                                </Upload>
                              )}
                            </div>
                          ) : isSwitchField ? (
                            <Switch
                              checked={!!val}
                              disabled={isReadOnly || fld.disabled}
                              onChange={(checked) => handleValueChange(rIdx, dbKey, checked)}
                            />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <input
                                type={fld.type === 'number' ? 'number' : fld.type === 'date' ? 'date' : 'text'}
                                min={
                                  fld.type === 'number'
                                    ? fld.validation?.allow_negative
                                      ? fld.validation?.min
                                      : fld.validation?.min !== undefined
                                      ? Math.max(0, Number(fld.validation.min))
                                      : 0
                                    : undefined
                                }
                                max={fld.type === 'number' ? fld.validation?.max : undefined}
                                step={
                                  fld.type === 'number'
                                    ? fld.number_type === 'decimal' || fld.data_type === 'double precision'
                                      ? 'any'
                                      : '1'
                                    : undefined
                                }
                                onKeyDown={(e) => {
                                  if (fld.type === 'number') {
                                    if (!fld.validation?.allow_negative && (e.key === '-' || e.key === 'e' || e.key === 'E')) {
                                      e.preventDefault();
                                    }
                                    if ((fld.number_type === 'integer' || fld.data_type === 'integer') && e.key === '.') {
                                      e.preventDefault();
                                    }
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border:
                                    fld.type === 'number' &&
                                    val !== '' &&
                                    val !== undefined &&
                                    val !== null &&
                                    ((!fld.validation?.allow_negative && Number(val) < 0) ||
                                      (fld.validation?.min !== undefined && Number(val) < Number(fld.validation.min)) ||
                                      (fld.validation?.max !== undefined && Number(val) > Number(fld.validation.max)))
                                      ? '1px solid #ef4444'
                                      : '1px solid #cbd5e1',
                                  fontSize: 13,
                                  background: isReadOnly ? '#f1f5f9' : '#ffffff',
                                  cursor: isReadOnly ? 'not-allowed' : 'text',
                                  color: isReadOnly ? '#475569' : '#0f172a',
                                  fontWeight: isCalcEnabled ? 600 : 400,
                                }}
                                readOnly={isReadOnly}
                                disabled={fld.disabled}
                                placeholder={isCalcEnabled && isReadOnly ? 'Auto-calculated' : (fld.ui?.placeholder || `Enter ${fld.label}`)}
                                value={val}
                                onChange={(e) => {
                                  if (isReadOnly) return;
                                  handleValueChange(rIdx, dbKey, e.target.value);
                                }}
                              />
                              {fld.type === 'number' && val !== '' && val !== undefined && val !== null && !fld.validation?.allow_negative && Number(val) < 0 && (
                                <span style={{ color: '#ef4444', fontSize: 10, marginTop: 2 }}>Must be ≥ 0</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {allowDelete && (
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={rows.length === 1}
                          onClick={() => handleDeleteRow(rIdx)}
                          style={{ borderRadius: 6 }}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {allowAdd && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddRow}
              style={{ width: '100%', borderRadius: 8, fontWeight: 600, height: 38 }}
            >
              + Add Row
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PreviewModalV2({ open, onClose, schema, allFormsList = [] }) {
  const [formValues, setFormValues] = useState({});

  // Parent Field Inheritance display in preview
  const parentDisplayFields = useMemo(() => {
    return Array.isArray(schema?.relation_with_parent?.display_fields)
      ? schema.relation_with_parent.display_fields
      : [];
  }, [schema?.relation_with_parent?.display_fields]);

  const parentTitle = useMemo(() => {
    if (!schema?.parent_form_id) return '';
    const parent = (allFormsList || []).find(
      (f) => String(f.form_id || f.id) === String(schema.parent_form_id)
    );
    return parent?.title || parent?.name || schema?.parent_form_title || 'Parent Form';
  }, [schema?.parent_form_id, schema?.parent_form_title, allFormsList]);

  // Flatten all fields across general sections for top-level calculation and dependency evaluation
  const allFields = useMemo(() => {
    if (!schema?.sections) return [];
    const list = [];
    schema.sections.forEach((sec) => {
      if (sec.type === 'add_more') return;
      (sec.fields || []).forEach((fld) => {
        if (fld.type !== 'add_more') list.push(fld);
      });
    });
    return list;
  }, [schema]);

  // Reset or initialize values when modal opens or schema changes
  useEffect(() => {
    if (open) {
      const initial = {};
      allFields.forEach((f) => {
        const k = f.db_field || f.id;
        if (f.default_value !== undefined) {
          initial[k] = f.default_value;
        }
      });
      const evaluated = evaluateRowCalculations(initial, allFields);
      setFormValues(evaluated);
    } else {
      setFormValues({});
    }
  }, [open, schema, allFields]);

  if (!schema) return null;

  const handleFieldValueChange = (dbField, selectedValue) => {
    setFormValues((prev) => {
      const updated = {
        ...prev,
        [dbField]: selectedValue,
      };
      return evaluateRowCalculations(updated, allFields);
    });
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>Form Interactive Preview</span>
          <Tag color="blue" style={{ borderRadius: 6 }}>{schema.title || 'Untitled Form'}</Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      width="min(1280px, 94vw)"
      style={{ top: 20 }}
      footer={[
        <Button key="close" type="primary" onClick={onClose} style={{ borderRadius: 8, fontWeight: 700, padding: '0 24px' }}>
          Close Preview
        </Button>,
      ]}
    >
      <div style={{ background: '#f8fafc', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0', maxHeight: '82vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: '#0f172a' }}>{schema.title}</h2>
        {schema.description && (
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{schema.description}</p>
        )}

        {/* Parent Reference Information Panel Preview */}
        {schema.parent_form_id && parentDisplayFields.length > 0 && (
          <div className="ant-card ant-card-bordered view-user-modal shadow-sm rounded-lg overflow-hidden mb-5" style={{ border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div
              className="ant-card-head"
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderBottom: 'none',
                padding: '10px 16px',
                minHeight: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', fontWeight: 700, fontSize: '14px' }}>
                <BranchesOutlined style={{ fontSize: 16, color: '#38bdf8' }} />
                <span>{parentTitle || 'Parent Form'} — Reference Information</span>
              </div>
              <Tag
                icon={<LinkOutlined />}
                style={{
                  margin: 0,
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 11,
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                Read-Only Parent Reference Preview
              </Tag>
            </div>
            <div style={{ padding: '16px 18px', background: '#ffffff' }}>
              <Row gutter={[16, 16]}>
                {parentDisplayFields.map((field, idx) => {
                  const label = String(field.label || field.column_name || '').toLowerCase();
                  let icon = <InfoCircleOutlined style={{ color: '#0ea5e9' }} />;
                  let bg = '#f0fdf4';
                  let border = '#dcfce7';

                  if (label.includes('email')) {
                    icon = <MailOutlined style={{ color: '#3b82f6' }} />;
                    bg = '#eff6ff';
                    border = '#dbeafe';
                  } else if (label.includes('website') || label.includes('url')) {
                    icon = <GlobalOutlined style={{ color: '#6366f1' }} />;
                    bg = '#eef2ff';
                    border = '#e0e7ff';
                  } else if (label.includes('date') || label.includes('submission')) {
                    icon = <CalendarOutlined style={{ color: '#f59e0b' }} />;
                    bg = '#fffbeb';
                    border = '#fef3c7';
                  } else if (label.includes('name') || label.includes('org') || label.includes('partner')) {
                    icon = <UserOutlined style={{ color: '#059669' }} />;
                    bg = '#f0fdf4';
                    border = '#dcfce7';
                  } else if (label.includes('pan') || label.includes('csr') || label.includes('reg') || label.includes('id')) {
                    icon = <IdcardOutlined style={{ color: '#0d9488' }} />;
                    bg = '#f0fdfa';
                    border = '#ccfbf1';
                  }

                  return (
                    <Col xs={24} sm={12} md={8} key={`preview_parent_${field.column_name || idx}`}>
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '14px 16px',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: bg,
                            border: `1px solid ${border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 19,
                          }}
                        >
                          {icon}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {field.label || field.column_name}
                          </div>
                          <div style={{ minHeight: 22, display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>
                              Sample {field.label || field.column_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </div>
        )}

        {(schema.sections || []).map((sec, sIdx) => {
          const isSecVisible = !sec.conditions || evaluateConditions(sec.conditions, formValues);
          if (!isSecVisible) return null;

          const isRepeatable = sec.type === 'add_more' || sec.type === 'repeater' || sec.type === 'table' || !!sec.is_repeatable;

          if (isRepeatable) {
            return <RepeatableSectionPreview key={sec.id || sIdx} section={sec} />;
          }

          return (
            <div
              key={sec.id || sIdx}
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {sec.section_label || `Section ${sIdx + 1}`}
                </h3>
                <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>General Section</Tag>
                {sec.conditions?.rules?.length > 0 && (
                  <Tag color="orange" style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Conditional</Tag>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>
                {(sec.fields || []).map((fld, fIdx) => {
                  const isFldVisible = !fld.conditions || evaluateConditions(fld.conditions, formValues);
                  if (!isFldVisible) return null;

                  const colSpan = fld.ui?.col_span || (fld.type === 'add_more' ? 12 : 6);
                  const fieldKey = fld.db_field || fld.id;
                  const isCalcEnabled = !!fld.calculation?.enabled;
                  const isCalcReadOnly = isCalcEnabled && fld.calculation?.read_only !== false;
                  const isReadOnly = isCalcReadOnly || fld.read_only || fld.readonly || fld.is_readonly;
                  const isDisabled = fld.disabled;

                  if (fld.type === 'add_more') {
                    return (
                      <div key={fld.id || fIdx} style={{ gridColumn: 'span 12', marginTop: 10 }}>
                        <RepeatableSectionPreview section={fld} />
                      </div>
                    );
                  }

                  return (
                    <div key={fld.id || fIdx} style={{ gridColumn: `span ${colSpan}` }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                        <span>
                          {fld.label || 'Field'}
                          {fld.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                        </span>
                        <Space size={4}>
                          {isCalcEnabled && (
                            <Tag
                              color="purple"
                              style={{
                                borderRadius: 4,
                                fontSize: 10,
                                padding: '0 5px',
                                margin: 0,
                                fontWeight: 700,
                                cursor: 'help',
                              }}
                              title={`Formula: ${fld.calculation?.formula || ''}`}
                            >
                              {isReadOnly ? '🧮 Read-Only Calc' : '🧮 Auto-calc'}
                            </Tag>
                          )}
                          {fld.conditions?.rules?.length > 0 && (
                            <Tag color="orange" style={{ borderRadius: 4, fontSize: 10, padding: '0 4px', margin: 0 }}>Cond</Tag>
                          )}
                        </Space>
                      </label>

                      {fld.type === 'textarea' ? (
                        <textarea
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            fontSize: 13,
                            background: isReadOnly ? '#f1f5f9' : '#ffffff',
                            color: isReadOnly ? '#475569' : '#0f172a',
                            cursor: isReadOnly ? 'not-allowed' : 'text',
                          }}
                          rows={3}
                          readOnly={isReadOnly}
                          disabled={isDisabled}
                          placeholder={fld.ui?.placeholder}
                          value={formValues[fieldKey] !== undefined ? formValues[fieldKey] : ''}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            handleFieldValueChange(fieldKey, e.target.value);
                          }}
                        />
                      ) : fld.type === 'select' ? (
                        <PreviewSelectField
                          fld={fld}
                          val={formValues[fieldKey]}
                          formState={formValues}
                          onFieldValueChange={handleFieldValueChange}
                        />
                      ) : (fld.type === 'file' || fld.data_type === 'file') ? (
                        <div style={{ width: '100%' }}>
                          {formValues[fieldKey] ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 12px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: 8,
                                fontSize: 13,
                              }}
                            >
                              <PaperClipOutlined style={{ color: '#4f46e5', fontSize: 14 }} />
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                {typeof formValues[fieldKey] === 'string'
                                  ? formValues[fieldKey]
                                  : formValues[fieldKey]?.name || 'File attached'}
                              </span>
                              {!isReadOnly && !isDisabled && (
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleFieldValueChange(fieldKey, '')}
                                  style={{ marginLeft: 'auto', height: 22, width: 22, padding: 0 }}
                                />
                              )}
                            </div>
                          ) : (
                            <Upload
                              beforeUpload={(file) => {
                                handleFieldValueChange(fieldKey, file.name || 'document.pdf');
                                return false;
                              }}
                              showUploadList={false}
                              disabled={isDisabled || isReadOnly}
                            >
                              <Button
                                icon={<UploadOutlined />}
                                disabled={isDisabled || isReadOnly}
                                style={{
                                  borderRadius: 8,
                                  height: 36,
                                  fontSize: 13,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                Choose File / Upload
                              </Button>
                            </Upload>
                          )}
                        </div>
                      ) : (fld.type === 'switch' || fld.data_type === 'boolean') ? (
                        <div style={{ paddingTop: 4 }}>
                          <Switch
                            checked={!!formValues[fieldKey]}
                            disabled={isReadOnly || isDisabled}
                            onChange={(checked) => handleFieldValueChange(fieldKey, checked)}
                          />
                        </div>
                      ) : (
                        <div>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={fld.type === 'number' ? 'number' : fld.type === 'date' ? 'date' : 'text'}
                              min={
                                fld.type === 'number'
                                  ? fld.validation?.allow_negative
                                    ? fld.validation?.min
                                    : fld.validation?.min !== undefined
                                    ? Math.max(0, Number(fld.validation.min))
                                    : 0
                                  : undefined
                              }
                              max={fld.type === 'number' ? fld.validation?.max : undefined}
                              step={
                                fld.type === 'number'
                                  ? fld.number_type === 'decimal' || fld.data_type === 'double precision'
                                    ? 'any'
                                    : '1'
                                  : undefined
                              }
                              onKeyDown={(e) => {
                                if (fld.type === 'number') {
                                  if (!fld.validation?.allow_negative && (e.key === '-' || e.key === 'e' || e.key === 'E')) {
                                    e.preventDefault();
                                  }
                                  if ((fld.number_type === 'integer' || fld.data_type === 'integer') && e.key === '.') {
                                    e.preventDefault();
                                  }
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: isCalcEnabled ? '8px 36px 8px 12px' : '8px 12px',
                                borderRadius: 8,
                                border:
                                  fld.type === 'number' &&
                                  formValues[fieldKey] !== '' &&
                                  formValues[fieldKey] !== undefined &&
                                  formValues[fieldKey] !== null &&
                                  ((!fld.validation?.allow_negative && Number(formValues[fieldKey]) < 0) ||
                                    (fld.validation?.min !== undefined && Number(formValues[fieldKey]) < Number(fld.validation.min)) ||
                                    (fld.validation?.max !== undefined && Number(formValues[fieldKey]) > Number(fld.validation.max)))
                                    ? '1px solid #ef4444'
                                    : '1px solid #cbd5e1',
                                fontSize: 13,
                                background: isReadOnly ? '#f1f5f9' : '#ffffff',
                                color: isReadOnly ? '#334155' : '#0f172a',
                                cursor: isReadOnly ? 'not-allowed' : 'text',
                                fontWeight: isCalcEnabled ? 600 : 400,
                              }}
                              readOnly={isReadOnly}
                              disabled={isDisabled}
                              placeholder={
                                isCalcEnabled && isReadOnly
                                  ? 'Auto-calculated'
                                  : fld.ui?.placeholder || `Enter ${fld.label || 'value'}`
                              }
                              value={formValues[fieldKey] !== undefined ? formValues[fieldKey] : ''}
                              onChange={(e) => {
                                if (isReadOnly) return;
                                handleFieldValueChange(fieldKey, e.target.value);
                              }}
                            />
                            {isCalcEnabled && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 10,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  fontSize: 12,
                                  color: '#6366f1',
                                  pointerEvents: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontWeight: 700,
                                }}
                                title={`Formula: ${fld.calculation?.formula || ''}`}
                              >
                                🧮
                              </div>
                            )}
                          </div>
                          {fld.type === 'number' &&
                            formValues[fieldKey] !== '' &&
                            formValues[fieldKey] !== undefined &&
                            formValues[fieldKey] !== null && (
                              <>
                                {!fld.validation?.allow_negative && Number(formValues[fieldKey]) < 0 && (
                                  <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ExclamationCircleOutlined /> Negative numbers are not allowed.
                                  </div>
                                )}
                                {fld.validation?.min !== undefined && Number(formValues[fieldKey]) < Number(fld.validation.min) && (
                                  <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ExclamationCircleOutlined /> Minimum value is {fld.validation.min}.
                                  </div>
                                )}
                                {fld.validation?.max !== undefined && Number(formValues[fieldKey]) > Number(fld.validation.max) && (
                                  <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ExclamationCircleOutlined /> Maximum value is {fld.validation.max}.
                                  </div>
                                )}
                                {(fld.number_type === 'integer' || fld.data_type === 'integer') &&
                                  !Number.isInteger(Number(formValues[fieldKey])) && (
                                    <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <ExclamationCircleOutlined /> Only whole numbers are allowed.
                                    </div>
                                  )}
                              </>
                            )}
                        </div>
                      )}

                      {fld.ui?.help_text && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          {fld.ui.help_text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
