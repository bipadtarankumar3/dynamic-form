export const parseKeysToFloat = (data, targetKeys) => {
  if (Array.isArray(data)) {
    // Recursively process each item in the array
    return data.map((item) => parseKeysToFloat(item, targetKeys));
  } else if (typeof data === "object" && data !== null) {
    // Recursively process each key-value pair in the object
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (targetKeys.includes(key)) {
        if (value === "" || value === undefined || value === null) {
          // If value is empty string, undefined, or null, set it to null
          acc[key] = null;
        } else if (typeof value === "string" && !isNaN(value)) {
          // If value is a valid numeric string, parse it to float
          acc[key] = parseFloat(value);
        } else {
          // Otherwise, keep the original value
          acc[key] = value;
        }
      } else if (typeof value === "object" && value !== null) {
        // Recursively process nested objects
        acc[key] = parseKeysToFloat(value, targetKeys);
      } else {
        // If not in targetKeys, just assign the value as is
        acc[key] = value;
      }
      return acc;
    }, {});
  }
  return data;
};
