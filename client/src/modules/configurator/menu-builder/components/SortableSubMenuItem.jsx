'use client';

import React from 'react';
import { Space, Button, Tag, Tooltip, Switch } from 'antd';
import {
  HolderOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAntdIconComponent } from '@/modules/form-builder/IconPickerModal';

export default function SortableSubMenuItem({ sub, onEdit, onDelete, onToggleActive }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });

  const SubIconComp = getAntdIconComponent(sub.icon);
  const isSystem = sub.is_system === true || sub.is_deletable === false;
  const isActive = sub.is_active !== false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : (isActive ? 1 : 0.65),
    zIndex: isDragging ? 999 : 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    background: isActive ? '#f8fafc' : '#f1f5f9',
    borderRadius: '8px',
    border: `1px solid ${isActive ? '#e2e8f0' : '#cbd5e1'}`,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Space size="middle" style={{ flex: 1, minWidth: 0 }}>
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
        <span style={{ color: isActive ? '#15803d' : '#94a3b8', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
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
          <span style={{ fontSize: '14px', color: isActive ? '#10b981' : '#94a3b8', display: 'inline-flex', alignItems: 'center' }}>
            {SubIconComp ? <SubIconComp /> : <LinkOutlined />}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: isActive ? '#1e293b' : '#64748b', fontWeight: 600, fontSize: 13 }}>
            {sub.label}
          </span>
          <code
            style={{
              fontSize: '11px',
              background: '#ffffff',
              color: isActive ? '#0369a1' : '#94a3b8',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {sub.url || ''}
          </code>

          {/* System Menu Badge */}
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
                padding: '0 4px',
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
      </Space>

      <Space size="small">
        {/* Active / Inactive Switch Toggle */}
        <Tooltip title={isActive ? 'Click to make Inactive (hide from sidebar)' : 'Click to make Active (show in sidebar)'}>
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Switch
              checked={isActive}
              onChange={(checked) => onToggleActive && onToggleActive(sub, checked)}
              size="small"
              style={{ backgroundColor: isActive ? '#16a34a' : '#cbd5e1' }}
            />
          </div>
        </Tooltip>

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
          <Tooltip title="Delete" color="#dc2626">
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onDelete(sub.id, sub.label)}
              className="menu-action-btn menu-action-delete-btn"
            />
          </Tooltip>
        )}
      </Space>
    </div>
  );
}
