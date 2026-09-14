const express = require("express");
const router = express.Router();
const FyModel = require("../../models/financialYear.model");
const authMiddleware = require("../../middlewares/auth.middleware");

router.get("/list", async (req, res) => {
  try {
    const years = await FyModel.findAll({
      where: { deleted_at: null },
      order: [["id", "DESC"]],
    });

    const formatted = years.map((y) => ({
      id: y.id,
      value: y.id,
      label: y.code,
      code: y.code,
      is_current: y.is_current,
      is_active: y.is_active,
    }));

    return res.status(200).json({
      status: true,
      success: true,
      message: "Financial years fetched successfully",
      data: formatted,
    });
  } catch (err) {
    console.error("Error fetching financial years:", err.message);
    return res.status(200).json({
      status: true,
      success: true,
      data: [],
    });
  }
});

module.exports = router;
