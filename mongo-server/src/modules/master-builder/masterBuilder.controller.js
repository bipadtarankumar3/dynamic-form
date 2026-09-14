// mongo-server/src/modules/master-builder/masterBuilder.controller.js
const MasterSchema = require("../../models/MasterSchema.model");
const MasterData = require("../../models/MasterData.model");
const AuditLog = require("../../models/AuditLog.model");

const masterBuilderController = {

  // ---- SCHEMA MANAGEMENT ----
  listSchemas: async (req, res) => {
    try {
      const schemas = await MasterSchema.find({ deleted_at: null }).sort({ created_at: -1 });
      return res.json({ success: true, count: schemas.length, data: schemas });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getSchema: async (req, res) => {
    try {
      const { slug } = req.params;
      const schema = await MasterSchema.findOne({ slug, deleted_at: null });
      if (!schema) return res.status(404).json({ success: false, message: "Master schema not found" });
      return res.json({ success: true, data: schema });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  saveSchema: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { slug, name, label_field, fields, allow_search, allow_export } = req.body;
      if (!slug || !name) return res.status(400).json({ success: false, message: "slug and name are required" });

      const payload = { name, label_field: label_field || "name", fields: fields || [], allow_search, allow_export, updated_by: userId };

      const existing = await MasterSchema.findOne({ slug, deleted_at: null });
      if (existing) {
        const updated = await MasterSchema.findByIdAndUpdate(existing._id, payload, { new: true });
        return res.json({ success: true, message: "Master schema updated", data: updated });
      } else {
        const schema = await MasterSchema.create({ ...payload, slug, created_by: userId });
        return res.status(201).json({ success: true, message: "Master schema created", data: schema });
      }
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteSchema: async (req, res) => {
    try {
      const { slug } = req.params;
      await MasterSchema.findOneAndUpdate({ slug, deleted_at: null }, { deleted_at: new Date() });
      return res.json({ success: true, message: "Master schema deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  // ---- DATA MANAGEMENT ----
  listData: async (req, res) => {
    try {
      const { master_slug } = req.params;
      const { page = 1, limit = 50, search } = req.query;

      const masterSchema = await MasterSchema.findOne({ slug: master_slug, deleted_at: null }).lean();
      if (!masterSchema) return res.status(404).json({ success: false, message: "Master schema not found" });

      const labelField = masterSchema.label_field || "name";
      const query = { master_slug, deleted_at: null };
      if (search) query[`data.${labelField}`] = { $regex: search, $options: "i" };

      const skip = (Number(page) - 1) * Number(limit);
      const [records, total] = await Promise.all([
        MasterData.find(query).skip(skip).limit(Number(limit)).sort({ created_at: -1 }).lean(),
        MasterData.countDocuments(query),
      ]);

      const data = records.map(r => ({ id: r._id, ...r.data, is_active: r.is_active, created_at: r.created_at }));

      return res.json({
        success: true,
        schema: masterSchema,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
        data,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  addData: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { master_slug } = req.params;
      const { ...formData } = req.body;

      const masterSchema = await MasterSchema.findOne({ slug: master_slug, deleted_at: null });
      if (!masterSchema) return res.status(404).json({ success: false, message: "Master schema not found" });

      const record = await MasterData.create({ master_slug, data: formData, created_by: userId, updated_by: userId });
      await AuditLog.create({ action: "create", module: `master_${master_slug}`, record_id: record._id, user_id: userId, new_data: formData });

      return res.status(201).json({ success: true, message: "Master record created", data: { id: record._id } });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  editData: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { master_slug, id } = req.params;
      const formData = req.body;

      const record = await MasterData.findOne({ _id: id, master_slug, deleted_at: null }).lean();
      if (!record) return res.status(404).json({ success: false, message: "Master record not found" });

      await MasterData.findByIdAndUpdate(id, { data: { ...record.data, ...formData }, updated_by: userId });
      await AuditLog.create({ action: "update", module: `master_${master_slug}`, record_id: id, user_id: userId, old_data: record.data, new_data: formData });

      return res.json({ success: true, message: "Master record updated" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteData: async (req, res) => {
    try {
      const { master_slug, id } = req.params;
      await MasterData.findOneAndUpdate({ _id: id, master_slug, deleted_at: null }, { deleted_at: new Date() });
      return res.json({ success: true, message: "Master record deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = masterBuilderController;
