// mongo-server/src/modules/pivot/pivot.controller.js
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const DatabaseView = require("../../models/DatabaseView.model");
const Form = require("../../models/Form.model");
const FormData = require("../../models/FormData.model");
const MasterSchema = require("../../models/MasterSchema.model");
const MasterData = require("../../models/MasterData.model");
const CustomDashboardWidget = require("../../models/CustomDashboardWidget.model");

// Helper: infer column data type
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

// Helper: fetch all records from a given table/view/form/master
async function fetchDatasetRecords(tableName) {
  const cleanName = (tableName || "").trim();
  const slugWithoutPrefix = cleanName.replace(/^(v_|vw_|view_)/i, "");

  // 1. Check DatabaseView
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
    const baseCollection = dbView.base_collection || "formdatas";
    const records = await mongoose.connection.db.collection(baseCollection).aggregate(pipeline).toArray();
    return records;
  }

  // 2. Check Form
  const form = await Form.findOne({ slug: cleanName, deleted_at: null }).lean();
  if (form) {
    const records = await FormData.find({ form_slug: cleanName, deleted_at: null }).lean();
    return records.map((r) => {
      const flat = {
        id: r._id.toString(),
        _id: r._id.toString(),
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        created_by: r.created_by?.toString() || null,
        ...(r.data || {}),
      };
      return flat;
    });
  }

  // 3. Check MasterSchema
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

  // 4. Fallback: check if direct collection exists
  try {
    const records = await mongoose.connection.db.collection(cleanName).find({}).limit(5000).toArray();
    return records;
  } catch (e) {
    return [];
  }
}

const pivotController = {

  // GET /pivot/tables
  getTables: async (req, res) => {
    try {
      const [views, forms, masters] = await Promise.all([
        DatabaseView.find({ deleted_at: null }).lean(),
        Form.find({ deleted_at: null }).lean(),
        MasterSchema.find({ deleted_at: null }).lean(),
      ]);

      const list = [];

      // 1. Database Views
      views.forEach((v) => {
        const viewSlug = v.view_slug || v.slug || `v_${v._id}`;
        list.push({
          id: viewSlug.startsWith("v_") ? viewSlug : `v_${viewSlug}`,
          label: v.view_name || v.name || viewSlug,
          type: "view",
        });
      });

      // 2. Forms
      forms.forEach((f) => {
        list.push({
          id: f.slug,
          label: f.title || f.name || f.slug,
          type: "form",
        });
      });

      // 3. Masters
      masters.forEach((m) => {
        list.push({
          id: m.slug,
          label: m.name || m.title || m.slug,
          type: "master",
        });
      });

      return res.json({
        success: true,
        status: true,
        data: list,
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  // GET /pivot/columns/:tableName
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

      // 1. Check DatabaseView
      const dbView = await DatabaseView.findOne({
        $or: [{ view_slug: cleanName }, { view_slug: slugWithoutPrefix }, { slug: cleanName }, { slug: slugWithoutPrefix }],
        deleted_at: null,
      }).lean();

      if (dbView) {
        if (Array.isArray(dbView.columns) && dbView.columns.length > 0) {
          dbView.columns.forEach((c) => {
            addCol(c.id || c.name || c.key || c.db_field, c.label || c.name || c.id, inferType(c));
          });
        }

        const baseSlug = dbView.base_form_slug || slugWithoutPrefix;
        const baseForm = await Form.findOne({ slug: baseSlug, deleted_at: null }).lean();
        if (baseForm) {
          addCol("id", "Record ID", "text");
          addCol("status", "Status", "text");
          addCol("created_at", "Created At", "date");
          addCol("created_by_name", "Created By", "text");
          (baseForm.sections || []).forEach((sec) => {
            (sec.fields || []).forEach((f) => {
              const fieldKey = f.db_field || f.id || f.key;
              if (fieldKey) {
                addCol(fieldKey, f.label || fieldKey, inferType(f));
                if (f.type === "select" || f.data_source?.type === "master") {
                  addCol(`${fieldKey}_name`, `${f.label || fieldKey} (Name)`, "text");
                }
              }
            });
          });
          (baseForm.table_columns || []).forEach((c) => {
            const colKey = c.column_name || c.key || c.id;
            if (colKey) addCol(colKey, c.label || colKey, inferType(c));
          });
        }

        // Also sample records from view
        const sampleRecords = await fetchDatasetRecords(cleanName);
        if (sampleRecords.length > 0) {
          Object.keys(sampleRecords[0]).forEach((k) => {
            if (k !== "_id" && k !== "__v") {
              const val = sampleRecords[0][k];
              const t = typeof val === "number" ? "number" : typeof val === "object" ? "json" : "text";
              addCol(k, k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), t);
            }
          });
        }
      }

      // 2. Check Form
      const form = await Form.findOne({ $or: [{ slug: cleanName }, { slug: slugWithoutPrefix }], deleted_at: null }).lean();
      if (form) {
        addCol("id", "Record ID", "text");
        addCol("status", "Status", "text");
        addCol("created_at", "Created At", "date");
        addCol("created_by_name", "Created By", "text");

        (form.sections || []).forEach((sec) => {
          (sec.fields || []).forEach((f) => {
            const fieldKey = f.db_field || f.id || f.key;
            if (fieldKey) {
              addCol(fieldKey, f.label || fieldKey, inferType(f));
              if (f.type === "select" || f.data_source?.type === "master") {
                addCol(`${fieldKey}_name`, `${f.label || fieldKey} (Name)`, "text");
              }
            }
          });
        });

        (form.table_columns || []).forEach((c) => {
          const colKey = c.column_name || c.key || c.id;
          if (colKey) {
            addCol(colKey, c.label || colKey, inferType(c));
          }
        });
      }

      // 3. Check Master
      const master = await MasterSchema.findOne({ slug: cleanName, deleted_at: null }).lean();
      if (master) {
        addCol("id", "ID", "text");
        addCol("name", "Name", "text");
        addCol("is_active", "Is Active", "text");
        addCol("created_at", "Created At", "date");

        (master.fields || []).forEach((f) => {
          const fieldKey = f.db_field || f.name || f.id;
          if (fieldKey) {
            addCol(fieldKey, f.label || fieldKey, inferType(f));
          }
        });
      }

      // 4. Sample fallback
      if (columnsMap.size === 0) {
        const sampleRecords = await fetchDatasetRecords(cleanName);
        if (sampleRecords.length > 0) {
          Object.keys(sampleRecords[0]).forEach((k) => {
            if (k !== "__v") {
              const val = sampleRecords[0][k];
              const t = typeof val === "number" ? "number" : typeof val === "object" ? "json" : "text";
              addCol(k, k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), t);
            }
          });
        }
      }

      const columnsList = Array.from(columnsMap.values());
      return res.json({
        success: true,
        status: true,
        data: columnsList,
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  // GET /pivot/values/:tableName/:columnName
  getFieldValues: async (req, res) => {
    try {
      const { tableName, columnName } = req.params;
      const { search = "" } = req.query;

      const records = await fetchDatasetRecords(tableName);
      const valSet = new Set();

      records.forEach((r) => {
        const val = r[columnName] !== undefined ? r[columnName] : r.data?.[columnName];
        if (val !== undefined && val !== null && val !== "") {
          if (typeof val === "object") {
            valSet.add(val.label || val.name || JSON.stringify(val));
          } else {
            valSet.add(String(val));
          }
        }
      });

      let values = Array.from(valSet);
      if (search) {
        const s = search.toLowerCase();
        values = values.filter((v) => v.toLowerCase().includes(s));
      }

      const formatted = values.map((v) => ({ value: v, label: v }));
      return res.json({ success: true, status: true, data: formatted });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  // POST /pivot/filter-options
  getFilterFieldOptions: async (req, res) => {
    try {
      const { tableName, columnName, search = "" } = req.body;
      const records = await fetchDatasetRecords(tableName);
      const valSet = new Set();

      records.forEach((r) => {
        const val = r[columnName] !== undefined ? r[columnName] : r.data?.[columnName];
        if (val !== undefined && val !== null && val !== "") {
          if (typeof val === "object") {
            valSet.add(val.label || val.name || JSON.stringify(val));
          } else {
            valSet.add(String(val));
          }
        }
      });

      let values = Array.from(valSet);
      if (search) {
        const s = search.toLowerCase();
        values = values.filter((v) => v.toLowerCase().includes(s));
      }

      const formatted = values.map((v) => ({ value: v, label: v }));
      return res.json({ success: true, status: true, data: formatted });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  // POST /pivot/execute
  executePivot: async (req, res) => {
    try {
      const { tableName, zones = {} } = req.body;
      const { filters = [], rows = [], columns = [], values = [] } = zones;

      let records = await fetchDatasetRecords(tableName);

      // 1. Apply Filters
      if (Array.isArray(filters) && filters.length > 0) {
        records = records.filter((r) => {
          for (const f of filters) {
            const fieldId = f.id;
            const selected = Array.isArray(f.selectedValues) ? f.selectedValues.map(String) : [];
            if (selected.length === 0) continue;

            const recordVal = String(r[fieldId] !== undefined ? r[fieldId] : r.data?.[fieldId] ?? "");

            if (f.type === "date_range" && selected.length === 2) {
              const start = new Date(selected[0]).getTime();
              const end = new Date(selected[1]).getTime() + 86400000;
              const valTime = new Date(recordVal).getTime();
              if (isNaN(valTime) || valTime < start || valTime > end) return false;
            } else if (!selected.includes(recordVal)) {
              return false;
            }
          }
          return true;
        });
      }

      // Helper: extract formatted date or grouping string
      const getFormattedFieldValue = (field, r) => {
        const raw = r[field.id] !== undefined ? r[field.id] : r.data?.[field.id];
        if (raw === undefined || raw === null || raw === "") return "-";

        const grp = (field.dateGrouping || field.date_grouping || field.interval || "").toLowerCase();
        const isDate = field.type === "date" || field.id.endsWith("_at") || field.id.endsWith("_date") || field.id === "date";

        if ((grp || isDate) && raw) {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            if (grp === "year") return String(d.getFullYear());
            if (grp === "month" || grp === "month_year") return d.toLocaleString("default", { month: "short", year: "numeric" });
            if (grp === "quarter") return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
            if (grp === "financial_year" || grp === "fy") {
              const yr = d.getFullYear();
              return d.getMonth() >= 3 ? `FY ${yr}-${yr + 1}` : `FY ${yr - 1}-${yr}`;
            }
            return d.toISOString().split("T")[0];
          }
        }

        if (typeof raw === "object") return raw.label || raw.name || JSON.stringify(raw);
        return String(raw);
      };

      // 2. Build Pivot Matrix
      const matrix = new Map();
      const colHeadersSet = new Set();

      records.forEach((r) => {
        const rowKeyParts = rows.map((rf) => getFormattedFieldValue(rf, r));
        const rowKey = rowKeyParts.join(" | ") || "ALL";

        const colKeyParts = columns.map((cf) => getFormattedFieldValue(cf, r));
        const colKey = colKeyParts.join(" | ") || "DEFAULT";
        colHeadersSet.add(colKey);

        if (!matrix.has(rowKey)) {
          const initRow = {};
          rows.forEach((rf, i) => { initRow[rf.id] = rowKeyParts[i] || "-"; });
          matrix.set(rowKey, { _meta: initRow, cols: {} });
        }

        const rowObj = matrix.get(rowKey);
        if (!rowObj.cols[colKey]) {
          rowObj.cols[colKey] = { count: 0, items: [] };
        }

        rowObj.cols[colKey].count += 1;
        rowObj.cols[colKey].items.push(r);
      });

      // 3. Compute Aggregates
      const resultRows = [];
      const colHeaders = Array.from(colHeadersSet);

      matrix.forEach((rowObj, rowKey) => {
        const formattedRow = { ...rowObj._meta };

        colHeaders.forEach((colKey) => {
          const colData = rowObj.cols[colKey];
          if (!colData || colData.items.length === 0) {
            values.forEach((v) => {
              const op = (v.aggType || v.aggregate || "sum").toLowerCase();
              const valKey = columns.length > 0 ? `${colKey} - ${op}_${v.id}` : `${op}_${v.id}`;
              formattedRow[valKey] = 0;
            });
            return;
          }

          values.forEach((v) => {
            const op = (v.aggType || v.aggregate || "sum").toLowerCase();
            const valKey = columns.length > 0 ? `${colKey} - ${op}_${v.id}` : `${op}_${v.id}`;

            const nums = colData.items
              .map((item) => Number(item[v.id] !== undefined ? item[v.id] : item.data?.[v.id]))
              .filter((n) => !isNaN(n));

            if (op === "sum") {
              formattedRow[valKey] = nums.reduce((a, b) => a + b, 0);
            } else if (op === "avg") {
              formattedRow[valKey] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
            } else if (op === "max") {
              formattedRow[valKey] = nums.length ? Math.max(...nums) : 0;
            } else if (op === "min") {
              formattedRow[valKey] = nums.length ? Math.min(...nums) : 0;
            } else if (op.includes("distinct")) {
              const distinctSet = new Set(colData.items.map((item) => item[v.id] ?? item.data?.[v.id]));
              formattedRow[valKey] = distinctSet.size;
            } else {
              formattedRow[valKey] = colData.items.length;
            }
          });
        });

        resultRows.push(formattedRow);
      });

      return res.json({
        success: true,
        status: true,
        data: resultRows,
        rowCount: resultRows.length,
      });
    } catch (e) {
      return res.status(500).json({ success: false, status: false, message: e.message });
    }
  },

  // POST /pivot/save-report
  saveReport: async (req, res) => {
    try {
      const { id, reportName, tableName, zones, chartType } = req.body;
      const title = (reportName || req.body.title || "").trim();
      const targetTable = tableName || req.body.table_name;
      const targetConfig = zones || req.body.configuration;
      const targetChartType = chartType || req.body.chart_type || "none";
      const userId = req.user?.user_id || null;

      if (!title || !targetTable || !targetConfig) {
        return res.status(400).json({ status: false, message: "Missing required fields" });
      }

      let widget = null;
      if (id && mongoose.isValidObjectId(id)) {
        widget = await CustomDashboardWidget.findOne({ _id: id, deleted_at: null });
      }

      if (widget) {
        widget.title = title;
        widget.table_name = targetTable;
        widget.configuration = targetConfig;
        widget.chart_type = targetChartType;
        widget.updated_by = userId;
        await widget.save();

        return res.json({
          status: true,
          message: "Widget updated successfully",
          data: {
            id: widget._id.toString(),
            tcdw_id: widget._id.toString(),
            title: widget.title,
            report_name: widget.title,
            table_name: widget.table_name,
            configuration: widget.configuration,
            chart_type: widget.chart_type,
          },
        });
      }

      const newWidget = await CustomDashboardWidget.create({
        title,
        table_name: targetTable,
        configuration: targetConfig,
        chart_type: targetChartType,
        created_by: userId,
        updated_by: userId,
      });

      return res.json({
        status: true,
        message: "Widget saved successfully",
        data: {
          id: newWidget._id.toString(),
          tcdw_id: newWidget._id.toString(),
          title: newWidget.title,
          report_name: newWidget.title,
          table_name: newWidget.table_name,
          configuration: newWidget.configuration,
          chart_type: newWidget.chart_type,
        },
      });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // GET /pivot/saved-reports
  getSavedReports: async (req, res) => {
    try {
      const widgets = await CustomDashboardWidget.find({ is_active: true, deleted_at: null })
        .sort({ order: 1, created_at: -1 })
        .lean();

      const parsed = widgets.map((w) => ({
        id: w._id.toString(),
        tcdw_id: w._id.toString(),
        tdw_id: w._id.toString(),
        tpsr_id: w._id.toString(),
        title: w.title,
        report_name: w.title,
        table_name: w.table_name,
        chart_type: w.chart_type,
        configuration: w.configuration,
        created_at: w.created_at,
      }));

      return res.json({ status: true, data: parsed });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // GET /pivot/all-reports
  getAllReports: async (req, res) => {
    try {
      const widgets = await CustomDashboardWidget.find({ deleted_at: null })
        .sort({ order: 1, created_at: -1 })
        .lean();

      const parsed = widgets.map((w) => ({
        id: w._id.toString(),
        tcdw_id: w._id.toString(),
        tdw_id: w._id.toString(),
        tpsr_id: w._id.toString(),
        title: w.title,
        report_name: w.title,
        table_name: w.table_name,
        chart_type: w.chart_type,
        is_active: w.is_active,
        order: w.order,
        configuration: w.configuration,
        created_at: w.created_at,
      }));

      return res.json({ status: true, data: parsed });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // PUT /pivot/report/:id/status
  toggleReportStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const widget = await CustomDashboardWidget.findById(id);
      if (!widget) return res.status(404).json({ status: false, message: "Widget not found" });

      widget.is_active = !widget.is_active;
      await widget.save();
      return res.json({ status: true, message: "Widget status updated successfully" });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // DELETE /pivot/report/:id
  deleteReport: async (req, res) => {
    try {
      const { id } = req.params;
      await CustomDashboardWidget.findByIdAndUpdate(id, { deleted_at: new Date() });
      return res.json({ status: true, message: "Widget deleted successfully" });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // PUT /pivot/reports/reorder
  reorderReports: async (req, res) => {
    try {
      const { items } = req.body;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.id) {
            await CustomDashboardWidget.findByIdAndUpdate(item.id, { order: item.order });
          }
        }
      }
      return res.json({ status: true, message: "Widgets reordered successfully" });
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  // POST /pivot/export-excel
  exportExcel: async (req, res) => {
    try {
      const { tableName, zones = {} } = req.body;
      const records = await fetchDatasetRecords(tableName);

      const worksheet = xlsx.utils.json_to_sheet(records);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Pivot Data");

      const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="pivot_report.xlsx"');
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.status(200).send(buffer);
    } catch (e) {
      return res.status(500).json({ status: false, message: e.message });
    }
  },
};

module.exports = pivotController;
