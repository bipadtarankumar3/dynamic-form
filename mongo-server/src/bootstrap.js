// mongo-server/src/bootstrap.js
// Seeds initial data: Roles, Permissions, Admin User, Default Settings, Sample Menus
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Role = require("./models/Role.model");
const Permission = require("./models/Permission.model");
const RolePermission = require("./models/RolePermission.model");
const User = require("./models/User.model");
const Setting = require("./models/Setting.model");
const Menu = require("./models/Menu.model");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function bootstrap() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // 1. Seed Roles
  const roleDefs = [
    { name: "Super Admin",   slug: "super_admin",  description: "Full system access", is_configurator: true },
    { name: "Configurator",  slug: "configurator", description: "Form and system configurator", is_configurator: true },
    { name: "Admin",         slug: "admin",        description: "Administrator", is_configurator: true },
    { name: "Manager",       slug: "manager",      description: "Manager role", is_configurator: false },
    { name: "Staff",         slug: "staff",        description: "Staff role", is_configurator: false },
    { name: "Viewer",        slug: "viewer",       description: "View-only access", is_configurator: false },
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

  // 2. Seed Permissions (modules x actions)
  const modules = ["form_builder", "master_builder", "menus", "rbac", "settings", "audit", "database_views", "workflow"];
  const actions = ["list", "add", "edit", "delete", "view", "export"];

  const permMap = {};
  for (const mod of modules) {
    for (const action of actions) {
      const key = `${mod}.${action}`;
      const perm = await Permission.findOneAndUpdate(
        { key },
        { module: mod, type: action, key, label: `${mod} - ${action}`, deleted_at: null },
        { new: true, upsert: true }
      );
      permMap[key] = perm;
    }
  }
  console.log(`  ${Object.keys(permMap).length} Permissions seeded ✓`);

  // 3. Assign all permissions to admin/configurator roles
  const adminRoles = ["super_admin", "configurator", "admin"];
  for (const slug of adminRoles) {
    const role = roleMap[slug];
    if (!role) continue;
    await RolePermission.deleteMany({ role_id: role._id });
    const docs = Object.values(permMap).map(p => ({ role_id: role._id, permission_id: p._id }));
    await RolePermission.insertMany(docs);
    console.log(`  All permissions assigned to "${slug}" ✓`);
  }

  // 4. Seed Manager: list + view + add + edit
  const managerRole = roleMap["manager"];
  if (managerRole) {
    await RolePermission.deleteMany({ role_id: managerRole._id });
    const managerPerms = Object.values(permMap).filter(p => ["list", "view", "add", "edit"].includes(p.type));
    await RolePermission.insertMany(managerPerms.map(p => ({ role_id: managerRole._id, permission_id: p._id })));
    console.log(`  Manager permissions assigned ✓`);
  }

  // 5. Seed Admin User
  const adminRole = roleMap["super_admin"];
  const adminPassword = await bcrypt.hash("Admin@1234", 12);
  const adminUser = await User.findOneAndUpdate(
    { email: "admin@example.com" },
    {
      name: "System Admin",
      email: "admin@example.com",
      password: adminPassword,
      role_id: adminRole._id,
      role_slug: adminRole.slug,
      is_configurator: true,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );
  // Since we're using findOneAndUpdate with upsert, we need to bypass the pre-save hook
  // Reset the password manually if it wasn't newly hashed by bcrypt hook
  console.log(`  Admin user: admin@example.com / Admin@1234 ✓`);

  // 6. Seed Default Settings
  const defaultSettings = [
    { key: "app_name",                 value: "Dynamic Forms Platform", label: "Application Name",    group: "general", is_public: true },
    { key: "skip_ngo_otp_verification",value: false,                    label: "Skip NGO OTP",        group: "auth",    is_public: false },
    { key: "otp_expiry_minutes",       value: 10,                       label: "OTP Expiry (minutes)",group: "auth",    is_public: false },
    { key: "max_file_upload_mb",       value: 10,                       label: "Max Upload Size (MB)",group: "upload",  is_public: true },
  ];
  for (const setting of defaultSettings) {
    await Setting.findOneAndUpdate({ key: setting.key }, { ...setting, deleted_at: null }, { new: true, upsert: true });
  }
  console.log(`  ${defaultSettings.length} Default settings seeded ✓`);

  // 7. Seed Sample Menus
  const menuDefs = [
    { label: "Dashboard",       icon: "LayoutDashboard", url: "/dashboard",          order: 1, is_configurator: false },
    { label: "Forms",           icon: "FileText",        url: null,                  order: 2, is_configurator: false },
    { label: "Reports",         icon: "BarChart2",       url: null,                  order: 3, is_configurator: false },
    { label: "Form Builder",    icon: "Layers",          url: "/form-builder",       order: 10, is_configurator: true },
    { label: "Master Builder",  icon: "Database",        url: "/master-builder",     order: 11, is_configurator: true },
    { label: "Menu Manager",    icon: "Menu",            url: "/menu-manager",       order: 12, is_configurator: true },
    { label: "User Management", icon: "Users",           url: "/users",              order: 13, is_configurator: true },
    { label: "Roles & Permissions", icon: "Shield",      url: "/rbac",              order: 14, is_configurator: true },
    { label: "Workflow Builder",icon: "GitBranch",       url: "/workflows",          order: 15, is_configurator: true },
    { label: "Database Views",  icon: "Eye",             url: "/database-views",     order: 16, is_configurator: true },
    { label: "Audit Logs",      icon: "ClipboardList",   url: "/audit",              order: 17, is_configurator: true },
    { label: "Settings",        icon: "Settings",        url: "/settings",           order: 18, is_configurator: true },
  ];

  for (const menuDef of menuDefs) {
    await Menu.findOneAndUpdate(
      { label: menuDef.label, parent_id: null },
      { ...menuDef, deleted_at: null, is_active: true },
      { new: true, upsert: true }
    );
  }
  console.log(`  ${menuDefs.length} Default menus seeded ✓`);

  console.log("\n✅ Bootstrap complete!");
  await mongoose.disconnect();
}

bootstrap().catch(err => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
