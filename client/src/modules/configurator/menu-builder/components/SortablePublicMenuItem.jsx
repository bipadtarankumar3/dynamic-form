'use client';

import React from 'react';
import { Card, Space, Button, Tag, Tooltip, Switch } from 'antd';
import {
  GlobalOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAntdIconComponent } from '@/modules/form-builder/IconPickerModal';

export default function SortablePublicMenuItem({ pub, onEdit, onDelete, onToggleActive }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pub.id });

  const PublicIconComp = getAntdIconComponent(pub.icon);
  const isSystem = pub.is_system === true || pub.is_deletable === false;
  const isActive = pub.is_active !== false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : (isActive ? 1 : 0.65),
    zIndex: isDragging ? 999 : 'auto',
    background: isActive ? '#ffffff' : '#f8fafc',
    borderLeft: `5px solid ${isActive ? '#0284c7' : '#cbd5e1'}`,
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
                background: isActive ? '#e0f2fe' : '#f1f5f9',
                color: isActive ? '#0284c7' : '#94a3b8',
                fontSize: 15,
              }}
            >
              {PublicIconComp ? <PublicIconComp /> : <GlobalOutlined />}
            </span>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '15px', color: isActive ? '#0f172a' : '#64748b', fontWeight: 700 }}>
                  {pub.label}
                </strong>
                <code
                  style={{
                    fontSize: '12px',
                    background: isActive ? '#e0f2fe' : '#f1f5f9',
                    color: isActive ? '#0369a1' : '#94a3b8',
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
                {isSystem && (
                  <Tag
                    color="magenta"
                    style={{
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <SafetyCertificateOutlined />
                    <span>Core</span>
                  </Tag>
                )}
                {!isActive && (
                  <Tag color="default" style={{ borderRadius: '4px', fontWeight: 600, fontSize: 10 }}>
                    Inactive
                  </Tag>
                )}
              </div>
            </div>
          </Space>

          <Space size="middle">
            {/* Active / Inactive Switch Toggle */}
            <Tooltip title={isActive ? 'Click to make Inactive (hide from website)' : 'Click to make Active (show on website)'}>
              <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#0284c7' : '#94a3b8' }}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <Switch
                  checked={isActive}
                  onChange={(checked) => onToggleActive && onToggleActive(pub, checked)}
                  size="small"
                  style={{ backgroundColor: isActive ? '#0284c7' : '#cbd5e1' }}
                />
              </div>
            </Tooltip>

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
              <Tooltip title="Delete" color="#dc2626">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(pub.id, pub.label)}
                  className="menu-action-btn menu-action-delete-btn"
                />
              </Tooltip>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
}
