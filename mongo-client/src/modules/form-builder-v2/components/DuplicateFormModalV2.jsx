'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Input, Button, Spin, Alert, Row, Col } from 'antd';
import {
  CopyOutlined,
  DatabaseOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { privateHttpClient } from '@/services/api/httpClient';

const slugify = (str = '') =>
  str
    ?.toLowerCase()
    ?.trim()
    ?.replace(/\s+/g, '_')
    ?.replace(/[^a-z0-9_]/g, '')
    ?.replace(/^_+|_+$/g, '');

/**
 * Calculates guaranteed unique name, slug, and table name
 */
export function getUniqueCopyDefaults(sourceTitle = '', sourceSlug = '', existingForms = [], dbTables = []) {
  const existingTitles = new Set(
    (existingForms || []).map((f) => (f.title || f.name || '').trim().toLowerCase())
  );
  const existingSlugs = new Set(
    (existingForms || []).map((f) => (f.slug || '').trim().toLowerCase())
  );
  const existingTables = new Set([
    ...(existingForms || []).map((f) => (f.table_name || `t_frm_${f.slug}`).trim().toLowerCase()),
    ...(dbTables || []).map((t) => (typeof t === 'string' ? t : t.value || t.table_name || '').trim().toLowerCase()),
  ]);

  // Clean base name without existing copy suffix
  const cleanTitle = (sourceTitle || 'Untitled Form').replace(/\s*\(Copy(\s+\d+)?\)$/i, '').trim();
  const cleanSlug = (sourceSlug || 'untitled_form').replace(/_copy(_\d+)?$/i, '').trim();

  let candidateTitle = `${cleanTitle} (Copy)`;
  let candidateSlug = `${cleanSlug}_copy`;
  let candidateTable = `t_frm_${candidateSlug}`;
  let counter = 2;

  while (
    existingTitles.has(candidateTitle.toLowerCase()) ||
    existingSlugs.has(candidateSlug.toLowerCase()) ||
    existingTables.has(candidateTable.toLowerCase())
  ) {
    candidateTitle = `${cleanTitle} (Copy ${counter})`;
    candidateSlug = `${cleanSlug}_copy_${counter}`;
    candidateTable = `t_frm_${candidateSlug}`;
    counter++;
  }

  return {
    title: candidateTitle,
    slug: candidateSlug,
    table_name: candidateTable,
  };
}

export default function DuplicateFormModalV2({
  open,
  onClose,
  sourceSchema,
  existingForms = [],
  onDuplicateSuccess,
}) {
  const [form] = Form.useForm();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(false);
  const [allExistingForms, setAllExistingForms] = useState(existingForms || []);
  const [dbTables, setDbTables] = useState([]);

  useEffect(() => {
    if (existingForms && existingForms.length > 0) {
      setAllExistingForms(existingForms);
    }
  }, [existingForms]);

  // Load latest tables and forms on open
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [tablesRes, formsRes] = await Promise.all([
          privateHttpClient.get('configurator/form-schemas/all-tables'),
          privateHttpClient.get('configurator/form-schemas?limit=1000').catch(() => ({ data: { data: [] } })),
        ]);
        const tables = tablesRes?.data?.data || [];
        setDbTables(tables);
        const forms = formsRes?.data?.data || [];
        if (forms.length > 0) setAllExistingForms(forms);
      } catch (err) {
        console.error('Failed to load validation data for duplicate check:', err);
      }
    };
    fetchData();
  }, [open]);

  // Prefill with guaranteed unique defaults whenever modal opens for a source schema
  useEffect(() => {
    if (open && sourceSchema) {
      const defaults = getUniqueCopyDefaults(
        sourceSchema.title || sourceSchema.name,
        sourceSchema.slug,
        allExistingForms,
        dbTables
      );
      form.setFieldsValue(defaults);
      setTitle(defaults.title);
      setSlug(defaults.slug);
      setTableName(defaults.table_name);
    }
  }, [open, sourceSchema, allExistingForms, dbTables, form]);

  // Check duplicate conflict in real time
  const duplicateConflict = useMemo(() => {
    const trimmedTitle = title.trim().toLowerCase();
    const trimmedSlug = slug.trim().toLowerCase();
    const trimmedTable = tableName.trim().toLowerCase();

    if (!trimmedTitle && !trimmedSlug) return null;

    const matchedTitle = allExistingForms.find(
      (f) => (f.title || f.name || '').trim().toLowerCase() === trimmedTitle
    );
    if (matchedTitle) {
      return `A form with the name "${matchedTitle.title || matchedTitle.name}" already exists. Please choose a unique name.`;
    }

    const matchedSlug = allExistingForms.find(
      (f) => (f.slug || '').trim().toLowerCase() === trimmedSlug
    );
    if (matchedSlug) {
      return `A form with the slug "${matchedSlug.slug}" already exists. Form slugs must be unique.`;
    }

    const matchedFormTable = allExistingForms.find(
      (f) => (f.table_name || `t_frm_${f.slug}`).trim().toLowerCase() === trimmedTable
    );
    if (matchedFormTable) {
      return `Database table "${trimmedTable}" is already registered to form "${matchedFormTable.title || matchedFormTable.name}".`;
    }

    const matchedDbTable = dbTables.find(
      (t) => (typeof t === 'string' ? t : t.value || t.table_name || '').trim().toLowerCase() === trimmedTable
    );
    if (matchedDbTable) {
      return `Database table "${trimmedTable}" already exists in PostgreSQL. Please choose a different table name.`;
    }

    return null;
  }, [title, slug, tableName, allExistingForms, dbTables]);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    const newSlug = slugify(val);
    setSlug(newSlug);
    const newTable = `t_frm_${newSlug}`;
    setTableName(newTable);
    form.setFieldsValue({ slug: newSlug, table_name: newTable });
  };

  const handleSlugChange = (e) => {
    const val = slugify(e.target.value);
    setSlug(val);
    const newTable = `t_frm_${val}`;
    setTableName(newTable);
    form.setFieldsValue({ slug: val, table_name: newTable });
  };

  const handleSubmit = async (values) => {
    if (duplicateConflict) return;

    setLoading(true);
    try {
      // 1. Ensure complete schema (sections & fields) is loaded from backend
      let fullSchema = sourceSchema;
      const sourceId = sourceSchema?.id || sourceSchema?.form_id;
      if (sourceId) {
        try {
          const res = await privateHttpClient.get(`configurator/form-schemas/${sourceId}`);
          if (res?.data?.data) {
            fullSchema = res.data.data;
          }
        } catch (err) {
          console.warn('Using existing sourceSchema in memory:', err);
        }
      }

      // 2. Deep-clone sections and fields with new IDs and new table name
      const now = Date.now();
      const rawSections = Array.isArray(fullSchema?.sections) ? fullSchema.sections : [];
      const clonedSections = rawSections.map((sec, sIdx) => {
        const rawFields = Array.isArray(sec.fields) ? sec.fields : [];
        const clonedFields = rawFields.map((fld, fIdx) => ({
          ...fld,
          id: `fld_${sIdx}_${fIdx}_${now}`,
        }));

        return {
          ...sec,
          id: `sec_${sIdx + 1}_${now}`,
          section_id: undefined,
          table_name: values.table_name.trim(),
          table: values.table_name.trim(),
          fields: clonedFields,
        };
      });

      // 3. Create fresh schema payload (starts as DRAFT with null ID so it is created fresh)
      const duplicatedSchema = {
        ...fullSchema,
        id: null,
        form_id: null,
        title: values.title.trim(),
        name: values.title.trim(),
        slug: values.slug.trim(),
        table_name: values.table_name.trim(),
        root_entity: {
          ...(fullSchema?.root_entity || {}),
          table: values.table_name.trim(),
        },
        is_draft: true, // Duplicated forms are always fresh drafts
        triggers: [],   // Fresh triggers for fresh new table
        sections: clonedSections,
        created_at: undefined,
        updated_at: undefined,
      };

      onDuplicateSuccess(duplicatedSchema);
      onClose();
    } catch (err) {
      console.error('Failed to duplicate schema:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      className="duplicate-form-modal-v2"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#ffffff',
              color: 'var(--primary-color, #15803d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              flexShrink: 0,
            }}
          >
            <CopyOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#ffffff', lineHeight: 1.3 }}>
              Duplicate Form Schema
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.92)', fontWeight: 500, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>Create a new independent draft form and table based on</span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  padding: '1px 8px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  display: 'inline-block',
                }}
              >
                {sourceSchema?.title || sourceSchema?.name}
              </span>
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      centered
      destroyOnHidden
      closeIcon={<span style={{ color: '#ffffff', fontSize: 16 }}>✕</span>}
    >
      <Spin spinning={loading} tip="Preparing duplicated schema...">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 18 }}
        >
          {duplicateConflict && (
            <div
              style={{
                marginBottom: 18,
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                color: '#dc2626',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 500,
              }}
            >
              <CloseCircleOutlined style={{ fontSize: 18, color: '#dc2626' }} />
              <span>{duplicateConflict}</span>
            </div>
          )}

          <Row gutter={20}>
            {/* Form Title */}
            <Col xs={24}>
              <Form.Item
                name="title"
                label={<span style={{ fontWeight: 600 }}>New Form Title *</span>}
                rules={[
                  { required: true, message: 'Please enter a unique form title' },
                  { min: 2, message: 'Form title must be at least 2 characters' },
                  {
                    validator: async (_, val) => {
                      const trimmed = (val || '').trim().toLowerCase();
                      const match = allExistingForms.find(
                        (f) => (f.title || f.name || '').trim().toLowerCase() === trimmed
                      );
                      if (match) {
                        return Promise.reject(new Error(`A form with title "${match.title || match.name}" already exists.`));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder="e.g. Project Form (Copy)"
                  onChange={handleTitleChange}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>

            {/* Form Slug */}
            <Col xs={24} md={12}>
              <Form.Item
                name="slug"
                label={<span style={{ fontWeight: 600 }}>New Form Slug *</span>}
                rules={[
                  { required: true, message: 'Please enter a unique slug' },
                  {
                    pattern: /^[a-z0-9_]+$/,
                    message: 'Slug can only contain lowercase letters, numbers, and underscores',
                  },
                  {
                    validator: async (_, val) => {
                      const trimmed = (val || '').trim().toLowerCase();
                      const match = allExistingForms.find(
                        (f) => (f.slug || '').trim().toLowerCase() === trimmed
                      );
                      if (match) {
                        return Promise.reject(new Error(`A form with slug "${match.slug}" already exists.`));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder="project_form_copy"
                  onChange={handleSlugChange}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>

            {/* Database Table Name */}
            <Col xs={24} md={12}>
              <Form.Item
                name="table_name"
                label={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <DatabaseOutlined style={{ color: 'var(--primary-color, #15803d)' }} />
                    <span style={{ fontWeight: 600 }}>Database Table Name *</span>
                  </div>
                }
                rules={[
                  { required: true, message: 'Database table name is required' },
                  {
                    pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                    message: 'Table name must start with a letter/underscore and contain only alphanumeric and underscores',
                  },
                  {
                    validator: async (_, val) => {
                      const trimmed = (val || '').trim().toLowerCase();
                      const match = allExistingForms.find(
                        (f) => (f.table_name || `t_frm_${f.slug}`).trim().toLowerCase() === trimmed
                      );
                      if (match) {
                        return Promise.reject(new Error(`Table "${trimmed}" is already assigned to form "${match.title || match.name}".`));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  value={tableName}
                  onChange={(e) => {
                    setTableName(e.target.value);
                    form.setFieldsValue({ table_name: e.target.value });
                  }}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            message="Unique Table Creation Notice"
            description="Duplicated schemas will create their own separate, isolated PostgreSQL table upon publishing. Form inputs are validated in real time to prevent duplicate table or form collision."
            style={{ borderRadius: 10, marginTop: 4, marginBottom: 20 }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <Button onClick={onClose} size="middle" style={{ borderRadius: 8, height: 38, fontWeight: 500 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="middle"
              disabled={!!duplicateConflict}
              icon={<CopyOutlined />}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                height: 38,
                padding: '0 20px',
                background: 'var(--primary-gradient, var(--primary-color, #15803d))',
                border: 'none',
                boxShadow: '0 4px 14px rgba(var(--primary-color-rgb, 21, 128, 61), 0.35)',
              }}
            >
              Duplicate & Launch Builder
            </Button>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
}
