// mongo-server/src/seedTwoUsers.js
// Seeds the 2 requested users:
// 1. configurator@example.com (Configurator role — access to configurator tools)
// 2. admin@example.com (Admin role — full access to all menus and all forms)
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User.model");
const Role = require("./models/Role.model");
const Permission = require("./models/Permission.model");
const RolePermission = require("./models/RolePermission.model");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db");
  console.log("Connected to MongoDB...");

  // 1. Ensure Roles exist
  const configuratorRole = await Role.findOneAndUpdate(
    { slug: "configurator" },
    {
      name: "Configurator",
      slug: "configurator",
      description: "Form and system configurator",
      is_configurator: true,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );

  const adminRole = await Role.findOneAndUpdate(
    { slug: "admin" },
    {
      name: "Admin",
      slug: "admin",
      description: "Administrator with full forms and menu access",
      is_configurator: false,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );

  console.log("Roles ensured: 'configurator' and 'admin'");

  // 2. Ensure all permissions exist and are assigned to both roles
  const permissions = await Permission.find({ deleted_at: null });

  for (const role of [configuratorRole, adminRole]) {
    await RolePermission.deleteMany({ role_id: role._id });
    const perms = permissions.map((p) => ({
      role_id: role._id,
      permission_id: p._id,
    }));
    await RolePermission.insertMany(perms);
    console.log(`Assigned ${perms.length} permissions to "${role.name}"`);
  }

  // 3. Create or Update User 1: Configurator
  const hashedPassword = await bcrypt.hash("Admin@1234", 12);

  const configuratorUser = await User.findOneAndUpdate(
    { email: "configurator@example.com" },
    {
      name: "Configurator",
      email: "configurator@example.com",
      password: hashedPassword,
      role_id: configuratorRole._id,
      role_slug: "configurator",
      is_configurator: true,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );
  console.log("✅ User 1: Configurator -> configurator@example.com (Password: Admin@1234)");

  // 4. Create or Update User 2: Admin
  const adminUser = await User.findOneAndUpdate(
    { email: "admin@example.com" },
    {
      name: "Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role_id: adminRole._id,
      role_slug: "admin",
      is_configurator: false,
      is_active: true,
      deleted_at: null,
    },
    { new: true, upsert: true }
  );
  console.log("✅ User 2: Admin -> admin@example.com (Password: Admin@1234)");

  await mongoose.disconnect();
  console.log("Finished seeding users.");
}

run().catch((err) => {
  console.error("Error seeding users:", err);
  process.exit(1);
});
