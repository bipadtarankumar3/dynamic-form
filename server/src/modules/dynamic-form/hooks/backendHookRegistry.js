// server/src/modules/dynamic-form/hooks/backendHookRegistry.js
// ============================================================
// Pluggable Backend Dynamic Form Hooks System
// Enables developers to register lifecycle hooks (onBeforeInsert,
// onAfterInsert, onBeforeUpdate, onAfterUpdate, onCustomAction)
// for any form slug without modifying core controllers.
// ============================================================

const backendRegistry = {};

/**
 * Register backend lifecycle hooks for a specific form slug
 * @param {string} formSlug - e.g. "implementation_partner"
 * @param {Object} hooks - { onBeforeInsert, onAfterInsert, onBeforeUpdate, onAfterUpdate, customActions }
 */
const registerBackendHook = (formSlug, hooks) => {
  if (!formSlug) return;
  const slugKey = String(formSlug).toLowerCase().trim();
  backendRegistry[slugKey] = {
    ...(backendRegistry[slugKey] || {}),
    ...hooks
  };
};

/**
 * Get registered backend hooks for a form slug
 * @param {string} formSlug
 */
const getBackendHooks = (formSlug) => {
  if (!formSlug) return {};
  const slugKey = String(formSlug).toLowerCase().trim();
  return backendRegistry[slugKey] || {};
};

/**
 * Execute a specific backend hook safely
 * @param {string} formSlug
 * @param {string} hookName - "onBeforeInsert" | "onAfterInsert" | "onBeforeUpdate" | "onAfterUpdate"
 * @param {Object} context
 */
const triggerBackendHook = async (formSlug, hookName, context) => {
  const hooks = getBackendHooks(formSlug);
  if (typeof hooks[hookName] === "function") {
    try {
      return await hooks[hookName](context);
    } catch (err) {
      console.error(`[BackendHookError] ${formSlug}.${hookName}:`, err);
    }
  }
  return context?.payload;
};

module.exports = {
  registerBackendHook,
  getBackendHooks,
  triggerBackendHook
};
