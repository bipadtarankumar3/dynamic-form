'use client';

import React from 'react';
import { Card, Space, Button, Tag, Tooltip } from 'antd';
import {
  GlobalOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAntdIconComponent } from '@/modules/form-builder/IconPickerModal';

export default function SortablePublicMenuItem({ pub, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pub.id });

  const PublicIconComp = getAntdIconComponent(pub.icon);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : 'auto',
    background: '#ffffff',
    borderLeft: '5px solid #0284c7',
    borderRadius: '12px',
    boxShadow: isDragging ? '0 14px 28px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: '12px',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card variant="borderless" styles={{ body: { padding: '14px 20px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            {/* Drag Handle */}
            <Tooltip title="Drag to reorder public menu">
              <span
                {...attributes}
                {...listeners}
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

            <span
              style={{
                display: 'inline-flex',
                width: 28,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: '#e0f2fe',
                color: '#0284c7',
                fontSize: 15,
              }}
            >
              {PublicIconComp ? <PublicIconComp /> : <GlobalOutlined />}
            </span>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                  {pub.label}
                </strong>
                <code
                  style={{
                    fontSize: '12px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {pub.url || '/public/...'}
                </code>
                <Tag color="cyan" style={{ borderRadius: '4px', fontWeight: 600 }}>
                  🌐 Public Website
                </Tag>
              </div>
            </div>
          </Space>

          <Space size="small">
            <Tag color="processing" style={{ borderRadius: '4px', fontWeight: 600 }}>
              Order: {pub.order}
            </Tag>
            <Tooltip title="Edit" color="#7c3aed">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(pub)}
                className="menu-action-btn menu-action-edit-btn"
              />
            </Tooltip>
            <Tooltip title="Delete" color="#dc2626">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onDelete(pub.id, pub.label)}
                className="menu-action-btn menu-action-delete-btn"
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
    </div>
  );
}
