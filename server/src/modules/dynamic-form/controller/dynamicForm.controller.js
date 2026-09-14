const { sequelize } = require("../../../config/db.config");
const {
  saveUpdateAndPrepareDocumentMetadata,
  saveAndPrepareDocumentMetadata,
} = require("../../../helper/document.helper");
const ExcelJS = require("exceljs");
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
const {
  buildGeneralSelectQuery,
  getExcelExportSections,
  buildAddMoreExcelQuery,
  buildExcelSheet,
  buildSortableFieldMap,
} = require("../helper/generalListView.helper");
const {
  buildSelectQueryById,
  enrichMasterLabels,
} = require("../helper/formAllSectionData.helper");
const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const { executeRules, hasErrors } = require("../helper/ruleExecutor.helper");
const { resolveFilterColumn, getDbMasterConfig } = require("../helper/masterResolver");
const { decryptData, applyMasking } = require("../../../helper/encryption.helper");

async function processEncryptedFields(schema, data, mode = "view") {
  if (!schema || !schema.sections || !data) return data;

  const encryptedFields = {};
  for (const section of schema.sections || []) {
    for (const field of section.fields || []) {
      if (field?.db_field && field?.validation?.is_encrypted) {
        encryptedFields[field.db_field] = {
          is_encrypted: true,
          mask_type: field.validation.mask_type || "full",
        };
      }
    }
  }

  const fieldKeys = Object.keys(encryptedFields);
  if (fieldKeys.length === 0) return data;

  const processRow = async (row) => {
    if (!row || typeof row !== "object") return row;
    const updated = { ...row };
    for (const dbField of fieldKeys) {
      if (updated[dbField] !== undefined && updated[dbField] !== null) {
        const config = encryptedFields[dbField];
        if (mode === "edit") {
          updated[dbField] = await decryptData(updated[dbField]);
        } else {
          updated[dbField] = await applyMasking(updated[dbField], config.mask_type);
        }
      }
    }
    return updated;
  };

  if (Array.isArray(data)) {
    return await Promise.all(data.map(processRow));
  }
  return await processRow(data);
}

const buildActionTabWhereCondition = (tab, replacements, paramPrefix = "tab_cond") => {
  if (!tab || tab.id === "ALL" || tab.key === "ALL") return null;

  const conditions = Array.isArray(tab.conditions) && tab.conditions.length > 0
    ? tab.conditions
    : (tab.field ? [{ field: tab.field, operator: tab.operator || "equals", value: tab.value || "" }] : []);

  if (conditions.length === 0) return null;

  const condSqls = [];

  conditions.forEach((cond, idx) => {
    if (!cond || !cond.field) return;
    const cleanField = String(cond.field).replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanField) return;

    const op = (cond.operator || "equals").toLowerCase();
    const paramKey = `${paramPrefix}_${idx}`;
    const rawVal = cond.value;

    switch (op) {
      case "equals":
      case "=":
      case "eq":
        condSqls.push(`LOWER(CAST(r.${cleanField} AS text)) = LOWER(:${paramKey})`);
        replacements[paramKey] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
        break;

      case "not_equals":
      case "!=":
      case "neq":
        condSqls.push(`(r.${cleanField} IS NULL OR LOWER(CAST(r.${cleanField} AS text)) != LOWER(:${paramKey}))`);
        replacements[paramKey] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
        break;

      case "gt":
      case ">":
        condSqls.push(`CAST(r.${cleanField} AS numeric) > :${paramKey}`);
        replacements[paramKey] = Number(rawVal) || 0;
        break;

      case "gte":
      case ">=":
        condSqls.push(`CAST(r.${cleanField} AS numeric) >= :${paramKey}`);
        replacements[paramKey] = Number(rawVal) || 0;
        break;

      case "lt":
      case "<":
        condSqls.push(`CAST(r.${cleanField} AS numeric) < :${paramKey}`);
        replacements[paramKey] = Number(rawVal) || 0;
        break;

      case "lte":
      case "<=":
        condSqls.push(`CAST(r.${cleanField} AS numeric) <= :${paramKey}`);
        replacements[paramKey] = Number(rawVal) || 0;
        break;

      case "contains":
        condSqls.push(`CAST(r.${cleanField} AS text) ILIKE :${paramKey}`);
        replacements[paramKey] = `%${rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : ""}%`;
        break;

      case "is_not_empty":
        condSqls.push(`(r.${cleanField} IS NOT NULL AND CAST(r.${cleanField} AS text) != '')`);
        break;

      case "is_empty":
        condSqls.push(`(r.${cleanField} IS NULL OR CAST(r.${cleanField} AS text) = '')`);
        break;

      default:
        condSqls.push(`LOWER(CAST(r.${cleanField} AS text)) = LOWER(:${paramKey})`);
        replacements[paramKey] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
        break;
    }
  });

  if (condSqls.length === 0) return null;

  if (tab.match_type === "ANY") {
    return `(${condSqls.join(" OR ")})`;
  } else {
    return `(${condSqls.join(" AND ")})`;
  }
};

const getAllExecutableSections = (schema) => {
  const rootTable = schema?.root_entity?.table;
  const sections = [];

  for (const sec of schema?.sections || []) {
    if (sec.table && sec.table !== rootTable) {
      sections.push(sec);
    }
    for (const f of sec.fields || []) {
      if (
        (f.type === "add_more" || f.type === "repeater" || f.type === "table_grid") &&
        (f.storage_type === "table" || f.storage === "table")
      ) {
        const childTable = f.table_name || f.table || `t_${f.db_field || f.column_name}`;
        if (childTable !== rootTable && !sections.some((s) => s.table === childTable)) {
          sections.push({
            section_id: f.id || f.db_field,
            type: "add_more",
            table: childTable,
            primary_key: "id",
            relation: { parent_table: rootTable, foreign_key: "parent_id" },
            fields: f.fields || [],
          });
        }
      }
    }
  }
  return sections;
};

const dynamicFormController = {
  add: async (req, res, next) => {
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

      // Populate audit columns dynamically for any table (Configurator dynamic or static)
      const userId = req.user?.user_id || null;
      for (const [tblName, tblData] of Object.entries(segregated)) {
        if (!tblData || typeof tblData !== "object") continue;
        let setCreated = false;
        let setUpdated = false;
        for (const key of Object.keys(tblData)) {
          if (key.endsWith("_created_by") || key === "created_by") {
            tblData[key] = userId;
            setCreated = true;
          }
          if (key.endsWith("_updated_by") || key === "updated_by") {
            tblData[key] = userId;
            setUpdated = true;
          }
        }
        if (!setCreated) tblData.created_by = userId;
        if (!setUpdated) tblData.updated_by = userId;
      }
      const rootTable = schema?.root_entity?.table;
      const rootPKField = schema?.root_entity?.primary_key;

      if (!rootTable || !rootPKField) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema: Missing root entity configuration",
        });
      }

      // Inject parent_id & status into rootTable if provided
      const parentIdInput = req.body.parent_id || req.body.parent_primary_key_value;
      if (rootTable) {
        segregated[rootTable] = segregated[rootTable] || {};
        if (parentIdInput) {
          const parsedPId = parseInt(parentIdInput, 10);
          segregated[rootTable].parent_id = isNaN(parsedPId) ? parentIdInput : parsedPId;
        }
        if (req.body.status) {
          segregated[rootTable].status = req.body.status;
        }
      }

      // safety: PK should not exist in ADD
      if (segregated?.[rootTable]?.[rootPKField]) {
        return res.status(400).json({
          status: false,
          message: "Primary key should not be present while adding",
        });
      }

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
      const executableSections = getAllExecutableSections(schema);

      for (const section of executableSections) {
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

            // Delete client-side UUID key before insert if not a pure numeric DB ID
            if (row[section.primary_key] && (!/^\d+$/.test(String(row[section.primary_key]).trim()) || /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}/.test(String(row[section.primary_key])))) {
              delete row[section.primary_key];
            }
            ///*********************** */
            if (
              (section.table === "t_school_doc_type") &
              (Object.values(row || {}).length > 1)
            ) {
              row.tschdoc_created_by = req.user.user_id;
            }
            else if (
              (section.table === "t_training_inst_doc_type") &
              (Object.values(row || {}).length > 1)
            ) {
              row.ttidt_created_by = req.user.user_id;
            }
            else if (
              (section.table === "t_sdg_doc_type") &
              (Object.values(row || {}).length > 1)
            ) {
              row.tsdgdoc_created_by = req.user.user_id;
            }
            ///*********************** */
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
        if (!files || !files.length) continue;

        const parentId =
          parentTempId && pkMap[parentTempId] ? pkMap[parentTempId] : rootPK;

        // Group files by target field
        const filesByField = {};
        for (const file of files) {
          const fieldKey = file.__field || "document";
          filesByField[fieldKey] ||= [];
          filesByField[fieldKey].push(file);
        }

        for (const [fieldKey, fieldFiles] of Object.entries(filesByField)) {
          const fileField =
            section?.fields?.find(
              (f) => f.type === "file" && (f.db_field === fieldKey || f.id === fieldKey)
            ) || section?.fields?.find((f) => f.type === "file");

          const fileSchema = {
            table: "t_documents",
            upload_path: "project/dynamic_forms",
            multiple: false,
            primary_key: "tdoc_id",
            foreign_key: "final_doc_id",
            ...fileField?.file,
          };

          const uploadRelPath = fileSchema.upload_path || "project/dynamic_forms";
          const tableName = fileSchema.table || "t_documents";

          const result = fileSchema.multiple
            ? await saveAndPrepareDocumentMetadata(
                fieldFiles,
                parentId,
                `uploads/${uploadRelPath}`,
                req.user?.user_id || 0,
                transaction,
              )
            : await saveUpdateAndPrepareDocumentMetadata(
                fieldFiles,
                parentId,
                `uploads/${uploadRelPath}`,
                req.user?.user_id || 0,
                transaction,
              );

          if (result?.metadata?.length) {
            result.metadata.forEach((m, i) => {
              m.doc_purpose = fieldFiles[i].__field || fieldKey;
            });

            const cols = Object.keys(result.metadata[0]);
            const sql = `
            INSERT INTO "${tableName}"
            (${cols.map(c => `"${c}"`).join(", ")})
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
      }

      await transaction.commit();

      // ── Extract hook-injected extra__ fields from request ──────────────
      const extraFields = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        if (key.startsWith("extra__")) {
          const cleanKey = key.replace(/^extra__/, "");
          try { extraFields[cleanKey] = JSON.parse(value); } catch { extraFields[cleanKey] = value; }
        }
      }

      // ── Fire onAfterInsert backend hook (with extra fields available) ──
      const { triggerBackendHook } = require("../hooks/backendHookRegistry");
      await triggerBackendHook(req.body.form_slug, "onAfterInsert", {
        insertedId: rootPK,
        payload: segregated[rootTable],
        extraFields,           // <-- hook-injected fields from frontend
        req,
      });

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

      // Populate audit columns dynamically for any table (Configurator dynamic or static)
      const userId = req.user?.user_id || null;
      for (const [tblName, tblData] of Object.entries(segregated)) {
        if (!tblData || typeof tblData !== "object") continue;
        let setUpdatedBy = false;
        let setUpdatedAt = false;
        for (const key of Object.keys(tblData)) {
          if (key.endsWith("_updated_by") || key === "updated_by") {
            tblData[key] = userId;
            setUpdatedBy = true;
          }
          if (key.endsWith("_updated_at") || key === "updated_at") {
            tblData[key] = new Date();
            setUpdatedAt = true;
          }
        }
        if (!setUpdatedBy) tblData.updated_by = userId;
        if (!setUpdatedAt) tblData.updated_at = new Date();
      }

      const rootTable = schema?.root_entity?.table;
      const rootPKField = schema?.root_entity?.primary_key;

      if (rootTable) {
        segregated[rootTable] = segregated[rootTable] || {};
        if (req.body.status) {
          segregated[rootTable].status = req.body.status;
        }

        // The client sends the record's primary key as a top-level body field
        // (e.g. `id=2` or `payment_id=2`) because segregateData only processes
        // section-namespaced keys (sec000[field]).  Inject it here so the PK
        // lands in the segregated root table before the validation check below.
        if (!segregated[rootTable][rootPKField]) {
          const pkFromBody =
            req.body[rootPKField] ||
            req.body["id"] ||
            req.body["record_id"];
          if (pkFromBody) {
            const parsed = parseInt(pkFromBody, 10);
            segregated[rootTable][rootPKField] = isNaN(parsed) ? pkFromBody : parsed;
          }
        }
      }

      if (!segregated?.[rootTable]?.[rootPKField]) {
        return res.status(400).json({
          status: false,
          message: "Missing root primary key for edit",
        });
      }
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
      const executableSections = getAllExecutableSections(schema);

      for (const section of executableSections) {
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
          } else if (section.relation?.foreign_key) {
            const [existingRows] = await sequelize.query(
              `SELECT "${section.primary_key}" FROM "${section.table}" WHERE "${section.relation.foreign_key}" = :fk LIMIT 1`,
              { replacements: { fk: rootPK }, transaction }
            );
            if (existingRows && existingRows.length > 0) {
              const childPk = existingRows[0][section.primary_key];
              rows[section.primary_key] = childPk;
              await updateRow(
                section.table,
                rows,
                { [section.primary_key]: childPk },
                schemaCtx,
                transaction
              );
              pkMap[section.section_id] = childPk;
            } else {
              const inserted = await insertRow(
                section.table,
                rows,
                schemaCtx,
                transaction
              );
              if (inserted && inserted[section.primary_key]) {
                pkMap[section.section_id] = inserted[section.primary_key];
              }
            }
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
              ///*********************** */
              if (
                section.table === "t_school_doc_type" &&
                Object.values(row || {}).length > 1
              ) {
                row.tschdoc_updated_by = req.user.user_id;
                row.tschdoc_updated_at = new Date();
              }
              else if(
                section.table === "t_training_inst_doc_type" &&
                Object.values(row || {}).length > 1
              ) {
                row.ttidt_updated_by = req.user.user_id;
                row.ttidt_updated_at = new Date();
              }
              else if(
                section.table === "t_sdg_doc_type" &&
                Object.values(row || {}).length > 1
              ) {
                row.tsdgdoc_updated_by = req.user.user_id;
                row.tsdgdoc_updated_at = new Date();
              }
              ///*********************** */
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

              ///*********************** */
              if (
                (section.table === "t_school_doc_type") &
                (Object.values(row || {}).length > 1)
              ) {
                row.tschdoc_created_by = req.user.user_id;
              }
              else if(
                (section.table === "t_training_inst_doc_type") &
                (Object.values(row || {}).length > 1)
              ) {
                row.ttidt_created_by = req.user.user_id;
              }
              else if(
                (section.table === "t_sdg_doc_type") &
                (Object.values(row || {}).length > 1)
              ) {
                row.tsdgdoc_created_by = req.user.user_id;
              }
              
              ///*********************** */
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
        if (!files || !files.length) continue;

        const parentId =
          parentTempId && pkMap[parentTempId] ? pkMap[parentTempId] : rootPK;

        // Group files by target field
        const filesByField = {};
        for (const file of files) {
          const fieldKey = file.__field || "document";
          filesByField[fieldKey] ||= [];
          filesByField[fieldKey].push(file);
        }

        for (const [fieldKey, fieldFiles] of Object.entries(filesByField)) {
          const fileField =
            section?.fields?.find(
              (f) => f.type === "file" && (f.db_field === fieldKey || f.id === fieldKey)
            ) || section?.fields?.find((f) => f.type === "file");

          const fileSchema = {
            table: "t_documents",
            upload_path: "project/dynamic_forms",
            multiple: false,
            primary_key: "tdoc_id",
            foreign_key: "final_doc_id",
            ...fileField?.file,
          };

          const uploadRelPath = fileSchema.upload_path || "project/dynamic_forms";
          const tableName = fileSchema.table || "t_documents";

          const result = fileSchema.multiple
            ? await saveAndPrepareDocumentMetadata(
                fieldFiles,
                parentId,
                `uploads/${uploadRelPath}`,
                req.user?.user_id || 0,
                transaction,
              )
            : await saveUpdateAndPrepareDocumentMetadata(
                fieldFiles,
                parentId,
                `uploads/${uploadRelPath}`,
                req.user?.user_id || 0,
                transaction,
              );

          if (result?.metadata?.length) {
            result.metadata.forEach((m, i) => {
              m.doc_purpose = fieldFiles[i].__field || fieldKey;
            });

            const cols = Object.keys(result.metadata[0]);
            const sql = `
            INSERT INTO "${tableName}"
            (${cols.map(c => `"${c}"`).join(", ")})
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
      }

      await transaction.commit();

      // ── Extract hook-injected extra__ fields from request ──────────────
      const extraFields = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        if (key.startsWith("extra__")) {
          const cleanKey = key.replace(/^extra__/, "");
          try { extraFields[cleanKey] = JSON.parse(value); } catch { extraFields[cleanKey] = value; }
        }
      }

      // ── Fire onAfterUpdate backend hook (with extra fields available) ──
      const { triggerBackendHook } = require("../hooks/backendHookRegistry");
      await triggerBackendHook(req.body.form_slug, "onAfterUpdate", {
        updatedId: rootPK,
        payload: segregated[rootTable],
        extraFields,
        req,
      });

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

  viewListView: async (req, res, next) => {
    try {
      const {
        filters = {},
        search,
        page = 1,
        pageSize = 100,
        sort,
        form_slug,
        parent_id,
        parent_primary_key_value,
        action_tab_id,
        action_tab,
      } = req.body;

      if (!form_slug) {
        return res.status(400).json({
          status: false,
          message: "form_slug is required",
        });
      }

      // Fetch schema
      const schema = await getFormWithSection({ form_slug });
      if (!schema) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema",
        });
      }

      // Determine checked columns from schema.table_columns
      let checkedColumnKeys = [];
      if (Array.isArray(schema.table_columns) && schema.table_columns.length > 0) {
        checkedColumnKeys = schema.table_columns
          .filter((c) => c.checked !== false)
          .map((c) => c.key || c.dataIndex || c.db_field)
          .filter(Boolean);
      }

      // Determine view name
      const defaultView = schema.view_name || schema.database_view_name || `v_${form_slug}`;
      const rootTable = schema.root_entity?.table || `t_frm_${form_slug}`;
      const rootPK = schema.root_entity?.primary_key || "id";

      // Verify if view exists in PostgreSQL information_schema, fallback to base table if view missing
      let targetSource = defaultView;
      const viewCheck = await sequelize.query(
        `SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name = :vName LIMIT 1`,
        { replacements: { vName: defaultView }, type: sequelize.QueryTypes.SELECT }
      );
      if (!viewCheck.length) {
        targetSource = rootTable;
      }

      // Query actual existing columns in the target view/table from information_schema
      const existingColRows = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :tblName`,
        { replacements: { tblName: targetSource }, type: sequelize.QueryTypes.SELECT }
      );
      const existingColSet = new Set(existingColRows.map((r) => r.column_name));

      // Build clean SQL selecting ONLY valid existing columns
      let selectClause = ["r.*"];
      if (checkedColumnKeys.length > 0 && existingColSet.size > 0) {
        const validChecked = checkedColumnKeys.filter((col) => existingColSet.has(col));
        const uniqueCols = Array.from(new Set([
          existingColSet.has(rootPK) ? rootPK : null,
          ...validChecked,
        ].filter(Boolean)));

        if (uniqueCols.length > 0) {
          selectClause = uniqueCols.map((col) => `r."${col.replace(/"/g, '""')}"`);
        }
      }

      const baseSql = `SELECT\n  ${selectClause.join(",\n  ")}\nFROM public."${targetSource.replace(/"/g, '""')}" r`;

      // WHERE filters + search
      const where = [];
      const replacements = {};

      const effectiveParentId = parent_id || parent_primary_key_value;
      if (effectiveParentId && filters.parent_id === undefined) {
        const parsedParentId = parseInt(effectiveParentId, 10);
        filters.parent_id = isNaN(parsedParentId) ? effectiveParentId : parsedParentId;
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "" && (existingColSet.size === 0 || existingColSet.has(key))) {
          where.push(`CAST(r."${key.replace(/"/g, '""')}" AS text) = CAST(:${key} AS text)`);
          replacements[key] = String(value);
        }
      });

      // Search keyword filter across string columns if provided
      if (search && String(search).trim()) {
        const term = `%${String(search).trim().toLowerCase()}%`;
        replacements.search_term = term;
        const validSearchCols = (checkedColumnKeys.length > 0 ? checkedColumnKeys : Array.from(existingColSet))
          .filter((c) => existingColSet.size === 0 || existingColSet.has(c));
        const searchConditions = validSearchCols.map((c) => `LOWER(CAST(r."${c.replace(/"/g, '""')}" AS text)) LIKE :search_term`);
        if (searchConditions.length > 0) {
          where.push(`(${searchConditions.join(" OR ")})`);
        }
      }

      // Copy base WHERE clauses before Action Tabs
      const baseWhere = [...where];
      const baseReplacements = { ...replacements };

      // Action Tabs filter
      let selectedActionTab = null;
      if (action_tab && typeof action_tab === "object" && action_tab.id !== "ALL" && action_tab.key !== "ALL") {
        selectedActionTab = action_tab;
      } else if (action_tab_id && action_tab_id !== "ALL" && schema?.enable_action_tabs && Array.isArray(schema?.action_tabs)) {
        selectedActionTab = schema.action_tabs.find((t, idx) => (t.id || `tab_${idx}`) === action_tab_id);
      }

      if (selectedActionTab) {
        const tabCondSql = buildActionTabWhereCondition(selectedActionTab, replacements, "act_tab");
        if (tabCondSql) {
          where.push(tabCondSql);
        }
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      // ORDER BY (ensuring sort column exists on view)
      const sortField = (sort?.field && (existingColSet.size === 0 || existingColSet.has(sort.field)))
        ? sort.field
        : (existingColSet.has(rootPK) ? rootPK : (existingColRows[0]?.column_name || "1"));
      const sortOrder = (sort?.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
      const orderBy = `ORDER BY r."${sortField.replace(/"/g, '""')}" ${sortOrder}`;

      // PAGINATION
      const limit = parseInt(pageSize, 10) || 100;
      const offset = ((parseInt(page, 10) || 1) - 1) * limit;

      // FINAL SQL
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

      // TOTAL COUNT
      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM public."${targetSource.replace(/"/g, '""')}" r
        ${whereSql}
      `;

      const countResult = await sequelize.query(countSql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      const total = countResult[0]?.total || 0;

      // TAB COUNTS
      let tab_counts = {};
      if (schema?.enable_action_tabs && Array.isArray(schema?.action_tabs) && schema.action_tabs.length > 0) {
        const baseWhereSql = baseWhere.length ? `WHERE ${baseWhere.join(" AND ")}` : "";
        const countSelects = [`COUNT(*)::int AS count_all`];
        const countReplacements = { ...baseReplacements };

        schema.action_tabs.forEach((t, idx) => {
          const tCondSql = buildActionTabWhereCondition(t, countReplacements, `tab_cnt_${idx}`);
          if (tCondSql) {
            countSelects.push(`COUNT(CASE WHEN ${tCondSql} THEN 1 END)::int AS count_tab_${idx}`);
          } else {
            countSelects.push(`COUNT(*)::int AS count_all_${idx}`);
          }
        });

        const aggCountSql = `
          SELECT ${countSelects.join(", ")}
          FROM public."${targetSource.replace(/"/g, '""')}" r
          ${baseWhereSql}
        `;

        try {
          const aggRes = await sequelize.query(aggCountSql, {
            replacements: countReplacements,
            type: sequelize.QueryTypes.SELECT,
          });
          if (aggRes && aggRes[0]) {
            tab_counts["ALL"] = aggRes[0].count_all || 0;
            schema.action_tabs.forEach((t, idx) => {
              const key = t.id || `tab_${idx}`;
              tab_counts[key] = aggRes[0][`count_tab_${idx}`] !== undefined ? aggRes[0][`count_tab_${idx}`] : (aggRes[0].count_all || 0);
            });
          }
        } catch (cntErr) {
          console.error("Failed to compute tab_counts in viewListView:", cntErr.message);
        }
      }

      const processedData = await processEncryptedFields(schema, data, "view");
      return res.json({
        status: true,
        source: "database_view",
        view_name: targetSource,
        schema: schema,
        columns: existingColRows.map((r) => ({
          key: r.column_name,
          label: r.column_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        })),
        data: processedData,
        total,
        tab_counts,
      });
    } catch (err) {
      console.error("[viewListView] Error:", err.message);
      return res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  },

  generalListView: async (req, res, next) => {
    try {
      const {
        filters = {},
        search,
        page = 1,
        pageSize = 100,
        sort,
        form_slug,
        parent_id,
        parent_primary_key_value,
        action_tab_id,
        action_tab,
      } = req.body;

      const effectiveParentId = parent_id || parent_primary_key_value;
      if (effectiveParentId && filters.parent_id === undefined) {
        const parsedParentId = parseInt(effectiveParentId, 10);
        filters.parent_id = isNaN(parsedParentId) ? effectiveParentId : parsedParentId;
      }

      // fetching schema
      const schema = await getFormWithSection({
        form_slug: form_slug,
      });

      if (!schema) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema",
        });
      }
      /* ===============================
         1. BASE SQL (DO NOT TOUCH)
      =============================== */

      const baseSql = buildGeneralSelectQuery(schema, search);

      /* ===============================
         2. WHERE (filters + search)
      =============================== */
      const where = [];
      const replacements = {};

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          where.push(`CAST(r.${key} AS text) = CAST(:${key} AS text)`);
          replacements[key] = String(value);
        }
      });

      // Role-Based Targeted Scoping for NGOs on RFP Forms
      const userRole = (req.user?.role_slug || req.user?.role || "").toLowerCase();
      if ((form_slug === "request_for_proposal" || form_slug === "rfp_proposal_submission") && userRole === "ngo") {
        const userId = req.user?.id || 0;
        const cleanEmail = (req.user?.email || "").trim().toLowerCase();
        where.push(`(r.floated_ngos @> jsonb_build_array(:ngoUserId::int) OR r.floated_ngos @> jsonb_build_array(:ngoEmail::text))`);
        replacements.ngoUserId = userId;
        replacements.ngoEmail = cleanEmail;
      }

      // Copy base WHERE clauses and replacements before applying active Action Tab filter
      const baseWhere = [...where];
      const baseReplacements = { ...replacements };

      // Resolve selected Action Tab and apply SQL condition
      let selectedActionTab = null;
      if (action_tab && typeof action_tab === "object" && action_tab.id !== "ALL" && action_tab.key !== "ALL") {
        selectedActionTab = action_tab;
      } else if (action_tab_id && action_tab_id !== "ALL" && schema?.enable_action_tabs && Array.isArray(schema?.action_tabs)) {
        selectedActionTab = schema.action_tabs.find((t, idx) => (t.id || `tab_${idx}`) === action_tab_id);
      }

      if (selectedActionTab) {
        const tabCondSql = buildActionTabWhereCondition(selectedActionTab, replacements, "act_tab");
        if (tabCondSql) {
          where.push(tabCondSql);
        }
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      /* ===============================
         3. ORDER BY
      =============================== */
      const rootPK = schema.root_entity.primary_key;
      const sortableFieldMap = buildSortableFieldMap(schema);

      const orderBy =
        sort?.field && sortableFieldMap[sort.field]
          ? `ORDER BY ${sortableFieldMap[sort.field]} ${
              sort.order === "asc" ? "ASC" : "DESC"
            }`
          : `ORDER BY r.${rootPK} DESC`;

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
         6. TOTAL COUNT FOR SELECTED TAB
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
         7. SERVER-SIDE ACTION TAB COUNTS
      =============================== */
      let tab_counts = {};
      if (schema?.enable_action_tabs && Array.isArray(schema?.action_tabs) && schema.action_tabs.length > 0) {
        const baseWhereSql = baseWhere.length ? `WHERE ${baseWhere.join(" AND ")}` : "";
        const countSelects = [`COUNT(*)::int AS count_all`];
        const countReplacements = { ...baseReplacements };

        schema.action_tabs.forEach((t, idx) => {
          const tCondSql = buildActionTabWhereCondition(t, countReplacements, `tab_cnt_${idx}`);
          if (tCondSql) {
            countSelects.push(`COUNT(CASE WHEN ${tCondSql} THEN 1 END)::int AS count_tab_${idx}`);
          } else {
            countSelects.push(`COUNT(*)::int AS count_all_${idx}`);
          }
        });

        const aggCountSql = `
          SELECT ${countSelects.join(", ")}
          FROM (
            ${baseSql}
            ${baseWhereSql}
          ) AS count_table
        `;

        try {
          const aggRes = await sequelize.query(aggCountSql, {
            replacements: countReplacements,
            type: sequelize.QueryTypes.SELECT,
          });
          if (aggRes && aggRes[0]) {
            tab_counts["ALL"] = aggRes[0].count_all || 0;
            schema.action_tabs.forEach((t, idx) => {
              const key = t.id || `tab_${idx}`;
              tab_counts[key] = aggRes[0][`count_tab_${idx}`] !== undefined ? aggRes[0][`count_tab_${idx}`] : (aggRes[0].count_all || 0);
            });
          }
        } catch (cntErr) {
          console.error("Failed to compute tab_counts server-side:", cntErr.message);
        }
      }

      /* ===============================
         8. RESPONSE
      =============================== */
      const processedData = await processEncryptedFields(schema, data, "view");
      res.json({
        status: true,
        schema: schema,
        data: processedData,
        total,
        tab_counts,
        page,
        pageSize,
      });
    } catch (err) {
      next(err);
    }
  },

  // generalListView: async (req, res, next) => {
  //   try {
  //     const {
  //       filters = {},
  //       search,
  //       page = 1,
  //       pageSize = 100,
  //       sort,
  //       form_slug,
  //       type = "tree", // flat | with_parent | with_children | tree
  //       id,
  //     } = req.body;

  //     /* ===============================
  //      1. FETCH BASE SCHEMA
  //   =============================== */
  //     let schema = await getFormWithSectionForList({
  //       form_slug,
  //       section_type: "general",
  //     });

  //     if (!schema) {
  //       return res.status(400).json({
  //         status: false,
  //         message: "Invalid form schema",
  //       });
  //     }

  //     /* ===============================
  //      2. DECORATE SCHEMA (CRITICAL)
  //   =============================== */
  //     schema = await decorateSchemaForFetchType(schema, type);

  //     /* ===============================
  //      3. BASE SQL
  //   =============================== */
  //     const baseSql = buildGeneralSelectQuery(schema, search);

  //     /* ===============================
  //      4. WHERE
  //   =============================== */
  //     const where = [];
  //     const replacements = {};

  //     Object.entries(filters).forEach(([key, value]) => {
  //       if (value !== null && value !== undefined && value !== "") {
  //         where.push(`r.${key} = :${key}`);
  //         replacements[key] = value;
  //       }
  //     });

  //     if (id) {
  //       where.push(`r.${schema.root_entity.primary_key} = :id`);
  //       replacements.id = id;
  //     }

  //     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  //     /* ===============================
  //      5. ORDER BY
  //   =============================== */
  //     const rootPK = schema.root_entity.primary_key;
  //     const sortableFieldMap = buildSortableFieldMap(schema);

  //     const orderBy =
  //       sort?.field && sortableFieldMap[sort.field]
  //         ? `ORDER BY ${sortableFieldMap[sort.field]} ${
  //             sort.order === "asc" ? "ASC" : "DESC"
  //           }`
  //         : `ORDER BY r.${rootPK} DESC`;

  //     /* ===============================
  //      6. PAGINATION
  //   =============================== */
  //     const limit = pageSize;
  //     const offset = (page - 1) * pageSize;

  //     /* ===============================
  //      7. FINAL SQL
  //   =============================== */
  //     const finalSql = `
  //     ${baseSql}
  //     ${whereSql}
  //     ${orderBy}
  //     LIMIT ${limit} OFFSET ${offset}
  //   `;

  //     const data = await sequelize.query(finalSql, {
  //       replacements,
  //       type: sequelize.QueryTypes.SELECT,
  //     });

  //     /* ===============================
  //      8. COUNT
  //   =============================== */
  //     const countSql = `
  //     SELECT COUNT(*)::int AS total
  //     FROM (
  //       ${baseSql}
  //       ${whereSql}
  //     ) count_table
  //   `;

  //     const countResult = await sequelize.query(countSql, {
  //       replacements,
  //       type: sequelize.QueryTypes.SELECT,
  //     });

  //     const total = countResult[0]?.total || 0;

  //     /* ===============================
  //      9. RESPONSE
  //   =============================== */
  //     res.json({
  //       status: true,
  //       schema,
  //       data: id ? data[0] || null : data,
  //       total,
  //       page,
  //       pageSize,
  //     });
  //   } catch (err) {
  //     console.log(err);

  //     next(err);
  //   }
  // },

  generalExcelExport: async (req, res, next) => {
    const { form_slug, status } = req.body;

    try {
      // fetching schema
      const schema = await getFormWithSection({
        form_slug: form_slug,
        section_type: "general",
      });

      if (!schema) {
        return res.status(400).json({
          status: false,
          message: "Invalid form schema",
        });
      }
      const workbook = new ExcelJS.Workbook();

      // 1️⃣ Get Excel export instructions
      const exportSections = getExcelExportSections(schema);

      for (const exportSection of exportSections) {
        let rows = [];

        // 2️⃣ GENERAL → reuse existing query
        if (exportSection.type === "general") {
          const sql = `
             ${buildGeneralSelectQuery(schema, null, status)}
             ORDER BY r.${schema.root_entity.primary_key} DESC
           `;

          rows = await sequelize.query(sql, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { status },
          });
        }

        // 3️⃣ ADD_MORE → separate query
        if (exportSection.type === "add_more") {
          const section = exportSection.sections[0];
          const sql = buildAddMoreExcelQuery(section, schema);

          rows = await sequelize.query(sql, {
            type: sequelize.QueryTypes.SELECT,
          });
        }

        // 4️⃣ Build Excel sheet
        buildExcelSheet(
          workbook,
          exportSection.sheetName,
          exportSection.sections,
          rows,
          exportSection.type === "add_more",
          schema,
        );
      }

      // 5️⃣ Send file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=project_list.xlsx",
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  },

  details: async (req, res, next) => {
    try {
      const { selected_data, form_slug } = req.body;
      const schema = await getFormWithSection({
        form_slug: form_slug,
      });
      if (!schema) {
        return res.status(200).json({
          success: true,
        });
      }
      const { sql, replacements } = buildSelectQueryById({
        schema,
        selected_data,
      });

      const [result] = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
      if (result) {
        await enrichMasterLabels(schema, result);
      }
      const processedResult = await processEncryptedFields(schema, result, "edit");
      res.status(200).json({
        success: true,
        data: processedResult,
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

    let config = null;

    // 1. Try t_form lookup FIRST (so user-created Form Builder forms take priority)
    try {
      const [forms] = await sequelize.query(
        `SELECT f.form_id, f.title, f.slug, COALESCE(f.root_entity->>'table', CONCAT('t_frm_', f.slug)) AS table_name,
                s.primary_key, s.fields
         FROM t_form f
         LEFT JOIN t_section s ON s.section_form_id = f.form_id AND s.type = 'general' AND s.is_active = TRUE
         WHERE (f.slug = :master OR f.root_entity->>'table' = :master OR CONCAT('t_frm_', f.slug) = :master OR f.title ILIKE :master)
           AND f.deleted_at IS NULL
         LIMIT 1`,
        { replacements: { master } }
      );

      console.log(forms);

      if (forms.length > 0) {
        const f = forms[0];
        let labelKey = "name";
        let fieldsArray = f.fields;

        console.log(fieldsArray);

        if (typeof fieldsArray === "string") {
          try { fieldsArray = JSON.parse(fieldsArray); } catch {}
        }
        if (Array.isArray(fieldsArray)) {
          const isFkOrIdCol = (field) => {
            const col = (field?.db_field || "").toLowerCase();
            const pk = (f.primary_key || "id").toLowerCase();
            if (!col || col === pk || col === "id" || col.endsWith("_id") || col.endsWith("_pk")) return true;
            if (field.data_source || field.type === "select" || field.type === "multiselect") return true;
            return false;
          };

          const nameField = fieldsArray.find(
            (field) => !isFkOrIdCol(field) && (
              field.db_field.toLowerCase().includes("name") ||
              field.db_field.toLowerCase().includes("title") ||
              field.db_field.toLowerCase().includes("label") ||
              (field.label && typeof field.label === "string" && field.label.toLowerCase().includes("name"))
            )
          );

          const textField = fieldsArray.find(
            (field) => !isFkOrIdCol(field) && (field.type === "text" || field.type === "textarea" || field.type === "string")
          );

          const nonIdField = fieldsArray.find((field) => !isFkOrIdCol(field));

          if (nameField?.db_field) labelKey = nameField.db_field;
          else if (textField?.db_field) labelKey = textField.db_field;
          else if (nonIdField?.db_field) labelKey = nonIdField.db_field;
          else if (fieldsArray[0]?.db_field) labelKey = fieldsArray[0].db_field;
        }
        config = {
          type: "master",
          table_name: f.table_name,
          primary_key: f.primary_key || "id",
          label_key: labelKey,
        };
      }
    } catch (e) {
      console.warn("Error looking up t_form for master:", e.message);
    }

    // 2. Try dynamic database configuration lookup
    if (!config) {
      config = await getDbMasterConfig(master);
    }

    // 3. Fallback: information_schema
    if (!config) {
      try {
        const [tables] = await sequelize.query(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name IN (:t1, :t2, :t3)
           LIMIT 1`,
          { replacements: { t1: master, t2: `t_frm_${master}`, t3: `t_${master}` } }
        );
        if (tables.length > 0) {
          const tableName = tables[0].table_name;
          const [cols] = await sequelize.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = :tableName`,
            { replacements: { tableName } }
          );
          const colNames = cols.map((c) => c.column_name);

          const pk = colNames.find((c) => c === "id" || c.endsWith("_id") || c.endsWith("_pk")) || colNames[0] || "id";
          const label = colNames.find(
            (c) => c !== pk && !c.endsWith("_id") && !c.endsWith("_pk") && (c.endsWith("_name") || c.endsWith("_code") || c.endsWith("_title") || c === "name" || c.includes("name") || c.includes("title"))
          ) || colNames.find((c) => c !== pk && !c.endsWith("_id") && !c.endsWith("_pk")) || "name";
          config = {
            type: "master",
            table_name: tableName,
            primary_key: pk,
            label_key: label,
          };
        }
      } catch (e) {
        console.warn("Error looking up information_schema for master:", e.message);
      }
    }

    // Safety check: Ensure label_key is not an ID/PK field if a better display column exists in the table
    if (config && (config.label_key === config.primary_key || config.label_key === "id" || config.label_key.endsWith("_id") || config.label_key.endsWith("_pk"))) {
      try {
        const [cols] = await sequelize.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :tableName`,
          { replacements: { tableName: config.table_name } }
        );
        const colNames = cols.map((c) => c.column_name);
        if (colNames.length > 0) {
          const betterLabel = colNames.find(
            (c) =>
              c !== config.primary_key &&
              !c.endsWith("_id") &&
              !c.endsWith("_pk") &&
              (c.endsWith("_name") || c.endsWith("_title") || c.endsWith("_code") || c === "name" || c.includes("name") || c.includes("title") || c.includes("label"))
          ) || colNames.find(
            (c) => c !== config.primary_key && !c.endsWith("_id") && !c.endsWith("_pk")
          );

          if (betterLabel) {
            config.label_key = betterLabel;
          }
        }
      } catch (e) {
        console.warn("Error verifying label_key column safety:", e.message);
      }
    }

    if (!config) {
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

    if (config?.is_active_key) {
      whereClause += ` AND ${config.is_active_key} = true`;
    }

    const filterPromises = Object.entries(filters).map(async ([key, value]) => {
      if (value === null || value === undefined || value === "") return;

      const filterCol = await resolveFilterColumn(table_name, key, master);
      whereClause += ` AND CAST(${filterCol} AS TEXT) = :filter_${key}`;
      replacements[`filter_${key}`] = String(value);
    });
    await Promise.all(filterPromises);

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

        console.log(sql);

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
      console.warn(`[masterDetails] Query failed for master "${master}":`, err.message);
      return res.json({
        success: true,
        master,
        count: 0,
        data: [],
      });
    }
  },
  viewById: async (req, res, next) => {
    try {
      const { selected_data, form_slug } = req.body;

      if (!form_slug) {
        return res.status(400).json({
          success: false,
          message: "form_slug is required",
        });
      }

      const schema = await getFormWithSection({
        form_slug,
      });

      if (!schema || !schema.root_entity || !schema.sections) {
        return res.status(404).json({
          success: false,
          message: `Form schema not found for slug '${form_slug}'`,
        });
      }

      let effectiveSelectedData =
        typeof selected_data === "object" && selected_data !== null
          ? { ...selected_data }
          : { id: selected_data };

      const rootTable = schema.root_entity.table;
      const rootPK = schema.root_entity.primary_key || "id";
      const rawTargetId = effectiveSelectedData[rootPK] ?? effectiveSelectedData.id;
      const isInvalidId = !rawTargetId || isNaN(Number(rawTargetId));

      if (effectiveSelectedData.always_last_row || isInvalidId) {
        try {
          const colRows = await sequelize.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = :tbl AND table_schema = 'public'`,
            { replacements: { tbl: rootTable }, type: sequelize.QueryTypes.SELECT }
          );
          const colSet = new Set((colRows || []).map((r) => r.column_name.toLowerCase()));

          const whereFilters = [];
          const filterReplacements = {};

          const partnerVal = effectiveSelectedData.partner_id || effectiveSelectedData.parent_id;
          const userVal = effectiveSelectedData.user_id || effectiveSelectedData.created_by;

          if (partnerVal && (colSet.has("partner_id") || colSet.has("parent_id") || colSet.has("parent_primary_key_value"))) {
            const matchCol = colSet.has("partner_id") ? "partner_id" : colSet.has("parent_id") ? "parent_id" : "parent_primary_key_value";
            whereFilters.push(`CAST(${matchCol} AS TEXT) = :filterPartner`);
            filterReplacements.filterPartner = String(partnerVal);
          } else if (userVal && (colSet.has("user_id") || colSet.has("created_by"))) {
            const matchCol = colSet.has("user_id") ? "user_id" : "created_by";
            whereFilters.push(`CAST(${matchCol} AS TEXT) = :filterUser`);
            filterReplacements.filterUser = String(userVal);
          }

          if (colSet.has("deleted_at")) {
            whereFilters.push(`deleted_at IS NULL`);
          }

          const whereSql = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";
          const [lastRow] = await sequelize.query(
            `SELECT ${rootPK} FROM ${rootTable} ${whereSql} ORDER BY ${rootPK} DESC LIMIT 1`,
            { replacements: filterReplacements, type: sequelize.QueryTypes.SELECT }
          );

          if (lastRow && lastRow[rootPK]) {
            effectiveSelectedData[rootPK] = lastRow[rootPK];
            effectiveSelectedData.id = lastRow[rootPK];
          }
        } catch (findErr) {
          console.error("Error resolving last row in viewById:", findErr.message);
        }
      }

      const { sql, replacements } = buildSelectQueryById({
        schema,
        selected_data: effectiveSelectedData,
      });

      const [result] = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      if (result) {
        await enrichMasterLabels(schema, result);
      }

      const processedResult = await processEncryptedFields(schema, result, "view");

      // ── Auto-resolve parent_id if missing and schema has parent_form_id ──
      if (processedResult && schema?.parent_form_id && !processedResult.parent_id) {
        try {
          const parentFormRows = await sequelize.query(
            `SELECT form_id, slug, root_entity FROM t_form WHERE form_id = :parent_form_id AND deleted_at IS NULL LIMIT 1`,
            {
              replacements: { parent_form_id: schema.parent_form_id },
              type: sequelize.QueryTypes.SELECT,
            }
          );
          const parentForm = parentFormRows?.[0] || null;
          if (parentForm) {
            const rootEntity =
              typeof parentForm.root_entity === "string"
                ? JSON.parse(parentForm.root_entity || "{}")
                : parentForm.root_entity || {};
            const parentTable = rootEntity.table || `t_frm_${parentForm.slug}`;
            const parentPK = rootEntity.primary_key || "id";
            const targetUser = processedResult.created_by || processedResult.user_id || req.user?.user_id;

            if (targetUser) {
              const rows = await sequelize.query(
                `SELECT ${parentPK} FROM "${parentTable}" WHERE user_id = :targetUser OR created_by = :targetUser ORDER BY ${parentPK} DESC LIMIT 1`,
                {
                  replacements: { targetUser },
                  type: sequelize.QueryTypes.SELECT,
                }
              ).catch(() => []);

              const pRow = rows?.[0] || null;
              if (pRow && pRow[parentPK]) {
                processedResult.parent_id = pRow[parentPK];

                // Persist parent_id to child root table if column exists and empty
                const rootTable = schema.root_entity?.table;
                const rootPK = schema.root_entity?.primary_key || "id";
                if (rootTable && processedResult[rootPK]) {
                  await sequelize.query(
                    `UPDATE "${rootTable}" SET parent_id = :pId WHERE "${rootPK}" = :childId AND (parent_id IS NULL OR parent_id = 0)`,
                    {
                      replacements: { pId: pRow[parentPK], childId: processedResult[rootPK] },
                    }
                  ).catch(() => {});
                }
              }
            }
          }
        } catch (pErr) {
          console.error("[viewById] Error auto-resolving parent_id:", pErr.message);
        }
      }

      res.status(200).json({
        success: true,
        data: processedResult,
        schema: schema,
      });
    } catch (err) {
      next(err);
    }
  },

  //   activeInactive: async (req, res, next) => {
  //   let transaction;
  //   try {
  //     const {
  //       form_slug,
  //       primary_key_value,
  //       is_active,
  //     } = req.body;

  //     if (!form_slug || primary_key_value === undefined) {
  //       return res.status(400).json({
  //         status: false,
  //         message: "Invalid request payload",
  //       });
  //     }

  //     // Fetch schema
  //     const schema = await getFormWithSection({ form_slug });
  //     console.log("schema---- ",schema);
  //     return
  //     if (!schema?.root_entity) {
  //       return res.status(400).json({
  //         status: false,
  //         message: "Invalid form schema",
  //       });
  //     }

  //     const {
  //       table,
  //       primary_key,
  //       is_active_key,
  //       updated_by_key,
  //       // updated_at_key,
  //     } = schema.root_entity;

  //     // if (!is_active_key) {
  //     //   return res.status(400).json({
  //     //     status: false,
  //     //     message: "Active/Inactive not supported for this form",
  //     //   });
  //     // }

  //     transaction = await sequelize.transaction();

  //     await sequelize.query(
  //       `
  //       UPDATE ${table}
  //       SET
  //         ${is_active_key} = :is_active
  //         ${updated_by_key ? `, ${updated_by_key} = :user_id` : ""}
  //         WHERE ${primary_key} = :pk
  //         `,
  //         // ${updated_at_key ? `, ${updated_at_key} = NOW()` : ""}
  //       {
  //         replacements: {
  //           is_active,
  //           pk: primary_key_value,
  //           user_id: req.user.user_id,
  //         },
  //         transaction,
  //       }
  //     );

  //     await transaction.commit();

  //     res.json({
  //       status: true,
  //       message: `${schema.title} ${
  //         is_active ? "activated" : "deactivated"
  //       } successfully`,
  //     });
  //   } catch (err) {
  //     if (transaction) await transaction.rollback();
  //     next(CustomErrorHandler.internalServerError(err.message));
  //   }
  // }

  activeInactive: async (req, res, next) => {
    let transaction;
    try {
      const { form_slug, primary_key_value, is_active } = req.body;

      if (!form_slug || primary_key_value === undefined) {
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
      const { updated_by_key } = activeAction; // ✅ FROM ACTION
      const userId = req.user.user_id; // ✅ FROM AUTH

      transaction = await sequelize.transaction();

      // 3️⃣ Build dynamic UPDATE parts
      const updateColumns = [`${is_active_key} = :is_active`];

      if (updated_by_key) {
        updateColumns.push(`${updated_by_key} = :user_id`);
      }

      const updateSQL = `
      UPDATE ${table}
      SET ${updateColumns.join(", ")}
      WHERE ${primary_key} = :pk
    `;

      // 4️⃣ Execute update
      await sequelize.query(updateSQL, {
        replacements: {
          is_active,
          pk: primary_key_value,
          user_id: userId,
        },
        transaction,
      });

      await transaction.commit();

      res.json({
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
  parentRecord: async (req, res, next) => {
    try {
      const { form_slug, parent_id, user_id, record_id } = req.body;

      if (!form_slug) {
        return res.status(400).json({
          success: false,
          message: "form_slug is required",
        });
      }

      // 1. Get the child form schema to find parent_form_id and parent table
      const childSchema = await getFormWithSection({ form_slug });
      if (!childSchema || !childSchema.parent_form_id) {
        return res.status(200).json({ success: true, data: null });
      }

      // 2. Get the parent form schema to find its table name
      const parentFormRows = await sequelize.query(
        `SELECT form_id, slug, root_entity FROM t_form WHERE form_id = :parent_form_id AND deleted_at IS NULL LIMIT 1`,
        {
          replacements: { parent_form_id: childSchema.parent_form_id },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      const parentForm = parentFormRows?.[0] || null;
      if (!parentForm) {
        return res.status(200).json({ success: true, data: null });
      }

      const rootEntity =
        typeof parentForm.root_entity === "string"
          ? JSON.parse(parentForm.root_entity || "{}")
          : parentForm.root_entity || {};

      const parentTable = rootEntity.table || `t_frm_${parentForm.slug}`;
      const primaryKey = rootEntity.primary_key || "id";

      // 3. Fetch the parent record by primary key if provided
      let record = null;
      if (parent_id) {
        const rows = await sequelize.query(
          `SELECT * FROM "${parentTable}" WHERE ${primaryKey} = :parent_id LIMIT 1`,
          {
            replacements: { parent_id },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        record = rows?.[0] || null;
      }

      // Fallback: If not found by primary key, try user_id or created_by matching
      if (!record && (parent_id || user_id)) {
        const matchVal = user_id || parent_id;
        const rowsByUser = await sequelize.query(
          `SELECT * FROM "${parentTable}" WHERE user_id = :matchVal OR created_by = :matchVal ORDER BY ${primaryKey} DESC LIMIT 1`,
          {
            replacements: { matchVal },
            type: sequelize.QueryTypes.SELECT,
          }
        ).catch(() => []);
        record = rowsByUser?.[0] || null;
      }

      return res.status(200).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dynamicFormController;
