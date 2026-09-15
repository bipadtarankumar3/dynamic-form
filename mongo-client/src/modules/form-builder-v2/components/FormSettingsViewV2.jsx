'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Select,
  Switch,
  Tag,
  Alert,
  App,
} from 'antd';
import {
  SettingOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  ApartmentOutlined,
  TableOutlined,
  BranchesOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { dynamicSchemaDetailsAPI } from '@/services/dynamicForm-service';
import { privateHttpClient } from '@/services/api/httpClient';

export default function FormSettingsViewV2({
  schema,
  onUpdateSchema,
  allFormsList = [],
}) {
  const { message } = App.useApp();
  // Fetch parent form's full schema (with sections & fields) when parent_form_id changes
  const [parentFormSchema, setParentFormSchema] = useState(null);
  const [parentSchemaLoading, setParentSchemaLoading] = useState(false);

  useEffect(() => {
    if (!schema.parent_form_id) {
      setParentFormSchema(null);
      return;
    }
    // Find the parent form slug from the list
    const parentForm = (allFormsList || []).find(
      (f) => String(f.form_id || f.id) === String(schema.parent_form_id)
    );
    const parentSlug = parentForm?.slug;
    if (!parentSlug) return;

    setParentSchemaLoading(true);
    dynamicSchemaDetailsAPI({ form_slug: parentSlug })
      .then((res) => {
        setParentFormSchema(res?.data?.data || res?.data || null);
      })
      .catch(() => setParentFormSchema(null))
      .finally(() => setParentSchemaLoading(false));
  }, [schema.parent_form_id, allFormsList]);

  return (
    <div style={{ width: '100%', height: '100%', padding: '28px 36px', overflowY: 'auto', background: '#f8fafc' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Informative Note for Triggers */}
        <Alert
          showIcon
          icon={<ThunderboltOutlined style={{ color: 'var(--primary-color, #15803d)', fontSize: 18 }} />}
          message={
            <span style={{ fontWeight: 600, fontSize: 13.5, color: '#1e1b4b' }}>
              Database Triggers & Cross-Table Automations
            </span>
          }
          description={
            <span style={{ fontSize: 12.5, color: '#475569' }}>
              Database triggers and balance rollups can be created directly from the{' '}
              <strong>Forms Listing Menu</strong> once this form has been <strong>Published</strong>.
            </span>
          }
          type="info"
          style={{
            borderRadius: 12,
            border: '1px solid #c7d2fe',
            background: '#eef2ff',
            padding: '14px 20px',
          }}
        />

        {/* General Form Properties Card - 100% Full Width */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700 }}>
              <SettingOutlined style={{ fontSize: 18 }} />
              <span>General Form Metadata & Configuration</span>
            </div>
          }
          style={{
            width: '100%',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            background: '#ffffff',
          }}
          styles={{ body: { padding: '28px 32px' } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Form Title
              </label>
              <Input
                size="large"
                value={schema.title || schema.name || ''}
                onChange={(e) => onUpdateSchema({ title: e.target.value, name: e.target.value })}
                placeholder="e.g. Project Payment Form"
                style={{ borderRadius: 8, fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Form Slug
                </label>
                <Input
                  size="large"
                  value={schema.slug || ''}
                  disabled
                  style={{ borderRadius: 8, background: '#f8fafc', color: '#64748b', fontWeight: 500 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Database Table Name
                </label>
                <Input
                  size="large"
                  value={schema.table_name || schema.slug}
                  disabled
                  style={{ borderRadius: 8, background: '#f8fafc', color: '#64748b', fontWeight: 500 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Modal / Dialog Width
                </label>
                <Select
                  size="large"
                  value={schema.dialog_width || 'medium'}
                  style={{ width: '100%', borderRadius: 8 }}
                  onChange={(val) => onUpdateSchema({ dialog_width: val })}
                  options={[
                    { value: 'small', label: 'Small (500px)' },
                    { value: 'medium', label: 'Medium (750px)' },
                    { value: 'large', label: 'Large (1000px)' },
                    { value: 'full', label: 'Full Width (1200px)' },
                  ]}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Layout Mode
                </label>
                <Select
                  size="large"
                  value={schema.layout || 'vertical'}
                  style={{ width: '100%', borderRadius: 8 }}
                  onChange={(val) => onUpdateSchema({ layout: val })}
                  options={[
                    { value: 'vertical', label: 'Vertical (Labels on top)' },
                    { value: 'horizontal', label: 'Horizontal (Labels left)' },
                    { value: 'inline', label: 'Inline (Compact)' },
                  ]}
                />
              </div>
            </div>

            {/* Parent Form Relationship */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <LinkOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                  Parent Form Relationship (One-to-Many)
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Link this form as a child to another form. A <code>parent_id</code> column will automatically be managed.
              </div>

              <div style={{ maxWidth: 400 }}>
                <Select
                  size="large"
                  allowClear
                  showSearch
                  placeholder="Select Parent Form..."
                  style={{ width: '100%' }}
                  value={schema.parent_form_id ? String(schema.parent_form_id) : undefined}
                  onChange={async (val) => {
                    const parentFormId = val ? String(val) : null;
                    onUpdateSchema({ parent_form_id: parentFormId });

                    // Auto sync parent foreign key on backend
                    const formId = schema?.id || schema?.form_id;
                    const slug = schema?.slug;
                    const tableName = schema?.table_name || slug || null;

                    if (formId || slug || tableName) {
                      try {
                        const res = await privateHttpClient.post('configurator/form-schemas/sync-parent-foreign-key', {
                          form_id: formId,
                          slug,
                          table_name: tableName,
                          parent_form_id: parentFormId,
                        });
                        if (res?.data?.success) {
                          if (parentFormId) {
                            message.success(res.data.message || 'Parent form selected. Column parent_id & Foreign Key constraint updated.');
                          } else {
                            message.info('Parent form unlinked and Foreign Key constraint removed.');
                          }
                        }
                      } catch (err) {
                        console.warn('Error syncing parent foreign key:', err);
                      }
                    }
                  }}
                  options={(allFormsList || [])
                    .filter((f) => String(f.form_id || f.id) !== String(schema.form_id || schema.id))
                    .map((f) => ({
                      label: `${f.title || f.name} (${f.slug})`,
                      value: String(f.form_id || f.id),
                    }))}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Parent Field Inheritance Card — only shown when a parent form is selected */}
        {schema.parent_form_id && (() => {
          // Find the parent form from allFormsList
          const parentForm = (allFormsList || []).find(
            (f) => String(f.form_id || f.id) === String(schema.parent_form_id)
          );

          // Collect all fields from the fetched parent form schema's sections
          const parentSections = parentFormSchema?.sections || parentForm?.sections || [];
          const parentFields = parentSections
            .flatMap((sec) => {
              const fields = Array.isArray(sec.fields)
                ? sec.fields
                : typeof sec.fields === 'string'
                ? (() => { try { return JSON.parse(sec.fields); } catch { return []; } })()
                : [];
              return fields;
            })
            .filter((f) => f && (f.column_name || f.db_field))
            .map((f) => ({
              column_name: f.column_name || f.db_field,
              label: f.label || f.column_name || f.db_field,
            }));

          // Current selected display_fields
          const currentDisplayFields = Array.isArray(schema.relation_with_parent?.display_fields)
            ? schema.relation_with_parent.display_fields
            : [];
          const selectedKeys = currentDisplayFields.map((f) => f.column_name);

          return (
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700 }}>
                  <BranchesOutlined style={{ fontSize: 18, color: '#0891b2' }} />
                  <span>Parent Field Inheritance</span>
                  {parentSchemaLoading && <LoadingOutlined style={{ fontSize: 14, color: '#0891b2' }} />}
                </div>
              }
              style={{
                width: '100%',
                borderRadius: 16,
                border: '1px solid #e0f2fe',
                boxShadow: '0 4px 16px rgba(8, 145, 178, 0.06)',
                background: '#ffffff',
              }}
              styles={{ body: { padding: '24px 32px' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  Select which fields from the <strong>{parentForm?.title || 'parent form'}</strong> should
                  be displayed as a <strong>read-only reference panel</strong> at the top of this form&apos;s
                  view page (when a parent record is linked).
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>
                    Fields to show from parent record
                  </label>
                  {parentSchemaLoading ? (
                    <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                      <LoadingOutlined spin /> Loading fields from {parentForm?.title || 'parent form'}...
                    </div>
                  ) : parentFields.length === 0 ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="No fields found on the selected parent form. Please ensure the parent form has sections and fields saved."
                      style={{ borderRadius: 8 }}
                    />
                  ) : (
                    <Select
                      mode="multiple"
                      size="large"
                      showSearch
                      allowClear
                      filterOption={(input, option) =>
                        String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                      }
                      style={{ width: '100%' }}
                      placeholder="Search and select parent fields to display…"
                      value={selectedKeys}
                      onChange={(selectedColumnNames) => {
                        const newDisplayFields = selectedColumnNames.map((col) => {
                          const existing = currentDisplayFields.find((f) => f.column_name === col);
                          if (existing) return existing;
                          const match = parentFields.find((f) => f.column_name === col);
                          return match || { column_name: col, label: col };
                        });
                        onUpdateSchema({
                          relation_with_parent: {
                            ...(schema.relation_with_parent || {}),
                            display_fields: newDisplayFields,
                          },
                        });
                      }}
                      options={parentFields.map((f) => ({
                        label: `${f.label} (${f.column_name})`,
                        value: f.column_name,
                      }))}
                    />
                  )}
                </div>

                {currentDisplayFields.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {currentDisplayFields.map((f) => (
                      <Tag key={f.column_name} color="cyan" style={{ borderRadius: 8, fontWeight: 500 }}>
                        {f.label}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })()}

        {/* Approval Workflow & Reviews Configuration Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700 }}>
              <ApartmentOutlined style={{ fontSize: 18, color: '#4f46e5' }} />
              <span>Approval Workflow & Reviews</span>
            </div>
          }
          style={{
            width: '100%',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            background: '#ffffff',
          }}
          styles={{ body: { padding: '24px 32px' } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                  Enable Approval Workflow for this Form
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                  When enabled, records submitted under this form will display the multi-step approval workflow tracker and approver sign-off panel on their detail/view pages.
                </div>
              </div>
              <Switch
                checked={!!schema.enable_approval}
                onChange={(checked) => onUpdateSchema({ enable_approval: checked })}
              />
            </div>

            {schema.enable_approval && (
              <Alert
                type="info"
                showIcon
                message={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#1e1b4b' }}>
                      Approval workflow active for slug <strong>{schema.slug}</strong>. Make sure steps and approver roles are defined in Approval Path.
                    </span>
                    <a
                      href="/techcsr/admin/forms/approval-path/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 700, color: '#4f46e5', fontSize: 12.5 }}
                    >
                      Manage Approval Paths ↗
                    </a>
                  </div>
                }
                style={{ borderRadius: 10, background: '#eef2ff', border: '1px solid #c7d2fe' }}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
