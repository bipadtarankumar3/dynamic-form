const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const Datatables = require("../../../services/datatable.service");
const DatatablesFileDownload = require("../../../services/datatable.file.download.service");
const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const moment = require("moment");
const PermissionModel = require("../../../models/permission.model");
const { generateSlug } = require("../../../utils/slugify");
const permissionController = {
  datatable: async (req, res, next) => {
    let where = "1=1 ";
    try {
      let sql = `
SELECT
    p.perm_id,    
    p.perm_name,    
    p.perm_slug,    
    p.perm_is_active,    
    p.perm_created_by,    
    p.perm_created_at
   FROM t_permission p
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
    try {
      let sql = `
  SELECT
    p.perm_id,    
    p.perm_name,    
    p.perm_slug,    
    p.perm_is_active,    
    p.perm_created_by,    
    p.perm_created_at
   FROM t_permission p
    `;

      // Fetch filtered & sorted data
      const result = await DatatablesFileDownload.build(req, sql, where);

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Permission List");

      // Define headers
      const columns = [
        {
          header: "Name of Permission",
          key: "perm_name",
          width: 10,
        },
        { header: "Created At", key: "perm_created_at", width: 10 },
      ];
      worksheet.columns = columns;
      if (result?.data?.length > 0) {
        result.data.forEach((row, index) => {
          const newRow = {};
          columns.forEach(({ key }) => {
            let value = row[key] ?? "";
            if (key === "perm_created_at") {
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
      const fileName = "Permission.xlsx";

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

  upsertPermission: async (req, res, next) => {
    try {
      const { perm_id, perm_name } = req.body;
      const nameCheckCondition = perm_id
        ? {
            [Op.and]: [
              { perm_name: { [Op.iLike]: perm_name.trim() } },
              { perm_id: { [Op.ne]: perm_id } },
            ],
          }
        : {
            perm_name: { [Op.iLike]: perm_name.trim() },
          };

      const existingPermission = await PermissionModel.findOne({
        where: nameCheckCondition,
      });

      if (existingPermission) {
        return res.status(400).json({
          status: false,
          message: "Validation error",
          errors: {
            perm_name: "Permission name already exists",
          },
        });
      }

      const userId = req?.user?.user_id;

      if (perm_id) {
        await PermissionModel.update(
          {
            perm_name,
            perm_updated_by: userId,
          },
          { where: { perm_id } }
        );
        message = "Permission updated successfully";
      } else {
        medRecord = await PermissionModel.create({
          perm_name,
          perm_slug: generateSlug(perm_name),
          perm_created_by: userId,
        });
        message = "Permission created successfully";
      }

      return res.status(perm_id ? 200 : 201).json({
        status: true,
        message,
      });
    } catch (error) {
      return next(CustomErrorHandler.databaseError(error.message));
    }
  },

  list: async (req, res, next) => {
    try {
      const data = await PermissionModel.findAll({
        where: {
          perm_is_active: true,
        },
      });
      const upatedData = data.map((item) => {
        return {
          value: item.perm_id,
          label: item.perm_name,
        };
      });
      res.status(200).json({
        status: true,
        message: "Permission fetched successfully",
        data: upatedData,
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
};

module.exports = permissionController;
