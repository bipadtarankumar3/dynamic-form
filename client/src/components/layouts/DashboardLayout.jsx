'use client';

import React, { useEffect, useState } from "react";
import {
  Layout,
  ConfigProvider,
  Avatar,
  App,
  Modal,
  Button,
  Divider,
} from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-toastify";
import moment from "moment";
import { FaUserCircle } from "react-icons/fa";

import { privateHttpClient } from "@/services/api/httpClient";
import authUtils from "@/utils/authUtils";
import { useAuth, getUser } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import ChangePassword from "./ChangePassword";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

const { Content } = Layout;

const DashboardLayout = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, getSettingUrl } = useSettings();
  const { user, userProfile } = useAuth();
  const { role_name, name, email, phone, created_at } = getUser();

  const [collapsed, setCollapsed] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);

  // Restore sidebar collapse state from localStorage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("admin_sidebar_collapsed");
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
      localStorage.setItem("admin_sidebar_collapsed", String(val));
    } catch (err) {
      console.error("Failed to save sidebar preference:", err);
    }
  };

  const handleMyProfile = () => setIsProfileModalVisible(true);
  const handleProfileCancel = () => setIsProfileModalVisible(false);
  const handleChangePassword = () => setIsChangePasswordVisible(true);
  const handleChangePasswordClose = () => setIsChangePasswordVisible(false);
  const showLogoutModal = () => setIsModalVisible(true);
  const handleCancel = () => setIsModalVisible(false);

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

  const handleOk = async () => {
    try {
      setLogoutLoading(true);
      await privateHttpClient.get("common/logout");
      authUtils.removeToken();
      router.replace("/");
      setIsModalVisible(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to logout");
    } finally {
      setLogoutLoading(false);
    }
  };

  const displayName = userProfile?.name || user?.name || name || "Admin User";
  const displayEmail = userProfile?.email || user?.email || email || "";
  const displayPhone = userProfile?.mobile || user?.phone || phone || "";
  const displayPic = userProfile?.profile_pic ? getSettingUrl(userProfile.profile_pic) : "";
  const userInitials = displayName
    ? displayName.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "AU";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: settings?.primary_color || "#15803d",
          borderRadius: 8,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        components: {
          Card: {
            headerBg: "rgba(255, 255, 255, 0.4)",
            boxShadow: "0 4px 18px 0 rgba(31, 38, 135, 0.03)",
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
        <Layout className="configurator-outer-layout" id="background">
          {/* Extracted Admin Header */}
          <AdminHeader
            onProfileClick={handleMyProfile}
            onChangePasswordClick={handleChangePassword}
            onSignOutClick={showLogoutModal}
          />

          {/* Body Layout: Sidebar + Viewport Content */}
          <Layout className="configurator-body-layout">
            {/* Extracted Admin Sidebar */}
            <AdminSidebar
              collapsed={collapsed}
              onToggleCollapse={handleToggleCollapse}
            />

            {/* Content Viewport */}
            <Content className="configurator-content-viewport" style={{ display: "flex", flexDirection: "column" }}>
              <div
                className="animate-fade-in"
                style={{
                  flex: "1 0 auto",
                  width: "100%",
                  padding: pathname?.includes("/notification") ? 0 : "20px 24px 16px",
                }}
              >
                {children}
              </div>

              {/* Admin Portal Footer */}
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

          {/* Profile Modal */}
          {isProfileModalVisible && (
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <FaUserCircle />
                  <span>My Profile</span>
                </div>
              }
              width={360}
              open={isProfileModalVisible}
              onCancel={handleProfileCancel}
              footer={
                <div style={{ textAlign: "center" }}>
                  <Divider style={{ margin: "12px 0" }} />
                  <Button onClick={handleProfileCancel}>Close</Button>
                </div>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
                <Avatar
                  size={64}
                  src={displayPic || undefined}
                  style={{
                    backgroundColor: displayPic ? "transparent" : (settings?.primary_color || "#10b981"),
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 700,
                    border: displayPic ? "2px solid #e2e8f0" : "none",
                    marginBottom: 8,
                  }}
                >
                  {!displayPic && userInitials}
                </Avatar>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{displayName}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{displayEmail}</span>
              </div>
              <div className="space-y-1.5" style={{ fontSize: 13, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                <p>
                  <strong>Role:</strong> {userProfile?.role?.name || role_name || "User"}
                </p>
                <p>
                  <strong>Phone:</strong> {displayPhone || "N/A"}
                </p>
                {userProfile?.department && (
                  <p>
                    <strong>Department:</strong> {userProfile.department}
                  </p>
                )}
                {userProfile?.designation && (
                  <p>
                    <strong>Designation:</strong> {userProfile.designation}
                  </p>
                )}
                <p>
                  <strong>Joined:</strong>{" "}
                  {created_at ? moment(created_at).format("DD/MM/YYYY") : "N/A"}
                </p>
              </div>
            </Modal>
          )}

          {/* Change Password Modal */}
          {isChangePasswordVisible && (
            <ChangePassword
              isChangePasswordVisible={isChangePasswordVisible}
              handleChangePasswordClose={handleChangePasswordClose}
            />
          )}

          {/* Logout Confirmation Modal */}
          <Modal
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 20 }} />
                <span style={{ fontWeight: 600, fontSize: 16 }}>Confirm Sign Out</span>
              </div>
            }
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
            okText="Yes, Sign Out"
            cancelText="Cancel"
            okButtonProps={{
              danger: true,
              loading: logoutLoading,
              style: { borderRadius: 6, fontWeight: 500 },
            }}
            cancelButtonProps={{
              style: { borderRadius: 6 },
            }}
            centered
            width={400}
          >
            <p style={{ color: "#4b5563", fontSize: 14, margin: "12px 0 4px" }}>
              Are you sure you want to sign out from the Admin Portal?
            </p>
          </Modal>
        </Layout>
      </App>
    </ConfigProvider>
  );
};

export default DashboardLayout;
