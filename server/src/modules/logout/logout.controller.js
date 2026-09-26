
const { verify } = require("jsonwebtoken");
const PersonalAccessTokenModel = require("../../models/personalAccessToken.model");
const CustomErrorHandler = require("../../services/customErrorHandler.service");
const UserModel = require("../../models/user.model");


// const logout = async (req, res, next) => {
//   try {
//     const token = req.headers["authorization"]?.split(" ")[1];

//     await PersonalAccessTokenModel.destroy({
//       where: {
//         token,
//       },
//     });

//     return res.status(200).json({
//       status: true,
//       message: "Logout successfully",
//     });
//   } catch (error) {
//     next(CustomErrorHandler.internalServerError(error.message));
//   }
// };



const logout = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Token is required",
      });
    }

    /* ================= VERIFY JWT ================= */
    let decoded;
    try {
      decoded = verify(token, process.env.JWT_SECRET_KEY);
    } catch {
      return res.status(401).json({
        status: false,
        message: "Invalid or expired token",
      });
    }

    /* ================= CLEAR app_token (ONLY IF MATCH) ================= */
    const updated = await UserModel.update(
      { app_token: null },
      {
        where: {
          user_id: decoded.user_id,
          app_token: token,
        },
      }
    );

    // if (updated[0] === 0) {
    //   return res.status(401).json({
    //     status: false,
    //     message: "Invalid session or already logged out",
    //   });
    // }

    /* ================= DELETE FROM PERSONAL ACCESS TOKEN TABLE ================= */
    await PersonalAccessTokenModel.destroy({
      where: {
        tokenable_id: decoded.user_id,
        token: token,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Logout successfully",
    });

  } catch (error) {
    return next(CustomErrorHandler.databaseError(error.message));
  }
};





module.exports = {
  logout
};
