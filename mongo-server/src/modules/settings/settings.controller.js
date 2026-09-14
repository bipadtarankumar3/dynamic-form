// mongo-server/src/modules/settings/settings.controller.js
const Setting = require("../../models/Setting.model");

const settingsController = {

  listSettings: async (req, res) => {
    try {
      const query = { deleted_at: null };
      // Non-configurators can only see public settings
      if (!req.user?.isConfigurator) query.is_public = true;

      const settings = await Setting.find(query).sort({ group: 1, key: 1 });
      return res.json({ success: true, count: settings.length, data: settings });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  getSetting: async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await Setting.findOne({ key, deleted_at: null });
      if (!setting) return res.status(404).json({ success: false, message: "Setting not found" });
      return res.json({ success: true, data: setting });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  saveSetting: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { key, value, label, group, is_public } = req.body;
      if (!key) return res.status(400).json({ success: false, message: "key is required" });

      const setting = await Setting.findOneAndUpdate(
        { key },
        { key, value, label: label || key, group: group || "general", is_public: is_public || false },
        { new: true, upsert: true }
      );
      return res.json({ success: true, message: "Setting saved", data: setting });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },

  deleteSetting: async (req, res) => {
    try {
      const { key } = req.params;
      await Setting.findOneAndUpdate({ key }, { deleted_at: new Date() });
      return res.json({ success: true, message: "Setting deleted" });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  },
};

module.exports = settingsController;
