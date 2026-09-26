// mongo-server/src/bootstrap.js
// Seeds initial data: Roles, Permissions, Admin & Configurator Users, Full Settings, Menus, Master Configs
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Role = require('./models/Role.model');
const Permission = require('./models/Permission.model');
const RolePermission = require('./models/RolePermission.model');
const User = require('./models/User.model');
const Setting = require('./models/Setting.model');
const Menu = require('./models/Menu.model');
const MasterSchema = require('./models/MasterSchema.model');
const MasterData = require('./models/MasterData.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csrdynamicform_db';

async function bootstrap() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // 1. Seed Roles
  const roleDefs = [
    { name: 'Super Admin', slug: 'super_admin', description: 'Full system access with configurator permissions', is_configurator: true },
    { name: 'Configurator', slug: 'configurator', description: 'Form and system builder configurator', is_configurator: true },
    { name: 'Admin', slug: 'admin', description: 'Company admin — user and data management', is_configurator: true },
    { name: 'Manager', slug: 'manager', description: 'Approval and oversight role', is_configurator: false },
    { name: 'NGO Partner', slug: 'ngo', description: 'NGO Implementation Partner Representative', is_configurator: false },
    { name: 'Employee Volunteer', slug: 'employee', description: 'Standard operational user / employee volunteer', is_configurator: false },
    { name: 'Staff', slug: 'staff', description: 'Internal staff role', is_configurator: false },
    { name: 'Viewer', slug: 'viewer', description: 'Read-only access', is_configurator: false },
  ];

  const roleMap = {};
  for (const roleDef of roleDefs) {
    const role = await Role.findOneAndUpdate(
      { slug: roleDef.slug },
      { ...roleDef, deleted_at: null },
      { new: true, upsert: true }
    );
    roleMap[roleDef.slug] = role;
    console.log(`  Role: ${roleDef.slug} ✓`);
  }

  // 2. Seed Permissions (all core platform modules x actions)
  const modules = [
    'dashboard', 'users', 'roles', 'permissions', 'approval_path', 'menus', 'settings',
    'audit', 'workflow', 'reports', 'documents', 'notifications', 'masters', 'form_builder',
    'employee_volunteering', 'ngo_management', 'kpi_monitoring', 'pivot', 'database_views'
  ];
  const actions = ['list', 'add', 'edit', 'delete', 'view', 'export', 'approve'];

  const permMap = {};
  for (const mod of modules) {
    for (const action of actions) {
      const key = `${mod}.${action}`;
      const perm = await Permission.findOneAndUpdate(
        { key },
        { module: mod, type: action, key, label: `${mod} - ${action.toUpperCase()}`, deleted_at: null },
        { new: true, upsert: true }
      );
      permMap[key] = perm;
    }
  }
  console.log(`  ${Object.keys(permMap).length} Permissions seeded ✓`);

  // 3. Assign all permissions to super_admin, configurator, admin
  const adminRoles = ['super_admin', 'configurator', 'admin'];
  for (const slug of adminRoles) {
    const role = roleMap[slug];
    if (!role) continue;
    await RolePermission.deleteMany({ role_id: role._id });
    const docs = Object.values(permMap).map(p => ({ role_id: role._id, permission_id: p._id }));
    await RolePermission.insertMany(docs);
    console.log(`  All permissions assigned to "${slug}" ✓`);
  }

  // 4. Assign Manager Permissions
  const managerRole = roleMap['manager'];
  if (managerRole) {
    await RolePermission.deleteMany({ role_id: managerRole._id });
    const managerPerms = Object.values(permMap).filter(p => ['list', 'view', 'add', 'edit', 'export', 'approve'].includes(p.type));
    await RolePermission.insertMany(managerPerms.map(p => ({ role_id: managerRole._id, permission_id: p._id })));
    console.log(`  Manager permissions assigned ✓`);
  }

  // 5. Seed Default Users
  const superAdminRole = roleMap['super_admin'];
  const superAdminPassword = await bcrypt.hash('Admin@1234', 12);
  await User.findOneAndUpdate(
    { email: 'admin@example.com' },
    {
      name: 'CSR Super Admin',
      email: 'admin@example.com',
      password: superAdminPassword,
      role_id: superAdminRole._id,
      role: 'super_admin',
      role_slug: superAdminRole.slug,
      is_configurator: true,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );
  console.log(`  Super Admin: admin@example.com / Admin@1234 ✓`);

  const confRole = roleMap['configurator'];
  const defaultPassword = await bcrypt.hash('Admin@1234', 12);
  await User.findOneAndUpdate(
    { email: 'configurator@cyberswift.com' },
    {
      name: 'System Configurator',
      email: 'configurator@cyberswift.com',
      password: defaultPassword,
      role_id: confRole._id,
      role: 'configurator',
      role_slug: confRole.slug,
      is_configurator: true,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );

  const adminRole = roleMap['admin'];
  await User.findOneAndUpdate(
    { email: 'admin@cyberswift.com' },
    {
      name: 'System Admin',
      email: 'admin@cyberswift.com',
      password: defaultPassword,
      role_id: adminRole._id,
      role: 'admin',
      role_slug: adminRole.slug,
      is_configurator: true,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );

  const managerPassword = await bcrypt.hash('Manager@1234', 12);
  await User.findOneAndUpdate(
    { email: 'manager@example.com' },
    {
      name: 'CSR Program Manager',
      email: 'manager@example.com',
      password: managerPassword,
      role_id: managerRole._id,
      role: 'manager',
      role_slug: managerRole.slug,
      is_configurator: false,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );
  console.log(`  Users seeded: configurator@cyberswift.com, admin@cyberswift.com, manager@example.com ✓`);

  // 6. Seed Complete Settings from schema.sql / bootstrapCompany.js
  const settings = [
    { key: 'app_name', value: 'CSR Platform', type: 'string', group: 'general', label: 'Application Name' },
    { key: 'site_name', value: 'CSR Dynamic Form Platform', type: 'string', group: 'general', label: 'Website Name' },
    { key: 'site_title', value: 'TechCSR - Corporate Social Responsibility Product', type: 'string', group: 'general', label: 'Website Title' },
    { key: 'site_description', value: 'CSR Platform Web Application', type: 'string', group: 'general', label: 'Website Description' },
    { key: 'company_name', value: 'Corporate Social Responsibility Trust', type: 'string', group: 'general', label: 'Organization Name' },
    { key: 'footer_text', value: '© 2026 TechCSR. All rights reserved.', type: 'string', group: 'general', label: 'Footer Text' },
    { key: 'primary_color', value: '#15803d', type: 'string', group: 'theme', label: 'Primary Color' },
    { key: 'secondary_color', value: '#659327', type: 'string', group: 'theme', label: 'Secondary Color' },
    { key: 'theme', value: 'dark', type: 'string', group: 'theme', label: 'Default Theme' },
    { key: 'date_format', value: 'DD/MM/YYYY', type: 'string', group: 'general', label: 'Date Format' },
    { key: 'currency_symbol', value: '₹', type: 'string', group: 'general', label: 'Currency Symbol' },
    { key: 'default_page_size', value: '20', type: 'number', group: 'ui', label: 'Default Page Size' },
    { key: 'allow_file_upload', value: 'true', type: 'boolean', group: 'storage', label: 'Allow File Uploads' },
    { key: 'max_upload_size_mb', value: '25', type: 'number', group: 'storage', label: 'Max Upload Size (MB)' },
    { key: 'current_financial_year', value: '2024-2025', type: 'string', group: 'general', label: 'Active Financial Year' },
    { key: 'enable_registration', value: 'true', type: 'boolean', group: 'onboarding', label: 'Allow Public NGO Registration' },
    { key: 'allow_ngo_registration', value: 'true', type: 'boolean', group: 'onboarding', label: 'Allow NGO Registration' },
    { key: 'otp_login_enabled', value: 'true', type: 'boolean', group: 'auth', label: 'OTP Login Enabled' },
    { key: 'otp_expiry_minutes', value: '10', type: 'number', group: 'auth', label: 'OTP Expiry (minutes)' },
    { key: 'session_timeout_hrs', value: '8', type: 'number', group: 'auth', label: 'Session Timeout (hours)' },
    { key: 'timezone', value: 'Asia/Kolkata', type: 'string', group: 'general', label: 'Timezone' },
  ];

  for (const s of settings) {
    await Setting.findOneAndUpdate(
      { key: s.key },
      { ...s, is_active: true, deleted_at: null },
      { new: true, upsert: true }
    );
  }
  console.log(`  ${settings.length} Settings seeded ✓`);

  // 7. Seed Default Menus (Dashboard, Request for Proposal, Implementation Partner, Auth -> Roles, Permissions, Users, Approval Path)
  const topMenus = [
    { label: 'Dashboard', title: 'Dashboard', icon: 'DashboardOutlined', url: '/dashboard', path: '/dashboard', order: 1, is_active: true },
    { label: 'Request for Proposal', title: 'Request for Proposal', icon: 'FileProtectOutlined', url: '/admin/request-for-proposal', path: '/admin/request-for-proposal', order: 15, is_active: true },
    { label: 'Implementation Partner', title: 'Implementation Partner', icon: 'TeamOutlined', url: '/admin/forms/implementation_partner', path: '/admin/forms/implementation_partner', order: 20, is_active: true },
    { label: 'Employee Volunteering', title: 'Employee Volunteering', icon: 'HeartOutlined', url: '/admin/volunteering/feed', path: '/admin/volunteering/feed', order: 30, is_active: true },
    { label: 'KPI Monitoring', title: 'KPI Monitoring', icon: 'FundViewOutlined', url: '/admin/forms/project', path: '/admin/forms/project', order: 40, is_active: true },
    { label: 'Auth', title: 'Auth', icon: 'SafetyCertificateOutlined', url: null, path: null, order: 100, is_active: true },
  ];

  for (const m of topMenus) {
    const parentMenu = await Menu.findOneAndUpdate(
      { label: m.label },
      { ...m, deleted_at: null },
      { new: true, upsert: true }
    );

    if (m.label === 'Auth') {
      const subMenus = [
        { label: 'Roles', title: 'Roles', url: '/admin/auth/roles', path: '/admin/auth/roles', icon: 'TeamOutlined', order: 1, parent_id: parentMenu._id },
        { label: 'Permissions', title: 'Permissions', url: '/admin/auth/permissions', path: '/admin/auth/permissions', icon: 'SafetyOutlined', order: 2, parent_id: parentMenu._id },
        { label: 'Users', title: 'Users', url: '/admin/auth/users', path: '/admin/auth/users', icon: 'UserOutlined', order: 3, parent_id: parentMenu._id },
        { label: 'Approval Path', title: 'Approval Path', url: '/admin/auth/approval-path', path: '/admin/auth/approval-path', icon: 'BranchesOutlined', order: 4, parent_id: parentMenu._id },
      ];

      for (const sub of subMenus) {
        await Menu.findOneAndUpdate(
          { label: sub.label, parent_id: parentMenu._id },
          { ...sub, is_active: true, deleted_at: null },
          { new: true, upsert: true }
        );
      }
    }
  }

  // Configurator Menus
  const configuratorMenus = [
    { label: 'Forms Builder', title: 'Forms Builder', icon: 'FormOutlined', url: '/configurator/formsbuilder', path: '/configurator/formsbuilder', order: 1, is_configurator: true },
    { label: 'Master Configs', title: 'Master Configs', icon: 'DatabaseOutlined', url: '/configurator/masterconfigs', path: '/configurator/masterconfigs', order: 2, is_configurator: true },
    { label: 'Sidebar Menus', title: 'Sidebar Menus', icon: 'MenuOutlined', url: '/configurator/menus', path: '/configurator/menus', order: 3, is_configurator: true },
    { label: 'Dashboard Builder', title: 'Dashboard Builder', icon: 'AppstoreOutlined', url: '/configurator/mother-dashboard', path: '/configurator/mother-dashboard', order: 4, is_configurator: true },
    { label: 'Report Builder', title: 'Report Builder', icon: 'BarChartOutlined', url: '/configurator/reports', path: '/configurator/reports', order: 5, is_configurator: true },
    { label: 'Site Settings & RBAC', title: 'Site Settings & RBAC', icon: 'SettingOutlined', url: '/configurator/settings', path: '/configurator/settings', order: 6, is_configurator: true },
  ];

  for (const cm of configuratorMenus) {
    await Menu.findOneAndUpdate(
      { url: cm.url },
      { ...cm, is_active: true, deleted_at: null },
      { new: true, upsert: true }
    );
  }
  console.log(`  Top menus and submenus seeded ✓`);

  // 8. Seed State and Financial Year Masters
  await MasterSchema.findOneAndUpdate(
    { slug: 'states' },
    {
      name: 'States Master',
      slug: 'states',
      label_field: 'state_name',
      fields: [
        { name: 'State Name', key: 'state_name', type: 'text', required: true },
        { name: 'State Code', key: 'state_code', type: 'text', required: true },
      ]
    },
    { new: true, upsert: true }
  );

  const indianStates = [
    { state_name: 'Andhra Pradesh', state_code: 'AP' },
    { state_name: 'Delhi', state_code: 'DL' },
    { state_name: 'Gujarat', state_code: 'GJ' },
    { state_name: 'Haryana', state_code: 'HR' },
    { state_name: 'Karnataka', state_code: 'KA' },
    { state_name: 'Maharashtra', state_code: 'MH' },
    { state_name: 'Rajasthan', state_code: 'RJ' },
    { state_name: 'Tamil Nadu', state_code: 'TN' },
    { state_name: 'Telangana', state_code: 'TS' },
    { state_name: 'Uttar Pradesh', state_code: 'UP' },
    { state_name: 'West Bengal', state_code: 'WB' },
  ];

  for (const st of indianStates) {
    await MasterData.findOneAndUpdate(
      { master_slug: 'states', code: st.state_code },
      {
        master_slug: 'states',
        name: st.state_name,
        code: st.state_code,
        data: st
      },
      { new: true, upsert: true }
    );
  }
  console.log(`  ${indianStates.length} States seeded into MasterData ✓`);

  console.log('\n✨ Bootstrap complete! Ready to start mongo-server.');
  await mongoose.disconnect();
}

if (require.main === module) {
  bootstrap().catch(err => {
    console.error('❌ Bootstrap failed:', err);
    process.exit(1);
  });
}

module.exports = { bootstrap };
