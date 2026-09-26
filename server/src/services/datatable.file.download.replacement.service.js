const { sequelize } = require("../config/db.config");
const { QueryTypes } = require("sequelize");

class DatatablesFileDownloadReplacement {
  /**
   * Builds the datatables query and fetches results.
   * @param {Object} req - The request object containing datatables parameters.
   * @param {string} sql - The base SQL query to execute.
   * @param {string|null} whereClause - Additional static WHERE conditions.
   * @param {Object} replacements - Bind parameters for the query.
   * @param {Function|null} callback - Optional callback for further processing.
   * @param {string} groupBy - Optional GROUP BY clause.
   * @returns {Promise<Object>} The processed datatables result.
   */
  static async build(req, sql, whereClause = "", replacements = {}, callback = null, groupBy = "") {
    const { draw, order, columns, search } = req.body;

    const searchValue = search?.value || "";
    const orderColumnIndex = order?.[0]?.column;
    const orderColumnName =
      orderColumnIndex !== undefined
        ? columns[orderColumnIndex]?.data || columns[orderColumnIndex]?.name
        : null;
    const orderDirection = order?.[0]?.dir || "ASC";

    // Build global search
    let searchQuery = this.buildSearchQuery(searchValue, columns, replacements).trim();
    if (searchQuery.endsWith("AND")) {
      searchQuery = searchQuery.slice(0, -3).trim();
    }

    // Combine WHERE clause
    let finalWhere = "";
    if (searchQuery && whereClause) {
      finalWhere = `WHERE (${searchQuery}) AND (${whereClause})`;
    } else if (searchQuery) {
      finalWhere = `WHERE (${searchQuery})`;
    } else if (whereClause) {
      finalWhere = `WHERE ${whereClause}`;
    } else {
      finalWhere = "WHERE 1=1";
    }

    return this.getResults(
      sql,
      whereClause,
      finalWhere,
      replacements,
      orderColumnName,
      orderDirection,
      draw,
      groupBy
    );
  }

  /**
   * Builds global search query.
   */
  static buildSearchQuery(searchValue, columns, replacements) {
    if (!searchValue) return "";

    const searchConditions = [];
    const trimmedSearch = searchValue.trim();

    columns.forEach((column, index) => {
      const colName = column.name || column.data;
      if ((column.searchable === true || column.searchable === "true") && colName) {
        const bindKey = `search_${index}`;
        searchConditions.push(`CAST(${colName} AS TEXT) ILIKE :${bindKey}`);
        replacements[bindKey] = `%${trimmedSearch}%`;
      }
    });

    return searchConditions.length > 0 ? `(${searchConditions.join(" OR ")})` : "";
  }

  /**
   * Executes the final SQL query (with bind params) and returns result set.
   */
  static async getResults(
    sql,
    defaultWhere,
    finalWhere,
    replacements,
    orderBy,
    sortType,
    draw,
    groupBy
  ) {
    const groupByClause = groupBy ? `GROUP BY ${groupBy}` : "";
    const orderByClause = orderBy ? `ORDER BY ${orderBy} ${sortType}` : "";

    const finalSql = `${sql} ${finalWhere} ${groupByClause} ${orderByClause}`;

    const result = await sequelize.query(finalSql, {
      type: QueryTypes.SELECT,
      replacements: replacements,
    });

    return {
      draw: Number(draw),
      data: result,
    };
  }
}

module.exports = DatatablesFileDownloadReplacement;

