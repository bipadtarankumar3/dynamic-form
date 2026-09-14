'use client';

import React, { useState, useEffect } from "react";
import { Button, Form, Input } from "antd";
import {
  BankOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  IdcardOutlined,
  CheckCircleFilled,
  ArrowLeftOutlined,
  ReloadOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { FaShieldAlt } from "react-icons/fa";
import { getBubbleIconComponent } from "@/utils/bubbleIcons";
import { useSettings } from "@/context/SettingsContext";
import { publicHttpClient } from "@/services/api/httpClient";
import { publicFormSchemaAPI } from "@/services/dynamicForm-service";
import { toast } from "react-toastify";
import * as Yup from "yup";
import loginLogoImg from "@/assets/images/backgrounds/login-logo-bg.png";
import lpLeftBg from "@/assets/images/backgrounds/left-side-img.jpg";
import "@/assets/css/csr-services.css";
import "@/assets/css/login/login.css";
import "@/assets/css/login/right-bubbles.css";
import Link from "next/link";

const generateCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function RegisterNGO() {
  const { settings, getSettingUrl } = useSettings();
  const [form] = Form.useForm();
  const [step, setStep] = useState(1); // 1: Form, 2: OTP, 3: Success
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [formSchema, setFormSchema] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [registrationId, setRegistrationId] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    darpan_no: "",
    darpan_link: "",
    organization_name: "",
    email: "",
    phone_no: "",
    person_name: "",
    person_designation: "",
    website: "",
    address: "",
    permanent_address: "",
    captcha: "",
    otp: "",
  });

  // Load Form Builder Implementation Partner Schema
  useEffect(() => {
    let isMounted = true;
    async function loadFormBuilderSchema() {
      try {
        setSchemaLoading(true);
        const res = await publicFormSchemaAPI({ form_slug: "implementation_partner" });
        if (isMounted && res?.data?.success && res?.data?.data) {
          setFormSchema(res.data.data);
        }
      } catch (err) {
        console.warn("[RegisterNGO] Notice: Using fallback schema for implementation_partner:", err.message);
      } finally {
        if (isMounted) setSchemaLoading(false);
      }
    }
    loadFormBuilderSchema();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field, val) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: val };
      // Keep aliases synchronized
      if (field === "organization_name") next.name_of_the_organization = val;
      if (field === "name_of_the_organization") next.organization_name = val;
      if (field === "darpan_no") next.csr_registration_number = val;
      if (field === "csr_registration_number") next.darpan_no = val;
      if (field === "email") next.primary_email = val;
      if (field === "primary_email") next.email = val;
      if (field === "phone_no") next.contact = val;
      if (field === "contact") next.phone_no = val;
      if (field === "person_name") next.name = val;
      if (field === "name") next.person_name = val;
      if (field === "person_designation") next.designation = val;
      if (field === "designation") next.person_designation = val;
      if (field === "darpan_link") next.website = val;
      if (field === "website") next.darpan_link = val;
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const INDIAN_PHONE_REGEX = /^(?:(?:\+|0{0,2})91[\s-]?|[0]?)?[6-9]\d{9}$/;

  // Helper to extract fields from Form Builder sections
  const schemaSections = formSchema?.sections || [];
  const basicSection = schemaSections.find(s => s.type === "general" || s.slug?.includes("basic")) || schemaSections[0];
  const contactSection = schemaSections.find(s => s.type === "add_more" || s.slug?.includes("contact")) || schemaSections[1];

  const basicFields = basicSection?.fields || [];
  const contactFields = contactSection?.fields || [];

  // Helper to find field config in Form Builder schema
  const getFieldMeta = (fieldKeys, defaultLabel, defaultPlaceholder, defaultRequired = false) => {
    const keys = Array.isArray(fieldKeys) ? fieldKeys : [fieldKeys];
    const allFields = [...basicFields, ...contactFields];
    const found = allFields.find((f) => {
      const fKeys = [f.db_field, f.column_name, f.name, f.id, f.slug]
        .filter(Boolean)
        .map((k) => String(k).toLowerCase());
      return keys.some(
        (k) =>
          fKeys.includes(String(k).toLowerCase()) ||
          fKeys.includes(`fld_${String(k).toLowerCase()}`)
      );
    });
    if (!found) {
      return {
        label: defaultLabel,
        placeholder: defaultPlaceholder,
        required: defaultRequired,
        type: "text",
        options: [],
      };
    }
    return {
      label: found.label || found.section_label || defaultLabel,
      placeholder: found.ui?.placeholder || found.placeholder || defaultPlaceholder,
      required: found.required !== undefined ? found.required : defaultRequired,
      type: found.type || "text",
      options: found.options || [],
    };
  };

  // Additional custom fields configured in Form Builder beyond standard ones
  const standardKeys = new Set([
    "organization_name", "name_of_the_organization",
    "darpan_no", "csr_registration_number",
    "email", "primary_email",
    "phone_no", "contact",
    "person_name", "name",
    "person_designation", "designation",
    "darpan_link", "website",
    "address", "permanent_address"
  ]);

  const customBasicFields = basicFields.filter(f => {
    const k = (f.db_field || f.column_name || f.name || f.id || "").toLowerCase().replace(/^fld_/, "");
    return !standardKeys.has(k) && f.visible !== false;
  });

  const validateStep1 = async () => {
    try {
      const darpanMeta = getFieldMeta(["darpan_no", "csr_registration_number"], "Darpan No", "Enter Darpan Number", true);
      const orgMeta = getFieldMeta(["organization_name", "name_of_the_organization"], "Organization Name", "Enter organization name", true);
      const emailMeta = getFieldMeta(["email", "primary_email"], "Email", "Enter valid email id", true);
      const phoneMeta = getFieldMeta(["phone_no", "contact"], "Phone No", "Enter valid Phone no", true);
      const personMeta = getFieldMeta(["person_name", "name"], "Person Name", "Enter the person's name", true);
      const desigMeta = getFieldMeta(["person_designation", "designation"], "Person Designation", "Enter person Designation", true);

      const shape = {
        darpan_no: darpanMeta.required
          ? Yup.string().trim().required(`${darpanMeta.label} is required`)
          : Yup.string().trim().nullable(),
        organization_name: orgMeta.required
          ? Yup.string().trim().required(`${orgMeta.label} is required`)
          : Yup.string().trim().nullable(),
        email: emailMeta.required
          ? Yup.string().trim().required(`${emailMeta.label} is required`).email("Enter a valid email address")
          : Yup.string().trim().email("Enter a valid email address").nullable(),
        phone_no: phoneMeta.required
          ? Yup.string().trim().required(`${phoneMeta.label} is required`).matches(INDIAN_PHONE_REGEX, "Enter a valid 10-digit Indian phone number")
          : Yup.string().trim().nullable(),
        person_name: personMeta.required
          ? Yup.string().trim().required(`${personMeta.label} is required`)
          : Yup.string().trim().nullable(),
        person_designation: desigMeta.required
          ? Yup.string().trim().required(`${desigMeta.label} is required`)
          : Yup.string().trim().nullable(),
        captcha: Yup.string().trim().required("Captcha code is required"),
      };

      // Check custom fields required validation
      customBasicFields.forEach(cf => {
        const k = cf.db_field || cf.column_name || cf.name || cf.id;
        if (cf.required) {
          shape[k] = Yup.string().trim().required(`${cf.label || k} is required`);
        }
      });

      const schema = Yup.object().shape(shape);
      await schema.validate(formData, { abortEarly: false });

      if (formData.captcha.toUpperCase() !== captcha.toUpperCase()) {
        setErrors({ captcha: "Invalid captcha code" });
        setCaptcha(generateCaptcha());
        setFormData((prev) => ({ ...prev, captcha: "" }));
        return false;
      }

      setErrors({});
      return true;
    } catch (yupErr) {
      if (yupErr.inner) {
        const errs = {};
        yupErr.inner.forEach((err) => {
          if (err.path && !errs[err.path]) {
            errs[err.path] = err.message;
          }
        });

        if (formData.captcha && formData.captcha.toUpperCase() !== captcha.toUpperCase()) {
          errs.captcha = "Invalid captcha code";
          setCaptcha(generateCaptcha());
          setFormData((prev) => ({ ...prev, captcha: "" }));
        }

        setErrors(errs);
      }
      return false;
    }
  };

  const handleRegisterSubmit = async () => {
    const isValid = await validateStep1();
    if (!isValid) return;

    // Read fresh from settings at call time (avoids stale closure)
    const skipOtp =
      settings?.skip_ngo_otp_verification === "true" ||
      settings?.skip_ngo_otp_verification === true;

    try {
      setLoading(true);
      const res = await publicHttpClient.post("/auth/ngo/register", {
        darpan_no: (formData.darpan_no || formData.csr_registration_number || "").trim(),
        csr_registration_number: (formData.csr_registration_number || formData.darpan_no || "").trim(),
        darpan_link: (formData.darpan_link || formData.website || "").trim(),
        website: (formData.website || formData.darpan_link || "").trim(),
        organization_name: (formData.organization_name || formData.name_of_the_organization || "").trim(),
        name_of_the_organization: (formData.name_of_the_organization || formData.organization_name || "").trim(),
        email: (formData.email || formData.primary_email || "").trim(),
        primary_email: (formData.primary_email || formData.email || "").trim(),
        phone_no: (formData.phone_no || formData.contact || "").trim(),
        contact: (formData.contact || formData.phone_no || "").trim(),
        person_name: (formData.person_name || formData.name || "").trim(),
        name: (formData.name || formData.person_name || "").trim(),
        person_designation: (formData.person_designation || formData.designation || "").trim(),
        designation: (formData.designation || formData.person_designation || "").trim(),
        address: (formData.address || "").trim(),
        permanent_address: (formData.permanent_address || "").trim(),
        skip_otp: skipOtp,
        ...formData,
      });

      if (res.data?.success) {
        setRegistrationId(res.data.registration_id);
        toast.success(res.data.message || "Registration submitted!");

        if (res.data.verified || skipOtp) {
          // OTP was bypassed / skipped by admin setting
          setStep(3);
        } else {
          // Proceed to OTP verification step
          setStep(2);
        }
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors) {
        setErrors(resp.errors);
      }
      toast.error(resp?.message || "Registration failed. Please check the entered details.");
      setCaptcha(generateCaptcha());
      setFormData((prev) => ({ ...prev, captcha: "" }));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otp || formData.otp.length < 6) {
      setErrors({ otp: "Please enter the complete 6-digit OTP" });
      return;
    }

    try {
      setLoading(true);
      const res = await publicHttpClient.post("/auth/ngo/verify-otp", {
        registration_id: registrationId,
        email: (formData.email || formData.primary_email || "").trim(),
        otp: formData.otp.trim(),
      });

      if (res.data?.success) {
        toast.success("Email verified successfully!");
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
      const res = await publicHttpClient.post("/auth/ngo/resend-otp", {
        registration_id: registrationId,
        email: (formData.email || formData.primary_email || "").trim(),
      });
      if (res.data?.success) {
        toast.success(res.data.message || "New OTP code sent to your email.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  const siteName = settings?.site_name || "CSR Portal";
  const siteDescription = settings?.ngo_register_left_desc || settings?.login_desc || settings?.site_description || settings?.site_meta_description ||
    "Welcome to the Corporate Social Responsibility portal. Register your NGO to partner with corporate donors, participate in CSR initiatives, and access grant opportunities.";
  const tagline = settings?.login_tagline || (settings?.site_name ? settings.site_name.toUpperCase() : "TECH CSR");
  const leftTitle = settings?.ngo_register_left_title || "NGO Partner Onboarding";
  const formTitle = settings?.ngo_register_form_title || "NGO Partner Registration";
  const formSub = settings?.ngo_register_form_sub || "Fill in your organization details to begin partnership onboarding";
  const btnText = settings?.ngo_register_btn_text || "Register as NGO Partner";
  const step1Text = settings?.ngo_register_step1_text || "Enter Darpan & contact credentials";
  const step2Text = settings?.ngo_register_step2_text || "Verify official email address";
  const step3Text = settings?.ngo_register_step3_text || "Manager review & credentials dispatch";

  const securityBadgeText = settings?.login_security_badge_text || "Protected by Enterprise Security";
  const showBubbles = settings?.login_show_bubbles !== "false" && settings?.login_show_bubbles !== false;
  const logoBadgeStyle = settings?.login_logo_badge_style || "curve";
  const bubble1 = settings?.login_bubble1_title || "CSR Impact\nAssessment";
  const bubble1Icon = settings?.login_bubble1_icon || "leaf";
  const bubble2 = settings?.login_bubble2_title || "CSR\nCompliance";
  const bubble2Icon = settings?.login_bubble2_icon || "shield";
  const bubble3 = settings?.login_bubble3_title || "CSR\nStrategy";
  const bubble3Icon = settings?.login_bubble3_icon || "strategy";
  const bubble4 = settings?.login_bubble4_title || "Corporate\nVolunteering";
  const bubble4Icon = settings?.login_bubble4_icon || "hands";

  const currentYear = new Date().getFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const logoSrc = getSettingUrl(settings?.site_logo) || `${baseUrl}/assets/logo/TechCSR Logo.png`;
  const bgImgSrc = settings?.login_bg_image ? getSettingUrl(settings.login_bg_image) : "";
  const leftImgSrc = settings?.login_left_image ? getSettingUrl(settings.login_left_image) : (lpLeftBg?.src || lpLeftBg);

  const isSkipOtp =
    settings?.skip_ngo_otp_verification === "true" ||
    settings?.skip_ngo_otp_verification === true;

  const stepsList = isSkipOtp
    ? [
        { num: 1, title: step1Text, active: step === 1, done: step > 1 },
        { num: 2, title: step3Text, active: step > 1, done: false },
      ]
    : [
        { num: 1, title: step1Text, active: step === 1, done: step > 1 },
        { num: 2, title: step2Text, active: step === 2, done: step > 2 },
        { num: 3, title: step3Text, active: step === 3, done: false },
      ];

  // Dynamic meta for fields
  const darpanMeta = getFieldMeta(["darpan_no", "csr_registration_number"], "Darpan No", "Enter Darpan Number", true);
  const linkMeta = getFieldMeta(["darpan_link", "website"], "NGO Darpan Link", "Enter NGO Darpan link", false);
  const orgMeta = getFieldMeta(["organization_name", "name_of_the_organization"], "Organization Name", "Enter organization name", true);
  const emailMeta = getFieldMeta(["email", "primary_email"], "Email", "Enter valid email id", true);
  const phoneMeta = getFieldMeta(["phone_no", "contact"], "Phone No", "Enter valid Phone no", true);
  const personMeta = getFieldMeta(["person_name", "name"], "Person Name", "Enter the person's name", true);
  const desigMeta = getFieldMeta(["person_designation", "designation"], "Person Designation", "Enter person Designation", true);

  return (
    <div
      className="lp-root"
      style={bgImgSrc ? { backgroundImage: `url(${bgImgSrc})` } : {}}
    >
      {/* Fullscreen background */}
      <div className="lp-bg" />

      {/* Top Left Logo Badge */}
      {logoBadgeStyle !== "hidden" && (
        <div
          className="lp-left-logo-wrap"
          style={
            logoBadgeStyle === "curve"
              ? {
                  backgroundImage: `url(${loginLogoImg?.src || loginLogoImg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundColor: "transparent",
                }
              : logoBadgeStyle === "pill"
              ? {
                  background: "#ffffff",
                  borderRadius: "0 0 20px 0",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                  padding: "12px 20px",
                  width: "auto",
                  height: "auto",
                  display: "flex",
                  alignItems: "center",
                }
              : logoBadgeStyle === "glass"
              ? {
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "0 0 20px 0",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  padding: "12px 20px",
                  width: "auto",
                  height: "auto",
                  display: "flex",
                  alignItems: "center",
                }
              : {}
          }
        >
          <img src={logoSrc} alt="Logo" className="lp-left-logo" />
        </div>
      )}

      {/* Floating background bubbles */}
      <div className="lp-bubbles" aria-hidden="true">
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
        <span className="lp-bubble" />
      </div>

      {/* Centered Split Card */}
      <div className="lp-card" style={{ width: 956, maxWidth: "96vw", minHeight: 555 }}>
        {/* LEFT PANEL — dark branding */}
        <div
          className="lp-left"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.78) 100%), url(${leftImgSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "transparent",
            width: "40%",
          }}
        >
          <div className="lp-left-body">
            <p className="lp-left-tagline">{tagline}</p>
            <h1 className="lp-left-title">{leftTitle}</h1>
            <p className="lp-left-desc">{siteDescription}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              {stepsList.map(({ num, title, active, done }) => (
                <div key={num} style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,0.92)", fontSize: 13 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: (active || done) ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
                    border: (active || done) ? "2px solid rgba(255,255,255,0.7)" : "1.5px solid rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    transition: "all 0.3s",
                  }}>{num}</div>
                  <span style={{ fontWeight: active ? 700 : 400, opacity: active ? 1 : 0.8 }}>{title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Registration Form / Steps */}
        <div className="lp-right ngo-right-panel" style={{ width: "60%", padding: "0", display: "flex", flexDirection: "column" }}>
          {/* Scrollable inner content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 36px 16px 36px", display: "flex", flexDirection: "column" }}>
            {/* Top navigation back to login */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Link
                href="/"
                style={{
                  color: "var(--primary-color, #15803d)",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(var(--primary-color-rgb, 21, 128, 61), 0.08)",
                  transition: "background 0.2s",
                }}
              >
                <ArrowLeftOutlined /> Back to Sign In
              </Link>

              {/* Step progress pills */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(isSkipOtp ? [1, 2] : [1, 2, 3]).map((s) => (
                  <div key={s} style={{
                    height: 6, borderRadius: 3,
                    width: step >= s ? 28 : 14,
                    background: step >= s ? "var(--primary-color, #15803d)" : "#e2e8f0",
                    transition: "all 0.35s ease",
                  }} />
                ))}
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginLeft: 4 }}>
                  {isSkipOtp
                    ? (step === 1 ? "1/2" : "✓")
                    : (step === 1 ? "1/3" : step === 2 ? "2/3" : "✓")}
                </span>
              </div>
            </div>

            <div className="lp-right-header" style={{ marginBottom: 12 }}>
              <h2 className="lp-sign-in-title" style={{ fontSize: 22 }}>
                {step === 1 && (formTitle || "NGO Partner Registration")}
                {step === 2 && "Verify Email Address"}
                {step === 3 && "Application Submitted"}
              </h2>
              <p className="lp-sign-in-sub" style={{ marginTop: 4 }}>
                {step === 1 && (formSub || "Fill in your organization details to begin partnership onboarding")}
                {step === 2 && `Enter the 6-digit verification OTP sent to ${formData.email}`}
                {step === 3 && "Your registration has been submitted for NGO Manager review"}
              </p>
            </div>

            {/* ── STEP 1: REGISTRATION FORM ── */}
            {step === 1 && (
              <Form layout="vertical" onFinish={handleRegisterSubmit} className="lp-form">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Darpan No & NGO Darpan Link */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                        {darpanMeta.label} {darpanMeta.required && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      <Input
                        prefix={<SafetyCertificateOutlined className="lp-input-icon" />}
                        placeholder={darpanMeta.placeholder}
                        value={formData.darpan_no || formData.csr_registration_number}
                        onChange={(e) => handleChange("darpan_no", e.target.value)}
                        className={`lp-input${errors?.darpan_no ? " lp-input-error" : ""}`}
                      />
                      {errors?.darpan_no && <div className="lp-error">{errors.darpan_no}</div>}
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                        {linkMeta.label} {linkMeta.required && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      <Input
                        prefix={<GlobalOutlined className="lp-input-icon" />}
                        placeholder={linkMeta.placeholder}
                        value={formData.darpan_link || formData.website}
                        onChange={(e) => handleChange("darpan_link", e.target.value)}
                        className="lp-input"
                      />
                      {errors?.darpan_link && <div className="lp-error">{errors.darpan_link}</div>}
                    </div>
                  </div>

                  {/* Organization Name */}
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                      {orgMeta.label} {orgMeta.required && <span style={{ color: "#ef4444" }}>*</span>}
                    </label>
                    <Input
                      prefix={<BankOutlined className="lp-input-icon" />}
                      placeholder={orgMeta.placeholder}
                      value={formData.organization_name || formData.name_of_the_organization}
                      onChange={(e) => handleChange("organization_name", e.target.value)}
                      className={`lp-input${errors?.organization_name ? " lp-input-error" : ""}`}
                    />
                    {errors?.organization_name && <div className="lp-error">{errors.organization_name}</div>}
                  </div>

                  {/* Email & Phone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                        {emailMeta.label} {emailMeta.required && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      <Input
                        prefix={<MailOutlined className="lp-input-icon" />}
                        placeholder={emailMeta.placeholder}
                        value={formData.email || formData.primary_email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={`lp-input${errors?.email ? " lp-input-error" : ""}`}
                      />
                      {errors?.email && <div className="lp-error">{errors.email}</div>}
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                        {phoneMeta.label} {phoneMeta.required && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      <Input
                        prefix={<PhoneOutlined className="lp-input-icon" />}
                        placeholder={phoneMeta.placeholder}
                        value={formData.phone_no || formData.contact}
                        onChange={(e) => handleChange("phone_no", e.target.value)}
                        className={`lp-input${errors?.phone_no ? " lp-input-error" : ""}`}
                      />
                      {errors?.phone_no && <div className="lp-error">{errors.phone_no}</div>}
                    </div>
                  </div>

                  {/* Person Name & Designation */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                        {personMeta.label} {personMeta.required && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      <Input
                        prefix={<UserOutlined className="lp-input-icon" />}
                        placeholder={personMeta.placeholder}
                        value={formData.person_name || formData.name}
                        onChange={(e) => handleChange("person_name", e.target.value)}
                        className={`lp-input${errors?.person_name ? " lp-input-error" : ""}`}
                      />
                      {errors?.person_name && <div className="lp-error">{errors.person_name}</div>}
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                        {desigMeta.label} {desigMeta.required && <span style={{ color: "#ef4444" }}>*</span>}
                      </label>
                      <Input
                        prefix={<IdcardOutlined className="lp-input-icon" />}
                        placeholder={desigMeta.placeholder}
                        value={formData.person_designation || formData.designation}
                        onChange={(e) => handleChange("person_designation", e.target.value)}
                        className={`lp-input${errors?.person_designation ? " lp-input-error" : ""}`}
                      />
                      {errors?.person_designation && <div className="lp-error">{errors.person_designation}</div>}
                    </div>
                  </div>

                  {/* Custom fields configured dynamically in Form Builder */}
                  {customBasicFields.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: customBasicFields.length > 1 ? "1fr 1fr" : "1fr", gap: 10 }}>
                      {customBasicFields.map((cf) => {
                        const fieldKey = cf.db_field || cf.column_name || cf.name || cf.id;
                        return (
                          <div key={fieldKey}>
                            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 3 }}>
                              {cf.label || fieldKey} {cf.required && <span style={{ color: "#ef4444" }}>*</span>}
                            </label>
                            {cf.type === "textarea" ? (
                              <Input.TextArea
                                placeholder={cf.ui?.placeholder || `Enter ${cf.label || fieldKey}`}
                                value={formData[fieldKey] || ""}
                                onChange={(e) => handleChange(fieldKey, e.target.value)}
                                rows={2}
                                className="lp-input"
                              />
                            ) : (
                              <Input
                                placeholder={cf.ui?.placeholder || `Enter ${cf.label || fieldKey}`}
                                value={formData[fieldKey] || ""}
                                onChange={(e) => handleChange(fieldKey, e.target.value)}
                                className={`lp-input${errors?.[fieldKey] ? " lp-input-error" : ""}`}
                              />
                            )}
                            {errors?.[fieldKey] && <div className="lp-error">{errors[fieldKey]}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Captcha */}
                  <div className="lp-captcha-row" style={{ marginTop: 0 }}>
                    <div className="lp-captcha-display">
                      <span className="lp-captcha-text">{captcha}</span>
                      <Button
                        icon={<ReloadOutlined />}
                        size="small"
                        type="text"
                        className="lp-captcha-refresh"
                        onClick={() => setCaptcha(generateCaptcha())}
                        title="Refresh captcha"
                      />
                    </div>
                    <div className="lp-captcha-input-wrap">
                      <Input
                        placeholder="Enter captcha"
                        value={formData.captcha}
                        onChange={(e) => handleChange("captcha", e.target.value)}
                        className={`lp-captcha-input${errors?.captcha ? " lp-input-error" : ""}`}
                      />
                      {errors?.captcha && <div className="lp-error">{errors.captcha}</div>}
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    htmlType="submit"
                    className="lp-btn-primary"
                    block
                    loading={loading}
                    style={{ marginTop: 4, height: 46 }}
                  >
                    {btnText}
                  </Button>
                </div>
              </Form>
            )}

            {/* ── STEP 2: OTP VERIFICATION ── */}
            {step === 2 && (
              <div className="lp-otp-section" style={{ padding: "20px 0", textAlign: "center" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: "linear-gradient(135deg, rgba(var(--primary-color-rgb, 21, 128, 61), 0.1) 0%, rgba(var(--primary-color-rgb, 21, 128, 61), 0.04) 100%)",
                    color: "var(--primary-color, #15803d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    margin: "0 auto 16px auto",
                    border: "1.5px solid rgba(var(--primary-color-rgb, 21, 128, 61), 0.2)",
                    boxShadow: "0 4px 16px rgba(var(--primary-color-rgb, 21, 128, 61), 0.12)",
                  }}
                >
                  <MailOutlined />
                </div>

                <p style={{ color: "#475569", fontSize: 13.5, marginBottom: 20, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 20px auto" }}>
                  Enter the 6-digit OTP code sent to <strong style={{ color: "#0f172a" }}>{formData.email}</strong>
                </p>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <Input.OTP
                    inputMode="numeric"
                    pattern="[0-9]*"
                    formatter={(str) => str.replace(/\D/g, "")}
                    length={6}
                    size="large"
                    value={formData.otp}
                    onChange={(val) => handleChange("otp", val)}
                  />
                </div>
                {errors?.otp && <div className="lp-error" style={{ marginBottom: 10 }}>{errors.otp}</div>}

                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
                  <Button
                    loading={resendLoading}
                    type="default"
                    onClick={handleResendOtp}
                    style={{ borderRadius: 8, height: 42, fontWeight: 600 }}
                  >
                    Resend OTP
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleVerifyOtp}
                    loading={loading}
                    className="lp-btn-primary"
                    style={{ height: 42, padding: "0 28px" }}
                  >
                    Verify &amp; Continue
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: SUCCESS ── */}
            {step === 3 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #d1fae5 0%, #f0fdf4 100%)",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    margin: "0 auto 18px auto",
                    boxShadow: "0 4px 20px rgba(22, 163, 74, 0.25)",
                  }}
                >
                  <CheckCircleFilled />
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                  Account Verified &amp; Created!
                </h3>

                <p style={{ color: "#475569", fontSize: 13.5, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 20px auto" }}>
                  Your organization <strong>{formData.organization_name}</strong> (Darpan ID: {formData.darpan_no}) has been registered and verified.
                </p>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "16px 20px",
                    textAlign: "left",
                    maxWidth: 440,
                    margin: "0 auto 24px auto",
                    fontSize: 13,
                    color: "#334155",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <FileProtectOutlined style={{ color: "var(--primary-color, #15803d)", fontSize: 20, marginTop: 2 }} />
                    <div>
                      <strong style={{ fontSize: 13.5 }}>Login Credentials Sent via Email</strong>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
                        Your official <strong>User ID (Email)</strong> and <strong>Temporary Password</strong> have been sent to <strong>{formData.email}</strong>. You can now sign in to complete your detailed NGO profile.
                      </div>
                    </div>
                  </div>
                </div>

                <Link href="/">
                  <Button
                    className="lp-btn-primary"
                    style={{ height: 46, padding: "0 40px", fontWeight: 700 }}
                  >
                    Proceed to Sign In
                  </Button>
                </Link>
              </div>
            )}

            {/* Footer Badge */}
            <div className="lp-right-footer" style={{ marginTop: "auto", paddingTop: 16 }}>
              <FaShieldAlt style={{ color: "var(--primary-color, #15803d)", marginRight: 6 }} />
              <span style={{ color: "var(--primary-color, #15803d)", fontSize: 12, fontWeight: 500 }}>
                {securityBadgeText}
              </span>
            </div>
          </div>{/* end scrollable inner */}
        </div>
      </div>

      {/* Floating Right Side CSR Bubbles */}
      {showBubbles && (
        <div className="login-right-bubbles">
          <div className="csr-service-bubble bubble-1">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble1Icon, "leaf")}
            </span>
            <p style={{ whiteSpace: "pre-line" }}>{bubble1}</p>
          </div>

          <div className="csr-service-bubble bubble-2">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble2Icon, "shield")}
            </span>
            <p style={{ whiteSpace: "pre-line" }}>{bubble2}</p>
          </div>

          <div className="csr-service-bubble bubble-3">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble3Icon, "strategy")}
            </span>
            <p style={{ whiteSpace: "pre-line" }}>{bubble3}</p>
          </div>

          <div className="csr-service-bubble bubble-4">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble4Icon, "hands")}
            </span>
            <p style={{ whiteSpace: "pre-line" }}>{bubble4}</p>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="lp-footer">
        <p className="m-0">
          {(() => {
            const raw = settings?.footer_text;
            if (raw) {
              const match = raw.match(/^(.*?)\[(.*?)\]\((.*?)\)(.*)$/);
              if (match) {
                return (
                  <>
                    {match[1]}
                    <Link href={match[3]} target="_blank" rel="noopener noreferrer">
                      {match[2]}
                    </Link>
                    {match[4]}
                  </>
                );
              }
              if (raw.includes("TechCSR")) {
                const parts = raw.split("TechCSR");
                return (
                  <>
                    {parts[0]}
                    <Link href="https://techcsr.com/" target="_blank" rel="noopener noreferrer">
                      TechCSR
                    </Link>
                    {parts.slice(1).join("TechCSR")}
                  </>
                );
              }
              return raw;
            }
            return (
              <>
                Copyright &copy; {currentYear} {siteName}. All rights reserved. <span>|</span> Powered by{" "}
                <Link href="https://techcsr.com/" target="_blank" rel="noopener noreferrer">
                  TechCSR
                </Link>
              </>
            );
          })()}
        </p>
      </footer>
    </div>
  );
}
