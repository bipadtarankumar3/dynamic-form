'use client';

import React from 'react';
import { Space, Button, Tag, Tooltip } from 'antd';
import {
  HolderOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAntdIconComponent } from '@/modules/form-builder/IconPickerModal';

export default function SortableSubMenuItem({ sub, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });

  const SubIconComp = getAntdIconComponent(sub.icon);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Space size="middle">
        {/* Drag Handle for Sub-menu */}
        <Tooltip title="Drag to reorder sub-menu">
          <span
            {...attributes}
            {...listeners}
            style={{
              cursor: 'grab',
              color: '#94a3b8',
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '13px',
            }}
          >
            <HolderOutlined />
          </span>
        </Tooltip>

        {/* Sub-menu hierarchy arrow */}
        <span style={{ color: '#15803d', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          ↳
        </span>

        {sub.image ? (
          <img
            src={sub.image}
            alt={sub.label}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              objectFit: 'cover',
              border: '1px solid #e2e8f0',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <span style={{ fontSize: '14px', color: '#10b981', display: 'inline-flex', alignItems: 'center' }}>
            {SubIconComp ? <SubIconComp /> : <LinkOutlined />}
          </span>
        )}

        <div>
          <span style={{ color: '#1e293b', fontWeight: 600, fontSize: 13 }}>{sub.label}</span>
          <code
            style={{
              marginLeft: '10px',
              fontSize: '11px',
              background: '#ffffff',
              color: '#0369a1',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {sub.url || ''}
          </code>
        </div>
      </Space>

      <Space size="small">
        <Tag color="success" style={{ borderRadius: '4px', fontWeight: 600, fontSize: 11 }}>
          Order: {sub.order}
        </Tag>
        <Tooltip title="Edit" color="#7c3aed">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(sub)}
            className="menu-action-btn menu-action-edit-btn"
          />
        </Tooltip>
        <Tooltip title="Delete" color="#dc2626">
          <Button
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(sub.id, sub.label)}
            className="menu-action-btn menu-action-delete-btn"
          />
        </Tooltip>
      </Space>
    </div>
  );
}
