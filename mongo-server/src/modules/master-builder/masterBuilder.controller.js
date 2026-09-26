// mongo-server/src/modules/master-builder/masterBuilder.controller.js
const MasterSchema = require('../../models/MasterSchema.model');
const MasterData = require('../../models/MasterData.model');
const Form = require('../../models/Form.model');
const { getFormCollection } = require('../../utils/formCollection.util');

const masterBuilderController = {
  // ---- SCHEMA MANAGEMENT ----
  listSchemas: async (req, res) => {
    try {
      const schemas = await MasterSchema.find({ deleted_at: null }).sort({ created_at: -1 }).lean();
      const masterForms = await Form.find({ is_master: true, deleted_at: null }).sort({ created_at: -1 }).lean();

      // Merge both sources
      const combined = [
        ...schemas.map(s => ({ ...s, _id: s._id.toString(), id: s._id.toString(), is_master_schema: true })),
        ...masterForms.map(f => ({
          ...f,
          _id: f._id.toString(),
          id: f._id.toString(),
          name: f.title,
          label_field: f.title_field || 'name',
          is_master_form: true
        }))
      ];

      return res.json({
        success: true,
        count: combined.length,
        data: combined,
        rows: combined
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  getSchema: async (req, res) => {
    try {
      const slug = req.params.slug || req.params.master_slug || req.params.id;
      let schema = await MasterSchema.findOne({
        $or: [{ slug }, { name: slug }],
        deleted_at: null
      }).lean();

      if (!schema) {
        const form = await Form.findOne({
          $or: [{ slug }, { form_code: slug }, { 'root_entity.table': slug }],
          deleted_at: null
        }).lean();

        if (form) {
          schema = {
            ...form,
            _id: form._id.toString(),
            id: form._id.toString(),
            name: form.title,
            sections: form.sections || [],
            fields: form.sections?.[0]?.fields || []
          };
        }
      }

      if (!schema) {
        return res.status(404).json({ success: false, message: `Master schema '${slug}' not found` });
      }

      return res.json({ success: true, data: schema });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  saveSchema: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { slug, name, label_field, fields, allow_search, allow_export } = req.body;
      if (!slug || !name) return res.status(400).json({ success: false, message: 'slug and name are required' });

      const payload = {
        name,
        label_field: label_field || 'name',
        fields: fields || [],
        allow_search,
        allow_export,
        updated_by: userId
      };

      const existing = await MasterSchema.findOne({ slug, deleted_at: null });
      if (existing) {
        const updated = await MasterSchema.findByIdAndUpdate(existing._id, payload, { new: true });
        return res.json({ success: true, message: 'Master schema updated', data: updated });
      } else {
        const schema = await MasterSchema.create({ ...payload, slug, created_by: userId });
        return res.status(201).json({ success: true, message: 'Master schema created', data: schema });
      }
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  deleteSchema: async (req, res) => {
    try {
      const slug = req.params.slug || req.params.id;
      await MasterSchema.findOneAndUpdate({ slug, deleted_at: null }, { deleted_at: new Date() });
      return res.json({ success: true, message: 'Master schema deleted' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // ---- DATA MANAGEMENT ----
  listData: async (req, res) => {
    try {
      const master_slug = req.params.master_slug || req.params.slug;
      const { page = 1, limit = 100, search } = req.query;

      // Check MasterSchema first
      const masterSchema = await MasterSchema.findOne({ slug: master_slug, deleted_at: null }).lean();
      if (masterSchema) {
        const filter = { master_slug, deleted_at: null };
        if (search) {
          filter.$or = [
            { name: new RegExp(search, 'i') },
            { label: new RegExp(search, 'i') },
            { code: new RegExp(search, 'i') }
          ];
        }

        const items = await MasterData.find(filter)
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .sort({ sort_order: 1, created_at: -1 })
          .lean();

        const total = await MasterData.countDocuments(filter);
        return res.json({
          success: true,
          data: items.map(i => ({ ...i, id: i._id.toString() })),
          rows: items.map(i => ({ ...i, id: i._id.toString() })),
          total,
          page: Number(page),
          totalPages: Math.ceil(total / limit)
        });
      }

      // If not in MasterSchema, check dynamic form collection
      const { Model, form } = await getFormCollection(master_slug);
      if (Model) {
        const filter = { deleted_at: null };
        const items = await Model.find(filter)
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .sort({ createdAt: -1 })
          .lean();

        const total = await Model.countDocuments(filter);
        const mapped = items.map(i => ({
          ...i,
          ...(i.data || {}),
          id: i._id.toString(),
          _id: i._id.toString()
        }));

        return res.json({
          success: true,
          data: mapped,
          rows: mapped,
          total,
          page: Number(page),
          totalPages: Math.ceil(total / limit)
        });
      }

      return res.json({ success: true, data: [], rows: [], total: 0 });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  addData: async (req, res) => {
    try {
      const master_slug = req.params.master_slug || req.params.slug;
      const { data, ...rest } = req.body;
      const payload = { ...(data || {}), ...rest };

      const doc = await MasterData.create({
        master_slug,
        name: payload.name || payload.label || 'Item',
        code: payload.code || null,
        data: payload,
        created_by: req.user?.user_id
      });

      return res.status(201).json({ success: true, message: 'Master record created', data: doc });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  editData: async (req, res) => {
    try {
      const { id } = req.params;
      const { data, ...rest } = req.body;
      const payload = { ...(data || {}), ...rest };

      const updated = await MasterData.findByIdAndUpdate(
        id,
        {
          $set: {
            name: payload.name || payload.label,
            code: payload.code,
            data: payload,
            updated_by: req.user?.user_id
          }
        },
        { new: true }
      );

      return res.json({ success: true, message: 'Master record updated', data: updated });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  deleteData: async (req, res) => {
    try {
      const { id } = req.params;
      await MasterData.findByIdAndUpdate(id, { deleted_at: new Date() });
      return res.json({ success: true, message: 'Master record deleted' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }
};

module.exports = masterBuilderController;
