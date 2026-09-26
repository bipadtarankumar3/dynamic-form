const express = require("express");
const router = express.Router();
const { sequelize } = require("../../config/db.config");

async function fetchFinancialYears(onlyActive = false) {
  try {
    let query = `
      SELECT id, name, code, start_date, end_date, is_current, is_active
      FROM t_frm_financial_year
      WHERE deleted_at IS NULL
    `;
    if (onlyActive) {
      query += ` AND is_active = TRUE`;
    }
    query += ` ORDER BY id DESC`;

    const [rows] = await sequelize.query(query);
    return rows.map((y) => ({
      id: y.id,
      value: y.id,
      label: y.name || y.code,
      name: y.name || y.code,
      code: y.code,
      start_date: y.start_date,
      end_date: y.end_date,
      is_current: Boolean(y.is_current),
      is_active: Boolean(y.is_active),
    }));
  } catch (err) {
    console.error("[FY Route] Error fetching financial years from t_frm_financial_year:", err.message);
    return [];
  }
}

const handleList = async (req, res) => {
  try {
    const onlyActive = req.query?.active === "true" || req.body?.active === true;
    const formatted = await fetchFinancialYears(onlyActive);

    return res.status(200).json({
      status: true,
      success: true,
      message: "Financial years fetched successfully",
      data: formatted,
    });
  } catch (err) {
    console.error("[FY Route] Error fetching financial years:", err.message);
    return res.status(200).json({
      status: true,
      success: true,
      data: [],
    });
  }
};

const handleCurrent = async (req, res) => {
  try {
    const all = await fetchFinancialYears(false);
    const current = all.find((y) => y.is_current) || all.find((y) => y.is_active) || all[0] || null;

    return res.status(200).json({
      status: true,
      success: true,
      message: "Current financial year fetched successfully",
      data: current,
    });
  } catch (err) {
    console.error("[FY Route] Error fetching current financial year:", err.message);
    return res.status(200).json({
      status: true,
      success: true,
      data: null,
    });
  }
};

router.get("/list", handleList);
router.post("/list", handleList);
router.get("/current", handleCurrent);
router.post("/current", handleCurrent);

module.exports = router;

