'use client';

import React, { useState, useEffect } from "react";
import { Layout, ConfigProvider, App, Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import authUtils from "@/utils/authUtils";
import { useSettings } from "@/context/SettingsContext";
import NgoHeader from "./NgoHeader";
import NgoSidebar from "./NgoSidebar";

const { Content } = Layout;

export default function NgoLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Restore sidebar collapse state from localStorage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("ngo_sidebar_collapsed");
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
      localStorage.setItem("ngo_sidebar_collapsed", String(val));
    } catch (err) {
      console.error("Failed to save sidebar preference:", err);
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    authUtils.removeToken();
    router.replace("/");
  };

  const primaryColor = settings?.primary_color || "#15803d";

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
          colorPrimary: primaryColor,
          borderRadius: 8,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        components: {
          Card: {
            headerBg: "#ffffff",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          },
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#475569",
            rowHoverBg: "#f0fdf4",
          },
        },
      }}
    >
      <App>
        <Layout style={{
            height: "100vh",
            maxHeight: "100vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "#f0f4f8",
          }}>
          {/* Top Header */}
          <NgoHeader onSignOutClick={() => setShowLogoutModal(true)} />

          {/* Sider & Main Content Viewport */}
          <Layout hasSider style={{ flex: "1 1 0%", minHeight: 0, overflow: "hidden", background: "#f0f4f8", display: "flex" }}>
            <NgoSidebar
              collapsed={collapsed}
              onToggleCollapse={handleToggleCollapse}
            />

            <Content
              style={{
                flex: 1,
                minWidth: 0,
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                padding: pathname?.includes("/notification") ? 0 : "20px 24px 16px",
                background: "#f0f4f8",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: "1 0 auto" }}>
                {children}
              </div>

              {/* Portal Footer */}
              <footer
                style={{
                  textAlign: "center",
                  padding: "20px 16px 8px",
                  color: "#64748b",
                  fontSize: "12.5px",
                  marginTop: "auto",
                }}
              >
                {renderFooterContent()}
              </footer>
            </Content>
          </Layout>

          {/* Logout Confirmation Modal */}
          <Modal
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 20 }} />
                <span style={{ fontWeight: 700, fontSize: 16 }}>Confirm Sign Out</span>
              </div>
            }
            open={showLogoutModal}
            onOk={confirmLogout}
            onCancel={() => setShowLogoutModal(false)}
            okText="Yes, Sign Out"
            cancelText="Cancel"
            okButtonProps={{ danger: true, style: { borderRadius: 6, fontWeight: 600 } }}
            cancelButtonProps={{ style: { borderRadius: 6 } }}
            centered
            width={400}
          >
            <p style={{ color: "#475569", fontSize: 14, margin: "12px 0 4px" }}>
              Are you sure you want to sign out from the NGO Portal?
            </p>
          </Modal>
        </Layout>
      </App>
    </ConfigProvider>
  );
}
