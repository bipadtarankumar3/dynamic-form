import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Form, Typography, Tag, Tooltip, App } from "antd";
import {
  BankOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  IdcardOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import * as Yup from "yup";
import { publicHttpClient } from "@/services/api/httpClient";
import { publicFormSchemaAPI } from "@/services/dynamicForm-service";
import { toast } from "react-toastify";
import { useSettings } from "@/context/SettingsContext";

const { Title, Text, Paragraph } = Typography;

const generateCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function NgoRegisterModal({ visible, onClose, onRegistered }) {
  const { settings } = useSettings();
  const isSkipOtp =
    settings?.skip_ngo_otp_verification === "true" ||
    settings?.skip_ngo_otp_verification === true;

  const [step, setStep] = useState(1); // 1: Form, 2: OTP, 3: Success
  const [loading, setLoading] = useState(false);
  const [formSchema, setFormSchema] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [errors, setErrors] = useState({});
  const [registrationId, setRegistrationId] = useState(null);

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

  useEffect(() => {
    let isMounted = true;
    async function loadFormBuilderSchema() {
      try {
        const res = await publicFormSchemaAPI({ form_slug: "implementation_partner" });
        if (isMounted && res?.data?.success && res?.data?.data) {
          setFormSchema(res.data.data);
        }
      } catch (err) {
        // use defaults
      }
    }
    if (visible) {
      loadFormBuilderSchema();
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleChange = (field, val) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: val };
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

  const ngoRegistrationSchema = Yup.object().shape({
    darpan_no: Yup.string().trim().required("Darpan Number is required"),
    darpan_link: Yup.string().trim().nullable(),
    organization_name: Yup.string().trim().required("Organization name is required"),
    email: Yup.string()
      .trim()
      .required("Email is required")
      .email("Enter a valid email address"),
    phone_no: Yup.string()
      .trim()
      .required("Phone number is required")
      .matches(
        INDIAN_PHONE_REGEX,
        "Enter a valid 10-digit Indian phone number (starts with 6, 7, 8, or 9)"
      ),
    person_name: Yup.string().trim().required("Contact person name is required"),
    person_designation: Yup.string().trim().required("Person designation is required"),
    captcha: Yup.string().trim().required("Captcha code is required"),
  });

  const validateStep1 = async () => {
    try {
      await ngoRegistrationSchema.validate(formData, { abortEarly: false });

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
          // OTP was skipped by admin setting
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
        email: formData.email.trim(),
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
        email: formData.email.trim(),
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

  const handleModalClose = () => {
    setStep(1);
    setErrors({});
    setFormData({
      darpan_no: "",
      darpan_link: "",
      organization_name: "",
      email: "",
      phone_no: "",
      person_name: "",
      person_designation: "",
      captcha: "",
      otp: "",
    });
    setCaptcha(generateCaptcha());
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={640}
      centered
      destroyOnHidden
      styles={{
        content: {
          borderRadius: 16,
          padding: 0,
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      {/* Top Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
          padding: "24px 28px",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <BankOutlined />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.3px" }}>
              {settings?.ngo_register_form_title || "NGO Partner Registration"}
            </h2>
            <div style={{ fontSize: 13, color: "#dcfce7", marginTop: 2 }}>
              {settings?.ngo_register_form_sub || "Join the TechCSR Partner Network & Access CSR Grant Opportunities"}
            </div>
          </div>
        </div>

        <Tag
          color="green"
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            fontWeight: 700,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {isSkipOtp
            ? step === 1
              ? "Step 1 of 2"
              : "Completed"
            : step === 1
            ? "Step 1 of 3"
            : step === 2
            ? "Step 2 of 3"
            : "Completed"}
        </Tag>
      </div>

      {/* Main Form Body */}
      <div style={{ padding: "28px 32px" }}>
        {/* ── STEP 1: REGISTRATION FIELDS ── */}
        {step === 1 && (
          <Form layout="vertical" onFinish={handleRegisterSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Row 1: Darpan No & Darpan Link */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Form.Item
                  label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Darpan No <span style={{ color: "#ef4444" }}>*</span></span>}
                  validateStatus={errors.darpan_no ? "error" : ""}
                  help={errors.darpan_no}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<SafetyCertificateOutlined style={{ color: "#9ca3af", marginRight: 4 }} />}
                    placeholder="Enter Darpan Number (e.g. DL/2023/0123456)"
                    value={formData.darpan_no}
                    onChange={(e) => handleChange("darpan_no", e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>NGO Darpan Link</span>}
                  validateStatus={errors.darpan_link ? "error" : ""}
                  help={errors.darpan_link}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<GlobalOutlined style={{ color: "#9ca3af", marginRight: 4 }} />}
                    placeholder="Enter NGO Darpan link (URL)"
                    value={formData.darpan_link}
                    onChange={(e) => handleChange("darpan_link", e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Form.Item>
              </div>

              {/* Row 2: Organization Name */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Organization Name <span style={{ color: "#ef4444" }}>*</span></span>}
                validateStatus={errors.organization_name ? "error" : ""}
                help={errors.organization_name}
                style={{ marginBottom: 0 }}
              >
                <Input
                  prefix={<BankOutlined style={{ color: "#9ca3af", marginRight: 4 }} />}
                  placeholder="Enter organization name"
                  value={formData.organization_name}
                  onChange={(e) => handleChange("organization_name", e.target.value)}
                  style={{ borderRadius: 8, height: 40 }}
                />
              </Form.Item>

              {/* Row 3: Email & Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Form.Item
                  label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Official Email <span style={{ color: "#ef4444" }}>*</span></span>}
                  validateStatus={errors.email ? "error" : ""}
                  help={errors.email}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: "#9ca3af", marginRight: 4 }} />}
                    placeholder="Enter valid email id"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Phone No <span style={{ color: "#ef4444" }}>*</span></span>}
                  validateStatus={errors.phone_no ? "error" : ""}
                  help={errors.phone_no}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: "#9ca3af", marginRight: 4 }} />}
                    placeholder="e.g. 9876543210 or +91 9876543210"
                    value={formData.phone_no}
                    maxLength={15}
                    onChange={(e) => handleChange("phone_no", e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Form.Item>
              </div>

              {/* Row 4: Person Name & Designation */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Form.Item
                  label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Person Name <span style={{ color: "#ef4444" }}>*</span></span>}
                  validateStatus={errors.person_name ? "error" : ""}
                  help={errors.person_name}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: "#9ca3af", marginRight: 4 }} />}
                    placeholder="Enter the person's name"
                    value={formData.person_name}
                    onChange={(e) => handleChange("person_name", e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontWeight: 700, fontSize: 13, color: "#374151" }}>Person Designation <span style={{ color: "#ef4444" }}>*</span></span>}
                  validateStatus={errors.person_designation ? "error" : ""}
                  help={errors.person_designation}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    prefix={<IdcardOutlined style={{ color: "#9ca3af", marginRight: 4 }} />}
                    placeholder="Enter person Designation"
                    value={formData.person_designation}
                    onChange={(e) => handleChange("person_designation", e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Form.Item>
              </div>

              {/* Captcha Verification */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                    padding: "8px 16px",
                    borderRadius: 8,
                    letterSpacing: 4,
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#1e293b",
                    fontFamily: "monospace",
                    userSelect: "none",
                    border: "1px dashed #cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{captcha}</span>
                  <Tooltip title="Refresh captcha">
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => setCaptcha(generateCaptcha())}
                      style={{ color: "#64748b" }}
                    />
                  </Tooltip>
                </div>

                <div style={{ flex: 1 }}>
                  <Input
                    placeholder="Enter captcha code"
                    value={formData.captcha}
                    onChange={(e) => handleChange("captcha", e.target.value)}
                    style={{
                      borderRadius: 8,
                      height: 40,
                      borderColor: errors.captcha ? "#ef4444" : undefined,
                    }}
                  />
                  {errors.captcha && (
                    <div style={{ color: "#ef4444", fontSize: 12, marginTop: 2 }}>{errors.captcha}</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                <Button onClick={handleModalClose} style={{ borderRadius: 8, height: 40, fontWeight: 600 }}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<ArrowRightOutlined />}
                  style={{
                    background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                    borderColor: "#15803d",
                    borderRadius: 8,
                    height: 40,
                    padding: "0 24px",
                    fontWeight: 700,
                  }}
                >
                  {settings?.ngo_register_btn_text || "Register as NGO"}
                </Button>
              </div>
            </div>
          </Form>
        )}

        {/* ── STEP 2: OTP VERIFICATION ── */}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "#f0fdf4",
                color: "#15803d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                margin: "0 auto 16px auto",
                border: "1px solid #bbf7d0",
              }}
            >
              <MailOutlined />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>
              Verify Official Email
            </h3>
            <p style={{ color: "#64748b", fontSize: 13.5, maxWidth: 420, margin: "0 auto 24px auto" }}>
              We've sent a 6-digit verification code to <strong>{formData.email}</strong>. Enter it below to proceed.
            </p>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <Input.OTP
                length={6}
                size="large"
                value={formData.otp}
                onChange={(val) => handleChange("otp", val)}
              />
            </div>

            {errors.otp && (
              <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 14 }}>{errors.otp}</div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 24 }}>
              <Button
                type="dashed"
                onClick={handleResendOtp}
                loading={resendLoading}
                style={{ borderRadius: 8, height: 40, fontWeight: 600 }}
              >
                Resend OTP
              </Button>
              <Button
                type="primary"
                onClick={handleVerifyOtp}
                loading={loading}
                icon={<CheckCircleFilled />}
                style={{
                  background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                  borderColor: "#15803d",
                  borderRadius: 8,
                  height: 40,
                  padding: "0 28px",
                  fontWeight: 700,
                }}
              >
                Verify &amp; Continue
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SUCCESS & ONBOARDING PROMPT ── */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                margin: "0 auto 16px auto",
                boxShadow: "0 4px 14px rgba(22, 163, 74, 0.2)",
              }}
            >
              <CheckCircleFilled />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
              Registration Verified Successfully!
            </h3>

            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 20px auto" }}>
              Your application for <strong>{formData.organization_name}</strong> (Darpan ID: {formData.darpan_no}) has been recorded.
            </p>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "16px 20px",
                textAlign: "left",
                maxWidth: 480,
                margin: "0 auto 24px auto",
                fontSize: 13,
                color: "#334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <FileProtectOutlined style={{ color: "#15803d", fontSize: 16, marginTop: 2 }} />
                <div>
                  <strong>Next Step: NGO Manager &amp; Due Diligence Review</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    Your details are sent to the NGO Manager. Upon final approval, your official login credentials (User ID &amp; Password) will be emailed to <strong>{formData.email}</strong>.
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              onClick={handleModalClose}
              style={{
                background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                borderColor: "#15803d",
                borderRadius: 8,
                height: 44,
                padding: "0 36px",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
              }}
            >
              Done / Return to Login
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
