'use client';

import React, { useState } from 'react';
import { SearchOutlined, LeftOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

const FIELD_CATEGORIES = [
  {
    category: 'Basic Fields',
    items: [
      { type: 'text', label: 'Text Input', icon: '🔤', group: 'Basic', data_type: 'varchar(255)' },
      { type: 'number', label: 'Number', icon: '🔢', group: 'Basic', data_type: 'integer' },
      { type: 'textarea', label: 'Text Area', icon: '📝', group: 'Basic', data_type: 'text' },
      { type: 'date', label: 'Date Picker', icon: '📅', group: 'Basic', data_type: 'date' },
      { type: 'date_range', label: 'Date Range', icon: '📆', group: 'Basic', data_type: 'daterange' },
    ]
  },
  {
    category: 'Advanced',
    items: [
      { type: 'select', label: 'Dropdown', icon: '🔽', group: 'Advanced', data_type: 'varchar(255)' },
      { type: 'file', label: 'File Upload', icon: '📎', group: 'Advanced', data_type: 'file' },
      { type: 'switch', label: 'Switch', icon: '🔘', group: 'Advanced', data_type: 'boolean' },
    ]
  },
  {
    category: 'Layout & Content',
    items: [
      { type: 'add_more', label: 'Add-More Table', icon: '📊', group: 'Layout & Content', data_type: 'json' },
      { type: 'heading', label: 'Section Break', icon: '🏷️', group: 'Layout & Content' },
      { type: 'note', label: 'Instruction Note', icon: '📌', group: 'Layout & Content' },
      { type: 'custom_html', label: 'Custom HTML', icon: '💻', group: 'Layout & Content' },
    ]
  },
  {
    category: 'Geometry (Spatial)',
    items: [
      { type: 'point', label: 'POI (Point)', icon: '📍', group: 'Geometry', data_type: 'json' },
      { type: 'multipolygon', label: 'MultiPolygon', icon: '⬡', group: 'Geometry', data_type: 'json' },
      { type: 'line', label: 'Line', icon: '📈', group: 'Geometry', data_type: 'json' },
    ]
  }
];

export default function LeftPaletteV2({ onAddField, width = 260, onCollapse }) {
  const [search, setSearch] = useState('');

  const filteredCategories = FIELD_CATEGORIES.map((cat) => {
    const items = cat.items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
    );
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  return (
    <aside className="fb-v2-palette" style={{ width: `${width}px`, minWidth: '180px', maxWidth: '450px' }}>
      <div className="fb-v2-palette-search">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchOutlined style={{ position: 'absolute', left: 10, top: 9, color: '#94a3b8' }} />
            <input
              type="text"
              className="fb-v2-search-input"
              style={{ paddingLeft: '30px', height: '32px', fontSize: '12px' }}
              placeholder="Search fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {onCollapse && (
            <Tooltip title="Collapse sidebar">
              <button
                type="button"
                className="fb-v2-icon-btn"
                onClick={onCollapse}
                style={{ width: 28, height: 28, borderRadius: 6 }}
              >
                <LeftOutlined style={{ fontSize: 11 }} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="fb-v2-palette-scroll">
        {filteredCategories.map((cat) => (
          <div key={cat.category} className="fb-v2-category-group">
            <div className="fb-v2-category-title">{cat.category}</div>
            <div className="fb-v2-field-grid">
              {cat.items.map((item) => (
                <div
                  key={item.type}
                  className="fb-v2-palette-item"
                  onClick={() => onAddField(item)}
                  title={`Click to add ${item.label}`}
                >
                  <span className="fb-v2-item-icon">{item.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

