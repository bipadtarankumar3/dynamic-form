// mongo-server/src/models/Menu.model.js
const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema(
  {
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null, index: true },
    label: { type: String, trim: true },
    title: { type: String, trim: true },
    icon: { type: String, default: null },
    url: { type: String, default: null },
    path: { type: String, default: null },
    type: { type: String, default: 'page' },
    order: { type: Number, default: 0 },
    is_configurator: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    roles: [{ type: String }],
    permissions: [{ type: String }],
    permission_keys: [{ type: String }],
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

MenuSchema.index({ order: 1 });
MenuSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
