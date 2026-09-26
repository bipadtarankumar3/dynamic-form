// client/src/modules/dynamic-form/hooks/dynamicFormHookRegistry.js
// ============================================================
// Pluggable Frontend Dynamic Form Hooks System
// Enables developers to register custom hooks (row actions, tabs,
// payload transformers, submission handlers) for any form slug
// without touching core dynamic form renderer code.
// ============================================================

const registry = {};

/**
 * Register custom hooks for a specific form slug
 * @param {string} formSlug - e.g. "implementation_partner", "partner_due_dilligence"
 * @param {Object} hookDefinitions - { getRowActions, getCustomTabs, onBeforeSubmit, onAfterSubmit }
 */
export const registerDynamicFormHook = (formSlug, hookDefinitions) => {
  if (!formSlug) return;
  const slugKey = formSlug.toLowerCase().trim();
  registry[slugKey] = {
    ...(registry[slugKey] || {}),
    ...hookDefinitions
  };
};

/**
 * Get registered hooks for a given form slug
 * @param {string} formSlug
 */
export const getDynamicFormHooks = (formSlug) => {
  if (!formSlug) return {};
  const slugKey = formSlug.toLowerCase().trim();
  return registry[slugKey] || {};
};

/**
 * React Hook for consuming dynamic form hooks inside components
 * @param {string} formSlug
 */
export const useDynamicFormHooks = (formSlug) => {
  const hooks = getDynamicFormHooks(formSlug);

  return {
    getRowActions: (context) => (hooks.getRowActions ? hooks.getRowActions(context) : context.defaultActions || []),
    getCustomTabs: (context) => (hooks.getCustomTabs ? hooks.getCustomTabs(context) : null),
    onBeforeSubmit: async (payload) => (hooks.onBeforeSubmit ? await hooks.onBeforeSubmit(payload) : payload),
    onAfterSubmit: async (result, payload) => (hooks.onAfterSubmit ? await hooks.onAfterSubmit(result, payload) : result),
    customHeaderButtons: hooks.customHeaderButtons || null,
    /**
     * Returns extra custom fields to inject into the form.
     * @param {Object} context - { form_slug, mode, data, sectionSlug }
     * @returns {React.ReactNode | null}
     */
    getExtraFields: (context) => (hooks.getExtraFields ? hooks.getExtraFields(context) : null),
    getColumns: (context) => (hooks.getColumns ? hooks.getColumns(context) : context.defaultColumns || []),
    fullyCustomPage: (context) => (hooks.fullyCustomPage ? hooks.fullyCustomPage(context) : null),
    customPage: (context) => (hooks.customPage ? hooks.customPage(context) : (hooks.getCustomPage ? hooks.getCustomPage(context) : null)),
    getCustomPage: (context) => (hooks.getCustomPage ? hooks.getCustomPage(context) : (hooks.customPage ? hooks.customPage(context) : null)),
    getCustomView: (context) => (hooks.getCustomView ? hooks.getCustomView(context) : null),
    renderCustomCard: (context) => (hooks.renderCustomCard ? hooks.renderCustomCard(context) : null),
    getCustomFilters: (context) => (hooks.getCustomFilters ? hooks.getCustomFilters(context) : null),
  };
};

/**
 * Helper to insert custom columns at specific positions
 * @param {Array} columnsList - Default table columns
 * @param {Object} newCol - Column definition with optional 'position' property
 */
export const insertColumn = (columnsList, newCol) => {
  const list = [...(columnsList || [])];
  const pos = newCol?.position;

  if (pos === "first" || pos === 0) {
    list.unshift(newCol);
    return list;
  }

  if (typeof pos === "number") {
    list.splice(pos, 0, newCol);
    return list;
  }

  if (typeof pos === "object" && pos !== null) {
    if (pos.after) {
      const idx = list.findIndex((c) => c.key === pos.after || c.dataIndex === pos.after);
      if (idx !== -1) {
        list.splice(idx + 1, 0, newCol);
        return list;
      }
    }
    if (pos.before) {
      const idx = list.findIndex((c) => c.key === pos.before || c.dataIndex === pos.before);
      if (idx !== -1) {
        list.splice(idx, 0, newCol);
        return list;
      }
    }
  }

  // Default: Insert right before Actions column or at the end
  const actionsIdx = list.findIndex((c) => c.key === "actions" || c.title === "Actions" || c.label === "Actions");
  if (actionsIdx !== -1) {
    list.splice(actionsIdx, 0, newCol);
  } else {
    list.push(newCol);
  }
  return list;
};

export default {
  registerDynamicFormHook,
  getDynamicFormHooks,
  useDynamicFormHooks,
  insertColumn,
};
