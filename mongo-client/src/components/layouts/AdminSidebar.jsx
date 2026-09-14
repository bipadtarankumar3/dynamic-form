'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Layout, Dropdown, Tooltip } from "antd";
import {
  DownOutlined,
  UpOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  SettingOutlined,
  UserOutlined,
  SafetyOutlined,
  KeyOutlined,
  BranchesOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import * as Icons from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Link from "@/components/Link";
import { getUser } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionContext";
import { useDynamicMenu } from "@/hooks/useDynamicMenu";
import { useSettings } from "@/context/SettingsContext";

const { Sider } = Layout;

// Helper to map icon slug to component
const renderIcon = (iconName) => {
  if (!iconName) return <FolderOutlined />;
  if (React.isValidElement(iconName)) return iconName;
  const cleanName = String(iconName).trim();
  const IconComponent = Icons[cleanName] || FolderOutlined;
  return <IconComponent />;
};

const cleanPath = (p) => (p || "").replace(/\/+$/, "") || "/";

export default function AdminSidebar({ collapsed, onToggleCollapse }) {
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSettings();
  const { permissions } = usePermissions() || {};
  const { menus: dynamicMenus } = useDynamicMenu();
  const userObj = getUser();

  const [openGroups, setOpenGroups] = useState({ "/admin/auth": true });

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hasPerm = (module) => {
    const u = getUser();
    if (u && (u.isConfigurator === true || u.rol_is_configurator === true)) {
      return ["list", "add", "edit", "delete", "view", "read"];
    }
    return permissions?.[module] || [];
  };

  // Helper to map DB menu tree to structured items
  const mapDynamicMenus = (menuTree, parentUrl = "", seenKeys = new Set()) => {
    return menuTree.map((item) => {
      let itemUrl = (item.url || "").trim();
      let absoluteUrl = "";

      if (itemUrl) {
        if (itemUrl.startsWith("/")) {
          if (itemUrl.startsWith("/admin")) {
            absoluteUrl = itemUrl;
          } else {
            absoluteUrl = `/admin${itemUrl}`;
          }
        } else if (parentUrl) {
          const cleanedParentUrl = parentUrl.replace(/\/$/, "");
          let cleanedItemUrl = itemUrl.replace(/^\//, "");

          const parentSegments = cleanedParentUrl.split("/").filter(Boolean);
          const lastParentSegment = parentSegments[parentSegments.length - 1];
          if (lastParentSegment && cleanedItemUrl.startsWith(`${lastParentSegment}/`)) {
            cleanedItemUrl = cleanedItemUrl.slice(lastParentSegment.length + 1);
          }

          absoluteUrl = `${cleanedParentUrl}/${cleanedItemUrl}`;
        } else {
          const cleanedItemUrl = itemUrl.replace(/^\//, "");
          if (cleanedItemUrl.startsWith("admin")) {
            absoluteUrl = `/${cleanedItemUrl}`;
          } else {
            absoluteUrl = `/admin/${cleanedItemUrl}`;
          }
        }

        if (absoluteUrl) {
          const parts = absoluteUrl.split("/").filter(Boolean);
          const deduped = [];
          for (let i = 0; i < parts.length; i++) {
            if (i === 0 || parts[i] !== parts[i - 1]) {
              deduped.push(parts[i]);
            }
          }
          absoluteUrl = "/" + deduped.join("/");
        }
      }

      let baseKey = absoluteUrl || `menu-item-${item.id}`;
      let uniqueKey = baseKey;
      if (seenKeys.has(uniqueKey)) {
        uniqueKey = `${baseKey}-${item.id}`;
      }
      seenKeys.add(uniqueKey);

      const children = Array.isArray(item.children) && item.children.length > 0
        ? mapDynamicMenus(item.children, absoluteUrl || parentUrl, seenKeys)
        : undefined;

      return {
        key: uniqueKey,
        path: absoluteUrl,
        title: item.label,
        icon: renderIcon(item.icon),
        label: item.label,
        children,
      };
    });
  };

  const menuItems = useMemo(() => {
    let items = [];
    if (dynamicMenus && dynamicMenus.length > 0) {
      const filteredDynamicMenus = dynamicMenus.filter((item) => {
        const lbl = (item.label || "").trim().toLowerCase();
        const url = (item.url || "").trim().toLowerCase();
        const mod = (item.module_key || "").trim().toLowerCase();

        // Exclude auth (handled separately below)
        if (lbl === "auth" || url === "auth" || url === "/admin/auth" || url === "/auth" || mod === "auth") {
          return false;
        }

        // Exclude NGO-specific menus (Due Diligence, NGO Profile, etc.)
        if (
          url.includes("/ngo") ||
          url.includes("due-diligence") ||
          url.includes("due_diligence") ||
          lbl.includes("due diligence") ||
          lbl.includes("due dilligence") ||
          lbl === "profile"
        ) {
          return false;
        }

        return true;
      });
      items = mapDynamicMenus(filteredDynamicMenus);
    }

    const authChildren = [];
    if (hasPerm("users").includes("list") || hasPerm("users").includes("read")) {
      authChildren.push({
        key: "/admin/auth/users",
        path: "/admin/auth/users",
        title: "Users",
        icon: <UserOutlined />,
        label: "Users",
      });
    }
    if (hasPerm("roles").includes("list") || hasPerm("roles").includes("read")) {
      authChildren.push({
        key: "/admin/auth/roles",
        path: "/admin/auth/roles",
        title: "Roles",
        icon: <SafetyOutlined />,
        label: "Roles",
      });
    }
    if (hasPerm("permissions").includes("list") || hasPerm("permissions").includes("read")) {
      authChildren.push({
        key: "/admin/auth/permissions",
        path: "/admin/auth/permissions",
        title: "Permissions",
        icon: <KeyOutlined />,
        label: "Permissions",
      });
    }
    if (
      hasPerm("approval-path").includes("list") ||
      hasPerm("approval-path").includes("read") ||
      hasPerm("approval_path").includes("list") ||
      hasPerm("approval_path").includes("read")
    ) {
      authChildren.push({
        key: "/admin/auth/approval-path",
        path: "/admin/auth/approval-path",
        title: "Approval Path",
        icon: <BranchesOutlined />,
        label: "Approval Path",
      });
    }

    if (authChildren.length > 0) {
      const authMenuItem = {
        key: "/admin/auth",
        path: "/admin/auth/users",
        title: "Auth & Security",
        label: "Auth & Security",
        icon: <SafetyCertificateOutlined />,
        badgeColor: "var(--primary-gradient, var(--primary-color, #15803d))",
        children: authChildren,
      };

      const dashboardIndex = items.findIndex((item) =>
        (item.key && String(item.key).toLowerCase().includes("dashboard")) ||
        (typeof item.title === "string" && item.title.toLowerCase().includes("dashboard"))
      );

      if (dashboardIndex !== -1) {
        items.splice(dashboardIndex + 1, 0, authMenuItem);
      } else if (items.length > 0) {
        items.splice(1, 0, authMenuItem);
      } else {
        items.push(authMenuItem);
      }
    }

    return items;
  }, [dynamicMenus, permissions]);

  // Ensure active group is opened when pathname changes
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const isChildActive = item.children.some((c) => {
          const cPath = c.path || c.key;
          return cleanPath(pathname) === cleanPath(cPath) || cleanPath(pathname).startsWith(cleanPath(cPath) + "/");
        });
        if (isChildActive) {
          setOpenGroups((prev) => ({ ...prev, [item.key]: true }));
        }
      }
    });
  }, [pathname, menuItems]);

  return (
    <Sider
      width={240}
      collapsedWidth={52}
      collapsed={collapsed}
      trigger={null}
      className="ado-sider"
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
        {/* Navigation Items */}
        <div className="ado-sidebar-content" style={{ flex: 1, overflowY: "auto" }}>
          {!collapsed && (
            <div className="ado-sidebar-section-header">
              <div className="ado-badge-icon" style={{ background: "var(--primary-color, #107c41)" }}>
                <AppstoreOutlined style={{ color: "#ffffff", fontSize: 13 }} />
              </div>
              <span>Navigation</span>
            </div>
          )}

          {menuItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;

            if (hasChildren) {
              const isChildActive = item.children.some((c) => {
                const cPath = c.path || c.key;
                return cleanPath(pathname) === cleanPath(cPath) || cleanPath(pathname).startsWith(cleanPath(cPath) + "/");
              });
              const isOpen = openGroups[item.key] ?? isChildActive;

              if (collapsed) {
                const flyoutItems = item.children.map((child) => ({
                  key: child.key,
                  icon: child.icon,
                  label: (
                    <Link to={child.path || child.key} style={{ display: "block" }}>
                      {child.title || child.label}
                    </Link>
                  ),
                }));

                return (
                  <Dropdown
                    key={item.key}
                    placement="rightTop"
                    menu={{ items: flyoutItems }}
                    trigger={["hover", "click"]}
                  >
                    <div
                      className={`ado-menu-item ${isChildActive ? "ado-menu-item-active" : ""}`}
                      style={{ justifyContent: "center", padding: 0 }}
                    >
                      <span className="ado-menu-icon" style={{ margin: 0 }}>
                        {item.icon}
                      </span>
                    </div>
                  </Dropdown>
                );
              }

              return (
                <React.Fragment key={item.key}>
                  <div
                    className="ado-sidebar-section-header"
                    style={{ marginTop: 8, cursor: "pointer" }}
                    onClick={() => toggleGroup(item.key)}
                  >
                    <div
                      className="ado-badge-icon"
                      style={{
                        background: item.badgeColor || (settings?.secondary_color || "#f29019"),
                      }}
                    >
                      {item.icon}
                    </div>
                    <span style={{ flex: 1 }}>{item.title || item.label}</span>
                    {isOpen ? (
                      <UpOutlined style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }} />
                    ) : (
                      <DownOutlined style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }} />
                    )}
                  </div>

                  {isOpen &&
                    item.children.map((child) => {
                      const cPath = child.path || child.key;
                      const isActive =
                        cleanPath(pathname) === cleanPath(cPath) ||
                        cleanPath(pathname).startsWith(cleanPath(cPath) + "/");

                      return (
                        <Link
                          key={child.key}
                          to={cPath}
                          className={`ado-menu-item ${isActive ? "ado-menu-item-active" : ""}`}
                          style={{ paddingLeft: "32px" }}
                        >
                          <span className="ado-menu-icon">{child.icon}</span>
                          <span className="ado-menu-text">{child.title || child.label}</span>
                        </Link>
                      );
                    })}
                </React.Fragment>
              );
            }

            // Standalone Item
            const iPath = item.path || item.key;
            const isActive =
              cleanPath(pathname) === cleanPath(iPath) ||
              (iPath.length > 7 && cleanPath(pathname).startsWith(cleanPath(iPath) + "/"));

            const content = (
              <Link
                key={item.key}
                to={iPath}
                className={`ado-menu-item ${isActive ? "ado-menu-item-active" : ""}`}
                style={collapsed ? { justifyContent: "center", padding: 0 } : { paddingLeft: "16px" }}
              >
                <span className="ado-menu-icon" style={collapsed ? { margin: 0 } : {}}>
                  {item.icon}
                </span>
                {!collapsed && <span className="ado-menu-text">{item.title || item.label}</span>}
              </Link>
            );

            return collapsed ? (
              <Tooltip key={item.key} title={item.title || item.label} placement="right">
                {content}
              </Tooltip>
            ) : (
              content
            );
          })}
        </div>

        {/* Sider Footer */}
        {!collapsed ? (
          <div className="ado-sider-footer">
            {userObj?.isConfigurator === true ? (
              <div
                className="ado-footer-btn"
                onClick={() => router.push("/configurator/settings")}
              >
                <SettingOutlined style={{ fontSize: 14 }} />
                <span>Project settings</span>
              </div>
            ) : (
              <div style={{ flex: 1 }} />
            )}
            <div
              className="ado-collapse-toggle"
              onClick={() => onToggleCollapse(true)}
              title="Collapse"
              style={{ marginLeft: "auto" }}
            >
              <DoubleLeftOutlined />
            </div>
          </div>
        ) : (
          <div className="ado-sider-footer-collapsed">
            {userObj?.isConfigurator === true && (
              <Tooltip title="Project settings" placement="right">
                <div
                  className="ado-collapse-toggle"
                  onClick={() => router.push("/configurator/settings")}
                >
                  <SettingOutlined style={{ fontSize: 16 }} />
                </div>
              </Tooltip>
            )}
            <Tooltip title="Expand" placement="right">
              <div
                className="ado-collapse-toggle"
                onClick={() => onToggleCollapse(false)}
              >
                <DoubleRightOutlined style={{ fontSize: 14, color: "#0078d4" }} />
              </div>
            </Tooltip>
          </div>
        )}
      </div>
    </Sider>
  );
}
