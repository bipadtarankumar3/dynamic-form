// server/src/modules/database-view/services/databaseViewSqlGenerator.service.js
// ============================================================
// PostgreSQL Database View Builder — SQL Generator & Validator
// Transforms structured frontend JSON configuration into valid,
// safe, high-performance PostgreSQL `CREATE OR REPLACE VIEW` DDL.
// ============================================================

const { sanitizeIdentifier } = require("./databaseViewDiscovery.service");

// PostgreSQL Reserved Words list for safe quoting
const RESERVED_WORDS = new Set([
  "user", "order", "group", "select", "where", "from", "limit", "offset",
  "join", "table", "column", "primary", "foreign", "key", "grant", "revoke", "status"
]);

function quoteIdentifier(id) {
  const clean = sanitizeIdentifier(id);
  if (RESERVED_WORDS.has(clean.toLowerCase())) {
    return `"${clean}"`;
  }
  return clean;
}

/**
 * Generate PostgreSQL CREATE OR REPLACE VIEW SQL from structured config
 */
function generateViewSQL(config) {
  const {
    view_name,
    database_view_name,
    schema_name = "public",
    base_table,
    selected_fields = [],
    many_to_one = [],
    child_tables = [],
    user_audit = {},
    filters = [],
    sorting = [],
    options = {}
  } = config;

  if (!base_table) throw new Error("Base table is required");
  
  const rawViewName = database_view_name || `v_${view_name.toLowerCase().replace(/[^a-z0-9_]+/g, "_")}`;
  const safeViewName = sanitizeIdentifier(rawViewName);
  const safeSchema = sanitizeIdentifier(schema_name);
  const safeBaseTable = sanitizeIdentifier(base_table);

  const baseAlias = "m";
  const selectColumns = [];
  const joinClauses = [];
  const fromAndJoinsSummary = [];

  fromAndJoinsSummary.push(`FROM ${safeSchema}.${safeBaseTable} ${baseAlias}`);

  // Unique alias generator tracking all assigned aliases
  const usedAliases = new Set([baseAlias, "public"]);
  const tableAliasMap = {
    [safeBaseTable]: baseAlias
  };

  const getUniqueAlias = (preferred) => {
    let clean = (preferred || "t").toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!clean || clean === baseAlias) clean = "t";
    let alias = clean;
    let counter = 1;
    while (usedAliases.has(alias)) {
      alias = `${clean}${counter++}`;
    }
    usedAliases.add(alias);
    return alias;
  };

  // 1. Process MANY_TO_ONE Relationships (Parent & Master tables)
  // Sort so base_table joins are processed first, followed by joins dependent on other joined parent tables
  const sortedManyToOne = [...(many_to_one || [])].sort((a, b) => {
    const aIsBase = !a.source_table || a.source_table === safeBaseTable;
    const bIsBase = !b.source_table || b.source_table === safeBaseTable;
    if (aIsBase && !bIsBase) return -1;
    if (!aIsBase && bIsBase) return 1;
    return 0;
  });

  sortedManyToOne.forEach(rel => {
    if (!rel.included && rel.included !== undefined) return;
    if (!rel.target_table || !rel.source_column) return;
    const targetTable = sanitizeIdentifier(rel.target_table);
    const sourceTable = rel.source_table ? sanitizeIdentifier(rel.source_table) : safeBaseTable;
    const sourceCol = sanitizeIdentifier(rel.source_column);
    const targetCol = sanitizeIdentifier(rel.target_column || "id");

    let preferred = rel.alias;
    if (!preferred) {
      if (sourceCol === "parent_id" && sourceTable === safeBaseTable) preferred = "p";
      else preferred = sourceCol.replace(/_id$/, "").replace(/^id_/, "") || targetTable.replace(/^t_frm_/, "");
    }
    const alias = getUniqueAlias(preferred);

    if (rel.key) tableAliasMap[rel.key] = alias;
    tableAliasMap[`${sourceCol}__${targetTable}`] = alias;
    tableAliasMap[`${sourceTable}__${targetTable}`] = alias;
    tableAliasMap[targetTable] = alias;

    const sourceTableAlias = tableAliasMap[sourceTable] || baseAlias;

    joinClauses.push(
      `LEFT JOIN ${safeSchema}.${targetTable} ${alias}\n    ON ${alias}.${quoteIdentifier(targetCol)}::text = ${sourceTableAlias}.${quoteIdentifier(sourceCol)}::text`
    );
    fromAndJoinsSummary.push(
      `LEFT JOIN ${safeSchema}.${targetTable} ${alias}\n  ON ${alias}.${targetCol}::text = ${sourceTableAlias}.${sourceCol}::text`
    );
  });

  // 2. Process SYSTEM_USER Relationships (Created By / Updated By)
  const userTable = sanitizeIdentifier(config.user_table_name || "t_users");

  if (user_audit.created_by && user_audit.created_by.included) {
    const cuAlias = getUniqueAlias("cu");
    tableAliasMap["users_created_by"] = cuAlias;
    tableAliasMap["t_users_created_by"] = cuAlias;
    tableAliasMap["created_by"] = cuAlias;
    tableAliasMap[userTable] = cuAlias;
    joinClauses.push(
      `LEFT JOIN ${safeSchema}.${userTable} ${cuAlias}\n    ON ${cuAlias}.id::text = ${baseAlias}.created_by::text`
    );
    fromAndJoinsSummary.push(
      `LEFT JOIN ${safeSchema}.${userTable} ${cuAlias}\n  ON ${cuAlias}.id::text = ${baseAlias}.created_by::text`
    );
  }

  if (user_audit.updated_by && user_audit.updated_by.included) {
    const uuAlias = getUniqueAlias("uu");
    tableAliasMap["users_updated_by"] = uuAlias;
    tableAliasMap["t_users_updated_by"] = uuAlias;
    tableAliasMap["updated_by"] = uuAlias;
    joinClauses.push(
      `LEFT JOIN ${safeSchema}.${userTable} ${uuAlias}\n    ON ${uuAlias}.id::text = ${baseAlias}.updated_by::text`
    );
    fromAndJoinsSummary.push(
      `LEFT JOIN ${safeSchema}.${userTable} ${uuAlias}\n  ON ${uuAlias}.id::text = ${baseAlias}.updated_by::text`
    );
  }

  // 3. Process Selected Columns
  const processedAliases = new Set();

  (selected_fields || []).forEach(field => {
    let rawFieldName = field.field || field.column_name || "";
    let sourceRel = field.source_rel;

    if (rawFieldName.includes(".")) {
      const parts = rawFieldName.split(".");
      sourceRel = sourceRel || parts[0];
      rawFieldName = parts[1];
    }

    const colName = sanitizeIdentifier(rawFieldName);
    const rawAlias = field.alias || field.display_name || colName;
    let safeAlias = sanitizeIdentifier(rawAlias.toLowerCase().replace(/[^a-z0-9_]+/g, "_"));
    
    if (processedAliases.has(safeAlias)) {
      safeAlias = sanitizeIdentifier(`${field.table ? field.table + "_" : ""}${safeAlias}`);
    }
    processedAliases.add(safeAlias);

    const sourceTable = field.table || safeBaseTable;
    let alias = baseAlias;

    if (field.rel_key && tableAliasMap[field.rel_key]) {
      alias = tableAliasMap[field.rel_key];
    } else if (sourceTable === "users" || sourceTable === "t_users" || sourceRel === "created_by" || sourceRel === "updated_by") {
      if (sourceRel === "updated_by") alias = tableAliasMap["users_updated_by"] || "uu";
      else alias = tableAliasMap["users_created_by"] || "cu";
    } else if (tableAliasMap[sourceTable]) {
      alias = tableAliasMap[sourceTable];
    }

    if (safeAlias === colName && alias === baseAlias) {
      selectColumns.push(`    ${alias}.${quoteIdentifier(colName)}`);
    } else {
      selectColumns.push(`    ${alias}.${quoteIdentifier(colName)} AS ${quoteIdentifier(safeAlias)}`);
    }
  });

  // Default if no fields selected
  if (selectColumns.length === 0) {
    selectColumns.push(`    ${baseAlias}.*`);
  } else {
    // Ensure base table primary key (e.g. 'id') is always included so row actions/lookups work
    const hasBasePk = selectColumns.some(col => 
      col.trim().startsWith(`${baseAlias}.id`) || 
      col.trim().endsWith(`AS "id"`) || 
      col.trim().endsWith(`AS id`)
    );
    if (!hasBasePk) {
      selectColumns.unshift(`    ${baseAlias}.id AS id`);
    }
  }

  // 4. Process ONE_TO_MANY Child Tables (Aggregated as JSONB via LEFT JOIN LATERAL)
  (child_tables || []).forEach(child => {
    if (!child.enabled && !child.included) return;
    const childTable = sanitizeIdentifier(child.child_table || child.table_name);
    const childFk = sanitizeIdentifier(child.child_foreign_key || "parent_id");
    const parentCol = sanitizeIdentifier(child.parent_column || "id");
    const childAlias = child.alias || childTable.replace(/^t_frm_/, "").replace(`${safeBaseTable.replace(/^t_frm_/, "")}_`, "");
    const safeChildAlias = sanitizeIdentifier(childAlias);

    const includeMode = child.include_mode || "full"; // "full" or "count_only"
    const statusCounts = child.status_counts || [];
    const subChildren = child.sub_children || [];

    const childFields = child.fields || [];
    const childMasters = child.child_masters || [];
    const masterByTable = new Map(childMasters.map(m => [m.target_table, m]));
    const usedMasterAliases = new Set();
    const childMasterJoins = [];

    // Helper to get or create master JOIN alias
    const getMasterAlias = (targetTbl, srcColHint) => {
      const cm = masterByTable.get(targetTbl) || childMasters.find(m => m.source_column === srcColHint);
      const rawSrc = cm ? cm.source_column : (srcColHint || targetTbl.replace(/^t_frm_|^t_master_|^master_/, ""));
      const sourceCol = sanitizeIdentifier(rawSrc);
      const cmAlias = `m_${sourceCol}`;
      const targetCol = cm ? sanitizeIdentifier(cm.target_column || "id") : "id";

      if (!usedMasterAliases.has(cmAlias)) {
        usedMasterAliases.add(cmAlias);
        childMasterJoins.push(
          `    LEFT JOIN ${safeSchema}.${targetTbl} ${cmAlias}\n` +
          `      ON c.${quoteIdentifier(sourceCol)}::text = ${cmAlias}.${quoteIdentifier(targetCol)}::text`
        );
      }
      return cmAlias;
    };

    // Pre-populate childMasterJoins for all defined child_masters
    childMasters.forEach(cm => {
      getMasterAlias(cm.target_table, cm.source_column);
    });

    const jsonFieldsSql = childFields.map(cf => {
      const fName = sanitizeIdentifier(cf.field || cf.column_name);
      const fAlias = cf.alias || fName;

      if (cf.source_table && cf.source_table !== childTable) {
        const cmAlias = getMasterAlias(cf.source_table, cf.source_column);
        return `                '${fAlias}', ${cmAlias}.${quoteIdentifier(fName)}`;
      }

      return `                '${fAlias}', c.${quoteIdentifier(fName)}`;
    });

    if (jsonFieldsSql.length === 0) {
      jsonFieldsSql.push(`                'id', c.id`);
    }

    // Process Level 2 Sub-Children (Grandchildren)
    const subChildJoins = [];
    subChildren.forEach(sc => {
      const scTable = sc.child_table;
      if (!scTable) return;
      const scFk = sanitizeIdentifier(sc.child_foreign_key || "parent_id");
      const scParentCol = sanitizeIdentifier(sc.parent_column || "id");
      const scAlias = sc.alias || scTable.replace(/^t_frm_/, "").replace(`${safeChildAlias}_`, "");
      const safeScAlias = sanitizeIdentifier(scAlias);

      const scFields = sc.fields || [];
      const scFieldsSql = scFields.map(scf => {
        const fName = sanitizeIdentifier(scf.field || scf.column_name);
        const fAlias = scf.alias || fName;
        return `                        '${fAlias}', sub_${safeScAlias}.${quoteIdentifier(fName)}`;
      });
      if (scFieldsSql.length === 0) {
        scFieldsSql.push(`                        'id', sub_${safeScAlias}.id`);
      }

      const subSoftDelete = options.include_deleted !== true ? `\n              AND sub_${safeScAlias}.deleted_at IS NULL` : "";

      subChildJoins.push(
        `    LEFT JOIN LATERAL (\n` +
        `        SELECT\n` +
        `            jsonb_agg(\n` +
        `                jsonb_build_object(\n` +
        scFieldsSql.join(",\n") + `\n` +
        `                )\n` +
        `                ORDER BY sub_${safeScAlias}.id\n` +
        `            ) AS ${safeScAlias},\n` +
        `            COUNT(sub_${safeScAlias}.*) AS total_count\n` +
        `        FROM ${safeSchema}.${scTable} sub_${safeScAlias}\n` +
        `        WHERE sub_${safeScAlias}.${quoteIdentifier(scFk)}::text = c.${quoteIdentifier(scParentCol)}::text` +
        subSoftDelete + `\n` +
        `    ) ${safeScAlias}_lat ON TRUE`
      );

      jsonFieldsSql.push(`                '${safeScAlias}', COALESCE(${safeScAlias}_lat.${safeScAlias}, '[]'::jsonb)`);
      jsonFieldsSql.push(`                '${safeScAlias}_count', COALESCE(${safeScAlias}_lat.total_count, 0)::integer`);
    });

    const softDeleteCheck = options.include_deleted !== true ? `\n      AND c.deleted_at IS NULL` : "";

    const selectItems = [];

    // 1. JSON Array (if not count_only)
    if (includeMode !== "count_only") {
      selectItems.push(
        `        jsonb_agg(\n` +
        `            jsonb_build_object(\n` +
        jsonFieldsSql.join(",\n") + `\n` +
        `            )\n` +
        `            ORDER BY c.id\n` +
        `        ) AS ${safeChildAlias}`
      );
    }

    // 2. Total Count
    selectItems.push(`        COUNT(c.*) AS total_count`);

    // 3. Conditional Status Counts (e.g. status = 'approved', status = 'draft')
    statusCounts.forEach((sc, scIdx) => {
      const colName = sanitizeIdentifier(sc.column || "status");
      const valStr = String(sc.value || "").replace(/'/g, "''");
      selectItems.push(`        COUNT(c.*) FILTER (WHERE c.${quoteIdentifier(colName)}::text = '${valStr}') AS status_cnt_${scIdx}`);
    });

    const subChildJoinsSql = subChildJoins.length > 0 ? `\n` + subChildJoins.join("\n") : "";
    const childMasterJoinsSql = childMasterJoins.length > 0 ? `\n` + childMasterJoins.join("\n") : "";

    const lateralSql = `LEFT JOIN LATERAL (\n` +
      `    SELECT\n` +
      selectItems.join(",\n") + `\n` +
      `    FROM ${safeSchema}.${childTable} c` +
      childMasterJoinsSql +
      subChildJoinsSql + `\n` +
      `    WHERE c.${quoteIdentifier(childFk)}::text = ${baseAlias}.${quoteIdentifier(parentCol)}::text` +
      softDeleteCheck + `\n` +
      `) ${safeChildAlias}\nON TRUE`;

    joinClauses.push(lateralSql);
    fromAndJoinsSummary.push(`LEFT JOIN LATERAL ( ... ) ${safeChildAlias}\n  ON TRUE`);

    const includeFullRecords = child.include_full_records !== false && includeMode !== "count_only";

    if (includeFullRecords) {
      selectColumns.push(`    COALESCE(${safeChildAlias}.${safeChildAlias}, '[]'::jsonb) AS ${quoteIdentifier(safeChildAlias)}`);
    }

    // Include generic total count column if include_count !== false (defaults to true)
    if (child.include_count !== false) {
      selectColumns.push(`    COALESCE(${safeChildAlias}.total_count, 0)::integer AS ${quoteIdentifier(safeChildAlias + "_count")}`);
    }

    statusCounts.forEach((sc, scIdx) => {
      const colAlias = sanitizeIdentifier(sc.alias || `${safeChildAlias}_${sc.value}_count`);
      selectColumns.push(`    COALESCE(${safeChildAlias}.status_cnt_${scIdx}, 0)::integer AS ${quoteIdentifier(colAlias)}`);
    });
  });

  // 5. Build WHERE Clause
  const whereConditions = [];

  // Default Soft Delete
  if (options.include_deleted !== true) {
    whereConditions.push(`${baseAlias}.deleted_at IS NULL`);
  }

  // Filter Rules
  (filters || []).forEach(f => {
    if (!f.field) return;
    const colName = sanitizeIdentifier(f.field);
    const op = (f.operator || f.op || "equals").toLowerCase();
    const val = f.value;

    let condition = "";
    if (op === "is_null") {
      condition = `${baseAlias}.${quoteIdentifier(colName)} IS NULL`;
    } else if (op === "is_not_null") {
      condition = `${baseAlias}.${quoteIdentifier(colName)} IS NOT NULL`;
    } else if (op === "equals" || op === "=") {
      condition = `${baseAlias}.${quoteIdentifier(colName)}::text = '${String(val).replace(/'/g, "''")}'`;
    } else if (op === "not_equals" || op === "!=" || op === "is_not") {
      condition = `${baseAlias}.${quoteIdentifier(colName)}::text != '${String(val).replace(/'/g, "''")}'`;
    } else if (op === "contains" || op === "like") {
      condition = `${baseAlias}.${quoteIdentifier(colName)} ILIKE '%${String(val).replace(/'/g, "''")}%'`;
    } else if (op === "starts_with") {
      condition = `${baseAlias}.${quoteIdentifier(colName)} ILIKE '${String(val).replace(/'/g, "''")}%'`;
    } else if (op === "greater_than" || op === ">") {
      condition = `${baseAlias}.${quoteIdentifier(colName)} > '${String(val).replace(/'/g, "''")}'`;
    } else if (op === "less_than" || op === "<") {
      condition = `${baseAlias}.${quoteIdentifier(colName)} < '${String(val).replace(/'/g, "''")}'`;
    }

    if (condition) whereConditions.push(condition);
  });

  // 6. Build ORDER BY Clause
  const orderClauses = [];
  (sorting || []).forEach(s => {
    if (!s.field) return;
    const colName = sanitizeIdentifier(s.field);
    const dir = (s.direction || s.order || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
    orderClauses.push(`${baseAlias}.${quoteIdentifier(colName)} ${dir}`);
  });

  // Assemble full CREATE OR REPLACE VIEW query
  let sql = `CREATE OR REPLACE VIEW ${safeSchema}.${safeViewName} AS\n\n`;
  sql += `SELECT\n${selectColumns.join(",\n")}\n\n`;
  sql += `FROM ${safeSchema}.${safeBaseTable} ${baseAlias}\n\n`;

  if (joinClauses.length > 0) {
    sql += `${joinClauses.join("\n\n")}\n\n`;
  }

  if (whereConditions.length > 0) {
    sql += `WHERE ${whereConditions.join("\n  AND ")}`;
  }

  if (orderClauses.length > 0) {
    // Note: ORDER BY in views is supported in PostgreSQL
    sql += `\n\nORDER BY ${orderClauses.join(", ")}`;
  }

  sql += `;`;

  return {
    sql,
    database_view_name: safeViewName,
    from_and_joins_summary: fromAndJoinsSummary,
    has_performance_warning: (child_tables || []).filter(c => c.enabled || c.included).length >= 3
  };
}

module.exports = {
  generateViewSQL,
  quoteIdentifier
};
