const { sequelize } = require("../../../config/db.config");
const {
  saveUpdateAndPrepareDocumentMetadata,
  saveAndPrepareDocumentMetadata,
} = require("../../../helper/document.helper");

const {
  buildMultiSelectMaps,
  mergeFilesIntoData,
  segregateData,
  insertRow,
  updateRow,
} = require("../helper/addEdit.helper");
const {
  getFormWithSection,
} = require("../../../helper/getFormWithSection.helper");
const { buildGeneralSelectQuery } = require("../helper/generalListView.helper");
const masterConfig = require("../../../modules/master/master.config");
const { buildSelectQueryById } = require("../helper/formAllSectionData.helper");
const CustomErrorHandler = require("../../../services/customErrorHandler.service");

const dynamicFormController = {
  upsert: async (req, res, next) => {
    let transaction;

    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "Invalid form data",
        });
      }
      // fetching schema
      const schema = await getFormWithSection({
        form_slug: "user_registration",
      });

      if (!schema) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema",
        });
      }
      /* schema runtime context */

      // building data type wise maps
      const schemaCtx = buildMultiSelectMaps(schema);

      // merging files into section wise data
      const mergedData = mergeFilesIntoData(req.body, req.files);

      if (Object.keys(mergedData || {}).length === 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid form data",
        });
      }
      // segregating data based on table
      const segregated = segregateData(schema, mergedData);
      const rootTable = schema?.root_entity?.table;
      const rootPKField = schema?.root_entity?.primary_key;

      if (!rootTable || !rootPKField) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema: Missing root entity configuration",
        });
      }

      transaction = await sequelize.transaction();
      let rootPK;
      /* ---------- ROOT UPSERT ---------- */
      if (segregated?.[rootTable]?.[rootPKField]) {
        rootPK = segregated?.[rootTable]?.[rootPKField];
        await updateRow(
          rootTable,
          segregated?.[rootTable],
          { [rootPKField]: rootPK },
          schemaCtx,
          transaction
        );
      } else {
        const created = await insertRow(
          rootTable,
          segregated?.[rootTable],
          schemaCtx,
          transaction
        );
        rootPK = created?.[rootPKField];
      }

      /* ---------- SECTIONS ---------- */
      const pkMap = {};

      for (const section of schema?.sections) {
        if (section?.table === rootTable) continue;
        const rows = segregated?.[section?.table];
        if (!rows) continue;

        /* GENERAL */
        if (section?.type === "general") {
          rows[section?.relation?.foreign_key] = rootPK;

          if (rows[section?.primary_key]) {
            await updateRow(
              section?.table,
              rows,
              { [section?.primary_key]: rows[section?.primary_key] },
              schemaCtx,
              transaction
            );
            pkMap[section?.section_id] = rows[section?.primary_key];
          } else {
            const saved = await insertRow(
              section?.table,
              rows,
              schemaCtx,
              transaction
            );
            pkMap[section?.section_id] = saved[section?.primary_key];
          }
        }

        /* ADD_MORE (UPSERT + DELETE) */
        if (section?.type === "add_more") {
          const keptIds = [];

          for (const row of rows) {
            const tempId = row.__temp_pk;
            delete row.__temp_pk;

            row[section?.relation?.foreign_key] = rootPK;

            if (row[section?.primary_key]) {
              await updateRow(
                section?.table,
                row,
                { [section?.primary_key]: row[section?.primary_key] },
                schemaCtx,
                transaction
              );
              keptIds.push(row[section?.primary_key]);
              pkMap[tempId] = row[section?.primary_key];
            } else {
              const saved = await insertRow(
                section?.table,
                row,
                schemaCtx,
                transaction
              );
              keptIds.push(saved[section?.primary_key]);
              pkMap[tempId] = saved[section?.primary_key];
            }
          }

          if (keptIds.length) {
            await sequelize.query(
              `
              DELETE FROM ${section?.table}
              WHERE ${section?.relation?.foreign_key} = :rootPK
                AND ${section?.primary_key} NOT IN (:ids)
              `,
              {
                replacements: { rootPK, ids: keptIds },
                transaction,
              }
            );
          }
        }
      }

      /* ---------- DOCUMENT ADD / UPDATE ONLY ---------- */
      for (const doc of segregated.__documents) {
        const { section, parentTempId, files } = doc;

        const fileField = section?.fields?.find((f) => f?.type === "file");
        if (!fileField?.file) continue;

        const parentId =
          parentTempId && pkMap?.[parentTempId] ? pkMap[parentTempId] : rootPK;

        const fileSchema = fileField?.file;

        const result = fileSchema?.multiple
          ? await saveAndPrepareDocumentMetadata(
              files,
              parentId,
              `uploads/${fileSchema?.upload_path}`,
              req.user?.id || 0,
              transaction
            )
          : await saveUpdateAndPrepareDocumentMetadata(
              files,
              parentId,
              `uploads/${fileSchema?.upload_path}`,
              req.user?.id || 0,
              transaction
            );

        if (result?.metadata?.length) {
          result.metadata.forEach((m, i) => {
            m.doc_purpose = files?.[i]?.__field;
          });

          const cols = Object.keys(result?.metadata?.[0] || {});
          const sql = `
            INSERT INTO ${fileSchema?.table}
            (${cols.join(", ")})
            VALUES ${result.metadata
              .map((_, i) => `(${cols.map((c) => `:${c}_${i}`).join(", ")})`)
              .join(", ")}
          `;

          const replacements = {};
          result.metadata.forEach((m, i) => {
            cols.forEach((c) => {
              replacements[`${c}_${i}`] = m[c];
            });
          });

          await sequelize.query(sql, {
            replacements,
            transaction,
          });
        }
      }

      await transaction.commit();

      res.json({
        status: true,
        message: `${schema.title} submitted successfully`,
        root_id: rootPK,
      });
    } catch (err) {
      await transaction.rollback();
      next(CustomErrorHandler.internalServerError(err.message));
    }
  },

  listView: async (req, res, next) => {
    try {
      const { filters = {}, search, page = 1, pageSize = 10, sort } = req.body;
      const schema = await getFormWithSection({
        form_slug: "user_registration",
        section_type: "general",
      });

      /* ===============================
         1. BASE SQL
      =============================== */

      const baseSql = buildGeneralSelectQuery(schema, search);
      /* ===============================
         2. WHERE (filters + search)
      =============================== */
      const where = [];
      const replacements = {};

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          where.push(`r.${key} = :${key}`);
          replacements[key] = value;
        }
      });

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      /* ===============================
         3. ORDER BY
      =============================== */
      const rootPK = schema.root_entity.primary_key;

      const orderBy = sort?.field
        ? `ORDER BY ${sort.field} ${sort.order === "asc" ? "ASC" : "DESC"}`
        : `ORDER BY ${rootPK} DESC`;

      /* ===============================
         4. PAGINATION
      =============================== */
      const limit = pageSize;
      const offset = (page - 1) * pageSize;

      /* ===============================
         5. FINAL SQL
      =============================== */
      const finalSql = `
        ${baseSql}
        ${whereSql}
        ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const data = await sequelize.query(finalSql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      /* ===============================
         6. TOTAL COUNT
      =============================== */

      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM (
          ${baseSql}
          ${whereSql}
        ) AS count_table
      `;

      const countResult = await sequelize.query(countSql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      const total = countResult[0]?.total || 0;

      /* ===============================
         8. RESPONSE
      =============================== */
      res.json({
        status: true,
        schema: schema, // only general sections
        data,
        total,
        page,
        pageSize,
      });
    } catch (err) {
      next(CustomErrorHandler.internalServerError(err.message));
    }
  },
  // listViewExcelExport: async (req, res, next) => {
  //   try {
  //     // 1. Base SQL
  //     const baseSql = buildGeneralSelectQuery(listviewUpdate);

  //     // 2. Default ORDER BY
  //     const rootPK = listviewUpdate.root_entity.primary_key;
  //     const finalSql = `
  //     ${baseSql}
  //     ORDER BY r.${rootPK} DESC
  //   `;

  //     // 3. Fetch all rows
  //     const rows = await sequelize.query(finalSql, {
  //       type: sequelize.QueryTypes.SELECT,
  //     });

  //     // 4. Build Excel columns from schema (USE LABEL COLUMNS)
  //     const columns = [];

  //     listviewUpdate.sections
  //       .filter((section) => section.type === "general")
  //       .forEach((section) => {
  //         section.fields.forEach((field) => {
  //           if (!field.db_field) return;
  //           if (field.type === "file") return;

  //           // ✅ MASTER (single select) → export LABEL
  //           if (field.data_source?.type === "master" && !field.multiple) {
  //             const labelKey = field.data_source.label_key;
  //             const excelKey = `${labelKey}_${field.db_field}`;

  //             columns.push({
  //               header: field.label,
  //               key: excelKey,
  //               width: 25,
  //             });
  //             return;
  //           }

  //           // ✅ MASTER (multiple select)
  //           if (field.data_source?.type === "master" && field.multiple) {
  //             columns.push({
  //               header: field.label,
  //               key: field.db_field,
  //               width: 30,
  //             });
  //             return;
  //           }

  //           // ✅ NORMAL FIELD
  //           columns.push({
  //             header: field.label,
  //             key: field.db_field,
  //             width: 25,
  //           });
  //         });
  //       });

  //     // 5. Create Excel
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet("Project List");

  //     worksheet.columns = columns;

  //     rows.forEach((row) => {
  //       const excelRow = {};

  //       listviewUpdate.sections
  //         .filter((section) => section.type === "general")
  //         .forEach((section) => {
  //           section.fields.forEach((field) => {
  //             if (!field.db_field) return;
  //             if (field.type === "file") return;

  //             excelRow[
  //               field.data_source?.type === "master" && !field.multiple
  //                 ? `${field.data_source.label_key}_${field.db_field}`
  //                 : field.db_field
  //             ] = resolveExcelValue(row, field);
  //           });
  //         });

  //       worksheet.addRow(excelRow);
  //     });

  //     // 6. Send file
  //     res.setHeader(
  //       "Content-Type",
  //       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  //     );
  //     res.setHeader(
  //       "Content-Disposition",
  //       `attachment; filename=project_list.xlsx`
  //     );

  //     await workbook.xlsx.write(res);
  //     res.end();
  //   } catch (err) {
  //     next(err);
  //   }
  // },
  details: async (req, res, next) => {
    try {
      const { selected_data } = req.body;
      const schema = await getFormWithSection({
        form_slug: "user_registration",
      });

      const { sql, replacements } = buildSelectQueryById({
        schema,
        selected_data,
      });
      console.log(sql);
      console.log(replacements);

      const [result] = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.log(err);

      next(err);
    }
  },
  schemaDetails: async (req, res, next) => {
    try {
      const { form_slug, section_slug, section_type } = req.body;
      const result = await getFormWithSection({
        form_slug,
        section_slug,
        section_type,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
  schemaDetails: async (req, res, next) => {
    try {
      const { form_slug, section_slug, section_type } = req.body;
      const result = await getFormWithSection({
        form_slug,
        section_slug,
        section_type,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
  masterDetails: async (req, res) => {
    const { master, filters = {} } = req.body;

    /* =========================
           BASIC VALIDATION
        ========================= */
    if (!master) {
      return res.status(400).json({
        success: false,
        message: "master is required",
      });
    }

    const config = masterConfig[master];

    if (!config || config.type !== "master") {
      return res.status(400).json({
        success: false,
        message: `Invalid master: ${master}`,
      });
    }

    const { table_name, primary_key, label_key } = config;

    /* =========================
           BUILD WHERE CLAUSE
        ========================= */
    let whereClause = "1=1";
    const replacements = {};

    /**
     * filters example:
     * { ts_state_id: 10 }
     */
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;

      // safety: allow only simple equality filters
      whereClause += ` AND ${config.foreign_key} = :${config.foreign_key}`;
      replacements[config.foreign_key] = value;
    });

    /* =========================
           FINAL QUERY
        ========================= */
    const sql = `
          SELECT
            ${primary_key} AS value,
            ${label_key}  AS label
          FROM ${table_name}
          WHERE ${whereClause}
          ORDER BY ${label_key}
        `;

    try {
      const data = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return res.json({
        success: true,
        master,
        count: data.length,
        data,
      });
    } catch (err) {
      console.error("Master data error:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch master data",
      });
    }
  },
};

module.exports = dynamicFormController;
