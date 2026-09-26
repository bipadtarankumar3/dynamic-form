// mongo-server/src/modules/settings/settings.controller.js
const Setting = require('../../models/Setting.model');

const settingsController = {
  // Public settings (app_name, logo, theme, etc.)
  getPublicSettings: async (req, res) => {
    try {
      const settings = await Setting.find({ deleted_at: null });
      const map = {};
      settings.forEach(s => {
        map[s.key] = s.value;
      });

      return res.json({
        success: true,
        settings: map,
        data: map,
        rows: settings
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // All settings (admin/configurator)
  getAllSettings: async (req, res) => {
    try {
      const settings = await Setting.find({ deleted_at: null }).sort({ group: 1, key: 1 });
      const map = {};
      settings.forEach(s => {
        map[s.key] = s.value;
      });

      return res.json({
        success: true,
        count: settings.length,
        settings: map,
        data: settings,
        map
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // Save / Update setting
  saveSetting: async (req, res) => {
    try {
      const { key, value, label, group, is_public } = req.body;
      if (!key) return res.status(400).json({ success: false, message: 'key is required' });

      const setting = await Setting.findOneAndUpdate(
        { key },
        { value, label, group: group || 'general', is_public: Boolean(is_public), deleted_at: null },
        { new: true, upsert: true }
      );
      return res.json({ success: true, message: 'Setting saved', data: setting });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // Bulk save settings
  bulkSaveSettings: async (req, res) => {
    try {
      const { settings } = req.body;
      if (!Array.isArray(settings)) return res.status(400).json({ success: false, message: 'settings array is required' });

      await Promise.all(
        settings.map(s =>
          Setting.findOneAndUpdate(
            { key: s.key },
            { value: s.value, label: s.label, group: s.group || 'general', is_public: Boolean(s.is_public), deleted_at: null },
            { upsert: true }
          )
        )
      );
      return res.json({ success: true, message: 'Settings updated successfully' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

module.exports = settingsController;
