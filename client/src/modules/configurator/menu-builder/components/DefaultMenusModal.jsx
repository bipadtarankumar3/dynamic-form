'use client';

import React, { useState } from 'react';
import {
  Modal,
  Table,
  Tag,
  Input,
  Button,
  Tooltip,
  Typography,
  App,
} from 'antd';
import {
  SearchOutlined,
  CopyOutlined,
  CheckOutlined,
  LinkOutlined,
  LockOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  FileProtectOutlined,
  TeamOutlined,
  SafetyOutlined,
  UserOutlined,
  BranchesOutlined,
  AuditOutlined,
  BellOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  FormOutlined,
  DatabaseOutlined,
  SettingOutlined,
  ControlOutlined,
  MenuOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  CloseOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  ProjectOutlined,
  IdcardOutlined,
  TableOutlined,
  HeartOutlined,
  FireOutlined,
  CalendarOutlined,
  FolderOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export const DEFAULT_SYSTEM_MENUS = [
  // ── 1. CORE ADMIN MENUS (Protected Core for Admin) ──
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'DashboardOutlined',
    url: '/dashboard',
    module_key: 'dashboard',
    category: 'Core Admin',
    type: 'Core System',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Sidebar Root',
    description: 'Main CSR executive dashboard with mother KPI cards, fund allocation analytics, and real-time statistics.',
  },
  {
    key: 'rfp',
    label: 'Request for Proposal',
    icon: 'FileProtectOutlined',
    url: '/admin/request-for-proposal',
    module_key: 'request_for_proposal',
    category: 'Core Admin',
    type: 'Core System',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Sidebar Root',
    description: 'Core RFP management module for floating tenders, receiving NGO proposals, and managing bidding workflows.',
  },
  {
    key: 'implementation_partner',
    label: 'Implementation Partner',
    icon: 'TeamOutlined',
    url: '/forms/implementation_partner',
    module_key: 'implementation_partner',
    category: 'Core Admin',
    type: 'Core System',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Sidebar Root',
    description: 'NGO & partner database with due diligence, legal registration, 12A/80G, and compliance records.',
  },
  {
    key: 'auth_parent',
    label: 'Auth (Folder)',
    icon: 'SafetyCertificateOutlined',
    url: 'auth',
    module_key: 'auth',
    category: 'Core Admin',
    type: 'Core Folder',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Sidebar Root Folder',
    description: 'Root parent folder for system security, roles, users, and multi-level approval routing.',
  },
  {
    key: 'auth_roles',
    label: 'Roles',
    icon: 'TeamOutlined',
    url: '/admin/auth/roles',
    module_key: 'roles',
    category: 'Core Admin',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Auth" Folder',
    description: 'Manage user roles (Admin, Approver, Viewer, Configurator) and module access permissions.',
  },
  {
    key: 'auth_permissions',
    label: 'Permissions',
    icon: 'SafetyOutlined',
    url: '/admin/auth/permissions',
    module_key: 'permissions',
    category: 'Core Admin',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Auth" Folder',
    description: 'Granular permissions matrix for create, view, edit, delete, and export per system module.',
  },
  {
    key: 'auth_users',
    label: 'Users',
    icon: 'UserOutlined',
    url: '/admin/auth/users',
    module_key: 'users',
    category: 'Core Admin',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Auth" Folder',
    description: 'System user directory, role assignment, departmental profile management, and account status.',
  },
  {
    key: 'auth_approval_path',
    label: 'Approval Path',
    icon: 'BranchesOutlined',
    url: '/admin/auth/approval-path',
    module_key: 'approval_path',
    category: 'Core Admin',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Auth" Folder',
    description: 'Multi-level workflow approval paths, reviewer tiers, and threshold-based authorization rules.',
  },

  // ── 2. ADMIN & OPERATIONS (Operational & Dynamic Modules) ──
  {
    key: 'audit_logs',
    label: 'Audit Logs',
    icon: 'AuditOutlined',
    url: '/admin/audit-log',
    module_key: 'audit',
    category: 'Admin & Operations',
    type: 'Operational Module',
    is_system: false,
    portal: 'Admin Portal',
    placement: 'Sidebar Root / Settings',
    description: 'System-wide audit trail recording user logins, data modifications, exports, and security events.',
  },
  {
    key: 'notifications',
    label: 'Notification Center',
    icon: 'BellOutlined',
    url: '/admin/notification',
    module_key: 'notifications',
    category: 'Admin & Operations',
    type: 'Operational Module',
    is_system: false,
    portal: 'Admin Portal',
    placement: 'Sidebar Root / Header Nav',
    description: 'User notification inbox, alert logs, and system email/push notification event tracking.',
  },
  {
    key: 'dynamic_reports',
    label: 'Dynamic Reports',
    icon: 'BarChartOutlined',
    url: '/admin/dynamic-report',
    module_key: 'reports',
    category: 'Admin & Operations',
    type: 'Operational Module',
    is_system: false,
    portal: 'Admin Portal',
    placement: 'Sidebar Root / Analytics',
    description: 'Configurable analytical reports, pivot tables, aggregation charts, and spreadsheet exports.',
  },
  {
    key: 'mother_dashboard',
    label: 'Mother Dashboard',
    icon: 'AppstoreOutlined',
    url: '/admin/mother-dashboard',
    module_key: 'dashboard',
    category: 'Admin & Operations',
    type: 'Operational Module',
    is_system: false,
    portal: 'Admin Portal',
    placement: 'Sidebar Root',
    description: 'High-level multi-entity executive roll-up dashboard for group-level management view.',
  },
  {
    key: 'form_runner',
    label: 'Dynamic Form Runner',
    icon: 'FormOutlined',
    url: '/forms/{form_slug}',
    module_key: 'form_builder',
    category: 'Admin & Operations',
    type: 'Dynamic Route',
    is_system: false,
    portal: 'Admin Portal',
    placement: 'Configured by Menu Builder',
    description: 'Runtime URL for any dynamic form (replace {form_slug} with the form slug, e.g. /forms/project).',
  },
  {
    key: 'admin_form_view',
    label: 'Admin Form View',
    icon: 'FormOutlined',
    url: '/admin/forms/{form_slug}',
    module_key: 'form_builder',
    category: 'Admin & Operations',
    type: 'Dynamic Route',
    is_system: false,
    portal: 'Admin Portal',
    placement: 'Configured by Menu Builder',
    description: 'Admin view URL for dynamic forms (replace {form_slug} with the target form slug).',
  },
  {
    key: 'master_runner',
    label: 'Dynamic Master Runner',
    icon: 'DatabaseOutlined',
    url: '/admin/masters/{master_slug}',
    module_key: 'masters',
    category: 'Admin & Operations',
    type: 'Dynamic Route',
    is_system: false,
    portal: 'Admin Portal',
    placement: 'Under "Masters" Folder',
    description: 'Runtime URL for dynamic master datasets (replace {master_slug}, e.g. /admin/masters/financial-year).',
  },

  // ── EMPLOYEE VOLUNTEERING (Core Module) ──
  {
    key: 'volunteering_root',
    label: 'Employee Volunteering',
    icon: 'HeartOutlined',
    url: 'volunteering',
    module_key: 'volunteering_program',
    category: 'Employee Volunteering',
    type: 'Root Folder',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Sidebar Root Folder',
    description: 'Corporate employee volunteering programs, event scheduling, story feed, and participation hub.',
  },
  {
    key: 'vol_portal',
    label: 'My Volunteering Hub',
    icon: 'TeamOutlined',
    url: '/admin/volunteering/portal',
    module_key: 'volunteering_event',
    category: 'Employee Volunteering',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Employee Volunteering"',
    description: 'Employee-facing volunteering dashboard to discover events, register, log hours, and view impact badges.',
  },
  {
    key: 'vol_feed',
    label: 'Impact Story Feed',
    icon: 'FireOutlined',
    url: '/admin/volunteering/feed',
    module_key: 'volunteering_impact_story',
    category: 'Employee Volunteering',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Employee Volunteering"',
    description: 'Social feed of inspirational impact stories, volunteer spotlights, photos, and team testimonials.',
  },
  {
    key: 'vol_events',
    label: 'Events & Calendar',
    icon: 'CalendarOutlined',
    url: '/admin/event/volunteering-event',
    module_key: 'volunteering_event',
    category: 'Employee Volunteering',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Employee Volunteering"',
    description: 'Volunteering event schedule, interactive calendar, venue logistics, and roster management.',
  },
  {
    key: 'vol_programs',
    label: 'Volunteering Programs',
    icon: 'FolderOutlined',
    url: '/admin/forms/volunteering-program',
    module_key: 'volunteering_program',
    category: 'Employee Volunteering',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Employee Volunteering"',
    description: 'Annual corporate volunteering thematic programs, cause areas, budget allocations, and targets.',
  },
  {
    key: 'vol_impact_stories',
    label: 'Community Impact Stories',
    icon: 'FileTextOutlined',
    url: '/admin/event/volunteering-impact-story',
    module_key: 'volunteering_impact_story',
    category: 'Employee Volunteering',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Employee Volunteering"',
    description: 'Admin article and story management table with rich publishing controls, cover photos, and metrics.',
  },
  {
    key: 'vol_event_type',
    label: 'Event Type Master',
    icon: 'AppstoreOutlined',
    url: '/admin/masters/event_type',
    module_key: 'event_type',
    category: 'Employee Volunteering',
    type: 'Core Submenu',
    is_system: true,
    portal: 'Admin Portal',
    placement: 'Under "Employee Volunteering"',
    description: 'Master taxonomy of volunteering event categories (Tree plantation, Health camps, Education, etc.).',
  },

  // ── 3. PARTNER MENUS (NGO Fixed Portal Menus) ──
  {
    key: 'ngo_dashboard',
    label: 'Partner Dashboard',
    icon: 'DashboardOutlined',
    url: '/ngo/dashboard',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'Partner self-service portal for tracking proposal submissions, queries, and project allocations.',
  },
  {
    key: 'ngo_open_rfp',
    label: 'Open RFPs',
    icon: 'FileProtectOutlined',
    url: '/ngo/open-rfp',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'Active tenders & RFPs open for bidding, proposal submissions, and budget estimates.',
  },
  {
    key: 'ngo_closed_rfp',
    label: 'Closed RFPs',
    icon: 'FolderOpenOutlined',
    url: '/ngo/closed-rfp',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'Archive of closed and completed RFP cycles with past bid history and outcomes.',
  },
  {
    key: 'ngo_rfp_assessment',
    label: 'RFP Assessment & Status',
    icon: 'CheckCircleOutlined',
    url: '/ngo/rfp-assessment',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'Assessment scoring status, technical review feedback, and negotiation stages for submitted bids.',
  },
  {
    key: 'ngo_projects',
    label: 'Awarded Projects',
    icon: 'ProjectOutlined',
    url: '/ngo/projects',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'Active CSR projects awarded to the partner, milestone deliverables, and fund utilization reports.',
  },
  {
    key: 'ngo_due_diligence',
    label: 'Due Diligence (DD)',
    icon: 'SafetyCertificateOutlined',
    url: '/ngo/dd',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'NGO legal compliance verification, FCRA, CSR-1, audit reports, and governance review records.',
  },
  {
    key: 'ngo_profile',
    label: 'Organization Profile',
    icon: 'IdcardOutlined',
    url: '/ngo/profile',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'Partner organization profile, key contacts, board members, and statutory certifications.',
  },
  {
    key: 'ngo_notification',
    label: 'Partner Notifications',
    icon: 'BellOutlined',
    url: '/ngo/notification',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Fixed NGO Menu',
    is_system: true,
    portal: 'Partner (NGO)',
    placement: 'Partner Sidebar',
    description: 'Partner inbox for RFP alerts, assessment notices, and contract updates.',
  },
  {
    key: 'public_ngo_reg',
    label: 'Public NGO Registration',
    icon: 'GlobalOutlined',
    url: '/public/ngo-registration',
    module_key: 'public_ngo',
    category: 'Partner Menus',
    type: 'Public Portal',
    is_system: false,
    portal: 'Public Website',
    placement: 'Public Website Menus Tab',
    description: 'Public-facing onboarding portal for new NGO partner applications and document uploads.',
  },
  {
    key: 'ngo_login',
    label: 'NGO Partner Login',
    icon: 'LoginOutlined',
    url: '/ngo-registration/login',
    module_key: 'ngo_portal',
    category: 'Partner Menus',
    type: 'Portal Auth',
    is_system: false,
    portal: 'Public Website',
    placement: 'External Portal URL',
    description: 'Dedicated login portal for registered NGO partners to sign in to their partner workspace.',
  },

  // ── 4. CONFIGURATOR MENUS (Fixed Tools for Configurator) ──
  {
    key: 'conf_dashboard',
    label: 'Configurator Dashboard',
    icon: 'ControlOutlined',
    url: '/techcsr/dashboard',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Platform administrative summary and configuration central control hub.',
  },
  {
    key: 'conf_menus',
    label: 'Navigation Menus Builder',
    icon: 'MenuOutlined',
    url: '/techcsr/configurator/menus',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Drag-and-drop menu hierarchy, reordering, role binding, and public navigation tree builder.',
  },
  {
    key: 'conf_form_builder',
    label: 'Form Builder',
    icon: 'FormOutlined',
    url: '/techcsr/configurator/formsbuilder',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Dynamic schema designer with multi-tab layout, drag-drop fields, and validation rules.',
  },
  {
    key: 'conf_master_builder',
    label: 'Master Builder',
    icon: 'DatabaseOutlined',
    url: '/techcsr/configurator/masterconfigs',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Configurable master lookup tables with custom columns, types, and seed data management.',
  },
  {
    key: 'conf_db_views',
    label: 'Database Views',
    icon: 'TableOutlined',
    url: '/techcsr/configurator/database-views',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Custom SQL database views designer for cross-table joins, reporting, and analytics.',
  },
  {
    key: 'conf_rbac',
    label: 'RBAC Access Matrix',
    icon: 'SafetyCertificateOutlined',
    url: '/techcsr/configurator/rbac',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Role-based access control matrix editor and permission assignments.',
  },
  {
    key: 'conf_mother_db',
    label: 'Mother Dashboard Builder',
    icon: 'AppstoreOutlined',
    url: '/techcsr/configurator/mother-dashboard',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Configure corporate mother dashboard widgets, KPI aggregations, and layout cards.',
  },
  {
    key: 'conf_reports',
    label: 'Reports Builder',
    icon: 'BarChartOutlined',
    url: '/techcsr/configurator/reports',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'Report designer for standard reports, analytical exports, and pivot aggregations.',
  },
  {
    key: 'conf_settings',
    label: 'Platform Settings & Theme',
    icon: 'SettingOutlined',
    url: '/techcsr/configurator/settings',
    module_key: 'configurator',
    category: 'Configurator',
    type: 'Fixed Tool',
    is_system: true,
    portal: 'Configurator',
    placement: 'Configurator Sidebar',
    description: 'System branding, company logo, theme palette, and global application configuration.',
  },
];

const renderIcon = (iconName) => {
  const map = {
    DashboardOutlined: <DashboardOutlined style={{ color: '#0284c7' }} />,
    FileProtectOutlined: <FileProtectOutlined style={{ color: '#16a34a' }} />,
    TeamOutlined: <TeamOutlined style={{ color: '#7c3aed' }} />,
    SafetyCertificateOutlined: <SafetyCertificateOutlined style={{ color: '#ea580c' }} />,
    SafetyOutlined: <SafetyOutlined style={{ color: '#0d9488' }} />,
    UserOutlined: <UserOutlined style={{ color: '#db2777' }} />,
    BranchesOutlined: <BranchesOutlined style={{ color: '#2563eb' }} />,
    AuditOutlined: <AuditOutlined style={{ color: '#d97706' }} />,
    BellOutlined: <BellOutlined style={{ color: '#dc2626' }} />,
    BarChartOutlined: <BarChartOutlined style={{ color: '#0284c7' }} />,
    AppstoreOutlined: <AppstoreOutlined style={{ color: '#0d9488' }} />,
    FormOutlined: <FormOutlined style={{ color: '#16a34a' }} />,
    DatabaseOutlined: <DatabaseOutlined style={{ color: '#7c3aed' }} />,
    SettingOutlined: <SettingOutlined style={{ color: '#475569' }} />,
    GlobalOutlined: <GlobalOutlined style={{ color: '#0284c7' }} />,
    LockOutlined: <LockOutlined style={{ color: '#d97706' }} />,
    LoginOutlined: <LoginOutlined style={{ color: '#0284c7' }} />,
    ControlOutlined: <ControlOutlined style={{ color: '#4f46e5' }} />,
    MenuOutlined: <MenuOutlined style={{ color: '#15803d' }} />,
    FolderOpenOutlined: <FolderOpenOutlined style={{ color: '#64748b' }} />,
    CheckCircleOutlined: <CheckCircleOutlined style={{ color: '#16a34a' }} />,
    ProjectOutlined: <ProjectOutlined style={{ color: '#0284c7' }} />,
    IdcardOutlined: <IdcardOutlined style={{ color: '#7c3aed' }} />,
    TableOutlined: <TableOutlined style={{ color: '#0d9488' }} />,
    HeartOutlined: <HeartOutlined style={{ color: '#e11d48' }} />,
    FireOutlined: <FireOutlined style={{ color: '#ea580c' }} />,
    CalendarOutlined: <CalendarOutlined style={{ color: '#0284c7' }} />,
    FolderOutlined: <FolderOutlined style={{ color: '#7c3aed' }} />,
    FileTextOutlined: <FileTextOutlined style={{ color: '#059669' }} />,
  };
  return map[iconName] || <LinkOutlined style={{ color: '#64748b' }} />;
};

const getCategoryColor = (category) => {
  const colors = {
    'Core Admin': 'gold',
    'Employee Volunteering': 'magenta',
    'Admin & Operations': 'blue',
    'Partner Menus': 'orange',
    'Configurator': 'purple',
  };
  return colors[category] || 'default';
};

export default function DefaultMenusModal({ visible, onClose }) {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Core Admin');
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (url, key) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    message.success({
      content: `Copied to clipboard: ${url}`,
      duration: 2,
    });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const categories = [
    { key: 'Core Admin', label: 'Core Admin' },
    { key: 'Employee Volunteering', label: 'Employee Volunteering' },
    { key: 'Admin & Operations', label: 'Admin & Operations' },
    { key: 'Partner Menus', label: 'Partner (NGO) Menus' },
    { key: 'Configurator', label: 'Configurator' },
  ];

  const filteredMenus = DEFAULT_SYSTEM_MENUS.filter((item) => {
    const matchesCategory = item.category === selectedCategory;

    const q = searchText.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.label.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.module_key.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.portal.toLowerCase().includes(q) ||
      item.placement.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const columns = [
    {
      title: 'Menu Item',
      key: 'menu',
      width: '18%',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {renderIcon(record.icon)}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
              {record.label}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
              {record.is_system && (
                <Tag color="gold" style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px', margin: 0, fontWeight: 600 }}>
                  Fixed System
                </Tag>
              )}
              <Tag color="blue" style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px', margin: 0 }}>
                {record.type}
              </Tag>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Default Route / URL',
      dataIndex: 'url',
      key: 'url',
      width: '24%',
      render: (url, record) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: '6px 10px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <Text
            code
            copyable={false}
            style={{
              fontSize: 12.5,
              color: '#0369a1',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              wordBreak: 'break-all',
            }}
          >
            {url}
          </Text>
          <Tooltip title={copiedKey === record.key ? 'Copied!' : 'Copy URL to clipboard'}>
            <Button
              type={copiedKey === record.key ? 'primary' : 'default'}
              size="small"
              icon={copiedKey === record.key ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => handleCopy(url, record.key)}
              style={{
                borderRadius: 4,
                flexShrink: 0,
                height: 26,
                padding: '0 8px',
                fontSize: 12,
                background: copiedKey === record.key ? '#16a34a' : '#f8fafc',
                borderColor: copiedKey === record.key ? '#16a34a' : '#cbd5e1',
                color: copiedKey === record.key ? '#ffffff' : '#334155',
              }}
            >
              {copiedKey === record.key ? 'Copied' : 'Copy'}
            </Button>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Module Key',
      dataIndex: 'module_key',
      key: 'module_key',
      width: '14%',
      render: (val) => (
        <Tag color="geekblue" style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 8px', fontWeight: 600 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Category & Placement',
      key: 'placement',
      width: '18%',
      render: (_, record) => (
        <div>
          <Tag color={getCategoryColor(record.category)} style={{ fontSize: 11.5, margin: '0 0 4px 0', fontWeight: 600 }}>
            {record.category}
          </Tag>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {record.placement}
          </div>
        </div>
      ),
    },
    {
      title: 'Description & Purpose',
      dataIndex: 'description',
      key: 'description',
      width: '26%',
      render: (desc) => (
        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
          {desc}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Fullscreen Modal Stylesheet Override */}
      <style>{`
        .default-menus-fullscreen-modal.ant-modal {
          max-width: 100vw !important;
          width: 100vw !important;
          top: 0 !important;
          left: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          height: 100vh !important;
        }
        .default-menus-fullscreen-modal .ant-modal-content {
          padding: 0 !important;
          border-radius: 0 !important;
          height: 100vh !important;
          max-height: 100vh !important;
          overflow: hidden !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          background: #f8fafc !important;
        }
        .default-menus-fullscreen-modal .ant-modal-header {
          margin: 0 !important;
          padding: 16px 28px !important;
          background: #0f172a !important;
          background-image: none !important;
          border-bottom: 1px solid #1e293b !important;
          border-radius: 0 !important;
        }
        .default-menus-fullscreen-modal .ant-modal-title {
          color: #ffffff !important;
        }
        .default-menus-fullscreen-modal .ant-modal-body {
          padding: 16px 24px !important;
          flex: 1 1 auto !important;
          height: calc(100vh - 130px) !important;
          max-height: calc(100vh - 130px) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          background: #f8fafc !important;
        }
        .default-menus-fullscreen-modal .ant-modal-footer {
          margin: 0 !important;
          padding: 12px 28px !important;
          background: #ffffff !important;
          border-top: 1px solid #e2e8f0 !important;
        }
        .default-menus-fullscreen-modal-wrap {
          padding: 0 !important;
          overflow: hidden !important;
        }
        .default-menus-fullscreen-modal .ant-table-wrapper {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .default-menus-fullscreen-modal .ant-spin-nested-loading {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .default-menus-fullscreen-modal .ant-spin-container {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .default-menus-fullscreen-modal .ant-table {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .default-menus-fullscreen-modal .ant-table-container {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .default-menus-fullscreen-modal .ant-table-body {
          flex: 1 1 auto !important;
          max-height: calc(100vh - 300px) !important;
          overflow-y: auto !important;
        }
        .default-menus-fullscreen-modal .ant-table-tbody > tr:last-child > td {
          border-bottom: 1px solid #f0f0f0 !important;
          padding-bottom: 16px !important;
        }
      `}</style>

      <Modal
        wrapClassName="default-menus-fullscreen-modal-wrap"
        className="default-menus-fullscreen-modal"
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                <InfoCircleOutlined />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Default System Menus & URLs Reference
                </div>
                <div style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', marginTop: 2 }}>
                  Reference of fixed & standard routes for <strong>Configurator</strong>, <strong>Core Admin</strong>, <strong>Admin & Operations</strong>, and <strong>Partner (NGO)</strong> portals
                </div>
              </div>
            </div>
            <Tag color="cyan" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, margin: 0, fontWeight: 600 }}>
              {DEFAULT_SYSTEM_MENUS.length} Total Routes
            </Tag>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width="100vw"
        closeIcon={<CloseOutlined style={{ color: '#ffffff', fontSize: 16 }} />}
        footer={[
          <div
            key="footer-row"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Showing <strong>{filteredMenus.length}</strong> routes in <strong>{selectedCategory}</strong> • Click any <strong>Copy</strong> button to copy URL
            </div>
            <Button
              key="close-btn"
              type="primary"
              onClick={onClose}
              style={{
                borderRadius: 6,
                padding: '0 24px',
                height: 38,
                fontWeight: 600,
                background: '#0f172a',
                borderColor: '#0f172a',
              }}
            >
              Close Reference
            </Button>
          </div>,
        ]}
        destroyOnHidden
      >
        {/* Top Filter & Search Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 14,
            background: '#ffffff',
            padding: '12px 18px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            flexWrap: 'wrap',
          }}
        >
          {/* Category Filter Pills: Core Admin, Admin & Operations, Partner (NGO) Menus, Configurator */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {categories.map((cat) => {
              const count = DEFAULT_SYSTEM_MENUS.filter((m) => m.category === cat.key).length;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  style={{
                    border: isActive ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: isActive ? '#0284c7' : '#f8fafc',
                    color: isActive ? '#ffffff' : '#334155',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{cat.label}</span>
                  <span
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#64748b',
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Search Input */}
          <Input
            placeholder="Search by name, URL, module key, or placement..."
            prefix={<SearchOutlined style={{ color: '#94a3b8', marginRight: 4 }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{
              width: 340,
              borderRadius: 8,
              height: 36,
            }}
          />
        </div>

        {/* Main Table Container filling remaining viewport height */}
        <div
          style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Table
            columns={columns}
            dataSource={filteredMenus}
            rowKey="key"
            pagination={false}
            size="middle"
            scroll={{ y: 'calc(100vh - 300px)' }}
            style={{ flex: 1 }}
          />
        </div>
      </Modal>
    </>
  );
}
