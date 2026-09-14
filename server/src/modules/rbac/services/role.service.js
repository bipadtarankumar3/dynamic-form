const RoleModulePermissionModel = require("../../../models/rolePermission.model");

const assignRoleModulePermissions = async (
  role_id,
  assignments,
  userId,
  transaction
) => {
  if (!role_id || !Array.isArray(assignments)) {
    return res.status(400).json({ message: "Invalid request body" });
  }
  try {
    // Optional: Remove existing permissions for the role
    await RoleModulePermissionModel.destroy({
      where: { rmp_rol_id: role_id },
      transaction,
    });

    // Prepare bulk insert data
    const insertData = [];

    for (const assign of assignments) {
      const { mod_id, permissions } = assign;
      for (const permission of permissions) {
        insertData.push({
          rmp_rol_id: role_id,
          rmp_mod_id: mod_id,
          rmp_created_by: userId??0,
          rmp_perm_id: permission?.value,
        });
      }
    }

    // Insert all new role-module-permission rows
    await RoleModulePermissionModel.bulkCreate(insertData, { transaction });
  } catch (error) {
    await transaction.rollback();

    throw new Error(`Failed to upsert Permission`);
  }
};

module.exports = { assignRoleModulePermissions };
