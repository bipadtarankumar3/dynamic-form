const { isMaliciousInput } = require("./isMaliciousInput.utils");

function validateColumnNames({ req, allowedColumns = [] }) {
  const { columns = [], order = [], filterParams = {} } = req.body;
  const invalidColumns = [];

  // Validate columns[n].name
  for (const col of columns) {
    if (
      col.name &&
      (!allowedColumns.includes(col.name) || isMaliciousInput(col.name))
    ) {
      invalidColumns.push(col.name);
    }
  }

  // Validate order[n].column
  for (const o of order) {
    const colIndex = o.column;
    const col = columns[colIndex];
    if (
      col?.name &&
      (!allowedColumns.includes(col.name) || isMaliciousInput(col.name))
    ) {
      invalidColumns.push(col.name);
    }
  }

  // Validate filterParams keys
  for (const key of Object.keys(filterParams)) {
    if (!allowedColumns.includes(key) || isMaliciousInput(key)) {
      invalidColumns.push(key);
    }
  }

  if (invalidColumns.length > 0) {
    return {
      valid: false,
      invalidColumns: [...new Set(invalidColumns)],
      message: `Invalid column(s): ${[...new Set(invalidColumns)].join(", ")}`,
    };
  }

  return { valid: true };
}

module.exports = { validateColumnNames };
