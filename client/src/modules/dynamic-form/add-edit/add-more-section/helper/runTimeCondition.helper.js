const evaluateCondition = (condition, values) => {
  if (!condition) return true;

  return Object.entries(condition || {}).every(([fieldId, rules]) => {
    const value = values?.[fieldId];

    return Object.entries(rules || {}).every(([op, expected]) => {
      switch (op) {
        case "not_null":
          return value !== null && value !== undefined && value !== "";
        case "equals":
          return value === expected;
        case "lt":
          return Number(value) < expected;
        case "lte":
          return Number(value) <= expected;
        case "gt":
          return Number(value) > expected;
        case "gte":
          return Number(value) >= expected;
        case "in":
          return Array.isArray(expected) && expected.includes(value);
        default:
          return true;
      }
    });
  });
};

export const getFieldRuntimeState = (field, entry, role = "admin") => {
  const visible =
    !field?.visible_when || evaluateCondition(field?.visible_when, entry);

  const enabled =
    !field?.enabled_when || evaluateCondition(field?.enabled_when, entry);

  const disabled =
    field?.disabled === true ||
    (field?.disabled_when && evaluateCondition(field?.disabled_when, entry));

  const editable =
    !field?.readOnly &&
    (!field?.permissions?.editable ||
      field?.permissions?.editable.includes(role));

  return {
    visible,
    disabled: disabled || !enabled || !editable,
    readOnly: field?.readOnly === true,
  };
};
