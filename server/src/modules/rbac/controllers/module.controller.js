const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const Datatables = require("../../../services/datatable.service");
const DatatablesFileDownload = require("../../../services/datatable.file.download.service");
const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const moment = require("moment");
const ModuleModel = require("../../../models/module.model");
const { generateSlug } = require("../../../utils/slugify");
const moduleController = {
  datatable: async (req, res, next) => {
    let where = "1=1 ";
    try {
      let sql = `
SELECT
    m.mod_id,    
    m.mod_name,    
    m.mod_slug,    
    m.mod_is_active,    
    m.mod_created_by,    
    m.mod_created_at
   FROM t_module m
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
    m.mod_id,    
    m.mod_name,    
    m.mod_slug,    
    m.mod_is_active,    
    m.mod_created_by,    
    m.mod_created_at
   FROM t_module m
    `;

      // Fetch filtered & sorted data
      const result = await DatatablesFileDownload.build(req, sql, where);

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Module List");

      // Define headers
      const columns = [
        {
          header: "Name of Module",
          key: "mod_name",
          width: 10,
        },
        { header: "Created At", key: "mod_created_at", width: 10 },
      ];
      worksheet.columns = columns;
      if (result?.data?.length > 0) {
        result.data.forEach((row, index) => {
          const newRow = {};
          columns.forEach(({ key }) => {
            let value = row[key] ?? "";
            if (key === "mod_created_at") {
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
      const fileName = "Module.xlsx";

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

  upsertmodule: async (req, res, next) => {
    try {
      const { mod_id, mod_name } = req.body;
      const nameCheckCondition = mod_id
        ? {
            [Op.and]: [
              { mod_name: { [Op.iLike]: mod_name.trim() } },
              { mod_id: { [Op.ne]: mod_id } },
            ],
          }
        : {
            mod_name: { [Op.iLike]: mod_name.trim() },
          };

      const existingModule = await ModuleModel.findOne({
        where: nameCheckCondition,
      });

      if (existingModule) {
        return res.status(400).json({
          status: false,
          message: "Validation error",
          errors: {
            mod_name: "Module name already exists",
          },
        });
      }

      const userId = req?.user?.user_id;

      if (mod_id) {
        await ModuleModel.update(
          {
            mod_name,
            mod_updated_by: userId,
          },
          { where: { mod_id } }
        );
        message = "Module updated successfully";
      } else {
        medRecord = await ModuleModel.create({
          mod_name,
          mod_slug: generateSlug(mod_name),
          mod_created_by: userId,
        });
        message = "Module created successfully";
      }

      return res.status(mod_id ? 200 : 201).json({
        status: true,
        message,
      });
    } catch (error) {
      return next(CustomErrorHandler.databaseError(error.message));
    }
  },

  list: async (req, res, next) => {
    try {
      const data = await ModuleModel.findAll({
        where: {
          mod_is_active: true,
        },
      });
      const upatedData = data.map((item) => {
        return {
          value: item.mod_id,
          label: item.mod_name,
        };
      });
      res.status(200).json({
        status: true,
        message: "Module fetched successfully",
        data: upatedData,
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
};

module.exports = moduleController;
