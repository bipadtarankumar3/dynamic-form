// server/scripts/bootstrapCompany.js
// ============================================================
// Run once per new company deployment to:
//   1. Create the PostgreSQL database (if not exists)
//   2. Create all core tables (from schema.sql)
//   3. Seed default roles, menus, modules, financial year, settings
//   4. Create the Configurator user
// Usage:
//   node scripts/bootstrapCompany.js
// ============================================================

require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const {
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_USER = "postgres",
  DB_PASSWORD = "",
  DB_NAME,
  CONFIGURATOR_EMAIL = "admin@company.com",
  CONFIGURATOR_PASSWORD = "Admin@1234",
  CONFIGURATOR_NAME = "System Configurator",
  APP_NAME = "CSR Platform",
} = process.env;

if (!DB_NAME) {
  console.error("[Bootstrap] ERROR: DB_NAME is not set in .env");
  process.exit(1);
}

// -------------------------------------------------------
// Step 1 — Connect to 'postgres' (admin DB) to create company DB
// -------------------------------------------------------
async function createDatabase() {
  const adminClient = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD,
    database: "postgres",
  });

  await adminClient.connect();
  console.log(`[Bootstrap] Connected to postgres admin DB`);

  const exists = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [DB_NAME]
  );

  if (exists.rows.length === 0) {
    if (!/^[a-zA-Z0-9_]+$/.test(DB_NAME)) {
      throw new Error(`[Bootstrap] Invalid DB_NAME: ${DB_NAME}. Only alphanumeric and underscores allowed.`);
    }
    await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`[Bootstrap] ✅ Database "${DB_NAME}" created`);
  } else {
    console.log(`[Bootstrap] Database "${DB_NAME}" already exists — skipping creation`);
  }

  await adminClient.end();
}

// -------------------------------------------------------
// Step 2 — Run schema.sql DDL on the company DB
// -------------------------------------------------------
async function runSchema(client) {
  const schemaPath = path.join(__dirname, "sql", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await client.query(sql);
  console.log("[Bootstrap] ✅ Core tables created (schema.sql executed)");
}

// -------------------------------------------------------
// Step 3 — Seed default roles
// -------------------------------------------------------
async function seedRoles(client) {
  const roles = [
    {
      slug: "configurator",
      name: "Configurator",
      is_configurator: true,
      description: "Full platform configuration access",
    },
    {
      slug: "admin",
      name: "Admin",
      is_configurator: false,
      description: "Company admin — user and data management",
    },
    {
      slug: "manager",
      name: "Manager",
      is_configurator: false,
      description: "Approval and oversight role",
    },
    {
      slug: "employee",
      name: "Employee",
      is_configurator: false,
      description: "Standard operational user",
    },
    {
      slug: "viewer",
      name: "Viewer",
      is_configurator: false,
      description: "Read-only access",
    },
  ];

  for (const role of roles) {
    await client.query(
      `INSERT INTO t_roles (name, slug, is_configurator, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [role.name, role.slug, role.is_configurator, role.description]
    );
  }
  console.log("[Bootstrap] ✅ Default roles seeded (Configurator, Admin, Manager, Employee, Viewer)");
}

// -------------------------------------------------------
// Step 4 — Seed Default Users
// -------------------------------------------------------
async function seedDefaultUsers(client) {
  // 1. Configurator User
  const confRole = await client.query(
    "SELECT id FROM t_roles WHERE slug = 'configurator' AND deleted_at IS NULL LIMIT 1"
  );
  if (confRole.rows.length === 0) {
    throw new Error("[Bootstrap] Configurator role not found. Seed roles first.");
  }
  const confRoleId = confRole.rows[0].id;
  const confHash = await bcrypt.hash("Default@123", 12);
  await client.query(
    `INSERT INTO t_users
       (name, email, password, role_id, role_slug, is_active)
     VALUES ($1, $2, $3, $4, 'configurator', TRUE)
     ON CONFLICT (email) DO NOTHING`,
    ["System Configurator", "configurator@cyberswift.com", confHash, confRoleId]
  );
  console.log("[Bootstrap] ✅ Configurator user created: configurator@cyberswift.com");

  // 2. Admin User
  const adminRole = await client.query(
    "SELECT id FROM t_roles WHERE slug = 'admin' AND deleted_at IS NULL LIMIT 1"
  );
  if (adminRole.rows.length === 0) {
    throw new Error("[Bootstrap] Admin role not found. Seed roles first.");
  }
  const adminRoleId = adminRole.rows[0].id;
  const adminHash = await bcrypt.hash("Default@123", 12);
  await client.query(
    `INSERT INTO t_users
       (name, email, password, role_id, role_slug, is_active)
     VALUES ($1, $2, $3, $4, 'admin', TRUE)
     ON CONFLICT (email) DO NOTHING`,
    ["System Admin", "admin@cyberswift.com", adminHash, adminRoleId]
  );
  console.log("[Bootstrap] ✅ Admin user created: admin@cyberswift.com");
}

// -------------------------------------------------------
// Step 5 — Seed default modules
// -------------------------------------------------------
async function seedModules(client) {
  const modules = [
    { key: "dashboard",       label: "Dashboard",           icon: "dashboard",  order: 1 },
    { key: "users",           label: "User Management",     icon: "people",     order: 2 },
    { key: "roles",           label: "Role Management",     icon: "shield",     order: 3 },
    { key: "menus",           label: "Menu Management",     icon: "menu",       order: 4 },
    { key: "masters",         label: "Master Management",   icon: "database",   order: 5 },
    { key: "form_builder",    label: "Form Builder",        icon: "forms",      order: 6 },
    { key: "budget",          label: "Budget",              icon: "money",      order: 7 },
    { key: "proposal",        label: "Proposal",            icon: "document",   order: 8 },
    { key: "project",         label: "Projects",            icon: "folder",     order: 9 },
    { key: "workflow",        label: "Approval Workflow",   icon: "flow",       order: 10 },
    { key: "reports",         label: "Reports",             icon: "chart",      order: 11 },
    { key: "notifications",   label: "Notification Center", icon: "bell",       order: 12 },
    { key: "documents",       label: "Document Management", icon: "file",       order: 13 },
    { key: "audit",           label: "Audit Logs",          icon: "audit",      order: 14 },
    { key: "settings",        label: "Settings",            icon: "settings",   order: 15 },
  ];

  for (const mod of modules) {
    await client.query(
      `INSERT INTO t_modules (key, label, icon, "order")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING`,
      [mod.key, mod.label, mod.icon, mod.order]
    );
  }
  console.log("[Bootstrap] ✅ Default modules seeded (15 modules)");
}

// -------------------------------------------------------
// Step 6 — Seed default menus
// -------------------------------------------------------
async function seedMenus(client) {
  const topMenus = [
    { label: "Dashboard", icon: "DashboardOutlined", url: "/dashboard", order: 1, is_configurator: false },
    { label: "Auth", icon: "SafetyCertificateOutlined", url: "auth", order: 100, is_configurator: false },
  ];

  for (const menu of topMenus) {
    await client.query(
      `INSERT INTO t_menus (label, icon, image, url, "order", is_active, is_configurator)
       VALUES ($1, $2, NULL, $3, $4, TRUE, $5)
       ON CONFLICT DO NOTHING`,
      [menu.label, menu.icon, menu.url, menu.order, menu.is_configurator]
    );
  }

  const authParent = await client.query(`SELECT id FROM t_menus WHERE label = 'Auth' LIMIT 1`);
  if (authParent.rows.length > 0) {
    const authParentId = authParent.rows[0].id;
    const subMenus = [
      { label: "Roles", url: "/admin/auth/roles", icon: "TeamOutlined", module_key: "roles", order: 1 },
      { label: "Permissions", url: "/admin/auth/permissions", icon: "SafetyOutlined", module_key: "permissions", order: 2 },
      { label: "Users", url: "/admin/auth/users", icon: "UserOutlined", module_key: "users", order: 3 },
      { label: "Approval Path", url: "/admin/auth/approval-path", icon: "BranchesOutlined", module_key: "approval_path", order: 4 }
    ];

    for (const sub of subMenus) {
      await client.query(
        `INSERT INTO t_menus (label, icon, image, url, "order", parent_id, module_key, is_configurator, is_public, is_active)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, FALSE, FALSE, TRUE)
         ON CONFLICT DO NOTHING`,
        [sub.label, sub.icon, sub.url, sub.order, authParentId, sub.module_key]
      );
    }
  }

  console.log("[Bootstrap] ✅ Default menus seeded (Dashboard, Auth, Roles, Permissions, Users, Approval Path)");
}

// -------------------------------------------------------
// Step 6b — Seed Admin role permissions (core modules)
// Grants Admin full CRUD+export on all static Auth & Dashboard
// modules so the Admin user works out-of-the-box on every
// new client deployment without any manual UI setup.
// -------------------------------------------------------
async function seedAdminPermissions(client) {
  // All modules that Admin should have full access to out-of-the-box.
  // Keep in sync with seedModules() above.
  const coreModules = [
    // Auth & System
    { slug: "dashboard",     label: "Dashboard" },
    { slug: "users",         label: "Users Management" },
    { slug: "roles",         label: "Roles Management" },
    { slug: "permissions",   label: "Permissions Management" },
    { slug: "approval_path", label: "Approval Paths" },
    { slug: "menus",         label: "Menu Management" },
    { slug: "settings",      label: "Settings" },
    { slug: "audit",         label: "Audit Logs" },
    // Platform Modules (static, not Configurator-built forms)
    { slug: "workflow",      label: "Approval Workflow" },
    { slug: "reports",       label: "Reports" },
    { slug: "documents",     label: "Document Management" },
    { slug: "notifications", label: "Notification Center" },
    { slug: "masters",       label: "Master Management" },
    { slug: "form_builder",  label: "Form Builder" },
    // NOTE: budget, proposal, project are Configurator-built dynamic forms
    // and are NOT seeded here — they are assigned per-client by the Configurator.
  ];

  const baseActions = ["list", "add", "edit", "delete", "export"];

  // Get Admin role id
  const adminRole = await client.query(
    `SELECT id FROM t_roles WHERE slug = 'admin' AND deleted_at IS NULL LIMIT 1`
  );
  if (adminRole.rows.length === 0) {
    console.warn("[Bootstrap] ⚠️  Admin role not found — skipping permission seed");
    return;
  }
  const adminRoleId = adminRole.rows[0].id;

  let seededCount = 0;
  for (const mod of coreModules) {
    for (const act of baseActions) {
      const permKey = `${mod.slug}.${act}`;
      const permLabel = `${mod.label} - ${act.toUpperCase()}`;

      // Upsert the permission record
      const permRes = await client.query(
        `INSERT INTO t_permissions (key, label, type, module)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE
           SET label = EXCLUDED.label, type = EXCLUDED.type, module = EXCLUDED.module,
               deleted_at = NULL
         RETURNING id`,
        [permKey, permLabel, act, mod.slug]
      );
      const permId = permRes.rows[0]?.id;
      if (!permId) continue;

      // Assign permission to Admin role
      await client.query(
        `INSERT INTO t_role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id)
         DO UPDATE SET deleted_at = NULL, updated_at = NOW()`,
        [adminRoleId, permId]
      );
      seededCount++;
    }
  }

  console.log(`[Bootstrap] ✅ Admin permissions seeded: ${seededCount} permission(s) across ${coreModules.length} core modules`);
}

// -------------------------------------------------------
// Step 7 — Seed default settings
// -------------------------------------------------------
async function seedSettings(client) {
  const settings = [
    { key: "app_name",                  value: APP_NAME,      type: "string",  group: "general",    label: "Application Name" },
    { key: "app_logo",                  value: "",            type: "string",  group: "general",    label: "Logo URL" },
    { key: "site_name",                 value: APP_NAME,      type: "string",  group: "general",    label: "Website Name" },
    { key: "site_title",                value: APP_NAME,      type: "string",  group: "general",    label: "Website Title" },
    { key: "site_description",          value: "CSR Platform Web Application", type: "string", group: "general", label: "Website Description" },
    { key: "footer_text",               value: "© 2026 TechCSR. All rights reserved.", type: "string", group: "general", label: "Footer Text" },
    { key: "primary_color",             value: "#15803d",     type: "string",  group: "theme",      label: "Primary Color" },
    { key: "secondary_color",           value: "#659327",     type: "string",  group: "theme",      label: "Secondary Color" },
    { key: "date_format",               value: "DD/MM/YYYY",  type: "string",  group: "general",    label: "Date Format" },
    { key: "currency_symbol",           value: "₹",           type: "string",  group: "general",    label: "Currency Symbol" },
    { key: "otp_login_enabled",         value: "true",        type: "boolean", group: "auth",       label: "OTP Login Enabled" },
    { key: "otp_expiry_minutes",        value: "10",          type: "number",  group: "auth",       label: "OTP Expiry (minutes)" },
    { key: "session_timeout_hrs",       value: "8",           type: "number",  group: "auth",       label: "Session Timeout (hours)" },
    { key: "s3_prefix",                 value: DB_NAME,       type: "string",  group: "storage",    label: "S3 Key Prefix" },
    { key: "timezone",                  value: "Asia/Kolkata",type: "string",  group: "general",    label: "Timezone" },
    { key: "allow_ngo_registration",    value: "true",        type: "boolean", group: "onboarding", label: "Allow NGO Registration" },
    { key: "skip_ngo_otp_verification", value: "false",       type: "boolean", group: "onboarding", label: "Skip NGO Email OTP" },
    { key: "ngo_register_left_title",   value: "NGO Partner Onboarding", type: "string", group: "onboarding", label: "NGO Register Left Title" },
    { key: "ngo_register_left_desc",    value: "",            type: "string",  group: "onboarding", label: "NGO Register Left Description" },
    { key: "ngo_register_form_title",   value: "NGO Partner Registration", type: "string", group: "onboarding", label: "NGO Register Form Title" },
    { key: "ngo_register_form_sub",     value: "Fill in your organization details to begin partnership onboarding", type: "string", group: "onboarding", label: "NGO Register Form Subtitle" },
    { key: "ngo_register_btn_text",     value: "REGISTER AS NGO PARTNER", type: "string", group: "onboarding", label: "NGO Register Button Text" },
    { key: "ngo_register_step1_text",   value: "Enter Darpan & contact credentials", type: "string", group: "onboarding", label: "NGO Register Step 1 Label" },
    { key: "ngo_register_step2_text",   value: "Verify official email address", type: "string", group: "onboarding", label: "NGO Register Step 2 Label" },
    { key: "ngo_register_step3_text",   value: "Manager review & credentials dispatch", type: "string", group: "onboarding", label: "NGO Register Step 3 Label" },
    { key: "smtp_host",                 value: "",            type: "string",  group: "mail",       label: "SMTP Host" },
    { key: "smtp_port",                 value: "587",         type: "number",  group: "mail",       label: "SMTP Port" },
    { key: "smtp_user",                 value: "",            type: "string",  group: "mail",       label: "SMTP Username" },
    { key: "smtp_password",             value: "",            type: "password",group: "mail",       label: "SMTP Password" },
    { key: "smtp_from_name",            value: "TechCSR System", type: "string", group: "mail",     label: "SMTP From Name" },
    { key: "smtp_from_address",         value: "",            type: "string",  group: "mail",       label: "SMTP From Email" },
    { key: "smtp_secure",               value: "false",       type: "boolean", group: "mail",       label: "SMTP Secure SSL/TLS" },
  ];

  for (const stg of settings) {
    await client.query(
      `INSERT INTO t_settings (key, value, type, "group", label)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO NOTHING`,
      [stg.key, stg.value, stg.type, stg.group, stg.label]
    );
  }
  console.log("[Bootstrap] ✅ Default settings seeded");
}

// -------------------------------------------------------
// Step 8 — Seed current financial year
// -------------------------------------------------------
async function seedFinancialYear(client) {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyCode = `${year}-${String(year + 1).slice(-2)}`;
  const startDate = `${year}-04-01`;
  const endDate = `${year + 1}-03-31`;

  await client.query(
    `INSERT INTO t_financial_years (code, start_date, end_date, is_active, is_current)
     VALUES ($1, $2, $3, TRUE, TRUE)
     ON CONFLICT (code) DO NOTHING`,
    [fyCode, startDate, endDate]
  );
  console.log(`[Bootstrap] ✅ Current financial year seeded: ${fyCode}`);
}



async function createMasterConfigsTable(client) {
  // 1. Create table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS t_master_configs (
      id               SERIAL        PRIMARY KEY,
      slug             VARCHAR(255)  UNIQUE NOT NULL,
      table_name       VARCHAR(255)  NOT NULL,
      primary_key      VARCHAR(255)  NOT NULL,
      label_key        VARCHAR(255)  NOT NULL,
      is_active_key    VARCHAR(255)  DEFAULT NULL,
      foreign_key      VARCHAR(255)  DEFAULT NULL,
      created_at       TIMESTAMP     DEFAULT NOW(),
      updated_at       TIMESTAMP     DEFAULT NOW()
    );
  `);

  // 2. Seed states demo row
  await client.query(`
    INSERT INTO t_master_configs (slug, table_name, primary_key, label_key, is_active_key)
    VALUES ('states', 't_frm_state', 'id', 'state_name', 'is_active')
    ON CONFLICT (slug) DO NOTHING;
  `);
}

// -------------------------------------------------------
// MAIN
// -------------------------------------------------------
async function bootstrap() {
  console.log("============================================================");
  console.log(`[Bootstrap] Starting bootstrap for database: ${DB_NAME}`);
  console.log("============================================================");

  try {
    // Step 1: Create DB
    await createDatabase();

    // Step 2: Connect to company DB
    const client = new Client({
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });
    await client.connect();

    // Create master configs table (always run)
    await createMasterConfigsTable(client);

    // Check if tables are already provisioned to prevent double-setup crashes
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 't_users' LIMIT 1`
    );

    if (tableCheck.rows.length > 0) {
      console.log(`[Bootstrap] DB "${DB_NAME}" already provisioned — ensuring core forms...`);
      await client.end();
      const { seedCoreForms } = require("./seedCoreForms");
      await seedCoreForms();
      return;
    }

    console.log(`[Bootstrap] Connected to ${DB_NAME} - Seeding database schema...`);

    // Step 3–9: Run all setup steps
    await runSchema(client);
    await seedRoles(client);
    await seedDefaultUsers(client);
    await seedModules(client);
    await seedMenus(client);
    await seedAdminPermissions(client);
    await seedSettings(client);
    await seedFinancialYear(client);

    await client.end();

    const { seedCoreForms } = require("./seedCoreForms");
    await seedCoreForms();

    console.log("============================================================");
    console.log("[Bootstrap] ✅ Company database bootstrap COMPLETE");
    console.log(`   Database      : ${DB_NAME}`);
    console.log(`   Configurator  : configurator@cyberswift.com (pwd: Default@123)`);
    console.log(`   Admin         : admin@cyberswift.com (pwd: Default@123)`);
    console.log("============================================================");
  } catch (err) {
    console.error("[Bootstrap] ❌ ERROR:", err.message);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = bootstrap;
