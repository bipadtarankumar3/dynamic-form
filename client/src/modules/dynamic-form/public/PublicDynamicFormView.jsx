import React, { useState, useEffect } from "react";
import {
  Card,
  Spin,
  Typography,
  Tag,
  Result,
  Button,
  Alert,
  Space
} from "antd";
import {
  SecurityScanOutlined,
  FormOutlined,
  ReloadOutlined,
  LockOutlined
} from "@ant-design/icons";
import { publicFormSchemaAPI } from "@/services/dynamicForm-service";
import PublicDynamicAddEditForm from "./PublicDynamicAddEditForm";
import { useSettings } from "@/context/SettingsContext";

const { Title, Paragraph } = Typography;

export default function PublicDynamicFormView({ form_slug }) {
  const { settings, getSettingUrl } = useSettings();
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const primaryColor = settings?.primary_color || "#15803d";
  const secondaryColor = settings?.secondary_color || "#659327";
  const siteName = settings?.site_name || settings?.site_title || "Tech CSR";
  const siteDescription =
    settings?.site_description ||
    "Welcome to the centralized Corporate Social Responsibility management platform. Register below to partner with us and measure community impact.";
  const logoSrc = settings?.site_logo
    ? getSettingUrl(settings.site_logo)
    : `${process.env.NEXT_PUBLIC_BASE_URL || ''}/assets/logo/TechCSR Logo.png`;

  const bgGradient = `var(--primary-gradient, linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%))`;
  const leftPanelBg = `linear-gradient(160deg, var(--primary-color-dark, ${primaryColor}) 0%, var(--primary-color, ${primaryColor}) 100%)`;

  useEffect(() => {
    async function loadPublicForm() {
      if (!form_slug) return;
      try {
        setLoading(true);
        setError(null);
        const res = await publicFormSchemaAPI({ form_slug });
        setSchema(res.data?.data || res.data || {});
      } catch (err) {
        console.error("Failed to load public form schema:", err);
        setError(err.response?.data?.message || "Failed to load public registration form.");
      } finally {
        setLoading(false);
      }
    }
    loadPublicForm();
  }, [form_slug]);

  if (loading) {
    return (
      <div
        style={{
          background: bgGradient,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <div style={{ background: "#ffffff", padding: "32px 48px", borderRadius: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", textAlign: "center" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px", color: "#475569", fontWeight: 700, fontSize: "16px" }}>
            Loading Registration Portal...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: bgGradient,
          minHeight: "100vh",
          padding: "60px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div style={{ maxWidth: "600px", width: "100%" }}>
          <Alert
            type="error"
            message="Registration Form Unavailable"
            description={error}
            showIcon
            action={
              <Button size="small" type="primary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
            style={{ borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        style={{
          background: bgGradient,
          minHeight: "100vh",
          padding: "60px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Card
          variant="borderless"
          style={{
            maxWidth: "650px",
            width: "100%",
            borderRadius: "20px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            textAlign: "center",
            padding: "24px"
          }}
        >
          <Result
            status="success"
            title="Form Registration Submitted Successfully!"
            subTitle="Your submission has been securely recorded and queued for CSR Admin review."
            extra={[
              <Button
                type="primary"
                key="new"
                onClick={() => setSubmitted(false)}
                icon={<ReloadOutlined />}
                style={{
                  height: "44px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  background: bgGradient,
                  border: "none",
                  boxShadow: `0 4px 14px ${primaryColor}40`
                }}
              >
                Submit Another Response
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        background: bgGradient,
        overflow: "hidden"
      }}
    >
      {/* Floating Translucent Background Decorative Circles */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.06)",
          pointerEvents: "none"
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.05)",
          pointerEvents: "none"
        }}
      />

      {/* Main Split Card (Matching Login Page) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          width: "1150px",
          maxWidth: "98vw",
          minHeight: "650px",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.4)",
          background: "#ffffff"
        }}
      >
        {/* LEFT PANEL — Brand Side with Dynamic Admin Colors */}
        <div
          style={{
            width: "320px",
            flexShrink: 0,
            background: leftPanelBg,
            display: "flex",
            flexDirection: "column",
            padding: "36px 28px",
            position: "relative",
            color: "#ffffff"
          }}
        >
          {/* Top Logo Badge */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "12px",
              padding: "10px 16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              width: "fit-content",
              marginBottom: "40px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}
          >
            <img
              src={logoSrc}
              alt={`${siteName} Logo`}
              style={{ height: "42px", maxWidth: "140px", objectFit: "contain" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
            <span style={{ fontWeight: 800, color: primaryColor, fontSize: "20px", letterSpacing: "-0.5px" }}>
              {siteName}
            </span>
          </div>

          {/* Left Panel Body Description */}
          <div style={{ marginBottom: "auto" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255, 255, 255, 0.8)", marginBottom: "8px" }}>
              {siteName.toUpperCase()} PLATFORM
            </p>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", margin: "0 0 16px 0", lineHeight: "1.2" }}>
              {siteName}
            </h1>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(255, 255, 255, 0.88)", margin: 0 }}>
              {siteDescription}
            </p>
          </div>

          {/* Security Badge & Copyright Footer */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "16px", marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255, 255, 255, 0.85)", marginBottom: "8px" }}>
              <LockOutlined /> Protected by Enterprise Security
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.75)" }}>
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — White Form Container */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: "#ffffff",
            padding: "36px 40px",
            display: "flex",
            flexDirection: "column",
            maxHeight: "88vh",
            overflowY: "auto"
          }}
        >
          {/* Header Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px", marginBottom: "24px" }}>
            <div>
              <Space align="center" style={{ marginBottom: "4px" }}>
                <FormOutlined style={{ fontSize: "24px", color: primaryColor }} />
                <Title level={3} style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
                  {schema?.title || "Public Registration Form"}
                </Title>
              </Space>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: "14px" }}>
                Please fill out all required details below. Submissions are verified for CSR portal eligibility.
              </Paragraph>
            </div>
            <Tag
              icon={<SecurityScanOutlined />}
              style={{
                fontSize: "13px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontWeight: 700,
                border: `1px solid ${primaryColor}40`,
                background: `${primaryColor}10`,
                color: primaryColor
              }}
            >
              Official Public Portal
            </Tag>
          </div>

          {/* Standalone Public Form Engine */}
          <PublicDynamicAddEditForm
            mode="add"
            form_slug={form_slug}
            onClose={() => setSubmitted(true)}
            fetchData={() => {}}
            selectedData={{}}
            childrenInformation={{}}
          />
        </div>
      </div>
    </div>
  );
}
