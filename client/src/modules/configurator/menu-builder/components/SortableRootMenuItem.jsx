'use client';

import React from 'react';
import { Card, Space, Button, Tag, Tooltip } from 'antd';
import {
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  RightOutlined,
  DownOutlined,
  HolderOutlined,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : 'auto',
    background: '#ffffff',
    borderLeft: `5px solid ${hasSubs ? (isExpanded ? '#15803d' : '#0284c7') : '#94a3b8'}`,
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
                <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{root.label}</strong>
                <code
                  style={{
                    fontSize: '12px',
                    background: 'rgba(21, 128, 61, 0.06)',
                    color: '#15803d',
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
                <Tag color="green" style={{ borderRadius: '4px', fontWeight: 600 }}>
                  🔒 Internal
                </Tag>
              </div>
            </div>
          </Space>

          <Space size="small">
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
            <Tooltip title="Edit" color="#7c3aed">
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
            <Tooltip title="Delete" color="#dc2626">
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
