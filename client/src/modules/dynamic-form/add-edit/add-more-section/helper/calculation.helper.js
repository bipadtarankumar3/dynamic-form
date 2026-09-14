/**
 * Formats a calculated numeric value based on number_type, precision, and rounding mode.
 */
export function formatCalculatedNumber(val, numberType, precision, rounding = "round") {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return 0;
  }

  const num = Number(val);
  const isInteger = numberType === "integer" || precision === 0;
  const decPlaces = isInteger ? 0 : precision !== undefined ? precision : 2;

  let resultNum = num;

  if (isInteger) {
    if (rounding === "floor") {
      resultNum = Math.floor(num);
    } else if (rounding === "ceil") {
      resultNum = Math.ceil(num);
    } else {
      resultNum = Math.round(num);
    }
    return resultNum;
  }

  // Decimal calculation
  const factor = Math.pow(10, decPlaces);
  if (rounding === "floor") {
    resultNum = Math.floor(num * factor) / factor;
  } else if (rounding === "ceil") {
    resultNum = Math.ceil(num * factor) / factor;
  } else {
    resultNum = Math.round(num * factor) / factor;
  }

  // Format to fixed decimal string or float
  return Number(resultNum.toFixed(decPlaces));
}

/**
 * Safely evaluates a formula expression like `[unit_cost] * [no_of_unit]` against data values.
 */
export function evaluateExpression(formula, recordData = {}) {
  if (!formula || typeof formula !== "string") return 0;

  try {
    // Replace all [field_db_name] tokens with values from recordData
    let evaluatedStr = formula.replace(/\[([a-zA-Z0-9_]+)\]/g, (match, fieldName) => {
      const val = recordData?.[fieldName];
      const numVal = val !== undefined && val !== null && val !== "" ? Number(val) : 0;
      return isNaN(numVal) ? 0 : numVal;
    });

    // Clean up equation: allow only digits, decimal point, operators (+, -, *, /, %, (, )), whitespace
    const safeExpr = evaluatedStr.replace(/[^0-9.\-+\/*%()\s]/g, "");
    if (!safeExpr.trim()) return 0;

    // Use Function constructor for safe math execution
    const fn = new Function(`"use strict"; return (${safeExpr});`);
    const result = fn();
    return isNaN(result) || !isFinite(result) ? 0 : result;
  } catch (err) {
    return 0;
  }
}

/**
 * Runs calculation pass across all calculated fields in a record.
 */
export function evaluateRowCalculations(row = {}, fields = []) {
  if (!fields || !fields.length) return row;

  const updatedRow = { ...row };

  // Filter fields with calculation enabled
  const calcFields = fields.filter((f) => f?.calculation?.enabled && f?.db_field);
  if (!calcFields.length) return updatedRow;

  // Run multi-pass calculation to handle dependent calculated fields (up to 3 passes)
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;

    calcFields.forEach((field) => {
      const calc = field.calculation || {};
      if (calc.type === "expression" && calc.formula) {
        const rawResult = evaluateExpression(calc.formula, updatedRow);
        const formattedResult = formatCalculatedNumber(
          rawResult,
          field.number_type,
          calc.precision,
          calc.rounding
        );

        if (updatedRow[field.db_field] !== formattedResult) {
          updatedRow[field.db_field] = formattedResult;
          changed = true;
        }
      }
    });

    if (!changed) break;
  }

  return updatedRow;
}
