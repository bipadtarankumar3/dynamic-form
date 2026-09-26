// mongo-server/src/modules/master-config/masterConfig.controller.js
const MasterConfig = require("../../models/MasterConfig.model");
const Form = require("../../models/Form.model");
const MasterSchema = require("../../models/MasterSchema.model");
const mongoose = require("mongoose");
const { getFormCollectionName } = require("../../utils/formCollection.util");

const slugifyTableName = (text = "") =>
  String(text || "")
    .replace(/^t_mst_|^t_frm_|^t_/, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_");

const normalizeMasterConfig = (doc) => {
  if (!doc) return null;
  const d = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const idStr = String(d._id || d.id || "");
  return {
    ...d,
    _id: idStr,
    id: idStr,
    primary_key: d.primary_key || "_id",
    label_key: d.label_key || "name",
  };
};

const masterConfigController = {
  getAllMasterConfigs: async (req, res) => {
    try {
      const { search = "", page = 1, limit = 10 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = parseInt(limit, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const filter = { deleted_at: null };
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [
          { slug: regex },
          { table_name: regex },
          { label_key: regex },
          { primary_key: regex },
          { foreign_key: regex },
          { is_active_key: regex },
        ];
      }

      const [configs, total] = await Promise.all([
        MasterConfig.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum).lean(),
        MasterConfig.countDocuments(filter),
      ]);

      const formatted = configs.map(normalizeMasterConfig);

      return res.status(200).json({
        success: true,
        data: formatted,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  getDatabaseTables: async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const allCollections = await db.listCollections().toArray();

      const EXCLUDED = new Set([
        "system.views", "system.buckets", "fs.files", "fs.chunks",
        "database_views", "databaseviews", "tokens", "otps", "auditlogs",
        "quicklogs", "menus", "workflowdefs", "workflowinstances",
      ]);

      const forms = await Form.find({ deleted_at: null }).select("slug title").lean();
      const formTableNames = forms.map((f) => f.slug);

      const collectionNames = allCollections
        .map((c) => c.name)
        .filter((name) => !EXCLUDED.has(name) && !name.startsWith("system."));

      const combined = Array.from(new Set([...formTableNames, ...collectionNames])).sort();

      return res.status(200).json({
        success: true,
        data: combined,
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  getTableColumns: async (req, res) => {
    try {
      const { tableName } = req.params;
      const db = mongoose.connection.db;
      const cleanSlug = (tableName || "").replace(/^v_/, "").replace(/^t_frm_/, "").replace(/^t_mst_/, "").replace(/^t_/, "");

      let form = await Form.findOne({ slug: tableName, deleted_at: null }).lean();
      if (!form && cleanSlug && cleanSlug !== tableName) {
        form = await Form.findOne({ slug: cleanSlug, deleted_at: null }).lean();
      }

      const columns = [];
      const seen = new Set();

      if (form) {
        const envelope = [
          { column_name: "_id", data_type: "objectId" },
          { column_name: "form_slug", data_type: "string" },
          { column_name: "status", data_type: "string" },
          { column_name: "created_at", data_type: "date" },
          { column_name: "updated_at", data_type: "date" },
          { column_name: "created_by", data_type: "objectId" },
        ];
        envelope.forEach((e) => { columns.push(e); seen.add(e.column_name); });

        (form.sections || []).forEach((sec) => {
          (sec.fields || []).forEach((fld) => {
            const col = fld.db_field || fld.column_name || fld.id;
            if (!col || seen.has(col)) return;
            seen.add(col);
            columns.push({
              column_name: col,
              data_type: fld.type || "string",
            });
          });
        });
      } else {
        const col = db.collection(tableName);
        const samples = await col.aggregate([{ $sample: { size: 50 } }]).toArray();
        const fieldMap = { _id: "objectId" };
        for (const doc of samples) {
          for (const [k, v] of Object.entries(doc)) {
            if (!fieldMap[k]) fieldMap[k] = typeof v === "object" ? "objectId" : typeof v;
          }
        }
        Object.entries(fieldMap).forEach(([column_name, data_type]) => {
          columns.push({ column_name, data_type });
        });
      }

      const colNames = columns.map((c) => c.column_name);
      const suggested_slug = slugifyTableName(tableName);
      const pkCol = colNames.find((c) => c === "_id" || c === "id") || "_id";
      const labelCol = colNames.find((c) => {
        const lower = c.toLowerCase();
        return lower.includes("name") || lower.includes("title") || lower.includes("label") || lower.includes("code");
      }) || colNames.find((c) => c !== "_id" && c !== "id") || "_id";

      const activeCol = colNames.find((c) => {
        const lower = c.toLowerCase();
        return lower === "is_active" || lower === "status" || lower === "active";
      }) || null;

      const foreignCol = colNames.find((c) => {
        const lower = c.toLowerCase();
        return (lower.endsWith("_id") || lower.endsWith("_code")) && c !== pkCol;
      }) || null;

      const autoPopulated = {
        slug: suggested_slug,
        primary_key: pkCol,
        label_key: labelCol,
        is_active_key: activeCol,
        foreign_key: foreignCol,
      };

      return res.status(200).json({
        success: true,
        data: {
          columns,
          autoPopulated,
        },
        columns,
        autoPopulated,
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  getMasterConfigById: async (req, res) => {
    try {
      const { id } = req.params;
      const query = mongoose.isValidObjectId(id)
        ? { $or: [{ _id: id }, { slug: id }], deleted_at: null }
        : { slug: id, deleted_at: null };

      const config = await MasterConfig.findOne(query).lean();
      if (!config) return res.status(404).json({ success: false, message: "Master configuration not found" });

      return res.status(200).json({
        success: true,
        data: normalizeMasterConfig(config),
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  createMasterConfig: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { slug, table_name, primary_key = "_id", label_key, is_active_key = null, foreign_key = null } = req.body;

      if (!slug || !table_name || !label_key) {
        return res.status(400).json({ success: false, message: "slug, table_name, and label_key are required" });
      }

      const normalizedSlug = slugifyTableName(slug);
      const existing = await MasterConfig.findOne({ slug: normalizedSlug, deleted_at: null });
      if (existing) {
        return res.status(409).json({ success: false, message: `Configuration with slug "${normalizedSlug}" already exists.` });
      }

      const created = await MasterConfig.create({
        slug: normalizedSlug,
        table_name,
        primary_key: primary_key || "_id",
        label_key,
        is_active_key: is_active_key || null,
        foreign_key: foreign_key || null,
        created_by: userId,
      });

      return res.status(201).json({
        success: true,
        message: "Master configuration created successfully",
        data: normalizeMasterConfig(created),
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  updateMasterConfig: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;
      const { slug, table_name, primary_key, label_key, is_active_key, foreign_key } = req.body;

      const query = mongoose.isValidObjectId(id)
        ? { $or: [{ _id: id }, { slug: id }], deleted_at: null }
        : { slug: id, deleted_at: null };

      const existing = await MasterConfig.findOne(query);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Master configuration not found" });
      }

      if (slug && slug !== existing.slug) {
        const checkConflict = await MasterConfig.findOne({ slug: slugifyTableName(slug), _id: { $ne: existing._id }, deleted_at: null });
        if (checkConflict) {
          return res.status(409).json({ success: false, message: `Configuration with slug "${slug}" already exists.` });
        }
        existing.slug = slugifyTableName(slug);
      }

      if (table_name) existing.table_name = table_name;
      if (primary_key !== undefined) existing.primary_key = primary_key || "_id";
      if (label_key) existing.label_key = label_key;
      if (is_active_key !== undefined) existing.is_active_key = is_active_key || null;
      if (foreign_key !== undefined) existing.foreign_key = foreign_key || null;
      existing.updated_by = userId;

      await existing.save();

      return res.status(200).json({
        success: true,
        message: "Master configuration updated successfully",
        data: normalizeMasterConfig(existing),
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  deleteMasterConfig: async (req, res) => {
    try {
      const { id } = req.params;
      const query = mongoose.isValidObjectId(id)
        ? { $or: [{ _id: id }, { slug: id }], deleted_at: null }
        : { slug: id, deleted_at: null };

      const existing = await MasterConfig.findOneAndUpdate(query, { deleted_at: new Date() });
      if (!existing) {
        return res.status(404).json({ success: false, message: "Master configuration not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Master configuration deleted successfully",
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

module.exports = masterConfigController;
