// mongo-server/src/modules/audit/auditLog.controller.js
const AuditLog = require("../../models/AuditLog.model");

const auditLogController = {

  list: async (req, res) => {
    try {
      const { module, user_id, record_id, action, page = 1, limit = 50 } = req.query;
      const query = {};
      if (module) query.module = module;
      if (user_id) query.user_id = user_id;
      if (record_id) query.record_id = record_id;
      if (action) query.action = action;

      const skip = (Number(page) - 1) * Number(limit);
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate("user_id", "name email")
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      return res.json({
        success: true,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
        data: logs,
      });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = auditLogController;
