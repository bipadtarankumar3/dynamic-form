// mongo-server/src/modules/menu/menu.controller.js
const Menu = require("../../models/Menu.model");

const menuController = {

  // Get full menu tree for current user (from Menu Master)
  getMenuTree: async (req, res) => {
    try {
      const { isConfigurator, role_slug } = req.user || {};
      const isAdmin = role_slug === "admin" || role_slug === "super_admin";

      const query = { deleted_at: null, is_active: true };

      // Configurator-only internal menus should not clutter application sidebar
      query.is_configurator = false;

      // Role-based visibility filtering for non-admin users
      if (!isAdmin && !isConfigurator && role_slug) {
        query.$or = [{ allowed_roles: { $size: 0 } }, { allowed_roles: role_slug }];
      }

      const menus = await Menu.find(query).sort({ order: 1 }).lean();

      // Build tree hierarchy
      const tree = buildMenuTree(menus, null);

      return res.json({ success: true, data: tree });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // Admin / Configurator: list all menus flat (for Menu Master)
  listMenus: async (req, res) => {
    try {
      const menus = await Menu.find({ deleted_at: null }).sort({ order: 1 }).lean();
      return res.json({ success: true, count: menus.length, data: menus });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  createMenu: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const { label, icon, image, url, parent_id, order, module_key, is_configurator, allowed_roles } = req.body;
      if (!label) return res.status(400).json({ success: false, message: "label is required" });
      const menu = await Menu.create({
        label,
        icon: icon || "FileTextOutlined",
        image,
        url,
        parent_id: parent_id || null,
        order: order || 0,
        module_key,
        is_configurator: is_configurator || false,
        allowed_roles: allowed_roles || [],
        created_by: userId,
      });
      return res.status(201).json({ success: true, message: "Menu created", data: menu });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  updateMenu: async (req, res) => {
    try {
      const { id } = req.params;
      const { label, icon, image, url, parent_id, order, module_key, is_configurator, is_active, allowed_roles } = req.body;
      const menu = await Menu.findByIdAndUpdate(
        id,
        { label, icon, image, url, parent_id, order, module_key, is_configurator, is_active, allowed_roles },
        { new: true }
      );
      if (!menu) return res.status(404).json({ success: false, message: "Menu not found" });
      return res.json({ success: true, message: "Menu updated", data: menu });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  deleteMenu: async (req, res) => {
    try {
      const { id } = req.params;
      await Menu.findByIdAndUpdate(id, { deleted_at: new Date() });
      return res.json({ success: true, message: "Menu deleted" });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // Reorder: bulk update order
  reorder: async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ success: false, message: "items array is required" });
      await Promise.all(
        items.map((item) =>
          Menu.findByIdAndUpdate(item.id, { order: item.order, parent_id: item.parent_id || null })
        )
      );
      return res.json({ success: true, message: "Menu order updated" });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

function buildMenuTree(menus, parentId) {
  return menus
    .filter((m) => String(m.parent_id || null) === String(parentId || null))
    .map((m) => ({
      ...m,
      id: m._id ? m._id.toString() : m.id,
      children: buildMenuTree(menus, m._id ? m._id.toString() : m.id),
    }));
}

module.exports = menuController;
