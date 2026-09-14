export const isAppendableValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "[object Object]" ||
    value === "[object Array]"
  ) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0 && value.some(
      (v) =>
        v !== undefined &&
        v !== null &&
        v !== "" &&
        v !== "[object Object]" &&
        v !== "[object Array]" &&
        !(Array.isArray(v) && v.length === 0)
    );
  }

  if (typeof value === "object" && !(value instanceof File)) {
    return Object.keys(value).length > 0;
  }

  return true;
};

export const appendValue = (fd, path, value) => {
  if (!isAppendableValue(value)) return;

  if (Array.isArray(value)) {
    const containsFiles = value.some((v) => (v?.originFileObj || v) instanceof File);
    if (containsFiles) {
      value.forEach((v) => {
        const file = v?.originFileObj || v;
        if (file instanceof File) {
          fd.append(path, file);
        } else if (v !== undefined && v !== null) {
          fd.append(path, typeof v === "object" ? JSON.stringify(v) : String(v));
        }
      });
      return;
    }
  }

  if (value instanceof File) {
    fd.append(path, value);
    return;
  }

  if (typeof value === "object" && value !== null) {
    fd.append(path, JSON.stringify(value));
    return;
  }

  fd.append(path, String(value));
};

export const appendSectionToFormData = (fd, sectionId, data) => {
  if (Array.isArray(data)) {
    data.forEach((row, i) => {
      Object.entries(row).forEach(([key, value]) => {
        if (key === "__row_id" || !isAppendableValue(value)) return;
        appendValue(fd, `${sectionId}[${i}][${key}]`, value);
      });
    });
    return;
  }

  Object.entries(data || {}).forEach(([key, value]) => {
    if (key === "__row_id" || !isAppendableValue(value)) return;
    appendValue(fd, `${sectionId}[${key}]`, value);
  });
};
