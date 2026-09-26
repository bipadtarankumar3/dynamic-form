const { sequelize } = require("../../../config/db.config");
const CustomErrorHandler = require("../../../services/customErrorHandler.service");
const CustomDashboardWidgetsModel = require("../../../models/customDashboardWidgets.model");
const DashboardBuilderModel = require("../../../models/dashboardBuilder.model");
const PivotSavedReportsModel = require("../../../models/pivotSavedReports.model");
const xlsx = require("xlsx");

// ---------------------------------------------------------------------------
// Auto-create the t_custom_dashboard_widgets table + sequence on server start
// ---------------------------------------------------------------------------
const initDB = async () => {
  try {
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS t_custom_dashboard_widgets_id_seq;
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.t_custom_dashboard_widgets
      (
          tcdw_id character varying(255) COLLATE pg_catalog."default" NOT NULL
            DEFAULT ('tcdw'::text || lpad((nextval('t_custom_dashboard_widgets_id_seq'::regclass))::text, 10, '0'::text)),
          tcdw_title character varying(255),
          tcdw_table_name character varying(255),
          tcdw_configuration jsonb,
          tcdw_chart_type character varying(50),
          tcdw_is_active boolean DEFAULT true,
          tcdw_order integer DEFAULT 0,
          tcdw_created_by integer DEFAULT 0,
          tcdw_updated_by integer DEFAULT 0,
          tcdw_created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          tcdw_updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          tcdw_deleted_at timestamp with time zone,
          CONSTRAINT t_custom_dashboard_widgets_pkey PRIMARY KEY (tcdw_id)
      )
    `);
    console.log("t_custom_dashboard_widgets table initialized.");
  } catch (error) {
    console.error("Error initializing t_custom_dashboard_widgets table:", error.message);
  }
};
initDB();

// ---------------------------------------------------------------------------
// Helper: determine if an object only contains aggregated leaf values
// ---------------------------------------------------------------------------
const isLeafValue = (obj) => {
  if (!obj || typeof obj !== "object") return false;
  return Object.keys(obj).every(
    (k) =>
      k.startsWith("sum_") ||
      k.startsWith("count_") ||
      k.startsWith("avg_") ||
      k.startsWith("max_") ||
      k.startsWith("min_") ||
      k.startsWith("total_")
  );
};

const flattenPivotedValues = (pivotedValues, prefix = "") => {
  const result = {};
  if (!pivotedValues) return result;

  if (Array.isArray(pivotedValues)) {
    pivotedValues.forEach((item) => {
      Object.assign(result, flattenPivotedValues(item, prefix));
    });
  } else if (typeof pivotedValues === "object" && pivotedValues !== null) {
    Object.keys(pivotedValues).forEach((key) => {
      const value = pivotedValues[key];
      const newPrefix = prefix ? `${prefix} - ${key}` : key;

      if (isLeafValue(value)) {
        Object.keys(value).forEach((vKey) => {
          result[`${newPrefix} - ${vKey}`] = value[vKey];
        });
      } else if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        Object.assign(result, flattenPivotedValues(value, newPrefix));
      } else {
        result[newPrefix] = value;
      }
    });
  }
  return result;
};

// ---------------------------------------------------------------------------
// buildPivotQuery — generates a dynamic PostgreSQL CUBE pivot query
// ---------------------------------------------------------------------------
const buildPivotQuery = (tableName, zones, userContext = {}) => {
  const { filters = [], rows = [], columns = [], values = [] } = zones || {};
  const { userId, isConfigurator, dataScope = 'all' } = userContext;

  const lateralJoins = new Map();

  const getFieldExpr = (field) => {
    if (field.type === "json") {
      const alias = `${field.id}_value`;
      const joinClause = `LATERAL jsonb_array_elements_text(${field.id}::jsonb) AS ${alias}`;
      lateralJoins.set(field.id, joinClause);
      return `trim(${alias})`;
    }

    const grp = (field.dateGrouping || field.date_grouping || field.interval || "").toLowerCase();
    const isDateField = field.type === "date" || field.id.endsWith("_at") || field.id.endsWith("_date") || field.id === "date";

    if (grp || isDateField) {
      const effectiveGrp = grp || (field.type === "date" ? "month" : "");
      if (effectiveGrp === "month" || effectiveGrp === "month_year") {
        return `TO_CHAR(CAST(${field.id} AS TIMESTAMP), 'YYYY-Mon')`;
      }
      if (effectiveGrp === "year") {
        return `TO_CHAR(CAST(${field.id} AS TIMESTAMP), 'YYYY')`;
      }
      if (effectiveGrp === "quarter") {
        return `'Q' || TO_CHAR(CAST(${field.id} AS TIMESTAMP), 'Q YYYY')`;
      }
      if (effectiveGrp === "financial_year" || effectiveGrp === "fy") {
        return `CASE WHEN EXTRACT(MONTH FROM CAST(${field.id} AS TIMESTAMP)) >= 4 THEN 'FY ' || TO_CHAR(CAST(${field.id} AS TIMESTAMP), 'YY') || '-' || TO_CHAR(CAST(${field.id} AS TIMESTAMP) + INTERVAL '1 year', 'YY') ELSE 'FY ' || TO_CHAR(CAST(${field.id} AS TIMESTAMP) - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CAST(${field.id} AS TIMESTAMP), 'YY') END`;
      }
      if (effectiveGrp === "day" || effectiveGrp === "date") {
        return `TO_CHAR(CAST(${field.id} AS TIMESTAMP), 'YYYY-MM-DD')`;
      }
    }

    return field.id;
  };

  const rowExprs = rows.map((field) => ({
    id: field.type === "json" ? `${field.id}_value` : field.id,
    expr: getFieldExpr(field),
    label: field.label,
  }));

  const colExprs = columns.map((field) => ({
    id: field.type === "json" ? `${field.id}_value` : field.id,
    expr: getFieldExpr(field),
    label: field.label,
  }));

  const valueAggs = values.map((v) => {
    const rawOp = String(v.aggType || v.agg || v.aggregate || "Count").trim();
    const op = rawOp.toLowerCase().replace(/[\s-]+/g, "_");
    const field = v.id;
    const aggExprMap = {
      sum: `SUM(CAST(${field} AS NUMERIC))`,
      avg: `AVG(CAST(${field} AS NUMERIC))`,
      max: `MAX(${field})`,
      min: `MIN(${field})`,
      distinct_count: `COUNT(DISTINCT ${field})`,
      distinct_counts: `COUNT(DISTINCT ${field})`,
      distinctcount: `COUNT(DISTINCT ${field})`,
      distinct: `COUNT(DISTINCT ${field})`,
    };
    const expr = aggExprMap[op] || `COUNT(${field})`;
    const alias = `${op}_${field}`;
    return { alias, expr };
  });

  let whereClause = "1=1";
  const replacements = {};
  let filterIndex = 0;

  // Row-Level Security / User Data Scoping (created_by)
  if (dataScope === "created_by" && !isConfigurator && userId) {
    whereClause += ` AND (
      ((to_jsonb(${tableName}) ->> 'created_by') = :current_user_id_text)
      OR ((to_jsonb(${tableName}) ->> 'user_id') = :current_user_id_text)
      OR ((to_jsonb(${tableName}) ->> 'usr_id') = :current_user_id_text)
      OR (NOT (to_jsonb(${tableName}) ? 'created_by') AND NOT (to_jsonb(${tableName}) ? 'user_id') AND NOT (to_jsonb(${tableName}) ? 'usr_id'))
    )`;
    replacements.current_user_id = userId;
    replacements.current_user_id_text = String(userId);
  }

  // Row-Level Security: master_scoped (e.g. unit_id, state_id, district_id, theme_id, ngo_id)
  if (dataScope === "master_scoped" && !isConfigurator && userContext) {
    const targetField = (userContext.masterField || "unit_id").replace(/["']/g, "").trim();
    let allowedValues = [];
    if (userContext.scopes && Array.isArray(userContext.scopes[targetField])) {
      allowedValues = userContext.scopes[targetField];
    } else if (userContext[targetField] !== undefined && userContext[targetField] !== null) {
      allowedValues = Array.isArray(userContext[targetField]) ? userContext[targetField] : [userContext[targetField]];
    }

    if (allowedValues.length > 0) {
      whereClause += ` AND (
        ((to_jsonb(${tableName}) ->> '${targetField}') IN (:allowed_master_values))
        OR NOT (to_jsonb(${tableName}) ? '${targetField}')
      )`;
      replacements.allowed_master_values = allowedValues.map(String);
    }
  }

  const addFilterForField = (field) => {
    if (Array.isArray(field.selectedValues) && field.selectedValues.filter(Boolean).length > 0) {
      const validVals = field.selectedValues.filter(Boolean).map(String);
      const isDateRange =
        (field.filter_type === "date_range" || field.type === "date_range") &&
        validVals.length === 2;
      const isSingleDate =
        (field.filter_type === "date" || field.type === "date") &&
        validVals.length === 1;

      const isCrossViewFilter =
        field.filter_table_name && field.filter_table_name !== tableName;

      if (isDateRange) {
        const startKey = `filter_${filterIndex}_start`;
        const endKey = `filter_${filterIndex}_end`;
        replacements[startKey] = validVals[0];
        replacements[endKey] = validVals[1];

        if (isCrossViewFilter) {
          const candidates = new Set();
          if (field.parent_match_field) candidates.add(field.parent_match_field);

          const cleanSourceTable = (field.filter_table_name || "").replace(/^v_/, "");
          if (cleanSourceTable) {
            candidates.add(`${cleanSourceTable}_date`);
            candidates.add(`${cleanSourceTable}_at`);
            candidates.add(`created_at`);
          }

          const cleanLabel = (field.label || "").toLowerCase().replace(/\s+/g, "_");
          if (cleanLabel) {
            candidates.add(cleanLabel);
            candidates.add(`${cleanLabel}_date`);
            candidates.add(`${cleanLabel}_at`);
          }

          if (field.id) {
            candidates.add(field.id);
          }

          const candList = Array.from(candidates).filter(Boolean);

          if (candList.length > 0) {
            const matchClauses = candList.map(
              (col) => `(
                (to_jsonb(${tableName}) ->> '${col}') IS NOT NULL
                AND ((to_jsonb(${tableName}) ->> '${col}')::text >= :${startKey}
                     AND (to_jsonb(${tableName}) ->> '${col}')::text <= (:${endKey} || ' 23:59:59.999'))
              )`
            );
            const notFoundClauses = candList.map(
              (col) => `NOT (to_jsonb(${tableName}) ? '${col}')`
            );

            whereClause += ` AND (
              ${matchClauses.join(" OR ")}
              OR (${notFoundClauses.join(" AND ")})
            )`;
          } else {
            whereClause += ` AND (
              CAST(${field.id} AS TIMESTAMP) >= CAST(:${startKey} AS TIMESTAMP)
              AND CAST(${field.id} AS TIMESTAMP) <= CAST(:${endKey} AS TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 millisecond'
            )`;
          }
        } else {
          whereClause += ` AND (
            CAST(${field.id} AS TIMESTAMP) >= CAST(:${startKey} AS TIMESTAMP)
            AND CAST(${field.id} AS TIMESTAMP) <= CAST(:${endKey} AS TIMESTAMP) + INTERVAL '1 day' - INTERVAL '1 millisecond'
          )`;
        }

        filterIndex++;
        return;
      }

      if (isSingleDate) {
        const dateKey = `filter_${filterIndex}_date`;
        replacements[dateKey] = validVals[0];

        if (isCrossViewFilter) {
          const candidates = new Set();
          if (field.parent_match_field) candidates.add(field.parent_match_field);
          if (field.id) candidates.add(field.id);

          const cleanLabel = (field.label || "").toLowerCase().replace(/\s+/g, "_");
          if (cleanLabel) {
            candidates.add(cleanLabel);
            candidates.add(`${cleanLabel}_date`);
          }

          const candList = Array.from(candidates).filter(Boolean);
          if (candList.length > 0) {
            const matchClauses = candList.map(
              (col) => `(
                (to_jsonb(${tableName}) ->> '${col}') IS NOT NULL
                AND ((to_jsonb(${tableName}) ->> '${col}')::text >= :${dateKey}
                     AND (to_jsonb(${tableName}) ->> '${col}')::text <= (:${dateKey} || ' 23:59:59.999'))
              )`
            );
            const notFoundClauses = candList.map(
              (col) => `NOT (to_jsonb(${tableName}) ? '${col}')`
            );
            whereClause += ` AND (
              ${matchClauses.join(" OR ")}
              OR (${notFoundClauses.join(" AND ")})
            )`;
          } else {
            whereClause += ` AND CAST(${field.id} AS DATE) = CAST(:${dateKey} AS DATE)`;
          }
        } else {
          whereClause += ` AND CAST(${field.id} AS DATE) = CAST(:${dateKey} AS DATE)`;
        }

        filterIndex++;
        return;
      }

      const key = `filter_${filterIndex}`;
      replacements[key] = validVals;

      if (isCrossViewFilter) {
        // Collect candidate column names that this filter could map to in the target table
        const candidates = new Set();
        if (field.parent_match_field) candidates.add(field.parent_match_field);

        const cleanSourceTable = (field.filter_table_name || "").replace(/^v_/, "");
        if (cleanSourceTable) {
          candidates.add(`${cleanSourceTable}_id`);
          candidates.add(`${cleanSourceTable}_name`);
          candidates.add(`t_${cleanSourceTable}_id`);
        }

        const cleanLabel = (field.label || "").toLowerCase().replace(/\s+/g, "_");
        if (cleanLabel) {
          candidates.add(`${cleanLabel}_id`);
          candidates.add(`${cleanLabel}_name`);
          candidates.add(cleanLabel);
          candidates.add(`t${cleanLabel}_id`);
        }

        if (field.id && field.id !== "id") {
          candidates.add(field.id);
        }

        const candList = Array.from(candidates).filter(Boolean);

        if (candList.length > 0) {
          const matchClauses = candList.map(
            (col) => `((to_jsonb(${tableName}) ->> '${col}') IN (:${key}))`
          );
          const notFoundClauses = candList.map(
            (col) => `NOT (to_jsonb(${tableName}) ? '${col}')`
          );

          whereClause += ` AND (
            ${matchClauses.join(" OR ")}
            OR (${notFoundClauses.join(" AND ")})
          )`;
        } else {
          whereClause += ` AND ${getFieldExpr(field)} IN (:${key})`;
        }
      } else {
        whereClause += ` AND ${getFieldExpr(field)} IN (:${key})`;
      }

      filterIndex++;
    }
  };

  filters.forEach(addFilterForField);
  rows.forEach(addFilterForField);
  columns.forEach(addFilterForField);

  const notNullChecks = [
    ...rowExprs.map((f) => `${f.expr} IS NOT NULL`),
    ...colExprs.map((f) => `${f.expr} IS NOT NULL`),
  ];
  if (notNullChecks.length > 0) {
    whereClause += ` AND ${notNullChecks.join(" AND ")}`;
  }

  const allGroupExprs = [...rowExprs, ...colExprs].map((f) => f.expr);

  const dimensionSelects = [...rowExprs, ...colExprs].map(
    (f) => `COALESCE(${f.expr}::TEXT, 'ZZZZ') AS ${f.id}`
  );
  const aggSelects = valueAggs.map((v) => `${v.expr} AS ${v.alias}`);
  const valueJsonParts = valueAggs.flatMap((v) => [`'${v.alias}'`, v.expr]);
  const valueJsonSelect = `json_build_object(${valueJsonParts.join(", ")}) AS value_json`;
  const lateralJoinClauses = Array.from(lateralJoins.values());

  let sql = `
    SELECT
      ${[...dimensionSelects, ...aggSelects, valueJsonSelect].join(",\n      ")}
    FROM ${tableName}
    ${lateralJoinClauses.length ? ", " + lateralJoinClauses.join(", ") : ""}
    WHERE ${whereClause}
    ${
      allGroupExprs.length
        ? `GROUP BY CUBE (${allGroupExprs.join(", ")})
    ORDER BY ${allGroupExprs.join(", ")}`
        : ""
    }
  `;

  if (colExprs.length > 0) {
    const reversedCols = [...colExprs].reverse();
    let tableAlias = "t0";

    for (let wrapIndex = 0; wrapIndex < colExprs.length; wrapIndex++) {
      const currentColField = reversedCols[wrapIndex];
      const remainingCols = colExprs.slice(0, colExprs.length - (wrapIndex + 1));

      const rowSelects = rowExprs.map(
        (r) => `COALESCE(${tableAlias}.${r.id}::TEXT, 'ZZZZ') AS ${r.id}`
      );
      const remainingColSelects = remainingCols.map((c) => `${tableAlias}.${c.id}`);
      const totalSelects = valueAggs.map((v) => {
        const sourceField = wrapIndex === 0 ? v.alias : `total_${v.alias}`;
        return `SUM(${tableAlias}.${sourceField}) AS total_${v.alias}`;
      });

      const outputAlias = wrapIndex === colExprs.length - 1 ? "pivoted_values" : "value_json";
      const jsonAggSelect = `json_agg(json_build_object(${tableAlias}.${currentColField.id}, ${tableAlias}.value_json)) AS ${outputAlias}`;

      const allSelects = [...rowSelects, ...remainingColSelects, ...totalSelects, jsonAggSelect];
      const groupByFields = [
        ...rowExprs.map((r) => `${tableAlias}.${r.id}`),
        ...remainingCols.map((c) => `${tableAlias}.${c.id}`),
      ].filter(Boolean);

      sql = `
        SELECT ${allSelects.join(", ")}
        FROM (${sql}) ${tableAlias}
        WHERE ${tableAlias}.${currentColField.id} != 'ZZZZ'
        ${groupByFields.length ? `GROUP BY ${groupByFields.join(", ")} ORDER BY ${groupByFields.join(", ")}` : ""}
      `;

      tableAlias = `t${wrapIndex + 1}`;
    }
  }

  if (rowExprs.length > 1) {
    const subtotalFilters = rowExprs
      .slice(0, rowExprs.length - 1)
      .map((r) => `t.${r.id} != 'ZZZZ'`);
    sql = `
      SELECT t.*
      FROM (${sql}) t
      WHERE ${subtotalFilters.join(" AND ")}
    `;
  }

  return { sql, replacements, colExprs, rowExprs, valueAggs };
};

// ---------------------------------------------------------------------------
// Controller methods
// ---------------------------------------------------------------------------
const pivotController = {
  getTables: async (req, res, next) => {
    try {
      let views = [];
      try {
        // Query only SQL Views from information_schema.views joined with metadata from app_database_views
        const sql = `
          SELECT 
            v.table_name,
            adv.view_name
          FROM information_schema.views v
          LEFT JOIN (
            SELECT database_view_name, view_name FROM public.app_database_views WHERE is_active = TRUE
          ) adv ON adv.database_view_name = v.table_name
          WHERE v.table_schema = 'public'
          ORDER BY COALESCE(adv.view_name, v.table_name) ASC;
        `;
        views = await sequelize.query(sql, {
          type: sequelize.QueryTypes.SELECT,
        });
      } catch (e) {
        // Fallback to pure information_schema.views
        const fallbackSql = `
          SELECT table_name
          FROM information_schema.views
          WHERE table_schema = 'public'
          ORDER BY table_name ASC;
        `;
        views = await sequelize.query(fallbackSql, {
          type: sequelize.QueryTypes.SELECT,
        });
      }

      const formattedViews = views.map((view) => {
        const viewName = view.table_name;
        const displayName = view.view_name || viewName
          .replace(/^(v_|vw_|view_)/i, "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        return {
          id: viewName,
          label: displayName,
        };
      });

      res.status(200).json({ status: true, data: formattedViews });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  getColumns: async (req, res, next) => {
    try {
      const { tableName } = req.params;
      const cleanTableName = (tableName || "").replace(/["']/g, "").trim();

      const sql = `
        SELECT 
            a.attname AS column_name,
            format_type(a.atttypid, a.atttypmod) AS data_type
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND LOWER(c.relname) = LOWER(:tableName)
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum;
      `;

      let columns = await sequelize.query(sql, {
        replacements: { tableName: cleanTableName },
        type: sequelize.QueryTypes.SELECT,
      });

      // Fallback to information_schema if pg_attribute returned empty
      if (!columns || columns.length === 0) {
        const fallbackSql = `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE LOWER(table_name) = LOWER(:tableName)
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `;
        columns = await sequelize.query(fallbackSql, {
          replacements: { tableName: cleanTableName },
          type: sequelize.QueryTypes.SELECT,
        });
      }

      const formattedColumns = columns.map((c) => {
        let type = "text";
        const dt = (c.data_type || "").toLowerCase();
        if (
          dt.includes("int") ||
          dt.includes("numeric") ||
          dt.includes("real") ||
          dt.includes("double") ||
          dt.includes("float") ||
          dt.includes("decimal") ||
          dt.includes("bigint")
        ) {
          type = "number";
        } else if (dt.includes("date") || dt.includes("timestamp") || dt.includes("time")) {
          type = "date";
        } else if (dt.includes("json")) {
          type = "json";
        }

        return {
          id: c.column_name,
          label: c.column_name.replace(/_/g, " ").toUpperCase(),
          type,
        };
      });

      res.status(200).json({ status: true, data: formattedColumns });
    } catch (error) {
      console.error("getColumns error:", error);
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  getFieldValues: async (req, res, next) => {
    try {
      const { tableName, columnName } = req.params;
      const { search = "", labelColumn, parent_field, parent_value, parent_values } = req.query;

      const cleanTableName = (tableName || "").replace(/["']/g, "").trim();
      const cleanColName = (columnName || "").replace(/["']/g, "").trim();
      const cleanLabelCol = labelColumn ? (labelColumn || "").replace(/["']/g, "").trim() : null;

      const [colInfo] = await sequelize.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = :tableName AND column_name = :columnName`,
        {
          replacements: { tableName: cleanTableName, columnName: cleanColName },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      let effectiveLabelCol = cleanLabelCol;
      if (!effectiveLabelCol || effectiveLabelCol === cleanColName) {
        if (cleanColName === "id" || cleanColName.endsWith("_id")) {
          const [nameCol] = await sequelize.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE LOWER(table_name) = LOWER(:tableName)
               AND (
                 column_name ILIKE '%name%' 
                 OR column_name ILIKE '%title%' 
                 OR column_name ILIKE '%label%'
                 OR column_name ILIKE '%desc%'
               )
               AND column_name NOT ILIKE '%id'
             ORDER BY ordinal_position
             LIMIT 1`,
            {
              replacements: { tableName: cleanTableName },
              type: sequelize.QueryTypes.SELECT,
            }
          );
          if (nameCol?.column_name) {
            effectiveLabelCol = nameCol.column_name;
          }
        }
      }

      const cleanParentField = (parent_field || "").replace(/["']/g, "").trim();
      let parentWhereClause = "";
      const replacements = { search: `%${search}%` };

      let parentValList = [];
      if (parent_values) {
        parentValList = typeof parent_values === "string" ? parent_values.split(",").map((v) => v.trim()).filter(Boolean) : (Array.isArray(parent_values) ? parent_values : [parent_values]);
      } else if (parent_value) {
        parentValList = [String(parent_value).trim()];
      }

      if (cleanParentField && parentValList.length > 0) {
        parentWhereClause = ` AND ((to_jsonb(${cleanTableName}) ->> '${cleanParentField}') IN (:parentValList))`;
        replacements.parentValList = parentValList;
      }

      // Permission Scoping for Dropdown Options (ABAC)
      const userScopes = req.user?.scopes || {};
      const isConfigurator = req.user?.isConfigurator || req.user?.role_slug === "admin";
      let scopeWhereClause = "";
      if (!isConfigurator && userScopes && typeof userScopes === "object") {
        Object.entries(userScopes).forEach(([scopeKey, allowedVals]) => {
          if (Array.isArray(allowedVals) && allowedVals.length > 0) {
            const replKey = `scope_${scopeKey}`;
            scopeWhereClause += ` AND (
              ((to_jsonb(${cleanTableName}) ->> '${scopeKey}') IN (:${replKey}))
              OR NOT (to_jsonb(${cleanTableName}) ? '${scopeKey}')
            )`;
            replacements[replKey] = allowedVals.map(String);
          }
        });
      }

      const combinedWhere = `${parentWhereClause} ${scopeWhereClause}`;

      const isDateCol = (colInfo?.data_type || "").includes("time") || (colInfo?.data_type || "").includes("date") || cleanColName.endsWith("_at") || cleanColName.endsWith("_date") || cleanColName === "date";
      const dateGrp = (req.query.dateGrouping || "").toLowerCase();

      let sql;
      if (colInfo && ["json", "jsonb"].includes(colInfo.data_type)) {
        sql = `
          SELECT DISTINCT trim(value) as value, trim(value) as label, COUNT(*) as count
          FROM ${cleanTableName}, LATERAL jsonb_array_elements_text(${cleanColName}::jsonb) as value
          WHERE trim(value) ILIKE :search ${combinedWhere}
          GROUP BY trim(value)
          ORDER BY count DESC
          LIMIT 200
        `;
      } else if (isDateCol && dateGrp && dateGrp !== "raw") {
        let dateExpr = `TO_CHAR(CAST(${cleanColName} AS TIMESTAMP), 'YYYY-Mon')`;
        if (dateGrp === "year") dateExpr = `TO_CHAR(CAST(${cleanColName} AS TIMESTAMP), 'YYYY')`;
        else if (dateGrp === "quarter") dateExpr = `'Q' || TO_CHAR(CAST(${cleanColName} AS TIMESTAMP), 'Q YYYY')`;
        else if (dateGrp === "fy" || dateGrp === "financial_year") dateExpr = `CASE WHEN EXTRACT(MONTH FROM CAST(${cleanColName} AS TIMESTAMP)) >= 4 THEN 'FY ' || TO_CHAR(CAST(${cleanColName} AS TIMESTAMP), 'YY') || '-' || TO_CHAR(CAST(${cleanColName} AS TIMESTAMP) + INTERVAL '1 year', 'YY') ELSE 'FY ' || TO_CHAR(CAST(${cleanColName} AS TIMESTAMP) - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CAST(${cleanColName} AS TIMESTAMP), 'YY') END`;
        else if (dateGrp === "day") dateExpr = `TO_CHAR(CAST(${cleanColName} AS TIMESTAMP), 'YYYY-MM-DD')`;

        sql = `
          SELECT ${dateExpr} as value, ${dateExpr} as label, COUNT(*) as count
          FROM ${cleanTableName}
          WHERE ${cleanColName} IS NOT NULL AND CAST(${dateExpr} AS TEXT) ILIKE :search ${combinedWhere}
          GROUP BY ${dateExpr}
          ORDER BY ${dateExpr} DESC
          LIMIT 200
        `;
      } else if (effectiveLabelCol && effectiveLabelCol !== cleanColName) {
        sql = `
          SELECT ${cleanColName} as value, ${effectiveLabelCol} as label, COUNT(*) as count
          FROM ${cleanTableName}
          WHERE ${cleanColName} IS NOT NULL AND ${effectiveLabelCol} IS NOT NULL AND CAST(${effectiveLabelCol} AS TEXT) ILIKE :search ${combinedWhere}
          GROUP BY ${cleanColName}, ${effectiveLabelCol}
          ORDER BY ${effectiveLabelCol} ASC
          LIMIT 200
        `;
      } else {
        sql = `
          SELECT ${cleanColName} as value, ${cleanColName} as label, COUNT(*) as count
          FROM ${cleanTableName}
          WHERE ${cleanColName} IS NOT NULL AND CAST(${cleanColName} AS TEXT) ILIKE :search ${combinedWhere}
          GROUP BY ${cleanColName}
          ORDER BY count DESC
          LIMIT 200
        `;
      }

      const values = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      res.status(200).json({ status: true, data: values });
    } catch (error) {
      console.error("getFieldValues error:", error);
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  // Dedicated API for Dashboard Top Filter Dropdowns (with cascading and ABAC role permissions)
  getFilterFieldOptions: async (req, res, next) => {
    try {
      const {
        tableName,
        valueField,
        columnName,
        field,
        labelField,
        labelColumn,
        parentField,
        parent_field,
        parentValues,
        parent_values,
        search = "",
      } = req.body || {};

      const cleanTableName = (tableName || "").replace(/["']/g, "").trim();
      const cleanValCol = (valueField || field || columnName || "id").replace(/["']/g, "").trim();
      let cleanLabelCol = (labelField || labelColumn || cleanValCol).replace(/["']/g, "").trim();
      const cleanParentField = (parentField || parent_field || "").replace(/["']/g, "").trim();

      if (!cleanTableName) {
        return res.status(200).json({ status: true, data: [] });
      }

      // Auto-detect human readable label column if label is identical to an ID column
      if (cleanLabelCol === cleanValCol && (cleanValCol === "id" || cleanValCol.endsWith("_id"))) {
        const [nameCol] = await sequelize.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE LOWER(table_name) = LOWER(:tableName)
             AND (
               column_name ILIKE '%name%' 
               OR column_name ILIKE '%title%' 
               OR column_name ILIKE '%label%'
               OR column_name ILIKE '%desc%'
             )
             AND column_name NOT ILIKE '%id'
           ORDER BY ordinal_position
           LIMIT 1`,
          {
            replacements: { tableName: cleanTableName },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        if (nameCol?.column_name) {
          cleanLabelCol = nameCol.column_name;
        }
      }

      const replacements = { search: `%${search}%` };
      let parentWhereClause = "";

      let parentValList = [];
      const rawParentVals = parentValues || parent_values;
      if (rawParentVals) {
        parentValList = Array.isArray(rawParentVals)
          ? rawParentVals.map(String).filter(Boolean)
          : String(rawParentVals).split(",").map((v) => v.trim()).filter(Boolean);
      }

      if (cleanParentField && parentValList.length > 0) {
        parentWhereClause = ` AND ((to_jsonb(${cleanTableName}) ->> '${cleanParentField}') IN (:parentValList))`;
        replacements.parentValList = parentValList;
      }

      // Permission Scoping (ABAC)
      const userScopes = req.user?.scopes || {};
      const isConfigurator = req.user?.isConfigurator || req.user?.role_slug === "admin";
      let scopeWhereClause = "";
      if (!isConfigurator && userScopes && typeof userScopes === "object") {
        Object.entries(userScopes).forEach(([scopeKey, allowedVals]) => {
          if (Array.isArray(allowedVals) && allowedVals.length > 0) {
            const replKey = `scope_${scopeKey}`;
            scopeWhereClause += ` AND (
              ((to_jsonb(${cleanTableName}) ->> '${scopeKey}') IN (:${replKey}))
              OR NOT (to_jsonb(${cleanTableName}) ? '${scopeKey}')
            )`;
            replacements[replKey] = allowedVals.map(String);
          }
        });
      }

      const combinedWhere = `${parentWhereClause} ${scopeWhereClause}`;

      let sql;
      if (cleanLabelCol && cleanLabelCol !== cleanValCol) {
        sql = `
          SELECT 
            CAST(${cleanValCol} AS TEXT) as value, 
            CAST(${cleanLabelCol} AS TEXT) as label, 
            COUNT(*) as count
          FROM ${cleanTableName}
          WHERE ${cleanValCol} IS NOT NULL 
            AND ${cleanLabelCol} IS NOT NULL 
            AND CAST(${cleanLabelCol} AS TEXT) ILIKE :search
            ${combinedWhere}
          GROUP BY ${cleanValCol}, ${cleanLabelCol}
          ORDER BY ${cleanLabelCol} ASC
          LIMIT 300
        `;
      } else {
        sql = `
          SELECT 
            CAST(${cleanValCol} AS TEXT) as value, 
            CAST(${cleanValCol} AS TEXT) as label, 
            COUNT(*) as count
          FROM ${cleanTableName}
          WHERE ${cleanValCol} IS NOT NULL 
            AND CAST(${cleanValCol} AS TEXT) ILIKE :search
            ${combinedWhere}
          GROUP BY ${cleanValCol}
          ORDER BY count DESC
          LIMIT 300
        `;
      }

      const rows = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      return res.status(200).json({
        status: true,
        message: "Filter options fetched successfully",
        data: rows.map((r) => ({
          value: String(r.value || "").trim(),
          label: String(r.label || r.value || "").trim(),
        })),
      });
    } catch (error) {
      console.error("getFilterFieldOptions error:", error);
      return next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  executePivot: async (req, res, next) => {
    try {
      const { tableName, zones } = req.body;
      const normalizedZones = zones || {
        rows: req.body.rows || [],
        columns: req.body.columns || [],
        values: req.body.values || [],
        filters: req.body.filters || [],
      };
      const { rows = [], values = [] } = normalizedZones;

      if (!rows.length && !values.length) {
        return res.status(200).json({ status: true, data: [] });
      }

      const userContext = {
        userId: req.user?.id || req.user?.user_id || req.user?.usr_id,
        isConfigurator: req.user?.isConfigurator || req.user?.role_slug === 'admin',
        roleSlug: req.user?.role_slug,
        dataScope: req.body.dataScope || req.body.data_scope || 'all',
        masterField: req.body.masterField || req.body.master_field || null,
        scopes: req.user?.scopes || req.body.scopes || {},
        ...req.user,
      };

      const { sql, replacements, colExprs, valueAggs } = buildPivotQuery(tableName, normalizedZones, userContext);

      const data = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      const rawAggAliases = new Set(valueAggs.map((v) => v.alias));

      let formattedData = data;
      if (colExprs.length > 0) {
        formattedData = data.map((row) => {
          const newRow = { ...row };

          if (typeof newRow.pivoted_values === "string") {
            try {
              newRow.pivoted_values = JSON.parse(newRow.pivoted_values);
            } catch (_) {
              newRow.pivoted_values = null;
            }
          }

          if (newRow.pivoted_values) {
            const flattened = flattenPivotedValues(newRow.pivoted_values);
            Object.assign(newRow, flattened);
            delete newRow.pivoted_values;
          }

          rawAggAliases.forEach((alias) => delete newRow[alias]);
          delete newRow.value_json;
          return newRow;
        });
      } else {
        formattedData = data.map((row) => {
          const newRow = { ...row };
          if (typeof newRow.value_json === "string") {
            try {
              newRow.value_json = JSON.parse(newRow.value_json);
            } catch (_) {}
          }
          delete newRow.value_json;
          return newRow;
        });
      }

      res.status(200).json({ status: true, data: formattedData });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { tableName, zones } = req.body;
      const normalizedZones = zones || {
        rows: req.body.rows || [],
        columns: req.body.columns || [],
        values: req.body.values || [],
        filters: req.body.filters || [],
      };
      const { rows = [], values = [] } = normalizedZones;

      if (!rows.length && !values.length) {
        return res.status(400).json({ status: false, message: "No rows or values selected" });
      }

      const { sql, replacements, colExprs, valueAggs } = buildPivotQuery(tableName, normalizedZones);

      const data = await sequelize.query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });

      const rawAggAliases = new Set(valueAggs.map((v) => v.alias));

      let excelData = data;
      if (colExprs.length > 0) {
        excelData = data.map((row) => {
          const newRow = { ...row };
          if (typeof newRow.pivoted_values === "string") {
            try {
              newRow.pivoted_values = JSON.parse(newRow.pivoted_values);
            } catch (_) {
              newRow.pivoted_values = null;
            }
          }
          if (newRow.pivoted_values) {
            const flattened = flattenPivotedValues(newRow.pivoted_values);
            Object.assign(newRow, flattened);
            delete newRow.pivoted_values;
          }
          rawAggAliases.forEach((alias) => delete newRow[alias]);
          delete newRow.value_json;
          return newRow;
        });
      } else {
        excelData = data.map((row) => {
          const newRow = { ...row };
          if (typeof newRow.value_json === "string") {
            try {
              newRow.value_json = JSON.parse(newRow.value_json);
            } catch (_) {}
          }
          delete newRow.value_json;
          return newRow;
        });
      }

      const rowFields = zones.rows || [];
      const colFields = zones.columns || [];
      const rowKeys = rowFields.map((r) => (r.type === "json" ? `${r.id}_value` : r.id));
      const allKeys = Object.keys(excelData[0] || {});
      const pivotKeys = allKeys.filter(
        (k) =>
          k !== "value_json" &&
          k !== "pivoted_values" &&
          !rowKeys.includes(k) &&
          !k.startsWith("total_")
      );
      const sortedPivotKeys = [...pivotKeys].sort((a, b) => a.localeCompare(b));
      const numHeaderRows = colFields.length > 0 ? colFields.length + 1 : 1;
      const headerAOA = Array.from({ length: numHeaderRows }, () => []);
      const merges = [];

      for (let r = 0; r < numHeaderRows; r++) {
        rowFields.forEach((rowField) => {
          if (colFields.length > 0) {
            if (r < colFields.length) {
              headerAOA[r].push(`${colFields[r].label.toUpperCase()} ➔`);
            } else {
              headerAOA[r].push(`${rowField.label.toUpperCase()} 🠗`);
            }
          } else {
            headerAOA[r].push(rowField.label.toUpperCase());
          }
        });
      }

      const getHeaderRowCells = (r) => {
        const cells = [];
        let currentCell = null;
        sortedPivotKeys.forEach((key) => {
          let title = "";
          if (key.startsWith("total_")) {
            title = r === numHeaderRows - 1 ? key.replace(/_/g, " ").toUpperCase() : "TOTAL ➔";
          } else {
            const parts = key.split(" - ");
            title =
              r === numHeaderRows - 1
                ? parts[parts.length - 1].replace(/_/g, " ").toUpperCase()
                : parts[r] === "ZZZZ"
                ? "SUB TOTAL"
                : parts[r];
          }
          let parentPath = "";
          if (!key.startsWith("total_") && r > 0) {
            const parts = key.split(" - ");
            parentPath = parts.slice(0, r).join(" - ");
          }
          const matchKey = parentPath ? `${parentPath} || ${title}` : title;
          if (currentCell && currentCell.matchKey === matchKey) {
            currentCell.colSpan += 1;
          } else {
            if (currentCell) cells.push(currentCell);
            currentCell = { title, colSpan: 1, rowSpan: 1, matchKey };
          }
        });
        if (currentCell) cells.push(currentCell);
        return cells;
      };

      for (let r = 0; r < numHeaderRows; r++) {
        const cells = getHeaderRowCells(r);
        let colIdx = rowFields.length;
        cells.forEach((cell) => {
          headerAOA[r].push(cell.title);
          for (let c = 1; c < cell.colSpan; c++) headerAOA[r].push("");
          if (cell.colSpan > 1 || cell.rowSpan > 1) {
            merges.push({
              s: { r, c: colIdx },
              e: { r: r + cell.rowSpan - 1, c: colIdx + cell.colSpan - 1 },
            });
          }
          colIdx += cell.colSpan;
        });
      }

      const dataAOA = excelData.map((row) => {
        const rowData = [];
        rowKeys.forEach((rk) => {
          const val = row[rk];
          rowData.push(val === "ZZZZ" || val === "TOTAL" ? "TOTAL" : val ?? "");
        });
        sortedPivotKeys.forEach((pk) => rowData.push(row[pk] ?? ""));
        return rowData;
      });

      const totalAOA = [...headerAOA, ...dataAOA];
      const worksheet = xlsx.utils.aoa_to_sheet(totalAOA);
      if (merges.length > 0) worksheet["!merges"] = merges;

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Pivot Data");
      const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", 'attachment; filename="pivot_report.xlsx"');
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.status(200).send(buffer);
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  saveReport: async (req, res, next) => {
    try {
      const { id, reportName, tableName, zones, chartType } = req.body;
      const title = (reportName || req.body.title || "").trim();
      const targetTable = tableName || req.body.table_name;
      const targetConfig = zones || req.body.configuration;
      const targetChartType = chartType || req.body.chart_type || "none";

      if (!title || !targetTable || !targetConfig) {
        return res.status(400).json({ status: false, message: "Missing required fields" });
      }

      // Generate the raw SQL query for this widget configuration
      let rawQuery = "";
      try {
        const built = buildPivotQuery(targetTable, targetConfig, {
          userId: req.user ? req.user.userId : 0,
          isConfigurator: true,
          dataScope: "all",
        });
        rawQuery = (built?.sql || "").trim();
      } catch (e) {
        console.error("Error building raw query on widget save:", e.message);
      }

      let widget;
      if (id) {
        widget = await CustomDashboardWidgetsModel.findOne({
          where: { tcdw_id: id, tcdw_deleted_at: null },
        });
      }

      if (widget) {
        widget.tcdw_title = title;
        widget.tcdw_table_name = targetTable;
        widget.tcdw_configuration = targetConfig;
        widget.tcdw_chart_type = targetChartType;
        widget.tcdw_raw_query = rawQuery;
        widget.tcdw_query = rawQuery;
        widget.tcdw_updated_by = req.user ? req.user.userId : 0;
        widget.changed("tcdw_configuration", true);
        await widget.save();
        return res.status(200).json({
          status: true,
          message: "Widget updated successfully",
          data: {
            id: widget.tcdw_id,
            tcdw_id: widget.tcdw_id,
            tdw_id: widget.tcdw_id,
            tpsr_id: widget.tcdw_id,
            title: widget.tcdw_title,
            report_name: widget.tcdw_title,
            table_name: widget.tcdw_table_name,
            configuration: widget.tcdw_configuration,
            chart_type: widget.tcdw_chart_type,
            raw_query: widget.tcdw_raw_query,
            query: widget.tcdw_query,
          },
        });
      }

      const newWidget = await CustomDashboardWidgetsModel.create({
        tcdw_title: title,
        tcdw_table_name: targetTable,
        tcdw_configuration: targetConfig,
        tcdw_chart_type: targetChartType,
        tcdw_raw_query: rawQuery,
        tcdw_query: rawQuery,
        tcdw_created_by: req.user ? req.user.userId : 0,
        tcdw_updated_by: req.user ? req.user.userId : 0,
      });

      res.status(200).json({
        status: true,
        message: "Widget saved successfully",
        data: {
          id: newWidget.tcdw_id,
          tcdw_id: newWidget.tcdw_id,
          tdw_id: newWidget.tcdw_id,
          tpsr_id: newWidget.tcdw_id,
          title: newWidget.tcdw_title,
          report_name: newWidget.tcdw_title,
          table_name: newWidget.tcdw_table_name,
          configuration: newWidget.tcdw_configuration,
          chart_type: newWidget.tcdw_chart_type,
          raw_query: newWidget.tcdw_raw_query,
          query: newWidget.tcdw_query,
        },
      });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  getSavedReports: async (req, res, next) => {
    try {
      const widgets = await CustomDashboardWidgetsModel.findAll({
        where: { tcdw_is_active: true, tcdw_deleted_at: null },
        order: [
          ["tcdw_order", "ASC"],
          ["tcdw_created_at", "DESC"],
        ],
      });

      const parsedWidgets = widgets.map((r) => ({
        id: r.tcdw_id,
        tcdw_id: r.tcdw_id,
        tdw_id: r.tcdw_id,
        tpsr_id: r.tcdw_id,
        title: r.tcdw_title,
        report_name: r.tcdw_title,
        table_name: r.tcdw_table_name,
        chart_type: r.tcdw_chart_type,
        raw_query: r.tcdw_raw_query || r.tcdw_query || "",
        query: r.tcdw_query || r.tcdw_raw_query || "",
        configuration:
          typeof r.tcdw_configuration === "string"
            ? JSON.parse(r.tcdw_configuration)
            : r.tcdw_configuration,
        created_at: r.tcdw_created_at,
      }));

      res.status(200).json({ status: true, data: parsedWidgets });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  getAllReports: async (req, res, next) => {
    try {
      const widgets = await CustomDashboardWidgetsModel.findAll({
        where: { tcdw_deleted_at: null },
        order: [
          ["tcdw_order", "ASC"],
          ["tcdw_created_at", "DESC"],
        ],
      });

      const parsedWidgets = widgets.map((r) => ({
        id: r.tcdw_id,
        tcdw_id: r.tcdw_id,
        tdw_id: r.tcdw_id,
        tpsr_id: r.tcdw_id,
        title: r.tcdw_title,
        report_name: r.tcdw_title,
        table_name: r.tcdw_table_name,
        chart_type: r.tcdw_chart_type,
        raw_query: r.tcdw_raw_query || r.tcdw_query || "",
        query: r.tcdw_query || r.tcdw_raw_query || "",
        is_active: r.tcdw_is_active,
        order: r.tcdw_order,
        configuration:
          typeof r.tcdw_configuration === "string"
            ? JSON.parse(r.tcdw_configuration)
            : r.tcdw_configuration,
        created_at: r.tcdw_created_at,
      }));

      res.status(200).json({ status: true, data: parsedWidgets });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  toggleReportStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const widget = await CustomDashboardWidgetsModel.findByPk(id);

      if (!widget) {
        return res.status(404).json({ status: false, message: "Widget not found" });
      }

      await CustomDashboardWidgetsModel.update(
        { tcdw_is_active: !widget.tcdw_is_active },
        { where: { tcdw_id: id } }
      );

      res.status(200).json({ status: true, message: "Widget status updated successfully" });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  deleteReport: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if widget is in use by any active / non-deleted dashboards
      const isWidgetInLayout = (layout, widgetId) => {
        if (!layout) return false;
        let parsed = layout;
        if (typeof layout === "string") {
          try {
            parsed = JSON.parse(layout);
          } catch {
            return false;
          }
        }
        if (!parsed || (typeof parsed !== "object" && !Array.isArray(parsed))) return false;

        const targetIdStr = String(widgetId).trim().toLowerCase();

        const traverse = (node) => {
          if (!node || typeof node !== "object") return false;

          if (Array.isArray(node)) {
            for (const el of node) {
              if (traverse(el)) return true;
            }
            return false;
          }

          const possibleIds = [
            node.widgetId,
            node.widget_id,
            node.tcdw_id,
            node.tdw_id,
            node.tpsr_id,
            node.type === "library-widget" ? node.id : null,
            node.widget ? (node.widget.id || node.widget.tcdw_id || node.widget.tpsr_id) : null,
            node.widgetId || (node.table_name && node.id ? node.id : null),
          ].filter(Boolean);

          for (const pid of possibleIds) {
            if (String(pid).trim().toLowerCase() === targetIdStr) {
              return true;
            }
          }

          if (node.instanceId && node.id && String(node.id).trim().toLowerCase() === targetIdStr) {
            return true;
          }

          for (const key of Object.keys(node)) {
            const val = node[key];
            if (val && typeof val === "object") {
              if (traverse(val)) return true;
            }
          }
          return false;
        };

        return traverse(parsed);
      };

      const activeDashboards = await DashboardBuilderModel.findAll({
        where: { tdb_deleted_at: null },
      });

      const matchedDashboards = [];
      for (const dash of activeDashboards) {
        if (isWidgetInLayout(dash.tdb_widgets_layout, id)) {
          matchedDashboards.push({
            id: dash.tdb_id,
            name: dash.tdb_name || "Untitled Dashboard",
            description: dash.tdb_description || "",
            is_active: dash.tdb_is_active,
          });
        }
      }

      if (matchedDashboards.length > 0) {
        const dashboardNames = matchedDashboards.map((d) => `"${d.name}"`).join(", ");
        return res.status(400).json({
          status: false,
          code: "WIDGET_IN_USE",
          message: `Cannot delete widget. It is currently being used in ${matchedDashboards.length} dashboard(s): ${dashboardNames}. Please remove this widget from those dashboards first.`,
          data: {
            inUse: true,
            dashboards: matchedDashboards,
          },
        });
      }

      await CustomDashboardWidgetsModel.destroy({
        where: { tcdw_id: id },
      });

      // Also clean up any legacy table entries if present
      await sequelize.query(
        `DELETE FROM public.t_pivot_saved_reports WHERE tpsr_id = :id;`,
        { replacements: { id } }
      ).catch(() => {});

      res.status(200).json({ status: true, message: "Widget deleted successfully" });
    } catch (error) {
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },

  reorderReports: async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({ status: false, message: "Invalid payload" });
      }

      for (const item of items) {
        await CustomDashboardWidgetsModel.update(
          { tcdw_order: item.order },
          { where: { tcdw_id: item.id }, transaction }
        );
      }

      await transaction.commit();
      res.status(200).json({ status: true, message: "Widgets reordered successfully" });
    } catch (error) {
      await transaction.rollback();
      next(CustomErrorHandler.internalServerError(error.message));
    }
  },
};

module.exports = pivotController;
module.exports.buildPivotQuery = buildPivotQuery;
