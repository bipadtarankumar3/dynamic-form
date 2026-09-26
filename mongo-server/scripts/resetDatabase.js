// mongo-server/scripts/resetDatabase.js
// Cleans up the database and re-seeds system defaults (Roles, Permissions, Admin User, Settings, Menus)
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Role = require("../src/models/Role.model");
const Permission = require("../src/models/Permission.model");
const RolePermission = require("../src/models/RolePermission.model");
const User = require("../src/models/User.model");
const Setting = require("../src/models/Setting.model");
const Menu = require("../src/models/Menu.model");
const Form = require("../src/models/Form.model");
const FormData = require("../src/models/FormData.model");
const MasterSchema = require("../src/models/MasterSchema.model");
const MasterData = require("../src/models/MasterData.model");
const DatabaseView = require("../src/models/DatabaseView.model");
const WorkflowDef = require("../src/models/WorkflowDef.model");
const WorkflowInstance = require("../src/models/WorkflowInstance.model");
const AuditLog = require("../src/models/AuditLog.model");
const Document = require("../src/models/Document.model");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";

async function resetDatabase() {
  console.log("Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  console.log("\n🧹 Cleaning up old collections and views...");
  const collections = await db.listCollections().toArray();

  for (const col of collections) {
    if (col.name.startsWith("system.")) continue;
    try {
      await db.dropCollection(col.name);
      console.log(`  Dropped collection / view: ${col.name}`);
    } catch (e) {
      console.warn(`  Could not drop ${col.name}: ${e.message}`);
    }
  }

  console.log("\n🌱 Seeding System Defaults...");

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
    const role = await Role.create({ ...roleDef, deleted_at: null });
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
      const perm = await Permission.create({
        module: mod,
        type: action,
        key,
        label: `${mod} - ${action}`,
        deleted_at: null,
      });
      permMap[key] = perm;
    }
  }
  console.log(`  ${Object.keys(permMap).length} Permissions seeded ✓`);

  // 3. Assign all permissions to admin/configurator roles
  const adminRoles = ["super_admin", "configurator", "admin"];
  for (const slug of adminRoles) {
    const role = roleMap[slug];
    if (!role) continue;
    const docs = Object.values(permMap).map((p) => ({ role_id: role._id, permission_id: p._id }));
    await RolePermission.insertMany(docs);
    console.log(`  All permissions assigned to "${slug}" ✓`);
  }

  // 4. Seed Manager: list + view + add + edit
  const managerRole = roleMap["manager"];
  if (managerRole) {
    const managerPerms = Object.values(permMap).filter((p) => ["list", "view", "add", "edit"].includes(p.type));
    await RolePermission.insertMany(managerPerms.map((p) => ({ role_id: managerRole._id, permission_id: p._id })));
    console.log(`  Manager permissions assigned ✓`);
  }

  // 5. Seed Users (Admin & Configurator)
  const superAdminRole = roleMap["super_admin"];
  const configuratorRole = roleMap["configurator"];

  const adminUser = await User.create({
    name: "System Admin",
    email: "admin@example.com",
    password: "Admin@1234",
    role_id: superAdminRole._id,
    role_slug: superAdminRole.slug,
    is_configurator: true,
    is_active: true,
    deleted_at: null,
  });
  console.log(`  Admin user seeded: admin@example.com / Admin@1234 ✓`);

  const configuratorUser = await User.create({
    name: "System Configurator",
    email: "configurator@example.com",
    password: "Admin@1234",
    role_id: configuratorRole._id,
    role_slug: configuratorRole.slug,
    is_configurator: true,
    is_active: true,
    deleted_at: null,
  });
  console.log(`  Configurator user seeded: configurator@example.com / Admin@1234 ✓`);

  // 6. Seed Default Settings
  const defaultSettings = [
    { key: "app_name",                  value: "Dynamic Forms Platform", label: "Application Name",    group: "general", is_public: true },
    { key: "skip_ngo_otp_verification", value: false,                    label: "Skip NGO OTP",        group: "auth",    is_public: false },
    { key: "otp_expiry_minutes",        value: 10,                       label: "OTP Expiry (minutes)",group: "auth",    is_public: false },
    { key: "max_file_upload_mb",        value: 10,                       label: "Max Upload Size (MB)",group: "upload",  is_public: true },
  ];
  for (const setting of defaultSettings) {
    await Setting.create({ ...setting, deleted_at: null });
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
    await Menu.create({ ...menuDef, parent_id: null, deleted_at: null, is_active: true });
  }
  console.log(`  ${menuDefs.length} Default menus seeded ✓`);

  console.log("\n✨ Database reset and bootstrap complete!");
  await mongoose.disconnect();
}

resetDatabase().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
