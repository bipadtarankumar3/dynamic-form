/**
 * Evaluate an individual condition rule against the current form/record values.
 */
export const evaluateRule = (rule, values) => {
  if (!rule || !rule.field) return true;

  const targetField = rule.field;
  // Look up value in values object (supporting case-insensitive / normalized lookup)
  let val = values?.[targetField];
  if (val === undefined || val === null) {
    const normalizedTarget = String(targetField).toLowerCase().trim();
    const foundKey = Object.keys(values || {}).find(
      (k) =>
        k.toLowerCase().trim() === normalizedTarget ||
        k.toLowerCase().trim().endsWith(`_${normalizedTarget}`) ||
        normalizedTarget.endsWith(`_${k.toLowerCase().trim()}`)
    );
    if (foundKey) val = values[foundKey];
  }

  const op = String(rule.operator || 'equals').toLowerCase().trim();
  const expected = rule.value;

  // Resolve val to string for string-based comparisons
  const valStr = val !== undefined && val !== null ? String(val).trim() : '';
  const expectedStr = expected !== undefined && expected !== null ? String(expected).trim() : '';

  switch (op) {
    case 'equals':
    case 'eq':
    case '==':
    case '===':
      return valStr.toLowerCase() === expectedStr.toLowerCase();

    case 'not_equals':
    case 'neq':
    case '!=':
    case '!==':
      return valStr.toLowerCase() !== expectedStr.toLowerCase();

    case 'contains':
      return valStr.toLowerCase().includes(expectedStr.toLowerCase());

    case 'not_contains':
      return !valStr.toLowerCase().includes(expectedStr.toLowerCase());

    case 'is_empty':
    case 'empty':
      return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);

    case 'is_not_empty':
    case 'not_empty':
    case 'not_null':
      return val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);

    case 'greater_than':
    case 'gt':
    case '>':
      return Number(val) > Number(expected);

    case 'greater_than_or_equal':
    case 'gte':
    case '>=':
      return Number(val) >= Number(expected);

    case 'less_than':
    case 'lt':
    case '<':
      return Number(val) < Number(expected);

    case 'less_than_or_equal':
    case 'lte':
    case '<=':
      return Number(val) <= Number(expected);

    case 'in': {
      const expList = Array.isArray(expected)
        ? expected
        : expectedStr.split(',').map((s) => s.trim());
      return expList.map((s) => String(s).toLowerCase()).includes(valStr.toLowerCase());
    }

    case 'not_in': {
      const expList = Array.isArray(expected)
        ? expected
        : expectedStr.split(',').map((s) => s.trim());
      return !expList.map((s) => String(s).toLowerCase()).includes(valStr.toLowerCase());
    }

    default:
      return true;
  }
};

/**
 * Evaluate full conditions configuration (rules list, match_type, or legacy nested object).
 */
export const evaluateConditions = (conditions, values) => {
  if (!conditions) return true;

  // If conditions has rules array: { match_type: 'all' | 'any', rules: [...] }
  if (Array.isArray(conditions.rules)) {
    if (conditions.rules.length === 0) return true;
    const isAny = String(conditions.match_type || 'all').toLowerCase() === 'any';
    if (isAny) {
      return conditions.rules.some((rule) => evaluateRule(rule, values));
    }
    return conditions.rules.every((rule) => evaluateRule(rule, values));
  }

  // If conditions is directly an array of rules: [{ field, operator, value }]
  if (Array.isArray(conditions)) {
    if (conditions.length === 0) return true;
    return conditions.every((rule) => evaluateRule(rule, values));
  }

  // If conditions is legacy object format: { [fieldId]: { equals: expected } }
  if (typeof conditions === 'object') {
    return Object.entries(conditions).every(([fieldId, rules]) => {
      if (typeof rules !== 'object' || rules === null) {
        return String(values?.[fieldId]).toLowerCase() === String(rules).toLowerCase();
      }
      return Object.entries(rules).every(([op, expected]) => {
        return evaluateRule({ field: fieldId, operator: op, value: expected }, values);
      });
    });
  }

  return true;
};

/**
 * Get field runtime state (visible, disabled, readOnly) based on permissions and conditional rules.
 */
export const getFieldRuntimeState = (field, values, role = 'admin') => {
  const isCondValid = !field?.conditions || evaluateConditions(field.conditions, values);
  const isVisibleWhen = !field?.visible_when || evaluateConditions(field.visible_when, values);
  const visible = isCondValid && isVisibleWhen;

  const enabled =
    !field?.enabled_when || evaluateConditions(field.enabled_when, values);

  const disabled =
    field?.disabled === true ||
    (field?.disabled_when && evaluateConditions(field.disabled_when, values));

  const editable =
    !field?.readOnly &&
    (!field?.permissions?.editable ||
      field?.permissions?.editable?.includes(role));

  return {
    visible,
    disabled: disabled || !enabled || !editable,
    readOnly: field?.readOnly === true,
  };
};
