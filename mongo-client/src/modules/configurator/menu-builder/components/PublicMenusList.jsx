'use client';

import React from 'react';
import { Button } from 'antd';
import { GlobalOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortablePublicMenuItem from './SortablePublicMenuItem';

export default function PublicMenusList({
  publicMenus = [],
  sensors,
  onCreatePublic,
  onEdit,
  onDelete,
  onPublicDragEnd,
}) {
  return (
    <div style={{ paddingTop: '6px' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onPublicDragEnd}>
        <SortableContext items={publicMenus.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {publicMenus.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1',
                }}
              >
                <GlobalOutlined style={{ fontSize: 32, color: '#94a3b8', marginBottom: 8 }} />
                <div style={{ color: '#64748b', fontWeight: 500, fontSize: 14 }}>
                  No public website menus configured yet.
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={onCreatePublic}
                  style={{ marginTop: 12, borderRadius: 8, background: '#0284c7', borderColor: '#0284c7' }}
                >
                  Add First Public Menu
                </Button>
              </div>
            ) : (
              publicMenus.map((pub) => (
                <SortablePublicMenuItem
                  key={pub.id}
                  pub={pub}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
