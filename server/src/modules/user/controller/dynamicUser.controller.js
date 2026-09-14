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
} = require("../helper/data.helper");
const {
  getFormWithSection,
} = require("../../../helper/getFormWithSection.helper");
const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const { executeRules, hasErrors } = require("../helper/ruleExecutor.helper");
const RoleModel = require("../../../models/role.model");
const UserModel = require("../../../models/user.model");
const {
  sendUserProfileCreateEmail,
} = require("../../../email/services/userProfileCreateService");
const PersonalAccessTokenModel = require("../../../models/personalAccessToken.model");
const jwtUtils = require("../../../utils/jwt.utils");
const bcrypt = require("bcryptjs");
const dynamicFormController = {
  add: async (req, res, next) => {
    let transaction;
    const loginUserId = req.user.user_id;

    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "Invalid form data",
        });
      }

      // fetching schema
      const schema = await getFormWithSection({
        form_slug: req.body.form_slug,
      });

      if (!schema) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema",
        });
      }

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
      const segregated = await segregateData(schema, mergedData);

      const errorBag = await executeRules({
        schema,
        segregatedData: segregated,
        mode: "add",
      });

      if (hasErrors(errorBag)) {
        return res.status(400).json({
          status: false,
          message: "Validation failed",
          errors: errorBag,
        });
      }

      transaction = await sequelize.transaction();

      /* ======================================================
       USER + USER PROFILE CUSTOM INSERT
    ====================================================== */

      const profileData = segregated.t_user_profile;
      if (!profileData) {
        return res.status(400).json({
          status: false,
          message: "Invalid Form Data",
        });
      }

      /* ---------- START SINGLE TRANSACTION ---------- */

      /* ---------- FETCH ROLE ---------- */
      const role = await RoleModel.findOne({
        where: { rol_id: profileData.tup_user_role },
        attributes: ["rol_id", "rol_slug"],
        transaction,
      });

      if (!role || !role.rol_slug) {
        throw new Error("Invalid role or missing role slug");
      }

      const user = await UserModel.create(
        {
          name: profileData.tup_user_name,
          password: "Default@123",
          email: profileData.tup_email,
          phone: profileData.tup_phone_no,
          role_id: role.rol_id,
          role_slug: role.rol_slug,
          is_active: profileData.tup_is_active,
          created_by: loginUserId,
        },
        { transaction },
      );

      /* ---------- INJECT USER ID + ROLE SLUG INTO PROFILE ---------- */
      segregated.t_user_profile.tup_user_id = user.user_id;
      segregated.t_user_profile.tup_user_role_slug = role.rol_slug;
      segregated.t_user_profile.tup_created_by = loginUserId;
      /* ======================================================
       CONTINUE EXISTING DYNAMIC INSERT FLOW
    ====================================================== */

      const rootTable = schema?.root_entity?.table;
      const rootPKField = schema?.root_entity?.primary_key;

      if (!rootTable || !rootPKField) {
        if (transaction) await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Invalid form schema: Missing root entity configuration",
        });
      }

      // safety: PK should not exist in ADD
      if (segregated?.[rootTable]?.[rootPKField]) {
        if (transaction) await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Primary key should not be present while adding",
        });
      }

      /* ---------- ROOT INSERT ---------- */
      const created = await insertRow(
        rootTable,
        segregated[rootTable],
        schemaCtx,
        transaction,
      );
      const rootPK = created[rootPKField];

      /* ---------- SECTIONS ---------- */
      const pkMap = {};

      for (const section of schema.sections) {
        if (section.table === rootTable) continue;

        const rows = segregated[section.table];
        if (!rows) continue;

        /* GENERAL */
        if (section.type === "general") {
          rows[section.relation.foreign_key] = rootPK;

          const saved = await insertRow(
            section.table,
            rows,
            schemaCtx,
            transaction,
          );

          pkMap[section.section_id] = saved[section.primary_key];
        }

        /* ADD_MORE */
        if (section.type === "add_more") {
          for (const row of rows) {
            const tempId = row.__temp_pk;
            delete row.__temp_pk;

            row[section.relation.foreign_key] = rootPK;

            const saved = await insertRow(
              section.table,
              row,
              schemaCtx,
              transaction,
            );

            pkMap[tempId] = saved[section.primary_key];
          }
        }
      }

      /* ---------- DOCUMENTS ---------- */
      for (const doc of segregated.__documents) {
        const { section, parentTempId, files } = doc;

        const fileField = section.fields.find((f) => f.type === "file");
        if (!fileField?.file) continue;

        const parentId =
          parentTempId && pkMap[parentTempId] ? pkMap[parentTempId] : rootPK;

        const fileSchema = fileField.file;

        const result = fileSchema.multiple
          ? await saveAndPrepareDocumentMetadata(
              files,
              parentId,
              `uploads/${fileSchema.upload_path}`,
              req.user?.id || 0,
              transaction,
            )
          : await saveUpdateAndPrepareDocumentMetadata(
              files,
              parentId,
              `uploads/${fileSchema.upload_path}`,
              req.user?.id || 0,
              transaction,
            );

        if (result?.metadata?.length) {
          result.metadata.forEach((m, i) => {
            m.doc_purpose = files[i].__field;
          });

          const cols = Object.keys(result.metadata[0]);
          const sql = `
          INSERT INTO ${fileSchema.table}
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

          await sequelize.query(sql, { replacements, transaction });
        }
      }

      sendUserProfileCreateEmail({
        name: user.name,
        email: user.email,
        password: "Default@123",
      });

      await transaction.commit();

      res.json({
        status: true,
        message: `${schema.title} added successfully`,
        root_id: rootPK,
      });
    } catch (err) {
      if (transaction) await transaction.rollback();
      next(CustomErrorHandler.internalServerError(err.message));
    }
  },

  edit: async (req, res, next) => {
    let transaction;
    const loginUserId = req.user.user_id;
    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "Invalid form data",
        });
      }

      // fetching schema
      const schema = await getFormWithSection({
        form_slug: req.body.form_slug,
      });

      if (!schema) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema",
        });
      }

      const schemaCtx = buildMultiSelectMaps(schema);
      const mergedData = mergeFilesIntoData(req.body, req.files);

      if (Object.keys(mergedData || {}).length === 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid form data",
        });
      }

      const segregated = await segregateData(schema, mergedData);

      const errorBag = await executeRules({
        schema,
        segregatedData: segregated,
        mode: "edit",
      });

      if (hasErrors(errorBag)) {
        return res.status(400).json({
          status: false,
          message: "Validation failed",
          errors: errorBag,
        });
      }

      transaction = await sequelize.transaction();
      /* ======================================================
   UPDATE USER TABLE (EDIT)
====================================================== */

      const profileData = segregated.t_user_profile;

      if (!profileData?.tup_user_id) {
        return res.status(400).json({
          status: false,
          message: "Missing user id for update",
        });
      }

      /* ---------- FETCH ROLE ---------- */
      const role = await RoleModel.findOne({
        where: { rol_id: profileData.tup_user_role },
        attributes: ["rol_id", "rol_slug"],
      });

      if (!role || !role.rol_slug) {
        return res.status(400).json({
          status: false,
          message: "Invalid role or missing role slug",
        });
      }

      /* ---------- START TRANSACTION (ONLY ONCE) ---------- */

      /* ---------- UPDATE USER TABLE ---------- */
      await UserModel.update(
        {
          name: profileData.tup_user_name,
          email: profileData.tup_email,
          phone: profileData.tup_phone_no,
          role_id: role.rol_id,
          role_slug: role.rol_slug,
          is_active: profileData.tup_is_active,
          updated_by: loginUserId,
          updated_at: new Date(),
        },
        {
          where: { user_id: profileData.tup_user_id },
          transaction,
        },
      );

      /* ---------- SYNC ROLE SLUG INTO PROFILE ---------- */
      segregated.t_user_profile.tup_user_role_slug = role.rol_slug;
      segregated.t_user_profile.tup_user_role = role.rol_id;
      segregated.t_user_profile.tup_updated_by = loginUserId;
      segregated.t_user_profile.tup_updated_at = new Date();

      const rootTable = schema.root_entity.table;
      const rootPKField = schema.root_entity.primary_key;

      if (!segregated?.[rootTable]?.[rootPKField]) {
        if (transaction) await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Missing root primary key for edit",
        });
      }

      const rootPK = segregated[rootTable][rootPKField];

      /* ---------- ROOT UPDATE ---------- */
      await updateRow(
        rootTable,
        segregated[rootTable],
        { [rootPKField]: rootPK },
        schemaCtx,
        transaction,
      );

      /* ---------- SECTIONS ---------- */
      const pkMap = {};

      for (const section of schema.sections) {
        if (section.table === rootTable) continue;

        const rows = segregated[section.table];
        if (!rows) continue;

        /* GENERAL */
        if (section.type === "general") {
          rows[section.relation.foreign_key] = rootPK;

          if (rows[section.primary_key]) {
            await updateRow(
              section.table,
              rows,
              { [section.primary_key]: rows[section.primary_key] },
              schemaCtx,
              transaction,
            );
            pkMap[section.section_id] = rows[section.primary_key];
          }
        }

        /* ADD_MORE (UPSERT + DELETE) */
        if (section.type === "add_more") {
          const keptIds = [];

          for (const row of rows) {
            const tempId = row.__temp_pk;
            delete row.__temp_pk;

            row[section.relation.foreign_key] = rootPK;

            const pkVal = row[section.primary_key];
            const isExistingPk =
              pkVal !== undefined &&
              pkVal !== null &&
              String(pkVal).trim() !== "" &&
              !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(pkVal).trim()) &&
              /^\d+$/.test(String(pkVal).trim());

            if (isExistingPk) {
              await updateRow(
                section.table,
                row,
                { [section.primary_key]: row[section.primary_key] },
                schemaCtx,
                transaction,
              );
              keptIds.push(row[section.primary_key]);
              pkMap[tempId] = row[section.primary_key];
            } else {
              delete row[section.primary_key];

              const saved = await insertRow(
                section.table,
                row,
                schemaCtx,
                transaction,
              );
              if (saved?.[section.primary_key]) {
                keptIds.push(saved[section.primary_key]);
                pkMap[tempId] = saved[section.primary_key];
              }
            }
          }

          // delete removed rows
          if (rows.length === 0) {
            await sequelize.query(
              `
            DELETE FROM ${section.table}
            WHERE ${section.relation.foreign_key} = :rootPK
          `,
              { replacements: { rootPK }, transaction },
            );
          } else if (keptIds.length > 0) {
            await sequelize.query(
              `
            DELETE FROM ${section.table}
            WHERE ${section.relation.foreign_key} = :rootPK
              AND ${section.primary_key} NOT IN (:ids)
          `,
              {
                replacements: { rootPK, ids: keptIds },
                transaction,
              },
            );
          }
        }
      }

      /* ---------- DOCUMENTS ---------- */
      for (const doc of segregated.__documents) {
        const { section, parentTempId, files } = doc;

        const fileField = section.fields.find((f) => f.type === "file");
        if (!fileField?.file) continue;

        const parentId =
          parentTempId && pkMap[parentTempId] ? pkMap[parentTempId] : rootPK;

        const fileSchema = fileField.file;

        const result = fileSchema.multiple
          ? await saveAndPrepareDocumentMetadata(
              files,
              parentId,
              `uploads/${fileSchema.upload_path}`,
              req.user?.id || 0,
              transaction,
            )
          : await saveUpdateAndPrepareDocumentMetadata(
              files,
              parentId,
              `uploads/${fileSchema.upload_path}`,
              req.user?.id || 0,
              transaction,
            );

        if (result?.metadata?.length) {
          result.metadata.forEach((m, i) => {
            m.doc_purpose = files[i].__field;
          });

          const cols = Object.keys(result.metadata[0]);
          const sql = `
          INSERT INTO ${fileSchema.table}
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

          await sequelize.query(sql, { replacements, transaction });
        }
      }

      await transaction.commit();

      res.json({
        status: true,
        message: `${schema.title} updated successfully`,
        root_id: rootPK,
      });
    } catch (err) {
      if (transaction) await transaction.rollback();
      next(CustomErrorHandler.internalServerError(err.message));
    }
  },
  activeInactive: async (req, res, next) => {
    let transaction;
    try {
      const { form_slug, primary_key_value, is_active } = req.body;

      if (!form_slug || !primary_key_value) {
        return res.status(400).json({
          status: false,
          message: "Invalid request payload",
        });
      }

      // 1️⃣ Fetch schema
      const schema = await getFormWithSection({ form_slug });

      if (!schema?.root_entity || !Array.isArray(schema.actions)) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema",
        });
      }

      const { table, primary_key } = schema.root_entity;

      // 2️⃣ Find ACTIVE_INACTIVE action
      const activeAction = schema.actions.find(
        (a) => a.slug === "active_inactive" && a.type === "ACTIVE_INACTIVE",
      );

      if (!activeAction?.form_details?.is_active_key) {
        return res.status(400).json({
          status: false,
          message: "Active/Inactive not supported for this form",
        });
      }

      const { is_active_key } = activeAction.form_details;
      const { updated_by_key } = activeAction;
      const loginUserId = req.user.user_id;

      transaction = await sequelize.transaction();

      // =====================================================
      // 3️⃣ UPDATE t_user_profile (DYNAMIC)
      // =====================================================
      const updateColumns = [`${is_active_key} = :is_active`];

      if (updated_by_key) {
        updateColumns.push(`${updated_by_key} = :updated_by`);
      }

      updateColumns.push(`tup_updated_at = CURRENT_TIMESTAMP`);

      const updateProfileSQL = `
      UPDATE ${table}
      SET ${updateColumns.join(", ")}
      WHERE ${primary_key} = :pk
      RETURNING tup_user_id
    `;

      const [profileRows] = await sequelize.query(updateProfileSQL, {
        replacements: {
          is_active,
          pk: primary_key_value, // tup_id
          updated_by: loginUserId,
        },
        transaction,
      });

      if (!profileRows.length) {
        throw new Error("User profile not found");
      }

      const userId = profileRows[0].tup_user_id; // ✅ REAL user_id

      // =====================================================
      // 4️⃣ UPDATE t_user (STATIC MODEL)
      // =====================================================
      await UserModel.update(
        {
          is_active,
          updated_by: loginUserId,
        },
        {
          where: {
            user_id: userId, // ✅ CORRECT
          },
          transaction,
        },
      );

      // =====================================================
      // 5️⃣ COMMIT
      // =====================================================
      await transaction.commit();

      return res.json({
        status: true,
        message: `${schema.title} ${
          is_active ? "activated" : "deactivated"
        } successfully`,
      });
    } catch (err) {
      if (transaction) await transaction.rollback();
      next(CustomErrorHandler.internalServerError(err.message));
    }
  },

  userResetPassword: async (req, res, next) => {
    let transaction;
    try {
      const { user_id } = req.body;
      if (req.user.role_slug !== "admin") {
        return res.status(400).json({ status: false, message: "Unauthorized" });
      }
      if (!user_id)
        return res
          .status(400)
          .json({ status: false, message: "User ID is required" });
      transaction = await sequelize.transaction();
      const user = await UserModel.findByPk(user_id, { transaction });

      user.password = "Default@123";
      user.updated_by = req.user.user_id;

      await user.save({ transaction });

      await transaction.commit();
      res.status(200).json({
        status: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  loginAs: async (req, res, next) => {
    try {
      const { user_id } = req.body;
      const user = await UserModel.findOne({ where: { user_id } });
      const roleDetails = await RoleModel.findOne({
        where: { rol_id: user.role_id },
        attributes: ["rol_name"],
      });
      const token = jwtUtils.generateToken({
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        role_slug: user.role_slug,
        role_name: roleDetails.rol_name,
        name: user.name,
        phone: user.phone,
        created_at: user.created_at,
      });
      await PersonalAccessTokenModel.create({
        tokenable_type: user.role_slug,
        tokenable_id: user.user_id,
        name: "access_token",
        token: token,
      });

      return res.status(200).json({
        status: true,
        message: "Login successful",
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          role_id: user.role_id,
          role_slug: user.role_slug,
        },
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
  changePassword: async (req, res, next) => {
    try {
      const userId = req.user?.user_id;
      const newPassword = req.body?.password;
      const currentPassword = req.body?.current_password;

      const user = await UserModel.findOne({ where: { user_id: userId } });
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          status: false,
          errors: {
            current_password: "The current password is incorrect",
          },
        });
      }

      user.password = newPassword;
      user.updated_by = userId;
      await user.save();

      return res.json({
        status: true,
        message: "Password updated successfully",
      });
    } catch (err) {
      return next(CustomErrorHandler.internalServerError(err));
    }
  },
};

module.exports = dynamicFormController;
