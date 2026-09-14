import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Input,
  Button,
  Upload,
  Switch,
  Select,
  Radio,
  Tabs,
  Modal,
  Row,
  Col,
  Tag,
  Divider,
} from "antd";
import {
  FormatPainterOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  UploadOutlined,
  BgColorsOutlined,
  FileImageOutlined,
  FontSizeOutlined,
  LockOutlined,
  MailOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  CloudUploadOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { FaShieldAlt, FaKey } from "react-icons/fa";
import { useSettings } from "@/context/SettingsContext";
import { BUBBLE_ICON_OPTIONS, getBubbleIconComponent } from "@/utils/bubbleIcons";

const { TextArea } = Input;
const { Option } = Select;

// Curated Preset Templates
const PRESET_TEMPLATES = [
  {
    id: "eco_green",
    name: "Eco Sustainability & Nature",
    subtitle: "Default ecological forest & clean energy theme",
    badge: "Recommended",
    badgeColor: "green",
    primary_color: "#15803d",
    secondary_color: "#16a34a",
    login_bg_image: "/assets/images/backgrounds/login-bg.png",
    login_left_image: "/assets/images/backgrounds/left-side-img.jpg",
    login_tagline: "TECT CSR • SUSTAINABILITY",
    login_title: "Tect CSR",
    login_desc: "Welcome to the centralized Corporate Social Responsibility management platform. Sign in to manage projects, budgets, and measure community impact effortlessly.",
    login_signin_title: "Sign In",
    login_signin_sub: "Secure access to your CSR dashboard",
    login_logo_badge_style: "curve",
    login_show_bubbles: "true",
    login_bubble1_icon: "leaf",
    login_bubble1_title: "CSR Impact\nAssessment",
    login_bubble2_icon: "shield",
    login_bubble2_title: "CSR\nCompliance",
    login_bubble3_icon: "strategy",
    login_bubble3_title: "CSR\nStrategy",
    login_bubble4_icon: "hands",
    login_bubble4_title: "Corporate\nVolunteering",
    login_security_badge_text: "Protected by Enterprise Security",
    footer_text: "Copyright © 2026 TechCSR. All rights reserved. | Powered by TechCSR",
    login_auth_mode: "standard",
    sso_provider_type: "microsoft",
    sso_button_text: "Sign in with Microsoft 365",
    sso_login_url: "/api/v1/auth/sso",
  },
  {
    id: "corporate_blue",
    name: "Enterprise Corporate & Governance",
    subtitle: "High-contrast sapphire & executive boardroom aesthetic",
    badge: "Enterprise",
    badgeColor: "blue",
    primary_color: "#1d4ed8",
    secondary_color: "#3b82f6",
    login_bg_image: "/assets/images/backgrounds/home-bg.jpg",
    login_left_image: "/assets/images/backgrounds/card-bg.jpg",
    login_tagline: "ENTERPRISE ESG & GOVERNANCE",
    login_title: "TechCSR Enterprise",
    login_desc: "Streamline regulatory compliance, track corporate contributions, and audit sustainable development goals across all global business units.",
    login_signin_title: "Welcome Back",
    login_signin_sub: "Enter your enterprise credentials",
    login_logo_badge_style: "pill",
    login_show_bubbles: "true",
    login_bubble1_icon: "analytics",
    login_bubble1_title: "ESG\nAuditing",
    login_bubble2_icon: "shield",
    login_bubble2_title: "Regulatory\nCompliance",
    login_bubble3_icon: "building",
    login_bubble3_title: "Board\nGovernance",
    login_bubble4_icon: "award",
    login_bubble4_title: "Capital\nAllocation",
    login_security_badge_text: "SOC 2 Type II Certified & Encrypted",
    footer_text: "Copyright © 2026 TechCSR Enterprise Systems. All rights reserved.",
    login_auth_mode: "sso_first",
    sso_provider_type: "microsoft",
    sso_button_text: "Sign in with Microsoft 365",
    sso_login_url: "/api/v1/auth/sso",
  },
  {
    id: "oceanic_cyan",
    name: "Oceanic Cyan & Clean Tech",
    subtitle: "Fresh teal aesthetic focused on clean water & renewable projects",
    badge: "Clean Tech",
    badgeColor: "cyan",
    primary_color: "#0f766e",
    secondary_color: "#06b6d4",
    login_bg_image: "/assets/images/backgrounds/login-bg-csr.png",
    login_left_image: "/assets/images/backgrounds/login-left-img.png",
    login_tagline: "CLEAN ENERGY & CLIMATE ACTION",
    login_title: "EcoAction CSR",
    login_desc: "Accelerating the global transition to net-zero operations. Track renewable initiatives, conservation, and ecosystem rehabilitation in real time.",
    login_signin_title: "Sign In",
    login_signin_sub: "Access your CleanTech CSR Portal",
    login_logo_badge_style: "glass",
    login_show_bubbles: "true",
    login_bubble1_icon: "leaf",
    login_bubble1_title: "Carbon\nFootprint",
    login_bubble2_icon: "water",
    login_bubble2_title: "Water\nStewardship",
    login_bubble3_icon: "sun",
    login_bubble3_title: "Renewable\nEnergy",
    login_bubble4_icon: "recycle",
    login_bubble4_title: "Zero Waste\nLifecycle",
    login_security_badge_text: "Encrypted Cloud CSR Infrastructure",
    footer_text: "Copyright © 2026 EcoAction CSR Portal. All rights reserved.",
    login_auth_mode: "standard",
    sso_provider_type: "google",
    sso_button_text: "Sign in with Google Workspace",
    sso_login_url: "/api/v1/auth/sso",
  },
  {
    id: "community_warmth",
    name: "Community Warmth & Outreach",
    subtitle: "Inspiring amber & terracotta palette for human empowerment",
    badge: "Social Impact",
    badgeColor: "orange",
    primary_color: "#c2410c",
    secondary_color: "#f59e0b",
    login_bg_image: "/assets/images/backgrounds/body-bg.jpg",
    login_left_image: "/assets/images/backgrounds/left-side-img.jpg",
    login_tagline: "COMMUNITY FIRST • SOCIAL IMPACT",
    login_title: "ImpactConnect",
    login_desc: "Empowering grassroots change, educational outreach, and healthcare access. Transform corporate resources into measurable social progress.",
    login_signin_title: "Sign In to Impact",
    login_signin_sub: "Community Partners & Coordinators",
    login_logo_badge_style: "curve",
    login_show_bubbles: "true",
    login_bubble1_icon: "heart",
    login_bubble1_title: "Skill\nDevelopment",
    login_bubble2_icon: "hospital",
    login_bubble2_title: "Community\nHealth",
    login_bubble3_icon: "education",
    login_bubble3_title: "Youth\nEducation",
    login_bubble4_icon: "charity",
    login_bubble4_title: "Rural\nOutreach",
    login_security_badge_text: "Verified Community Partner Portal",
    footer_text: "Copyright © 2026 ImpactConnect Social Foundation. All rights reserved.",
    login_auth_mode: "standard",
    sso_provider_type: "microsoft",
    sso_button_text: "Sign in with Microsoft 365",
    sso_login_url: "/api/v1/auth/sso",
  },
  {
    id: "cyber_dark",
    name: "Cyber Intelligence & Analytics",
    subtitle: "Modern deep violet/indigo palette with high-tech analytics feel",
    badge: "AI & Analytics",
    badgeColor: "purple",
    primary_color: "#4f46e5",
    secondary_color: "#8b5cf6",
    login_bg_image: "/assets/images/backgrounds/login-bg1.png",
    login_left_image: "/assets/images/backgrounds/card-bg.jpg",
    login_tagline: "DATA-DRIVEN SUSTAINABILITY",
    login_title: "CSR Intelligence",
    login_desc: "Real-time AI telemetry, automated impact metrics, and predictive resource allocation for enterprise corporate social responsibility.",
    login_signin_title: "Authorized Access",
    login_signin_sub: "Secured with biometric & 2FA authentication",
    login_logo_badge_style: "glass",
    login_show_bubbles: "true",
    login_bubble1_icon: "analytics",
    login_bubble1_title: "AI Impact\nEngine",
    login_bubble2_icon: "bullseye",
    login_bubble2_title: "Smart Budget\nAllocation",
    login_bubble3_icon: "lightbulb",
    login_bubble3_title: "Real-Time\nTelemetry",
    login_bubble4_icon: "shield",
    login_bubble4_title: "Audited\nLedgers",
    login_security_badge_text: "Multi-factor Enterprise Security",
    footer_text: "Copyright © 2026 CSR Intelligence Systems. All rights reserved.",
    login_auth_mode: "both",
    sso_provider_type: "okta",
    sso_button_text: "Sign in with Okta Enterprise",
    sso_login_url: "/api/v1/auth/sso",
  },
];

const PRESET_BACKGROUND_IMAGES = [
  { label: "Nature & Industry (Default)", path: "/assets/images/backgrounds/login-bg.png" },
  { label: "Modern Corporate Building", path: "/assets/images/backgrounds/home-bg.jpg" },
  { label: "Clean Renewable CSR", path: "/assets/images/backgrounds/login-bg-csr.png" },
  { label: "Community & Growth", path: "/assets/images/backgrounds/body-bg.jpg" },
  { label: "Dark Modern Geometric", path: "/assets/images/backgrounds/login-bg1.png" },
];

const PRESET_LEFT_IMAGES = [
  { label: "Nature & Windmill (Default)", path: "/assets/images/backgrounds/left-side-img.jpg" },
  { label: "Modern Architecture Glass", path: "/assets/images/backgrounds/card-bg.jpg" },
  { label: "Eco Green Horizon", path: "/assets/images/backgrounds/login-left-img.png" },
  { label: "Community Warmth", path: "/assets/images/backgrounds/about_us_banner.png" },
];

export default function TemplateConfigurator({
  form,
  currentValues = {},
  onValuesChange,
  logoPreview,
  setLogoPreview,
  setLogoFile,
  loginBgPreview,
  setLoginBgPreview,
  setLoginBgFile,
  loginLeftPreview,
  setLoginLeftPreview,
  setLoginLeftFile,
}) {
  const { settings, getSettingUrl } = useSettings();
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const [activeTab, setActiveTab] = useState("presets");
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

  // Live state tracking for real-time preview
  const [liveConfig, setLiveConfig] = useState({
    site_name: currentValues.site_name || settings?.site_name || "Tect CSR",
    primary_color: currentValues.primary_color || settings?.primary_color || "#15803d",
    secondary_color: currentValues.secondary_color || settings?.secondary_color || "#16a34a",
    login_bg_image: currentValues.login_bg_image || settings?.login_bg_image || "/assets/images/backgrounds/login-bg.png",
    login_left_image: currentValues.login_left_image || settings?.login_left_image || "/assets/images/backgrounds/left-side-img.jpg",
    login_tagline: currentValues.login_tagline || settings?.login_tagline || "TECT CSR",
    login_title: currentValues.login_title || settings?.login_title || "Tect CSR",
    login_desc: currentValues.login_desc || settings?.login_desc || "Welcome to the centralized Corporate Social Responsibility management platform. Sign in to manage projects, budgets, and measure community impact effortlessly.",
    login_signin_title: currentValues.login_signin_title || settings?.login_signin_title || "Sign In",
    login_signin_sub: currentValues.login_signin_sub || settings?.login_signin_sub || "Secure access to your CSR dashboard",
    login_logo_badge_style: currentValues.login_logo_badge_style || settings?.login_logo_badge_style || "curve",
    login_show_bubbles: currentValues.login_show_bubbles !== undefined ? currentValues.login_show_bubbles : (settings?.login_show_bubbles || "true"),
    login_bubble1_icon: currentValues.login_bubble1_icon || settings?.login_bubble1_icon || "leaf",
    login_bubble1_title: currentValues.login_bubble1_title || settings?.login_bubble1_title || "CSR Impact\nAssessment",
    login_bubble2_icon: currentValues.login_bubble2_icon || settings?.login_bubble2_icon || "shield",
    login_bubble2_title: currentValues.login_bubble2_title || settings?.login_bubble2_title || "CSR\nCompliance",
    login_bubble3_icon: currentValues.login_bubble3_icon || settings?.login_bubble3_icon || "strategy",
    login_bubble3_title: currentValues.login_bubble3_title || settings?.login_bubble3_title || "CSR\nStrategy",
    login_bubble4_icon: currentValues.login_bubble4_icon || settings?.login_bubble4_icon || "hands",
    login_bubble4_title: currentValues.login_bubble4_title || settings?.login_bubble4_title || "Corporate\nVolunteering",
    login_security_badge_text: currentValues.login_security_badge_text || settings?.login_security_badge_text || "Protected by Enterprise Security",
    footer_text: currentValues.footer_text || settings?.footer_text || "Copyright © 2026 TechCSR. All rights reserved. | Powered by TechCSR",
    login_auth_mode: currentValues.login_auth_mode || settings?.login_auth_mode || "standard",
    sso_provider_type: currentValues.sso_provider_type || settings?.sso_provider_type || "microsoft",
    sso_button_text: currentValues.sso_button_text || settings?.sso_button_text || "Sign in with Microsoft 365",
    sso_login_url: currentValues.sso_login_url || settings?.sso_login_url || "/api/v1/auth/sso",
  });

  const [previewAuthState, setPreviewAuthState] = useState("sso"); // for testing sso_first toggle inside preview
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    // Determine active preset if matching
    const matched = PRESET_TEMPLATES.find(
      (t) =>
        t.primary_color?.toLowerCase() === (liveConfig.primary_color || "").toLowerCase() &&
        t.login_tagline === liveConfig.login_tagline
    );
    const newTemplate = matched ? matched.id : "custom";
    setSelectedTemplate((prev) => (prev !== newTemplate ? newTemplate : prev));
  }, [liveConfig.primary_color, liveConfig.login_tagline]);

  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    if (currentValues && Object.keys(currentValues).length > 0) {
      setLiveConfig((prev) => {
        let hasChanged = false;
        const next = { ...prev };
        for (const [k, v] of Object.entries(currentValues)) {
          if (k in prev && prev[k] !== v && v !== undefined) {
            hasChanged = true;
            next[k] = v;
          }
        }
        return hasChanged ? next : prev;
      });
    }
  }, [currentValues]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreenModalOpen) {
        setIsFullscreenModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenModalOpen]);

  const updateConfig = (key, val) => {
    if (liveConfig[key] === val) return;
    isInternalChangeRef.current = true;
    const updated = { ...liveConfig, [key]: val };
    setLiveConfig(updated);
    form.setFieldsValue({ [key]: val });
    if (onValuesChange) {
      onValuesChange(updated);
    }
  };

  const applyPreset = (preset) => {
    isInternalChangeRef.current = true;
    setSelectedTemplate(preset.id);
    const newConfig = {
      ...liveConfig,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      login_bg_image: preset.login_bg_image,
      login_left_image: preset.login_left_image,
      login_tagline: preset.login_tagline,
      login_title: preset.login_title,
      login_desc: preset.login_desc,
      login_signin_title: preset.login_signin_title,
      login_signin_sub: preset.login_signin_sub,
      login_logo_badge_style: preset.login_logo_badge_style,
      login_show_bubbles: preset.login_show_bubbles,
      login_bubble1_icon: preset.login_bubble1_icon,
      login_bubble1_title: preset.login_bubble1_title,
      login_bubble2_icon: preset.login_bubble2_icon,
      login_bubble2_title: preset.login_bubble2_title,
      login_bubble3_icon: preset.login_bubble3_icon,
      login_bubble3_title: preset.login_bubble3_title,
      login_bubble4_icon: preset.login_bubble4_icon,
      login_bubble4_title: preset.login_bubble4_title,
      login_security_badge_text: preset.login_security_badge_text,
      footer_text: preset.footer_text,
      login_auth_mode: preset.login_auth_mode || "standard",
      sso_provider_type: preset.sso_provider_type || "microsoft",
      sso_button_text: preset.sso_button_text || "Sign in with Microsoft 365",
      sso_login_url: preset.sso_login_url || "/api/v1/auth/sso",
    };
    setLiveConfig(newConfig);
    setLoginBgPreview("");
    setLoginLeftPreview("");
    if (setLoginBgFile) setLoginBgFile(null);
    if (setLoginLeftFile) setLoginLeftFile(null);

    form.setFieldsValue(newConfig);
    if (onValuesChange) onValuesChange(newConfig);
  };

  const handleCustomBgUpload = (file) => {
    if (setLoginBgFile) setLoginBgFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLoginBgPreview(e.target.result);
      updateConfig("login_bg_image", e.target.result);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleCustomLeftUpload = (file) => {
    if (setLoginLeftFile) setLoginLeftFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLoginLeftPreview(e.target.result);
      updateConfig("login_left_image", e.target.result);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleCustomLogoUpload = (file) => {
    if (setLogoFile) setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
      updateConfig("site_logo", e.target.result);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const getPreviewBgUrl = () => {
    if (loginBgPreview) return loginBgPreview;
    if (liveConfig.login_bg_image) {
      if (liveConfig.login_bg_image.startsWith("http") || liveConfig.login_bg_image.startsWith("data:")) {
        return liveConfig.login_bg_image;
      }
      return getSettingUrl(liveConfig.login_bg_image) || liveConfig.login_bg_image;
    }
    return "/assets/images/backgrounds/login-bg.png";
  };

  const getPreviewLeftUrl = () => {
    if (loginLeftPreview) return loginLeftPreview;
    if (liveConfig.login_left_image) {
      if (liveConfig.login_left_image.startsWith("http") || liveConfig.login_left_image.startsWith("data:")) {
        return liveConfig.login_left_image;
      }
      return getSettingUrl(liveConfig.login_left_image) || liveConfig.login_left_image;
    }
    return "/assets/images/backgrounds/left-side-img.jpg";
  };

  const getPreviewLogoUrl = () => {
    if (logoPreview) return logoPreview;
    if (liveConfig.site_logo) {
      return getSettingUrl(liveConfig.site_logo);
    }
    return getSettingUrl(settings?.site_logo) || "/assets/logo/TechCSR Logo.png";
  };

  const renderPreviewSsoIcon = (provider, size = 16) => {
    switch (provider) {
      case "google":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
        );
      case "okta":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="#007dc1" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="#007dc1" strokeWidth="4" fill="none" />
          </svg>
        );
      case "saml":
        return <FaShieldAlt style={{ fontSize: size, color: "#1e293b", flexShrink: 0 }} />;
      case "microsoft":
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 21 21" style={{ flexShrink: 0 }}>
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
        );
    }
  };

  // Render bubble editor card with Icon picker & Title input
  const renderBubbleCustomizerItem = (num, iconKey, titleKey, label) => {
    const currentIcon = liveConfig[iconKey] || "leaf";
    const currentTitle = liveConfig[titleKey] || "";

    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "12px 14px",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#1e293b" }}>{label}</span>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#f0fdf4",
              color: liveConfig.primary_color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            {getBubbleIconComponent(currentIcon)}
          </div>
        </div>

        <Row gutter={10}>
          <Col span={10}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>Choose Icon</div>
            <Select
              value={currentIcon}
              onChange={(val) => updateConfig(iconKey, val)}
              style={{ width: "100%" }}
              size="middle"
              showSearch
              filterOption={(input, option) =>
                option?.children?.props?.children[1]?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {BUBBLE_ICON_OPTIONS.map((opt) => (
                <Option key={opt.key} value={opt.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: liveConfig.primary_color, display: "flex" }}>{opt.icon}</span>
                    <span style={{ fontSize: 12 }}>{opt.label}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Col>

          <Col span={14}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>Badge Text</div>
            <Input
              value={currentTitle}
              onChange={(e) => updateConfig(titleKey, e.target.value)}
              placeholder="e.g. CSR Impact\nAssessment"
              style={{ borderRadius: 6 }}
            />
          </Col>
        </Row>
      </div>
    );
  };

  // Interactive Live Preview Component
  const renderLoginPreview = (isModal = false) => {
    const bgUrl = getPreviewBgUrl();
    const leftUrl = getPreviewLeftUrl();
    const logoUrl = getPreviewLogoUrl();
    const isShowingBubbles = liveConfig.login_show_bubbles === "true" || liveConfig.login_show_bubbles === true;

    return (
      <div
        style={{
          position: "relative",
          width: isModal ? "100vw" : "100%",
          height: isModal ? "100vh" : "480px",
          minHeight: isModal ? "100vh" : "auto",
          borderRadius: isModal ? 0 : 14,
          overflow: "hidden",
          background: `url("${bgUrl}") center center / cover no-repeat`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isModal ? "none" : "0 10px 30px rgba(0,0,0,0.2)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          userSelect: "none",
        }}
      >
        {/* Floating Close Button for Fullscreen Modal */}
        {isModal && (
          <button
            type="button"
            onClick={() => setIsFullscreenModalOpen(false)}
            style={{
              position: "fixed",
              top: 20,
              right: 24,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(10px)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: 30,
              padding: "10px 22px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            <span>✕</span> Exit Fullscreen Preview
          </button>
        )}

        {/* Dark Ambient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, rgba(0, 30, 8, 0.60) 0%, rgba(0, 50, 15, 0.40) 50%, rgba(0, 25, 8, 0.60) 100%)",
            zIndex: 1,
          }}
        />

        {/* Top-Left Logo Badge */}
        {liveConfig.login_logo_badge_style !== "hidden" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
              padding: isModal
                ? (liveConfig.login_logo_badge_style === "pill" ? "16px 32px" : "18px 28px")
                : (liveConfig.login_logo_badge_style === "pill" ? "12px 24px" : "14px 20px"),
              background:
                liveConfig.login_logo_badge_style === "glass"
                  ? "rgba(255, 255, 255, 0.75)"
                  : liveConfig.login_logo_badge_style === "pill"
                  ? "#ffffff"
                  : "#ffffffeb",
              backdropFilter: liveConfig.login_logo_badge_style === "glass" ? "blur(10px)" : "none",
              borderBottomRightRadius: liveConfig.login_logo_badge_style === "curve" ? 50 : 20,
              boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              maxWidth: isModal ? 300 : 220,
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ maxHeight: isModal ? 52 : 38, maxWidth: isModal ? 220 : 160, objectFit: "contain" }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div style={{ fontWeight: 800, color: liveConfig.primary_color, fontSize: isModal ? 20 : 16 }}>
                {liveConfig.site_name || "TechCSR"}
              </div>
            )}
          </div>
        )}

        {/* Floating CSR Bubbles on Right Side with Selected Icons & Text */}
        {isShowingBubbles && (
          <div
            style={{
              position: "absolute",
              right: isModal ? 36 : 12,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: isModal ? 18 : 8,
            }}
          >
            {[
              { icon: getBubbleIconComponent(liveConfig.login_bubble1_icon, "leaf"), text: liveConfig.login_bubble1_title || "CSR Impact\nAssessment" },
              { icon: getBubbleIconComponent(liveConfig.login_bubble2_icon, "shield"), text: liveConfig.login_bubble2_title || "CSR\nCompliance" },
              { icon: getBubbleIconComponent(liveConfig.login_bubble3_icon, "strategy"), text: liveConfig.login_bubble3_title || "CSR\nStrategy" },
              { icon: getBubbleIconComponent(liveConfig.login_bubble4_icon, "hands"), text: liveConfig.login_bubble4_title || "Corporate\nVolunteering" },
            ].map((bubble, i) => (
              <div
                key={i}
                style={{
                  width: isModal ? 88 : 52,
                  height: isModal ? 88 : 52,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.94)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: isModal ? 8 : 4,
                  fontSize: isModal ? 11 : 7.5,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.15,
                  backdropFilter: "blur(6px)",
                }}
              >
                <div style={{ color: liveConfig.primary_color, fontSize: isModal ? 20 : 11, marginBottom: 3 }}>
                  {bubble.icon}
                </div>
                <span style={{ whiteSpace: "pre-line" }}>{bubble.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Centered Split-Card */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            width: isModal ? 890 : 560,
            maxWidth: "94vw",
            minHeight: isModal ? 470 : 310,
            display: "flex",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          }}
        >
          {/* Left Panel */}
          <div
            style={{
              width: isModal ? "58%" : "55%",
              background: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.78) 100%), url("${leftUrl}") center center / cover no-repeat`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: isModal ? "36px 32px" : "18px",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: isModal ? 12 : 8.5,
                fontWeight: 800,
                letterSpacing: 1.2,
                color: "rgba(255,255,255,0.85)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {liveConfig.login_tagline}
            </div>
            <div
              style={{
                fontSize: isModal ? 26 : 16,
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: 8,
                lineHeight: 1.2,
              }}
            >
              {liveConfig.login_title}
            </div>
            <div
              style={{
                fontSize: isModal ? 13 : 8.5,
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: isModal ? 5 : 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {liveConfig.login_desc}
            </div>
          </div>

          {/* Right Panel: Sign-In Box */}
          <div
            style={{
              width: isModal ? "42%" : "45%",
              background: "#ffffff",
              padding: isModal ? "36px 30px" : "16px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: isModal ? 22 : 14, fontWeight: 800, color: "#0f172a" }}>
                {liveConfig.login_signin_title}
              </div>
              <div style={{ fontSize: isModal ? 13 : 8.5, color: "#64748b", marginBottom: isModal ? 16 : 8 }}>
                {liveConfig.login_signin_sub}
              </div>

              {/* MODE 1: SSO ONLY */}
              {liveConfig.login_auth_mode === "sso_only" && (
                <div style={{ display: "flex", flexDirection: "column", gap: isModal ? 12 : 6, marginTop: isModal ? 12 : 4 }}>
                  <div style={{ fontSize: isModal ? 12 : 8, color: "#64748b", textAlign: "center" }}>
                    Sign in with corporate identity provider:
                  </div>
                  <div
                    style={{
                      height: isModal ? 46 : 28,
                      borderRadius: 8,
                      border: "1.5px solid #cbd5e1",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: isModal ? 13 : 8.5,
                      fontWeight: 700,
                      color: "#1e293b",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      cursor: "default",
                    }}
                  >
                    {renderPreviewSsoIcon(liveConfig.sso_provider_type, isModal ? 18 : 12)}
                    <span>{liveConfig.sso_button_text}</span>
                  </div>
                </div>
              )}

              {/* MODE 2: SSO FIRST - PRIMARY VIEW */}
              {liveConfig.login_auth_mode === "sso_first" && previewAuthState === "sso" && (
                <div style={{ display: "flex", flexDirection: "column", gap: isModal ? 10 : 5 }}>
                  <div
                    style={{
                      height: isModal ? 44 : 26,
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: isModal ? 13 : 8.5,
                      fontWeight: 700,
                      cursor: "default",
                    }}
                  >
                    {renderPreviewSsoIcon(liveConfig.sso_provider_type, isModal ? 16 : 11)}
                    <span>{liveConfig.sso_button_text}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", margin: isModal ? "6px 0" : "2px 0", color: "#94a3b8", fontSize: isModal ? 11 : 7.5, textTransform: "uppercase" }}>
                    <span style={{ flex: 1, borderBottom: "1px solid #e2e8f0" }} />
                    <span style={{ padding: "0 8px" }}>or</span>
                    <span style={{ flex: 1, borderBottom: "1px solid #e2e8f0" }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewAuthState("email")}
                    style={{
                      height: isModal ? 38 : 24,
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: isModal ? 12 : 8,
                      fontWeight: 600,
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    <MailOutlined style={{ fontSize: isModal ? 13 : 9 }} />
                    <span>Sign in with Email &amp; Password</span>
                  </button>
                </div>
              )}

              {/* MODE 3/4: STANDARD, BOTH, OR SSO_FIRST TOGGLED TO EMAIL */}
              {(liveConfig.login_auth_mode === "standard" ||
                liveConfig.login_auth_mode === "both" ||
                (liveConfig.login_auth_mode === "sso_first" && previewAuthState === "email")) && (
                <div style={{ display: "flex", flexDirection: "column", gap: isModal ? 10 : 5 }}>
                  {liveConfig.login_auth_mode === "sso_first" && previewAuthState === "email" && (
                    <button
                      type="button"
                      onClick={() => setPreviewAuthState("sso")}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: liveConfig.primary_color,
                        fontSize: isModal ? 11 : 7.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        textAlign: "left",
                        marginBottom: 2,
                      }}
                    >
                      ← Back to Single Sign-On
                    </button>
                  )}

                  {liveConfig.login_auth_mode === "both" && (
                    <div style={{ marginBottom: isModal ? 6 : 2 }}>
                      <div
                        style={{
                          height: isModal ? 38 : 22,
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontSize: isModal ? 12 : 8,
                          fontWeight: 600,
                          color: "#1e293b",
                        }}
                      >
                        {renderPreviewSsoIcon(liveConfig.sso_provider_type, isModal ? 14 : 10)}
                        <span>{liveConfig.sso_button_text}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", margin: "4px 0", color: "#94a3b8", fontSize: isModal ? 10 : 7, textTransform: "uppercase" }}>
                        <span style={{ flex: 1, borderBottom: "1px solid #e2e8f0" }} />
                        <span style={{ padding: "0 6px" }}>or email</span>
                        <span style={{ flex: 1, borderBottom: "1px solid #e2e8f0" }} />
                      </div>
                    </div>
                  )}

                  {/* User Name */}
                  <div>
                    <div style={{ fontSize: isModal ? 13 : 9.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                      User Name
                    </div>
                    <div
                      style={{
                        height: isModal ? 44 : 36,
                        border: `1.5px solid ${liveConfig.primary_color}`,
                        borderRadius: 8,
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        overflow: "hidden",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                      }}
                    >
                      <div
                        style={{
                          width: isModal ? 44 : 36,
                          height: "100%",
                          background: liveConfig.primary_color,
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: isModal ? 16 : 13,
                        }}
                      >
                        <MailOutlined />
                      </div>
                      <div style={{ padding: isModal ? "0 14px" : "0 10px", fontSize: isModal ? 13.5 : 10, color: "#9ca3af" }}>
                        Enter your email
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div style={{ fontSize: isModal ? 13 : 9.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                      Password
                    </div>
                    <div
                      style={{
                        height: isModal ? 44 : 36,
                        border: `1.5px solid ${liveConfig.primary_color}`,
                        borderRadius: 8,
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        overflow: "hidden",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                      }}
                    >
                      <div
                        style={{
                          width: isModal ? 44 : 36,
                          height: "100%",
                          background: liveConfig.primary_color,
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: isModal ? 16 : 13,
                        }}
                      >
                        <LockOutlined />
                      </div>
                      <div style={{ padding: isModal ? "0 14px" : "0 10px", fontSize: isModal ? 13.5 : 10, color: "#9ca3af", flex: 1 }}>
                        Enter your password
                      </div>
                      <div style={{ paddingRight: isModal ? 12 : 8, color: "#9ca3af", display: "flex", fontSize: isModal ? 15 : 11 }}>
                        <EyeInvisibleOutlined />
                      </div>
                    </div>
                  </div>

                  {/* Captcha Row */}
                  <div style={{ display: "flex", gap: isModal ? 10 : 6, alignItems: "center" }}>
                    <div
                      style={{
                        height: isModal ? 42 : 34,
                        border: "1.5px dashed #cbd5e1",
                        borderRadius: 8,
                        background: "#f8fafc",
                        padding: isModal ? "0 14px" : "0 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: isModal ? 10 : 6,
                        color: "#1e293b",
                        fontSize: isModal ? 16 : 11.5,
                        fontWeight: 700,
                        fontFamily: "'Courier New', Courier, monospace",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ letterSpacing: isModal ? 4 : 2 }}>5 s L e q w</span>
                      <ReloadOutlined style={{ color: "#64748b", fontSize: isModal ? 13 : 9.5 }} />
                    </div>

                    <div
                      style={{
                        height: isModal ? 42 : 34,
                        border: `1.5px solid ${liveConfig.primary_color}`,
                        borderRadius: 8,
                        background: "#ffffff",
                        padding: isModal ? "0 14px" : "0 10px",
                        color: "#9ca3af",
                        fontSize: isModal ? 13.5 : 10,
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      Enter captcha
                    </div>
                  </div>

                  {/* Forgot Password */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 5,
                      color: "#ef4444",
                      fontSize: isModal ? 12.5 : 9.5,
                      fontWeight: 600,
                      marginTop: 1,
                    }}
                  >
                    <FaKey style={{ fontSize: isModal ? 11 : 8.5 }} />
                    <span>Forgot Password?</span>
                  </div>

                  {/* Login Button with customized background */}
                  <div
                    style={{
                      height: isModal ? 46 : 36,
                      borderRadius: 8,
                      background: liveConfig.primary_color,
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: isModal ? 14 : 10.5,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      boxShadow: `0 4px 14px ${liveConfig.primary_color}45`,
                      marginTop: isModal ? 4 : 2,
                      cursor: "default",
                    }}
                  >
                    LOGIN
                  </div>
                </div>
              )}
            </div>

            {/* Security Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: liveConfig.primary_color,
                fontSize: isModal ? 12.5 : 9.5,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              <FaShieldAlt style={{ fontSize: isModal ? 14 : 10 }} />
              <span>{liveConfig.login_security_badge_text}</span>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div
          style={{
            position: "absolute",
            bottom: isModal ? 16 : 8,
            zIndex: 10,
            color: "rgba(255,255,255,0.75)",
            fontSize: isModal ? 12 : 7.5,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {liveConfig.footer_text}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── SPLIT VIEW: CONFIGURATION PANEL (LEFT) + REAL-TIME LIVE PREVIEW (RIGHT) ── */}
      <Row gutter={24}>
        {/* LEFT COLUMN: TABS WITH EDITING CONTROLS */}
        <Col xs={24} lg={13}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "presets",
                  label: (
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <ThunderboltOutlined /> Presets Gallery
                    </span>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
                      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
                        Select a professionally curated template preset. You can fine-tune any element afterwards:
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {PRESET_TEMPLATES.map((preset) => {
                          const isSelected = selectedTemplate === preset.id;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => applyPreset(preset)}
                              style={{
                                border: isSelected ? `2px solid ${preset.primary_color}` : "1px solid #e2e8f0",
                                background: isSelected ? "#f8fafc" : "#ffffff",
                                borderRadius: 12,
                                padding: "14px 16px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                position: "relative",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: `linear-gradient(135deg, ${preset.primary_color} 0%, ${preset.secondary_color} 100%)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#ffffff",
                                    fontSize: 16,
                                    flexShrink: 0,
                                    boxShadow: `0 2px 6px ${preset.primary_color}40`,
                                  }}
                                >
                                  <CheckOutlined style={{ opacity: isSelected ? 1 : 0 }} />
                                </div>

                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}>
                                      {preset.name}
                                    </span>
                                    <Tag color={preset.badgeColor} style={{ borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                      {preset.badge}
                                    </Tag>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                                    {preset.subtitle}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    background: preset.primary_color,
                                    border: "2px solid #ffffff",
                                    boxShadow: "0 0 2px rgba(0,0,0,0.3)",
                                  }}
                                />
                                <div
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    background: preset.secondary_color,
                                    border: "2px solid #ffffff",
                                    boxShadow: "0 0 2px rgba(0,0,0,0.3)",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "backgrounds",
                  label: (
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <FileImageOutlined /> Backgrounds &amp; Banner
                    </span>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
                      {/* Section 1: Fullscreen Login Background */}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 4 }}>
                          1. Main Login Fullscreen Background
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                          Choose from the curated image library or upload your own high-resolution image:
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 12 }}>
                          {PRESET_BACKGROUND_IMAGES.map((bg) => {
                            const isSelected = liveConfig.login_bg_image === bg.path && !loginBgPreview;
                            return (
                              <div
                                key={bg.path}
                                onClick={() => {
                                  setLoginBgPreview("");
                                  if (setLoginBgFile) setLoginBgFile(null);
                                  updateConfig("login_bg_image", bg.path);
                                }}
                                style={{
                                  border: isSelected ? "2px solid #15803d" : "1px solid #e2e8f0",
                                  borderRadius: 8,
                                  padding: 8,
                                  cursor: "pointer",
                                  background: isSelected ? "#f0fdf4" : "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 6,
                                    background: `url("${bg.path}") center/cover no-repeat`,
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 500, color: "#1e293b" }}>
                                  {bg.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <Upload beforeUpload={handleCustomBgUpload} showUploadList={false} accept="image/*">
                          <Button icon={<CloudUploadOutlined />} style={{ borderRadius: 8, fontWeight: 600 }}>
                            Upload Custom Background Image
                          </Button>
                        </Upload>
                      </div>

                      <Divider style={{ margin: "4px 0" }} />

                      {/* Section 2: Left Panel Card Banner */}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 4 }}>
                          2. Left Card Illustration / Banner
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                          Select or upload the vertical artwork displayed on the left side of the sign-in modal:
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 12 }}>
                          {PRESET_LEFT_IMAGES.map((leftImg) => {
                            const isSelected = liveConfig.login_left_image === leftImg.path && !loginLeftPreview;
                            return (
                              <div
                                key={leftImg.path}
                                onClick={() => {
                                  setLoginLeftPreview("");
                                  if (setLoginLeftFile) setLoginLeftFile(null);
                                  updateConfig("login_left_image", leftImg.path);
                                }}
                                style={{
                                  border: isSelected ? "2px solid #15803d" : "1px solid #e2e8f0",
                                  borderRadius: 8,
                                  padding: 8,
                                  cursor: "pointer",
                                  background: isSelected ? "#f0fdf4" : "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 6,
                                    background: `url("${leftImg.path}") center/cover no-repeat`,
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 500, color: "#1e293b" }}>
                                  {leftImg.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <Upload beforeUpload={handleCustomLeftUpload} showUploadList={false} accept="image/*">
                          <Button icon={<CloudUploadOutlined />} style={{ borderRadius: 8, fontWeight: 600 }}>
                            Upload Custom Left Card Artwork
                          </Button>
                        </Upload>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "branding",
                  label: (
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <PictureOutlined /> Logo &amp; Badges
                    </span>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 8 }}>
                      {/* Logo Upload */}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 4 }}>
                          Organization / Login Logo
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                          Upload custom brand logo (transparent PNG/SVG recommended):
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div
                            style={{
                              border: "1px dashed #cbd5e1",
                              borderRadius: 10,
                              padding: "12px 18px",
                              background: "#f8fafc",
                              minWidth: 160,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <img
                              src={getPreviewLogoUrl()}
                              alt="Logo"
                              style={{ maxHeight: 44, maxWidth: 140, objectFit: "contain" }}
                            />
                          </div>

                          <Upload beforeUpload={handleCustomLogoUpload} showUploadList={false} accept="image/*">
                            <Button icon={<UploadOutlined />} style={{ borderRadius: 8, fontWeight: 600 }}>
                              Change Logo
                            </Button>
                          </Upload>
                        </div>
                      </div>

                      <Divider style={{ margin: "4px 0" }} />

                      {/* Logo Badge Style */}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 4 }}>
                          Logo Badge Container Style
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                          Select how the logo is framed in the top-left corner:
                        </div>

                        <Radio.Group
                          value={liveConfig.login_logo_badge_style}
                          onChange={(e) => updateConfig("login_logo_badge_style", e.target.value)}
                          style={{ width: "100%" }}
                        >
                          <Row gutter={[10, 10]}>
                            <Col span={12}>
                              <Radio.Button value="curve" style={{ width: "100%", textAlign: "center", borderRadius: 8 }}>
                                Curved White Badge
                              </Radio.Button>
                            </Col>
                            <Col span={12}>
                              <Radio.Button value="pill" style={{ width: "100%", textAlign: "center", borderRadius: 8 }}>
                                Floating Pill Box
                              </Radio.Button>
                            </Col>
                            <Col span={12}>
                              <Radio.Button value="glass" style={{ width: "100%", textAlign: "center", borderRadius: 8 }}>
                                Frosted Glassmorphism
                              </Radio.Button>
                            </Col>
                            <Col span={12}>
                              <Radio.Button value="hidden" style={{ width: "100%", textAlign: "center", borderRadius: 8 }}>
                                Hide Top Badge
                              </Radio.Button>
                            </Col>
                          </Row>
                        </Radio.Group>
                      </div>

                      <Divider style={{ margin: "4px 0" }} />

                      {/* Security Badge Text */}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 6 }}>
                          Enterprise Security Label
                        </div>
                        <Input
                          value={liveConfig.login_security_badge_text}
                          onChange={(e) => updateConfig("login_security_badge_text", e.target.value)}
                          placeholder="e.g. Protected by Enterprise Security"
                          prefix={<FaShieldAlt style={{ color: liveConfig.primary_color }} />}
                          style={{ borderRadius: 8 }}
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  key: "content",
                  label: (
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <FontSizeOutlined /> Content &amp; Copywriting
                    </span>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
                      <Row gutter={12}>
                        <Col span={12}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 4 }}>
                            Left Card Tagline
                          </div>
                          <Input
                            value={liveConfig.login_tagline}
                            onChange={(e) => updateConfig("login_tagline", e.target.value)}
                            placeholder="e.g. TECT CSR • SUSTAINABILITY"
                            style={{ borderRadius: 8 }}
                          />
                        </Col>
                        <Col span={12}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 4 }}>
                            Left Card Main Title
                          </div>
                          <Input
                            value={liveConfig.login_title}
                            onChange={(e) => updateConfig("login_title", e.target.value)}
                            placeholder="e.g. Tect CSR"
                            style={{ borderRadius: 8 }}
                          />
                        </Col>
                      </Row>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 4 }}>
                          Left Card Mission &amp; Description
                        </div>
                        <TextArea
                          rows={3}
                          value={liveConfig.login_desc}
                          onChange={(e) => updateConfig("login_desc", e.target.value)}
                          placeholder="Brief message displayed on the card..."
                          style={{ borderRadius: 8 }}
                        />
                      </div>

                      <Row gutter={12}>
                        <Col span={12}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 4 }}>
                            Sign-In Box Title
                          </div>
                          <Input
                            value={liveConfig.login_signin_title}
                            onChange={(e) => updateConfig("login_signin_title", e.target.value)}
                            placeholder="e.g. Sign In"
                            style={{ borderRadius: 8 }}
                          />
                        </Col>
                        <Col span={12}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 4 }}>
                            Sign-In Box Subtitle
                          </div>
                          <Input
                            value={liveConfig.login_signin_sub}
                            onChange={(e) => updateConfig("login_signin_sub", e.target.value)}
                            placeholder="e.g. Secure access to your CSR dashboard"
                            style={{ borderRadius: 8 }}
                          />
                        </Col>
                      </Row>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 4 }}>
                          Footer Copyright Text
                        </div>
                        <Input
                          value={liveConfig.footer_text}
                          onChange={(e) => updateConfig("footer_text", e.target.value)}
                          placeholder="e.g. Copyright © 2026 TechCSR. All rights reserved."
                          style={{ borderRadius: 8 }}
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  key: "auth",
                  label: (
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <LockOutlined /> Authentication &amp; SSO
                    </span>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
                      {/* Section: Authentication Mode */}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 4 }}>
                          Login Authentication Mode
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                          Choose how users sign in on the main login screen:
                        </div>

                        <Radio.Group
                          value={liveConfig.login_auth_mode}
                          onChange={(e) => updateConfig("login_auth_mode", e.target.value)}
                          style={{ width: "100%" }}
                        >
                          <Row gutter={[10, 10]}>
                            <Col span={12}>
                              <div
                                onClick={() => updateConfig("login_auth_mode", "standard")}
                                style={{
                                  border: liveConfig.login_auth_mode === "standard" ? `2px solid ${liveConfig.primary_color}` : "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  padding: "12px",
                                  cursor: "pointer",
                                  background: liveConfig.login_auth_mode === "standard" ? "#f0fdf4" : "#ffffff",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <Radio value="standard" style={{ fontWeight: 700, fontSize: 13 }}>Standard Login</Radio>
                                  <Tag color="blue">Default</Tag>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                                  Username + Password + Captcha form only.
                                </div>
                              </div>
                            </Col>

                            <Col span={12}>
                              <div
                                onClick={() => updateConfig("login_auth_mode", "sso_first")}
                                style={{
                                  border: liveConfig.login_auth_mode === "sso_first" ? `2px solid ${liveConfig.primary_color}` : "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  padding: "12px",
                                  cursor: "pointer",
                                  background: liveConfig.login_auth_mode === "sso_first" ? "#f0fdf4" : "#ffffff",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <Radio value="sso_first" style={{ fontWeight: 700, fontSize: 13 }}>SSO First with Switch</Radio>
                                  <Tag color="green">Recommended</Tag>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                                  Shows SSO button initially, with a button to toggle Email/Password form.
                                </div>
                              </div>
                            </Col>

                            <Col span={12}>
                              <div
                                onClick={() => updateConfig("login_auth_mode", "sso_only")}
                                style={{
                                  border: liveConfig.login_auth_mode === "sso_only" ? `2px solid ${liveConfig.primary_color}` : "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  padding: "12px",
                                  cursor: "pointer",
                                  background: liveConfig.login_auth_mode === "sso_only" ? "#f0fdf4" : "#ffffff",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <Radio value="sso_only" style={{ fontWeight: 700, fontSize: 13 }}>SSO Login Only</Radio>
                                  <Tag color="purple">Enterprise</Tag>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                                  Only Single Sign-On button is shown (manual credentials disabled).
                                </div>
                              </div>
                            </Col>

                            <Col span={12}>
                              <div
                                onClick={() => updateConfig("login_auth_mode", "both")}
                                style={{
                                  border: liveConfig.login_auth_mode === "both" ? `2px solid ${liveConfig.primary_color}` : "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  padding: "12px",
                                  cursor: "pointer",
                                  background: liveConfig.login_auth_mode === "both" ? "#f0fdf4" : "#ffffff",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <Radio value="both" style={{ fontWeight: 700, fontSize: 13 }}>Hybrid (Both)</Radio>
                                  <Tag color="orange">Flexible</Tag>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                                  Displays both SSO button and Email/Password fields simultaneously.
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </Radio.Group>
                      </div>

                      {/* SSO Provider Configuration (Shown if not standard) */}
                      {liveConfig.login_auth_mode !== "standard" && (
                        <>
                          <Divider style={{ margin: "4px 0" }} />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 8 }}>
                              Single Sign-On (SSO) Provider Settings
                            </div>

                            <Row gutter={12} style={{ marginBottom: 12 }}>
                              <Col span={12}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#334155", marginBottom: 4 }}>
                                  Identity Provider
                                </div>
                                <Select
                                  value={liveConfig.sso_provider_type}
                                  onChange={(val) => updateConfig("sso_provider_type", val)}
                                  style={{ width: "100%" }}
                                >
                                  <Option value="microsoft">
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      {renderPreviewSsoIcon("microsoft", 14)}
                                      <span>Microsoft 365 / Azure AD</span>
                                    </div>
                                  </Option>
                                  <Option value="google">
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      {renderPreviewSsoIcon("google", 14)}
                                      <span>Google Workspace</span>
                                    </div>
                                  </Option>
                                  <Option value="okta">
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      {renderPreviewSsoIcon("okta", 14)}
                                      <span>Okta Identity Cloud</span>
                                    </div>
                                  </Option>
                                  <Option value="saml">
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      {renderPreviewSsoIcon("saml", 14)}
                                      <span>Corporate SAML / Custom SSO</span>
                                    </div>
                                  </Option>
                                </Select>
                              </Col>

                              <Col span={12}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#334155", marginBottom: 4 }}>
                                  SSO Button Label
                                </div>
                                <Input
                                  value={liveConfig.sso_button_text}
                                  onChange={(e) => updateConfig("sso_button_text", e.target.value)}
                                  placeholder="e.g. Sign in with Microsoft 365"
                                  style={{ borderRadius: 8 }}
                                />
                              </Col>
                            </Row>

                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: "#334155", marginBottom: 4 }}>
                                SSO Redirect / Login Endpoint URL
                              </div>
                              <Input
                                value={liveConfig.sso_login_url}
                                onChange={(e) => updateConfig("sso_login_url", e.target.value)}
                                placeholder="e.g. /api/v1/auth/sso/azure"
                                style={{ borderRadius: 8 }}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ),
                },
                {
                  key: "colors_bubbles",
                  label: (
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <BgColorsOutlined /> Colors &amp; Bubbles
                    </span>
                  ),
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
                      {/* Color Pickers */}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a", marginBottom: 8 }}>
                          Brand Color Palette
                        </div>
                        <Row gutter={16}>
                          <Col span={12}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                              <input
                                type="color"
                                value={liveConfig.primary_color}
                                onChange={(e) => updateConfig("primary_color", e.target.value)}
                                style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer" }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>Primary Color</div>
                                <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{liveConfig.primary_color}</div>
                              </div>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                              <input
                                type="color"
                                value={liveConfig.secondary_color}
                                onChange={(e) => updateConfig("secondary_color", e.target.value)}
                                style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer" }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>Secondary Accent</div>
                                <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{liveConfig.secondary_color}</div>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </div>

                      <Divider style={{ margin: "4px 0" }} />

                      {/* Right-Side Floating Bubbles Toggle & Customizer */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}>
                              Right Floating Service Bubbles
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              Choose icons &amp; custom labels for each of the 4 floating service badges
                            </div>
                          </div>
                          <Switch
                            checked={liveConfig.login_show_bubbles === "true" || liveConfig.login_show_bubbles === true}
                            onChange={(checked) => updateConfig("login_show_bubbles", checked ? "true" : "false")}
                          />
                        </div>

                        {(liveConfig.login_show_bubbles === "true" || liveConfig.login_show_bubbles === true) && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {renderBubbleCustomizerItem(1, "login_bubble1_icon", "login_bubble1_title", "1. Top Bubble Badge")}
                            {renderBubbleCustomizerItem(2, "login_bubble2_icon", "login_bubble2_title", "2. Upper-Middle Bubble Badge")}
                            {renderBubbleCustomizerItem(3, "login_bubble3_icon", "login_bubble3_title", "3. Lower-Middle Bubble Badge")}
                            {renderBubbleCustomizerItem(4, "login_bubble4_icon", "login_bubble4_title", "4. Bottom Bubble Badge")}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Col>

        {/* RIGHT COLUMN: REAL-TIME INTERACTIVE LIVE PREVIEW */}
        <Col xs={24} lg={11}>
          <div
            style={{
              position: "sticky",
              top: 16,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "16px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Real-Time Live Preview</span>
              </div>
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setIsFullscreenModalOpen(true)}
                style={{
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  background: liveConfig.primary_color,
                  borderColor: liveConfig.primary_color,
                }}
              >
                Full Preview
              </Button>
            </div>

            {/* Interactive Live Preview Screen */}
            {renderLoginPreview(false)}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 11.5, color: "#94a3b8" }}>
              <span>Live preview renders your exact settings instantly</span>
              <span>Click "Save Changes" on top right to commit</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── FULL-WIDTH PREVIEW MODAL ── */}
      <Modal
        open={isFullscreenModalOpen}
        onCancel={() => setIsFullscreenModalOpen(false)}
        footer={null}
        width="100vw"
        style={{ top: 0, padding: 0, margin: 0, maxWidth: "100vw" }}
        styles={{
          body: { padding: 0, margin: 0, height: "100vh", width: "100vw", overflow: "hidden" },
          content: { padding: 0, margin: 0, borderRadius: 0, height: "100vh", width: "100vw", overflow: "hidden", boxShadow: "none" },
          mask: { background: "rgba(0,0,0,0.85)" },
        }}
        destroyOnHidden
        closeIcon={null}
        wrapClassName="full-width-login-modal-wrap"
      >
        <style>{`
          .full-width-login-modal-wrap .ant-modal {
            max-width: 100vw !important;
            width: 100vw !important;
            height: 100vh !important;
            top: 0 !important;
            left: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .full-width-login-modal-wrap .ant-modal-content {
            padding: 0 !important;
            border-radius: 0 !important;
            height: 100vh !important;
            width: 100vw !important;
            overflow: hidden !important;
          }
          .full-width-login-modal-wrap .ant-modal-body {
            padding: 0 !important;
            height: 100vh !important;
            width: 100vw !important;
            overflow: hidden !important;
          }
          .full-width-login-modal-wrap .ant-modal-wrap {
            padding: 0 !important;
            overflow: hidden !important;
          }
        `}</style>
        {renderLoginPreview(true)}
      </Modal>
    </div>
  );
}
