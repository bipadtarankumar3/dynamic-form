'use client';

import React from 'react';
import { Card, Space, Button, Tag, Tooltip, Switch } from 'antd';
import {
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  RightOutlined,
  DownOutlined,
  HolderOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAntdIconComponent } from '@/modules/form-builder/IconPickerModal';
import SortableSubMenuItem from './SortableSubMenuItem';

export default function SortableRootMenuItem({
  root,
  subs = [],
  isExpanded,
  hasSubs,
  onToggleExpand,
  onCreateSub,
  onEdit,
  onDelete,
  onToggleActive,
  onSubDragEnd,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: root.id });

  const RootIconComp = getAntdIconComponent(root.icon);
  const isSystem = root.is_system === true || root.is_deletable === false;
  const isActive = root.is_active !== false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : (isActive ? 1 : 0.65),
    zIndex: isDragging ? 999 : 'auto',
    background: isActive ? '#ffffff' : '#f8fafc',
    borderLeft: `5px solid ${isActive ? (hasSubs ? (isExpanded ? '#15803d' : '#0284c7') : '#94a3b8') : '#cbd5e1'}`,
    borderRadius: '12px',
    boxShadow: isDragging ? '0 14px 28px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: '12px',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card variant="borderless" styles={{ body: { padding: '14px 20px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space
            size="middle"
            style={{ cursor: 'pointer', flex: 1 }}
            onClick={() => hasSubs && onToggleExpand(root.id)}
          >
            {/* Drag Handle */}
            <Tooltip title="Drag to reorder menu">
              <span
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                style={{
                  cursor: 'grab',
                  color: '#94a3b8',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '15px',
                }}
              >
                <HolderOutlined />
              </span>
            </Tooltip>

            {/* Arrow indicator when root menu has children */}
            {hasSubs ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: isExpanded ? '#dcfce7' : '#f1f5f9',
                  color: isExpanded ? '#15803d' : '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
                title={isExpanded ? 'Click to collapse sub-menus' : 'Click to expand sub-menus'}
              >
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  width: 28,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                }}
              >
                {RootIconComp ? <RootIconComp style={{ fontSize: 16 }} /> : <FolderOutlined style={{ fontSize: 16 }} />}
              </span>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '15px', color: isActive ? '#0f172a' : '#64748b', fontWeight: 700 }}>
                  {root.label}
                </strong>
                <code
                  style={{
                    fontSize: '12px',
                    background: isActive ? 'rgba(21, 128, 61, 0.06)' : '#f1f5f9',
                    color: isActive ? '#15803d' : '#94a3b8',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {root.url || '(Folder Container)'}
                </code>

                {/* Arrow badge for child menus */}
                {hasSubs && (
                  <Tag
                    color="purple"
                    style={{
                      borderRadius: '6px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(root.id);
                    }}
                  >
                    {subs.length} sub-menu(s) {isExpanded ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
                  </Tag>
                )}

                {/* System Menu Badge */}
                {isSystem && (
                  <Tag
                    color="magenta"
                    style={{
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: 11,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <SafetyCertificateOutlined />
                    <span>Core System</span>
                  </Tag>
                )}

                {!isActive && (
                  <Tag color="default" style={{ borderRadius: '4px', fontWeight: 600 }}>
                    Inactive (Hidden)
                  </Tag>
                )}
              </div>
            </div>
          </Space>

          <Space size="middle">
            {/* Active / Inactive Switch Toggle */}
            <Tooltip title={isActive ? 'Click to make Inactive (hide from sidebar)' : 'Click to make Active (show in sidebar)'}>
              <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#15803d' : '#94a3b8' }}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <Switch
                  checked={isActive}
                  onChange={(checked) => onToggleActive && onToggleActive(root, checked)}
                  size="small"
                  style={{ backgroundColor: isActive ? '#16a34a' : '#cbd5e1' }}
                />
              </div>
            </Tooltip>

            <Tag color="processing" style={{ borderRadius: '4px', fontWeight: 600 }}>
              Order: {root.order}
            </Tag>
            <Tooltip title="Add Sub-Menu" color="#16a34a">
              <Button
                size="small"
                icon={<PlusCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSub(root.id);
                }}
                className="menu-action-btn menu-action-add-btn"
              >
                Add Sub-Menu
              </Button>
            </Tooltip>
            <Tooltip title="Edit Menu" color="#7c3aed">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(root);
                }}
                className="menu-action-btn menu-action-edit-btn"
              />
            </Tooltip>

            {/* Protected Delete Button */}
            {isSystem ? (
              <Tooltip title="Core system menu cannot be deleted. You can toggle it Inactive instead." color="#dc2626">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled
                  style={{ opacity: 0.35, cursor: 'not-allowed' }}
                  className="menu-action-btn menu-action-delete-btn"
                />
              </Tooltip>
            ) : (
              <Tooltip title="Delete Menu" color="#dc2626">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(root.id, root.label);
                  }}
                  className="menu-action-btn menu-action-delete-btn"
                />
              </Tooltip>
            )}
          </Space>
        </div>

        {/* Render Sub-Menus with Drag & Drop */}
        {hasSubs && isExpanded && (
          <div
            style={{
              marginLeft: '24px',
              marginTop: '14px',
              borderLeft: '2px dashed #cbd5e1',
              paddingLeft: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <DndContext collisionDetection={closestCenter} onDragEnd={(e) => onSubDragEnd(root.id, e)}>
              <SortableContext items={subs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {subs.map((sub) => (
                  <SortableSubMenuItem
                    key={sub.id}
                    sub={sub}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleActive={onToggleActive}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </Card>
    </div>
  );
}
