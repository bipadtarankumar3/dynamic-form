import React, { createContext, useContext, useState } from "react";
import { getUser } from "@/context/AuthContext";

const ALL_PERMISSIONS = ["list", "add", "edit", "delete", "view"];
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

  return permissions?.[module] || EMPTY_ARRAY;
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
