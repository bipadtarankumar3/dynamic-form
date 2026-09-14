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
export function evaluateExpression(formula, recordData = {}, allFields = []) {
  if (!formula || typeof formula !== "string") return 0;

  try {
    // Replace all [field_token] tokens with values from recordData
    let evaluatedStr = formula.replace(/\[([^\]]+)\]/g, (match, rawToken) => {
      const token = rawToken.trim();
      let val = recordData?.[token];

      if (val === undefined || val === null || val === "") {
        const tokenLower = token.toLowerCase();
        const tokenSlug = tokenLower.replace(/[^a-z0-9_]/g, "_");

        const matchedKey = Object.keys(recordData || {}).find((k) => {
          const kLower = k.toLowerCase();
          return kLower === tokenLower || kLower === tokenSlug;
        });

        if (matchedKey && recordData[matchedKey] !== undefined && recordData[matchedKey] !== null && recordData[matchedKey] !== "") {
          val = recordData[matchedKey];
        } else if (allFields && allFields.length > 0) {
          const matchedField = allFields.find((f) => {
            const dbKey = (f?.db_field || f?.column_name || f?.id || "").toLowerCase();
            const labelKey = (f?.label || "").toLowerCase();
            return (
              dbKey === tokenLower ||
              dbKey === tokenSlug ||
              labelKey === tokenLower ||
              labelKey.replace(/[^a-z0-9_]/g, "_") === tokenSlug
            );
          });

          if (matchedField) {
            const fKey = matchedField.db_field || matchedField.column_name || matchedField.id;
            val = recordData?.[fKey];
          }
        }
      }

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
  const calcFields = fields.filter((f) => f?.calculation?.enabled && (f?.db_field || f?.id));
  if (!calcFields.length) return updatedRow;

  // Run multi-pass calculation to handle dependent calculated fields (up to 3 passes)
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;

    calcFields.forEach((field) => {
      const calc = field.calculation || {};
      if (calc.enabled && calc.formula) {
        const rawResult = evaluateExpression(calc.formula, updatedRow, fields);
        const formattedResult = formatCalculatedNumber(
          rawResult,
          field.number_type,
          calc.precision,
          calc.rounding
        );

        const targetKey = field.db_field || field.id;
        if (targetKey && updatedRow[targetKey] !== formattedResult) {
          updatedRow[targetKey] = formattedResult;
          changed = true;
        }
      }
    });

    if (!changed) break;
  }

  return updatedRow;
}

/**
 * Validates a calculation formula string.
 * Ensures balanced brackets, valid numeric field references,
 * balanced parentheses, valid math operators, and valid mathematical syntax.
 */
export function validateFormula(formula, availableFieldTokens = []) {
  if (!formula || !formula.trim()) {
    return { isValid: false, error: "Calculation formula is required when calculation is enabled." };
  }

  const trimmed = formula.trim();

  // 1. Check for matching, non-nested brackets: [field_name]
  let inBracket = false;
  let currentToken = "";
  const referencedFields = [];

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "[") {
      if (inBracket) {
        return { isValid: false, error: 'Nested brackets "[" are not allowed.' };
      }
      inBracket = true;
      currentToken = "";
    } else if (ch === "]") {
      if (!inBracket) {
        return { isValid: false, error: 'Closing bracket "]" without matching opening bracket.' };
      }
      inBracket = false;
      const tok = currentToken.trim();
      if (!tok) {
        return { isValid: false, error: 'Empty field token "[]" found in formula.' };
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tok)) {
        return { isValid: false, error: `Invalid field reference "[${tok}]" in formula.` };
      }
      referencedFields.push(tok);
    } else if (inBracket) {
      currentToken += ch;
    }
  }

  if (inBracket) {
    return { isValid: false, error: 'Unclosed bracket "[" in formula. Missing "]".' };
  }

  if (referencedFields.length === 0 && !/\d/.test(trimmed)) {
    return { isValid: false, error: "Formula must reference at least one numeric field or constant value." };
  }

  // 2. Check if all referenced field tokens are valid available fields
  if (Array.isArray(availableFieldTokens)) {
    const allowed = new Set(availableFieldTokens.map((f) => String(f).toLowerCase().trim()));
    for (const ref of referencedFields) {
      if (!allowed.has(ref.toLowerCase())) {
        return {
          isValid: false,
          error: `Field "[${ref}]" is not an available numeric field.`,
        };
      }
    }
  }

  // 3. Reject invalid characters outside brackets
  // Substitute each [field_name] with dummy number 1
  const sanitized = trimmed.replace(/\[[a-zA-Z_][a-zA-Z0-9_]*\]/g, " 1 ");
  if (/[^0-9+\-*\/%().\s]/.test(sanitized)) {
    const badChars = sanitized.match(/[^0-9+\-*\/%().\s]/g);
    return {
      isValid: false,
      error: `Formula contains invalid character(s): ${[...new Set(badChars)].join(", ")}`,
    };
  }

  // 4. Balanced parentheses
  let paren = 0;
  for (let i = 0; i < sanitized.length; i++) {
    if (sanitized[i] === "(") paren++;
    if (sanitized[i] === ")") {
      paren--;
      if (paren < 0) {
        return { isValid: false, error: 'Unexpected closing parenthesis ")" without matching "(". ' };
      }
    }
  }
  if (paren !== 0) {
    return { isValid: false, error: 'Unclosed opening parenthesis "(". Missing matching ")".' };
  }

  if (/\(\s*\)/.test(sanitized)) {
    return { isValid: false, error: 'Empty parentheses "()" found in formula.' };
  }

  // 5. Test mathematical syntax via safe execution with mock numbers
  try {
    const fn = new Function(`"use strict"; return (${sanitized.trim()});`);
    const testVal = fn();
    if (typeof testVal !== "number" || isNaN(testVal) || !isFinite(testVal)) {
      return { isValid: false, error: "Formula does not evaluate to a valid mathematical result." };
    }
  } catch (err) {
    return {
      isValid: false,
      error: 'Invalid mathematical formula syntax. Please check operators and values.',
    };
  }

  return { isValid: true, error: null };
}
