const Form = require("../../models/Form.model");
const MasterSchema = require("../../models/MasterSchema.model");
const RolePermission = require("../../models/RolePermission.model");
const Document = require("../../models/Document.model");
const User = require("../../models/User.model");
const mongoose = require("mongoose");

const commonController = {

  // GET /common/permissions
  getMyPermissions: async (req, res) => {
    try {
      const { role_id, isConfigurator, role_slug } = req.user || {};
      const isAdmin = isConfigurator || role_slug === "admin" || role_slug === "super_admin";

      // Collect all form slugs, master slugs, and core system modules
      const forms = await Form.find({ deleted_at: null }).select("slug");
      const masters = await MasterSchema.find({ deleted_at: null }).select("slug");
      const coreModules = [
        "users", "roles", "permissions", "menus", "form_builder",
        "master_builder", "database_views", "workflow", "settings",
        "audit", "dashboard", "dynamic_form", "forms", "masters",
      ];

      const allModules = new Set(coreModules);
      forms.forEach((f) => { if (f.slug) allModules.add(f.slug); });
      masters.forEach((m) => { if (m.slug) allModules.add(m.slug); });

      const permMap = {};
      const ALL_ACTIONS = ["list", "add", "edit", "delete", "view", "export", "read"];

      // Admin or Configurator gets full access to all modules and forms
      if (isAdmin) {
        allModules.forEach((mod) => {
          permMap[mod] = ALL_ACTIONS;
        });
        return res.json({ success: true, data: permMap });
      }

      // Role-based permissions lookup
      if (role_id) {
        const rolePerms = await RolePermission.find({ role_id, deleted_at: null }).populate("permission_id");
        rolePerms.forEach((rp) => {
          const p = rp.permission_id;
          if (!p) return;
          const mod = p.module || (p.key ? p.key.split(".")[0] : null);
          const act = p.type || (p.key ? p.key.split(".")[1] : null);
          if (mod && act) {
            if (!permMap[mod]) permMap[mod] = [];
            if (!permMap[mod].includes(act)) permMap[mod].push(act);
          }
        });
      }

      allModules.forEach((mod) => {
        if (!permMap[mod]) permMap[mod] = [];
      });

      return res.json({ success: true, data: permMap });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // POST /common/delete-file
  deleteFile: async (req, res) => {
    try {
      const { documentId } = req.body;
      if (!documentId) return res.status(400).json({ success: false, message: "documentId is required" });

      const query = { deleted_at: null };
      if (mongoose.isValidObjectId(documentId)) {
        query._id = documentId;
      } else {
        query.$or = [{ file_path: documentId }, { file_name: documentId }];
      }

      const doc = await Document.findOne(query);
      if (doc) {
        doc.deleted_at = new Date();
        doc.updated_by = req.user?.user_id || null;
        await doc.save();
      }

      return res.json({ success: true, message: "File deleted successfully" });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /common/documents
  getDocuments: async (req, res) => {
    try {
      const { form_slug, record_id } = req.query;
      const query = { deleted_at: null };
      if (form_slug) query.form_slug = form_slug;
      if (record_id) query.record_id = record_id;

      const documents = await Document.find(query).sort({ created_at: -1 }).lean();
      return res.json({ success: true, data: documents });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // POST /common/slug-wise-user
  slugWiseUser: async (req, res) => {
    try {
      const { role_slug } = req.body;
      const query = { deleted_at: null, is_active: true };
      if (role_slug) query.role_slug = role_slug;
      const users = await User.find(query).select("name email role_slug").lean();
      return res.json({ success: true, data: users });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

module.exports = commonController;
