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
  HeartOutlined,
  CalendarOutlined,
  TeamOutlined,
  ReadOutlined,
  FireOutlined,
  FileTextOutlined,
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
      return ["list", "add", "edit", "delete", "view", "read", "export", "like", "comment", "publish", "register", "approve"];
    }
    if (!module) return [];
    const raw = String(module).trim().toLowerCase();
    const underscore = raw.replace(/-/g, "_");
    const hyphen = raw.replace(/_/g, "-");

    const found = permissions?.[raw] || permissions?.[underscore] || permissions?.[hyphen];
    if (Array.isArray(found) && found.length > 0) return found;

    if (raw === "feed" || raw === "volunteering-story-feed" || raw === "volunteering_story_feed") {
      const storyPerms = permissions?.["volunteering-impact-story"] || permissions?.["volunteering_impact_story"];
      if (Array.isArray(storyPerms) && storyPerms.length > 0) return storyPerms;
    }
    if (raw === "portal" || raw === "volunteering-portal" || raw === "volunteering_portal") {
      const evtPerms = permissions?.["volunteering-event"] || permissions?.["volunteering_event"];
      if (Array.isArray(evtPerms) && evtPerms.length > 0) return evtPerms;
    }
    return [];
  };

  const canAccessItem = (item) => {
    const u = getUser();
    if (u && (u.isConfigurator === true || u.rol_is_configurator === true)) {
      return true;
    }

    const itemUrl = (item.url || item.path || "").trim().toLowerCase();
    const itemLabel = (item.label || item.title || "").trim().toLowerCase();
    const modKey = (item.module_key || "").trim().toLowerCase();

    // Always allow dashboard
    if (itemUrl.includes("dashboard") || itemLabel === "dashboard") {
      return true;
    }

    // Extract slug from URL
    const rawUrl = itemUrl
      .split("?")[0]
      .replace(/^\/+/, "")
      .replace(/^forms\//, "")
      .replace(/^admin\//, "")
      .replace(/^masters\//, "")
      .replace(/^event\//, "")
      .replace(/^volunteering\//, "");
    const parts = rawUrl.split("/").filter(Boolean);
    const slugCandidate = parts[parts.length - 1] || "";

    // Special volunteering mappings
    if (
      itemUrl.includes("/volunteering/portal") ||
      itemLabel.includes("volunteering hub") ||
      itemLabel.includes("my volunteering") ||
      slugCandidate === "portal"
    ) {
      return (
        hasPerm("volunteering_event").length > 0 ||
        hasPerm("volunteering-event").length > 0 ||
        hasPerm("portal").length > 0 ||
        hasPerm("volunteering-portal").length > 0 ||
        hasPerm("volunteering_portal").length > 0
      );
    }

    if (
      itemUrl.includes("/volunteering/feed") ||
      itemLabel.includes("story feed") ||
      itemLabel.includes("impact story feed") ||
      slugCandidate === "feed"
    ) {
      return (
        hasPerm("feed").length > 0 ||
        hasPerm("volunteering-impact-story").length > 0 ||
        hasPerm("volunteering_impact_story").length > 0 ||
        hasPerm("volunteering-story-feed").length > 0 ||
        hasPerm("volunteering_story_feed").length > 0
      );
    }

    if (
      itemUrl.includes("volunteering-impact-story") ||
      itemUrl.includes("volunteering_impact_story") ||
      itemLabel.includes("community impact") ||
      itemLabel.includes("impact stories") ||
      slugCandidate === "volunteering-impact-story" ||
      slugCandidate === "volunteering_impact_story"
    ) {
      return (
        hasPerm("volunteering-impact-story").length > 0 ||
        hasPerm("volunteering_impact_story").length > 0
      );
    }

    if (
      itemUrl.includes("volunteering-event") ||
      itemUrl.includes("volunteering_event") ||
      itemLabel.includes("events & calendar") ||
      slugCandidate === "volunteering-event" ||
      slugCandidate === "volunteering_event"
    ) {
      return (
        hasPerm("volunteering-event").length > 0 ||
        hasPerm("volunteering_event").length > 0
      );
    }

    if (
      itemUrl.includes("volunteering-program") ||
      itemUrl.includes("volunteering_program") ||
      itemLabel.includes("volunteering program") ||
      slugCandidate === "volunteering-program" ||
      slugCandidate === "volunteering_program"
    ) {
      return (
        hasPerm("volunteering-program").length > 0 ||
        hasPerm("volunteering_program").length > 0
      );
    }

    if (
      itemUrl.includes("event_type") ||
      itemUrl.includes("event-type") ||
      itemLabel.includes("event type") ||
      slugCandidate === "event_type" ||
      slugCandidate === "event-type"
    ) {
      return (
        hasPerm("event_type").length > 0 ||
        hasPerm("event-type").length > 0
      );
    }

    const candidates = [
      modKey,
      slugCandidate,
      rawUrl,
    ].filter(Boolean);

    // If explicit module or slug matches permissions
    return candidates.some((cand) => hasPerm(cand).length > 0);
  };

  // Helper to map DB menu tree to structured items
  const mapDynamicMenus = (menuTree, parentUrl = "", seenKeys = new Set()) => {
    const seenLabels = new Set();
    const dedupedTree = (menuTree || []).filter((item) => {
      const lbl = (item.label || "").trim().toLowerCase();
      if (!lbl) return false;
      if (seenLabels.has(lbl)) return false;
      seenLabels.add(lbl);
      return true;
    });

    const mapped = [];

    for (const item of dedupedTree) {
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

      let children;
      if (Array.isArray(item.children) && item.children.length > 0) {
        children = mapDynamicMenus(item.children, absoluteUrl || parentUrl, seenKeys);
      }

      const isParent = Array.isArray(children) && children.length > 0;
      const isLeafAccessible = canAccessItem({ ...item, url: absoluteUrl || item.url });

      if (isParent || isLeafAccessible) {
        mapped.push({
          key: uniqueKey,
          path: absoluteUrl,
          title: item.label,
          icon: renderIcon(item.icon),
          label: item.label,
          children: isParent ? children : undefined,
        });
      }
    }

    return mapped;
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

        // Exclude configurator portal tools from standard Admin sidebar
        if (item.is_configurator === true || url.startsWith("/configurator") || url.includes("/configurator/")) {
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

    // ── Ensure Impact Story Feed & Volunteering items appear dynamically if permitted ──
    const hasFeedInList = (list) =>
      (list || []).some((c) => {
        const p = String(c.path || c.key || "").toLowerCase();
        const t = String(c.title || c.label || "").toLowerCase();
        if (p.includes("/volunteering/feed") || t.includes("impact story feed") || t.includes("story feed")) return true;
        if (c.children && c.children.length > 0) return hasFeedInList(c.children);
        return false;
      });

    const feedPerms = hasPerm("feed");
    const canSeeFeed =
      feedPerms.length > 0 ||
      hasPerm("volunteering-impact-story").length > 0 ||
      hasPerm("volunteering_impact_story").length > 0 ||
      hasPerm("volunteering-story-feed").length > 0 ||
      userObj?.isConfigurator === true ||
      userObj?.rol_is_configurator === true;

    if (canSeeFeed && !hasFeedInList(items)) {
      const feedItem = {
        key: "/admin/volunteering/feed",
        path: "/admin/volunteering/feed",
        title: "Impact Story Feed",
        label: "Impact Story Feed",
        icon: <FireOutlined />,
      };

      const groupWithChildren = items.find((it) =>
        Array.isArray(it.children) &&
        it.children.length > 0 &&
        (String(it.key || "").toLowerCase().includes("volunteering") ||
         String(it.title || "").toLowerCase().includes("volunteering"))
      );

      if (groupWithChildren) {
        groupWithChildren.children.splice(1, 0, feedItem);
      } else {
        const portalIdx = items.findIndex((it) =>
          String(it.path || it.key || "").toLowerCase().includes("/volunteering/portal") ||
          String(it.title || it.label || "").toLowerCase().includes("volunteering hub") ||
          String(it.title || it.label || "").toLowerCase().includes("portal")
        );

        if (portalIdx !== -1) {
          items.splice(portalIdx + 1, 0, feedItem);
        }
      }
    }

    const hasStoriesInList = (list) =>
      (list || []).some((c) => {
        const p = String(c.path || c.key || "").toLowerCase();
        const t = String(c.title || c.label || "").toLowerCase();
        if (p.includes("volunteering-impact-story") || t.includes("community impact")) return true;
        if (c.children && c.children.length > 0) return hasStoriesInList(c.children);
        return false;
      });

    const storyPerms = hasPerm("volunteering-impact-story");
    const canSeeStories =
      storyPerms.length > 0 ||
      hasPerm("volunteering_impact_story").length > 0 ||
      userObj?.isConfigurator === true ||
      userObj?.rol_is_configurator === true;

    if (canSeeStories && !hasStoriesInList(items)) {
      const storyItem = {
        key: "/admin/event/volunteering-impact-story",
        path: "/admin/event/volunteering-impact-story",
        title: "Community Impact Stories",
        label: "Community Impact Stories",
        icon: <FileTextOutlined />,
      };

      const groupWithChildren = items.find((it) =>
        Array.isArray(it.children) &&
        it.children.length > 0 &&
        (String(it.key || "").toLowerCase().includes("volunteering") ||
         String(it.title || "").toLowerCase().includes("volunteering"))
      );

      if (groupWithChildren) {
        groupWithChildren.children.push(storyItem);
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
