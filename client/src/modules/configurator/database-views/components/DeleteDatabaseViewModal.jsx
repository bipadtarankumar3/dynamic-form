'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Spin,
  Tag,
  Typography,
  Space,
  Badge,
  Card,
  Tooltip,
  App,
} from 'antd';
import {
  DeleteOutlined,
  DatabaseOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  WarningOutlined,
  ReloadOutlined,
  FormOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { privateHttpClient } from '@/services/api/httpClient';

const { Text, Title, Paragraph } = Typography;

export default function DeleteDatabaseViewModal({ visible, viewItem, onCancel, onSuccess }) {
  const { message } = App.useApp();
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkData, setCheckData] = useState(null);

  const viewId = viewItem?.id || viewItem?.view_slug || viewItem?.database_view_name;
  const viewName = viewItem?.view_name || viewItem?.database_view_name || 'Database View';
  const dbViewName = viewItem?.database_view_name || '';

  useEffect(() => {
    if (visible && viewId) {
      fetchPreDeleteCheck();
    } else {
      setCheckData(null);
    }
  }, [visible, viewId]);

  const fetchPreDeleteCheck = async () => {
    try {
      setLoadingCheck(true);
      const res = await privateHttpClient.get(`configurator/database-views/${viewId}/pre-delete-check`);
      if (res?.data) {
        setCheckData(res.data);
      }
    } catch (err) {
      console.error('Failed to check view dependencies:', err);
      message.error(err?.response?.data?.message || 'Failed to inspect view dependencies');
    } finally {
      setLoadingCheck(false);
    }
  };

  const isGuarded = checkData && !checkData.canDropDirectly;

  const handleDrop = async () => {
    try {
      setDeleting(true);
      const res = await privateHttpClient.delete(`configurator/database-views/${viewId}`);

      message.success(res?.data?.message || `Database View "${viewName}" dropped successfully`);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error dropping database view:', err);
      message.error(err?.response?.data?.message || 'Failed to drop database view');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={deleting ? undefined : onCancel}
      footer={null}
      width={700}
      centered
      destroyOnHidden
      closable={false}
      wrapClassName="db-drop-modal"
      styles={{
        mask: { backdropFilter: 'blur(5px)', backgroundColor: 'rgba(15, 23, 42, 0.55)' },
        content: {
          borderRadius: 16,
          padding: '24px 28px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.22)',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(226, 232, 240, 0.9)',
        },
      }}
    >
      {/* Modal Header */}
      <div className="db-drop-header">
        <div className={`db-drop-icon-badge ${isGuarded ? 'db-drop-icon-badge--warning' : 'db-drop-icon-badge--danger'}`}>
          {isGuarded ? <WarningOutlined /> : <DeleteOutlined />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="db-drop-title-row">
            <h3 className="db-drop-title">
              {isGuarded ? 'Database View Dependency Check' : 'Drop PostgreSQL View'}
            </h3>
            {checkData && (
              <span className={`db-drop-status-badge ${isGuarded ? 'db-drop-status-badge--guarded' : 'db-drop-status-badge--safe'}`}>
                {isGuarded ? <WarningOutlined /> : <CheckCircleOutlined />}
                {isGuarded ? 'Action Blocked' : 'Safe to Drop'}
              </span>
            )}
          </div>
          <div className="db-drop-subtitle">
            <span>Dependency verification for</span>
            <span className="db-view-pill-name">{viewName}</span>
            <span className="db-view-code-pill">public.{dbViewName}</span>
          </div>
        </div>

        {/* Crisp Header Close Button */}
        <button
          type="button"
          onClick={deleting ? undefined : onCancel}
          disabled={deleting}
          style={{
            background: '#f1f5f9',
            border: 'none',
            cursor: deleting ? 'not-allowed' : 'pointer',
            width: 32,
            height: 32,
            borderRadius: '50%',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.color = '#1e293b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#64748b';
          }}
          aria-label="Close"
        >
          <CloseOutlined style={{ fontSize: 13 }} />
        </button>
      </div>

      {/* Loading State */}
      {loadingCheck ? (
        <div style={{ padding: '44px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#334155', fontSize: 13.5, fontWeight: 600 }}>
            Inspecting connected Form Admin Listing columns & database dependencies...
          </div>
          <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 12 }}>
            Querying PostgreSQL view catalogs and metadata relations
          </div>
        </div>
      ) : checkData ? (
        <div>
          {/* Direct Safe Deletion (No dependencies) */}
          {!isGuarded ? (
            <div>
              {/* Safe Alert Banner */}
              <div className="db-safe-banner">
                <div className="db-safe-banner-icon">
                  <CheckOutlined />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="db-safe-banner-title">Safe to Drop View</div>
                  <p className="db-safe-banner-desc">
                    This database view is not connected to any Form Admin Listing Columns and has no dependent database views. It can be dropped safely from PostgreSQL.
                  </p>
                </div>
              </div>

              {/* 3-Column Specifications Grid */}
              <div className="db-specs-grid">
                <div className="db-spec-card">
                  <div className="db-spec-label">
                    <DatabaseOutlined style={{ color: '#0284c7' }} />
                    PostgreSQL View
                  </div>
                  <div className="db-spec-value db-spec-value--mono">
                    public.{dbViewName}
                  </div>
                </div>

                <div className="db-spec-card">
                  <div className="db-spec-label">
                    <ApartmentOutlined style={{ color: '#6366f1' }} />
                    Base Table
                  </div>
                  <div className="db-spec-value db-spec-value--mono db-spec-value--table">
                    {checkData.view?.base_table || 'N/A'}
                  </div>
                </div>

                <div className="db-spec-card">
                  <div className="db-spec-label">
                    <FormOutlined style={{ color: '#16a34a' }} />
                    Connected Forms
                  </div>
                  <div className="db-spec-badge-zero">
                    <span className="db-spec-badge-zero-dot" />
                    0 forms
                  </div>
                </div>
              </div>

              {/* SQL Callout Notice */}
              <div className="db-sql-callout">
                <div className="db-sql-callout-left">
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0 }}>
                    SQL Execution:
                  </span>
                  <span className="db-sql-cmd">
                    DROP VIEW IF EXISTS public.{dbViewName} CASCADE;
                  </span>
                </div>
                <span className="db-sql-perm-pill">Irreversible</span>
              </div>

              {/* Action Buttons */}
              <div className="db-modal-footer-flex">
                <Button
                  onClick={onCancel}
                  disabled={deleting}
                  className="db-btn-cancel-custom"
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  danger
                  loading={deleting}
                  icon={<DeleteOutlined />}
                  onClick={handleDrop}
                  className="db-btn-danger-drop"
                >
                  Drop Database View
                </Button>
              </div>
            </div>
          ) : (
            /* Guarded Deletion (Dependencies exist) */
            <div>
              {/* Guarded Alert Banner */}
              <div className="db-guarded-banner">
                <div className="db-guarded-banner-icon">
                  <WarningOutlined />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="db-guarded-banner-title">
                    Cannot Drop Database View: Connected to Form Admin Listing Columns
                  </div>
                  <p className="db-guarded-banner-desc">
                    This database view is actively configured as the data source for Admin Listing Columns in one or more forms. Dropping it would break the table data grid rendering.
                  </p>
                </div>
              </div>

              {/* Resource Breakdown Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                {/* Connected Forms */}
                {checkData.details?.connectedForms?.length > 0 && (
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Space size={6}>
                        <FormOutlined style={{ color: '#0284c7', fontSize: 15 }} />
                        <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                          Connected Form Schemas (Admin Listing Columns)
                        </Text>
                      </Space>
                      <Badge
                        count={`${checkData.details.connectedForms.length} connected form(s)`}
                        style={{ backgroundColor: '#ef4444' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {checkData.details.connectedForms.map((f) => (
                        <Tag
                          key={f.id || f.slug}
                          color="blue"
                          style={{
                            borderRadius: 6,
                            padding: '4px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                          }}
                        >
                          <FormOutlined />
                          <strong>{f.title}</strong>
                          <span style={{ opacity: 0.7 }}>({f.slug})</span>
                        </Tag>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Other Database Views */}
                {checkData.details?.dbDependencies?.length > 0 && (
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Space size={6}>
                        <DatabaseOutlined style={{ color: '#7c3aed', fontSize: 15 }} />
                        <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                          Dependent Database Views
                        </Text>
                      </Space>
                      <Badge
                        count={`${checkData.details.dbDependencies.length} dependent view(s)`}
                        style={{ backgroundColor: '#7c3aed' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {checkData.details.dbDependencies.map((dep, idx) => (
                        <Tag key={idx} color="purple" style={{ borderRadius: 6 }}>
                          {dep.dependent_view || dep}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Action Guidance */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <SafetyCertificateOutlined style={{ color: '#ea580c', fontSize: 15 }} />
                  <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                    Required Steps Before Dropping View
                  </Text>
                </div>
                <Paragraph style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                  To safely drop this view without causing runtime errors:
                </Paragraph>
                <ul style={{ fontSize: 12, color: '#64748b', paddingLeft: 18, margin: 0 }}>
                  <li style={{ marginBottom: 3 }}>
                    Open <strong>Forms Builder</strong> &gt; click <strong>Form Actions</strong> on the connected form(s) above.
                  </li>
                  <li style={{ marginBottom: 3 }}>
                    Change the <strong>Database View Source</strong> to another view or the default view.
                  </li>
                  <li>
                    Click <strong>"Re-check"</strong> below. Once disconnected, view deletion will be enabled.
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    size="middle"
                    onClick={fetchPreDeleteCheck}
                    loading={loadingCheck}
                    style={{ borderRadius: 8, fontWeight: 500 }}
                  >
                    Re-check
                  </Button>
                  <Button
                    icon={<LinkOutlined />}
                    size="middle"
                    href="/techcsr/configurator/formsbuilder"
                    target="_blank"
                    style={{ borderRadius: 8 }}
                  >
                    Go to Forms Builder
                  </Button>
                </Space>

                <Space>
                  <Button onClick={onCancel} disabled={deleting} className="db-btn-cancel-custom">
                    Close
                  </Button>
                  <Tooltip title="View cannot be dropped while connected to Form Admin Listing Columns. Please disconnect it first.">
                    <Button
                      type="primary"
                      danger
                      disabled={true}
                      icon={<DeleteOutlined />}
                      style={{
                        borderRadius: 8,
                        opacity: 0.5,
                        cursor: 'not-allowed',
                      }}
                    >
                      Drop View (Disabled)
                    </Button>
                  </Tooltip>
                </Space>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
