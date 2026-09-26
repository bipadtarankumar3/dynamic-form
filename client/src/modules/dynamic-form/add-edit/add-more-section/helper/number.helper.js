export const NUMBER_REGEX = {
    integer: /^[0-9]*$/,
    decimal: /^[0-9]*\.?[0-9]*$/,
  };

  export const isWithinRange = (value, field) => {
    if (value === "" || value === ".") return true;

    const num = Number(value);
    if (Number.isNaN(num)) return false;

    if (field?.validation?.min !== undefined && num < field?.validation?.min) {
      return false;
    }

    if (field?.validation?.max !== undefined && num > field?.validation.max) {
      return false;
    }

    return true;
  };