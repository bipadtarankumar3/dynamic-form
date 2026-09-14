import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Switch, Button, Tag, AutoComplete, Spin, App, Row, Col } from 'antd';
import { FormOutlined, RocketOutlined, DatabaseOutlined, ThunderboltOutlined, CloseCircleOutlined } from '@ant-design/icons';
import * as yup from 'yup';
import { privateHttpClient } from '@/services/api/httpClient';

const formValidationSchema = yup.object().shape({
  title: yup
    .string()
    .trim()
    .required('Form title is required')
    .min(2, 'Form title must be at least 2 characters'),
  slug: yup
    .string()
    .trim()
    .required('Form slug is required')
    .matches(/^[a-z0-9_]+$/, 'Slug can only contain lowercase letters, numbers, and underscores'),
  table_name: yup
    .string()
    .trim()
    .required('Database table name is required')
    .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Table name must start with a letter/underscore and contain only alphanumeric and underscores'),
});

const slugify = (str = '') =>
  str
    ?.toLowerCase()
    ?.trim()
    ?.replace(/\s+/g, '_')
    ?.replace(/[^a-z0-9_]/g, '');

export default function CreateFormModalV2({ open, onClose, onCreateForm, existingForms = [] }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isMaster, setIsMaster] = useState(false);
  const [autoImportFields, setAutoImportFields] = useState(false);
  const [dbTables, setDbTables] = useState([]);
  const [inspectingTable, setInspectingTable] = useState(false);
  const [allExistingForms, setAllExistingForms] = useState(existingForms || []);

  useEffect(() => {
    if (existingForms && existingForms.length > 0) {
      setAllExistingForms(existingForms);
    }
  }, [existingForms]);

  /* Load database tables and existing forms & reset form on open */
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setTitle('');
    setSlug('');
    setIsMaster(false);
    setAutoImportFields(false);

    const fetchExistingData = async () => {
      try {
        const [tablesRes, formsRes] = await Promise.all([
          privateHttpClient.get('configurator/form-schemas/all-tables'),
          privateHttpClient.get('configurator/form-schemas?limit=1000').catch(() => ({ data: { data: [] } })),
        ]);
        const items = tablesRes?.data?.data || [];
        setDbTables(items.map((t) => ({ value: t.table_name || t.value, label: t.table_name || t.label })));
        const fetchedForms = formsRes?.data?.data || [];
        if (fetchedForms.length > 0) {
          setAllExistingForms(fetchedForms);
        }
      } catch (err) {
        console.error('Failed to load database tables or forms:', err);
      }
    };
    fetchExistingData();
  }, [open]);

  const duplicateWarning = React.useMemo(() => {
    const trimmedTitle = title.trim().toLowerCase();
    const trimmedSlug = slug.trim().toLowerCase();

    if (!trimmedTitle && !trimmedSlug) return null;

    const matchedTitle = allExistingForms.find(
      (f) => (f.title || f.name || '').trim().toLowerCase() === trimmedTitle
    );
    if (matchedTitle) {
      return `A form with the name "${matchedTitle.title || matchedTitle.name}" already exists. Please enter a unique form name.`;
    }

    const matchedSlug = allExistingForms.find(
      (f) => (f.slug || '').trim().toLowerCase() === trimmedSlug
    );
    if (matchedSlug) {
      return `A form with the slug "${matchedSlug.slug}" already exists.`;
    }

    return null;
  }, [title, slug, allExistingForms]);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    const autoSlug = slugify(val);
    setSlug(autoSlug);
    form.setFieldsValue({ slug: autoSlug, table_name: `t_frm_${autoSlug}` });
  };

  const handleTableSelect = async (selectedTable) => {
    form.setFieldsValue({ table_name: selectedTable });
    setAutoImportFields(true);
    // If title is not set yet, derive title and slug from table name
    if (!form.getFieldValue('title')) {
      const derivedSlug = selectedTable.replace(/^t_frm_|^t_mst_|^t_/, '');
      const derivedTitle = derivedSlug
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      form.setFieldsValue({ title: derivedTitle, slug: derivedSlug });
      setTitle(derivedTitle);
      setSlug(derivedSlug);
    }
  };

  const handleSubmit = async (values) => {
    if (duplicateWarning) {
      message.error(duplicateWarning);
      return;
    }
    const tableName = values.table_name || `t_frm_${slugify(values.title)}`;
    let generatedFields = [
      {
        id: `fld_${Date.now()}`,
        db_field: 'title',
        label: 'Title',
        type: 'text',
        data_type: 'varchar(255)',
        required: true,
        ui: { placeholder: 'Enter Title', col_span: 6, visible: true },
        validation: {},
      },
    ];

    // If auto-import fields is selected, attempt to inspect table columns from DB
    if (autoImportFields && tableName) {
      try {
        setInspectingTable(true);
        const colRes = await privateHttpClient.get(`configurator/form-schemas/table-columns/${tableName}`);
        if (colRes?.data?.fields && colRes.data.fields.length > 0) {
          generatedFields = colRes.data.fields;
          message.success(`Auto-generated ${generatedFields.length} fields from table "${tableName}"!`);
        }
      } catch (err) {
        // Fallback to default field if table doesn't exist yet in DB
        console.log(`Table ${tableName} not found in DB or empty; using default template.`);
      } finally {
        setInspectingTable(false);
      }
    }

    const newFormSchema = {
      title: values.title,
      slug: values.slug || slugify(values.title),
      description: values.description || '',
      is_master: !!values.is_master,
      is_draft: true,
      primary_key: values.primary_key || 'id',
      table_name: tableName,
      actions: [
        { name: 'View', slug: 'view', type: 'OPEN_MODAL', icon: 'EyeOutlined', roles: ['admin'] },
        { name: 'Edit', slug: 'edit', type: 'OPEN_MODAL', icon: 'EditOutlined', roles: ['admin'] },
      ],
      sections: [
        {
          id: `sec_${Date.now()}`,
          section_label: `${values.title} Details`,
          slug: `${slugify(values.title)}_details`,
          type: 'general',
          table_name: tableName,
          fields: generatedFields,
        },
      ],
    };

    onCreateForm(newFormSchema);
    form.resetFields();
    setTitle('');
    setSlug('');
    setIsMaster(false);
    setAutoImportFields(false);
    onClose();
  };

  const handleClose = () => {
    form.resetFields();
    setTitle('');
    setSlug('');
    setIsMaster(false);
    setAutoImportFields(false);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal
      className="create-form-modal-v2"
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
            <FormOutlined />
          </div>
          <div className="w-full">
            <h4 className="mb-0" style={{ fontWeight: 800, fontSize: 17, color: '#ffffff', lineHeight: 1.3 }}>
              Create New Form
            </h4>
            <p className="mb-0" style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255, 255, 255, 0.92)', marginTop: 2 }}>
              Build a dynamic schema configuration or auto-import fields from DB table
            </p>
          </div>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={880}
      centered
      destroyOnHidden
      closeIcon={<span style={{ color: '#ffffff', fontSize: 16 }}>✕</span>}
    >
      <Spin spinning={inspectingTable} tip="Inspecting database table columns...">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_master: false, primary_key: 'id' }}
          style={{ marginTop: 18 }}
        >
          {duplicateWarning && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloseCircleOutlined style={{ fontSize: 16, color: '#dc2626' }} />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <Row gutter={20}>
            {/* Form Title */}
            <Col xs={24} md={12}>
              <Form.Item
                name="title"
                label={<span style={{ fontWeight: 600 }}>Form Title *</span>}
                rules={[
                  {
                    validator: async (_, value) => {
                      try {
                        await formValidationSchema.validateAt('title', { title: value });
                      } catch (err) {
                        return Promise.reject(new Error(err.message));
                      }
                      const trimmed = (value || '').trim().toLowerCase();
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
                  placeholder="e.g. Project Budgets"
                  onChange={handleTitleChange}
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>

            {/* Form Slug */}
            <Col xs={24} md={12}>
              <Form.Item
                name="slug"
                label={<span style={{ fontWeight: 600 }}>Form Slug *</span>}
                rules={[
                  {
                    validator: async (_, value) => {
                      try {
                        await formValidationSchema.validateAt('slug', { slug: value });
                      } catch (err) {
                        return Promise.reject(new Error(err.message));
                      }
                      const trimmed = (value || '').trim().toLowerCase();
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
                <Input placeholder="project_budgets" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>

            {/* Database Table Name */}
            <Col xs={24} md={12}>
              <Form.Item
                name="table_name"
                label={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontWeight: 600 }}>
                      {/* <DatabaseOutlined style={{ marginRight: 6, color: '#6366f1' }} /> */}
                      Database Table Name *
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, }} className="italic">
                      Select existing or enter new
                    </span>
                  </div>
                }
                rules={[
                  {
                    validator: async (_, value) => {
                      try {
                        await formValidationSchema.validateAt('table_name', { table_name: value });
                        return Promise.resolve();
                      } catch (err) {
                        return Promise.reject(new Error(err.message));
                      }
                    },
                  },
                ]}
              >
                <AutoComplete
                  options={dbTables.map(t => ({
                    value: t.value,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <DatabaseOutlined style={{ color: '#2563eb', fontSize: 13 }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{t.value}</span>
                      </div>
                    )
                  }))}
                  onSelect={handleTableSelect}
                  placeholder="e.g. t_frm_project_budgets"
                  filterOption={(inputValue, option) =>
                    (option?.value?.toUpperCase() || '').includes(inputValue.toUpperCase())
                  }
                  listHeight={320}
                  styles={{ popup: { root: { maxHeight: 320, padding: 6, borderRadius: 10 } } }}
                  size="large"
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </Form.Item>
            </Col>

            {/* Auto-Create Fields Banner */}
            <Col xs={24} md={12}>
              <Form.Item label={<span style={{ visibility: 'hidden' }}>&nbsp;</span>} style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    background: '#f0fdf4',
                    borderRadius: 8,
                    border: '1px solid #bbf7d0',
                    height: 40,
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThunderboltOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: '#166534', lineHeight: 1.2 }}>
                        Auto-Create Fields from DB
                      </div>
                      <div style={{ fontSize: 11, color: '#15803d', lineHeight: 1.2 }}>
                        Discover columns & data types
                      </div>
                    </div>
                  </div>
                  <Switch
                    size="small"
                    checked={autoImportFields}
                    onChange={(val) => setAutoImportFields(val)}
                  />
                </div>
              </Form.Item>
            </Col>

            {/* Description */}
            <Col xs={24} md={14}>
              <Form.Item name="description" label={<span style={{ fontWeight: 600 }}>Description</span>} style={{ marginBottom: 12 }}>
                <Input.TextArea
                  rows={2}
                  placeholder="Describe the purpose of this form schema..."
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>

            {/* System Master Schema */}
            <Col xs={24} md={10}>
              <Form.Item label={<span style={{ visibility: 'hidden' }}>&nbsp;</span>} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    height: 54,
                    boxSizing: 'border-box',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>System Master Schema</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Global reusable master schema
                    </div>
                  </div>
                  <Form.Item name="is_master" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <Button onClick={onClose} size="middle" style={{ borderRadius: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="middle"
              disabled={!!duplicateWarning}
              icon={<RocketOutlined />}
              className="conf-create-btn"
              style={{
                borderRadius: 8,
                fontWeight: 700,
                height: 36,
              }}
            >
              Create & Launch Builder
            </Button>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
}
