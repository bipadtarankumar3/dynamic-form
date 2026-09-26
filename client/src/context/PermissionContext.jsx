import React, { createContext, useContext, useState } from "react";
import { getUser } from "@/context/AuthContext";

const ALL_PERMISSIONS = [
  "list",
  "add",
  "edit",
  "delete",
  "view",
  "export",
  "like",
  "comment",
  "delete_comment",
  "bookmark",
  "share",
  "publish",
  "register",
  "approve",
  "reject",
];
const EMPTY_ARRAY = [];

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({});

  return (
    <PermissionContext.Provider value={{ permissions, setPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const hasModulePermissions = (module) => {
  // ⚠️ useContext MUST be called unconditionally at the top — Rules of Hooks
  const { permissions } = useContext(PermissionContext);

  try {
    const user = getUser();
    if (
      user &&
      (user.isConfigurator === true ||
       user.rol_is_configurator === true)
    ) {
      return ALL_PERMISSIONS;
    }
  } catch (e) {
    // fallback if context is not loaded yet
  }

  if (!module) return EMPTY_ARRAY;

  const raw = String(module).trim().toLowerCase();
  const underscore = raw.replace(/-/g, "_");
  const hyphen = raw.replace(/_/g, "-");

  const found = permissions?.[raw] || permissions?.[underscore] || permissions?.[hyphen];
  if (Array.isArray(found) && found.length > 0) return found;

  // Aliases
  if (raw === "feed" || raw === "volunteering-story-feed" || raw === "volunteering_story_feed") {
    const storyPerms = permissions?.["volunteering-impact-story"] || permissions?.["volunteering_impact_story"];
    if (Array.isArray(storyPerms) && storyPerms.length > 0) return storyPerms;
  }
  if (raw === "portal" || raw === "volunteering-portal" || raw === "volunteering_portal") {
    const evtPerms = permissions?.["volunteering-event"] || permissions?.["volunteering_event"];
    if (Array.isArray(evtPerms) && evtPerms.length > 0) return evtPerms;
  }

  return EMPTY_ARRAY;
};

export const hasAnyPermission = (module) => {
  const { permissions } = useContext(PermissionContext);
  return Array.isArray(permissions?.[module]) && permissions[module].length > 0;
};

export const hasAnyModuleAccess = (modules = []) => {
  if (!Array.isArray(modules)) return false;
  return modules.some((module) => hasAnyPermission(module));
};
export const hasAnyModuleListAccess = (modules = []) => {
  if (!Array.isArray(modules)) return false;
  return modules.some((module) => hasModulePermissions(module).includes("list"));
};

export const usePermissions = () => useContext(PermissionContext);
