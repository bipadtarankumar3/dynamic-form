const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../../config/db.config");
const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const DatatablesReplacement = require("../../../services/datatable.replacement.service");
const {
  validateColumnNames,
} = require("../../../utils/validateColumnNames.utils");
const DatatablesFileDownloadReplacement = require("../../../services/datatable.file.download.replacement.service");
const moment = require("moment");
const ExcelJS = require("exceljs");

const buildDateWhere = (columnName, replacements, from, to) => {
  let where = "WHERE 1=1 ";

  if (from && to) {
    where += `
      AND (${columnName} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
      BETWEEN :from_date AND :to_date
    `;
    replacements.from_date = from;
    replacements.to_date = to;
  }

  return where;
};

const dashboardController = {
  getDashboardCounts: async (req, res, next) => {
    try {
      const { from_date, to_date } = req.body;
      const replacements = {};
      let where = "";

      // Queries (all reuse same WHERE)

      const proposalWhere = buildDateWhere(
        "tpro_created_at",
        replacements,
        from_date,
        to_date,
      );

      const proposalCountSql = `
         SELECT 
             COUNT(*) AS total_count,
             COUNT(*) FILTER (WHERE tpro_status = 'APPROVED') AS approved_count,
             COUNT(*) FILTER (WHERE tpro_status = 'PENDING') AS pending_count,
             COUNT(*) FILTER (WHERE tpro_status = 'RESEND') AS resend_count
         FROM public.t_proposal
         ${proposalWhere}
        ;

    `;

      const projectWhere = buildDateWhere(
        "tprjct_created_at",
        replacements,
        from_date,
        to_date,
      );
      const projectCountSql = `
         SELECT 
             COUNT(*) AS total_count,
             COUNT(*) FILTER (WHERE tprjct_status = 'APPROVED') AS approved_count,
             COUNT(*) FILTER (WHERE tprjct_status = 'PENDING') AS pending_count,
             COUNT(*) FILTER (WHERE tprjct_status = 'RESEND') AS resend_count
         FROM public.t_project
         ${projectWhere};
    `;

      const budgetWhere = buildDateWhere(
        "ttabud_created_at",
        replacements,
        from_date,
        to_date,
      );
      const budgetTotalSql = `
         SELECT SUM(ttabud_budget_amount) AS total_amount
         FROM public.t_theme_activity_budgets
         ${budgetWhere};
    `;

      const ngoWhere = buildDateWhere(
        "tng_created_at",
        replacements,
        from_date,
        to_date,
      );
      const ngoCountSql = `
         SELECT count(*) AS total_count
         FROM public.t_ngo
         ${ngoWhere};
    `;

      const studentsCoverageWhere = buildDateWhere(
        "tedusp_created_at",
        replacements,
        from_date,
        to_date,
      );
      const studentsCoverageCountSql = `
         SELECT 
             COUNT(*) AS total_count,
             COUNT(*) FILTER (WHERE tedusp_gender = 'male') AS male_count,
             COUNT(*) FILTER (WHERE tedusp_gender = 'female') AS female_count
         FROM public.t_edu_scholarship
         ${studentsCoverageWhere};`;

      const trainingCoverageWhere = buildDateWhere(
        "tsdtrdt_created_at",
        replacements,
        from_date,
        to_date,
      );
      const trainingCoverageCountSql = `
         SELECT 
             SUM(tsdtrdt_enrollment_count) AS enrolled_count,
             SUM(tsdtrdt_trained_count) AS trained_count,
             SUM(tsdtrdt_placed_count) AS placed_count,
             SUM(tsdtrdt_dropout_count) AS dropout_count
         FROM public.t_skill_dev_training_dtls
         ${trainingCoverageWhere};`;

      const utilizationWhere = buildDateWhere(
        "pan.tpan_created_at",
        replacements,
        from_date,
        to_date,
      );
      const utilizationTotalSql = `
         SELECT 
             SUM(tpand_payment_required) AS total_amount,
             SUM(tpand_payment_required) FILTER (WHERE tpan_status = 'PENDING') AS pending_amount,
             SUM(tpand_payment_required) FILTER (WHERE tpan_status = 'APPROVED') AS approved_amount,
             SUM(tpand_payment_required) FILTER (WHERE tpan_status = 'RESEND') AS resend_amount
         FROM public.t_payment_advice_note pan
         left join t_payment_advice_note_deliverable pand on pand.tpand_pan_id = pan.tpan_id
         ${utilizationWhere};`;

      const scholarshipsWhere = buildDateWhere(
        "tedusp_created_at",
        replacements,
        from_date,
        to_date,
      );
      const totalScholarshipsCountSql = `
         SELECT 
             COUNT(*) AS total_count
         FROM public.t_edu_scholarship
         ${scholarshipsWhere};`;

      const itemsSuppliedAtSchoolWhere = buildDateWhere(
        "tedusip_created_at",
        replacements,
        from_date,
        to_date,
      );
      const itemsSuppliedAtSchoolCountSql = `
         SELECT 
             COUNT(*) AS total_count
         FROM public.t_edu_supplies_item_provd
         ${itemsSuppliedAtSchoolWhere};`;

      const mmuOrganizedWhere = buildDateWhere(
        "thlmmu_created_at",
        replacements,
        from_date,
        to_date,
      );
      const mmuOrganizedCountSql = `
         SELECT 
             COUNT(*) AS total_count
         FROM public.t_health_mmu
         ${mmuOrganizedWhere};`;

      const megaCampOrganizedWhere = buildDateWhere(
        "thlmcam_created_at",
        replacements,
        from_date,
        to_date,
      );
      const megaCampOrganizedCountSql = `
         SELECT 
             COUNT(*) AS total_count
         FROM public.t_health_mega_camp
         ${megaCampOrganizedWhere};`;

      const animalCampsOrganizedWhere = buildDateWhere(
        "thlacam_created_at",
        replacements,
        from_date,
        to_date,
      );
      const animalCampsOrganizedCountSql = `
         SELECT 
             COUNT(*) AS total_count
         FROM public.t_health_animal_camp
         ${animalCampsOrganizedWhere};`;

      const sghFormedWhere = buildDateWhere(
        "tsdgdet_created_at",
        replacements,
        from_date,
        to_date,
      );
      const sghFormedCountSql = `
         SELECT 
             COUNT(*) AS total_count
         FROM public.t_shg_details
         ${sghFormedWhere};`;

      const scholarshipsAmountWhere = buildDateWhere(
        "tedusp_created_at",
        replacements,
        from_date,
        to_date,
      );
      const totalScholarshipsAmountSql = `
         SELECT 
             SUM(tedusp_scholarship_amount) AS total_amount
         FROM public.t_edu_scholarship
         ${scholarshipsAmountWhere};`;

      const animalCampsMedicineAmountWhere = buildDateWhere(
        "thlacam_created_at",
        replacements,
        from_date,
        to_date,
      );
      const animalCampsMedicineAmountSql = `
         SELECT 
             SUM(thlacam_medicine_cost) AS total_amount
         FROM public.t_health_animal_camp
         ${animalCampsMedicineAmountWhere};`;

      // Run all in parallel, safe mode
      const results = await Promise.allSettled([
        sequelize.query(proposalCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(projectCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(budgetTotalSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(ngoCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(studentsCoverageCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(trainingCoverageCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(utilizationTotalSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(totalScholarshipsCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(itemsSuppliedAtSchoolCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(mmuOrganizedCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(megaCampOrganizedCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(animalCampsOrganizedCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(sghFormedCountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(totalScholarshipsAmountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        sequelize.query(animalCampsMedicineAmountSql, {
          replacements,
          type: QueryTypes.SELECT,
        }),
      ]);

      // Extract results safely
      const proposalCount =
        results[0].status === "fulfilled"
          ? results[0].value[0]
          : {
              total_count: 0,
              approved_count: 0,
              pending_count: 0,
              resend_count: 0,
            };

      const projectCount =
        results[1].status === "fulfilled"
          ? results[1].value[0]
          : {
              total_count: 0,
              approved_count: 0,
              pending_count: 0,
              resend_count: 0,
            };

      const budgetTotal =
        results[2].status === "fulfilled"
          ? results[2].value[0]
          : {
              total_amount: 0,
            };

      const ngoCount =
        results[3].status === "fulfilled"
          ? results[3].value[0]
          : {
              total_count: 0,
            };

      const studentsCoverageCount =
        results[4].status === "fulfilled"
          ? results[4].value[0]
          : {
              total_count: 0,
              male_count: 0,
              female_count: 0,
            };

      const trainingCoverageCount =
        results[5].status === "fulfilled"
          ? results[5].value[0]
          : {
              enrolled_count: 0,
              trained_count: 0,
              placed_count: 0,
              dropout_count: 0,
            };

      const utilizationTotal =
        results[6].status === "fulfilled"
          ? results[6].value[0]
          : {
              total_amount: 0,
              pending_amount: 0,
              approved_amount: 0,
              resend_amount: 0,
            };

      const totalScholarshipsCount =
        results[7].status === "fulfilled"
          ? results[7].value[0]
          : {
              total_count: 0,
            };
      const itemsSuppliedAtSchoolCount =
        results[8].status === "fulfilled"
          ? results[8].value[0]
          : {
              total_count: 0,
            };
      const mmuOrganizedCount =
        results[9].status === "fulfilled"
          ? results[9].value[0]
          : {
              total_count: 0,
            };
      const megaCampOrganizedCount =
        results[10].status === "fulfilled"
          ? results[10].value[0]
          : {
              total_count: 0,
            };

      const animalCampsOrganizedCount =
        results[11].status === "fulfilled"
          ? results[11].value[0]
          : {
              total_count: 0,
            };
      const sghFormedCount =
        results[12].status === "fulfilled"
          ? results[12].value[0]
          : {
              total_count: 0,
            };
      const totalScholarshipsAmount =
        results[13].status === "fulfilled"
          ? results[13].value[0]
          : {
              total_amount: 0,
            };
      const animalCampsMedicineAmount =
        results[14].status === "fulfilled"
          ? results[14].value[0]
          : {
              total_amount: 0,
            };

      res.status(200).json({
        message: "Details fetched successfully",
        status: true,
        data: {
          proposal_count: proposalCount,
          project_count: projectCount,
          budget_total: budgetTotal,
          ngo_count: ngoCount,
          students_coverage_count: studentsCoverageCount,
          training_coverage_count: trainingCoverageCount,
          utilization_total: utilizationTotal,
          total_scholarships_count: totalScholarshipsCount,
          items_supplied_at_school_count: itemsSuppliedAtSchoolCount,
          mmu_organized_count: mmuOrganizedCount,
          mega_camp_organized_count: megaCampOrganizedCount,
          animal_camps_organized_count: animalCampsOrganizedCount,
          sgh_formed_count: sghFormedCount,
          total_scholarships_amount: totalScholarshipsAmount,
          animal_camps_medicine_amount: animalCampsMedicineAmount,
        },
      });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getProposalCountThemeWise: async (req, res, next) => {
    try {
      const { from_date, to_date } = req.body;
      let where = "";
      let replacements = {};
      if (from_date && to_date) {
        where +=
          " AND (p.tpro_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :from_date AND :to_date";
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
        SELECT 
    th.tthm_id,
    th.tthm_name_of_theme,
    COUNT(p.tpro_id) AS total_proposal,
    COUNT(p.tpro_id) FILTER (WHERE p.tpro_status = 'PENDING') AS total_pending_proposal,
    COUNT(p.tpro_id) FILTER (WHERE p.tpro_status = 'APPROVED') AS total_approved_proposal,
    COUNT(p.tpro_id) FILTER (WHERE p.tpro_status = 'RESEND') AS total_resend_proposal
FROM public.t_theme th
LEFT JOIN public.t_proposal p 
    ON p.tpro_theme_id = th.tthm_id ${where}
GROUP BY th.tthm_id, th.tthm_name_of_theme
ORDER BY th.tthm_name_of_theme;
    `;

      const results = await sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements,
      });

      res.status(200).json({
        message: "Details fetched successfully",
        status: true,
        data: results,
      });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getProposalByThemeDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tpro_proposal_title",
        "tpro_timeline_of_project_start_date",
        "tpro_timeline_of_project_end_date",
        "tpro_proposal_fund_req",
        "tpro_created_by",
        "tpro_status",
        "created_by_name",
        "deliverable_count",
        "tpro_id",
        "theme_id",
        "name",
        "from_date",
        "to_date",
      ];
      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { theme_id, from_date, to_date } = filterParams;

      if (!theme_id) {
        return res.status(400).json({
          message: "Theme id is required",
          status: false,
        });
      }
      const replacements = { theme_id };
      let where = "th.tthm_id = :theme_id";
      if (from_date && to_date) {
        where += `  AND (p.tpro_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
      BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      // Queries (all reuse same WHERE)
      const sql = `
         SELECT  tpro_id,tpro_proposal_title,tpro_timeline_of_project_start_date,tpro_timeline_of_project_end_date,tpro_proposal_fund_req,
                 tpro_created_by,tpro_status, u.name as created_by_name, (
        SELECT COUNT(*)
        FROM t_proposal_deliverable pd
        WHERE pd.tprodel_proposal_id = p.tpro_id
        ) AS deliverable_count
         FROM public.t_proposal p
         LEFT JOIN t_theme th ON p.tpro_theme_id = th.tthm_id
         LEFT JOIN t_user u ON p.tpro_created_by = u.user_id
    `;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getProposalByThemeFileDownload: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tpro_proposal_title",
        "tpro_timeline_of_project_start_date",
        "tpro_timeline_of_project_end_date",
        "tpro_proposal_fund_req",
        "tpro_created_by",
        "tpro_status",
        "created_by_name",
        "deliverable_count",
        "tpro_id",
        "theme_id",
        "name",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { theme_id, from_date, to_date } = filterParams;

      if (!theme_id) {
        return res.status(400).json({
          message: "Theme id is required",
          status: false,
        });
      }

      let where = "th.tthm_id = :theme_id";
      const replacements = { theme_id };

      if (from_date && to_date) {
        where += `  AND (p.tpro_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
      BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
      SELECT  
        p.tpro_id,
        p.tpro_proposal_title,
        p.tpro_timeline_of_project_start_date,
        p.tpro_timeline_of_project_end_date,
        p.tpro_proposal_fund_req,
        p.tpro_status,
        p.tpro_created_at,
        u.name as created_by_name,
        th.tthm_name_of_theme,
        (
          SELECT COUNT(*)
          FROM t_proposal_deliverable pd
          WHERE pd.tprodel_proposal_id = p.tpro_id
        ) AS deliverable_count
      FROM public.t_proposal p
      LEFT JOIN t_theme th ON p.tpro_theme_id = th.tthm_id
      LEFT JOIN t_user u ON p.tpro_created_by = u.user_id
    `;

      const result = await DatatablesFileDownloadReplacement.build(
        req,
        sql,
        where,
        replacements,
      );

      const data = result.data || [];

      /* ================= EXCEL CREATION ================= */

      const workbook = new ExcelJS.Workbook();

      const themeName = data.length > 0 ? data[0].tthm_name_of_theme : "Theme";

      // Remove invalid Excel characters
      const safeThemeName = themeName
        .replace(/[\\/?*[\]]/g, "")
        .substring(0, 25);

      const sheetName = `${safeThemeName} Proposal`.substring(0, 31);

      const sheet = workbook.addWorksheet(sheetName);

      sheet.columns = [
        { header: "Title", key: "tpro_proposal_title", width: 30 },
        { header: "Duration", key: "project_duration", width: 25 },
        { header: "Amount", key: "tpro_proposal_fund_req", width: 18 },
        { header: "Created By", key: "created_by_name", width: 20 },
        { header: "No of Deliverables", key: "deliverable_count", width: 18 },
        { header: "Status", key: "tpro_status", width: 15 },
      ];

      // Header style
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" },
        };
      });

      data.forEach((row) => {
        sheet.addRow({
          tpro_proposal_title: row.tpro_proposal_title,
          project_duration:
            row.tpro_timeline_of_project_start_date &&
            row.tpro_timeline_of_project_end_date
              ? `${moment(row.tpro_timeline_of_project_start_date).format(
                  "DD-MM-YYYY",
                )} to ${moment(row.tpro_timeline_of_project_end_date).format(
                  "DD-MM-YYYY",
                )}`
              : "",

          tpro_proposal_fund_req: row.tpro_proposal_fund_req ?? "",
          tpro_status: row.tpro_status,
          created_by_name: row.created_by_name,
          created_at: row.tpro_created_at
            ? moment(row.tpro_created_at).format("DD-MM-YYYY")
            : "",
          deliverable_count: row.deliverable_count,
        });
      });

      sheet.views = [{ state: "frozen", ySplit: 1 }];

      /* ================= SEND FILE ================= */

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ThemeWiseProposals.xlsx"`,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.send(Buffer.from(buffer));
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
  getProjectCountThemeWise: async (req, res, next) => {
    try {
      const { from_date, to_date } = req.body;
      let where = "";
      let replacements = {};
      if (from_date && to_date) {
        where += `  AND (p.tprjct_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
      BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
        SELECT 
    th.tthm_id,
    th.tthm_name_of_theme,
    COUNT(p.tprjct_id) AS total_project,
    COUNT(p.tprjct_id) FILTER (WHERE p.tprjct_status = 'PENDING') AS total_pending_project,
    COUNT(p.tprjct_id) FILTER (WHERE p.tprjct_status = 'APPROVED') AS total_approved_project,
    COUNT(p.tprjct_id) FILTER (WHERE p.tprjct_status = 'RESEND') AS total_resend_project
FROM public.t_theme th
LEFT JOIN public.t_project p 
    ON p.tprjct_theme_id = th.tthm_id ${where}
GROUP BY th.tthm_id, th.tthm_name_of_theme
ORDER BY th.tthm_name_of_theme;
    `;

      const results = await sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements,
      });

      res.status(200).json({
        message: "Details fetched successfully",
        status: true,
        data: results,
      });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getProjectByThemeDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",
        "tprjct_project_duration_start_date",
        "tprjct_project_duration_end_date",
        "tprjct_project_budget",
        "tprjct_created_by",
        "tprjct_status",
        "created_by_name",
        "deliverable_count",
        "tprjct_id",
        "theme_id",
        "name",
        "from_date",
        "to_date",
      ];
      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { theme_id, from_date, to_date } = filterParams;

      if (!theme_id) {
        return res.status(400).json({
          message: "Theme id is required",
          status: false,
        });
      }
      const replacements = { theme_id };
      let where = "th.tthm_id = :theme_id";

      if (from_date && to_date) {
        where += ` AND (p.tprjct_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
        BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      // Queries (all reuse same WHERE)
      const sql = `
         SELECT  tprjct_id,tprjct_project_title,tprjct_project_duration_start_date,tprjct_project_duration_end_date,tprjct_project_budget,
                 tprjct_created_by,tprjct_status, u.name as created_by_name, (
        SELECT COUNT(*)
        FROM t_project_deliverable pd
        WHERE pd.tprjctdel_project_id = p.tprjct_id
        ) AS deliverable_count
         FROM public.t_project p
         LEFT JOIN t_theme th ON p.tprjct_theme_id = th.tthm_id
         LEFT JOIN t_user u ON p.tprjct_created_by = u.user_id
    `;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getProjectByThemeFileDownload: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",
        "tprjct_project_duration_start_date",
        "tprjct_project_duration_end_date",
        "tprjct_project_budget",
        "tprjct_created_by",
        "tprjct_status",
        "created_by_name",
        "deliverable_count",
        "tprjct_id",
        "theme_id",
        "name",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { theme_id, from_date, to_date } = filterParams;

      if (!theme_id) {
        return res.status(400).json({
          message: "Theme id is required",
          status: false,
        });
      }

      let where = "th.tthm_id = :theme_id";
      const replacements = { theme_id };

      if (from_date && to_date) {
        where += ` AND (p.tprjct_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
        BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
      SELECT  
        p.tprjct_id,
        p.tprjct_project_title,
        p.tprjct_project_duration_start_date,
        p.tprjct_project_duration_end_date,
        p.tprjct_project_budget,
        p.tprjct_status,
        u.name as created_by_name,
        th.tthm_name_of_theme,
        (
          SELECT COUNT(*)
          FROM t_project_deliverable pd
          WHERE pd.tprjctdel_project_id = p.tprjct_id
        ) AS deliverable_count
      FROM public.t_project p
      LEFT JOIN t_theme th ON p.tprjct_theme_id = th.tthm_id
      LEFT JOIN t_user u ON p.tprjct_created_by = u.user_id
    `;

      const result = await DatatablesFileDownloadReplacement.build(
        req,
        sql,
        where,
        replacements,
      );

      const data = result.data || [];

      /* ================= EXCEL CREATION ================= */

      const workbook = new ExcelJS.Workbook();

      const themeName = data.length > 0 ? data[0].tthm_name_of_theme : "Theme";

      // Remove invalid Excel characters
      const safeThemeName = themeName
        .replace(/[\\/?*[\]]/g, "")
        .substring(0, 25);

      const sheetName = `${safeThemeName} Project`.substring(0, 31);

      const sheet = workbook.addWorksheet(sheetName);

      sheet.columns = [
        { header: "Title", key: "tprjct_project_title", width: 30 },
        { header: "Duration", key: "project_duration", width: 25 },
        { header: "Amount", key: "tprjct_project_budget", width: 18 },
        { header: "Created By", key: "created_by_name", width: 20 },
        { header: "No of Deliverables", key: "deliverable_count", width: 18 },
        { header: "Status", key: "tprjct_status", width: 15 },
      ];

      // Header style
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" },
        };
      });

      data.forEach((row) => {
        sheet.addRow({
          tprjct_project_title: row.tprjct_project_title,
          project_duration:
            row.tprjct_project_duration_start_date &&
            row.tprjct_project_duration_end_date
              ? `${moment(row.tprjct_project_duration_start_date).format(
                  "DD-MM-YYYY",
                )} to ${moment(row.tprjct_project_duration_end_date).format(
                  "DD-MM-YYYY",
                )}`
              : "",

          tprjct_project_budget: row.tprjct_project_budget ?? "",
          tprjct_status: row.tprjct_status,
          created_by_name: row.created_by_name,
          created_at: row.tpro_created_at
            ? moment(row.tpro_created_at).format("DD-MM-YYYY")
            : "",
          deliverable_count: row.deliverable_count,
        });
      });

      sheet.views = [{ state: "frozen", ySplit: 1 }];

      /* ================= SEND FILE ================= */

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ThemeWiseProjects.xlsx"`,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.send(Buffer.from(buffer));
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
  getBudgetDetails: async (req, res, next) => {
    try {
      const { from_date, to_date } = req.body;
      let where = "WHERE 1=1 ";
      let replacements = {};
      if (from_date && to_date) {
        where += ` AND (tab.ttabud_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
        BETWEEN :from_date AND :to_date`;
        replacements = { from_date, to_date };
      }
      const sql = `
        SELECT
    th.tthm_id AS theme_id,
    th.tthm_name_of_theme AS theme_name,
    th.tthm_color AS theme_color,

    json_agg(
        json_build_object(
            'activity_id', activity_data.activity_id,
            'activity_name', activity_data.activity_name,
            'total_budget', activity_data.total_budget,
            'total_utilized', activity_data.total_utilized,
            'total_remaining', activity_data.total_remaining,
            'fy_breakdown', activity_data.fy_breakdown
        )
    ) AS activities

FROM t_theme th

LEFT JOIN (

    SELECT
        ftb.tftb_theme_id AS theme_id,
        act.tact_id AS activity_id,
        act.tact_name_of_activity AS activity_name,

        SUM(tab.ttabud_budget_amount) AS total_budget,
        SUM(tab.ttabud_utilized_amount) AS total_utilized,
        SUM(tab.ttabud_remaining_amount) AS total_remaining,

       json_agg(
    json_build_object(
        'fy_id', fy.tfy_id,
        'fy_name', fy.tfy_code,
        'budget', tab.ttabud_budget_amount,
        'utilized', tab.ttabud_utilized_amount,
        'remaining', tab.ttabud_remaining_amount
    )
    ORDER BY fy.tfy_id
) AS fy_breakdown
    FROM t_theme_activity_budgets tab
    LEFT JOIN t_fy_theme_budgets ftb
        ON ftb.tftb_id = tab.ttabud_fy_theme_budget_id
    LEFT JOIN t_activity act
        ON act.tact_id = tab.ttabud_activity_id
    LEFT JOIN t_fy fy
        ON fy.tfy_id = ftb.tftb_financial_id
   ${where}
    GROUP BY
        ftb.tftb_theme_id,
        act.tact_id,
        act.tact_name_of_activity
    

) activity_data

ON activity_data.theme_id = th.tthm_id

GROUP BY
    th.tthm_id,
    th.tthm_name_of_theme,
    th.tthm_color
    `;
      const results = await sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements,
      });

      res.status(200).json({
        message: "Details fetched successfully",
        status: true,
        data: results,
      });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getUtilizationThemeWise: async (req, res, next) => {
    try {
      const { from_date, to_date } = req.body;
      let where = "";
      let replacements = {};
      if (from_date && to_date) {
        where += ` AND (tpan_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
        BETWEEN :from_date AND :to_date`;
        replacements = { from_date, to_date };
      }
      const sql = `
        SELECT 
    th.tthm_id,
    th.tthm_name_of_theme,
    SUM(tpand_payment_required) AS total_amount,
    SUM(tpand_payment_required) FILTER (WHERE tpan_status = 'PENDING') AS pending_amount,
    SUM(tpand_payment_required) FILTER (WHERE tpan_status = 'APPROVED') AS approved_amount,
    SUM(tpand_payment_required) FILTER (WHERE tpan_status = 'RESEND') AS resend_amount
FROM public.t_theme th
LEFT JOIN public.t_project p 
    ON p.tprjct_theme_id = th.tthm_id
LEFT JOIN public.t_payment_advice_note pan 
    ON pan.tpan_project_id = p.tprjct_id ${where}
LEFT JOIN public.t_payment_advice_note_deliverable pand 
    ON pand.tpand_pan_id = pan.tpan_id 
GROUP BY th.tthm_id, th.tthm_name_of_theme
ORDER BY th.tthm_name_of_theme;
    `;

      const results = await sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements,
      });

      res.status(200).json({
        message: "Details fetched successfully",
        status: true,
        data: results,
      });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getUtilizationByThemeDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tpan_id",
        "tprjct_project_title",
        "tpan_title",
        "tpan_vendor_name",
        "tpan_vendor_type",
        "tpan_total_payment_required",
        "tpan_payment_date",
        "tpan_status",
        "tpan_project_id",
        "date_range",
        "theme_id",
        "tpan_status",
        "from_date",
        "to_date",
      ];
      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { theme_id, from_date, to_date } = filterParams;

      if (!theme_id) {
        return res.status(400).json({
          message: "Theme id is required",
          status: false,
        });
      }
      const replacements = { theme_id };
      let where = "th.tthm_id = :theme_id";

      if (from_date && to_date) {
        where += ` AND (pan.tpan_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
        BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      // Queries (all reuse same WHERE)
      const sql = `
          SELECT
  /* ================= PAN ================= */
  p.tprjct_project_title,
  pan.tpan_id,
  pan.tpan_title,
  pan.tpan_vendor_name,
  pan.tpan_vendor_type,
  pan.tpan_gst_status,
  pan.tpan_gst_no,
  pan.tpan_email,
  pan.tpan_mobile_number,
  pan.tpan_account_number,
  pan.tpan_bank_name,
  pan.tpan_ifsc_code,
  pan.tpan_total_payment_required,
  pan.tpan_payment_date,
  pan.tpan_remarks,
  pan.tpan_document_type,
  pan.tpan_status,
  pan.tpan_project_id,
  pan.tpan_created_at,
  pan.tpan_created_at as created_at,
  pan.tpan_created_by,
  u.name as created_by_name,

  /* ================= DELIVERABLES AS JSONB ================= */
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'tpand_id', d.tpand_id,
          'tpand_project_deliverable_id', d.tpand_project_deliverable_id,
          'tpand_proposed_quantity', d.tpand_proposed_quantity,
          'tpand_proposed_amount', d.tpand_proposed_amount,
          'tpand_unit_price', d.tpand_unit_price,
          'tpand_payable_quantity', d.tpand_payable_quantity,
          'tpand_payment_required', d.tpand_payment_required,
          'tpand_balance', d.tpand_balance,
          'tpand_created_at', d.tpand_created_at
        )
        ORDER BY d.tpand_created_at
      )
      FROM t_payment_advice_note_deliverable d
      WHERE d.tpand_pan_id = pan.tpan_id
    ),
    '[]'::jsonb
  ) AS deliverables,
  COALESCE(
  (
    SELECT jsonb_build_object(
      'tpar_id', pr.tpar_id,
      'tpar_pan_id', pr.tpar_pan_id,
      'tpar_payment_type', pr.tpar_payment_type,
      'tpar_amount', pr.tpar_amount,
      'tpar_tds_amount', pr.tpar_tds_amount,
      'tpar_other_deduction', pr.tpar_other_deduction,
      'tpar_bank_name', pr.tpar_bank_name,
      'tpar_branch', pr.tpar_branch,
      'tpar_date_of_payment', pr.tpar_date_of_payment
    )
    FROM t_payment_release pr
    WHERE pr.tpar_pan_id = pan.tpan_id
  ),
  '{}'::jsonb
) AS payment_release

FROM t_payment_advice_note pan
left join t_project p on p.tprjct_id = pan.tpan_project_id
left join t_theme th on th.tthm_id = p.tprjct_theme_id
left join t_user u on u.user_id = pan.tpan_created_by
    `;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getUtilizationByThemeFileDownload: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tpan_id",
        "tprjct_project_title",
        "tpan_title",
        "tpan_vendor_name",
        "tpan_vendor_type",
        "tpan_total_payment_required",
        "tpan_payment_date",
        "tpan_status",
        "theme_id",
        "tpan_status",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { theme_id, from_date, to_date } = filterParams || {};

      if (!theme_id) {
        return res.status(400).json({
          message: "Theme id is required",
          status: false,
        });
      }

      const replacements = { theme_id };

      let where = `th.tthm_id = :theme_id`;

      if (from_date && to_date) {
        where += ` AND (pan.tpan_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
        BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      /* ================= SQL ================= */
      const sql = `
      SELECT
        p.tprjct_project_title,
        pan.tpan_id,
        pan.tpan_title,
        pan.tpan_vendor_name,
        pan.tpan_vendor_type,
        pan.tpan_total_payment_required,
        pan.tpan_payment_date,
        pan.tpan_status,
        pan.tpan_created_at,
        u.name AS created_by_name,

        COALESCE(
          (
            SELECT jsonb_build_object(
              'tpar_id', pr.tpar_id
            )
            FROM t_payment_release pr
            WHERE pr.tpar_pan_id = pan.tpan_id
          ),
          '{}'::jsonb
        ) AS payment_release

      FROM t_payment_advice_note pan
      LEFT JOIN t_project p
        ON p.tprjct_id = pan.tpan_project_id
      LEFT JOIN t_theme th
        ON th.tthm_id = p.tprjct_theme_id
      LEFT JOIN t_user u
        ON u.user_id = pan.tpan_created_by
    `;

      const result = await DatatablesFileDownloadReplacement.build(
        req,
        sql,
        where,
        replacements,
      );

      const data = result.data || [];

      /* ================= CREATE EXCEL ================= */
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Utilization");

      /* ================= COLUMNS ================= */
      sheet.columns = [
        { header: "Project Title", key: "project", width: 30 },
        { header: "PAN Title", key: "pan_title", width: 25 },
        { header: "NGO/Vendor Name", key: "vendor", width: 25 },
        { header: "NGO/Vendor Type", key: "vendor_type", width: 20 },
        { header: "Total Payment", key: "amount", width: 18 },
        { header: "Date", key: "date", width: 15 },
        { header: "Created By", key: "created_by", width: 20 },
        { header: "Created At", key: "created_at", width: 18 },
        { header: "Status", key: "status", width: 15 },
        { header: "Payment Released", key: "released", width: 20 },
      ];

      /* ================= HEADER STYLE ================= */
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" },
        };
      });

      /* ================= DATA ================= */
      let totalAmount = 0;

      data.forEach((row) => {
        const amount = Number(row.tpan_total_payment_required || 0);
        totalAmount += amount;

        sheet.addRow({
          project: row.tprjct_project_title,
          pan_title: row.tpan_title,
          vendor: row.tpan_vendor_name,
          vendor_type: row.tpan_vendor_type,
          amount,
          date: row.tpan_payment_date
            ? new Date(row.tpan_payment_date).toLocaleDateString("en-GB")
            : "",
          created_by: row.created_by_name,
          created_at: row.tpan_created_at
            ? new Date(row.tpan_created_at).toLocaleDateString("en-GB")
            : "",
          status: row.tpan_status,
          released: row.payment_release?.tpar_id ? "Released" : "Not Released",
        });
      });

      /* ================= TOTAL ROW ================= */
      const totalRow = sheet.addRow({
        project: "TOTAL",
        amount: totalAmount,
      });

      totalRow.font = { bold: true };

      /* ================= FREEZE HEADER ================= */
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      /* ================= DOWNLOAD ================= */
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Utilization_By_Theme.xlsx"`,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.send(Buffer.from(buffer));
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  getNgoDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tng_name",
        "tng_org_type",
        "tng_category",
        "tng_email",
        "tng_phone",
        "tng_gst_status",
        "tng_gst_no",
        "tng_pan",
        "tng_account_no",
        "tng_bank_name",
        "tng_ifsc",
        "tng_created_at",
        "tng_status",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};
      let where = `
      1=1
    `;

      const replacements = {};
      if (from_date && to_date) {
        where += ` AND (n.tng_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
  BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
      SELECT 
        n.tng_id,
        n.tng_name,
        n.tng_is_active,
        n.tng_org_type,
        n.tng_category,
        n.tng_address,
        n.tng_email,
        n.tng_phone,
        n.tng_gst_status,
        n.tng_gst_no,
        n.tng_pan,
        n.tng_account_no,
        n.tng_bank_name,
        n.tng_ifsc,
        n.tng_created_at,

        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'contact_id', c.tngc_id,
                'name', c.tngc_name,
                'phone', c.tngc_phone,
                'email', c.tngc_email,
                'remark', c.tngc_remark,
                'created_at', c.tngc_created_at
              )
              ORDER BY c.tngc_created_at
            )
            FROM t_ngo_contact_details c
            WHERE 
              c.tngc_ngo_id = n.tng_id
          ),
          '[]'::jsonb
        ) AS contact_details

      FROM t_ngo n
    `;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  ngoListFileDownload: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tng_name",
        "tng_org_type",
        "tng_category",
        "tng_fax_number",
        "tng_web_url",
        "tng_reg_no",
        "tng_type",
        "tng_gst_status",
        "tng_email",
        "tng_phone",
        "tng_alt_email",
        "tng_alt_phone",
        "tng_address",
        "tng_account_no",
        "tng_bank_name",
        "tng_ifsc",
        "tng_pan",
        "tng_created_at",
        "created_by_name",
        "tng_gst_no",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};

      /* ================= WHERE ================= */
      let where = `
      n.tng_is_active IS NOT NULL
      AND n.tng_deleted_at IS NULL
    `;

      const replacements = {};

      if (from_date && to_date) {
        where += ` AND (n.tng_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
  BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      /* ================= SQL ================= */
      const sql = `
      SELECT 
        n.tng_id,
        n.tng_name,
        n.tng_org_type,
        n.tng_category,
        n.tng_fax_number,
        n.tng_web_url,
        n.tng_reg_no,
        n.tng_type,
        n.tng_gst_status,
        n.tng_email,
        n.tng_phone,
        n.tng_alt_email,
        n.tng_alt_phone,
        n.tng_address,
        n.tng_is_active,
        n.tng_account_no,
        n.tng_bank_name,
        n.tng_ifsc,
        n.tng_pan,
        n.tng_created_at,
        u.name AS created_by_name
      FROM t_ngo n
      LEFT JOIN t_user u 
        ON u.user_id = n.tng_created_by
    `;

      const result = await DatatablesFileDownloadReplacement.build(
        req,
        sql,
        where,
        replacements,
      );

      const data = result.data || [];

      /* ================= CREATE EXCEL ================= */
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("NGO List");

      /* ================= COLUMNS ================= */
      sheet.columns = [
        { header: "NGO/Vendor Name", key: "tng_name", width: 25 },
        { header: "Organization Type", key: "tng_org_type", width: 20 },
        { header: "Category", key: "tng_category", width: 20 },
        { header: "Fax", key: "tng_fax_number", width: 15 },
        { header: "Website URL", key: "tng_web_url", width: 25 },
        { header: "Registration Number", key: "tng_reg_no", width: 20 },
        { header: "NGO/Vendor Type", key: "tng_type", width: 20 },
        { header: "GST Status", key: "tng_gst_status", width: 15 },
        { header: "Email", key: "tng_email", width: 25 },
        { header: "Mobile No.", key: "tng_phone", width: 15 },
        { header: "Alternative Email", key: "tng_alt_email", width: 25 },
        { header: "Alternative Mobile No.", key: "tng_alt_phone", width: 20 },
        { header: "NGO/Vendor Address", key: "tng_address", width: 30 },
        { header: "Status", key: "status", width: 15 },
        { header: "Account No.", key: "tng_account_no", width: 20 },
        { header: "Bank Name", key: "tng_bank_name", width: 20 },
        { header: "IFSC Code", key: "tng_ifsc", width: 15 },
        { header: "PAN No.", key: "tng_pan", width: 20 },
        { header: "Created By", key: "created_by_name", width: 20 },
        { header: "Created At", key: "tng_created_at", width: 18 },
      ];

      /* ================= HEADER STYLE ================= */
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" },
        };
      });

      /* ================= ADD DATA ================= */
      data.forEach((ngo) => {
        sheet.addRow({
          tng_name: ngo.tng_name || "",
          tng_org_type: ngo.tng_org_type || "",
          tng_category: ngo.tng_category || "",
          tng_fax_number: ngo.tng_fax_number || "",
          tng_web_url: ngo.tng_web_url || "",
          tng_reg_no: ngo.tng_reg_no || "",
          tng_type: ngo.tng_type || "",
          tng_gst_status: ngo.tng_gst_status || "",
          tng_email: ngo.tng_email || "",
          tng_phone: ngo.tng_phone || "",
          tng_alt_email: ngo.tng_alt_email || "",
          tng_alt_phone: ngo.tng_alt_phone || "",
          tng_address: ngo.tng_address || "",
          status: ngo.tng_is_active ? "Active" : "Inactive",
          tng_account_no: ngo.tng_account_no || "",
          tng_bank_name: ngo.tng_bank_name || "",
          tng_ifsc: ngo.tng_ifsc || "",
          tng_pan: ngo.tng_pan || "",
          created_by_name: ngo.created_by_name || "",
          tng_created_at: ngo.tng_created_at
            ? new Date(ngo.tng_created_at).toLocaleDateString("en-GB")
            : "",
        });
      });

      /* ================= FREEZE HEADER ================= */
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      /* ================= DOWNLOAD ================= */
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="NGO_List.xlsx"`,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.send(Buffer.from(buffer));
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
  getStudentsCoverageDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",
        "tedusp_gender",
        "tprjct_id",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};
      let where = `
      1=1
    `;
      let groupby = `
       p.tprjct_id, p.tprjct_project_title
    `;

      const replacements = {};
      if (from_date && to_date) {
        where += ` AND (tedusp_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
  SELECT
    p.tprjct_id,
    p.tprjct_project_title,

    COUNT(*) FILTER (WHERE es.tedusp_gender = 'male')   AS male_count,
    COUNT(*) FILTER (WHERE es.tedusp_gender = 'female') AS female_count,

    COUNT(es.tedusp_gender) AS total

  FROM public.t_project p
  LEFT JOIN t_edu_scholarship es
    ON p.tprjct_id = es.tedusp_project_id
`;
      DatatablesReplacement.build(
        req,
        sql,
        where,
        replacements,
        undefined,
        groupby,
      )
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getStudentsCoverageFileDownload: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",
        "tedusp_gender",
        "tprjct_id",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};
      /* ================= WHERE ================= */
      let where = `1=1`;

      const replacements = {};

      const groupby = `
      p.tprjct_id,
      p.tprjct_project_title
    `;

      if (from_date && to_date) {
        where += ` AND (tedusp_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      /* ================= SQL ================= */
      const sql = `
      SELECT
        p.tprjct_id,
        p.tprjct_project_title,

        COUNT(*) FILTER (WHERE es.tedusp_gender = 'male')   AS male_count,
        COUNT(*) FILTER (WHERE es.tedusp_gender = 'female') AS female_count,

        COUNT(es.tedusp_gender) AS total

      FROM public.t_project p
      LEFT JOIN t_edu_scholarship es
        ON p.tprjct_id = es.tedusp_project_id
    `;

      const result = await DatatablesFileDownloadReplacement.build(
        req,
        sql,
        where,
        replacements,
        undefined,
        groupby,
      );

      const data = result.data || [];

      /* ================= CREATE EXCEL ================= */
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Students Coverage");

      /* ================= COLUMNS ================= */
      sheet.columns = [
        { header: "Project Title", key: "title", width: 35 },
        { header: "Male", key: "male", width: 18 },
        { header: "Female", key: "female", width: 18 },
        { header: "Total", key: "total", width: 18 },
      ];

      /* ================= HEADER STYLE ================= */
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" },
        };
      });

      /* ================= DATA ================= */
      let totalMale = 0;
      let totalFemale = 0;
      let grandTotal = 0;

      data.forEach((row) => {
        const male = Number(row.male_count || 0);
        const female = Number(row.female_count || 0);
        const total = Number(row.total || 0);

        totalMale += male;
        totalFemale += female;
        grandTotal += total;

        sheet.addRow({
          title: row.tprjct_project_title,
          male,
          female,
          total,
        });
      });

      /* ================= TOTAL ROW ================= */
      const totalRow = sheet.addRow({
        title: "TOTAL",
        male: totalMale,
        female: totalFemale,
        total: grandTotal,
      });

      totalRow.font = { bold: true };

      /* ================= FREEZE HEADER ================= */
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      /* ================= DOWNLOAD ================= */
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Students_Coverage.xlsx"`,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.send(Buffer.from(buffer));
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
  getTrainingCoverageDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",
        "tprjct_id",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};
      let where = `
      1=1
    `;
      let groupby = `
       p.tprjct_id, p.tprjct_project_title
    `;

      const replacements = {};

      if (from_date && to_date) {
        where += ` AND (tsdtrdt_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
  SELECT
    p.tprjct_id,
    p.tprjct_project_title,

    SUM(tsdtrdt_enrollment_count) AS enrolled_count,
    SUM(tsdtrdt_trained_count) AS trained_count,
    SUM(tsdtrdt_placed_count) AS placed_count,
    SUM(tsdtrdt_dropout_count) AS dropout_count

  FROM public.t_project p
  LEFT JOIN t_skill_dev_training_dtls sdt
    ON p.tprjct_id = sdt.tsdtrdt_project_id
`;
      DatatablesReplacement.build(
        req,
        sql,
        where,
        replacements,
        undefined,
        groupby,
      )
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getTrainingCoverageFileDownload: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",
        "tprjct_id",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};
      /* ================= WHERE ================= */
      let where = `1=1`;

      const replacements = {};

      const groupby = `
      p.tprjct_id,
      p.tprjct_project_title
    `;

      if (from_date && to_date) {
        where += ` AND (tsdtrdt_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      /* ================= SQL ================= */
      const sql = `
      SELECT
        p.tprjct_id,
        p.tprjct_project_title,

        COALESCE(SUM(sdt.tsdtrdt_enrollment_count),0) AS enrolled_count,
        COALESCE(SUM(sdt.tsdtrdt_trained_count),0) AS trained_count,
        COALESCE(SUM(sdt.tsdtrdt_placed_count),0) AS placed_count,
        COALESCE(SUM(sdt.tsdtrdt_dropout_count),0) AS dropout_count

      FROM public.t_project p
      LEFT JOIN t_skill_dev_training_dtls sdt
        ON p.tprjct_id = sdt.tsdtrdt_project_id
    `;

      const result = await DatatablesFileDownloadReplacement.build(
        req,
        sql,
        where,
        replacements,
        undefined,
        groupby,
      );

      const data = result.data || [];

      /* ================= CREATE EXCEL ================= */
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Training Coverage");

      /* ================= COLUMNS ================= */
      sheet.columns = [
        { header: "Project Title", key: "title", width: 35 },
        { header: "Enrolled", key: "enrolled", width: 18 },
        { header: "Trained", key: "trained", width: 18 },
        { header: "Placed", key: "placed", width: 18 },
        { header: "Dropout", key: "dropout", width: 18 },
      ];

      /* ================= HEADER STYLE ================= */
      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" },
        };
      });

      /* ================= DATA ================= */
      let totalEnroll = 0;
      let totalTrained = 0;
      let totalPlaced = 0;
      let totalDropout = 0;

      data.forEach((row) => {
        const enrolled = Number(row.enrolled_count || 0);
        const trained = Number(row.trained_count || 0);
        const placed = Number(row.placed_count || 0);
        const dropout = Number(row.dropout_count || 0);

        totalEnroll += enrolled;
        totalTrained += trained;
        totalPlaced += placed;
        totalDropout += dropout;

        sheet.addRow({
          title: row.tprjct_project_title,
          enrolled,
          trained,
          placed,
          dropout,
        });
      });

      /* ================= TOTAL ROW ================= */
      const totalRow = sheet.addRow({
        title: "TOTAL",
        enrolled: totalEnroll,
        trained: totalTrained,
        placed: totalPlaced,
        dropout: totalDropout,
      });

      totalRow.font = { bold: true };

      /* ================= FREEZE HEADER ================= */
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      /* ================= DOWNLOAD ================= */
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Training_Coverage.xlsx"`,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.send(Buffer.from(buffer));
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
  getEduScholarshipGeojson: async (req, res, next) => {
    try {
      const { monitoring_id, from_date, to_date } = req.body;
      const replacements = {};
      let where = " 1=1";
      if (monitoring_id) {
        where += ` AND es.tedusp_id = :monitoring_id`;
        replacements.monitoring_id = monitoring_id;
      }
      if (from_date && to_date) {
        where += ` AND (es.tedusp_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
    SELECT row_to_json(fc) AS geojson
   FROM (
    SELECT 
    'FeatureCollection' AS type,
    array_to_json(array_agg(f)) AS features
    FROM (
    SELECT 
      'Feature' AS type,
      ST_AsGeoJSON(ST_Centroid(es.wkb_geometry))::json AS geometry,
      json_build_object(
          'project_title', p.tprjct_project_title,
          'project_id', p.tprjct_id,
          'student_name', es.tedusp_student_name,
          'created_at', es.tedusp_created_at,
          'created_by_name', u.name
      ) AS properties
    FROM t_edu_scholarship es
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = es.tedusp_project_id
    LEFT JOIN public.t_user u 
      ON u.user_id = es.tedusp_created_by
    WHERE ${where}
  ) f
) fc;
`;
      const records = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });

      res.status(200).json(records[0]["geojson"]);
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getEduScholarshipDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",
        "tprjct_id",
        "tedusp_id",

        // student details
        "tedusp_student_name",
        "tedusp_father_name",
        "tedusp_contact_no",
        "tedusp_aadhar_no",
        "tedusp_gender",

        // education details
        "tedusp_stream",
        "tedusp_class",
        "tedusp_marks_obtained",
        "tedusp_total_marks",
        "tedusp_percentage",

        // scholarship
        "tedusp_scholarship_amount",

        // school hierarchy
        "tsch_name_of_school",
        "tvill_village_name",
        "tst_state_name",

        // metadata
        "name",
        "created_at",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};
      let where = `
      1=1
    `;

      const replacements = {};

      if (from_date && to_date) {
        where += ` AND (es.tedusp_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
      SELECT
     p.tprjct_project_title,

    es.tedusp_id,
    es.tedusp_student_name,
    es.tedusp_father_name,
    es.tedusp_contact_no,
    es.tedusp_aadhar_no,
    es.tedusp_gender,
    es.tedusp_scholarship_latitude,
    es.tedusp_scholarship_longitude,

    es.tedusp_stream,
    es.tedusp_class,
    es.tedusp_marks_obtained,
    es.tedusp_total_marks,
    es.tedusp_percentage,

    es.tedusp_scholarship_amount,

    sc.tsch_name_of_school,
    v.tvill_village_name,
    st.tst_state_name,

    es.tedusp_created_at AS created_at,
    u.name

FROM t_edu_scholarship es

LEFT JOIN public.t_project p
    ON p.tprjct_id = es.tedusp_project_id

LEFT JOIN public.t_user u
    ON u.user_id = es.tedusp_created_by

-- SCHOOL
LEFT JOIN public.t_school sc
    ON sc.tsch_id = es.tedusp_school_id

-- VILLAGE
LEFT JOIN public.t_village v
    ON v.tvill_id = sc.tsch_village_id

-- STATE
LEFT JOIN public.t_state st
    ON st.tst_id = v.tvill_state_id
`;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getItemSuppliedGeojson: async (req, res, next) => {
    try {
      const { monitoring_id, from_date, to_date } = req.body;

      const replacements = {};
      let where = " 1=1";
      if (monitoring_id) {
        where += ` AND es.tedussch_id = :monitoring_id`;
        replacements.monitoring_id = monitoring_id;
      }

      if (from_date && to_date) {
        where += ` AND (es.tedussch_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }
      const sql = `
    SELECT row_to_json(fc) AS geojson
   FROM (
    SELECT 
    'FeatureCollection' AS type,
    array_to_json(array_agg(f)) AS features
    FROM (
    SELECT 
      'Feature' AS type,
      ST_AsGeoJSON(ST_Centroid(es.wkb_geometry))::json AS geometry,
      json_build_object(
          'project_title', p.tprjct_project_title,
          'project_id', p.tprjct_id,
          'created_at', es.tedussch_created_at,
          'created_by_name', u.name
      ) AS properties
    FROM t_edu_supplies_at_scl es
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = es.tedussch_project_id
    LEFT JOIN public.t_school s 
      ON s.tsch_id = es.tedussch_name_of_school
    LEFT JOIN public.t_user u 
      ON u.user_id = es.tedussch_created_by
    WHERE ${where}
  ) f
) fc;
`;
      const records = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });

      res.status(200).json(records[0]["geojson"]);
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getItemSuppliedDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",

        // supply item provided
        "tedusip_id",
        "tedusip_supplies_at_schl_id",
        "tedusip_item_company",
        "tedusip_item_number",

        // school & item
        "tsch_name_of_school",
        "tsupi_name",

        // metadata
        "name",
        "created_at",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }

      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};
      let where = `
      1=1
    `;

      const replacements = {};
      if (from_date && to_date) {
        where += ` AND (esip.tedusip_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
      SELECT
     p.tprjct_project_title,

    esip.tedusip_id,
    esip.tedusip_supplies_at_schl_id,
    esip.tedusip_item_company,
    esip.tedusip_item_number,
    es.tedussch_latitude,
    es.tedussch_longitude,

    sc.tsch_name_of_school,
    si.tsupi_name,

    esip.tedusip_created_at AS created_at,
    u.name

    FROM t_edu_supplies_item_provd esip
    LEFT JOIN public.t_edu_supplies_at_scl es 
      ON es.tedussch_id = esip.tedusip_supplies_at_schl_id 
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = es.tedussch_project_id
    LEFT JOIN public.t_school sc
      ON sc.tsch_id = es.tedussch_name_of_school
    LEFT JOIN public.t_supply_item si 
      ON si.tsupi_id = esip.tedusip_item
    LEFT JOIN public.t_user u 
      ON u.user_id = esip.tedusip_created_by
`;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getMMUOrganizedGeojson: async (req, res, next) => {
    try {
      const { monitoring_id, from_date, to_date } = req.body;
      const replacements = {};
      let where = " 1=1";
      if (monitoring_id) {
        where += ` AND hm.thlmmu_id = :monitoring_id`;
        replacements.monitoring_id = monitoring_id;
      }
      if (from_date && to_date) {
        where += ` AND (hm.thlmmu_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
    SELECT row_to_json(fc) AS geojson
   FROM (
    SELECT 
    'FeatureCollection' AS type,
    array_to_json(array_agg(f)) AS features
    FROM (
    SELECT 
      'Feature' AS type,
      ST_AsGeoJSON(ST_Centroid(hm.wkb_geometry))::json AS geometry,
      json_build_object(
          'project_title', p.tprjct_project_title,
          'project_id', p.tprjct_id,
          'created_at', hm.thlmmu_created_at,
          'created_by_name', u.name
      ) AS properties
    FROM t_health_mmu hm
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = hm.thlmmu_project_id
    LEFT JOIN public.t_user u 
      ON u.user_id = hm.thlmmu_created_by
    WHERE ${where}
  ) f
) fc;
`;
      const records = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });

      res.status(200).json(records[0]["geojson"]);
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getMMUOrganizedDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",

        // HLMMU data
        "thlmmu_id",
        "thlmmu_date",
        "thlmmu_no_of_male_patients",
        "thlmmu_no_of_female_patients",
        "thlmmu_no_of_child",
        "thlmmu_no_of_patient_gen_med",
        "thlmmu_no_of_patient_in_ortho",
        "thlmmu_no_of_patient_in_comm_cold_flu",
        "thlmmu_no_of_patient_in_gyno",
        "thlmmu_no_of_patient_in_pedeatrics",
        "thlmmu_no_of_patient_in_referred",
        "thlmmu_no_of_patient_in_telemedicines",
        "thlmmu_latitude",
        "thlmmu_longitude",

        // village
        "tvill_village_name",

        // metadata
        "created_at",
        "name",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};

      let where = `
      1=1
    `;

      const replacements = {};
      if (from_date && to_date) {
        where += ` AND (hm.thlmmu_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
      SELECT
     p.tprjct_project_title,

    hm.thlmmu_id,
    hm.thlmmu_date,
    hm.thlmmu_no_of_male_patients,
    hm.thlmmu_no_of_female_patients,
    hm.thlmmu_no_of_child,
    hm.thlmmu_no_of_patient_gen_med,
    hm.thlmmu_no_of_patient_in_ortho,
    hm.thlmmu_no_of_patient_in_comm_cold_flu,
    hm.thlmmu_no_of_patient_in_gyno,
    hm.thlmmu_no_of_patient_in_pedeatrics,
    hm.thlmmu_no_of_patient_in_referred,
    hm.thlmmu_no_of_patient_in_telemedicines,
    hm.thlmmu_latitude,
    hm.thlmmu_longitude,

   v.tvill_village_name,

    hm.thlmmu_created_at AS created_at,
    u.name

    FROM t_health_mmu hm
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = hm.thlmmu_project_id
    LEFT JOIN public.t_village v 
      ON v.tvill_id = hm.thlmmu_village
    LEFT JOIN public.t_user u 
      ON u.user_id = hm.thlmmu_created_by
`;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getMegaCampGeojson: async (req, res, next) => {
    try {
      const { monitoring_id, from_date, to_date } = req.body;
      const replacements = {};
      let where = " 1=1";
      if (monitoring_id) {
        where += ` AND hmp.thlmcam_id = :monitoring_id`;
        replacements.monitoring_id = monitoring_id;
      }
      if (from_date && to_date) {
        where += ` AND (hmp.thlmcam_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
    SELECT row_to_json(fc) AS geojson
   FROM (
    SELECT 
    'FeatureCollection' AS type,
    array_to_json(array_agg(f)) AS features
    FROM (
    SELECT 
      'Feature' AS type,
      ST_AsGeoJSON(ST_Centroid(hmp.wkb_geometry))::json AS geometry,
      json_build_object(
          'project_title', p.tprjct_project_title,
          'project_id', p.tprjct_id,
          'created_at', hmp.thlmcam_created_at,
          'created_by_name', u.name
      ) AS properties
    FROM t_health_mega_camp hmp
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = hmp.thlmcam_project_id
    LEFT JOIN public.t_user u 
      ON u.user_id = hmp.thlmcam_created_by
    WHERE ${where}
  ) f
) fc;
`;
      const records = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });

      res.status(200).json(records[0]["geojson"]);
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getMegaCampDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",

        "thlmcam_id",
        "thlmcam_place",
        "thlmcam_longitude",
        "thlmcam_latitude",

        // village
        "tvill_village_name",

        // metadata
        "created_at",
        "name",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};

      let where = `
      1=1
    `;

      const replacements = {};
      if (from_date && to_date) {
        where += ` AND (hmp.thlmcam_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
      SELECT
     p.tprjct_project_title,

    hmp.thlmcam_id,
    hmp.thlmcam_place,
    hmp.thlmcam_longitude,
    hmp.thlmcam_latitude,

   v.tvill_village_name,

    hmp.thlmcam_created_at AS created_at,
    u.name

    FROM t_health_mega_camp hmp
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = hmp.thlmcam_project_id
    LEFT JOIN public.t_village v 
      ON v.tvill_id = hmp.thlmcam_village_id
    LEFT JOIN public.t_user u 
      ON u.user_id = hmp.thlmcam_created_by
`;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getAnimalCampGeojson: async (req, res, next) => {
    try {
      const { monitoring_id, from_date, to_date } = req.body;
      const replacements = {};
      let where = " 1=1";
      if (monitoring_id) {
        where += ` AND hac.thlacam_id = :monitoring_id`;
        replacements.monitoring_id = monitoring_id;
      }
      if (from_date && to_date) {
        where += ` AND (hac.thlacam_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
    SELECT row_to_json(fc) AS geojson
   FROM (
    SELECT 
    'FeatureCollection' AS type,
    array_to_json(array_agg(f)) AS features
    FROM (
    SELECT 
      'Feature' AS type,
      ST_AsGeoJSON(ST_Centroid(hac.wkb_geometry))::json AS geometry,
      json_build_object(
          'project_title', p.tprjct_project_title,
          'project_id', p.tprjct_id,
          'created_at', hac.thlacam_created_at,
          'created_by_name', u.name
      ) AS properties
    FROM t_health_animal_camp hac
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = hac.thlacam_project_id
    LEFT JOIN public.t_user u 
      ON u.user_id = hac.thlacam_created_by
    WHERE ${where}
  ) f
) fc;
`;
      const records = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });

      res.status(200).json(records[0]["geojson"]);
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getAnimalCampDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",

        "thlacam_id",
        "thlacam_date",
        "thlacam_no_of_beneficiaries",
        "thlacam_test_cost",
        "thlacam_medicine_cost",
        "thlacam_latitude",
        "thlacam_longitude",

        // village
        "tvill_village_name",

        // metadata
        "created_at",
        "name",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};

      let where = `
      1=1
    `;

      const replacements = {};
      if (from_date && to_date) {
        where += ` AND (hac.thlacam_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
      SELECT
     p.tprjct_project_title,

    hac.thlacam_id,
    hac.thlacam_date,
    hac.thlacam_no_of_beneficiaries,
    hac.thlacam_test_cost,
    hac.thlacam_medicine_cost,
    hac.thlacam_latitude,
    hac.thlacam_longitude,

   v.tvill_village_name,

    hac.thlacam_created_at AS created_at,
    u.name

    FROM t_health_animal_camp hac
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = hac.thlacam_project_id
    LEFT JOIN public.t_village v 
      ON v.tvill_id = hac.thlacam_village_id
    LEFT JOIN public.t_user u 
      ON u.user_id = hac.thlacam_created_by
`;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getSHGGeojson: async (req, res, next) => {
    try {
      const { monitoring_id, from_date, to_date } = req.body;
      const replacements = {};
      let where = " 1=1";
      if (monitoring_id) {
        where += ` AND shg.tsdgdet_id = :monitoring_id`;
        replacements.monitoring_id = monitoring_id;
      }
      if (from_date && to_date) {
        where += ` AND (shg.tsdgdet_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
          BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
    SELECT row_to_json(fc) AS geojson
   FROM (
    SELECT 
    'FeatureCollection' AS type,
    array_to_json(array_agg(f)) AS features
    FROM (
    SELECT 
      'Feature' AS type,
      ST_AsGeoJSON(ST_Centroid(shg.wkb_geometry))::json AS geometry,
      json_build_object(
          'project_title', p.tprjct_project_title,
          'project_id', p.tprjct_id,
          'created_at', shg.tsdgdet_created_at,
          'created_by_name', u.name
      ) AS properties
    FROM t_shg_details shg
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = shg.tsdgdet_project_id
    LEFT JOIN public.t_user u 
      ON u.user_id = shg.tsdgdet_created_by
    WHERE ${where}
  ) f
) fc;
`;
      const records = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });

      res.status(200).json(records[0]["geojson"]);
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
  getSHGDT: async (req, res, next) => {
    try {
      const allowedColumns = [
        "tprjct_project_title",

        // SHG details
        "tsdgdet_id",
        "tsdgdet_shg_name",
        "tsdgdet_group_date",
        "tsdgdet_shg_cat",
        "tsdgdet_sector_of_activity",
        "tsdgdet_bank_acc_no",
        "tsdgdet_ifsc",
        "tsdgdet_latitude",
        "tsdgdet_longitude",

        // location hierarchy
        "tvill_village_name",
        "tblk_block_name",
        "tgramp_gram_panchayat_name",
        "tdis_district_name",

        // NGO
        "tng_name",

        // metadata
        "created_at",
        "name",
        "from_date",
        "to_date",
      ];

      const resData = validateColumnNames({ req, allowedColumns });

      if (!resData.valid) {
        return res.status(400).json({
          success: false,
          message: resData.message,
          invalidColumns: resData.invalidColumns,
        });
      }
      const { filterParams } = req.body;
      const { from_date, to_date } = filterParams || {};

      let where = `
      1=1
    `;

      const replacements = {};
      if (from_date && to_date) {
        where += ` AND (shg.tsdgdet_created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
           BETWEEN :from_date AND :to_date`;
        replacements.from_date = from_date;
        replacements.to_date = to_date;
      }

      const sql = `
      SELECT
     p.tprjct_project_title,

    shg.tsdgdet_id,
    shg.tsdgdet_shg_name,
    shg.tsdgdet_group_date,
    shg.tsdgdet_shg_cat,
    shg.tsdgdet_sector_of_activity,
    shg.tsdgdet_bank_acc_no,
    shg.tsdgdet_ifsc,
    shg.tsdgdet_latitude,
    shg.tsdgdet_longitude,

   v.tvill_village_name,

    b.tblk_block_name,
    pn.tgramp_gram_panchayat_name,
    d.tdis_district_name,
    n.tng_name,

    shg.tsdgdet_created_at AS created_at,
    u.name

    FROM t_shg_details shg
    LEFT JOIN public.t_project p 
      ON p.tprjct_id = shg.tsdgdet_project_id
    LEFT JOIN public.t_village v 
      ON v.tvill_id = shg.tsdgdet_village_name
    LEFT JOIN public.t_block b 
      ON b.tblk_id = shg.tsdgdet_block_id
    LEFT JOIN public.t_gram_panchayat pn
      ON pn.tgramp_id = shg.tsdgdet_panchayat_id
    LEFT JOIN public.t_district d 
      ON d.tdis_id = shg.tsdgdet_district_id
    LEFT JOIN public.t_ngo n 
      ON n.tng_id = shg.tsdgdet_implementing_part_id
    LEFT JOIN public.t_user u 
      ON u.user_id = shg.tsdgdet_created_by
`;

      DatatablesReplacement.build(req, sql, where, replacements)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          next(CustomErrorHandler.internalServerError(err.message));
        });
    } catch (err) {
      next(CustomErrorHandler.databaseError(err.message));
    }
  },
};

module.exports = dashboardController;
