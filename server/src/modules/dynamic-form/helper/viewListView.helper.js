// server/src/modules/dynamic-form/helper/viewListView.helper.js
// ============================================================
// Dedicated Database View Listing Helper
// Queries PostgreSQL Database Views directly according to Admin Listing checked columns.
// Does NOT perform any default/hardcoded backend table joins.
// ============================================================

const { sequelize } = require("../../../config/db.config");
const { buildActionTabWhereCondition } = require("./generalListView.helper");

/**
 * Builds clean SQL query directly from PostgreSQL Database View
 */
function buildViewListingQuery(schema, checkedColumnKeys = []) {
  const rootTable = schema?.root_entity?.table || `t_frm_${schema?.slug}`;
  const rootPK = schema?.root_entity?.primary_key || "id";
  const viewSource = schema?.view_name || schema?.database_view_name || `v_${schema?.slug}`;

  let selectCols = ["r.*"];

  if (Array.isArray(checkedColumnKeys) && checkedColumnKeys.length > 0) {
    // Ensure primary key is always included for row actions
    const uniqueKeys = Array.from(new Set([rootPK, ...checkedColumnKeys]));
    selectCols = uniqueKeys.map((col) => `r."${col.replace(/"/g, '""')}"`);
  }

  return {
    baseSql: `SELECT\n  ${selectCols.join(",\n  ")}\nFROM public."${viewSource.replace(/"/g, '""')}" r`,
    fromSource: `public."${viewSource.replace(/"/g, '""')}" r`,
    rootPK,
    viewSource,
  };
}

module.exports = {
  buildViewListingQuery,
};
