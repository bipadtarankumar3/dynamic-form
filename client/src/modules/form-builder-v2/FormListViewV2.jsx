'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  PlusOutlined,
  SearchOutlined,
  FormOutlined,
  FileDoneOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  DeleteOutlined,
  RocketOutlined,
  CopyOutlined,
  UnorderedListOutlined,
  TableOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  ThunderboltOutlined,
  TabletOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  LinkOutlined,
  SettingOutlined,
  DatabaseOutlined,
  MoreOutlined,
  FilterOutlined, PlusCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Button, Input, Tag, Table, Spin, App, Dropdown, Menu, Popconfirm, Pagination, Tooltip, Segmented, Select } from 'antd';
import { useSearchParams } from '@/hooks/useNextRouter';
import { privateHttpClient } from '@/services/api/httpClient';
import CreateFormModalV2 from './CreateFormModalV2';
import FormBuilderV2 from './FormBuilderV2';

import FormBuilderModalV2 from './FormBuilderModalV2';
import FormActionsModalV2 from './components/FormActionsModalV2';
import FormTriggersModalV2 from './components/FormTriggersModalV2';
import DuplicateFormModalV2 from './components/DuplicateFormModalV2';
import DeleteFormModalV2 from './components/DeleteFormModalV2';
import { validateFormula } from '@/modules/dynamic-form-v2/add-edit/add-more-section/helper/calculation.helper';
import './styles/form-builder-v2.css';
import Image from "next/image";
import TotalForms from '@/assets/images/dashboard/TotalForms.png';
import Published from '@/assets/images/dashboard/Published.png';
import Drafts from '@/assets/images/dashboard/Drafts.png';
import MasterSchemas from '@/assets/images/dashboard/MasterSchemas.png';

const ACTION_BTN_BASE = {
  width: 32,
  height: 32,
  minWidth: 32,
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  background: '#ffffff',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  cursor: 'pointer',
};

const ACTION_STYLES = {
  edit: {
    ...ACTION_BTN_BASE,
    border: '1px solid rgba(124, 58, 237, 0.6)',
    color: '#7c3aed',
  },
  duplicate: {
    ...ACTION_BTN_BASE,
    border: '1px solid rgba(37, 99, 235, 0.6)',
    color: '#2563eb',
  },
  actions: {
    ...ACTION_BTN_BASE,
    border: '1px solid rgba(234, 88, 12, 0.6)',
    color: '#ea580c',
  },
  triggers: {
    ...ACTION_BTN_BASE,
    border: '1px solid rgba(22, 163, 74, 0.6)',
    color: '#16a34a',
  },
  delete: {
    ...ACTION_BTN_BASE,
    border: '1px solid rgba(220, 38, 38, 0.6)',
    color: '#dc2626',
  },
};

export default function FormListViewV2() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [forms, setForms] = useState([]);
  const [allForms, setAllForms] = useState([]); // full list for parent name lookup
  const [searchText, setSearchText] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'master' | 'draft' | 'published'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [projectDetails, setProjectDetails] = useState(null);
  const [formToDelete, setFormToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const [searchParams] = useSearchParams();

  const decoded = useMemo(() => {
    const ctx = searchParams ? searchParams.get('ctx') : null;
    if (!ctx) return null;
    try {
      return JSON.parse(atob(ctx));
    } catch {
      return null;
    }
  }, [searchParams]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeBuilderSchema, setActiveBuilderSchema] = useState(null);

  /* Actions Modal State */
  const [actionsModalOpen, setActionsModalOpen] = useState(false);
  const [activeActionsSchema, setActiveActionsSchema] = useState(null);
  const [actionsSaving, setActionsSaving] = useState(false);

  /* Database Triggers Modal State (Published Forms Only) */
  const [triggersModalOpen, setTriggersModalOpen] = useState(false);
  const [activeTriggersSchema, setActiveTriggersSchema] = useState(null);

  /* Duplicate Form Modal State */
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [formToDuplicate, setFormToDuplicate] = useState(null);

  /* Fetch Project Info if decoded ctx present */
  useEffect(() => {
    if (!decoded?.parent_primary_key_value) return;
    const fetchProjectDetails = async () => {
      try {
        const res = await privateHttpClient.post('dynamic-form/view', {
          form_slug: 'project',
          selected_data: {
            [decoded?.parent_primary_key]: decoded?.parent_primary_key_value,
          },
        });
        const apiData = res?.data?.data;
        setProjectDetails({
          project_title: apiData?.tprjct_project_title,
          project_start_date: apiData?.tprjct_project_duration_start_date,
          project_end_date: apiData?.tprjct_project_duration_end_date,
        });
      } catch {
        message.error('Failed to load project details');
      }
    };
    fetchProjectDetails();
  }, [decoded]);

  /* Fetch Form Schemas */
  const fetchForms = async () => {
    try {
      setLoading(true);
      let arr = [];
      if (decoded?.parent_primary_key_value) {
        const res = await privateHttpClient.post('form-builder/project-form-list-dt', {
          start: 0,
          length: 100,
          prj_id: decoded?.parent_primary_key_value,
        });
        arr = res?.data?.data || [];
      } else {
        const res = await privateHttpClient.get('configurator/form-schemas');
        const items = res?.data?.data || res?.data || [];
        arr = Array.isArray(items) ? items : [];
      }

      // Show list immediately with summary data
      setForms(arr);
      setAllForms(arr);
      setLoading(false);

      // Enrich cards in background with full detail (tabs, actions, parent)
      if (arr.length > 0) {
        setDetailsLoading(true);
        try {
          const enriched = await Promise.all(
            arr.map(async (item) => {
              const id = item.fsc_id || item.id;
              if (!id) return item;
              try {
                const detail = await privateHttpClient.get(`configurator/form-schemas/${id}`);
                const d = detail?.data?.data || detail?.data || {};
                return { ...item, ...d };
              } catch {
                return item;
              }
            })
          );
          setForms(enriched);
          setAllForms(enriched);
        } finally {
          setDetailsLoading(false);
        }
      }
    } catch (err) {
      message.error('Failed to load form schemas');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [decoded]);

  /* Stats Calculations */
  const stats = useMemo(() => {
    const total = forms.length;
    const master = forms.filter((f) => f.is_master).length;
    const drafts = forms.filter((f) => f.is_draft).length;
    const published = total - drafts;
    return { total, master, drafts, published };
  }, [forms]);

  /* Filtered Forms */
  const filteredForms = useMemo(() => {
    return forms.filter((item) => {
      const name = String(item.title || item.name || '').toLowerCase();
      const slug = String(item.slug || '').toLowerCase();
      const matchesSearch = name.includes(searchText.toLowerCase()) || slug.includes(searchText.toLowerCase());

      const isMaster = !!item.is_master;
      const isDraft = !!item.is_draft;

      if (!matchesSearch) return false;

      if (filterTab === 'master') return isMaster;
      if (filterTab === 'draft') return isDraft;
      if (filterTab === 'published') return !isDraft;
      return true;
    });
  }, [forms, searchText, filterTab]);

  /* Reset to Page 1 when Search or Tab changes */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterTab]);

  /* Paginated Cards (9 items per page) */
  const paginatedForms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredForms.slice(start, start + pageSize);
  }, [filteredForms, currentPage, pageSize]);

  /* Delete Form */
  const handleDelete = async (schemaId) => {
    try {
      await privateHttpClient.delete(`configurator/form-schemas/${schemaId}`);
      message.success('Form deleted successfully');
      fetchForms();
    } catch {
      message.error('Failed to delete form');
    }
  };

  /* Provision / Final Submit */
  const handlePublish = async (item) => {
    const schemaId = item.id || item.slug;
    try {
      setLoading(true);
      let schemaToCheck = item;
      if (schemaId) {
        try {
          const res = await privateHttpClient.get(`configurator/form-schemas/${schemaId}`);
          schemaToCheck = res?.data?.data || res?.data || item;
        } catch {
          // fallback to item
        }
      }

      let rawSections = schemaToCheck.sections || [];
      if (typeof rawSections === 'string') {
        try {
          rawSections = JSON.parse(rawSections);
        } catch {
          rawSections = [];
        }
      }
      const allFields = (Array.isArray(rawSections) ? rawSections : []).flatMap((sec) => sec.fields || []);
      if (allFields.length === 0) {
        message.error(`Cannot publish form "${item.title || item.name}": At least 1 field is required. Please edit the form and add fields first.`);
        return;
      }

      // Check duplicates
      const seenLabels = new Set();
      const seenDbFields = new Set();
      for (const f of allFields) {
        const lbl = (f.label || '').trim().toLowerCase();
        if (lbl && seenLabels.has(lbl)) {
          message.error(`Cannot publish form "${item.title || item.name}": Duplicate Field Label "${f.label}" found.`);
          return;
        }
        if (lbl) seenLabels.add(lbl);

        const db = (f.db_field || '').trim().toLowerCase();
        if (db && seenDbFields.has(db)) {
          message.error(`Cannot publish form "${item.title || item.name}": Duplicate DB Field Name "${f.db_field}" found.`);
          return;
        }
        if (db) seenDbFields.add(db);
      }

      // Check calculation formulas
      const numericFieldTokens = allFields
        .filter((f) => {
          const isNum =
            f?.type === 'number' ||
            f?.number_type === 'integer' ||
            f?.number_type === 'decimal' ||
            f?.data_type === 'integer' ||
            f?.data_type === 'double precision' ||
            f?.data_type === 'numeric' ||
            f?.data_type === 'decimal' ||
            f?.calculation?.enabled;
          return isNum && f?.db_field;
        })
        .map((f) => f.db_field);

      for (const f of allFields) {
        if (f.calculation?.enabled) {
          const allowedTokens = numericFieldTokens.filter((tok) => tok !== f.db_field);
          const valRes = validateFormula(f.calculation?.formula, allowedTokens);
          if (!valRes.isValid) {
            message.error(`Cannot publish form "${item.title || item.name}": Calculated field "${f.label || f.db_field}": ${valRes.error}`);
            return;
          }
        }

        if (f.type === 'add_more' && Array.isArray(f.fields)) {
          const subNumericTokens = f.fields
            .filter((sub) => {
              const isNum =
                sub?.type === 'number' ||
                sub?.number_type === 'integer' ||
                sub?.number_type === 'decimal' ||
                sub?.data_type === 'integer' ||
                sub?.data_type === 'double precision' ||
                sub?.data_type === 'numeric' ||
                sub?.data_type === 'decimal' ||
                sub?.calculation?.enabled;
              return isNum && sub?.db_field;
            })
            .map((sub) => sub.db_field);

          for (const sub of f.fields) {
            if (sub.calculation?.enabled) {
              const allowedSub = subNumericTokens.filter((tok) => tok !== sub.db_field);
              const subRes = validateFormula(sub.calculation?.formula, allowedSub);
              if (!subRes.isValid) {
                message.error(`Cannot publish form "${item.title || item.name}": Table "${f.label || 'Add-More'}" column "${sub.label || sub.db_field}": ${subRes.error}`);
                return;
              }
            }
          }
        }
      }

      await privateHttpClient.put(`configurator/form-schemas/${schemaId}`, { is_draft: false });
      message.success(`Form "${item.title || item.name}" published & provisioned!`);
      fetchForms();
    } catch {
      message.error('Failed to publish form');
    } finally {
      setLoading(false);
    }
  };

  /* Open Builder for Editing */
  const handleEditCanvas = (item) => {
    setActiveBuilderSchema(item);
  };

  /* Open Form Actions Modal */
  const handleOpenFormActions = async (item) => {
    const schemaId = item.id;
    if (schemaId) {
      try {
        const res = await privateHttpClient.get(`configurator/form-schemas/${schemaId}`);
        const d = res?.data?.data || res?.data || {};
        setActiveActionsSchema({ ...item, ...d });
      } catch {
        setActiveActionsSchema(item);
      }
    } else {
      setActiveActionsSchema(item);
    }
    setActionsModalOpen(true);
  };

  /* Save Form Actions & Tabs */
  const handleSaveFormActions = async (updatedSchema) => {
    const schemaToSave = updatedSchema || activeActionsSchema;
    if (!schemaToSave) return;
    const schemaId = schemaToSave.id || schemaToSave.slug;
    try {
      setActionsSaving(true);
      const payload = {
        ...schemaToSave,
        enable_approval: schemaToSave.enable_approval !== undefined ? schemaToSave.enable_approval : false,
        actions: schemaToSave.actions || [],
        enable_action_tabs: schemaToSave.enable_action_tabs !== undefined ? schemaToSave.enable_action_tabs : false,
        action_tabs: schemaToSave.action_tabs || [],
        table_columns: schemaToSave.table_columns || [],
        view_name: schemaToSave.view_name || undefined,
        view_slug: schemaToSave.view_slug || undefined,
      };
      await privateHttpClient.put(`configurator/form-schemas/${schemaId}`, payload);
      message.success('Form actions, tabs & columns updated successfully!');
      setActionsModalOpen(false);
      setActiveActionsSchema(null);
      fetchForms();
    } catch (err) {
      message.error('Failed to save form actions');
    } finally {
      setActionsSaving(false);
    }
  };

  /* Open Database Triggers Modal (Published Forms Only) */
  const handleOpenTriggers = async (item) => {
    if (item.is_draft) {
      message.warning('This form is currently in Draft. Please publish the form first before configuring database triggers.');
      return;
    }
    const schemaId = item.id || item.slug || item.fsc_id;
    if (schemaId) {
      try {
        const res = await privateHttpClient.get(`configurator/form-schemas/${schemaId}`);
        const d = res?.data?.data || res?.data || {};
        setActiveTriggersSchema({ ...item, ...d });
      } catch {
        setActiveTriggersSchema(item);
      }
    } else {
      setActiveTriggersSchema(item);
    }
    setTriggersModalOpen(true);
  };

  /* Save Database Triggers */
  const handleSaveTriggers = async (updatedTriggers) => {
    if (!activeTriggersSchema) return;
    const schemaId = activeTriggersSchema.id || activeTriggersSchema.slug || activeTriggersSchema.fsc_id;
    const payload = {
      ...activeTriggersSchema,
      triggers: updatedTriggers || [],
    };
    await privateHttpClient.put(`configurator/form-schemas/${schemaId}`, payload);
    setActiveTriggersSchema((prev) => ({ ...prev, triggers: updatedTriggers }));
    fetchForms();
  };

  /* Handle Create New Form */
  const handleCreateNewForm = (newSchema) => {
    setActiveBuilderSchema(newSchema);
  };

  /* Handle Duplicate Form Schema */
  const handleOpenDuplicate = (item) => {
    setFormToDuplicate(item);
    setDuplicateModalOpen(true);
  };

  return (
    <div className="conf-page-container">
      {/* Top Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <FormOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Forms Builder</h1>
            <p className="conf-page-subtitle">Create and manage your forms, schemas and configurations.</p>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={() => setCreateModalOpen(true)}
          className="conf-create-btn"
        >
          Create Form
        </Button>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Forms</span>
            <span className="conf-stat-val">{stats.total}</span>
            <span className="conf-stat-sub">All forms in the system</span>
          </div>
          <div className="conf-stat-icon-boxs">
            <Image src={TotalForms} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-content">
            <span className="conf-stat-label">Published</span>
            <span className="conf-stat-val">{stats.published}</span>
            <span className="conf-stat-sub">Active and live forms</span>
          </div>
          <div className="conf-stat-icon-boxs">
            <Image src={Published} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-content">
            <span className="conf-stat-label">Drafts</span>
            <span className="conf-stat-val">{stats.drafts}</span>
            <span className="conf-stat-sub">Forms in draft stage</span>
          </div>
          <div className="conf-stat-icon-boxs">
            <Image src={Drafts} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-content">
            <span className="conf-stat-label">Master Schemas</span>
            <span className="conf-stat-val">{stats.master}</span>
            <span className="conf-stat-sub">Available schemas</span>
          </div>
          <div className="conf-stat-icon-box">
            <Image src={MasterSchemas} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
        </div>
      </div>

      {/* Project Details Info Card (If URL Context decoded) */}
      {projectDetails && (
        <div className="flv-v2-project-card">
          <div className="flv-v2-project-card-item">
            <FileTextOutlined className="flv-v2-project-card-icon--primary" />
            <div>
              <div className="flv-v2-project-card-label">Project Title</div>
              <div className="flv-v2-project-card-value">{projectDetails.project_title}</div>
            </div>
          </div>

          <div className="flv-v2-project-card-item">
            <CalendarOutlined className="flv-v2-project-card-icon--sky" />
            <div>
              <div className="flv-v2-project-card-label">Start Date</div>
              <div className="flv-v2-project-card-value">{projectDetails.project_start_date || 'N/A'}</div>
            </div>
          </div>

          <div className="flv-v2-project-card-item">
            <CalendarOutlined className="flv-v2-project-card-icon--violet" />
            <div>
              <div className="flv-v2-project-card-label">End Date</div>
              <div className="flv-v2-project-card-value">{projectDetails.project_end_date || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="conf-toolbar">
        <div className="conf-toolbar-left">
          <div className="conf-tab-track">
            {[
              { key: 'all', label: 'All Forms', count: stats.total, icon: <FormOutlined style={{ fontSize: 13 }} /> },
              { key: 'master', label: 'Master Schemas', count: stats.master, icon: <DatabaseOutlined style={{ fontSize: 13 }} /> },
              { key: 'published', label: 'Published', count: stats.published, icon: <CheckCircleOutlined style={{ fontSize: 13 }} /> },
              { key: 'draft', label: 'Drafts', count: stats.drafts, icon: <EditOutlined style={{ fontSize: 13 }} /> },
            ].map((tab) => (
              <div
                key={tab.key}
                data-tab={tab.key}
                className={`conf-pill-tab ${filterTab === tab.key ? 'active' : ''}`}
                onClick={() => setFilterTab(tab.key)}
              >
                <span className="conf-pill-tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="conf-pill-count">{tab.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="conf-toolbar-right">
          <Input
            placeholder="Search forms by name or slug..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="conf-search-input"
            allowClear
          />

          <Select
            value={filterTab}
            onChange={setFilterTab}
            style={{ width: 140 }}
            suffixIcon={<DownOutlined style={{ color: '#94a3b8', fontSize: 11 }} />}
            options={[
              { value: 'all', label: <span><FilterOutlined style={{ marginRight: 6, color: '#64748b' }} />All Status</span> },
              { value: 'published', label: <span><CheckCircleOutlined style={{ marginRight: 6, color: '#22c55e' }} />Published</span> },
              { value: 'draft', label: <span><CloseCircleOutlined style={{ marginRight: 6, color: '#f59e0b' }} />Drafts</span> },
              { value: 'master', label: <span><SafetyCertificateOutlined style={{ marginRight: 6, color: '#6366f1' }} />Master Schemas</span> },
            ]}
          />

          {/* View Toggle */}
          <Segmented
            value={viewMode === 'grid' ? 'grid' : 'table'}
            onChange={(val) => setViewMode(val)}
            className="conf-segmented-toggle"
            options={[
              {
                value: 'grid',
                icon: <AppstoreOutlined />,
                label: 'Grid',
              },
              {
                value: 'table',
                icon: <UnorderedListOutlined />,
                label: 'List',
              },
            ]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flv-v2-loading">
          <Spin size="large" />
        </div>
      ) : viewMode === 'grid' ? (
        <div>
          <div className="flv-v2-grid">
            {paginatedForms.map((item) => {
              const schemaId = item.id || item.slug;
              const title = item.title || item.name || 'Untitled Form';
              const slug = item.slug;
              const isMaster = !!item.is_master;
              const isDraft = !!item.is_draft;
              const isEditable = !!item.is_editable;

              // Parent Form Resolution
              const parentId = item.parent_form_id;
              const parentObj = allForms.find((f) => String(f.id) === String(parentId));
              const parentName = parentObj ? (parentObj.title || parentObj.name || parentObj.slug) : null;

              // Tabs and Actions
              const tabsEnabled = item.enable_action_tabs !== undefined ? item.enable_action_tabs : false;
              const actionTabs = item.action_tabs || [];
              const actions = item.actions || [];

              // Rich tooltip for Tabs
              const tabsTooltipContent = actionTabs.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Configured Tabs:</div>
                  {actionTabs.map((t, idx) => (
                    <div key={idx} style={{ fontSize: 11, marginBottom: 2 }}>
                      • {t.title || 'Tab'} ({t.match_type || 'ALL'})
                    </div>
                  ))}
                </div>
              ) : 'No action tabs configured';

              // Rich tooltip for Actions
              const actionsTooltipContent = actions.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Row Actions:</div>
                  {actions.map((a, idx) => (
                    <div key={idx} style={{ fontSize: 11, marginBottom: 2 }}>
                      • {a.name || 'Action'} ({a.type || 'OPEN_MODAL'})
                    </div>
                  ))}
                </div>
              ) : 'No row actions configured';

              return (
                <div key={schemaId} className="flv-v2-card">
                  <div>
                    {/* Top Row: Title + Status Tags */}
                    <div className="flv-v2-card-header">
                      <h3 className="flv-v2-card-title">{title}</h3>
                      <div className="flv-v2-card-tags">
                        {isMaster && (
                          <span className="flv-v2-tag flv-v2-tag--master">Master</span>
                        )}
                        <span className={`flv-v2-tag ${isDraft ? 'flv-v2-tag--draft' : 'flv-v2-tag--published'}`}>
                          {isDraft ? 'Draft' : 'Published'}
                        </span>
                      </div>
                    </div>

                    <div className="flv-v2-card-slug">{slug}</div>

                    {/* Metadata Pill Row */}
                    <div className="flv-v2-meta-row">
                      {/* Parent Form */}
                      {parentName ? (
                        <Tooltip title={<span>Parent Form: <strong>{parentName}</strong></span>} placement="top">
                          <div className="flv-v2-pill flv-v2-pill--parent">
                            <LinkOutlined />
                            <span className="flv-v2-pill-text">{parentName}</span>
                          </div>
                        </Tooltip>
                      ) : (
                        <Tooltip title="No parent form linked" placement="top">
                          <div className="flv-v2-pill flv-v2-pill--no-parent">
                            <ApartmentOutlined />
                            No Parent
                          </div>
                        </Tooltip>
                      )}

                      {/* Tabs Enabled */}
                      <Tooltip
                        title={tabsEnabled ? `Action tabs are enabled (${actionTabs.length} tab${actionTabs.length !== 1 ? 's' : ''})` : 'Action tabs are disabled'}
                        placement="top"
                      >
                        <div className={`flv-v2-pill ${tabsEnabled ? 'flv-v2-pill--tabs-on' : 'flv-v2-pill--tabs-off'}`}>
                          {tabsEnabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                          Tabs {tabsEnabled ? 'ON' : 'OFF'}
                        </div>
                      </Tooltip>

                      {/* Tab Count */}
                      <Tooltip
                        title={tabsTooltipContent}
                        color="#1e293b"
                        placement="top"
                        styles={{ body: { padding: '10px 14px', borderRadius: 10 } }}
                      >
                        <div className="flv-v2-pill flv-v2-pill--tab-count">
                          <TabletOutlined />
                          {actionTabs.length} Tab{actionTabs.length !== 1 ? 's' : ''}
                        </div>
                      </Tooltip>

                      {/* Actions Count */}
                      <Tooltip
                        title={actionsTooltipContent}
                        color="#1e293b"
                        placement="top"
                        styles={{ body: { padding: '10px 14px', borderRadius: 10 } }}
                      >
                        <div className="flv-v2-pill flv-v2-pill--actions">
                          <ThunderboltOutlined />
                          {actions.length} Action{actions.length !== 1 ? 's' : ''}
                        </div>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flv-v2-card-footer fb-action-btns">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tooltip title="Form Actions" color="#ea580c">
                        <Button
                          size="small"
                          style={ACTION_STYLES.actions}
                          icon={<SettingOutlined style={{ color: '#ea580c', fontSize: 14 }} />}
                          onClick={() => handleOpenFormActions(item)}
                          className="fb-action-btn fb-action-settings-btn"
                        />
                      </Tooltip>
                      <Tooltip title="Triggers" color="#16a34a">
                        <Button
                          size="small"
                          style={ACTION_STYLES.triggers}
                          icon={<ThunderboltOutlined style={{ color: '#16a34a', fontSize: 14 }} />}
                          onClick={() => handleOpenTriggers(item)}
                          className="fb-action-btn fb-action-triggers-btn"
                        />
                      </Tooltip>
                    </div>

                    <div className="flv-v2-card-footer-actions fb-action-btns" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tooltip title="Edit Form" color="#7c3aed">
                        <Button
                          size="small"
                          style={ACTION_STYLES.edit}
                          icon={<EditOutlined style={{ color: '#7c3aed', fontSize: 14 }} />}
                          onClick={() => handleEditCanvas(item)}
                          className="fb-action-btn fb-action-edit-btn"
                        />
                      </Tooltip>
                      <Tooltip title="Duplicate Schema" color="#2563eb">
                        <Button
                          size="small"
                          style={ACTION_STYLES.duplicate}
                          icon={<CopyOutlined style={{ color: '#2563eb', fontSize: 14 }} />}
                          onClick={() => handleOpenDuplicate(item)}
                          className="fb-action-btn fb-action-copy-btn"
                        />
                      </Tooltip>
                      {isDraft && (
                        <Tooltip title="Delete Form Schema" color="#dc2626">
                          <Button
                            size="small"
                            style={ACTION_STYLES.delete}
                            icon={<DeleteOutlined style={{ color: '#dc2626', fontSize: 14 }} />}
                            onClick={() => setFormToDelete(item)}
                            className="fb-action-btn fb-action-delete-btn"
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredForms.length > 0 && (
            <div className="flv-v2-pagination-row">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredForms.length}
                onChange={(page, newPageSize) => {
                  setCurrentPage(page);
                  if (newPageSize !== pageSize) setPageSize(newPageSize);
                }}
                showSizeChanger
                pageSizeOptions={['9', '18', '27', '36']}
                showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} forms`}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="conf-card-table">
          <Table
            dataSource={filteredForms}
            rowKey={(r) => r.fsc_id || r.id || r.slug}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredForms.length,
              onChange: (page, newPageSize) => {
                setCurrentPage(page);
                if (newPageSize !== pageSize) setPageSize(newPageSize);
              },
              showSizeChanger: true,
              pageSizeOptions: ['9', '18', '27', '36'],
              showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} forms`,
            }}
            columns={[
              {
                title: '#',
                key: 'index',
                width: 70,
                align: 'center',
                sorter: (a, b) => (a.id || 0) - (b.id || 0),
                render: (_, __, index) => (
                  <span className="conf-index-badge">
                    {(currentPage - 1) * pageSize + index + 1}
                  </span>
                ),
              },
              {
                title: 'Form Title',
                key: 'title',
                sorter: (a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''),
                render: (r) => (
                  <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                    {r.title || r.name || 'Untitled'}
                  </span>
                ),
              },
              {
                title: 'Slug',
                key: 'slug',
                sorter: (a, b) => (a.slug || '').localeCompare(b.slug || ''),
                render: (r) => <span className="conf-slug-code">{r.slug}</span>,
              },
              {
                title: 'Master Schema',
                key: 'master',
                align: 'center',
                sorter: (a, b) => (a.is_master ? 1 : 0) - (b.is_master ? 1 : 0),
                render: (r) => (
                  <span className={r.is_master ? "conf-badge-master-yes" : "conf-badge-master-no"}>
                    {r.is_master ? 'YES' : 'NO'}
                  </span>
                ),
              },
              {
                title: 'Status',
                key: 'status',
                align: 'center',
                sorter: (a, b) => (a.is_draft ? 1 : 0) - (b.is_draft ? 1 : 0),
                render: (r) => (
                  <span className={r.is_draft ? "conf-badge-draft" : "conf-badge-published"}>
                    {r.is_draft ? 'DRAFT' : 'PUBLISHED'}
                  </span>
                ),
              },
              {
                title: 'Actions',
                key: 'actions',
                align: 'center',
                width: 200,
                render: (r) => (
                  <div className="fb-action-btns" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Tooltip title="Edit Form" color="#7c3aed">
                      <Button
                        size="small"
                        style={ACTION_STYLES.edit}
                        icon={<EditOutlined style={{ color: '#7c3aed', fontSize: 14 }} />}
                        onClick={() => handleEditCanvas(r)}
                        className="fb-action-btn fb-action-edit-btn"
                      />
                    </Tooltip>
                    <Tooltip title="Duplicate Schema" color="#2563eb">
                      <Button
                        size="small"
                        style={ACTION_STYLES.duplicate}
                        icon={<CopyOutlined style={{ color: '#2563eb', fontSize: 14 }} />}
                        onClick={() => handleOpenDuplicate(r)}
                        className="fb-action-btn fb-action-copy-btn"
                      />
                    </Tooltip>
                    <Tooltip title="Form Actions" color="#ea580c">
                      <Button
                        size="small"
                        style={ACTION_STYLES.actions}
                        icon={<SettingOutlined style={{ color: '#ea580c', fontSize: 14 }} />}
                        onClick={() => handleOpenFormActions(r)}
                        className="fb-action-btn fb-action-settings-btn"
                      />
                    </Tooltip>
                    <Tooltip title="Triggers" color="#16a34a">
                      <Button
                        size="small"
                        style={ACTION_STYLES.triggers}
                        icon={<ThunderboltOutlined style={{ color: '#16a34a', fontSize: 14 }} />}
                        onClick={() => handleOpenTriggers(r)}
                        className="fb-action-btn fb-action-triggers-btn"
                      />
                    </Tooltip>
                    {r.is_draft && (
                      <Tooltip title="Delete Form Schema" color="#dc2626">
                        <Button
                          size="small"
                          style={ACTION_STYLES.delete}
                          icon={<DeleteOutlined style={{ color: '#dc2626', fontSize: 14 }} />}
                          onClick={() => setFormToDelete(r)}
                          className="fb-action-btn fb-action-delete-btn"
                        />
                      </Tooltip>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* Modal to Create New Form */}
      {createModalOpen && (
        <CreateFormModalV2
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreateForm={handleCreateNewForm}
          existingForms={allForms}
        />
      )}

      {/* Modal for Form Actions & Filter Tabs Setup */}
      <FormActionsModalV2
        open={actionsModalOpen}
        onClose={() => {
          setActionsModalOpen(false);
          setActiveActionsSchema(null);
        }}
        schema={activeActionsSchema}
        onUpdateSchema={(updatedMeta) => setActiveActionsSchema((prev) => ({ ...prev, ...updatedMeta }))}
        onSave={handleSaveFormActions}
        saving={actionsSaving}
        allFormsList={allForms}
      />

      {/* Database Triggers & Automations Modal (Published Forms Only) */}
      <FormTriggersModalV2
        open={triggersModalOpen}
        onClose={() => {
          setTriggersModalOpen(false);
          setActiveTriggersSchema(null);
        }}
        schema={activeTriggersSchema}
        onSave={handleSaveTriggers}
        allFormsList={allForms}
      />

      {/* Fullscreen Modal to Build / Edit Form Schema */}
      <FormBuilderModalV2
        open={!!activeBuilderSchema}
        initialSchema={activeBuilderSchema}
        onClose={() => {
          setActiveBuilderSchema(null);
          fetchForms();
        }}
        onSuccess={() => {
          setActiveBuilderSchema(null);
          fetchForms();
        }}
      />

      {/* AWS-Style Safe Form Deletion & Dependency Cleanup Modal */}
      <DeleteFormModalV2
        visible={!!formToDelete}
        formItem={formToDelete}
        onCancel={() => setFormToDelete(null)}
        onSuccess={() => {
          setFormToDelete(null);
          fetchForms();
        }}
      />

      {/* Duplicate Form Schema Modal with Unique Name & Table Validation */}
      {duplicateModalOpen && (
        <DuplicateFormModalV2
          open={duplicateModalOpen}
          onClose={() => {
            setDuplicateModalOpen(false);
            setFormToDuplicate(null);
          }}
          sourceSchema={formToDuplicate}
          existingForms={allForms}
          onDuplicateSuccess={(duplicatedSchema) => {
            setActiveBuilderSchema(duplicatedSchema);
          }}
        />
      )}
    </div>
  );
}
