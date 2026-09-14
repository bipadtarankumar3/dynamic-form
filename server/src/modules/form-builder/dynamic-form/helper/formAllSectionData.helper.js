const rawBaseUrl = process.env.BASE_URL || "http://localhost:6003/api/v1/static/";
const BASE_URL = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;
const baseDomain = rawBaseUrl.replace(/\/api\/v1\/static\/?$/, "");

const getDocUrlExpr = (col) => `CASE 
  WHEN ${col} LIKE 'http://%' OR ${col} LIKE 'https://%' THEN ${col}
  WHEN ${col} LIKE '/api/v1/static/%' THEN CONCAT('${baseDomain}', ${col})
  ELSE CONCAT('${BASE_URL}', ${col})
END`;

function buildSelectQueryById({ schema, selected_data = {} }) {
  const rootTable = schema?.root_entity?.table;
  const rootPK = schema?.root_entity?.primary_key;
  const replacements = {};
  const select = [`r.${rootPK}`];
  const joins = [];
  const documentAggs = [];
  const searchColumns = [];
  const whereClause = [];

  schema.sections.forEach((section) => {
    const sectionAlias =
      section?.table === rootTable ? "r" : section?.section_id;

    /* ==========================
       GENERAL SECTION (UNCHANGED)
    ========================== */
    if (section?.type === "general") {
      /* ---------- ONE TO ONE JOIN ---------- */
      if (
        section?.table !== rootTable &&
        section?.relation?.type === "one_to_one"
      ) {
        select.push(`${sectionAlias}.${section?.primary_key}`);

        joins.push(`
          LEFT JOIN ${section?.table} ${sectionAlias}
            ON ${sectionAlias}.${section?.relation?.foreign_key}
               = r.${section?.relation?.parent_key}
        `);
      }

      section?.fields?.forEach((f) => {
        if (f?.visible === false && f?.add_to_query !== true) return;
        if (f?.type === "file" && f?.file) {
          /* ---------- FILE FIELD ---------- */
          const doc = f?.file;

          documentAggs.push(`
            SELECT
              '${f.db_field}' AS db_field,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    '${doc.primary_key}', d.${doc.primary_key},
                    '${doc.doc_type_key}', d.${doc.doc_type_key},
                    '${doc.file_path_key}', ${getDocUrlExpr(`d.${doc.file_path_key}`)},
                    '${doc.file_name_key}', d.${doc.file_name_key}
                  )
                  ORDER BY d.created_at
                ),
                '[]'::jsonb
              ) AS docs
            FROM ${doc.table} d
            WHERE d.${doc.foreign_key} = ${sectionAlias}.${section.primary_key}::text
              AND d.${doc.doc_type_key} = '${f.db_field}'
          `);
          return;
        }

        /* ---------- MULTIPLE MASTER ---------- */
        if (
          f.multiple &&
          f.data_source?.type === "master" &&
          f.type === "select"
        ) {
          const m = f.data_source;
          const cleanLabel = (m.label_key || "name").includes(".") ? m.label_key.split(".").pop() : (m.label_key || "name");

          if (!m.table_name) {
            select.push(`${sectionAlias}.${f.db_field}`);
            return;
          }

          select.push(`
            (
              SELECT COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'label', mm.${cleanLabel},
                    'value', mm.${m.primary_key || 'id'}
                  )
                  ORDER BY mm.${m.primary_key || 'id'}
                ),
                '[]'::jsonb
              )
              FROM ${m.table_name} mm
              WHERE CASE
                WHEN jsonb_typeof(to_jsonb(${sectionAlias}.${f.db_field})) = 'array' THEN 
                  to_jsonb(${sectionAlias}.${f.db_field}) @> to_jsonb(mm.${m.primary_key || 'id'}) OR to_jsonb(${sectionAlias}.${f.db_field}) @> to_jsonb(CAST(mm.${m.primary_key || 'id'} AS TEXT))
                ELSE 
                  CAST(mm.${m.primary_key || 'id'} AS TEXT) = CAST(${sectionAlias}.${f.db_field} AS TEXT)
              END
            ) AS ${cleanLabel}_${f.db_field}
          `);

          select.push(`${sectionAlias}.${f.db_field}`);
          return;
        }

        /* ---------- MASTER ---------- */
        if (f.data_source?.type === "master" && f.type === "select") {
          select.push(`${sectionAlias}.${f.db_field}`);
          return;
        }

        /* ---------- DATE RANGE ---------- */
        if (f.type === "date_range") {
          select.push(`${sectionAlias}.${f.act_db_field.start}`);
          select.push(`${sectionAlias}.${f.act_db_field.end}`);
          searchColumns.push(`${sectionAlias}.${f.act_db_field.start}`);
          searchColumns.push(`${sectionAlias}.${f.act_db_field.end}`);
          return;
        }

        /* ---------- NORMAL ---------- */
        if (f.db_field) {
          if (f.type === "add_more" || f.type === "repeater" || f.type === "table_grid") {
            const storageType = f.storage_type || (f.storage === "table" ? "table" : "jsonb");
            if (storageType === "table") {
              const childTbl = f.table_name || f.table || `t_${f.db_field}`;
              const childCols = (f.fields || []).map((cf) => `'${cf.db_field || cf.column_name}', c.${cf.db_field || cf.column_name}`);
              childCols.unshift(`'id', c.id`);
              select.push(`
                (
                  SELECT COALESCE(
                    jsonb_agg(
                      jsonb_build_object(
                        ${childCols.join(",\n")}
                      )
                      ORDER BY c.id
                    ),
                    '[]'::jsonb
                  )
                  FROM ${childTbl} c
                  WHERE c.parent_id = ${sectionAlias}.${section.primary_key || rootPK || 'id'}
                ) AS ${f.db_field}
              `);
              return;
            }
          }
          select.push(`${sectionAlias}.${f.db_field}`);
          searchColumns.push(`${sectionAlias}.${f.db_field}`);
        }
      });
      // ✅ Inject custom field (USER ONLY)
      if (schema.slug === "user" && section.slug === "user_details") {
        select.push(`${sectionAlias}.tup_key_skill_set`);
      }
    }

    /* ==========================
       ADD MORE SECTION (JSONB AGG OR ROOT COLUMN)
    ========================== */
    if (section.type === "add_more") {
      const relObj = typeof section.relation === "string" ? JSON.parse(section.relation || "{}") : (section.relation || {});
      const isJsonbRootCol =
        section.table === rootTable ||
        !section.relation ||
        (relObj.type !== "one_to_many" && !relObj.foreign_key);

      if (isJsonbRootCol) {
        const secColName = section.slug || section.section_id || "add_more";
        if (section.slug) {
          select.push(`r.${secColName} AS ${section.slug}`);
        }
        if (section.section_id && section.section_id !== section.slug) {
          select.push(`r.${secColName} AS ${section.section_id}`);
        }
        return;
      }
      const childAlias = section.section_id;
      const rowSelect = [];
      const rowJoins = [];
      const rowDocAggs = [];
      rowSelect.push(
        `'${section.primary_key}', ${childAlias}.${section.primary_key}`,
      );
      section.fields.forEach((f) => {
        if (f?.visible === false && f?.add_to_query !== true) return;
        /* ---------- FILE ---------- */
        if (f.type === "file" && f.file) {
          const doc = f.file;

          rowDocAggs.push(`
            SELECT
              '${f.db_field}' AS db_field,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    '${doc.primary_key}', d.${doc.primary_key},
                    '${doc.doc_type_key}', d.${doc.doc_type_key},
                    '${doc.file_path_key}', ${getDocUrlExpr(`d.${doc.file_path_key}`)},
                    '${doc.file_name_key}', d.${doc.file_name_key}
                  )
                  ORDER BY d.created_at
                ),
                '[]'::jsonb
              ) AS docs
            FROM ${doc.table} d
            WHERE d.${doc.foreign_key} = ${childAlias}.${section.primary_key}::text
              AND d.${doc.doc_type_key} = '${f.db_field}'
          `);
          return;
        }

        /* ---------- MULTIPLE MASTER ---------- */
        if (
          f.multiple &&
          f.data_source?.type === "master" &&
          f.type === "select"
        ) {
          const m = f.data_source;
          const cleanLabel = (m.label_key || "name").includes(".") ? m.label_key.split(".").pop() : (m.label_key || "name");

          if (!m.table_name) {
            rowSelect.push(`'${f.db_field}', ${childAlias}.${f.db_field}`);
            return;
          }

          rowSelect.push(`
            '${f.db_field}', (
              SELECT COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'label', mm.${cleanLabel},
                    'value', mm.${m.primary_key || 'id'}
                  )
                ),
                '[]'::jsonb
              )
              FROM ${m.table_name} mm
              WHERE CASE
                WHEN jsonb_typeof(to_jsonb(${childAlias}.${f.db_field})) = 'array' THEN 
                  to_jsonb(${childAlias}.${f.db_field}) @> to_jsonb(mm.${m.primary_key || 'id'}) OR to_jsonb(${childAlias}.${f.db_field}) @> to_jsonb(CAST(mm.${m.primary_key || 'id'} AS TEXT))
                ELSE 
                  CAST(mm.${m.primary_key || 'id'} AS TEXT) = CAST(${childAlias}.${f.db_field} AS TEXT)
              END
            )
          `);
          return;
        }

        /* ---------- MASTER ---------- */
        if (f.data_source?.type === "master" && f.type === "select") {
          rowSelect.push(`'${f.db_field}', ${childAlias}.${f.db_field}`);
          return;
        }

        /* ---------- DATE RANGE ---------- */
        if (f.type === "date_range") {
          rowSelect.push(
            `'${f.act_db_field.start}', ${childAlias}.${f.act_db_field.start}`,
            `'${f.act_db_field.end}', ${childAlias}.${f.act_db_field.end}`,
          );
          return;
        }

        /* ---------- NORMAL ---------- */
        if (f.db_field) {
          rowSelect.push(`'${f.db_field}', ${childAlias}.${f.db_field}`);
        }
      });

      /* ---------- FILE MERGE ---------- */
      if (rowDocAggs.length) {
        rowSelect.push(`
          'documents', (
            SELECT COALESCE(
              jsonb_object_agg(db_field, docs),
              '{}'::jsonb
            )
            FROM (
              ${rowDocAggs.join("\nUNION ALL\n")}
            ) d
          )
        `);
      }

      /* ---------- FINAL JSONB AGG ---------- */
      select.push(`
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ${rowSelect.join(",\n")}
              )
              ORDER BY ${childAlias}.${section.primary_key}
            ),
            '[]'::jsonb
          )
          FROM ${section.table} ${childAlias}
          ${rowJoins.join("\n")}
          WHERE ${childAlias}.${relObj.foreign_key || "parent_id"}
                = r.${relObj.parent_key || rootPK}
        ) AS ${section.slug}
      `);
    }
  });

  /* ==========================
     GLOBAL DOCUMENT MERGE (GENERAL)
  ========================== */
  if (documentAggs.length) {
    select.push(`
      (
        SELECT COALESCE(
          jsonb_object_agg(db_field, docs),
          '{}'::jsonb
        )
        FROM (
          ${documentAggs.join("\nUNION ALL\n")}
        ) file_docs
      ) AS documents
    `);
  }
  whereClause.push(`r.${rootPK} = :${rootPK}`);
  replacements[`${rootPK}`] = selected_data[rootPK];

  return {
    sql: `
     SELECT
      ${select.join(",\n")}
    FROM ${rootTable} r
    ${joins.join("\n")}
    WHERE ${whereClause.join(" AND ")}
  `,
    replacements,
  };
}

const { sequelize } = require("../../../../config/db.config");
const { getDbMasterConfig } = require("../../../dynamic-form/helper/masterResolver");

function getLabelColumn(tableName, colNames = []) {
  const systemCols = new Set([
    "id", "status", "created_by", "updated_by", "created_at", "updated_at",
    "deleted_at", "is_active", "deleted_by", "parent_primary_key", "parent_primary_key_value"
  ]);

  const userCols = colNames.filter((c) => !systemCols.has(c));
  if (userCols.length === 0) return colNames[0] || "name";

  const normTable = tableName.toLowerCase().replace(/^(t_frm_|t_mst_|t_)/, "").replace(/s$/, "");

  // 1. Direct match with normalized table name (e.g. column 'district' in 't_frm_district')
  const directMatch = userCols.find(
    (c) => c.toLowerCase() === normTable || c.toLowerCase().replace(/_(name|title|label|text)$/, "") === normTable
  );
  if (directMatch) return directMatch;

  // 2. Column containing / ending with _name, name, _title, title, _label, label
  const nameMatch = userCols.find((c) => {
    const l = c.toLowerCase();
    return (
      l === "name" || l.endsWith("_name") || l.includes("name") ||
      l === "title" || l.endsWith("_title") || l.includes("title") ||
      l === "label" || l.endsWith("_label")
    );
  });
  if (nameMatch) return nameMatch;

  // 3. First non-system column
  return userCols[0];
}

async function enrichMasterLabels(schema, resultData) {
  if (!resultData || typeof resultData !== "object") return resultData;

  const masterConfigCache = {};

  async function resolveConfig(field) {
    const ds = field.data_source || {};
    let masterName = ds.name || ds.table_name || field.db_field;
    if (!masterName) return null;

    const cleanedMasterName = masterName.replace(/_(id|pk|code|select)$/, "");

    if (masterConfigCache[masterName]) {
      return masterConfigCache[masterName];
    }
    if (masterConfigCache[cleanedMasterName]) {
      return masterConfigCache[cleanedMasterName];
    }

    if (ds.table_name && ds.primary_key && ds.label_key) {
      try {
        const rawLabelKey = String(ds.label_key).includes(".") ? String(ds.label_key).split(".").pop() : String(ds.label_key);
        const [cols] = await sequelize.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = :tbl`,
          { replacements: { tbl: ds.table_name } }
        );
        const colNames = cols.map((c) => c.column_name);
        if (colNames.includes(rawLabelKey) && !rawLabelKey.endsWith("_id") && !rawLabelKey.endsWith("_pk") && rawLabelKey !== "id") {
          const cfg = {
            table_name: ds.table_name,
            primary_key: ds.primary_key,
            label_key: rawLabelKey,
          };
          masterConfigCache[masterName] = cfg;
          masterConfigCache[cleanedMasterName] = cfg;
          return cfg;
        } else if (colNames.length > 0) {
          const realLabelKey = getLabelColumn(ds.table_name, colNames);
          const cfg = {
            table_name: ds.table_name,
            primary_key: ds.primary_key || "id",
            label_key: realLabelKey,
          };
          masterConfigCache[masterName] = cfg;
          masterConfigCache[cleanedMasterName] = cfg;
          return cfg;
        }
      } catch (e) {}
    }

    let cfg = await getDbMasterConfig(masterName);
    if (!cfg && cleanedMasterName !== masterName) {
      cfg = await getDbMasterConfig(cleanedMasterName);
    }

    if (!cfg) {
      const searchSlugs = Array.from(new Set([masterName, cleanedMasterName]));
      for (const mSlug of searchSlugs) {
        try {
          const [forms] = await sequelize.query(
            `SELECT f.form_id, COALESCE(f.root_entity->>'table', CONCAT('t_frm_', f.slug)) AS table_name,
                    s.primary_key, s.fields
             FROM t_form f
             LEFT JOIN t_section s ON s.section_form_id = f.form_id AND s.type = 'general' AND s.is_active = TRUE
             WHERE (f.slug = :m OR f.root_entity->>'table' = :m OR CONCAT('t_frm_', f.slug) = :m OR f.title ILIKE :m)
               AND f.deleted_at IS NULL
             LIMIT 1`,
            { replacements: { m: mSlug } }
          );
          if (forms.length > 0) {
            const f = forms[0];
            let labelKey = "name";
            let fieldsArray = f.fields;
            if (typeof fieldsArray === "string") {
              try { fieldsArray = JSON.parse(fieldsArray); } catch {}
            }
            if (Array.isArray(fieldsArray)) {
              const firstTxt = fieldsArray.find(
                (fld) => fld.db_field && (fld.type === "text" || fld.db_field.includes("name") || fld.db_field.includes("title") || fld.db_field === f.slug)
              );
              if (firstTxt?.db_field) labelKey = firstTxt.db_field;
              else if (fieldsArray[0]?.db_field) labelKey = fieldsArray[0].db_field;
            }
            cfg = {
              table_name: f.table_name,
              primary_key: f.primary_key || "id",
              label_key: labelKey,
            };
            break;
          }
        } catch (e) {
          console.warn("[enrichMasterLabels] t_form lookup error:", e.message);
        }
      }
    }

    if (!cfg) {
      const searchNames = Array.from(new Set([
        masterName,
        cleanedMasterName,
        `t_${cleanedMasterName}`,
        `t_frm_${cleanedMasterName}`,
        `t_mst_${cleanedMasterName}`,
        `t_${masterName}`,
        `t_frm_${masterName}`,
        `t_mst_${masterName}`,
      ]));

      try {
        const [tables] = await sequelize.query(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name IN (:searchNames)
           LIMIT 1`,
          { replacements: { searchNames } }
        );
        if (Array.isArray(tables) && tables.length > 0) {
          const tableName = tables[0].table_name;
          const [cols] = await sequelize.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = :tableName`,
            { replacements: { tableName } }
          );
          const colNames = Array.isArray(cols) ? cols.map((c) => c.column_name) : [];
          const pk = colNames.find((c) => c === "id" || c.endsWith("_id") || c.endsWith("_pk")) || colNames[0] || "id";
          const label = getLabelColumn(tableName, colNames);
          cfg = {
            table_name: tableName,
            primary_key: pk,
            label_key: label,
          };
        }
      } catch (e) {
        console.warn("[enrichMasterLabels] information_schema lookup error:", e.message);
      }
    }

    if (cfg) {
      masterConfigCache[masterName] = cfg;
      masterConfigCache[cleanedMasterName] = cfg;
    }
    return cfg;
  }

  for (const section of schema?.sections || []) {
    const secKey = section.slug || section.section_id;

    /* ====================================
       GENERAL SECTION
    ==================================== */
    if (section.type === "general") {
      for (const field of section.fields || []) {
        const isLookupField = field.type === "select" || field.data_source || field.options_source === "master" || (field.db_field && (field.db_field.endsWith("_id") || ["unit", "partner", "state", "district", "block", "village", "project"].includes(String(field.db_field).toLowerCase())));
        if (!isLookupField) continue;
        const val = resultData[field.db_field];
        if (val === null || val === undefined || val === "") continue;

        const config = await resolveConfig(field);
        if (!config || !config.table_name) continue;

        const labelKeyName = `${config.label_key}_${field.db_field}`;
        const nameKeyName = `name_${field.db_field}`;
        const fieldNameKey = `${field.db_field}_name`;

        if (!resultData[labelKeyName] && !resultData[nameKeyName] && !resultData[fieldNameKey]) {
          try {
            const [rows] = await sequelize.query(
              `SELECT ${config.label_key} AS label FROM ${config.table_name} WHERE CAST(${config.primary_key} AS TEXT) = :val LIMIT 1`,
              { replacements: { val: String(val) } }
            );
            if (rows.length > 0 && rows[0].label) {
              resultData[labelKeyName] = rows[0].label;
              resultData[nameKeyName] = rows[0].label;
              resultData[fieldNameKey] = rows[0].label;
              resultData[`${field.db_field}_label`] = rows[0].label;
              resultData[`${field.db_field.replace(/_id$/, "")}_name`] = rows[0].label;
              if (field.data_source?.label_key) {
                resultData[`${field.data_source.label_key}_${field.db_field}`] = rows[0].label;
              }
            }
          } catch (err) {
            console.warn(`[enrichMasterLabels] error fetching label for general field ${field.db_field}:`, err.message);
          }
        }
      }
    }

    /* ====================================
       ADD MORE SECTION
    ==================================== */
    if (section.type === "add_more") {
      const rows = resultData[secKey] || resultData[section.slug] || resultData[section.section_id];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const field of section.fields || []) {
        if (field.type !== "select") continue;

        const config = await resolveConfig(field);
        if (!config || !config.table_name) continue;

        const distinctVals = Array.from(
          new Set(
            rows
              .map((r) => r[field.db_field])
              .filter((v) => v !== null && v !== undefined && v !== "")
              .map((v) => String(v))
          )
        );

        if (distinctVals.length === 0) continue;

        try {
          const [labelRows] = await sequelize.query(
            `SELECT CAST(${config.primary_key} AS TEXT) AS val, ${config.label_key} AS label
             FROM ${config.table_name}
             WHERE CAST(${config.primary_key} AS TEXT) IN (:distinctVals)`,
            { replacements: { distinctVals } }
          );

          const labelMap = {};
          labelRows.forEach((r) => {
            labelMap[r.val] = r.label;
          });

          const labelKeyName = `${config.label_key}_${field.db_field}`;
          const nameKeyName = `name_${field.db_field}`;

          rows.forEach((r) => {
            const v = r[field.db_field];
            if (v !== null && v !== undefined && v !== "") {
              const labelVal = labelMap[String(v)];
              if (labelVal) {
                r[labelKeyName] = labelVal;
                r[nameKeyName] = labelVal;
                r[`${field.db_field}_label`] = labelVal;
                if (field.data_source?.label_key) {
                  r[`${field.data_source.label_key}_${field.db_field}`] = labelVal;
                }
              }
            }
          });
        } catch (err) {
          console.warn(`[enrichMasterLabels] error fetching labels for add_more field ${field.db_field}:`, err.message);
        }
      }
    }
  }

  return resultData;
}

module.exports = {
  buildSelectQueryById,
  enrichMasterLabels,
};
