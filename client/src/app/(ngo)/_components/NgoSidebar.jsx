'use client';

import React from "react";
import { Layout, Tooltip } from "antd";
import {
  DashboardOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  ProjectOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from "@ant-design/icons";
import { usePathname } from "next/navigation";
import Link from "@/components/Link";
import { useSettings } from "@/context/SettingsContext";

const { Sider } = Layout;

export const STATIC_NGO_MENU_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/ngo/dashboard",
    icon: <DashboardOutlined style={{ fontSize: 16 }} />,
  },
  {
    key: "profile",
    label: "Profile",
    path: "/ngo/profile",
    icon: <IdcardOutlined style={{ fontSize: 16 }} />,
  },
  {
    key: "dd",
    label: "DD",
    path: "/ngo/dd",
    icon: <SafetyCertificateOutlined style={{ fontSize: 16 }} />,
  },
  {
    key: "open-rfp",
    label: "Open RFP",
    path: "/ngo/open-rfp",
    icon: <FolderOpenOutlined style={{ fontSize: 16 }} />,
  },
  {
    key: "closed-rfp",
    label: "Closed RFP",
    path: "/ngo/closed-rfp",
    icon: <CheckCircleOutlined style={{ fontSize: 16 }} />,
  },
  {
    key: "projects",
    label: "Projects",
    path: "/ngo/projects",
    icon: <ProjectOutlined style={{ fontSize: 16 }} />,
  },
];

export default function NgoSidebar({ collapsed, onToggleCollapse }) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const primaryColor = settings?.primary_color || "#15803d";

  const getSelectedKey = () => {
    if (pathname.includes("/ngo/dashboard")) return "dashboard";
    if (pathname.includes("/ngo/profile")) return "profile";
    if (pathname.includes("/ngo/dd")) return "dd";
    if (pathname.includes("/ngo/open-rfp")) return "open-rfp";
    if (pathname.includes("/ngo/closed-rfp")) return "closed-rfp";
    if (pathname.includes("/ngo/projects")) return "projects";
    return "";
  };

  const selectedKey = getSelectedKey();

  return (
    <Sider
      width={240}
      collapsedWidth={60}
      collapsed={collapsed}
      trigger={null}
      className="portal-sider"
      style={{
        background: "var(--primary-gradient, var(--primary-color, #15803d))",
        borderRight: "none",
        height: "100%",
        position: "relative",
        flexShrink: 0,
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>

        {/* Section Label */}
        {!collapsed && (
          <div
            style={{
              padding: "16px 20px 10px",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.5)",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              marginBottom: 4,
            }}
          >
            NGO Navigation
          </div>
        )}

        {/* Menu Items */}
        <div style={{ flex: 1, padding: collapsed ? "10px 6px" : "8px 10px", overflowY: "auto" }}>
          {STATIC_NGO_MENU_ITEMS.map((item) => {
            const isActive = selectedKey === item.key;

            const linkContent = (
              <Link
                key={item.key}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: collapsed ? "10px 0" : "9px 14px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 7,
                  marginBottom: 4,
                  textDecoration: "none",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: 13.5,
                  color: "#ffffff",
                  opacity: isActive ? 1 : 0.72,
                  background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  borderLeft: isActive && !collapsed
                    ? "3px solid rgba(255,255,255,0.9)"
                    : "3px solid transparent",
                  transition: "all 0.15s ease-in-out",
                  position: "relative",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            return collapsed ? (
              <Tooltip key={item.key} title={item.label} placement="right">
                {linkContent}
              </Tooltip>
            ) : (
              <React.Fragment key={item.key}>{linkContent}</React.Fragment>
            );
          })}
        </div>

        {/* Footer Collapse Toggle */}
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          {!collapsed && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
              Collapse Sidebar
            </span>
          )}
          <div
            onClick={() => onToggleCollapse(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {collapsed
              ? <DoubleRightOutlined style={{ fontSize: 12, color: "#ffffff" }} />
              : <DoubleLeftOutlined style={{ fontSize: 12, color: "#ffffff" }} />
            }
          </div>
        </div>
      </div>
    </Sider>
  );
}
