'use client';

import React from 'react';
import { Button } from 'antd';
import { LockOutlined, PlusOutlined } from '@ant-design/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableRootMenuItem from './SortableRootMenuItem';

export default function InternalMenusList({
  internalRootMenus = [],
  getSubMenus,
  expandedKeys = [],
  sensors,
  onToggleExpand,
  onCreateRoot,
  onCreateSub,
  onEdit,
  onDelete,
  onRootDragEnd,
  onSubDragEnd,
}) {
  return (
    <div style={{ paddingTop: '6px' }}>
      {internalRootMenus.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px dashed #cbd5e1',
          }}
        >
          <LockOutlined style={{ fontSize: 32, color: '#94a3b8', marginBottom: 8 }} />
          <div style={{ color: '#64748b', fontWeight: 500, fontSize: 14 }}>
            No internal system menus configured yet.
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateRoot}
            style={{ marginTop: 12, borderRadius: 8, background: '#15803d', borderColor: '#15803d' }}
          >
            Add First Root Menu
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRootDragEnd}>
          <SortableContext items={internalRootMenus.map((r) => r.id || r._id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {internalRootMenus.map((root, idx) => {
                const rootId = root.id || root._id || `root_${idx}`;
                const subs = getSubMenus(rootId);
                const isExpanded = expandedKeys.includes(rootId);
                const hasSubs = subs.length > 0;

                return (
                  <SortableRootMenuItem
                    key={rootId}
                    root={{ ...root, id: rootId }}
                    subs={subs}
                    isExpanded={isExpanded}
                    hasSubs={hasSubs}
                    onToggleExpand={onToggleExpand}
                    onCreateSub={onCreateSub}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSubDragEnd={onSubDragEnd}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
