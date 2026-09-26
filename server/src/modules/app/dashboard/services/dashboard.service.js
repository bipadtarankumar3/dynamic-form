const { sequelize } = require("../../../../config/db.config");

const totalProjectService = async ({ user_id }) => {
  /* =======================
     PROJECT COUNT (USER ONLY)
  ======================== */
  const query = `
    SELECT COUNT(*)::int AS total
    FROM t_project tp
    JOIN t_proposal tpro ON tp.tprjct_proposal_id = tpro.tpro_id
    JOIN t_ngo tng ON tpro.tpro_ngo_id = tng.tng_id
    WHERE tng.tng_user_id = :user_id
      AND tp.tprjct_is_active = true
      AND tp.tprjct_status = 'APPROVED'
  `;

  const result = await sequelize.query(query, {
    replacements: { user_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result[0].total;
};
const totalGalleryService = async ({ user_id, from_date, to_date }) => {
  /* =======================
     GALLERY BASE QUERY
  ======================== */
  const baseQuery = `
    SELECT COUNT(*)::int AS total
    FROM t_pic_gallery
    WHERE tpgal_is_active = true
      AND tpgal_created_by = :user_id
  `;

  /* =======================
     TRY WITH DATE FILTER
  ======================== */
  if (from_date && to_date) {
    const result = await sequelize.query(
      `
      ${baseQuery}
      AND tpgal_created_at::date BETWEEN :from_date AND :to_date
      `,
      {
        replacements: { user_id, from_date, to_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return result[0].total;
  }

  // 👉 NO DATE → FULL COUNT
  const result = await sequelize.query(baseQuery, {
    replacements: { user_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result[0].total;
};

const totalSportsService = async ({ user_id, from_date, to_date }) => {
  /* =======================
     SPORTS BASE QUERY
  ======================== */
  const baseQuery = `
    SELECT SUM(total)::int AS total FROM (
      SELECT COUNT(*) AS total
      FROM t_sport_prod_strn
      WHERE tsppst_is_active = true
        AND tsppst_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_sport_marketing_dev
      WHERE tspmdev_is_active = true
        AND tspmdev_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_sport_brand_prom
      WHERE tspbdpm_is_active = true
        AND tspbdpm_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_sport_capacity_build
      WHERE tspcpbld_is_active = true
        AND tspcpbld_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_sport_deliverables
      WHERE tspdel_is_active = true
        AND tspdel_created_by = :user_id
    ) sport
  `;

  /* =======================
     TRY WITH DATE FILTER
  ======================== */
  if (from_date && to_date) {
    const result = await sequelize.query(
      `
      SELECT SUM(total)::int AS total FROM (
        SELECT COUNT(*) AS total
        FROM t_sport_prod_strn
        WHERE tsppst_is_active = true
          AND tsppst_created_by = :user_id
          AND tsppst_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_sport_marketing_dev
        WHERE tspmdev_is_active = true
          AND tspmdev_created_by = :user_id
          AND tspmdev_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_sport_brand_prom
        WHERE tspbdpm_is_active = true
          AND tspbdpm_created_by = :user_id
          AND tspbdpm_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_sport_capacity_build
        WHERE tspcpbld_is_active = true
          AND tspcpbld_created_by = :user_id
          AND tspcpbld_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_sport_deliverables
        WHERE tspdel_is_active = true
          AND tspdel_created_by = :user_id
          AND tspdel_created_at::date BETWEEN :from_date AND :to_date
      ) sport
      `,
      {
        replacements: { user_id, from_date, to_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return result[0].total;
  }

  const result = await sequelize.query(baseQuery, {
    replacements: { user_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result[0].total;
};

const totalEducationService = async ({ user_id, from_date, to_date }) => {
  /* =======================
     EDUCATION BASE QUERY
  ======================== */
  const baseQuery = `
    SELECT SUM(total)::int AS total FROM (
      SELECT COUNT(*) AS total
      FROM t_edu_scholarship
      WHERE tedusp_is_active = true
        AND tedusp_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_edu_non_infrastructure
      WHERE tedunin_is_active = true
        AND tedunin_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_edu_supplies_at_scl
      WHERE tedussch_is_active = true
        AND tedussch_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_edu_infra_wrk
      WHERE teduiwrk_is_active = true
        AND teduiwrk_created_by = :user_id
    ) edu
  `;

  /* =======================
     TRY WITH DATE FILTER
  ======================== */
  if (from_date && to_date) {
    const result = await sequelize.query(
      `
      SELECT SUM(total)::int AS total FROM (
        SELECT COUNT(*) AS total
        FROM t_edu_scholarship
        WHERE tedusp_is_active = true
          AND tedusp_created_by = :user_id
          AND tedusp_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_edu_non_infrastructure
        WHERE tedunin_is_active = true
          AND tedunin_created_by = :user_id
          AND tedunin_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_edu_supplies_at_scl
        WHERE tedussch_is_active = true
          AND tedussch_created_by = :user_id
          AND tedussch_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_edu_infra_wrk
        WHERE teduiwrk_is_active = true
          AND teduiwrk_created_by = :user_id
          AND teduiwrk_created_at::date BETWEEN :from_date AND :to_date
      ) edu
      `,
      {
        replacements: { user_id, from_date, to_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return result[0].total;
  }

  const result = await sequelize.query(baseQuery, {
    replacements: { user_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result[0].total;
};

const totalShgService = async ({ user_id, from_date, to_date }) => {
  /* =======================
     SHG BASE QUERY
  ======================== */
  const baseQuery = `
    SELECT SUM(total)::int AS total FROM (
      SELECT COUNT(*) AS total
      FROM t_shg_details
      WHERE tsdgdet_is_active = true
        AND tsdgdet_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_shg_financial_info
      WHERE tsdgfinf_is_active = true
        AND tsdgfinf_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_shg_training_capacity
      WHERE tsdgtcap_is_active = true
        AND tsdgtcap_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_shg_prod_livelihood
      WHERE tsdgpliv_is_active = true
        AND tsdgpliv_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_shg_marketing_sales
      WHERE tsdgmsal_is_active = true
        AND tsdgmsal_created_by = :user_id
    ) shg
  `;

  /* =======================
     TRY WITH DATE FILTER
  ======================== */
  if (from_date && to_date) {
    const result = await sequelize.query(
      `
      SELECT SUM(total)::int AS total FROM (
        SELECT COUNT(*) AS total
        FROM t_shg_details
        WHERE tsdgdet_is_active = true
          AND tsdgdet_created_by = :user_id
          AND tsdgdet_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_shg_financial_info
        WHERE tsdgfinf_is_active = true
          AND tsdgfinf_created_by = :user_id
          AND tsdgfinf_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_shg_training_capacity
        WHERE tsdgtcap_is_active = true
          AND tsdgtcap_created_by = :user_id
          AND tsdgtcap_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_shg_prod_livelihood
        WHERE tsdgpliv_is_active = true
          AND tsdgpliv_created_by = :user_id
          AND tsdgpliv_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_shg_marketing_sales
        WHERE tsdgmsal_is_active = true
          AND tsdgmsal_created_by = :user_id
          AND tsdgmsal_created_at::date BETWEEN :from_date AND :to_date
      ) shg
      `,
      {
        replacements: { user_id, from_date, to_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return result[0].total;
  }

  const result = await sequelize.query(baseQuery, {
    replacements: { user_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result[0].total;
};

const totalHealthService = async ({ user_id, from_date, to_date }) => {
  /* =======================
     HEALTH BASE QUERY
  ======================== */
  const baseQuery = `
    SELECT SUM(total)::int AS total FROM (
      SELECT COUNT(*) AS total
      FROM t_health_mmu
      WHERE thlmmu_is_active = true
        AND thlmmu_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_health_mega_camp
      WHERE thlmcam_is_active = true
        AND thlmcam_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_health_animal_camp
      WHERE thlacam_is_active = true
        AND thlacam_created_by = :user_id
    ) health
  `;

  /* =======================
     TRY WITH DATE FILTER
  ======================== */
  if (from_date && to_date) {
    const result = await sequelize.query(
      `
      SELECT SUM(total)::int AS total FROM (
        SELECT COUNT(*) AS total
        FROM t_health_mmu
        WHERE thlmmu_is_active = true
          AND thlmmu_created_by = :user_id
          AND thlmmu_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_health_mega_camp
        WHERE thlmcam_is_active = true
          AND thlmcam_created_by = :user_id
          AND thlmcam_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_health_animal_camp
        WHERE thlacam_is_active = true
          AND thlacam_created_by = :user_id
          AND thlacam_created_at::date BETWEEN :from_date AND :to_date
      ) health
      `,
      {
        replacements: { user_id, from_date, to_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return result[0].total;
  }

  const result = await sequelize.query(baseQuery, {
    replacements: { user_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result[0].total;
};

const totalSkillDevService = async ({ user_id, from_date, to_date }) => {
  /* =======================
     SKILL DEVELOPMENT BASE QUERY
  ======================== */
  const baseQuery = `
    SELECT SUM(total)::int AS total FROM (
      SELECT COUNT(*) AS total
      FROM t_skill_dev_training_dtls
      WHERE tsdtrdt_is_active = true
        AND tsdtrdt_created_by = :user_id

      UNION ALL

      SELECT COUNT(*) AS total
      FROM t_skill_dev_course_dtls
      WHERE tsdtcsdt_is_active = true
        AND tsdtcsdt_created_by = :user_id
    ) skill
  `;

  /* =======================
     TRY WITH DATE FILTER
  ======================== */
  if (from_date && to_date) {
    const result = await sequelize.query(
      `
      SELECT SUM(total)::int AS total FROM (
        SELECT COUNT(*) AS total
        FROM t_skill_dev_training_dtls
        WHERE tsdtrdt_is_active = true
          AND tsdtrdt_created_by = :user_id
          AND tsdtrdt_created_at::date BETWEEN :from_date AND :to_date

        UNION ALL

        SELECT COUNT(*) AS total
        FROM t_skill_dev_course_dtls
        WHERE tsdtcsdt_is_active = true
          AND tsdtcsdt_created_by = :user_id
          AND tsdtcsdt_created_at::date BETWEEN :from_date AND :to_date
      ) skill
      `,
      {
        replacements: { user_id, from_date, to_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return result[0].total;
  }

  const result = await sequelize.query(baseQuery, {
    replacements: { user_id },
    type: sequelize.QueryTypes.SELECT,
  });

  return result[0].total;
};

module.exports = {
  totalProjectService,
  totalGalleryService,
  totalEducationService,
  totalSportsService,
  totalShgService,
  totalHealthService,
  totalSkillDevService,
};
