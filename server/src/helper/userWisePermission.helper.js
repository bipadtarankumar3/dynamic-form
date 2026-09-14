const { sequelize } = require("../config/db.config");
const CustomErrorHandler = require("../services/customErrorHandler.service");

const getUserWiseModulePermission = async (user_id) => {
  try {
    const sql = `
   SELECT COALESCE(jsonb_object_agg(mod_slug, permissions),'{}'::jsonb) AS permissions_map
FROM (
  SELECT 
    m.mod_slug,
    array_agg(DISTINCT p.perm_slug ORDER BY p.perm_slug) AS permissions
  FROM t_user u
  JOIN t_role r ON r.rol_id = u.role_id
  JOIN t_role_module_permission rmp ON rmp.rmp_rol_id = r.rol_id
  JOIN t_module m ON m.mod_id = rmp.rmp_mod_id
  JOIN t_permission p ON p.perm_id = rmp.rmp_perm_id
  WHERE u.user_id = :user_id
  GROUP BY m.mod_slug
) sub;
    `;

    const data = await sequelize.query(sql, {
      replacements: { user_id },
      type: sequelize.QueryTypes.SELECT,
    });

    return data.length > 0 ? data[0].permissions_map : {};
  } catch (error) {
    throw new Error("Error while fetching user permissions: " + error.message);
  }
};

module.exports = { getUserWiseModulePermission };
