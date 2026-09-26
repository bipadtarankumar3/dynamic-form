const { sequelize } = require("../config/db.config");
const { QueryTypes } = require("sequelize");
const escapeIdentifier = (identifier) => `"${identifier.replace(/"/g, '""')}"`;
class Datatables {
  static async build(
    req,
    sql,
    whereClause = "",
    bindParams = {},
    callback = null,
    groupBy = ""
  ) {
    const { draw, start, length, order, columns, search } = req.body;
    const searchValue = search?.value || "";
    const orderColumnIndex = order?.[0]?.column;
    const orderColumnName =
      orderColumnIndex !== undefined ? columns[orderColumnIndex]?.data : null;
    const orderDirection = order?.[0]?.dir || "ASC";

    // Step 1: Build search clause (no trailing AND)
    let searchQuery = this.buildSearchQuery(
      searchValue,
      columns,
      bindParams
    ).trim();

    if (searchQuery.endsWith("AND")) {
      searchQuery = searchQuery.slice(0, -3).trim(); // remove trailing AND
    }

    // Step 2: Build full WHERE clause
    let fullWhereClause = "";
    if (searchQuery && whereClause) {
      fullWhereClause = `WHERE (${searchQuery}) AND ${whereClause}`;
    } else if (searchQuery) {
      fullWhereClause = `WHERE (${searchQuery})`;
    } else if (whereClause) {
      fullWhereClause = `WHERE ${whereClause}`;
    } else {
      fullWhereClause = "WHERE 1=1";
    }

    return this.getResults(
      sql,
      whereClause,
      fullWhereClause,
      bindParams,
      orderColumnName,
      orderDirection,
      start,
      length,
      draw,
      groupBy
    );
  }

  static buildSearchQuery(searchValue, columns, bindParams) {
    if (!searchValue) return "";

    const searchConditions = [];
    searchValue = searchValue?.trim();
    columns.forEach((column, index) => {
      if (column.searchable === "true" && column.name) {
        const bindKey = `search_${index}`;
        const safeCol = escapeIdentifier(column.name);
        searchConditions.push(`CAST(${safeCol} AS TEXT) ILIKE $${bindKey}`);
        bindParams[bindKey] = `%${searchValue}%`; // wrapped with %
      }
    });

    if (searchConditions.length === 0) return "";

    return `(${searchConditions.join(" OR ")})`;
  }

  static async getResults(
    sql,
    defaultWhere,
    where,
    bindParams,
    orderBy,
    sortType,
    start,
    length,
    draw,
    groupBy
  ) {
    const groupByClause = groupBy ? `GROUP BY ${groupBy}` : "";

    // ✅ Enforce sortType to ASC/DESC only (case-insensitive)
    const isValidSortType =
      typeof sortType === "string" &&
      ["asc", "desc"].includes(sortType.toLowerCase());

    const safeSortType = isValidSortType ? sortType.toUpperCase() : null;

    // ✅ Validate pagination integers
    const safeLength = Number(length);
    const safeStart = Number(start);

    if (!Number.isInteger(safeLength) || !Number.isInteger(safeStart)) {
      throw new Error("Invalid pagination values");
    }

    bindParams.limit = safeLength;
    bindParams.offset = safeStart;

    // ✅ Conditionally build ORDER BY only when both are present and valid
    let paginationClause = "";
    if (orderBy && safeSortType) {
      paginationClause = `ORDER BY ${orderBy} ${safeSortType}`;
    }

    paginationClause += ` LIMIT $limit OFFSET $offset`;

    const paginatedSql = `${sql} ${where} ${groupByClause} ${paginationClause}`;
    const countSql = `${sql} ${where} ${groupByClause}`;

    const totalRecordsData = await sequelize.query(countSql, {
      type: QueryTypes.SELECT,
      bind: bindParams,
    });

    const totalRecords = totalRecordsData.length;

    const paginatedData = await sequelize.query(paginatedSql, {
      type: QueryTypes.SELECT,
      bind: bindParams,
    });

    return {
      draw: Number(draw),
      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,
      data: paginatedData,
    };
  }
}

module.exports = Datatables;
