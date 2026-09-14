'use client';

import React, { useState } from 'react';
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
  HolderOutlined,
  AppstoreOutlined,
  PlusCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip } from 'antd';

export default function CanvasV2({
  sections = [],
  activeSectionIndex,
  setActiveSectionIndex,
  selectedFieldId,
  setSelectedFieldId,
  selectedSubFieldId,
  setSelectedSubFieldId,
  onAddSection,
  onDeleteSection,
  onDuplicateSection,
  onUpdateSection,
  onDeleteField,
  onDuplicateField,
  onReorderField,
  onReorderSection,
  onAddSubColumn,
  onDeleteSubColumn,
}) {
  const [collapsedSections, setCollapsedSections] = useState({});
  const [draggedField, setDraggedField] = useState(null); // { secIdx, fldIdx }
  const [draggedSection, setDraggedSection] = useState(null); // secIdx
  const [dragOverTarget, setDragOverTarget] = useState(null); // 'sec_X' or 'fld_X_Y'

  const toggleCollapse = (secId) => {
    setCollapsedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const expandAll = () => setCollapsedSections({});

  /* ── Field Drag & Drop ── */
  const handleFieldDragStart = (e, secIdx, fldIdx) => {
    e.stopPropagation();
    setDraggedField({ secIdx, fldIdx });
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'field', secIdx, fldIdx }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFieldDragOver = (e, targetSecIdx, targetFldIdx) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(`fld_${targetSecIdx}_${targetFldIdx}`);
  };

  const handleFieldDrop = (e, targetSecIdx, targetFldIdx) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    if (!draggedField) return;

    const { secIdx: srcSecIdx, fldIdx: srcFldIdx } = draggedField;
    if (srcSecIdx === targetSecIdx && srcFldIdx === targetFldIdx) return;

    if (onReorderField) {
      onReorderField(srcSecIdx, srcFldIdx, targetSecIdx, targetFldIdx);
    }
    setDraggedField(null);
  };

  /* ── Section Drag & Drop ── */
  const handleSectionDragStart = (e, secIdx) => {
    e.stopPropagation();
    setDraggedSection(secIdx);
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'section', secIdx }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e, targetSecIdx) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(`sec_${targetSecIdx}`);
  };

  const handleSectionDrop = (e, targetSecIdx) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    if (draggedSection === null || draggedSection === targetSecIdx) return;

    if (onReorderSection) {
      onReorderSection(draggedSection, targetSecIdx);
    }
    setDraggedSection(null);
  };

  return (
    <main className="fb-v2-canvas-wrapper">
      <div className="fb-v2-canvas-container">
        {/* Canvas Toolbar */}
        <div className="fb-v2-canvas-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="fb-v2-btn fb-v2-btn-primary conf-create-btn" onClick={onAddSection}>
              <PlusOutlined /> Add Section
            </button>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              {sections.length} Section{sections.length !== 1 ? 's' : ''}
            </span>
          </div>

          <button className="fb-v2-btn fb-v2-btn-secondary" onClick={expandAll}>
            <AppstoreOutlined /> Expand All
          </button>
        </div>

        {/* Sections List */}
        {sections.length === 0 ? (
          <div className="fb-v2-empty-section">
            <h3>No sections added yet</h3>
            <p>Click "+ Add Section" above to get started building your form canvas.</p>
          </div>
        ) : (
          sections.map((sec, secIdx) => {
            const isCollapsed = !!collapsedSections[sec.id];
            const isSelectedSection = activeSectionIndex === secIdx;
            const isSectionDragOver = dragOverTarget === `sec_${secIdx}`;
            const isSectionDragging = draggedSection === secIdx;
            const isAddMore = sec.type === 'add_more' || sec.type === 'repeater' || sec.type === 'table' || !!sec.is_repeatable;

            return (
              <div
                key={sec.id || secIdx}
                draggable
                onDragStart={(e) => handleSectionDragStart(e, secIdx)}
                onDragOver={(e) => handleSectionDragOver(e, secIdx)}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={(e) => handleSectionDrop(e, secIdx)}
                className={`fb-v2-section-card ${isSelectedSection ? 'selected' : ''} ${
                  isSectionDragOver ? 'drag-over' : ''
                } ${isSectionDragging ? 'dragging' : ''}`}
                onClick={() => setActiveSectionIndex(secIdx)}
              >
                {/* Section Header */}
                <div className="fb-v2-section-header">
                  <div className="fb-v2-section-title">
                    <Tooltip title="Drag to reorder section">
                      <HolderOutlined
                        style={{ color: '#4f46e5', cursor: 'grab', fontSize: 16 }}
                      />
                    </Tooltip>
                    <span style={{ fontWeight: 700 }}>
                      {sec.section_label || `Section ${secIdx + 1}`}
                      {isAddMore ? ' (Add More)' : ''}
                    </span>
                    <Tag color={isAddMore ? 'purple' : 'blue'} style={{ borderRadius: 8 }}>
                      {isAddMore ? 'Add-More Table' : 'General Section'}
                    </Tag>
                    {(sec.is_master_driven || sec.context?.is_master_driven) && (
                      <Tag color="cyan" style={{ borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                        📋 Master Checklist ({sec.master_source || sec.context?.master_source || 'Master'})
                      </Tag>
                    )}
                    {((sec.conditions?.rules || []).length > 0) && (
                      <Tag color="orange" style={{ borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                        ⚡ Conditional ({(sec.conditions?.rules || []).length})
                      </Tag>
                    )}
                  </div>

                  <div className="fb-v2-section-actions">
                    {/* Add Row Button for Add-More Sections */}
                    {isAddMore && (
                      <Button
                        size="small"
                        type="default"
                        icon={<PlusCircleOutlined style={{ color: '#6366f1' }} />}
                        style={{
                          borderRadius: 8,
                          color: '#4f46e5',
                          borderColor: '#cbd5e1',
                          fontWeight: 600,
                          fontSize: 12,
                          padding: '2px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Add Row
                      </Button>
                    )}

                    <Tooltip title="Duplicate Section">
                      <button
                        className="fb-v2-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateSection(secIdx);
                        }}
                      >
                        <CopyOutlined />
                      </button>
                    </Tooltip>

                    {sections.length > 1 && (
                      <Popconfirm
                        title="Delete Section?"
                        description="Are you sure you want to delete this section and its fields?"
                        onConfirm={(e) => {
                          e.stopPropagation();
                          onDeleteSection(secIdx);
                        }}
                        okText="Delete"
                        cancelText="Cancel"
                      >
                        <button
                          className="fb-v2-icon-btn danger"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DeleteOutlined />
                        </button>
                      </Popconfirm>
                    )}

                    <button
                      className="fb-v2-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(sec.id);
                      }}
                    >
                      {isCollapsed ? <DownOutlined /> : <UpOutlined />}
                    </button>
                  </div>
                </div>

                {/* Section Fields Body */}
                {!isCollapsed && (
                  isAddMore ? (
                    /* ── ADD MORE TABLE LAYOUT ── */
                    <div style={{ padding: 20 }}>
                      {(!sec.fields || sec.fields.length === 0) ? (
                        <div className="fb-v2-empty-section">
                          <p style={{ margin: 0, fontSize: 13 }}>
                            Drag or click fields from the left palette to add columns to this Add-More table.
                          </p>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px 0' }}>
                            <thead>
                              <tr>
                                {sec.fields.map((fld, fldIdx) => {
                                  const isSelectedField = selectedFieldId === fld.id;
                                  const isFieldDragOver = dragOverTarget === `fld_${secIdx}_${fldIdx}`;

                                  return (
                                    <th
                                      key={fld.id || fldIdx}
                                      draggable
                                      onDragStart={(e) => handleFieldDragStart(e, secIdx, fldIdx)}
                                      onDragOver={(e) => handleFieldDragOver(e, secIdx, fldIdx)}
                                      onDragLeave={() => setDragOverTarget(null)}
                                      onDrop={(e) => handleFieldDrop(e, secIdx, fldIdx)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSectionIndex(secIdx);
                                        setSelectedFieldId(fld.id);
                                      }}
                                      style={{
                                        textAlign: 'left',
                                        paddingBottom: 10,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: isSelectedField ? '#4f46e5' : '#1e293b',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, background: isSelectedField ? '#e0e7ff' : 'transparent' }}>
                                        <HolderOutlined style={{ color: '#94a3b8', cursor: 'grab', fontSize: 12 }} />
                                        <span>{fld.label || 'Unlabeled'}</span>
                                        {fld.required && <span style={{ color: '#ef4444' }}>*</span>}
                                      </div>
                                    </th>
                                  );
                                })}
                                <th style={{ textAlign: 'center', paddingBottom: 10, fontSize: 13, fontWeight: 700, color: '#475569', width: 90 }}>
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {sec.fields.map((fld, fldIdx) => {
                                  const isSelectedField = selectedFieldId === fld.id;

                                  return (
                                    <td
                                      key={fld.id || fldIdx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSectionIndex(secIdx);
                                        setSelectedFieldId(fld.id);
                                      }}
                                      style={{ paddingTop: 4, paddingBottom: 8, verticalAlign: 'middle' }}
                                    >
                                      <div
                                        className={`fb-v2-field-card ${isSelectedField ? 'selected' : ''}`}
                                        style={{ padding: '8px 12px', borderRadius: 8, background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                                      >
                                        {fld.type === 'textarea' ? (
                                          <textarea
                                            className="fb-v2-field-preview-input"
                                            rows={1}
                                            placeholder={fld.ui?.placeholder || `Enter ${fld.label || 'value'}...`}
                                            readOnly
                                            style={{ background: 'transparent', border: 'none', padding: 0 }}
                                          />
                                        ) : fld.type === 'select' ? (
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: 13 }}>
                                            <span>{fld.ui?.placeholder || `Select ${fld.label || 'option'}...`}</span>
                                            <DownOutlined style={{ fontSize: 11 }} />
                                          </div>
                                        ) : (fld.type === 'file' || fld.data_type === 'file') ? (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12, background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                                            <UploadOutlined style={{ color: '#4f46e5', fontSize: 12 }} />
                                            <span>Upload File</span>
                                          </div>
                                        ) : (fld.type === 'switch' || fld.data_type === 'boolean') ? (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', height: 20, width: 36, background: '#cbd5e1', borderRadius: 10, padding: 2 }}>
                                            <div style={{ height: 16, width: 16, background: '#ffffff', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {fld.type === 'number' && <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>₹</span>}
                                            <input
                                              type="text"
                                              className="fb-v2-field-preview-input"
                                              placeholder={fld.ui?.placeholder || `Enter ${fld.label || 'value'}...`}
                                              readOnly
                                              style={{ background: 'transparent', border: 'none', padding: 0, width: '100%' }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}

                                <td style={{ textAlign: 'center', verticalAlign: 'middle', paddingTop: 4, paddingBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <button
                                      className="fb-v2-icon-btn"
                                      style={{ width: 28, height: 28, background: '#ffffff', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicateField(secIdx, sec.fields.length - 1);
                                      }}
                                      title="Duplicate field"
                                    >
                                      <CopyOutlined style={{ fontSize: 12, color: '#475569' }} />
                                    </button>
                                    <Popconfirm
                                      title="Delete Field?"
                                      description="Delete this column from Add-More table?"
                                      onConfirm={(e) => {
                                        e.stopPropagation();
                                        onDeleteField(secIdx, sec.fields.length - 1);
                                      }}
                                      okText="Delete"
                                      cancelText="Cancel"
                                    >
                                      <button
                                        className="fb-v2-icon-btn danger"
                                        style={{ width: 28, height: 28, background: '#ffffff', borderRadius: 6, border: '1px solid #fca5a5' }}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Delete column"
                                      >
                                        <DeleteOutlined style={{ fontSize: 12, color: '#ef4444' }} />
                                      </button>
                                    </Popconfirm>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Bottom Add Row Bar */}
                          <div
                            style={{
                              marginTop: 14,
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: '1px dashed #cbd5e1',
                              background: '#ffffff',
                              color: '#6366f1',
                              fontWeight: 600,
                              fontSize: 13,
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            }}
                          >
                            <PlusOutlined style={{ fontSize: 12 }} /> Add Row
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── GENERAL SECTION GRID LAYOUT ── */
                    <div className="fb-v2-fields-grid">
                      {(!sec.fields || sec.fields.length === 0) ? (
                        <div className="fb-v2-empty-section">
                          <p style={{ margin: 0, fontSize: 13 }}>
                            Drag or click fields from the left palette to populate this section.
                          </p>
                        </div>
                      ) : (
                        sec.fields.map((fld, fldIdx) => {
                          const colSpan = fld.ui?.col_span || (fld.type === 'add_more' ? 12 : 6);
                          const isSelectedField = selectedFieldId === fld.id;
                          const isFieldDragOver = dragOverTarget === `fld_${secIdx}_${fldIdx}`;
                          const isFieldDragging =
                            draggedField?.secIdx === secIdx && draggedField?.fldIdx === fldIdx;

                          if (fld.type === 'add_more') {
                            const subFields = fld.fields || [
                              { id: `s1`, label: 'Activity Name', required: true, ui: { placeholder: 'Enter activity' } },
                              { id: `s2`, label: 'Location', required: true, ui: { placeholder: 'Select location' } },
                              { id: `s3`, label: 'Expected Budget (INR)', required: true, ui: { placeholder: 'Enter amount' } },
                            ];

                            return (
                              <div
                                key={fld.id || fldIdx}
                                style={{ gridColumn: 'span 12', margin: '6px 0' }}
                                className={`fb-v2-field-card ${isSelectedField ? 'selected' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSectionIndex(secIdx);
                                  setSelectedFieldId(fld.id);
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <HolderOutlined style={{ color: '#94a3b8', cursor: 'grab' }} />
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{fld.label || 'Add More Table'}</span>
                                     {(fld.storage_type === 'table' || fld.storage === 'table') ? (
                                       <Tag color="blue" style={{ borderRadius: 6 }}>separate table ({fld.table_name || 'parent_id'})</Tag>
                                     ) : (
                                       <Tag color="purple" style={{ borderRadius: 6 }}>jsonb column</Tag>
                                     )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Button
                                      size="small"
                                      type="dashed"
                                      icon={<PlusOutlined />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onAddSubColumn) onAddSubColumn(secIdx, fldIdx);
                                      }}
                                      style={{ borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#4f46e5', borderColor: '#a5b4fc', height: 26 }}
                                    >
                                      + Add Column
                                    </Button>

                                    <button
                                      className="fb-v2-icon-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicateField(secIdx, fldIdx);
                                      }}
                                    >
                                      <CopyOutlined />
                                    </button>
                                    <Popconfirm
                                      title="Delete Add-More Table?"
                                      onConfirm={(e) => {
                                        e.stopPropagation();
                                        onDeleteField(secIdx, fldIdx);
                                      }}
                                      okText="Delete"
                                      cancelText="Cancel"
                                    >
                                      <button className="fb-v2-icon-btn danger" onClick={(e) => e.stopPropagation()}>
                                        <DeleteOutlined />
                                      </button>
                                    </Popconfirm>
                                  </div>
                                </div>

                                <div style={{ overflowX: 'auto', background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px 0' }}>
                                    <thead>
                                      <tr>
                                        {subFields.map((sf, sfIdx) => {
                                          const isSubSelected = selectedSubFieldId === sf.id;
                                          return (
                                            <th
                                              key={sf.id || sfIdx}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveSectionIndex(secIdx);
                                                setSelectedFieldId(fld.id);
                                                if (setSelectedSubFieldId) setSelectedSubFieldId(sf.id);
                                              }}
                                              style={{
                                                textAlign: 'left',
                                                padding: '6px 8px',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: isSubSelected ? '#4338ca' : '#334155',
                                                cursor: 'pointer',
                                                background: isSubSelected ? '#e0e7ff' : 'transparent',
                                                borderRadius: 6,
                                                border: isSubSelected ? '2px solid #6366f1' : '1px solid transparent',
                                                transition: 'all 0.2s ease',
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                                <span>
                                                  {sf.label} {sf.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                  {isSubSelected && <Tag color="purple" style={{ marginLeft: 4, fontSize: 10, padding: '0 4px' }}>Editing Column</Tag>}
                                                </span>
                                                {subFields.length > 1 && (
                                                  <Tooltip title="Delete column">
                                                    <span
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onDeleteSubColumn) onDeleteSubColumn(secIdx, fldIdx, sfIdx);
                                                      }}
                                                      style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 11, padding: '0 2px' }}
                                                    >
                                                      ✕
                                                    </span>
                                                  </Tooltip>
                                                )}
                                              </div>
                                            </th>
                                          );
                                        })}
                                        <th style={{ textAlign: 'center', width: 70, fontSize: 12, fontWeight: 700, color: '#475569' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        {subFields.map((sf, sfIdx) => {
                                          const isSubSelected = selectedSubFieldId === sf.id;
                                          return (
                                            <td
                                              key={sf.id || sfIdx}
                                              style={{ padding: '4px 2px' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveSectionIndex(secIdx);
                                                setSelectedFieldId(fld.id);
                                                if (setSelectedSubFieldId) setSelectedSubFieldId(sf.id);
                                              }}
                                            >
                                              {(sf.type === 'file' || sf.data_type === 'file') ? (
                                                <div
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    color: '#475569',
                                                    fontSize: 12,
                                                    background: '#f8fafc',
                                                    padding: '4px 8px',
                                                    borderRadius: 6,
                                                    border: isSubSelected ? '2px solid #6366f1' : '1px dashed #cbd5e1',
                                                    cursor: 'pointer',
                                                  }}
                                                >
                                                  <UploadOutlined style={{ color: '#4f46e5', fontSize: 12 }} />
                                                  <span>Upload File</span>
                                                </div>
                                              ) : (
                                                <input
                                                  className="fb-v2-field-preview-input"
                                                  placeholder={sf.ui?.placeholder || `Enter ${sf.label}...`}
                                                  readOnly
                                                  style={{
                                                    background: '#ffffff',
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                    border: isSubSelected ? '2px solid #6366f1' : '1px solid #cbd5e1',
                                                  }}
                                                />
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td style={{ textAlign: 'center' }}>
                                          <Button size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} style={{ borderRadius: 6, height: 26, width: 26, padding: 0 }} />
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <div style={{ marginTop: 10, padding: 8, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 6, color: '#6366f1', fontWeight: 600, fontSize: 12, background: '#ffffff' }}>
                                    + Add Row
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={fld.id || fldIdx}
                              draggable
                              onDragStart={(e) => handleFieldDragStart(e, secIdx, fldIdx)}
                              onDragOver={(e) => handleFieldDragOver(e, secIdx, fldIdx)}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => handleFieldDrop(e, secIdx, fldIdx)}
                              style={{ gridColumn: `span ${colSpan}` }}
                              className={`fb-v2-field-card ${isSelectedField ? 'selected' : ''} ${
                                isFieldDragOver ? 'drag-over' : ''
                              } ${isFieldDragging ? 'dragging' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSectionIndex(secIdx);
                                setSelectedFieldId(fld.id);
                              }}
                            >
                              <div className="fb-v2-field-card-header">
                                <div className="fb-v2-field-label">
                                  <Tooltip title="Drag to reorder field position">
                                    <HolderOutlined style={{ color: '#94a3b8', cursor: 'grab', marginRight: 4 }} />
                                  </Tooltip>
                                  {fld.label || 'Unlabeled Field'}
                                  {fld.required && <span className="fb-v2-required-star">*</span>}
                                  {((fld.conditions?.rules || []).length > 0) && (
                                    <Tag color="orange" style={{ borderRadius: 6, fontSize: 10, padding: '0 4px', marginLeft: 6, fontWeight: 700 }}>
                                      ⚡ Cond ({(fld.conditions?.rules || []).length})
                                    </Tag>
                                  )}
                                </div>

                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    className="fb-v2-icon-btn"
                                    style={{ width: 22, height: 22, fontSize: 11 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDuplicateField(secIdx, fldIdx);
                                    }}
                                    title="Duplicate field"
                                  >
                                    <CopyOutlined />
                                  </button>
                                  <Popconfirm
                                    title="Delete Field?"
                                    description={`Are you sure you want to delete "${fld.label || fld.db_field || 'this field'}"?`}
                                    onConfirm={(e) => {
                                      e.stopPropagation();
                                      onDeleteField(secIdx, fldIdx);
                                    }}
                                    okText="Delete"
                                    cancelText="Cancel"
                                  >
                                    <button
                                      className="fb-v2-icon-btn danger"
                                      style={{ width: 22, height: 22, fontSize: 11 }}
                                      onClick={(e) => e.stopPropagation()}
                                      title="Delete field"
                                    >
                                      <DeleteOutlined />
                                    </button>
                                  </Popconfirm>
                                </div>
                              </div>

                              {/* Field Preview Input Rendering */}
                              {fld.type === 'textarea' ? (
                                <textarea
                                  className="fb-v2-field-preview-input"
                                  rows={2}
                                  placeholder={fld.ui?.placeholder || 'Enter details...'}
                                  readOnly
                                />
                              ) : fld.type === 'select' ? (
                                <select className="fb-v2-field-preview-input" disabled>
                                  <option>{fld.ui?.placeholder || 'Select option...'}</option>
                                </select>
                              ) : (fld.type === 'file' || fld.data_type === 'file') ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    padding: '12px',
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: 8,
                                    background: '#f8fafc',
                                    color: '#64748b',
                                    fontSize: 13,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <UploadOutlined style={{ fontSize: 16, color: '#4f46e5' }} />
                                  <span>Click or drag file to upload</span>
                                </div>
                              ) : (fld.type === 'switch' || fld.data_type === 'boolean') ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', height: 24, width: 44, background: '#e2e8f0', borderRadius: 12, padding: 2 }}>
                                  <div style={{ height: 20, width: 20, background: '#ffffff', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  className="fb-v2-field-preview-input"
                                  placeholder={fld.ui?.placeholder || `Enter ${fld.label || 'value'}...`}
                                  readOnly
                                />
                              )}

                              {fld.ui?.help_text && (
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                                  {fld.ui.help_text}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
