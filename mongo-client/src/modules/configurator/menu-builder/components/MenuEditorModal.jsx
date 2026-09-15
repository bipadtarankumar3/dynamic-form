'use client';

import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Row,
  Col,
} from 'antd';
import {
  LockOutlined,
  GlobalOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  ApartmentOutlined,
  FormOutlined,
  TableOutlined,
  FontSizeOutlined,
  LinkOutlined,
  SmileOutlined,
  OrderedListOutlined,
  PictureOutlined,
  AppstoreOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { getAntdIconComponent } from '@/modules/form-builder/IconPickerModal';

const { Option, OptGroup } = Select;

const renderMenuIconPreview = (iconStr) => {
  if (!iconStr) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
        <SmileOutlined style={{ fontSize: 16, color: 'var(--primary-color, #15803d)' }} />
        <span>Select Icon (Ant Design Icons)</span>
      </span>
    );
  }
  const iconName = String(iconStr).trim();
  const IconComp = getAntdIconComponent(iconName);

  if (IconComp) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--primary-color, #15803d)', fontWeight: 600 }}>
        <IconComp style={{ fontSize: 16 }} />
        <span>{iconName}</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--primary-color, #15803d)', fontWeight: 600 }}>
      <span style={{ fontSize: 16 }}>{iconStr}</span>
      <span>{iconStr}</span>
    </span>
  );
};

export default function MenuEditorModal({
  visible,
  editingMenu,
  form,
  internalRootMenus = [],
  formsList = [],
  mastersList = [],
  onCancel,
  onSave,
  onOpenIconPicker,
}) {
  const currentIconValue = Form.useWatch('icon', form);
  const currentMenuScope = Form.useWatch('menu_scope', form);
  const currentMenuLevel = Form.useWatch('menu_level', form);

  const SelectedHeaderIcon = currentIconValue ? getAntdIconComponent(currentIconValue) : null;

  const handleAttachSchema = (val, option) => {
    if (!val) return;
    const { schemaType, schemaName, schemaSlug, schemaIcon } = option;
    const isPublicScope = form.getFieldValue('menu_scope') === 'public';
    const formMode = form.getFieldValue('form_mode') || (isPublicScope ? 'form_only' : 'list');

    let baseSlug = schemaSlug;
    if (schemaType === 'form') {
      baseSlug = isPublicScope ? `/public/${schemaSlug.replace(/^\//, '')}` : `/${schemaSlug.replace(/^\//, '')}`;
      if (formMode === 'form_only' && !isPublicScope) {
        baseSlug += '?mode=form_only';
      }
      form.setFieldsValue({
        title: schemaName,
        link: baseSlug,
        icon: schemaIcon || 'FormOutlined',
      });
    } else if (schemaType === 'master') {
      const cleanSlug = schemaSlug.replace(/^masters\//, '').replace(/^\//, '');
      form.setFieldsValue({
        title: schemaName,
        link: `/masters/${cleanSlug}`,
        icon: schemaIcon || 'TableOutlined',
      });
    }
  };

  return (
    <Modal
      className="menu-editor-modal"
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
            {SelectedHeaderIcon ? (
              <SelectedHeaderIcon />
            ) : currentMenuScope === 'public' ? (
              <GlobalOutlined />
            ) : (
              <LockOutlined />
            )}
          </div>
          <div className="w-full">
            <h4 className="mb-0" style={{ fontWeight: 800, fontSize: 17, color: '#ffffff', lineHeight: 1.3, margin: 0 }}>
              {editingMenu ? 'Edit Menu Configuration' : 'Create New Menu Item'}
            </h4>
            <p className="mb-0" style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255, 255, 255, 0.92)', margin: '2px 0 0 0' }}>
              Configure navigation links, route paths, icons and RBAC permissions
            </p>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={840}
      okText={editingMenu ? 'Save Changes' : 'Create Menu'}
      cancelButtonProps={{
        style: { borderRadius: 8, height: 38, fontWeight: 500 },
      }}
      okButtonProps={{
        className: 'conf-create-btn',
        style: { borderRadius: 8, height: 38, padding: '0 24px', fontWeight: 600 },
      }}
      centered
      destroyOnHidden
      styles={{
        footer: {
          borderTop: '1px solid #f1f5f9',
          paddingTop: 10,
          paddingBottom: 14,
          marginTop: 6,
        },
      }}
      closeIcon={<span style={{ color: '#ffffff', fontSize: '16px' }}>✕</span>}
    >
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Row gutter={16}>
          {/* 1. Menu Scope Dropdown (Internal vs Public) */}
          <Col xs={24} md={12}>
            <Form.Item
              name="menu_scope"
              label="Menu Scope (Type)"
              rules={[{ required: true, message: 'Please select menu scope' }]}
              initialValue="internal"
            >
              <Select
                size="large"
                style={{ borderRadius: 8 }}
                onChange={(val) => {
                  if (val === 'public') {
                    form.setFieldsValue({
                      menu_level: 'root',
                      parent_id: undefined,
                      form_mode: 'form_only',
                    });
                  } else {
                    form.setFieldsValue({ form_mode: 'list' });
                  }
                }}
              >
                <Option value="internal">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <LockOutlined style={{ color: '#15803d' }} />
                    <span>Internal System Menu (Sidebar)</span>
                  </span>
                </Option>
                <Option value="public">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <GlobalOutlined style={{ color: '#0284c7' }} />
                    <span>Public Website Menu (Portal)</span>
                  </span>
                </Option>
              </Select>
            </Form.Item>
          </Col>

          {/* 2. Menu Level (Root vs Sub-menu) — Only for Internal */}
          {currentMenuScope !== 'public' ? (
            <Col xs={24} md={12}>
              <Form.Item
                name="menu_level"
                label="Menu Hierarchy Level"
                initialValue="root"
              >
                <Select
                  size="large"
                  style={{ borderRadius: 8 }}
                  onChange={(val) => {
                    if (val === 'root') {
                      form.setFieldsValue({ parent_id: undefined });
                    }
                  }}
                >
                  <Option value="root">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <FolderOutlined style={{ color: '#15803d' }} />
                      <span>Root Menu (Top Level Folder / Link)</span>
                    </span>
                  </Option>
                  <Option value="sub">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <ApartmentOutlined style={{ color: '#7c3aed' }} />
                      <span>Sub-Menu (Child of an existing Root Menu)</span>
                    </span>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          ) : (
            <Col xs={24} md={12}>
              <Form.Item
                name="form_mode"
                label="Display View Mode"
                initialValue="form_only"
              >
                <Select size="large" style={{ borderRadius: 8 }}>
                  <Option value="form_only">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FormOutlined style={{ color: '#15803d' }} />
                      <span>Direct Registration Form Only (Public Submission)</span>
                    </span>
                  </Option>
                  <Option value="custom_page">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AppstoreOutlined style={{ color: '#7c3aed' }} />
                      <span>Custom Landing / Component Page</span>
                    </span>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          )}

          {/* If Sub-Menu: Select Parent Root Menu */}
          {currentMenuScope !== 'public' && currentMenuLevel === 'sub' && (
            <Col span={24}>
              <Form.Item
                name="parent_id"
                label="Select Parent Root Menu"
                rules={[{ required: true, message: 'Please select a parent menu' }]}
              >
                <Select placeholder="Select parent root menu..." size="middle" allowClear style={{ borderRadius: 8 }}>
                  {internalRootMenus.map((rm) => {
                    const rmId = rm.id || rm._id;
                    return (
                      <Option key={rmId} value={rmId}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FolderOutlined style={{ color: '#15803d' }} />
                          <span>{rm.label} ({rm.url || 'Folder'})</span>
                        </span>
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
          )}

          {/* Attach Created Form or Master Schema */}
          <Col span={24}>
            <Form.Item
              name="attached_schema"
              label="Attach Created Form or Master Schema (Optional)"
            >
              <Select
                showSearch
                placeholder="Search or select a created Form or Master..."
                allowClear
                size="large"
                style={{ borderRadius: 8 }}
                listHeight={300}
                styles={{ popup: { root: { maxHeight: 300, padding: 6, borderRadius: 10 } } }}
                onChange={handleAttachSchema}
                filterOption={(input, option) => {
                  const name = option?.schemaName || '';
                  return name.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {formsList.length > 0 && (
                  <OptGroup
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0284c7' }}>
                        <FormOutlined />
                        <span>Dynamic Forms</span>
                      </span>
                    }
                  >
                    {formsList.map((f) => (
                      <Option
                        key={`form-${f.slug}`}
                        value={`form-${f.slug}`}
                        schemaType="form"
                        schemaName={f.title || f.name}
                        schemaSlug={f.slug}
                        schemaIcon={f.icon}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FormOutlined style={{ color: '#1890ff' }} />
                          <span>{f.title || f.name}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>({f.slug})</span>
                        </div>
                      </Option>
                    ))}
                  </OptGroup>
                )}
                {mastersList.length > 0 && (
                  <OptGroup
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#15803d' }}>
                        <TableOutlined />
                        <span>Master Schemas</span>
                      </span>
                    }
                  >
                    {mastersList.map((m) => (
                      <Option
                        key={`master-${m.msc_slug || m.slug}`}
                        value={`master-${m.msc_slug || m.slug}`}
                        schemaType="master"
                        schemaName={m.msc_name || m.name}
                        schemaSlug={m.msc_slug || m.slug}
                        schemaIcon={m.msc_icon || m.icon}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TableOutlined style={{ color: '#52c41a' }} />
                          <span>{m.msc_name || m.name}</span>
                        </div>
                      </Option>
                    ))}
                  </OptGroup>
                )}
              </Select>
            </Form.Item>
          </Col>

          {/* Display Label & Route Link Path */}
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label="Display Label"
              rules={[{ required: true, message: 'Label is required' }]}
            >
              <Input
                size="large"
                placeholder="e.g. State Master, Public NGO Registration"
                prefix={<FontSizeOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="link"
              label="Route Link Path"
              rules={[
                {
                  required: currentMenuLevel !== 'root' && currentMenuScope === 'public',
                  message: 'Link path is required',
                },
              ]}
            >
              <Input
                size="large"
                placeholder="e.g. /masters/state or /public/ngo-registration"
                prefix={<LinkOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Col>

          {/* Menu Icon & Order Index */}
          <Col xs={24} md={14}>
            <Form.Item
              name="icon"
              label="Menu Icon"
              style={{ marginBottom: currentMenuScope === 'public' ? 0 : 16 }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button
                  onClick={onOpenIconPicker}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 40,
                    padding: '0 14px',
                    borderRadius: 8,
                    flex: 1,
                    border: '1px solid #d9d9d9',
                  }}
                >
                  {renderMenuIconPreview(currentIconValue)}
                </Button>
                {currentIconValue && (
                  <Button
                    size="middle"
                    danger
                    type="text"
                    onClick={() => form.setFieldsValue({ icon: '' })}
                    style={{ borderRadius: 6 }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item
              name="order"
              label="Display Order Index"
              style={{ marginBottom: currentMenuScope === 'public' ? 0 : 16 }}
            >
              <InputNumber
                min={0}
                size="large"
                style={{ width: '100%', borderRadius: 8 }}
                prefix={<OrderedListOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
              />
            </Form.Item>
          </Col>

          {/* Internal View Mode & Thumbnail */}
          {currentMenuScope !== 'public' && (
            <>
              <Col xs={24} md={12}>
                <Form.Item
                  name="image"
                  label="Menu Image / Thumbnail URL"
                  extra="Optional image shown next to menu item."
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    size="large"
                    placeholder="https://cdn.example.com/images/banner.png"
                    prefix={<PictureOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
                    allowClear
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="form_mode"
                  label="Display View Mode"
                  initialValue="list"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    size="large"
                    style={{ borderRadius: 8 }}
                    onChange={(val) => {
                      const currentLink = form.getFieldValue('link') || '';
                      if (val === 'form_only') {
                        if (!currentLink.includes('mode=form_only')) {
                          const clean = currentLink.replace(
                            /\?mode=form_only|\?view=form|\?mode=custom_page|\?mode=custom_rfp/,
                            ''
                          );
                          form.setFieldsValue({ link: `${clean}${clean.includes('?') ? '&' : '?'}mode=form_only` });
                        }
                      } else if (val === 'custom_page' || val === 'custom_rfp') {
                        if (!currentLink.includes('mode=custom_page')) {
                          const clean = currentLink.replace(
                            /\?mode=form_only|\?view=form|\?mode=custom_page|\?mode=custom_rfp/,
                            ''
                          );
                          form.setFieldsValue({ link: `${clean}${clean.includes('?') ? '&' : '?'}mode=custom_page` });
                        }
                      } else if (val === 'list') {
                        form.setFieldsValue({
                          link: currentLink.replace(
                            /\?mode=form_only|\?view=form|\?mode=custom_page|\?mode=custom_rfp/,
                            ''
                          ),
                        });
                      }
                    }}
                  >
                    <Option value="list">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                        <TableOutlined style={{ color: '#0284c7' }} />
                        <span>Table Listing + Add Modal (Internal Admin)</span>
                      </span>
                    </Option>
                    <Option value="form_only">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                        <FormOutlined style={{ color: '#15803d' }} />
                        <span>Direct Registration Form Only (Public Submission)</span>
                      </span>
                    </Option>
                    <Option value="custom_page">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                        <AppstoreOutlined style={{ color: '#7c3aed' }} />
                        <span>Custom Page / Component View</span>
                      </span>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            </>
          )}
        </Row>
      </Form>
    </Modal>
  );
}

