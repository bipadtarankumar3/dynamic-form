'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
  HolderOutlined,
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
  onUpdateFieldColSpan,
  onAddRowWithLayout,
}) {
  const [collapsedSections, setCollapsedSections] = useState({});
  const [draggedField, setDraggedField] = useState(null); // { secIdx, fldIdx }
  const [draggedSection, setDraggedSection] = useState(null); // secIdx
  const [dragOverTarget, setDragOverTarget] = useState(null); // 'sec_X' or 'fld_X_Y'
  const [resizingField, setResizingField] = useState(null); // { secIdx, fldIdx, startX, startSpan, gridWidth, liveSpan }

  const ROW_LAYOUT_PRESETS = [
    { label: '1 Column', desc: '100%', spans: [12], bars: [100] },
    { label: '2 Columns', desc: '50% | 50%', spans: [6, 6], bars: [50, 50] },
    { label: '3 Columns', desc: '33% each', spans: [4, 4, 4], bars: [33.3, 33.3, 33.3] },
    { label: '4 Columns', desc: '25% each', spans: [3, 3, 3, 3], bars: [25, 25, 25, 25] },
    { label: '2 Columns', desc: '66% | 33%', spans: [8, 4], bars: [66.6, 33.3] },
    { label: '2 Columns', desc: '33% | 66%', spans: [4, 8], bars: [33.3, 66.6] },
    { label: '3 Columns', desc: '25% | 50% | 25%', spans: [3, 6, 3], bars: [25, 50, 25] },
  ];

  const getColSpanLabel = (span) => {
    switch (span) {
      case 12: return '100% (12/12)';
      case 9: return '75% (9/12)';
      case 8: return '66.7% (8/12)';
      case 6: return '50% (6/12)';
      case 4: return '33.3% (4/12)';
      case 3: return '25% (3/12)';
      case 2: return '16.7% (2/12)';
      case 1: return '8.3% (1/12)';
      default: return `${Math.round((span / 12) * 100)}% (${span}/12)`;
    }
  };

  /* ── Interactive Drag to Resize Field Column Span ── */
  const handleResizeMouseDown = (e, secIdx, fldIdx, currentSpan) => {
    e.preventDefault();
    e.stopPropagation();
    const gridEl = e.currentTarget.closest('.fb-v2-fields-grid');
    const gridWidth = gridEl ? gridEl.getBoundingClientRect().width - 40 : 800;
    const startSpan = currentSpan || 6;
    const startX = e.clientX;

    setResizingField({
      secIdx,
      fldIdx,
      startX,
      startSpan,
      gridWidth,
      liveSpan: startSpan,
    });

    const handleMouseMove = (moveEvent) => {
      const columnWidth = gridWidth / 12;
      const deltaX = moveEvent.clientX - startX;
      const deltaSpan = Math.round(deltaX / columnWidth);
      const newSpan = Math.max(1, Math.min(12, startSpan + deltaSpan));
      setResizingField((prev) => (prev ? { ...prev, liveSpan: newSpan } : null));
    };

    const handleMouseUp = (upEvent) => {
      const columnWidth = gridWidth / 12;
      const deltaX = upEvent.clientX - startX;
      const deltaSpan = Math.round(deltaX / columnWidth);
      const finalSpan = Math.max(1, Math.min(12, startSpan + deltaSpan));
      if (onUpdateFieldColSpan) {
        onUpdateFieldColSpan(secIdx, fldIdx, finalSpan);
      }
      setResizingField(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleCollapse = (secId) => {
    setCollapsedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const prevSectionsLength = useRef(sections.length);
  const bottomAddSectionRef = useRef(null);

  useEffect(() => {
    if (sections.length > prevSectionsLength.current) {
      const targetSec = sections[activeSectionIndex];
      const targetId = targetSec?.id || activeSectionIndex;
      setTimeout(() => {
        const el = document.getElementById(`fb-section-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (bottomAddSectionRef.current) {
          bottomAddSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 60);
    }
    prevSectionsLength.current = sections.length;
  }, [sections.length, activeSectionIndex]);

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
        {/* Sections List */}
        {sections.length === 0 ? (
          <div className="fb-v2-empty-section">
            <h3>No sections added yet</h3>
            <p>Click "Add Section" below to get started building your form canvas.</p>
            <button
              type="button"
              className="fb-v2-btn fb-v2-btn-primary conf-create-btn"
              onClick={() => onAddSection && onAddSection()}
              style={{ marginTop: 12 }}
            >
              <PlusOutlined /> Add Section
            </button>
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
                id={`fb-section-${sec.id || secIdx}`}
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
                    <Tag color={isAddMore ? 'purple' : sec.type === 'linked_table' ? 'geekblue' : 'blue'} style={{ borderRadius: 8 }}>
                      {isAddMore ? 'Add-More Table' : sec.type === 'linked_table' ? 'Dynamic Linked Table' : 'General Section'}
                    </Tag>
                    {sec.type === 'linked_table' && (
                      <Tag color="cyan" style={{ borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                        🔗 Master Source: {sec.master_source || sec.target_form || 'Dynamic Collection'}
                      </Tag>
                    )}
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

                    <Tooltip title="Add Section Below">
                      <button
                        type="button"
                        className="fb-v2-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddSection) onAddSection(secIdx);
                        }}
                      >
                        <PlusOutlined />
                      </button>
                    </Tooltip>

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

                    {onReorderSection && secIdx > 0 && (
                      <Tooltip title="Move Section Up">
                        <button
                          type="button"
                          className="fb-v2-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderSection(secIdx, secIdx - 1);
                          }}
                        >
                          <UpOutlined style={{ fontSize: 11 }} />
                        </button>
                      </Tooltip>
                    )}

                    {onReorderSection && secIdx < sections.length - 1 && (
                      <Tooltip title="Move Section Down">
                        <button
                          type="button"
                          className="fb-v2-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderSection(secIdx, secIdx + 1);
                          }}
                        >
                          <DownOutlined style={{ fontSize: 11 }} />
                        </button>
                      </Tooltip>
                    )}

                    <button
                      className="fb-v2-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(sec.id);
                      }}
                      title={isCollapsed ? "Expand Section" : "Collapse Section"}
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
                                        minWidth: 160,
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: 8,
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                          background: isSelectedField ? '#e0e7ff' : '#f1f5f9',
                                          border: isSelectedField ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                                          <Tooltip title="Drag to reorder column">
                                            <HolderOutlined style={{ color: '#94a3b8', cursor: 'grab', fontSize: 12, flexShrink: 0 }} />
                                          </Tooltip>
                                          <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {fld.label || 'Unlabeled'}
                                          </span>
                                          {fld.required && <span style={{ color: '#ef4444' }}>*</span>}
                                          {((fld.conditions?.rules || []).length > 0) && (
                                            <Tag color="orange" style={{ borderRadius: 4, fontSize: 10, padding: '0 4px', margin: 0, fontWeight: 700, flexShrink: 0 }}>
                                              ⚡
                                            </Tag>
                                          )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                          <button
                                            className="fb-v2-icon-btn"
                                            style={{
                                              width: 22,
                                              height: 22,
                                              fontSize: 11,
                                              background: '#ffffff',
                                              border: '1px solid #cbd5e1',
                                              borderRadius: 4,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                            }}
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
                                            description={`Are you sure you want to delete "${fld.label || fld.db_field || 'this column'}"?`}
                                            onConfirm={(e) => {
                                              e.stopPropagation();
                                              onDeleteField(secIdx, fldIdx);
                                            }}
                                            okText="Delete"
                                            cancelText="Cancel"
                                          >
                                            <button
                                              className="fb-v2-icon-btn danger"
                                              style={{
                                                width: 22,
                                                height: 22,
                                                fontSize: 11,
                                                background: '#ffffff',
                                                border: '1px solid #fca5a5',
                                                borderRadius: 4,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              title="Delete field"
                                            >
                                              <DeleteOutlined />
                                            </button>
                                          </Popconfirm>
                                        </div>
                                      </div>
                                    </th>
                                  );
                                })}
                                <th style={{ textAlign: 'center', paddingBottom: 10, fontSize: 13, fontWeight: 700, color: '#475569', width: 70 }}>
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
                                            {(fld.ui?.prefix || fld.ui?.is_currency || fld.is_currency || fld.type === 'currency') && <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>{fld.ui?.prefix || '₹'}</span>}
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
                                  <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                    style={{ borderRadius: 6, height: 26, width: 26, padding: 0 }}
                                    title="Delete row action"
                                  />
                                </td>
                              </tr>
                            </tbody>
                            {(() => {
                              const hasAnyColTotal = (sec.fields || []).some(
                                (f) => f.show_total || f.show_column_total || f.ui?.show_total || f.calculation?.show_total
                              );
                              if (!hasAnyColTotal) return null;

                              return (
                                <tfoot>
                                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                    {sec.fields.map((fld, fldIdx) => {
                                      const shouldShow = fld.show_total || fld.show_column_total || fld.ui?.show_total || fld.calculation?.show_total;
                                      const isCurr = fld.is_currency || fld.ui?.is_currency || fld.type === 'currency' || fld.ui?.prefix === '₹';
                                      const prefix = fld.ui?.prefix || (isCurr ? '₹' : '');
                                      const suffix = fld.ui?.suffix ? ` ${fld.ui.suffix}` : '';

                                      return (
                                        <td key={`tot_${fld.id || fldIdx}`} style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                                          {shouldShow ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 8px', color: '#1d4ed8', fontWeight: 700, fontSize: 11 }}>
                                              <span>Total:</span>
                                              <span>{prefix}0.00{suffix}</span>
                                            </div>
                                          ) : (
                                            <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 12px' }}>
                                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Summary</span>
                                    </td>
                                  </tr>
                                </tfoot>
                              );
                            })()}
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
                          const isSelectedField = selectedFieldId === fld.id;
                          const isFieldDragOver = dragOverTarget === `fld_${secIdx}_${fldIdx}`;
                          const isFieldDragging =
                            draggedField?.secIdx === secIdx && draggedField?.fldIdx === fldIdx;
                          const isResizingThisField = resizingField?.secIdx === secIdx && resizingField?.fldIdx === fldIdx;
                          const rawColSpan = fld.ui?.col_span || (fld.type === 'add_more' ? 12 : 6);
                          const colSpan = isResizingThisField ? resizingField.liveSpan : rawColSpan;

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
                              draggable={!resizingField}
                              onDragStart={(e) => handleFieldDragStart(e, secIdx, fldIdx)}
                              onDragOver={(e) => handleFieldDragOver(e, secIdx, fldIdx)}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => handleFieldDrop(e, secIdx, fldIdx)}
                              style={{ gridColumn: `span ${colSpan}` }}
                              className={`fb-v2-field-card ${isSelectedField ? 'selected' : ''} ${
                                isFieldDragOver ? 'drag-over' : ''
                              } ${isFieldDragging ? 'dragging' : ''} ${isResizingThisField ? 'is-resizing' : ''}`}
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

                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                              ) : fld.type === 'radio' ? (
                                <div style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
                                  {(fld.options && fld.options.length > 0 ? fld.options : [{ label: 'Option 1' }, { label: 'Option 2' }]).map((opt, oIdx) => (
                                    <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                                      <input type="radio" name={`preview_${fld.id}`} disabled defaultChecked={oIdx === 0} />
                                      {opt.label || opt.name}
                                    </label>
                                  ))}
                                </div>
                              ) : fld.type === 'checkbox_group' ? (
                                <div style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
                                  {(fld.options && fld.options.length > 0 ? fld.options : [{ label: 'Item A' }, { label: 'Item B' }]).map((opt, oIdx) => (
                                    <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                                      <input type="checkbox" disabled defaultChecked={oIdx === 0} />
                                      {opt.label || opt.name}
                                    </label>
                                  ))}
                                </div>
                              ) : fld.type === 'rate' ? (
                                <div style={{ display: 'flex', gap: 4, color: '#f59e0b', fontSize: 18, padding: '2px 0' }}>
                                  {'★'.repeat(fld.count || 5)}
                                </div>
                              ) : fld.type === 'slider' ? (
                                <div style={{ padding: '6px 4px' }}>
                                  <input type="range" disabled style={{ width: '100%', accentColor: '#4f46e5' }} />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                    <span>{fld.min || 0}</span>
                                    <span>{fld.max || 100}</span>
                                  </div>
                                </div>
                              ) : fld.type === 'signature' ? (
                                <div style={{ height: 48, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, gap: 6 }}>
                                  <span>✍️ Signature Pad Area</span>
                                </div>
                              ) : fld.type === 'time' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#64748b' }}>
                                  <span>⏰ 12:00 PM</span>
                                </div>
                              ) : fld.type === 'color' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <input type="color" disabled value="#4f46e5" style={{ border: 'none', width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }} />
                                  <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>#4F46E5</span>
                                </div>
                              ) : fld.type === 'lookup_table' ? (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>🔗 Live Cross-Form Data Table</span>
                                    <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Auto-queries {fld.target_form || 'Form Records'}</Tag>
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>Dynamically displays matching records on form selection</div>
                                </div>
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

                              {/* Right Drag-to-Resize Handle (Elementor-style) */}
                              <div
                                className={`fb-v2-resize-handle ${isResizingThisField ? 'is-active' : ''}`}
                                onMouseDown={(e) => handleResizeMouseDown(e, secIdx, fldIdx, rawColSpan)}
                                title="Drag left/right to stretch or shrink column width (like Elementor)"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="fb-v2-resize-handle-bar" />
                                {isResizingThisField && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: -26,
                                      right: 0,
                                      background: 'var(--primary-color, #15803d)',
                                      color: '#ffffff',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: 6,
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                                      pointerEvents: 'none',
                                      zIndex: 100,
                                    }}
                                  >
                                    {getColSpanLabel(colSpan)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Elementor-Style Row / Column Structure Selector */}
                      <div className="fb-v2-row-layout-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="fb-v2-row-layout-header">
                          <div className="fb-v2-row-layout-title">
                            <PlusCircleOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                            <span>Add Row / Column Layout (Elementor Style)</span>
                          </div>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            Click a structure below to add a new flexible row
                          </span>
                        </div>

                        <div className="fb-v2-layout-presets-grid">
                          {ROW_LAYOUT_PRESETS.map((preset, pIdx) => (
                            <div
                              key={pIdx}
                              className="fb-v2-preset-card"
                              onClick={() => onAddRowWithLayout && onAddRowWithLayout(secIdx, preset.spans)}
                              title={`Add row with ${preset.label} (${preset.desc})`}
                            >
                              <div className="fb-v2-preset-bars">
                                {preset.bars.map((barPct, bIdx) => (
                                  <div
                                    key={bIdx}
                                    className="fb-v2-preset-bar"
                                    style={{ width: `${barPct}%` }}
                                  />
                                ))}
                              </div>
                              <div className="fb-v2-preset-label">{preset.label}</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{preset.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })
        )}

        {/* Add Section Button at the Bottom */}
        {sections.length > 0 && (
          <div className="fb-v2-add-section-bottom-wrap" ref={bottomAddSectionRef}>
            <button
              type="button"
              className="fb-v2-add-section-bottom-btn"
              onClick={() => onAddSection && onAddSection()}
            >
              <PlusOutlined style={{ fontSize: 16 }} />
              <span>Add New Section</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
