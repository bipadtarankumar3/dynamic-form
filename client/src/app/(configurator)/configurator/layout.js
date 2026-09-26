'use client';

import React, { useState, useEffect } from "react";
import { Layout, Menu, Space, ConfigProvider, Avatar, App, Dropdown, Tooltip, Modal, Badge } from "antd";
import {
  LockOutlined,
  LayoutOutlined,
  FileProtectOutlined,
  LogoutOutlined,
  MenuOutlined,
  FormOutlined,
  BellOutlined,
  SettingOutlined,
  AreaChartOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  AppstoreAddOutlined,
  UnorderedListOutlined,
  QuestionCircleOutlined,
  SoundOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  AppstoreOutlined,
  DownOutlined,
  UpOutlined,
  SlidersOutlined
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import authUtils from "@/utils/authUtils";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import Link from "@/components/Link";
import sidebarBg from "@/assets/images/backgrounds/side-bar-bg.png";
import Image from "next/image";
import dashboardIcon from "@/assets/images/backgrounds/Dashboard-icon.png";
import dashboardIcon1 from "@/assets/images/backgrounds/dashboardIcon1.png";
import formsBuilders from "@/assets/images/backgrounds/FormsBuilder.png";
import DatabaseViews from "@/assets/images/backgrounds/DatabaseViews.png";
import MasterConfigs from "@/assets/images/backgrounds/MasterConfigs.png";
import SidebarMenus from "@/assets/images/backgrounds/SidebarMenus.png";
import DashboardWizard from "@/assets/images/backgrounds/DashboardWizard.png";
import dashboard from "@/assets/images/backgrounds/dashboard.png";
import ReportBuilder from "@/assets/images/backgrounds/ReportBuilder.png";
import Permissions from "@/assets/images/backgrounds/Permissions.png";
import { width } from "highcharts";
const { Header, Content, Sider } = Layout;

export default function ConfiguratorLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Restore sidebar collapse preference from localStorage on mount
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("configurator_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setCollapsed(savedCollapsed === "true");
      }
    } catch (err) {
      console.error("Failed to load sidebar preference:", err);
    }
  }, []);

  const handleToggleCollapse = (val) => {
    setCollapsed(val);
    try {
      localStorage.setItem("configurator_sidebar_collapsed", String(val));
    } catch (err) {
      console.error("Failed to save sidebar preference:", err);
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    authUtils.removeToken();
    router.replace("/");
  };

  const { settings, getSettingUrl } = useSettings();

  // Determine selected key from pathname
  let selectedKey = "dashboard";
  if (pathname.includes("/dashboard-builder/widgets") || pathname.includes("/mother-dashboard")) selectedKey = "dashboard-widgets";
  else if (pathname.includes("/dashboard-builder/dashboards")) selectedKey = "custom-dashboards";
  else if (pathname.includes("/dashboard")) selectedKey = "dashboard";
  else if (pathname.includes("/formsbuilder")) selectedKey = "forms";
  else if (pathname.includes("/database-views")) selectedKey = "database-views";
  else if (pathname.includes("/masterconfigs")) selectedKey = "masterconfigs";
  else if (pathname.includes("/menus")) selectedKey = "menus";
  else if (pathname.includes("/rbac")) selectedKey = "rbac";
  else if (pathname.includes("/reports")) selectedKey = "reports";
  else if (pathname.includes("/settings")) selectedKey = "settings";

  // Dynamic Breadcrumb Generator starting directly with Configurator / [Module]
  const getDynamicBreadcrumbs = (path) => {
    const labelMap = {
      "configurator": "Configurator",
      "dashboard": "Dashboard",
      "formsbuilder": "Forms Builder",
      "database-views": "Database Views",
      "masterconfigs": "Master Configs",
      "menus": "Sidebar Menus",
      "dashboard-builder": "Dashboard Builder",
      "widgets": "Dashboard Wizard",
      "dashboards": "Dashboards",
      "mother-dashboard": "Mother Dashboard",
      "reports": "Report Builder",
      "settings": "Site Settings",
      "rbac": "RBAC & Permissions",
      "notification": "Notifications",
      "list": "List",
      "create": "Create",
      "edit": "Edit",
      "view": "View",
      "preview": "Preview"
    };

    const crumbs = [];

    // Filter segments ignoring empty ones
    const segments = (path || "").split("/").filter(Boolean);

    let accumulatedPath = "";
    segments.forEach((seg, index) => {
      accumulatedPath += `/${seg}`;
      const isLast = index === segments.length - 1;
      const key = seg.toLowerCase();
      const label = labelMap[key] ||
        seg.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

      crumbs.push({
        label,
        path: key === "configurator" ? "/configurator/dashboard" : accumulatedPath,
        active: isLast
      });
    });

    return crumbs;
  };

  const displayName = userProfile?.name || user?.name || "System Configurator";
  const displayEmail = userProfile?.email || user?.email || "configurator@cyberswift.com";
  const displayPic = userProfile?.profile_pic ? getSettingUrl(userProfile.profile_pic) : "";
  const userInitials = displayName ? displayName.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase() : "SC";

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
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: <Link to="/configurator/settings">Site Settings</Link>,
    },
    {
      key: "forms",
      icon: <FormOutlined />,
      label: <Link to="/configurator/formsbuilder">Forms Builder</Link>,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#ef4444" }} />,
      label: <span style={{ color: "#ef4444", fontWeight: 500 }}>Sign out</span>,
      onClick: () => setShowLogoutModal(true),
    },
  ];

  const breadcrumbs = getDynamicBreadcrumbs(pathname);
  const headerBackground = "var(--primary-gradient, var(--primary-color, #15803d))";

  const renderFooterContent = () => {
    const currentYear = new Date().getFullYear();
    const siteName = settings?.site_title || settings?.site_name || "CSR Portal";
    const rawText = settings?.footer_text || `Copyright © ${currentYear} ${siteName}. All rights reserved. | Powered by [TechCSR](https://techcsr.com/)`;

    const match = rawText.match(/^(.*?)\[(.*?)\]\((.*?)\)(.*)$/);
    if (match) {
      return (
        <>
          {match[1]}
          <a
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="ngo-footer-link"
          >
            {match[2]}
          </a>
          {match[4]}
        </>
      );
    }

    if (rawText.includes("TechCSR")) {
      const parts = rawText.split("TechCSR");
      return (
        <>
          {parts[0]}
          <a
            href="https://techcsr.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="ngo-footer-link"
          >
            TechCSR
          </a>
          {parts.slice(1).join("TechCSR")}
        </>
      );
    }

    return rawText;
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: settings?.primary_color || "#15803d",
          borderRadius: 8,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
        },
        components: {
          Card: {
            headerBg: "rgba(255, 255, 255, 0.4)",
            boxShadow: "0 4px 18px 0 rgba(31, 38, 135, 0.03)"
          },
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#475569",
            rowHoverBg: "#f0fdf4"
          }
        }
      }}
    >
      <App>
        <Layout className="configurator-outer-layout">
          {/* Top Header Navbar with Dynamic Site Setting Color - FIXED */}
          <Header className="ado-header" style={{ background: headerBackground }}>
            {/* Left section: Custom Logo with White Container + Dynamic Route Breadcrumbs */}
            <div className="ado-brand-section">
              <Link to="/configurator/dashboard" style={{ display: "flex", alignItems: "center" }}>
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

            {/* Right section: Quick Action Icons + Site Settings + User Profile */}
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
              {/* <Tooltip title="Work items">
                <div className="ado-icon-btn">
                  <UnorderedListOutlined style={{ fontSize: 15 }} />
                </div>
              </Tooltip> */}

              {/* Notifications Bell */}
              <Tooltip title="Notifications">
                <div
                  className={`ado-icon-btn ${pathname.includes('/notification') ? 'ado-icon-btn-active' : ''}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push("/configurator/notification/list")}
                >
                  <Badge dot offset={[2, -2]}>
                    <BellOutlined style={{ fontSize: 15, color: "#fff" }} />
                  </Badge>
                </div>
              </Tooltip>

              {/* <Tooltip title="Help & support">
                <div className="ado-icon-btn">
                  <QuestionCircleOutlined style={{ fontSize: 15 }} />
                </div>
              </Tooltip> */}

              {/* Top Menu Site Settings */}
              <Tooltip title="Site Settings">
                <div
                  className={`ado-icon-btn ${pathname.includes('/settings') ? 'ado-icon-btn-active' : ''}`}
                  onClick={() => router.push("/configurator/settings")}
                >
                  <SettingOutlined style={{ fontSize: 16 }} />
                </div>
              </Tooltip>



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

          <Layout className="configurator-body-layout">
            {/* Azure DevOps Style Sidebar - FIXED */}
            <Sider
              width={240}
              collapsedWidth={52}
              collapsed={collapsed}
              trigger={null}
              className="ado-sider"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
                {/* Sider Top Header */}
                {/* {!collapsed ? (
                  <div className="ado-sider-top">
                    <div style={{ display: "flex", alignItems: "center", overflow: "hidden", flex: 1 }}>
                      <div className="ado-project-badge">
                        <img
                          src={getSettingUrl(settings?.site_logo) || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/assets/logo/TechCSR Logo.png`}
                          alt="Logo"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      </div>
                      <span className="ado-project-name">
                        {settings?.project_name || "CS"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="ado-sider-top-collapsed">
                    <Tooltip title={settings?.project_name || "CS"} placement="right">
                      <div className="ado-project-badge">
                        <img
                          src={getSettingUrl(settings?.site_logo) || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/assets/logo/TechCSR Logo.png`}
                          alt="Logo"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      </div>
                    </Tooltip>
                  </div>
                )} */}

                {/* Sider Navigation Menu */}
                <div className="ado-sidebar-content" style={{ flex: 1, overflowY: "auto" }}>
                  {/* Boards Category */}
                  {!collapsed && (
                    <div className="ado-sidebar-section-header">
                      <div className="ado-badge-icon" style={{ background: "var(--primary-color, #107c41)" }}>
                        <AppstoreOutlined style={{ color: "#ffffff", fontSize: 13 }} />
                      </div>
                      <span>Boards</span>
                    </div>
                  )}

                  {[
                    { key: "dashboard", label: "Dashboard", icon: <Image src={dashboardIcon1} alt="Badge Icon" width={150} height={150} />, path: "/configurator/dashboard" },
                    { key: "forms", label: "Forms Builder", icon: <Image src={formsBuilders} alt="Badge Icon" width={150} height={150} />, path: "/configurator/formsbuilder" },
                    { key: "database-views", label: "Database Views", icon: <Image src={DatabaseViews} alt="Badge Icon" width={150} height={150} />, path: "/configurator/database-views" },
                    { key: "masterconfigs", label: "Master Configs", icon: <Image src={MasterConfigs} alt="Badge Icon" width={150} height={150} />, path: "/configurator/masterconfigs" },
                    { key: "menus", label: "Sidebar Menus", icon: <Image src={SidebarMenus} alt="Badge Icon" width={150} height={150} />, path: "/configurator/menus" },
                  ].map(item => {
                    const isActive = selectedKey === item.key;
                    const content = (
                      <Link
                        key={item.key}
                        to={item.path}
                        className={`ado-menu-item ${isActive ? "ado-menu-item-active" : ""}`}
                        style={collapsed ? { justifyContent: "center", padding: 0 } : { paddingLeft: "32px" }}
                      >
                        <span className="ado-menu-icon" style={collapsed ? { margin: 0 } : {}}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="ado-menu-text">{item.label}</span>}
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.key} title={item.label} placement="right">
                        {content}
                      </Tooltip>
                    ) : content;
                  })}

                  {/* Dashboard Builder Category */}
                  {!collapsed ? (
                    <div
                      className="ado-sidebar-section-header"
                      style={{ marginTop: 8 }}
                      onClick={() => setDashboardOpen(!dashboardOpen)}
                    >
                      <div className="ado-badge-icon" style={{ background: settings?.secondary_color || "#f29019" }}>
                        {/* <Image src={dashboardIcon} alt="Badge Icon" width={24} height={24}/> */}
                        <AreaChartOutlined style={{ color: "#ffffff", fontSize: 13 }} />
                      </div>
                      <span style={{ flex: 1 }}>Dashboard Builder</span>
                    </div>
                  ) : null}

                  {(dashboardOpen || collapsed) && [
                    { key: "dashboard-widgets", label: "Dashboard Wizard", icon: <Image src={DashboardWizard} alt="Badge Icon" width={150} height={150} />, path: "/configurator/dashboard-builder/widgets" },
                    { key: "custom-dashboards", label: "Dashboards", icon: <Image src={dashboard} alt="Badge Icon" width={150} height={150} />, path: "/configurator/dashboard-builder/dashboards" },
                  ].map(item => {
                    const isActive = selectedKey === item.key;
                    const content = (
                      <Link
                        key={item.key}
                        to={item.path}
                        className={`ado-menu-item ${isActive ? "ado-menu-item-active" : ""}`}
                        style={collapsed ? { justifyContent: "center", padding: 0 } : { paddingLeft: "32px" }}
                      >
                        <span className="ado-menu-icon" style={collapsed ? { margin: 0 } : {}}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="ado-menu-text">{item.label}</span>}
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.key} title={item.label} placement="right">
                        {content}
                      </Tooltip>
                    ) : content;
                  })}

                  {/* Pipelines & Reports Category */}
                  {!collapsed && (
                    <div className="ado-sidebar-section-header" style={{ marginTop: 8 }}>
                      <div className="ado-badge-icon" style={{ background: "var(--primary-gradient, var(--primary-color, #15803d))" }}>
                        <FileProtectOutlined style={{ color: "#ffffff", fontSize: 13 }} />
                      </div>
                      <span>Reports & Security</span>
                    </div>
                  )}

                  {[
                    { key: "reports", label: "Report Builder", icon: <Image src={ReportBuilder} alt="Badge Icon" width={150} height={150} />, path: "/configurator/reports" },
                    // { key: "rbac", label: "RBAC & Permissions", icon: <Image src={Permissions} alt="Badge Icon" width={150} height={150} />, path: "/configurator/rbac" },
                  ].map(item => {
                    const isActive = selectedKey === item.key;
                    const content = (
                      <Link
                        key={item.key}
                        to={item.path}
                        className={`ado-menu-item ${isActive ? "ado-menu-item-active" : ""}`}
                        style={collapsed ? { justifyContent: "center", padding: 0 } : { paddingLeft: "32px" }}
                      >
                        <span className="ado-menu-icon" style={collapsed ? { margin: 0 } : {}}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="ado-menu-text">{item.label}</span>}
                      </Link>
                    );
                    return collapsed ? (
                      <Tooltip key={item.key} title={item.label} placement="right">
                        {content}
                      </Tooltip>
                    ) : content;
                  })}
                </div>

                {/* Sider Footer */}
                {!collapsed ? (
                  <div className="ado-sider-footer">
                    <div
                      className="ado-footer-btn"
                      onClick={() => router.push("/configurator/settings")}
                    >
                      <SettingOutlined style={{ fontSize: 14 }} />
                      <span>Project settings</span>
                    </div>
                    <div
                      className="ado-collapse-toggle"
                      onClick={() => handleToggleCollapse(true)}
                      title="Collapse"
                    >
                      <DoubleLeftOutlined />
                    </div>
                  </div>
                ) : (
                  <div className="ado-sider-footer-collapsed">
                    <Tooltip title="Project settings" placement="right">
                      <div
                        className="ado-collapse-toggle"
                        onClick={() => router.push("/configurator/settings")}
                      >
                        <SettingOutlined style={{ fontSize: 16 }} />
                      </div>
                    </Tooltip>
                    <Tooltip title="Expand" placement="right">
                      <div
                        className="ado-collapse-toggle"
                        onClick={() => handleToggleCollapse(false)}
                      >
                        <DoubleRightOutlined style={{ fontSize: 14, color: "#0078d4" }} />
                      </div>
                    </Tooltip>
                  </div>
                )}
              </div>
            </Sider>

            {/* Content Viewport: Expands full width when collapsed, scrolls internally */}
            <Content className="configurator-content-viewport" style={{ display: "flex", flexDirection: "column" }}>
              <div className="animate-fade-in" style={{ flex: "1 0 auto", width: "100%" }}>
                {children}
              </div>

              {/* Portal Footer */}
              <footer
                style={{
                  textAlign: "center",
                  padding: "20px 16px 12px",
                  color: "#64748b",
                  fontSize: "12.5px",
                  marginTop: "auto",
                }}
              >
                {renderFooterContent()}
              </footer>
            </Content>
          </Layout>

          {/* Sign Out Confirmation Modal */}
          <Modal
            title={
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: "20px" }} />
                <span style={{ fontWeight: 600, fontSize: "16px" }}>Confirm Sign Out</span>
              </div>
            }
            open={showLogoutModal}
            onOk={confirmLogout}
            onCancel={() => setShowLogoutModal(false)}
            okText="Yes, Sign Out"
            cancelText="Cancel"
            okButtonProps={{
              danger: true,
              style: { borderRadius: 6, fontWeight: 500 }
            }}
            cancelButtonProps={{
              style: { borderRadius: 6 }
            }}
            centered
            width={400}
          >
            <p style={{ color: "#4b5563", fontSize: "14px", marginTop: "12px", marginBottom: "4px" }}>
              Are you sure you want to sign out from the Configurator Portal?
            </p>
          </Modal>
        </Layout>
      </App>
    </ConfigProvider>
  );
}
