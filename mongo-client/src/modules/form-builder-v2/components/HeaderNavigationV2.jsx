'use client';

import React from 'react';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Tag, Tooltip, Popconfirm } from 'antd';

export default function HeaderNavigationV2({
  activeTab,
  setActiveTab,
  formTitle,
  isDraft,
  onBack,
  onPreview,
  onSaveDraft,
  onPublish,
  saving,
  isLeftOpen,
  onToggleLeft,
  isRightOpen,
  onToggleRight,
}) {
  const tabs = [
    { key: 'build', label: 'Build' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <header className="fb-v2-header">
      <div className="fb-v2-header-left">
        <Popconfirm
          title="Exit Form Builder?"
          description="Are you sure you want to leave? Any unsaved changes will be lost."
          onConfirm={onBack}
          okText="Exit"
          cancelText="Stay"
          okButtonProps={{ danger: true }}
          placement="bottomLeft"
        >
          <button type="button" className="fb-v2-back-btn" title="Back to Forms">
            <ArrowLeftOutlined />
          </button>
        </Popconfirm>
        <div>
          <h1 className="fb-v2-form-title">
            {formTitle || 'Untitled Form'}
            <Tag
              color={isDraft ? 'warning' : 'success'}
              style={{ borderRadius: 12, padding: '0 10px', fontSize: 11, fontWeight: 700 }}
            >
              {isDraft ? 'DRAFT' : 'PUBLISHED'}
            </Tag>
          </h1>
        </div>
      </div>

      <nav className="fb-v2-header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`fb-v2-nav-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="fb-v2-header-actions">
        {/* VS Code Style Layout Toggles */}
        <div className="fb-v2-layout-controls" title="Layout Customization">
          <Tooltip title={isLeftOpen ? 'Hide Primary Sidebar (Left)' : 'Show Primary Sidebar (Left)'}>
            <button
              type="button"
              className={`fb-v2-layout-btn ${isLeftOpen ? 'active' : ''}`}
              onClick={onToggleLeft}
              aria-label="Toggle Left Sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9zM3.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H6V3H3.5zm3.5 10h5.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5H7v10z"
                  fill={isLeftOpen ? 'var(--primary-color, #15803d)' : '#64748b'}
                />
                {isLeftOpen && (
                  <rect x="3" y="3" width="3" height="10" fill="var(--primary-color, #15803d)" fillOpacity="0.4" />
                )}
              </svg>
            </button>
          </Tooltip>

          <Tooltip title={isRightOpen ? 'Hide Secondary Sidebar (Inspector)' : 'Show Secondary Sidebar (Inspector)'}>
            <button
              type="button"
              className={`fb-v2-layout-btn ${isRightOpen ? 'active' : ''}`}
              onClick={onToggleRight}
              aria-label="Toggle Right Sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9zM12.5 3H10v10h2.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5zM9 13V3H3.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H9z"
                  fill={isRightOpen ? 'var(--primary-color, #15803d)' : '#64748b'}
                />
                {isRightOpen && (
                  <rect x="10" y="3" width="3" height="10" fill="var(--primary-color, #15803d)" fillOpacity="0.4" />
                )}
              </svg>
            </button>
          </Tooltip>
        </div>

        <button className="fb-v2-btn fb-v2-btn-secondary" onClick={onPreview}>
          <EyeOutlined /> Preview
        </button>
        {isDraft && (
          <button className="fb-v2-btn fb-v2-btn-secondary" onClick={onSaveDraft} disabled={saving}>
            <SaveOutlined /> Save Draft
          </button>
        )}
        <button className="fb-v2-btn fb-v2-btn-primary conf-create-btn" onClick={onPublish} disabled={saving}>
          <SendOutlined /> {isDraft ? 'Publish' : 'Save Changes'}
        </button>
      </div>
    </header>
  );
}

