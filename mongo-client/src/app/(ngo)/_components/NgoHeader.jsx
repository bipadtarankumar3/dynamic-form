'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Layout, Dropdown, Avatar, Tooltip, Badge } from "antd";
import {
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Link from "@/components/Link";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { fetchNotifications } from "@/store/slices/NotificationSlice";

const { Header } = Layout;

export default function NgoHeader({ onSignOutClick }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user, userProfile } = useAuth();
  const { settings, getSettingUrl } = useSettings();
  const { notifications } = useSelector((state) => state.NotificationSlice || {});
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications());
    const handleRefresh = () => dispatch(fetchNotifications());
    window.addEventListener("refreshNotifications", handleRefresh);
    return () => window.removeEventListener("refreshNotifications", handleRefresh);
  }, [dispatch]);

  const unreadNotifCount = useMemo(() => {
    if (!Array.isArray(notifications)) return 0;
    return notifications.filter((n) => n?.tntf_is_read !== true && n?.is_read !== true).length;
  }, [notifications]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Dynamic Breadcrumb Generator for NGO Portal
  const getDynamicBreadcrumbs = (path) => {
    const labelMap = {
      ngo: "NGO Portal",
      dashboard: "Dashboard",
      profile: "Organization Profile",
      dd: "Due Diligence (DD)",
      "open-rfp": "Open RFPs",
      "closed-rfp": "Closed RFPs",
      projects: "CSR Projects",
      notifications: "Notifications",
      notification: "Notifications",
      list: "List",
    };

    const crumbs = [];
    const segments = (path || "").split("/").filter(Boolean);

    let accumulatedPath = "";
    segments.forEach((seg, index) => {
      accumulatedPath += `/${seg}`;
      const isLast = index === segments.length - 1;
      const key = seg.toLowerCase();
      const label =
        labelMap[key] ||
        seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      crumbs.push({
        label,
        path: key === "ngo" ? "/ngo/dashboard" : accumulatedPath,
        active: isLast,
      });
    });

    return crumbs;
  };

  const displayName = userProfile?.name || user?.name || "NGO Representative";
  const displayEmail = userProfile?.email || user?.email || "partner@ngo.org";
  const displayPic = userProfile?.profile_pic ? getSettingUrl(userProfile.profile_pic) : "";
  const userInitials = displayName
    ? displayName.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "NP";

  const userMenuItems = [
    {
      key: "user-info",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220, padding: "4px 0" }}>
          <Avatar
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
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: "10.5px", background: "#f0fdf4", color: "#166534", padding: "2px 8px", borderRadius: 10, fontWeight: 700, border: "1px solid #bbf7d0" }}>
                NGO PARTNER
              </span>
            </div>
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: <Link to="/ngo/profile">My Profile</Link>,
    },
    {
      key: "dd",
      icon: <FolderOpenOutlined />,
      label: <Link to="/ngo/dd">Due Diligence Records</Link>,
    },
    {
      key: "notifications",
      icon: <BellOutlined />,
      label: <Link to="/ngo/notification/list">Notifications</Link>,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#ef4444" }} />,
      label: <span style={{ color: "#ef4444", fontWeight: 500 }}>Sign Out</span>,
      onClick: onSignOutClick,
    },
  ];

  const breadcrumbs = getDynamicBreadcrumbs(pathname);
  const headerBackground = "var(--primary-gradient, var(--primary-color, #15803d))";

  return (
    <Header className="ado-header" style={{ background: headerBackground }}>
      {/* Left section: Logo + Breadcrumbs — identical to configurator */}
      <div className="ado-brand-section">
        <Link to="/ngo/dashboard" style={{ display: "flex", alignItems: "center" }}>
          <div className="ado-logo-container">
            <img
              src={getSettingUrl(settings?.site_logo) || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/assets/logo/TechCSR Logo.png`}
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

      {/* Right section: Fullscreen + Notifications + User Avatar — identical to configurator */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* Fullscreen toggle */}
        <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
          <div className="ado-icon-btn" onClick={toggleFullscreen} style={{ cursor: "pointer" }}>
            {isFullscreen
              ? <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
              : <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
            }
          </div>
        </Tooltip>

        {/* Notifications Bell */}
        <Tooltip title="Notifications">
          <div
            className={`ado-icon-btn ${pathname?.includes('/notification') ? 'ado-icon-btn-active' : ''}`}
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/ngo/notification/list")}
          >
            <Badge count={unreadNotifCount} size="small" offset={[2, -2]}>
              <BellOutlined style={{ fontSize: 15, color: "#fff" }} />
            </Badge>
          </div>
        </Tooltip>

        {/* User Avatar Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
          <div className="ado-avatar-btn" style={{ marginLeft: "4px", cursor: "pointer" }}>
            <Avatar
              key={displayPic ? `ngo-header-avatar-${displayPic}` : "ngo-header-avatar-text"}
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
