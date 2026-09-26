const { sequelize } = require("../../../../config/db.config");
const CustomErrorHandler = require("../../../../services/customErrorHandler.service");
const {
  totalEducationService,
  totalSportsService,
  totalGalleryService,
  totalProjectService,
  totalShgService,
  totalHealthService,
  totalSkillDevService,
} = require("../services/dashboard.service");

const dashboardController = {
  allCount: async (req, res, next) => {
    try {
      const { user_id } = req.user;
      const { from_date, to_date } = req.body;

      const projectTotal = await totalProjectService({ user_id });

      const totalGallery = await totalGalleryService({
        user_id,
        from_date,
        to_date,
      });
      const totalEducation = await totalEducationService({
        user_id,
        from_date,
        to_date,
      });
      const totalSports = await totalSportsService({
        user_id,
        from_date,
        to_date,
      });
      const totalShg = await totalShgService({ user_id, from_date, to_date });
      const totalHealth = await totalHealthService({
        user_id,
        from_date,
        to_date,
      });
      const totalSkillDev = await totalSkillDevService({
        user_id,
        from_date,
        to_date,
      });

      return res.status(200).json({
        status: true,
        data: {
          projectTotal,
          totalGallery,
          totalEducation,
          totalSports,
          totalShg,
          totalHealth,
          totalSkillDev,
        },
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
};

module.exports = dashboardController;
