'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Layout, Avatar, Dropdown, Tooltip, Badge } from "antd";
import {
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  LockOutlined,
  SlidersOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Link from "@/components/Link";
import { useAuth, getUser } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { fetchNotifications } from "@/store/slices/NotificationSlice";

const { Header } = Layout;

export default function AdminHeader({ onSignOutClick, onProfileClick, onChangePasswordClick }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { settings, getSettingUrl } = useSettings();
  const { user, userProfile } = useAuth();
  const userObj = getUser();
  const { role_name, name, email } = userObj || {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const logo = getSettingUrl(settings?.site_logo) || `${baseUrl}/assets/logo/TechCSR Logo.png`;
  const headerBackground = "var(--primary-gradient, var(--primary-color, #15803d))";

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Notifications poll
  useEffect(() => {
    dispatch(fetchNotifications());
    const interval = setInterval(() => {
      dispatch(fetchNotifications());
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const { notifications } = useSelector((state) => state.NotificationSlice || {});
  const unreadNotifCount = useMemo(() => {
    if (!Array.isArray(notifications)) return 0;
    return notifications.filter((n) => n?.tntf_is_read !== true && n?.is_read !== true).length;
  }, [notifications]);

  // Dynamic Breadcrumbs
  const getDynamicBreadcrumbs = (path) => {
    const labelMap = {
      admin: "Admin",
      dashboard: "Dashboard",
      auth: "Auth",
      users: "Users",
      roles: "Roles",
      permissions: "Permissions",
      "approval-path": "Approval Path",
      notification: "Notifications",
      "audit-log": "Audit Log",
      "dynamic-report": "Dynamic Reports",
      "form-view": "Form View",
      forms: "Forms",
      masters: "Masters",
      "mother-dashboard": "Mother Dashboard",
      projects: "CSR Projects",
      reports: "Reports",
      settings: "Site Settings",
      list: "List",
      create: "Create",
      edit: "Edit",
      view: "View",
      preview: "Preview",
    };

    const crumbs = [];
    const segments = (path || "").split("/").filter(Boolean);

    let accumulatedPath = "";
    segments.forEach((seg, index) => {
      accumulatedPath += `/${seg}`;
      const isLast = index === segments.length - 1;
      const key = seg.toLowerCase();
      const label = labelMap[key] ||
        seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      let crumbPath = accumulatedPath;
      if (key === "admin") {
        crumbPath = "/admin/dashboard";
      } else if (key === "auth") {
        crumbPath = "/admin/auth/users";
      }

      crumbs.push({
        label,
        path: crumbPath,
        active: isLast,
      });
    });

    return crumbs;
  };

  const breadcrumbs = getDynamicBreadcrumbs(pathname);

  const displayName = userProfile?.name || user?.name || name || "Admin User";
  const displayEmail = userProfile?.email || user?.email || email || "";
  const displayPic = userProfile?.profile_pic ? getSettingUrl(userProfile.profile_pic) : "";
  const userInitials = displayName
    ? displayName.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "AU";
  const userRole = userProfile?.role?.name || role_name || "Admin";

  const userMenuItems = [
    {
      key: "user-info",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220, padding: "4px 0" }}>
          <Avatar
            key={displayPic ? `dropdown-avatar-${displayPic}` : "dropdown-avatar-text"}
            size={40}
            src={displayPic || undefined}
            style={{
              backgroundColor: displayPic ? "transparent" : (settings?.primary_color || "#15803d"),
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              border: displayPic ? "1.5px solid #e2e8f0" : "none",
            }}
          >
            {!displayPic && userInitials}
          </Avatar>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {displayName}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {displayEmail}
            </div>
            {userRole && (
              <div style={{ marginTop: 3 }}>
                <span style={{ fontSize: "10.5px", background: "#f0fdf4", color: "#166534", padding: "1px 7px", borderRadius: 10, fontWeight: 700, border: "1px solid #bbf7d0" }}>
                  {userRole}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    ...(userObj?.isConfigurator === true
      ? [
          {
            key: "configurator-panel",
            icon: <SlidersOutlined />,
            label: <Link to="/configurator/dashboard">Configurator Portal</Link>,
          },
        ]
      : []),
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "My Profile",
      onClick: onProfileClick,
    },
    {
      key: "change-password",
      icon: <LockOutlined />,
      label: "Change Password",
      onClick: onChangePasswordClick,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#ef4444" }} />,
      label: <span style={{ color: "#ef4444", fontWeight: 500 }}>Sign out</span>,
      onClick: onSignOutClick,
    },
  ];

  return (
    <Header className="ado-header" style={{ background: headerBackground }}>
      {/* Left section: Logo container + Breadcrumbs */}
      <div className="ado-brand-section">
        <Link to="/admin/dashboard" style={{ display: "flex", alignItems: "center" }}>
          <div className="ado-logo-container">
            <img
              src={logo}
              alt={settings?.site_name || "TechCSR"}
              style={{ height: "24px", maxWidth: "130px", objectFit: "contain", display: "block" }}
            />
          </div>
        </Link>

        <div className="ado-breadcrumbs">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="ado-crumb-separator">/</span>}
              {crumb.active ? (
                <span className="ado-crumb-active">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="ado-crumb-item">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right section: Fullscreen, Notifications, Configurator, Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* Fullscreen toggle */}
        <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
          <div className="ado-icon-btn" onClick={toggleFullscreen} style={{ cursor: "pointer" }}>
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </div>
        </Tooltip>

        {/* Notifications Bell */}
        <Tooltip title="Notifications">
          <div
            className={`ado-icon-btn ${pathname?.includes('/notification') ? 'ado-icon-btn-active' : ''}`}
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/notification/list")}
          >
            <Badge count={unreadNotifCount} size="small" offset={[2, -2]}>
              <BellOutlined style={{ fontSize: 15, color: "#fff" }} />
            </Badge>
          </div>
        </Tooltip>

        {/* Configurator Shortcut */}
        {userObj?.isConfigurator === true && (
          <Tooltip title="Configurator Portal">
            <div
              className={`ado-icon-btn ${pathname?.includes('/configurator') ? 'ado-icon-btn-active' : ''}`}
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/configurator/dashboard")}
            >
              <SlidersOutlined style={{ fontSize: 15 }} />
            </div>
          </Tooltip>
        )}

        {/* User Avatar Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
          <div className="ado-avatar-btn" style={{ marginLeft: "4px", cursor: "pointer" }}>
            <Avatar
              key={displayPic ? `header-avatar-${displayPic}` : "header-avatar-text"}
              size={28}
              src={displayPic || undefined}
              style={{
                backgroundColor: displayPic ? "transparent" : "#ffffff",
                color: settings?.primary_color || "#15803d",
                fontWeight: 800,
                fontSize: 12,
                border: displayPic ? "1.5px solid rgba(255, 255, 255, 0.9)" : "none",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }}
            >
              {!displayPic && userInitials}
            </Avatar>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}
