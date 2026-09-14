const { sequelize } = require("../../../config/db.config");

async function getTableColumns(tableName) {
  try {
    const [cols] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :tableName`,
      { replacements: { tableName } }
    );
    return cols.map(c => c.column_name);
  } catch (err) {
    console.error("[getTableColumns] Error getting columns for table:", tableName, err);
    return [];
  }
}

function normalizeKey(str) {
  if (!str) return "";
  let res = str.toLowerCase()
    .replace(/^(tpro|tprj|tthm|tng|tst|tdis|tblk|tgramp|tvill|tact|tschsvn|tsdg|tftb|tfy|tng|ttrai|tsupi|tsdgdet|tbgh)_/, "");
  let prev;
  do {
    prev = res;
    res = res.replace(/_(id|select|name|code|pk)$/, "");
  } while (res !== prev);
  return res.replace(/_/g, "");
}

async function resolveFilterColumn(tableName, filterKey, masterSlug = null) {
  const columns = await getTableColumns(tableName);
  if (!columns || columns.length === 0) return filterKey;

  // 1. Direct Match
  if (columns.includes(filterKey)) {
    return filterKey;
  }

  // 2. Master Form Schema Lookup
  if (masterSlug) {
    try {
      const [forms] = await sequelize.query(
        `SELECT s.fields
         FROM t_form f
         JOIN t_section s ON s.section_form_id = f.form_id AND s.type = 'general' AND s.is_active = TRUE
         WHERE (f.slug = :masterSlug 
            OR CONCAT(f.slug, 's') = :masterSlug 
            OR f.slug = CONCAT(:masterSlug, 's') 
            OR f.root_entity->>'table' = :masterSlug 
            OR CONCAT('t_frm_', f.slug) = :masterSlug)
           AND f.deleted_at IS NULL
         LIMIT 1`,
        { replacements: { masterSlug } }
      );

      if (forms.length > 0) {
        let fields = forms[0].fields;
        if (typeof fields === "string") {
          try { fields = JSON.parse(fields); } catch (e) {}
        }
        if (Array.isArray(fields)) {
          const normFilterKey = normalizeKey(filterKey);

          for (const field of fields) {
            if (field.db_field && columns.includes(field.db_field)) {
              if (normalizeKey(field.db_field) === normFilterKey) {
                return field.db_field;
              }
              if (field.data_source && field.data_source.name) {
                if (normalizeKey(field.data_source.name) === normFilterKey) {
                  return field.db_field;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[resolveFilterColumn] Warning resolving column from form schema:", e.message);
    }
  }

  // 3. Fuzzy database column name match
  const normFilterKey = normalizeKey(filterKey);
  for (const col of columns) {
    if (normalizeKey(col) === normFilterKey) {
      return col;
    }
  }

  // 4. Default fallback
  return filterKey;
}

async function getDbMasterConfig(master) {
  try {
    const aliases = {
      state: "states",
      district: "districts",
      block: "blocks",
      gram_panchayat: "gram_panchayats",
      village: "villages",
      theme: "themes",
      activity: "theme_wise_activities",
      schedule_seven: "schedule_sevens",
      schedule_vii: "schedule_sevens",
      sub_schedule_seven: "sub_schedule_sevens",
      sub_schedule_vii: "sub_schedule_sevens",
      sub_schedule: "sub_schedules",
      sdg: "sdgs",
      ngo: "ngos",
      document_type: "doc_types",
      financial_year: "financial_years",
    };
    const lookupSlug = aliases[master] || master;

    const [dbConfigs] = await sequelize.query(
      `SELECT table_name, primary_key, label_key, is_active_key, foreign_key
       FROM t_master_configs
       WHERE slug = :lookupSlug OR table_name = :master OR slug = :master
       LIMIT 1`,
      { replacements: { lookupSlug, master } }
    );

    if (dbConfigs.length > 0) {
      const staticCfg = dbConfigs[0];
      const [chk] = await sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name = :tbl)`,
        { replacements: { tbl: staticCfg.table_name } }
      );
      if (chk[0]?.exists) {
        return {
          type: "master",
          ...staticCfg
        };
      }
    }

    // 2. Try t_master_schemas (Master Builder tables)
    const [schemas] = await sequelize.query(
      `SELECT table_name, 'id' AS primary_key, label_field AS label_key, 'is_active' AS is_active_key, NULL AS foreign_key
       FROM t_master_schemas
       WHERE (slug = :master OR table_name = :master OR CONCAT('t_mst_', slug) = :master)
         AND deleted_at IS NULL
       LIMIT 1`,
      { replacements: { master } }
    );
    if (schemas.length > 0) {
      const sch = schemas[0];
      const [chk] = await sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name = :tbl)`,
        { replacements: { tbl: sch.table_name } }
      );
      if (chk[0]?.exists) {
        return {
          type: "master",
          ...sch
        };
      }
    }

    // 3. Fallback to master.config.js (legacy static configuration)
    try {
      const masterConfig = require("../../master/master.config");
      let staticCfg = masterConfig[master];
      if (!staticCfg && aliases[master]) {
        staticCfg = masterConfig[aliases[master]];
      }
      if (staticCfg) {
        const [chk] = await sequelize.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name = :tbl)`,
          { replacements: { tbl: staticCfg.table_name } }
        );
        if (chk[0]?.exists) {
          return {
            type: "master",
            ...staticCfg
          };
        }
      }
    } catch (err) {}
  } catch (e) {
    console.error("[getDbMasterConfig] Error:", e.message);
  }
  return null;
}

module.exports = {
  resolveFilterColumn,
  normalizeKey,
  getDbMasterConfig
};
