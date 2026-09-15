'use client';

import React, { useState, useEffect } from 'react';
import { Card, Tabs, Form, App } from 'antd';
import { LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import IconPickerModal from '@/modules/form-builder/IconPickerModal';

import MenuStatsHeader from './components/MenuStatsHeader';
import InternalMenusList from './components/InternalMenusList';
import PublicMenusList from './components/PublicMenusList';
import MenuEditorModal from './components/MenuEditorModal';
import {
  fetchAllMenus,
  fetchAttachmentSchemas,
  createMenu,
  updateMenu,
  deleteMenu,
  reorderMenus,
} from '@/services/menu-builder-service';

export default function MenuBuilder() {
  const { message, modal } = App.useApp();
  const [menus, setMenus] = useState([]);
  const [formsList, setFormsList] = useState([]);
  const [mastersList, setMastersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState([]); // Closed by default
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('internal');
  const [form] = Form.useForm();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const loadMenus = async () => {
    try {
      setLoading(true);
      const data = await fetchAllMenus();
      setMenus(data);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const loadSchemas = async () => {
    try {
      const { formsList: forms, mastersList: masters } = await fetchAttachmentSchemas();
      setFormsList(forms);
      setMastersList(masters);
    } catch (err) {
      console.warn('Could not load schemas for menu attachment:', err.message);
    }
  };

  useEffect(() => {
    loadMenus();
    loadSchemas();
  }, []);

  const toggleExpand = (id) => {
    setExpandedKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  // Internal root menus
  const internalRootMenus = menus
    .filter((m) => !m.parent_id && !m.is_configurator && !m.is_public)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Public menu links
  const publicMenus = menus
    .filter((m) => m.is_public || (m.url && m.url.includes('/public/')))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Sub-menus count
  const allSubMenusCount = menus.filter((m) => !m.parent_id && !m.is_configurator).length;

  const getSubMenus = (parentId) => {
    return menus
      .filter((m) => m.parent_id === parentId && !m.is_configurator)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  /* Drag & Drop Handlers */
  const handleRootDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = internalRootMenus.findIndex((m) => m.id === active.id);
    const newIndex = internalRootMenus.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newRootList = arrayMove(internalRootMenus, oldIndex, newIndex);
    const updatedItems = newRootList.map((m, idx) => ({
      id: m.id,
      order: idx + 1,
      parent_id: null,
    }));

    // Optimistic UI Update
    setMenus((prev) =>
      prev.map((m) => {
        const found = updatedItems.find((u) => u.id === m.id);
        return found ? { ...m, order: found.order } : m;
      })
    );

    try {
      await reorderMenus(updatedItems);
      message.success('Menu order updated');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to persist menu order');
      loadMenus();
    }
  };

  const handleSubDragEnd = async (parentId, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const subs = getSubMenus(parentId);
    const oldIndex = subs.findIndex((m) => m.id === active.id);
    const newIndex = subs.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newSubList = arrayMove(subs, oldIndex, newIndex);
    const updatedItems = newSubList.map((m, idx) => ({
      id: m.id,
      order: idx + 1,
      parent_id: parentId,
    }));

    // Optimistic UI Update
    setMenus((prev) =>
      prev.map((m) => {
        const found = updatedItems.find((u) => u.id === m.id);
        return found ? { ...m, order: found.order } : m;
      })
    );

    try {
      await reorderMenus(updatedItems);
      message.success('Sub-menu order updated');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to persist sub-menu order');
      loadMenus();
    }
  };

  const handlePublicDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = publicMenus.findIndex((m) => m.id === active.id);
    const newIndex = publicMenus.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newPublicList = arrayMove(publicMenus, oldIndex, newIndex);
    const updatedItems = newPublicList.map((m, idx) => ({
      id: m.id,
      order: idx + 1,
      parent_id: null,
    }));

    // Optimistic UI Update
    setMenus((prev) =>
      prev.map((m) => {
        const found = updatedItems.find((u) => u.id === m.id);
        return found ? { ...m, order: found.order } : m;
      })
    );

    try {
      await reorderMenus(updatedItems);
      message.success('Public menu order updated');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to persist public menu order');
      loadMenus();
    }
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);

    let matchedSchemaKey = undefined;
    if (menu.url || menu.module_key) {
      const urlWithoutQuery = String(menu.url || '').split('?')[0];
      const rawSlug = (menu.module_key || urlWithoutQuery.trim().replace(/^\/?(forms|masters)\//, '').replace(/^\//, '')).toLowerCase();

      const foundForm = formsList.find((f) => {
        const slug = String(f.fsc_slug || f.slug || '').toLowerCase();
        return slug === rawSlug || (slug && urlWithoutQuery.toLowerCase().includes(slug));
      });

      if (foundForm) {
        matchedSchemaKey = `form-${foundForm.fsc_slug || foundForm.slug}`;
      } else {
        const foundMaster = mastersList.find((m) => {
          const slug = String(m.msc_slug || m.slug || '').toLowerCase();
          return slug === rawSlug || (slug && urlWithoutQuery.toLowerCase().includes(slug));
        });
        if (foundMaster) {
          matchedSchemaKey = `master-${foundMaster.msc_slug || foundMaster.slug}`;
        }
      }
    }

    const isFormOnlyMode = menu.url && (menu.url.includes('mode=form_only') || menu.url.includes('view=form'));
    const isPublic = menu.is_public === true || (menu.url && menu.url.includes('/public/'));
    const isSub = !!menu.parent_id;

    form.setFieldsValue({
      menu_scope: isPublic ? 'public' : 'internal',
      menu_level: isSub ? 'sub' : 'root',
      parent_id: menu.parent_id || undefined,
      attached_schema: matchedSchemaKey,
      title: menu.label,
      link: menu.url,
      icon: menu.icon,
      image: menu.image || '',
      order: menu.order,
      is_configurator: menu.is_configurator,
      form_mode: isFormOnlyMode ? 'form_only' : 'list',
    });
    setModalOpen(true);
  };

  const handleOpenCreateMenu = (scope = 'internal', parentId = null) => {
    setEditingMenu(null);
    form.resetFields();

    const isPublic = scope === 'public';
    const isSub = !!parentId;

    form.setFieldsValue({
      menu_scope: isPublic ? 'public' : 'internal',
      menu_level: isSub ? 'sub' : 'root',
      parent_id: parentId || undefined,
      order: isPublic
        ? publicMenus.length + 1
        : isSub
          ? getSubMenus(parentId).length + 1
          : internalRootMenus.length + 1,
      link: isPublic ? '/public/ngo-registration' : '',
      title: isPublic ? 'Public Registration' : '',
      form_mode: isPublic ? 'form_only' : 'list',
    });

    setModalOpen(true);
  };

  const handleDelete = (id, label) => {
    modal.confirm({
      title: 'Delete Menu Item',
      content: (
        <span>
          Are you sure you want to delete <strong>{label}</strong>? This action cannot be undone.
        </span>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        try {
          await deleteMenu(id);
          message.success('Menu item deleted successfully');
          loadMenus();
        } catch (err) {
          message.error(err?.response?.data?.message || 'Failed to delete menu item');
        }
      },
    });
  };

  const handleSave = async (values) => {
    try {
      let moduleKey = '';
      if (values.attached_schema) {
        moduleKey = String(values.attached_schema).replace(/^form-/, '').replace(/^master-/, '');
      }

      const isPublic = values.menu_scope === 'public';
      const isSub = values.menu_scope === 'internal' && values.menu_level === 'sub';
      const resolvedParentId = isSub ? (values.parent_id || null) : null;

      const payload = {
        label: values.title,
        url: values.link || '',
        icon: values.icon || '',
        image: values.image || null,
        order: values.order || 0,
        parent_id: resolvedParentId,
        module_key: moduleKey,
        is_configurator: values.is_configurator === true,
        is_public: isPublic,
      };

      if (editingMenu) {
        await updateMenu(editingMenu.id || editingMenu._id, payload);
        message.success('Menu updated successfully');
      } else {
        await createMenu(payload);
        message.success('Menu created successfully');
      }
      setModalOpen(false);
      loadMenus();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to save menu configuration');
    }
  };

  const tabItems = [
    {
      key: 'internal',
      label: (
        <div className={`nav-tab-label ${activeTab === 'internal' ? 'active' : ''}`}>
          <span className="nav-tab-icon-wrapper">
            <LockOutlined />
          </span>
          <span className="nav-tab-text">Internal System Menus</span>
          <span className="nav-tab-badge">{internalRootMenus.length}</span>
        </div>
      ),
      children: (
        <InternalMenusList
          internalRootMenus={internalRootMenus}
          getSubMenus={getSubMenus}
          expandedKeys={expandedKeys}
          sensors={sensors}
          onToggleExpand={toggleExpand}
          onCreateRoot={() => handleOpenCreateMenu('internal', null)}
          onCreateSub={(parentId) => handleOpenCreateMenu('internal', parentId)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRootDragEnd={handleRootDragEnd}
          onSubDragEnd={handleSubDragEnd}
        />
      ),
    },
    {
      key: 'public',
      label: (
        <div className={`nav-tab-label ${activeTab === 'public' ? 'active' : ''}`}>
          <span className="nav-tab-icon-wrapper">
            <GlobalOutlined />
          </span>
          <span className="nav-tab-text">Public Website Menus</span>
          <span className="nav-tab-badge">{publicMenus.length}</span>
        </div>
      ),
      children: (
        <PublicMenusList
          publicMenus={publicMenus}
          sensors={sensors}
          onCreatePublic={() => handleOpenCreateMenu('public', null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPublicDragEnd={handlePublicDragEnd}
        />
      ),
    },
  ];

  return (
    <div className="conf-page-container navigation-menus-sec">
      {/* Header & KPI Summary Cards */}
      <MenuStatsHeader
        totalMenus={menus.length}
        internalCount={internalRootMenus.length}
        publicCount={publicMenus.length}
        subMenusCount={allSubMenusCount}
        onCreateMenu={handleOpenCreateMenu}
      />

      {/* Main Tabs Container */}
      <Card
        variant="borderless"
        className="glassmorphism-card"
        style={{ background: '#ffffff', borderRadius: '12px', padding: '8px 16px' }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" />
      </Card>

      {/* Create / Edit Menu Modal */}
      <MenuEditorModal
        visible={modalOpen}
        editingMenu={editingMenu}
        form={form}
        internalRootMenus={internalRootMenus}
        formsList={formsList}
        mastersList={mastersList}
        onCancel={() => setModalOpen(false)}
        onSave={handleSave}
        onOpenIconPicker={() => setIconPickerVisible(true)}
      />

      {/* Icon Picker Modal */}
      <IconPickerModal
        visible={iconPickerVisible}
        onClose={() => setIconPickerVisible(false)}
        onSelectIcon={(selectedIcon) => {
          form.setFieldsValue({ icon: selectedIcon });
          setIconPickerVisible(false);
        }}
      />
    </div>
  );
}
