const AuditLog = require("../../models/AuditLog.model");
const User = require("../../models/User.model");
const Form = require("../../models/Form.model");

const auditLogController = {
  // 1. Datatables / paginated list for frontend AuditLogList table
  auditLogDt: async (req, res) => {
    try {
      const { start = 0, length = 10, search = {}, filterParams = {} } = req.body || {};
      const query = {};

      // Filter by module / table
      const tableName = filterParams.table_name || filterParams.module;
      if (tableName) {
        query.module = tableName;
      }

      // Filter by user
      const userId = filterParams.user_id;
      if (userId) {
        query.user_id = userId;
      }

      // Filter by operation / action
      const operation = filterParams.operation_type || filterParams.operation || filterParams.action;
      if (operation) {
        const opUpper = String(operation).toUpperCase();
        if (opUpper === "INSERT" || opUpper === "CREATE") {
          query.action = { $in: ["create", "insert", "INSERT", "CREATE"] };
        } else if (opUpper === "UPDATE" || opUpper === "EDIT") {
          query.action = { $in: ["update", "edit", "UPDATE", "EDIT"] };
        } else if (opUpper === "DELETE") {
          query.action = { $in: ["delete", "DELETE"] };
        } else {
          query.action = new RegExp(operation, "i");
        }
      }

      // Filter by date range
      if (filterParams.date_range?.from_date || filterParams.date_range?.to_date) {
        query.created_at = {};
        if (filterParams.date_range.from_date) {
          const from = new Date(filterParams.date_range.from_date);
          from.setHours(0, 0, 0, 0);
          query.created_at.$gte = from;
        }
        if (filterParams.date_range.to_date) {
          const to = new Date(filterParams.date_range.to_date);
          to.setHours(23, 59, 59, 999);
          query.created_at.$lte = to;
        }
      }

      // Global Search term
      if (search?.value) {
        const s = String(search.value).trim();
        query.$or = [
          { module: new RegExp(s, "i") },
          { action: new RegExp(s, "i") },
          { record_id: new RegExp(s, "i") },
          { ip_address: new RegExp(s, "i") },
        ];
      }

      const skip = Number(start) || 0;
      const limit = Number(length) || 10;

      const [logs, recordsFiltered, recordsTotal] = await Promise.all([
        AuditLog.find(query)
          .populate("user_id", "name email")
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query),
        AuditLog.countDocuments(),
      ]);

      const formatted = logs.map((log) => {
        let changedCount = 0;
        if (log.new_data && log.old_data) {
          const allKeys = new Set([...Object.keys(log.old_data), ...Object.keys(log.new_data)]);
          changedCount = Array.from(allKeys).filter(
            (k) => JSON.stringify(log.old_data[k]) !== JSON.stringify(log.new_data[k])
          ).length;
        } else if (log.new_data) {
          changedCount = Object.keys(log.new_data).length;
        }

        let opDisplay = "UPDATE";
        const act = String(log.action || "").toLowerCase();
        if (act === "create" || act === "insert") opDisplay = "INSERT";
        else if (act === "delete") opDisplay = "DELETE";
        else opDisplay = act.toUpperCase();

        return {
          id: log._id,
          schema_name: "public",
          table_name: log.module,
          operation: opDisplay,
          record_id: log.record_id ? String(log.record_id) : "-",
          changed_columns: changedCount ? `${changedCount} columns` : "-",
          changed_by: log.user_id ? `${log.user_id.name || log.user_id.email}` : "System",
          changed_at: log.created_at,
          created_at: log.created_at,
          ip_address: log.ip_address || "127.0.0.1",
          client_app: log.user_agent ? (log.user_agent.length > 30 ? log.user_agent.substring(0, 30) + "..." : log.user_agent) : "Web Browser",
          old_data: log.old_data,
          new_data: log.new_data,
        };
      });

      return res.json({
        success: true,
        recordsTotal,
        recordsFiltered,
        data: formatted,
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // 2. Fetch specific audit entry by ID for diff comparison modal
  getAuditDetailsById: async (req, res) => {
    try {
      const id = req.body?.id || req.params?.id || req.query?.id;
      if (!id) return res.status(400).json({ success: false, message: "ID is required" });

      const log = await AuditLog.findById(id).populate("user_id", "name email").lean();
      if (!log) return res.status(404).json({ success: false, message: "Audit details not found" });

      return res.json({
        success: true,
        data: {
          id: log._id,
          table_name: log.module,
          operation: String(log.action || "").toUpperCase(),
          record_id: log.record_id,
          old_data: log.old_data || {},
          new_data: log.new_data || {},
          user_name: log.user_id ? `${log.user_id.name} (${log.user_id.email})` : "System",
          created_at: log.created_at,
        },
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // 3. Get distinct table/module names for filtering
  getAuditTableNames: async (req, res) => {
    try {
      const distinctModules = await AuditLog.distinct("module");
      const formSlugs = await Form.distinct("slug", { is_active: { $ne: false } });
      const combined = Array.from(new Set([...distinctModules, ...formSlugs])).filter(Boolean).sort();

      const options = combined.map((item) => ({
        label: item.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value: item,
      }));

      return res.json({ success: true, data: options });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // 4. Get distinct users for filtering
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find({ deleted_at: null }).select("_id name email").sort({ name: 1 }).lean();
      const options = users.map((u) => ({
        label: `${u.name || "Unnamed"} (${u.email})`,
        value: String(u._id),
      }));

      return res.json({ success: true, data: options });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // 5. General REST listing
  listLogs: async (req, res) => {
    try {
      const { page = 1, limit = 50, module, action } = req.query;
      const query = {};
      if (module) query.module = module;
      if (action) query.action = action;

      const skip = (Number(page) - 1) * Number(limit);
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate("user_id", "name email")
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(Number(limit)),
        AuditLog.countDocuments(query),
      ]);

      return res.json({
        success: true,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
        data: logs,
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

module.exports = auditLogController;

