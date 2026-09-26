const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const Datatables = require("../../../services/datatable.service");
const DatatablesFileDownload = require("../../../services/datatable.file.download.service");
const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const moment = require("moment");
const RoleModel = require("../../../models/role.model");
const parseIfJSON = require("../../../utils/parseIfJSON.utils");
const { assignRoleModulePermissions } = require("../services/role.service");
const { sequelize } = require("../../../config/db.config");
const {
  validateColumnNames,
} = require("../../../utils/validateColumnNames.utils");
const UserModel = require("../../../models/user.model");
const roleController = {
  datatable: async (req, res, next) => {
    let where = "1=1 ";
    const allowedColumns = ["rol_name"];
    try {
      const resData = validateColumnNames({ req, allowedColumns });
      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      let sql = `
SELECT
    r.rol_id,    
    r.rol_name,    
    r.rol_is_active,    
    r.rol_created_by,    
    r.rol_created_at
   FROM t_role r
    `;
      Datatables.build(req, sql, where)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (error) {
      CustomErrorHandler.internalServerError(error.message);
    }
  },

  datatableFileDownload: async (req, res, next) => {
    let where = "1=1 ";
    const allowedColumns = ["rol_name"];
    try {
      const resData = validateColumnNames({ req, allowedColumns });
      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      let sql = `
SELECT
    r.rol_id,    
    r.rol_name,    
    r.rol_is_active,    
    r.rol_created_by,    
    r.rol_created_at
   FROM t_role r
    `;

      // Fetch filtered & sorted data
      const result = await DatatablesFileDownload.build(req, sql, where);

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Role List");

      // Define headers
      const columns = [
        {
          header: "Role Name",
          key: "rol_name",
          width: 10,
        },
        { header: "Created At", key: "rol_created_at", width: 10 },
      ];
      worksheet.columns = columns;
      if (result?.data?.length > 0) {
        result.data.forEach((row, index) => {
          const newRow = {};
          columns.forEach(({ key }) => {
            let value = row[key] ?? "";
            if (key === "rol_created_at") {
              value = value ? moment(value).format("DD-MM-YYYY HH:mm") : "";
            }
            newRow[key] = value;
          });
          worksheet.addRow(newRow);
        });
      } else {
        worksheet.addRow(["No data available"]);
      }

      // Generate the Excel file as a buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set the file name
      const fileName = "Role.xlsx";

      // ✅ Expose Content-Disposition for CORS (IMPORTANT)
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

      // Set response headers
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // Send the file as response
      res.status(200).send(Buffer.from(buffer));
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  upsertRole: async (req, res, next) => {
    let transaction;
    try {
      const { body } = req;
      const nameCheckCondition = body?.rol_id
        ? {
            [Op.and]: [
              { rol_name: { [Op.iLike]: body?.rol_name.trim() } },
              { rol_id: { [Op.ne]: body?.rol_id } },
            ],
          }
        : {
            rol_name: { [Op.iLike]: body?.rol_name.trim() },
          };

      const existingRole = await RoleModel.findOne({
        where: nameCheckCondition,
      });

      if (existingRole) {
        return res.status(400).json({
          status: false,
          message: "Validation error",
          errors: {
            rol_name: "Role name already exists",
          },
        });
      }

      const userId = req?.user?.user_id;
      transaction = await sequelize.transaction();
      const assignments = parseIfJSON("assignments", body);
      let role_id;
      if (body?.rol_id) {
        await RoleModel.update(
          {
            rol_name: body?.rol_name,
            rol_updated_by: userId,
          },
          { where: { rol_id: body?.rol_id }, transaction }
        );
        role_id = body?.rol_id;
        message = "Role updated successfully";
      } else {
        medRecord = await RoleModel.create(
          {
            rol_name: body?.rol_name,
            rol_created_by: userId,
          },
          { transaction }
        );
        role_id = medRecord?.rol_id;
        message = "Role created successfully";
      }
      if (assignments?.length > 0) {
        await assignRoleModulePermissions(
          role_id,
          assignments,
          userId,
          transaction
        );
      }
      await transaction.commit();
      return res.status(body?.rol_id ? 200 : 201).json({
        status: true,
        message,
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return next(CustomErrorHandler.databaseError(error.message));
    }
  },

  details: async (req, res, next) => {
    try {
      const { role_id } = req.body;
      const sql = `
    SELECT 
  role.rol_id,
  role.rol_name,
  COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'mod_id', mod.mod_id,
        'mod_name', mod.mod_name,
        'permissions', COALESCE(mod.permissions, '[]'::JSONB)
      )
    ) FILTER (WHERE mod.mod_id IS NOT NULL), '[]'::JSONB
  ) AS assignments
FROM t_role role
LEFT JOIN (
  SELECT 
    rmp.rmp_rol_id,
    m.mod_id,
    m.mod_name,
    JSONB_AGG(
      JSONB_BUILD_OBJECT('label', p.perm_name, 'value', p.perm_id)
    ) AS permissions
  FROM t_role_module_permission rmp
  LEFT JOIN t_module m ON rmp.rmp_mod_id = m.mod_id
  LEFT JOIN t_permission p ON rmp.rmp_perm_id = p.perm_id
  GROUP BY rmp.rmp_rol_id, m.mod_id, m.mod_name
) mod ON mod.rmp_rol_id = role.rol_id
WHERE role.rol_id = :role_id
GROUP BY role.rol_id, role.rol_name;
    `;

      const [data] = await sequelize.query(sql, {
        replacements: { role_id },
        type: sequelize.QueryTypes.SELECT,
      });

      res.status(200).json({
        status: true,
        message: "Role details fetched successfully",
        data: data || {}, // Assuming single record expected
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  list: async (req, res, next) => {
    try {
      const data = await RoleModel.findAll({
        where: {
          rol_is_active: true,
        },
      });
      const upatedData = data.map((item) => {
        return {
          value: item.rol_id,
          label: item.rol_name,
          slug: item.rol_slug,
        };
      });
      res.status(200).json({
        status: true,
        message: "Role fetched successfully",
        data: upatedData,
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
  userList: async (req, res, next) => {
    try {
      const { role_id } = req.body;
      const data = await UserModel.findAll({
        where: {
          role_id,
          is_active: true,
        },
      });
      const upatedData = data.map((item) => {
        return {
          value: item.user_id,
          label: item.name,
        };
      });
      res.status(200).json({
        status: true,
        message: "Role Wise User fetched successfully",
        data: upatedData,
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
};

module.exports = roleController;
