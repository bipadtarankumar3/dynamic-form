import React, { useEffect, useState } from "react";
import {
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
  AppstoreOutlined,
  TeamOutlined,
  RocketOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  BranchesOutlined,
  BgColorsOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  UploadOutlined,
  CheckOutlined,
  BellOutlined,
  MobileOutlined,
  DesktopOutlined,
  InboxOutlined,
  GlobalOutlined,
  CompassOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  CrownOutlined,
  FormatPainterOutlined,
  SlidersOutlined,
  ThunderboltFilled,
  SunOutlined,
  MoonOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  Input,
  Form,
  Upload,
  App,
  Switch,
  Select,
  Checkbox,
  Row,
  Col,
  Tag,
  Tooltip,
  Modal,
} from "antd";
import { privateHttpClient, publicHttpClient } from "@/services/api/httpClient";
import { useSettings } from "@/context/SettingsContext";
import TemplateConfigurator from "./components/TemplateConfigurator";
import UserProfileSettings from "./components/UserProfileSettings";

const { TextArea } = Input;

export default function SiteSettingsView() {
  const { message } = App.useApp();
  const { settings, getSettingUrl, refreshSettings } = useSettings();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState("general");
  const [lastSaved, setLastSaved] = useState(null);

  // Media files
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState("");
  const [loginBgFile, setLoginBgFile] = useState(null);
  const [loginBgPreview, setLoginBgPreview] = useState("");
  const [loginLeftFile, setLoginLeftFile] = useState(null);
  const [loginLeftPreview, setLoginLeftPreview] = useState("");

  // Color states
  const [primaryColor, setPrimaryColor] = useState("#15803d");
  const [secondaryColor, setSecondaryColor] = useState("#659327");

  // Template customizer state values
  const [templateValues, setTemplateValues] = useState({});

  // Notification switches & checks
  const [notifProductivity, setNotifProductivity] = useState(true);
  const [notifNewEvent, setNotifNewEvent] = useState(true);
  const [notifNewTeam, setNotifNewTeam] = useState(true);
  const [mobilePush, setMobilePush] = useState(true);
  const [desktopNotif, setDesktopNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);

  // Preference switches
  const [appearance, setAppearance] = useState("Light");

  // Fetch settings on mount directly to ensure immediate population
  useEffect(() => {
    const fetchDirect = async () => {
      try {
        const res = await publicHttpClient.get("/settings");
        const data = res.data?.settings || res.data?.data || {};
        if (data && Object.keys(data).length > 0) {
          const initialValues = {
            site_name: data.site_name || "",
            site_title: data.site_title || "",
            site_description: data.site_description || "",
            footer_text: data.footer_text || "",
            support_email: data.support_email || "",
            support_phone: data.support_phone || "",
            primary_color: data.primary_color || "#15803d",
            secondary_color: data.secondary_color || "#659327",
            login_bg_image: data.login_bg_image || "/assets/images/backgrounds/login-bg.png",
            login_left_image: data.login_left_image || "/assets/images/backgrounds/left-side-img.jpg",
            login_tagline: data.login_tagline || "TECT CSR",
            login_title: data.login_title || "Tect CSR",
            login_desc: data.login_desc || "",
            login_signin_title: data.login_signin_title || "Sign In",
            login_signin_sub: data.login_signin_sub || "Secure access to your CSR dashboard",
            login_logo_badge_style: data.login_logo_badge_style || "curve",
            login_show_bubbles: data.login_show_bubbles !== undefined ? data.login_show_bubbles : "true",
            login_bubble1_icon: data.login_bubble1_icon || "leaf",
            login_bubble1_title: data.login_bubble1_title || "CSR Impact\nAssessment",
            login_bubble2_icon: data.login_bubble2_icon || "shield",
            login_bubble2_title: data.login_bubble2_title || "CSR\nCompliance",
            login_bubble3_icon: data.login_bubble3_icon || "strategy",
            login_bubble3_title: data.login_bubble3_title || "CSR\nStrategy",
            login_bubble4_icon: data.login_bubble4_icon || "hands",
            login_bubble4_title: data.login_bubble4_title || "Corporate\nVolunteering",
            login_security_badge_text: data.login_security_badge_text || "Protected by Enterprise Security",
            login_auth_mode: data.login_auth_mode || "standard",
            sso_provider_type: data.sso_provider_type || "microsoft",
            sso_button_text: data.sso_button_text || "Sign in with Microsoft 365",
            sso_login_url: data.sso_login_url || "/api/v1/auth/sso",
            allow_ngo_registration: data.allow_ngo_registration !== "false" && data.allow_ngo_registration !== false,
            skip_ngo_otp_verification: data.skip_ngo_otp_verification === "true" || data.skip_ngo_otp_verification === true,
            ngo_register_left_title: data.ngo_register_left_title || "NGO Partner Onboarding",
            ngo_register_left_desc: data.ngo_register_left_desc || "",
            ngo_register_form_title: data.ngo_register_form_title || "NGO Partner Registration",
            ngo_register_form_sub: data.ngo_register_form_sub || "Fill in your organization details to begin partnership onboarding",
            ngo_register_btn_text: data.ngo_register_btn_text || "REGISTER AS NGO PARTNER",
            ngo_register_step1_text: data.ngo_register_step1_text || "Enter Darpan & contact credentials",
            ngo_register_step2_text: data.ngo_register_step2_text || "Verify official email address",
            ngo_register_step3_text: data.ngo_register_step3_text || "Manager review & credentials dispatch",
            smtp_host: data.smtp_host || "",
            smtp_port: data.smtp_port || "587",
            smtp_user: data.smtp_user || "",
            smtp_password: data.smtp_password || "",
            smtp_from_name: data.smtp_from_name || "TechCSR",
            smtp_from_address: data.smtp_from_address || "",
            smtp_secure: data.smtp_secure === "true" || data.smtp_secure === true,
          };
          form.setFieldsValue(initialValues);
          setTemplateValues(initialValues);
          setPrimaryColor(data.primary_color || "#15803d");
          setSecondaryColor(data.secondary_color || "#659327");
          if (data.site_logo) setLogoPreview(getSettingUrl(data.site_logo));
          if (data.favicon) setFaviconPreview(getSettingUrl(data.favicon));
          if (data.login_bg_image) setLoginBgPreview(getSettingUrl(data.login_bg_image));
          if (data.login_left_image) setLoginLeftPreview(getSettingUrl(data.login_left_image));
        }
      } catch (err) {
        console.error("Failed to load settings directly", err);
      }
    };
    fetchDirect();
  }, []);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      const mergedValues = {
        site_name: settings.site_name || "",
        site_title: settings.site_title || "",
        site_description: settings.site_description || "",
        footer_text: settings.footer_text || "",
        support_email: settings.support_email || "",
        support_phone: settings.support_phone || "",
        primary_color: settings.primary_color || "#15803d",
        secondary_color: settings.secondary_color || "#659327",
        login_bg_image: settings.login_bg_image || "/assets/images/backgrounds/login-bg.png",
        login_left_image: settings.login_left_image || "/assets/images/backgrounds/left-side-img.jpg",
        login_tagline: settings.login_tagline || "TECT CSR",
        login_title: settings.login_title || "Tect CSR",
        login_desc: settings.login_desc || "",
        login_signin_title: settings.login_signin_title || "Sign In",
        login_signin_sub: settings.login_signin_sub || "Secure access to your CSR dashboard",
        login_logo_badge_style: settings.login_logo_badge_style || "curve",
        login_show_bubbles: settings.login_show_bubbles !== undefined ? settings.login_show_bubbles : "true",
        login_bubble1_icon: settings.login_bubble1_icon || "leaf",
        login_bubble1_title: settings.login_bubble1_title || "CSR Impact\nAssessment",
        login_bubble2_icon: settings.login_bubble2_icon || "shield",
        login_bubble2_title: settings.login_bubble2_title || "CSR\nCompliance",
        login_bubble3_icon: settings.login_bubble3_icon || "strategy",
        login_bubble3_title: settings.login_bubble3_title || "CSR\nStrategy",
        login_bubble4_icon: settings.login_bubble4_icon || "hands",
        login_bubble4_title: settings.login_bubble4_title || "Corporate\nVolunteering",
        login_security_badge_text: settings.login_security_badge_text || "Protected by Enterprise Security",
        login_auth_mode: settings.login_auth_mode || "standard",
        sso_provider_type: settings.sso_provider_type || "microsoft",
        sso_button_text: settings.sso_button_text || "Sign in with Microsoft 365",
        sso_login_url: settings.sso_login_url || "/api/v1/auth/sso",
        allow_ngo_registration: settings.allow_ngo_registration !== "false" && settings.allow_ngo_registration !== false,
        skip_ngo_otp_verification: settings.skip_ngo_otp_verification === "true" || settings.skip_ngo_otp_verification === true,
        ngo_register_left_title: settings.ngo_register_left_title || "NGO Partner Onboarding",
        ngo_register_left_desc: settings.ngo_register_left_desc || "",
        ngo_register_form_title: settings.ngo_register_form_title || "NGO Partner Registration",
        ngo_register_form_sub: settings.ngo_register_form_sub || "Fill in your organization details to begin partnership onboarding",
        ngo_register_btn_text: settings.ngo_register_btn_text || "REGISTER AS NGO PARTNER",
        ngo_register_step1_text: settings.ngo_register_step1_text || "Enter Darpan & contact credentials",
        ngo_register_step2_text: settings.ngo_register_step2_text || "Verify official email address",
        ngo_register_step3_text: settings.ngo_register_step3_text || "Manager review & credentials dispatch",
        smtp_host: settings.smtp_host || "",
        smtp_port: settings.smtp_port || "587",
        smtp_user: settings.smtp_user || "",
        smtp_password: settings.smtp_password || "",
        smtp_from_name: settings.smtp_from_name || "TechCSR",
        smtp_from_address: settings.smtp_from_address || "",
        smtp_secure: settings.smtp_secure === "true" || settings.smtp_secure === true,
      };
      form.setFieldsValue(mergedValues);
      setTemplateValues((prev) => ({ ...prev, ...mergedValues }));

      setPrimaryColor(settings.primary_color || "#15803d");
      setSecondaryColor(settings.secondary_color || "#659327");

      if (settings.site_logo && !logoFile) setLogoPreview(getSettingUrl(settings.site_logo));
      if (settings.favicon && !faviconFile) setFaviconPreview(getSettingUrl(settings.favicon));
      if (settings.login_bg_image && !loginBgFile) setLoginBgPreview(getSettingUrl(settings.login_bg_image));
      if (settings.login_left_image && !loginLeftFile) setLoginLeftPreview(getSettingUrl(settings.login_left_image));
    }
  }, [settings, form]);

  const handleLogoChange = (file) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const handleFaviconChange = (file) => {
    setFaviconFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFaviconPreview(e.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const hexToRgbStr = (hex) => {
    let col = (hex || "#15803d").replace(/^\s*#|\s*$/g, '');
    if (col.length === 3) col = col.replace(/(.)/g, '$1$1');
    const r = parseInt(col.substr(0, 2), 16) || 0;
    const g = parseInt(col.substr(2, 2), 16) || 0;
    const b = parseInt(col.substr(4, 2), 16) || 0;
    return `${r}, ${g}, ${b}`;
  };

  const adjustHexBrightness = (hex, percent) => {
    let col = (hex || "#15803d").replace(/^\s*#|\s*$/g, '');
    if (col.length === 3) col = col.replace(/(.)/g, '$1$1');
    let r = parseInt(col.substr(0, 2), 16);
    let g = parseInt(col.substr(2, 2), 16);
    let b = parseInt(col.substr(4, 2), 16);
    r = Math.min(255, Math.max(0, r + (r * percent) / 100));
    g = Math.min(255, Math.max(0, g + (g * percent) / 100));
    b = Math.min(255, Math.max(0, b + (b * percent) / 100));
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  };

  const applyLivePreviewColors = (pColor, sColor) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const p = pColor || primaryColor;
    const s = sColor || secondaryColor;
    if (pColor) {
      root.style.setProperty("--primary-color", pColor);
      root.style.setProperty("--primary-color-rgb", hexToRgbStr(pColor));
      root.style.setProperty("--primary-color-dark", adjustHexBrightness(pColor, -50));
    }
    if (sColor) {
      root.style.setProperty("--secondary-color", sColor);
      root.style.setProperty("--secondary-color-rgb", hexToRgbStr(sColor));
    }
    root.style.setProperty("--primary-gradient", `linear-gradient(135deg, ${p} 0%, ${s} 100%)`);
  };

  const handlePrimaryColorChange = (color) => {
    setPrimaryColor(color);
    setTemplateValues((prev) => ({ ...prev, primary_color: color }));
    form.setFieldsValue({ primary_color: color });
    applyLivePreviewColors(color, null);
  };

  const handleSecondaryColorChange = (color) => {
    setSecondaryColor(color);
    setTemplateValues((prev) => ({ ...prev, secondary_color: color }));
    form.setFieldsValue({ secondary_color: color });
    applyLivePreviewColors(null, color);
  };

  const onFinish = async (values) => {
    const combined = { ...templateValues, ...values };
    const formData = new FormData();
    formData.append("site_name", combined.site_name || "");
    formData.append("site_title", combined.site_title || "");
    formData.append("site_description", combined.site_description || "");
    formData.append("footer_text", combined.footer_text || "");
    formData.append("primary_color", primaryColor || combined.primary_color || "#15803d");
    formData.append("secondary_color", secondaryColor || combined.secondary_color || "#659327");
    formData.append("support_email", combined.support_email || "");
    formData.append("support_phone", combined.support_phone || "");

    // Template customizer specific settings
    formData.append("login_tagline", combined.login_tagline || "");
    formData.append("login_title", combined.login_title || "");
    formData.append("login_desc", combined.login_desc || "");
    formData.append("login_signin_title", combined.login_signin_title || "Sign In");
    formData.append("login_signin_sub", combined.login_signin_sub || "Secure access to your CSR dashboard");
    formData.append("login_logo_badge_style", combined.login_logo_badge_style || "curve");
    formData.append("login_show_bubbles", combined.login_show_bubbles !== undefined ? String(combined.login_show_bubbles) : "true");
    formData.append("login_bubble1_icon", combined.login_bubble1_icon || "leaf");
    formData.append("login_bubble1_title", combined.login_bubble1_title || "");
    formData.append("login_bubble2_icon", combined.login_bubble2_icon || "shield");
    formData.append("login_bubble2_title", combined.login_bubble2_title || "");
    formData.append("login_bubble3_icon", combined.login_bubble3_icon || "strategy");
    formData.append("login_bubble3_title", combined.login_bubble3_title || "");
    formData.append("login_bubble4_icon", combined.login_bubble4_icon || "hands");
    formData.append("login_bubble4_title", combined.login_bubble4_title || "");
    formData.append("login_security_badge_text", combined.login_security_badge_text || "");

    // SSO & Login Auth Mode settings
    formData.append("login_auth_mode", combined.login_auth_mode || "standard");
    formData.append("sso_provider_type", combined.sso_provider_type || "microsoft");
    formData.append("sso_button_text", combined.sso_button_text || "Sign in with Microsoft 365");
    formData.append("sso_login_url", combined.sso_login_url || "/api/v1/auth/sso");

    // Email & Onboarding specific settings
    formData.append("allow_ngo_registration", combined.allow_ngo_registration !== undefined ? String(combined.allow_ngo_registration) : "true");
    formData.append("skip_ngo_otp_verification", combined.skip_ngo_otp_verification !== undefined ? String(combined.skip_ngo_otp_verification) : "false");
    formData.append("ngo_register_left_title", combined.ngo_register_left_title || "NGO Partner Onboarding");
    formData.append("ngo_register_left_desc", combined.ngo_register_left_desc || "");
    formData.append("ngo_register_form_title", combined.ngo_register_form_title || "NGO Partner Registration");
    formData.append("ngo_register_form_sub", combined.ngo_register_form_sub || "Fill in your organization details to begin partnership onboarding");
    formData.append("ngo_register_btn_text", combined.ngo_register_btn_text || "REGISTER AS NGO PARTNER");
    formData.append("ngo_register_step1_text", combined.ngo_register_step1_text || "Enter Darpan & contact credentials");
    formData.append("ngo_register_step2_text", combined.ngo_register_step2_text || "Verify official email address");
    formData.append("ngo_register_step3_text", combined.ngo_register_step3_text || "Manager review & credentials dispatch");
    formData.append("smtp_host", combined.smtp_host || "");
    formData.append("smtp_port", combined.smtp_port || "587");
    formData.append("smtp_user", combined.smtp_user || "");
    formData.append("smtp_password", combined.smtp_password || "");
    formData.append("smtp_from_name", combined.smtp_from_name || "TechCSR");
    formData.append("smtp_from_address", combined.smtp_from_address || "");
    formData.append("smtp_secure", combined.smtp_secure !== undefined ? String(combined.smtp_secure) : "false");

    if (combined.login_bg_image && !loginBgFile) {
      formData.append("login_bg_image", combined.login_bg_image);
    }
    if (combined.login_left_image && !loginLeftFile) {
      formData.append("login_left_image", combined.login_left_image);
    }

    if (logoFile) formData.append("site_logo", logoFile);
    if (faviconFile) formData.append("favicon", faviconFile);
    if (loginBgFile) formData.append("login_bg_image", loginBgFile);
    if (loginLeftFile) formData.append("login_left_image", loginLeftFile);

    try {
      setSaving(true);
      const res = await privateHttpClient.put("/configurator/settings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        message.success("Settings & Template configuration updated successfully!");
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        refreshSettings(res.data?.settings);
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const [testEmailModalVisible, setTestEmailModalVisible] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  const navItems = [
    {
      group: "ACCOUNT",
      items: [
        { key: "profile", label: "My Profile", icon: <UserOutlined />, color: "#3b82f6", bg: "#eff6ff" },
        { key: "general", label: "General", icon: <HomeOutlined />, color: "#15803d", bg: "#f0fdf4" },
      ],
    },
    {
      group: "WORKSPACE",
      items: [
        { key: "branding", label: "Branding & Theme", icon: <FormatPainterOutlined />, color: "#f59e0b", bg: "#fffbeb" },
        { key: "templates", label: "Templates", icon: <FileTextOutlined />, color: "#10b981", bg: "#ecfdf5" },
        { key: "email_onboarding", label: "Email & Onboarding", icon: <MailOutlined />, color: "#0284c7", bg: "#f0f9ff" },
      ],
    },
  ];

  const handleSendTestEmail = async () => {
    if (!testRecipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipientEmail.trim())) {
      message.error("Please enter a valid recipient email address.");
      return;
    }

    try {
      setTestSending(true);
      const currentFormValues = form.getFieldsValue();
      const res = await privateHttpClient.post("/configurator/settings/test-email", {
        recipient_email: testRecipientEmail.trim(),
        smtp_host: currentFormValues.smtp_host,
        smtp_port: currentFormValues.smtp_port,
        smtp_user: currentFormValues.smtp_user,
        smtp_password: currentFormValues.smtp_password,
        smtp_from_name: currentFormValues.smtp_from_name,
        smtp_from_address: currentFormValues.smtp_from_address,
        smtp_secure: currentFormValues.smtp_secure,
      });

      if (res.data?.success) {
        message.success(res.data.message || "Test email sent successfully!");
        setTestEmailModalVisible(false);
        setTestRecipientEmail("");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to send test email. Please check your SMTP settings.");
    } finally {
      setTestSending(false);
    }
  };

  const getBreadcrumbTitle = () => {
    for (const group of navItems) {
      const match = group.items.find((i) => i.key === activeNav);
      if (match) return match.label;
    }
    return "General";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", background: "#f8fafc", overflow: "hidden" }}>
      {/* ── FIXED TOP BREADCRUMB & ACTION HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 36px",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          flexShrink: 0,
          zIndex: 20,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--primary-gradient, var(--primary-color, #15803d))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(var(--primary-color-rgb, 21, 128, 61), 0.25)",
            }}
          >
            <SettingOutlined style={{ fontSize: 18 }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.4px" }}>Settings</span>
              <span style={{ color: "#cbd5e1", fontSize: 16, fontWeight: 400 }}>/</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary-color, #15803d)" }}>{getBreadcrumbTitle()}</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
              Manage your workspace identity, system preferences, and notifications
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {lastSaved && activeNav !== "profile" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#15803d", fontWeight: 600 }}>
              <CheckCircleFilled style={{ color: "#16a34a" }} />
              Saved at {lastSaved}
            </div>
          )}

          {activeNav !== "profile" && (
            <Button
            className="conf-create-btn"
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => form.submit()}
              style={{
                background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                borderColor: "#15803d",
                borderRadius: 8,
                height: 40,
                padding: "0 24px",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* ── BODY CONTAINER: FIXED LEFT SIDEBAR + SCROLLABLE RIGHT CONTENT ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>
        {/* FIXED LEFT NAVIGATION SIDEBAR */}
        <div
          style={{
            width: 250,
            flexShrink: 0,
            overflowY: "auto",
            padding: "24px 16px 32px 28px",
            borderRight: "1px solid #e2e8f0",
            background: "#ffffff",
            height: "100%",
          }}
        >
          {navItems.map((group) => (
            <div key={group.group} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.8px",
                  paddingLeft: 12,
                  marginBottom: 8,
                }}
              >
                {group.group}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {group.items.map((item) => {
                  const isActive = activeNav === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => setActiveNav(item.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: isActive ? "rgba(var(--primary-color-rgb, 21, 128, 61), 0.08)" : "transparent",
                        color: isActive ? "var(--primary-color, #15803d)" : "#475569",
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 13.5,
                        transition: "all 0.15s ease",
                        border: isActive ? "1px solid rgba(var(--primary-color-rgb, 21, 128, 61), 0.25)" : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: isActive ? "rgba(var(--primary-color-rgb, 21, 128, 61), 0.15)" : item.bg,
                          color: isActive ? "var(--primary-color, #15803d)" : item.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {item.icon}
                      </div>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {isActive && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary-color, #16a34a)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* SCROLLABLE RIGHT MAIN CONTENT AREA */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 48px 90px 48px",
            height: "100%",
          }}
        >
          <div style={{ maxWidth: activeNav === "templates" ? 1300 : 860 }}>
            {/* ── TAB: MY PROFILE ── */}
            {activeNav === "profile" && <UserProfileSettings />}

            {/* ── SETTINGS TABS ── */}
            {activeNav !== "profile" && (
              <Form form={form} preserve={true} layout="vertical" onFinish={onFinish}>
                {/* ── TAB: GENERAL ── */}
                {activeNav === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  {/* Card 1: Site Information & Metadata */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "24px 28px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#f0fdf4",
                          color: "#15803d",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        <GlobalOutlined />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          Site Information & Metadata
                        </h2>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>
                          Application title, browser tab headers, and copyright footers
                        </div>
                      </div>
                    </div>

                    <Row gutter={18}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="site_name"
                          label={<span style={{ fontWeight: 600, color: "#334155" }}>Site / Application Name *</span>}
                          rules={[{ required: true, message: "Site name is required" }]}
                        >
                          <Input placeholder="e.g. TechCSR Portal" size="large" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="site_title"
                          label={<span style={{ fontWeight: 600, color: "#334155" }}>Site Title / Tagline *</span>}
                          rules={[{ required: true, message: "Site title is required" }]}
                        >
                          <Input placeholder="e.g. Enterprise CSR Platform" size="large" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name="site_description" label={<span style={{ fontWeight: 600, color: "#334155" }}>Site Description & Meta</span>}>
                          <TextArea rows={2} placeholder="Describe the portal purpose and services for search and portal previews..." style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name="footer_text" label={<span style={{ fontWeight: 600, color: "#334155" }}>Footer Copyright Text</span>}>
                          <Input placeholder="e.g. © 2026 TechCSR Inc. All rights reserved." size="large" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* Card 2: Appearance & Theme Mode */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "24px 28px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#fffbeb",
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        <SunOutlined />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          Interface Appearance
                        </h2>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>
                          Customize visual theme styling and color contrast
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                      {[
                        { id: "Light", label: "Light Theme", icon: <SunOutlined />, desc: "Clean & bright UI" },
                        { id: "Dark", label: "Dark Theme", icon: <MoonOutlined />, desc: "High contrast mode" },
                        { id: "System", label: "System Sync", icon: <SyncOutlined />, desc: "Follows OS setting" },
                      ].map((item) => {
                        const isSelected = appearance === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setAppearance(item.id)}
                            style={{
                              border: isSelected ? "2px solid #15803d" : "1px solid #e2e8f0",
                              background: isSelected ? "#f0fdf4" : "#ffffff",
                              borderRadius: 12,
                              padding: "16px 14px",
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                              gap: 6,
                              transition: "all 0.2s ease",
                            }}
                          >
                            <div style={{ fontSize: 20, color: isSelected ? "#15803d" : "#64748b" }}>
                              {item.icon}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? "#15803d" : "#0f172a" }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{item.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 3: Notification Preferences */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "24px 28px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#eff6ff",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        <BellOutlined />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          Notification Preferences
                        </h2>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>
                          Choose when and how you want to be alerted across devices
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 22, padding: "16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Notify me when...</span>
                        <a href="#about-notifications" onClick={(e) => e.preventDefault()} style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                          About notifications?
                        </a>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Checkbox checked={notifProductivity} onChange={(e) => setNotifProductivity(e.target.checked)}>
                          <span style={{ fontSize: 13, color: "#334155" }}>Daily productivity update & task digest</span>
                        </Checkbox>
                        <Checkbox checked={notifNewEvent} onChange={(e) => setNotifNewEvent(e.target.checked)}>
                          <span style={{ fontSize: 13, color: "#334155" }}>New workflow event or form submission created</span>
                        </Checkbox>
                        <Checkbox checked={notifNewTeam} onChange={(e) => setNotifNewTeam(e.target.checked)}>
                          <span style={{ fontSize: 13, color: "#334155" }}>When assigned or added to a new department team</span>
                        </Checkbox>
                      </div>
                    </div>

                    {/* Notification Rows */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          <MobileOutlined />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Mobile Push Notifications</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            Receive instant alerts on your paired mobile app
                          </div>
                        </div>
                      </div>
                      <Switch checked={mobilePush} onChange={(checked) => setMobilePush(checked)} />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ecfeff", color: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          <DesktopOutlined />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Desktop Browser Alerts</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            Show native floating notifications while working in the browser
                          </div>
                        </div>
                      </div>
                      <Switch checked={desktopNotif} onChange={(checked) => setDesktopNotif(checked)} />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 0 4px 0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          <InboxOutlined />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Email Digest Notifications</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            Send automated activity summaries to your registered email
                          </div>
                        </div>
                      </div>
                      <Switch checked={emailNotif} onChange={(checked) => setEmailNotif(checked)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: BRANDING & THEME ── */}
              {activeNav === "branding" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "24px 28px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#fffbeb",
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        <FormatPainterOutlined />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          Branding & Logos
                        </h2>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>
                          Upload organization logo and browser favicon
                        </div>
                      </div>
                    </div>

                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <div
                          style={{
                            border: "1px dashed #cbd5e1",
                            borderRadius: 12,
                            padding: 24,
                            background: "#f8fafc",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "#1e293b" }}>Organization Logo</div>
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Logo Preview"
                              style={{ maxHeight: 70, objectFit: "contain", marginBottom: 14, display: "inline-block" }}
                            />
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: 12.5, marginBottom: 14 }}>No logo uploaded</div>
                          )}
                          <div>
                            <Upload beforeUpload={handleLogoChange} showUploadList={false} accept="image/*">
                              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, fontWeight: 600 }}>
                                Upload Logo
                              </Button>
                            </Upload>
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} md={12}>
                        <div
                          style={{
                            border: "1px dashed #cbd5e1",
                            borderRadius: 12,
                            padding: 24,
                            background: "#f8fafc",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "#1e293b" }}>Browser Favicon</div>
                          {faviconPreview ? (
                            <img
                              src={faviconPreview}
                              alt="Favicon Preview"
                              style={{ maxHeight: 40, objectFit: "contain", marginBottom: 14, display: "inline-block" }}
                            />
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: 12.5, marginBottom: 14 }}>No favicon uploaded</div>
                          )}
                          <div>
                            <Upload beforeUpload={handleFaviconChange} showUploadList={false} accept="image/*">
                              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, fontWeight: 600 }}>
                                Upload Favicon
                              </Button>
                            </Upload>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "24px 28px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#f0fdf4",
                          color: "#15803d",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        <BgColorsOutlined />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          Theme Brand Colors
                        </h2>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>
                          Main brand highlights and secondary accent tones
                        </div>
                      </div>
                    </div>

                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => handlePrimaryColorChange(e.target.value)}
                            style={{ width: 44, height: 44, border: "none", borderRadius: 8, cursor: "pointer" }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Primary Brand Color</div>
                            <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{primaryColor}</div>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} md={12}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => handleSecondaryColorChange(e.target.value)}
                            style={{ width: 44, height: 44, border: "none", borderRadius: 8, cursor: "pointer" }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Secondary Accent Color</div>
                            <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{secondaryColor}</div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              )}

              {/* ── TAB: EMAIL & NGO ONBOARDING SETTINGS ── */}
              {activeNav === "email_onboarding" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {/* Card 1: NGO Partner Onboarding Controls */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "24px 28px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#f0fdf4",
                          color: "#15803d",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        <UserOutlined />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          NGO Registration &amp; Onboarding Controls
                        </h2>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>
                          Configure public NGO partner onboarding and OTP verification behavior
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                      {/* Switch 1: Allow NGO Registration on Login */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px 20px",
                          background: "#f8fafc",
                          borderRadius: 10,
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                            Allow NGO Registration on Login Page
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            When enabled, renders the "Register as NGO Partner" button on the public login page.
                          </div>
                        </div>
                        <Form.Item name="allow_ngo_registration" valuePropName="checked" noStyle initialValue={true}>
                          <Switch />
                        </Form.Item>
                      </div>

                      {/* Switch 2: Skip NGO Email OTP Verification */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px 20px",
                          background: "#f8fafc",
                          borderRadius: 10,
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                            Skip NGO Email OTP Verification
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            Bypass the 6-digit email OTP verification step during NGO registration and proceed directly to profile &amp; due diligence onboarding.
                          </div>
                        </div>
                        <Form.Item name="skip_ngo_otp_verification" valuePropName="checked" noStyle initialValue={false}>
                          <Switch />
                        </Form.Item>
                      </div>

                      {/* Section: NGO Registration Page Content & Labels */}
                      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px dashed #e2e8f0" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>
                          NGO Registration Page Content &amp; Labels
                        </div>
                        <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 16 }}>
                          Customize the headings, subtitles, button text, and step labels displayed on the public NGO Registration page and modal.
                        </div>

                        <Row gutter={[16, 12]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Left Panel Banner Title</span>}
                              name="ngo_register_left_title"
                              tooltip="Main heading on the left image panel (e.g. NGO Partner Onboarding)"
                            >
                              <Input placeholder="NGO Partner Onboarding" style={{ borderRadius: 8, height: 38 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Right Form Title</span>}
                              name="ngo_register_form_title"
                              tooltip="Heading above the form fields (e.g. NGO Partner Registration)"
                            >
                              <Input placeholder="NGO Partner Registration" style={{ borderRadius: 8, height: 38 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Right Form Subtitle</span>}
                              name="ngo_register_form_sub"
                              tooltip="Subtitle under the form title"
                            >
                              <Input placeholder="Fill in your organization details to begin partnership onboarding" style={{ borderRadius: 8, height: 38 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Register Button Text</span>}
                              name="ngo_register_btn_text"
                              tooltip="Action button label (e.g. REGISTER AS NGO PARTNER)"
                            >
                              <Input placeholder="REGISTER AS NGO PARTNER" style={{ borderRadius: 8, height: 38 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Left Panel Description Paragraph</span>}
                              name="ngo_register_left_desc"
                              tooltip="Description paragraph under the title on the left panel (leave empty to use default site description)"
                            >
                              <Input.TextArea rows={2} placeholder="Welcome to the Corporate Social Responsibility portal. Register your NGO to partner with corporate donors, participate in CSR initiatives, and access grant opportunities." style={{ borderRadius: 8 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Step 1 Label</span>}
                              name="ngo_register_step1_text"
                            >
                              <Input placeholder="Enter Darpan & contact credentials" style={{ borderRadius: 8, height: 38 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Step 2 (OTP) Label</span>}
                              name="ngo_register_step2_text"
                            >
                              <Input placeholder="Verify official email address" style={{ borderRadius: 8, height: 38 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={8}>
                            <Form.Item
                              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Step 3 (Review) Label</span>}
                              name="ngo_register_step3_text"
                            >
                              <Input placeholder="Manager review & credentials dispatch" style={{ borderRadius: 8, height: 38 }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: SMTP Mail Server Configuration */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "24px 28px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "#eff6ff",
                            color: "#3b82f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          <MailOutlined />
                        </div>
                        <div>
                          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                            SMTP Mail Server Details
                          </h2>
                          <div style={{ fontSize: 12.5, color: "#64748b" }}>
                            Live SMTP outgoing mail server credentials for OTPs, credentials, and notifications
                          </div>
                        </div>
                      </div>

                      <Button
                        type="default"
                        icon={<MailOutlined />}
                        onClick={() => setTestEmailModalVisible(true)}
                        style={{ borderRadius: 8, fontWeight: 600 }}
                      >
                        Send Test Email
                      </Button>
                    </div>

                    <Row gutter={16}>
                      <Col xs={24} md={16}>
                        <Form.Item
                          name="smtp_host"
                          label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>SMTP Host Address</span>}
                        >
                          <Input placeholder="e.g. smtp.gmail.com or smtp.office365.com" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="smtp_port"
                          label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>SMTP Port</span>}
                        >
                          <Input placeholder="587 or 465" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="smtp_user"
                          label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>SMTP Username / Account Email</span>}
                        >
                          <Input placeholder="e.g. notifications@techcsr.com" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="smtp_password"
                          label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>SMTP Password / App Secret</span>}
                        >
                          <Input.Password placeholder="Enter SMTP password" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="smtp_from_name"
                          label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Sender Display Name</span>}
                        >
                          <Input placeholder="e.g. TechCSR System" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          name="smtp_from_address"
                          label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Sender Email Address</span>}
                        >
                          <Input placeholder="e.g. noreply@techcsr.com" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </div>
              )}

              {/* ── TAB: TEMPLATES CONFIGURATOR ── */}
              {activeNav === "templates" && (
                <TemplateConfigurator
                  form={form}
                  currentValues={templateValues}
                  onValuesChange={(newVals) => {
                    setTemplateValues(newVals);
                    if (newVals.primary_color) setPrimaryColor(newVals.primary_color);
                    if (newVals.secondary_color) setSecondaryColor(newVals.secondary_color);
                    applyLivePreviewColors(newVals.primary_color, newVals.secondary_color);
                  }}
                  logoPreview={logoPreview}
                  setLogoPreview={setLogoPreview}
                  setLogoFile={setLogoFile}
                  loginBgPreview={loginBgPreview}
                  setLoginBgPreview={setLoginBgPreview}
                  setLoginBgFile={setLoginBgFile}
                  loginLeftPreview={loginLeftPreview}
                  setLoginLeftPreview={setLoginLeftPreview}
                  setLoginLeftFile={setLoginLeftFile}
                />
              )}

              {/* ── TAB: OTHER SECTIONS PLACEHOLDERS ── */}
              {!["profile", "general", "branding", "contact", "templates", "email_onboarding"].includes(activeNav) && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "36px 28px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "#f0fdf4",
                      color: "#15803d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      margin: "0 auto 16px auto",
                    }}
                  >
                    <CheckOutlined />
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                    {getBreadcrumbTitle()} Module Active
                  </h2>
                  <div style={{ fontSize: 13, color: "#64748b", maxWidth: 440, margin: "0 auto" }}>
                    Standard organization settings and role-based policies are synchronized and active for this workspace.
                  </div>
                </div>
              )}
            </Form>
            )}
          </div>
        </div>
      </div>

      {/* Test Email Delivery Modal */}
      <Modal
        open={testEmailModalVisible}
        onCancel={() => setTestEmailModalVisible(false)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            <MailOutlined style={{ color: "#15803d" }} />
            <span>Test SMTP Mail Delivery</span>
          </div>
        }
        onOk={handleSendTestEmail}
        confirmLoading={testSending}
        okText="Send Test Email"
        centered
        destroyOnHidden
      >
        <div style={{ padding: "12px 0" }}>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 14px 0" }}>
            Enter a recipient email address to verify that your SMTP server connection, credentials, and SSL handshake are functioning properly.
          </p>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 4 }}>
            Recipient Email Address
          </div>
          <Input
            placeholder="e.g. your-email@domain.com"
            value={testRecipientEmail}
            onChange={(e) => setTestRecipientEmail(e.target.value)}
            style={{ borderRadius: 8, height: 40 }}
          />
        </div>
      </Modal>
    </div>
  );
}
