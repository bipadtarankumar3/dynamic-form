'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Spin,
  Alert,
  Tag,
  Typography,
  Divider,
  Space,
  Badge,
  Card,
  Tooltip,
  App,
} from 'antd';
import {
  ExclamationCircleFilled,
  DeleteOutlined,
  DatabaseOutlined,
  TableOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { privateHttpClient } from '@/services/api/httpClient';

const { Text, Title, Paragraph } = Typography;

export default function DeleteFormModalV2({ visible, formItem, onCancel, onSuccess }) {
  const { message } = App.useApp();
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkData, setCheckData] = useState(null);

  const formId = formItem?.id || formItem?.form_id || formItem?.slug;
  const formTitle = formItem?.title || formItem?.name || 'Untitled Form';
  const formSlug = formItem?.slug || '';

  // Fetch dependency check whenever modal opens with a valid form
  useEffect(() => {
    if (visible && formId) {
      fetchPreDeleteCheck();
    } else {
      setCheckData(null);
    }
  }, [visible, formId]);

  const fetchPreDeleteCheck = async () => {
    try {
      setLoadingCheck(true);
      const res = await privateHttpClient.get(`configurator/form-schemas/${formId}/pre-delete-check`);
      if (res?.data) {
        setCheckData(res.data);
      }
    } catch (err) {
      console.error('Failed to check form dependencies:', err);
      message.error(err?.response?.data?.message || 'Failed to inspect form dependencies');
    } finally {
      setLoadingCheck(false);
    }
  };

  const isDraft = formItem?.is_draft !== false && checkData?.form?.is_draft !== false;
  const isGuarded = !isDraft || (checkData && !checkData.canDeleteDirectly);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await privateHttpClient.delete(`configurator/form-schemas/${formId}`);

      message.success(res?.data?.message || 'Form deleted successfully');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error during form deletion:', err);
      message.error(err?.response?.data?.message || 'Failed to delete form');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={deleting ? undefined : onCancel}
      footer={null}
      width={880}
      centered
      destroyOnHidden
      closable={false}
      styles={{
        mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.45)' },
        content: {
          borderRadius: 16,
          padding: '24px 30px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
        },
      }}
    >
      {/* Modal Header with Crisp Clean Close Icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {isGuarded ? <WarningOutlined /> : <DeleteOutlined />}
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 700, fontSize: 18 }}>
              {isGuarded ? 'Form Dependency & Deletion Check' : 'Delete Form Schema'}
            </Title>
            <Text type="secondary" style={{ fontSize: 13, color: '#64748b' }}>
              Dependency verification for <Tag color="blue" style={{ fontWeight: 600, marginLeft: 4 }}>{formTitle}</Tag> (<Text code>{formSlug}</Text>)
            </Text>
          </div>
        </div>

        {/* Dedicated Clean Close Button */}
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
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#64748b';
          }}
          title="Close Modal"
        >
          <CloseOutlined style={{ fontSize: 14, fontWeight: 700 }} />
        </button>
      </div>

      {/* Loading Inspection State */}
      {loadingCheck ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 14, color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            Inspecting database records, dynamic tables, and attached database views...
          </div>
        </div>
      ) : checkData ? (
        <div>
          {/* Direct Safe Deletion (No dependencies) */}
          {!isGuarded ? (
            <div>
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                message="No Active Dependencies Found"
                description="This form schema has no inserted records, no dependent database views, and no child forms. It is safe to delete immediately."
                style={{ borderRadius: 10, marginBottom: 20, border: '1px solid #bbf7d0', background: '#f0fdf4' }}
              />

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Table Name</Text>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {checkData.details?.primaryTable?.table_name || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Inserted Records</Text>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a' }}>0 records</div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Attached Views</Text>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a' }}>0 views</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button onClick={onCancel} disabled={deleting} style={{ borderRadius: 8 }}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  danger
                  loading={deleting}
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(false)}
                  style={{ borderRadius: 8 }}
                >
                  Delete Form
                </Button>
              </div>
            </div>
          ) : (
            /* Guarded Deletion (Dependencies exist) */
            <div>
              {!isDraft ? (
                <Alert
                  type="error"
                  showIcon
                  icon={<WarningOutlined style={{ color: '#dc2626' }} />}
                  message="Published Form Cannot Be Deleted"
                  description="This form has already been published. In Form Builder, deletion is only permitted for draft forms to protect provisioned database schemas and live data."
                  style={{ borderRadius: 10, marginBottom: 16, border: '1px solid #fecaca', background: '#fff5f5' }}
                />
              ) : (
                <Alert
                  type="error"
                  showIcon
                  icon={<WarningOutlined style={{ color: '#dc2626' }} />}
                  message="Cannot Delete Form Directly"
                  description="This form cannot be deleted directly because active records or database views depend on it. You must clean dependent resources or confirm cascade cleanup to proceed."
                  style={{ borderRadius: 10, marginBottom: 16, border: '1px solid #fecaca', background: '#fff5f5' }}
                />
              )}

              {/* Resource Breakdown: 2-Column Responsive Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: checkData.details?.views?.length > 0 || checkData.details?.childForms?.length > 0 ? '1.1fr 0.9fr' : '1fr',
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                {/* 1. Database Table Records */}
                <Card
                  size="small"
                  style={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Space size={6}>
                      <TableOutlined style={{ color: '#0284c7', fontSize: 15 }} />
                      <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                        Database Records & Tables
                      </Text>
                    </Space>
                    <Badge
                      count={`${checkData.summary?.totalRecordsCount || 0} total records`}
                      style={{ backgroundColor: checkData.summary?.totalRecordsCount > 0 ? '#ef4444' : '#10b981' }}
                    />
                  </div>

                  <div style={{ flex: 1, fontSize: 12, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Primary Table (<Text code style={{ fontSize: 11 }}>{checkData.details?.primaryTable?.table_name}</Text>):</span>
                      <strong>{checkData.details?.primaryTable?.count || 0} rows</strong>
                    </div>

                    {checkData.details?.childTables?.length > 0 && (
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
                        <span style={{ color: '#64748b', fontSize: 11 }}>Child Add-More Tables:</span>
                        {checkData.details.childTables.map((ct) => (
                          <div key={ct.table_name} style={{ display: 'flex', justifyContent: 'space-between', marginLeft: 6, padding: '1px 0' }}>
                            <Text code style={{ fontSize: 11 }}>{ct.table_name}</Text>
                            <strong>{ct.count || 0} rows</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {checkData.details?.formsDataCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Submissions Store (<Text code style={{ fontSize: 11 }}>t_forms_data</Text>):</span>
                        <strong>{checkData.details?.formsDataCount} records</strong>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 2 & 3. Views and Child Forms Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Database Views */}
                  {checkData.details?.views?.length > 0 && (
                    <Card
                      size="small"
                      style={{
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        flex: 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Space size={6}>
                          <DatabaseOutlined style={{ color: '#7c3aed', fontSize: 15 }} />
                          <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                            PostgreSQL Database Views
                          </Text>
                        </Space>
                        <Badge
                          count={`${checkData.details.views.length} views`}
                          style={{ backgroundColor: '#7c3aed' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {checkData.details.views.map((v) => (
                          <Tag
                            key={v.id || v.view_slug}
                            color="purple"
                            style={{
                              borderRadius: 6,
                              padding: '3px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                            }}
                          >
                            <DatabaseOutlined />
                            <strong>{v.view_name || v.database_view_name}</strong>
                            <span style={{ opacity: 0.7 }}>({v.database_view_name})</span>
                          </Tag>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Child Forms */}
                  {checkData.details?.childForms?.length > 0 && (
                    <Card
                      size="small"
                      style={{
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        flex: 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Space size={6}>
                          <ApartmentOutlined style={{ color: '#ea580c', fontSize: 15 }} />
                          <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                            Linked Child Forms
                          </Text>
                        </Space>
                        <Badge
                          count={`${checkData.details.childForms.length} child forms`}
                          style={{ backgroundColor: '#ea580c' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {checkData.details.childForms.map((cf) => (
                          <Tag key={cf.id} color="orange" style={{ borderRadius: 6, padding: '3px 8px', fontSize: 12 }}>
                            {cf.title} ({cf.slug})
                          </Tag>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Action Guidance & Instructions Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '16px 18px',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <SafetyCertificateOutlined style={{ color: '#ea580c', fontSize: 16 }} />
                  <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                    Required Steps Before Deletion
                  </Text>
                </div>
                <Paragraph style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                  Direct form deletion is disabled to prevent database integrity errors. Please clean all dependent objects first:
                </Paragraph>
                <ul style={{ fontSize: 12, color: '#64748b', paddingLeft: 18, margin: 0 }}>
                  {checkData.details?.views?.length > 0 && (
                    <li style={{ marginBottom: 4 }}>
                      <strong>Database Views:</strong> Open <em>Database Views</em> to drop or remove the {checkData.details.views.length} attached view(s).
                    </li>
                  )}
                  {checkData.summary?.totalRecordsCount > 0 && (
                    <li style={{ marginBottom: 4 }}>
                      <strong>Inserted Records:</strong> Delete the {checkData.summary.totalRecordsCount} inserted record(s) from this form.
                    </li>
                  )}
                  {checkData.details?.childForms?.length > 0 && (
                    <li style={{ marginBottom: 4 }}>
                      <strong>Child Forms:</strong> Unlink or delete the {checkData.details.childForms.length} child form(s).
                    </li>
                  )}
                  <li>
                    Once all items above are cleaned, click <strong>"Re-check"</strong> below to enable deletion.
                  </li>
                </ul>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  {checkData.details?.views?.length > 0 && (
                    <Button
                      icon={<LinkOutlined />}
                      size="middle"
                      href="/techcsr/configurator/database-views"
                      target="_blank"
                      style={{ borderRadius: 8 }}
                    >
                      Manage Views
                    </Button>
                  )}
                </Space>

                <Space>
                  <Button onClick={onCancel} disabled={deleting} style={{ borderRadius: 8 }}>
                    Close
                  </Button>
                  <Tooltip title="Form schema cannot be deleted while records or database views exist. Please clean them first.">
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
                      Delete Form (Disabled)
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
