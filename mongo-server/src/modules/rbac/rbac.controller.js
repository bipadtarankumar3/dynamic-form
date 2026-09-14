// mongo-server/src/modules/rbac/rbac.controller.js
const Role = require("../../models/Role.model");
const Permission = require("../../models/Permission.model");
const RolePermission = require("../../models/RolePermission.model");
const User = require("../../models/User.model");

const rbacController = {

  // ---- ROLES ----
  listRoles: async (req, res) => {
    try {
      const roles = await Role.find({ deleted_at: null }).sort({ created_at: -1 });
      return res.json({ success: true, count: roles.length, data: roles });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  createRole: async (req, res) => {
    try {
      const { name, slug, description, is_configurator } = req.body;
      if (!name || !slug) return res.status(400).json({ success: false, message: "name and slug are required" });
      const role = await Role.create({ name, slug, description, is_configurator: is_configurator || false });
      return res.status(201).json({ success: true, message: "Role created", data: role });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  updateRole: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, is_configurator, is_active } = req.body;
      const role = await Role.findByIdAndUpdate(id, { name, description, is_configurator, is_active }, { new: true });
      if (!role) return res.status(404).json({ success: false, message: "Role not found" });
      return res.json({ success: true, message: "Role updated", data: role });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteRole: async (req, res) => {
    try {
      const { id } = req.params;
      await Role.findByIdAndUpdate(id, { deleted_at: new Date() });
      return res.json({ success: true, message: "Role deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ---- PERMISSIONS ----
  listPermissions: async (req, res) => {
    try {
      const perms = await Permission.find({ deleted_at: null }).sort({ module: 1, type: 1 });
      return res.json({ success: true, count: perms.length, data: perms });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  createPermission: async (req, res) => {
    try {
      const { module, type, key, label } = req.body;
      if (!module || !type || !key) return res.status(400).json({ success: false, message: "module, type, and key are required" });
      const perm = await Permission.create({ module, type, key, label });
      return res.status(201).json({ success: true, message: "Permission created", data: perm });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ---- ROLE-PERMISSION ASSIGNMENT ----
  assignPermissions: async (req, res) => {
    try {
      const { role_id, permission_ids } = req.body;
      if (!role_id || !Array.isArray(permission_ids)) return res.status(400).json({ success: false, message: "role_id and permission_ids[] are required" });

      // Remove old assignments
      await RolePermission.updateMany({ role_id, deleted_at: null }, { deleted_at: new Date() });

      // Add new ones
      const docs = permission_ids.map(pid => ({ role_id, permission_id: pid }));
      await RolePermission.insertMany(docs);

      return res.json({ success: true, message: "Permissions assigned to role" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getRolePermissions: async (req, res) => {
    try {
      const { role_id } = req.params;
      const rps = await RolePermission.find({ role_id, deleted_at: null }).populate("permission_id");
      return res.json({ success: true, data: rps.map(r => r.permission_id) });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ---- USERS ----
  listUsers: async (req, res) => {
    try {
      const users = await User.find({ deleted_at: null })
        .populate("role_id", "name slug")
        .select("-password")
        .sort({ created_at: -1 });
      return res.json({ success: true, count: users.length, data: users });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  createUser: async (req, res) => {
    try {
      const { name, email, password, role_id, department, designation } = req.body;
      if (!name || !email || !password) return res.status(400).json({ success: false, message: "name, email, and password are required" });

      const existing = await User.findOne({ email: email.toLowerCase(), deleted_at: null });
      if (existing) return res.status(400).json({ success: false, message: "User with this email already exists" });

      const role = role_id ? await Role.findById(role_id) : null;
      const user = await User.create({
        name, email, password, role_id: role?._id || null,
        role_slug: role?.slug || null,
        is_configurator: role?.is_configurator || false,
        department, designation,
      });

      const { password: _p, ...userData } = user.toObject();
      return res.status(201).json({ success: true, message: "User created", data: userData });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role_id, is_active, department, designation } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (role_id !== undefined) {
        const role = await Role.findById(role_id);
        updates.role_id = role_id;
        updates.role_slug = role?.slug || null;
        updates.is_configurator = role?.is_configurator || false;
      }
      if (is_active !== undefined) updates.is_active = is_active;
      if (department !== undefined) updates.department = department;
      if (designation !== undefined) updates.designation = designation;

      const user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password").populate("role_id", "name slug");
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      return res.json({ success: true, message: "User updated", data: user });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      await User.findByIdAndUpdate(id, { deleted_at: new Date(), is_active: false });
      return res.json({ success: true, message: "User deleted (soft)" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getMyPermissions: async (req, res) => {
    try {
      const { role_id, isConfigurator } = req.user || {};
      if (isConfigurator) {
        const all = await Permission.find({ deleted_at: null });
        return res.json({ success: true, isConfigurator: true, data: all });
      }
      const rps = await RolePermission.find({ role_id, deleted_at: null }).populate("permission_id");
      return res.json({ success: true, isConfigurator: false, data: rps.map(r => r.permission_id).filter(Boolean) });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = rbacController;
