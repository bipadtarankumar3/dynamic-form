export const buildDependencyMeta = (fields = []) => {
  const childrenMap = {};
  const allDependentsMap = {};

  // immediate children
  fields.forEach((f) => {
    if (f?.visible === false) return;
    const parent = f?.dependency?.parent_db_field || f?.dependency?.parent || f?.dependency?.parent_field || f?.parent_db_field;
    if (!parent) return;

    const childKey = f?.db_field || f?.column_name || f?.id;
    if (!childKey) return;

    if (!childrenMap[parent]) childrenMap[parent] = [];
    if (!childrenMap[parent].includes(childKey)) childrenMap[parent].push(childKey);

    const normParent = normalizeKey(parent);
    if (normParent && normParent !== parent) {
      if (!childrenMap[normParent]) childrenMap[normParent] = [];
      if (!childrenMap[normParent].includes(childKey)) childrenMap[normParent].push(childKey);
    }
  });

  // build deep dependents
  const dfs = (node, acc, visiting = new Set()) => {
    if (visiting.has(node)) return; // cycle protection
    visiting.add(node);

    (childrenMap[node] || []).forEach((child) => {
      if (!acc.has(child)) {
        acc.add(child);
        dfs(child, acc, visiting);
      }
    });

    visiting.delete(node);
  };

  Object.keys(childrenMap).forEach((parent) => {
    const acc = new Set();
    dfs(parent, acc);
    allDependentsMap[parent] = Array.from(acc);
  });

  return {
    childrenMap, // immediate children
    allDependentsMap, // deep dependents
  };
};

export const normalizeKey = (str) =>
  (str || "")
    .toLowerCase()
    .replace(/^(tpro|tprj|tthm|tng|tst|tdis|tblk|tgramp|tvill|tact|tschsvn|tsdg|tftb|tfy|tng|ttrai|tsupi|tsdgdet|tbgh)_/, "")
    .replace(/_(id|select|name|code|pk)$/, "")
    .replace(/_/g, "");

export const buildFilters = (filterKeys = [], values = {}, parentDbField = null) => {
  let keys = Array.isArray(filterKeys) ? filterKeys : Object.keys(filterKeys || {});
  if (!keys.length && parentDbField) {
    keys = [parentDbField];
  }
  if (!keys.length) return {};

  const filters = {};

  for (const key of keys) {
    let val = values?.[key];

    if ((val === undefined || val === null || val === "") && parentDbField && values?.[parentDbField] !== undefined) {
      val = values[parentDbField];
    }

    if (val === undefined || val === null || val === "") {
      const normKey = normalizeKey(key);
      const matchedValueKey = Object.keys(values || {}).find(
        (vk) => normalizeKey(vk) === normKey && values[vk] !== undefined && values[vk] !== null && values[vk] !== ""
      );
      if (matchedValueKey) {
        val = values[matchedValueKey];
      }
    }

    if (val === undefined || val === null || val === "") return null;
    filters[key] = val;
  }

  return filters;
};
