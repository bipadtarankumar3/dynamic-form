// mongo-server/src/modules/pivot/pivot.controller.js
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const DatabaseView = require("../../models/DatabaseView.model");
const Form = require("../../models/Form.model");
const MasterSchema = require("../../models/MasterSchema.model");
const MasterData = require("../../models/MasterData.model");
const CustomDashboardWidget = require("../../models/CustomDashboardWidget.model");
const { getFormModel } = require("../../utils/formCollection.util");

function inferType(field) {
  const t = (field?.type || field?.data_type || "").toLowerCase();
  if (
    t.includes("number") ||
    t.includes("double") ||
    t.includes("decimal") ||
    t.includes("int") ||
    t.includes("float") ||
    t.includes("currency")
  ) {
    return "number";
  }
  if (t.includes("date") || t.includes("time")) {
    return "date";
  }
  if (t.includes("json") || t.includes("array") || t.includes("object")) {
    return "json";
  }
  return "text";
}

async function fetchDatasetRecords(tableName) {
  const cleanName = (tableName || "").trim();
  const slugWithoutPrefix = cleanName.replace(/^(v_|vw_|view_)/i, "");

  const dbView = await DatabaseView.findOne({
    $or: [{ view_slug: cleanName }, { view_slug: slugWithoutPrefix }, { slug: cleanName }, { slug: slugWithoutPrefix }],
    deleted_at: null,
  }).lean();

  if (dbView) {
    const rawPipeline = dbView.pipeline || [];
    const pipeline = Array.isArray(rawPipeline)
      ? rawPipeline
      : typeof rawPipeline === "string"
      ? JSON.parse(rawPipeline)
      : [];
    const baseCollection = dbView.source_collection || dbView.base_collection || "formdatas";
    const records = await mongoose.connection.db.collection(baseCollection).aggregate(pipeline).toArray();
    return records;
  }

  const form = await Form.findOne({ slug: cleanName, deleted_at: null }).lean();
  if (form) {
    const FormModel = getFormModel(form);
    const records = await FormModel.find({ deleted_at: null }).lean();
    return records.map((r) => ({
      id: r._id.toString(),
      _id: r._id.toString(),
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: r.created_by?.toString() || null,
      ...(r.data || {}),
    }));
  }

  const master = await MasterSchema.findOne({ slug: cleanName, deleted_at: null }).lean();
  if (master) {
    const records = await MasterData.find({ master_slug: cleanName, deleted_at: null }).lean();
    return records.map((r) => ({
      id: r._id.toString(),
      _id: r._id.toString(),
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      ...(r.data || {}),
    }));
  }

  try {
    const records = await mongoose.connection.db.collection(cleanName).find({}).limit(5000).toArray();
    return records;
  } catch (e) {
    return [];
  }
}

const pivotController = {
  getTables: async (req, res) => {
    try {
      const [views, forms, masters] = await Promise.all([
        DatabaseView.find({ deleted_at: null }).lean(),
        Form.find({ deleted_at: null }).lean(),
        MasterSchema.find({ deleted_at: null }).lean(),
      ]);

      const list = [];
      views.forEach((v) => {
        const viewSlug = v.view_slug || v.slug || `v_${v._id}`;
        list.push({
          id: viewSlug.startsWith("v_") ? viewSlug : `v_${viewSlug}`,
          label: v.view_name || v.name || viewSlug,
          type: "view",
        });
      });

      forms.forEach((f) => {
        list.push({
          id: f.slug,
          label: f.title || f.name || f.slug,
          type: "form",
        });
      });

      masters.forEach((m) => {
        list.push({
          id: m.slug,
          label: m.name || m.title || m.slug,
          type: "master",
        });
      });

      return res.json({ success: true, status: true, data: list });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  getColumns: async (req, res) => {
    try {
      const { tableName } = req.params;
      const cleanName = (tableName || "").trim();
      const slugWithoutPrefix = cleanName.replace(/^(v_|vw_|view_)/i, "");

      const columnsMap = new Map();
      const addCol = (id, label, type = "text") => {
        if (!id || columnsMap.has(id)) return;
        columnsMap.set(id, {
          id,
          label: label || id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          type,
        });
      };

      const dbView = await DatabaseView.findOne({
        $or: [{ view_slug: cleanName }, { view_slug: slugWithoutPrefix }, { slug: cleanName }, { slug: slugWithoutPrefix }],
        deleted_at: null,
      }).lean();

      if (dbView) {
        const baseSlug = dbView.base_form_slug || slugWithoutPrefix;
        const baseForm = await Form.findOne({ slug: baseSlug, deleted_at: null }).lean();
        if (baseForm) {
          addCol("id", "Record ID", "text");
          addCol("status", "Status", "text");
          addCol("created_at", "Created At", "date");
          (baseForm.sections || []).forEach((sec) => {
            (sec.fields || []).forEach((f) => {
              const fieldKey = f.db_field || f.id || f.key;
              if (fieldKey) addCol(fieldKey, f.label || fieldKey, inferType(f));
            });
          });
        }
      }

      const form = await Form.findOne({ $or: [{ slug: cleanName }, { slug: slugWithoutPrefix }], deleted_at: null }).lean();
      if (form) {
        addCol("id", "Record ID", "text");
        addCol("status", "Status", "text");
        addCol("created_at", "Created At", "date");
        (form.sections || []).forEach((sec) => {
          (sec.fields || []).forEach((f) => {
            const fieldKey = f.db_field || f.id || f.key;
            if (fieldKey) addCol(fieldKey, f.label || fieldKey, inferType(f));
          });
        });
      }

      const master = await MasterSchema.findOne({ slug: cleanName, deleted_at: null }).lean();
      if (master) {
        addCol("id", "ID", "text");
        addCol("name", "Name", "text");
        addCol("is_active", "Is Active", "text");
        (master.fields || []).forEach((f) => {
          const fieldKey = f.db_field || f.name || f.id;
          if (fieldKey) addCol(fieldKey, f.label || fieldKey, inferType(f));
        });
      }

      const columnsList = Array.from(columnsMap.values());
      return res.json({ success: true, status: true, data: columnsList });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  getFieldValues: async (req, res) => {
    try {
      const { tableName, columnName } = req.params;
      const { search = "" } = req.query;

      const records = await fetchDatasetRecords(tableName);
      const valSet = new Set();

      records.forEach((r) => {
        const val = r[columnName] !== undefined ? r[columnName] : r.data?.[columnName];
        if (val !== undefined && val !== null && val !== "") {
          valSet.add(typeof val === "object" ? val.label || val.name || JSON.stringify(val) : String(val));
        }
      });

      let values = Array.from(valSet);
      if (search) {
        const s = search.toLowerCase();
        values = values.filter((v) => v.toLowerCase().includes(s));
      }

      return res.json({ success: true, status: true, data: values.map(v => ({ value: v, label: v })) });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  executePivot: async (req, res) => {
    try {
      const { tableName, zones = {} } = req.body;
      const { filters = [], rows = [], columns = [], values = [] } = zones;

      let records = await fetchDatasetRecords(tableName);

      if (Array.isArray(filters) && filters.length > 0) {
        records = records.filter((r) => {
          for (const f of filters) {
            const fieldId = f.id;
            const selected = Array.isArray(f.selectedValues) ? f.selectedValues.map(String) : [];
            if (selected.length === 0) continue;

            const recordVal = String(r[fieldId] !== undefined ? r[fieldId] : r.data?.[fieldId] ?? "");
            if (!selected.includes(recordVal)) return false;
          }
          return true;
        });
      }

      return res.json({
        success: true,
        status: true,
        data: records,
        rowCount: records.length,
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  exportExcel: async (req, res) => {
    try {
      const { tableName } = req.body;
      const records = await fetchDatasetRecords(tableName);

      const worksheet = xlsx.utils.json_to_sheet(records);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Pivot Data");

      const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="pivot_report.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.status(200).send(buffer);
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // ---- REPORTS / SAVED WIDGETS CRUD ----
  getAllReports: async (req, res) => {
    try {
      const PivotReport = require("../../models/PivotReport.model");
      const reports = await PivotReport.find({ deleted_at: null }).sort({ order: 1, created_at: -1 }).lean();
      const formatted = reports.map((r) => ({
        id: String(r._id),
        _id: String(r._id),
        report_id: String(r._id),
        name: r.name || r.title || "Report",
        title: r.title || r.name || "Report",
        table_name: r.table_name,
        chart_type: r.chart_type || "kpi_card",
        configuration: r.configuration || r.zones || {},
        zones: r.zones || r.configuration || {},
        is_active: r.is_active !== false,
        status: r.is_active !== false,
        roles: r.roles || [],
        order: r.order || 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      return res.json({
        success: true,
        status: true,
        count: formatted.length,
        data: formatted,
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  getSavedReports: async (req, res) => {
    try {
      const PivotReport = require("../../models/PivotReport.model");
      const reports = await PivotReport.find({ deleted_at: null, is_active: { $ne: false } }).sort({ order: 1, created_at: -1 }).lean();
      const formatted = reports.map((r) => ({
        id: String(r._id),
        _id: String(r._id),
        report_id: String(r._id),
        name: r.name || r.title,
        title: r.title || r.name,
        table_name: r.table_name,
        chart_type: r.chart_type || "kpi_card",
        configuration: r.configuration || r.zones || {},
        is_active: r.is_active !== false,
        status: r.is_active !== false,
        order: r.order || 0,
      }));

      return res.json({
        success: true,
        status: true,
        data: formatted,
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  saveReport: async (req, res) => {
    try {
      const PivotReport = require("../../models/PivotReport.model");
      const userId = req.user?.user_id;
      const { id, name, title, table_name, chart_type, configuration, zones, roles, is_active } = req.body;

      const reportName = name || title;
      if (!reportName || !table_name) {
        return res.status(400).json({ success: false, status: false, message: "Report title and table_name are required" });
      }

      const payload = {
        name: reportName,
        title: reportName,
        table_name,
        chart_type: chart_type || "kpi_card",
        configuration: configuration || zones || {},
        zones: zones || configuration || {},
        roles: roles || [],
        is_active: is_active !== false,
        updated_by: userId,
      };

      if (id && mongoose.isValidObjectId(id)) {
        const updated = await PivotReport.findByIdAndUpdate(id, payload, { new: true }).lean();
        return res.json({
          success: true,
          status: true,
          message: "Report updated successfully",
          data: { ...updated, _id: String(updated._id), id: String(updated._id) },
        });
      }

      const created = await PivotReport.create({ ...payload, created_by: userId });
      return res.status(201).json({
        success: true,
        status: true,
        message: "Report saved successfully",
        data: { ...created.toObject(), _id: String(created._id), id: String(created._id) },
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  toggleReportStatus: async (req, res) => {
    try {
      const PivotReport = require("../../models/PivotReport.model");
      const { id } = req.params;
      const report = await PivotReport.findById(id);
      if (!report) {
        return res.status(404).json({ success: false, status: false, message: "Report not found" });
      }
      report.is_active = !report.is_active;
      await report.save();
      return res.json({
        success: true,
        status: true,
        message: `Report ${report.is_active ? "activated" : "deactivated"} successfully`,
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  deleteReport: async (req, res) => {
    try {
      const PivotReport = require("../../models/PivotReport.model");
      const { id } = req.params;
      await PivotReport.findByIdAndUpdate(id, { deleted_at: new Date() });
      return res.json({ success: true, status: true, message: "Report deleted successfully" });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  reorderReports: async (req, res) => {
    try {
      const PivotReport = require("../../models/PivotReport.model");
      const { items = [] } = req.body;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = item.id || item._id;
        if (itemId && mongoose.isValidObjectId(itemId)) {
          await PivotReport.findByIdAndUpdate(itemId, { order: i });
        }
      }
      return res.json({ success: true, status: true, message: "Reports reordered successfully" });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  getFilterOptions: async (req, res) => {
    try {
      const { table_name, field, search = "" } = req.body;
      const records = await fetchDatasetRecords(table_name);
      const valSet = new Set();
      records.forEach((r) => {
        const val = r[field] !== undefined ? r[field] : r.data?.[field];
        if (val !== undefined && val !== null && val !== "") {
          valSet.add(typeof val === "object" ? val.label || val.name || JSON.stringify(val) : String(val));
        }
      });
      let values = Array.from(valSet);
      if (search) {
        const s = search.toLowerCase();
        values = values.filter((v) => v.toLowerCase().includes(s));
      }
      return res.json({ success: true, status: true, data: values.map((v) => ({ value: v, label: v })) });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },
};

module.exports = pivotController;
