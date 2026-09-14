import { LockOutlined, MailOutlined, ReloadOutlined, SafetyOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { FaKey, FaShieldAlt } from "react-icons/fa";
import { getBubbleIconComponent } from "@/utils/bubbleIcons";
import { useNavigate } from "@/hooks/useNextRouter";
import "@/assets/css/csr-services.css";
import "@/assets/css/login/right-bubbles.css";
import * as Yup from "yup";
import { publicHttpClient } from "@/services/api/httpClient";
import authUtils from "@/utils/authUtils";
import FPModal from "./FPModal";
import NgoRegisterModal from "./NgoRegisterModal";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "react-toastify";
import loginLogoImg from "../../assets/images/backgrounds/login-logo-bg.png";
import lpLeftBg from "../../assets/images/backgrounds/left-side-img.jpg";
import Image from "next/image";
import Link from "next/link";
// import loginImgRight from "../../assets/images/backgrounds/login-img-right.png";
// import loginImgLeft from "../../assets/images/backgrounds/login-img-left.png";

const SchemaFN = (data) => {
  return Yup.object().shape({
    email: Yup.string().trim().required("Email is required"),
    password: Yup.string().trim().required("Password is required"),
    ...(data?.type === "otp_verify" && {
      otp: Yup.string().required("Please enter OTP"),
    }),
  });
};

const generateCaptcha = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let captcha = "";
  for (let i = 0; i < 6; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
};

const LoginPage = () => {
  const { settings, getSettingUrl } = useSettings();
  const navigate = useNavigate();
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isOpenFPModal, setIsOpenFPModal] = useState(false);
  const [isOpenNgoModal, setIsOpenNgoModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    captcha: "",
    type: "email_verify",
    otp: "",
    token: "",
  });

  const handleChange = (name, value) => {
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleValidation = async (data) => {
    try {
      const schema = SchemaFN(data);
      await schema.validate(data, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      if (err.inner) {
        const formattedErrors = err.inner.reduce((acc, curr) => {
          acc[curr.path] = curr.message;
          return acc;
        }, {});
        setErrors(formattedErrors);
      }
      return false;
    }
  };

  const handleSubmit = async ({ resend_otp = false } = {}) => {
    if (!resend_otp) {
      const isValid = await handleValidation(formData);
      if (!isValid) return;
    }
    if (!formData.captcha && formData.type === "email_verify") {
      setErrors((prev) => ({ ...prev, captcha: "Captcha is required" }));
      return;
    } else if (formData.captcha !== captcha && formData.type === "email_verify" && !resend_otp) {
      setErrors((prev) => ({ ...prev, captcha: "Invalid Captcha!!" }));
      setCaptcha(generateCaptcha());
      setFormData((prev) => ({ ...prev, captcha: "" }));
      return;
    }
    if (resend_otp) setResendLoading(true);
    else setLoading(true);

    try {
      const response = await publicHttpClient.post("/auth/login", {
        ...formData,
        ...(resend_otp && { type: "email_verify" }),
      });
      const { token, type, is_first_login } = response.data;
      const status = response.status;
      if (status === 200 && type === "otp_verify") {
        setFormData((prev) => ({ ...prev, token, type }));
      } else if ((status === 200 || status === 201) && type === "login_success") {
        authUtils.saveToken(token);
        // Store first-login flag for NGO users before redirect
        if (is_first_login) {
          sessionStorage.setItem("ngo_is_first_login", "1");
        } else {
          sessionStorage.removeItem("ngo_is_first_login");
        }
        try {
          const decoded = jwtDecode(token);
          if (decoded?.role_slug === "configurator") {
            navigate("/configurator/dashboard");
          } else if (
            decoded?.role_slug === "admin" ||
            decoded?.role_slug === "super_admin" ||
            String(decoded?.role_name || "").toLowerCase().includes("admin")
          ) {
            navigate("/admin/dashboard");
          } else if (decoded?.isConfigurator === true) {
            navigate("/configurator/dashboard");
          } else if (
            decoded?.role_slug === "ngo" ||
            decoded?.role?.slug === "ngo" ||
            String(decoded?.role_name || "").toLowerCase().includes("ngo")
          ) {
            navigate("/ngo/dashboard");
          } else {
            navigate("/admin/dashboard");
          }
        } catch {
          navigate("/admin/dashboard");
        }
      }
      toast.success(response?.data?.message);
    } catch (error) {
      setCaptcha(generateCaptcha());
      setFormData((prev) => ({ ...prev, captcha: "" }));
      const { status, data } = error?.response || {};
      if (status === 400) setErrors(data?.errors);
      else if (status === 404 || status === 429 || status === 401) toast.error(data?.message);
    } finally {
      setLoading(false);
      setResendLoading(false);
    }
  };

  const siteName = settings?.site_name || "CSR Portal";
  const siteDescription = settings?.login_desc || settings?.site_description || settings?.site_meta_description ||
    "Welcome to the centralized Corporate Social Responsibility management platform. Sign in to manage projects, budgets, and measure community impact effortlessly.";
  const tagline = settings?.login_tagline || (settings?.site_name ? settings.site_name.toUpperCase() : "TECT CSR");
  const leftTitle = settings?.login_title || siteName;
  const signinTitle = settings?.login_signin_title || "Sign In";
  const signinSub = settings?.login_signin_sub || "Secure access to your CSR dashboard";
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

  // SSO & Auth Mode settings
  const loginAuthMode = settings?.login_auth_mode || "standard"; // "standard" | "sso_first" | "sso_only" | "both"
  const ssoProviderType = settings?.sso_provider_type || "microsoft"; // "microsoft" | "google" | "okta" | "saml"
  const ssoButtonText = settings?.sso_button_text || "Sign in with Microsoft 365";
  const ssoLoginUrl = settings?.sso_login_url || "/api/v1/auth/sso";
  const [ssoActiveView, setSsoActiveView] = useState("sso"); // "sso" | "email"

  const handleSsoLogin = () => {
    if (ssoLoginUrl && ssoLoginUrl !== "#" && ssoLoginUrl !== "/api/v1/auth/sso") {
      window.location.href = ssoLoginUrl;
    } else {
      toast.info(`Connecting to ${ssoButtonText}...`);
    }
  };

  const renderSsoIcon = (provider, size = 18) => {
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

  const currentYear = new Date().getFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const logoSrc = getSettingUrl(settings?.site_logo) || `${baseUrl}/assets/logo/TechCSR Logo.png`;
  const bgImgSrc = settings?.login_bg_image ? getSettingUrl(settings.login_bg_image) : '';
  const leftImgSrc = settings?.login_left_image ? getSettingUrl(settings.login_left_image) : (lpLeftBg?.src || lpLeftBg);

  return (
    <div
      className="lp-root"
      style={bgImgSrc ? { backgroundImage: `url(${bgImgSrc})` } : {}}
    >
      {/* Fullscreen background */}
      <div className="lp-bg" />
      
      {logoBadgeStyle !== "hidden" && (
        <div
          className="lp-left-logo-wrap"
          style={
            logoBadgeStyle === "curve"
              ? {
                  backgroundImage: `url(${loginLogoImg?.src || loginLogoImg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: 'transparent'
                }
              : logoBadgeStyle === "pill"
              ? {
                  background: '#ffffff',
                  borderRadius: '0 0 20px 0',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  padding: '12px 20px',
                  width: 'auto',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center'
                }
              : logoBadgeStyle === "glass"
              ? {
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '0 0 20px 0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  padding: '12px 20px',
                  width: 'auto',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center'
                }
              : {}
          }
        >
          <img src={logoSrc} alt="Logo" className="lp-left-logo" />
        </div>
      )}

      {/* Floating bubbles */}
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

      {/* Centered card */}
      <div className="lp-card">

        {/* LEFT PANEL — dark branding */}
        <div
          className="lp-left"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.67) 100%), url(${leftImgSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "transparent",
          }}
        >
          <div className="lp-left-body">
            <p className="lp-left-tagline">{tagline}</p>
            <h1 className="lp-left-title">{leftTitle}</h1>
            <p className="lp-left-desc">{siteDescription}</p>
          </div>
        </div>

        {/* RIGHT PANEL — white form */}
        <div className="lp-right">
          <div className="lp-right-header">
            <h2 className="lp-sign-in-title">{signinTitle}</h2>
            <p className="lp-sign-in-sub">{signinSub}</p>
          </div>

          {/* SSO ONLY MODE */}
          {loginAuthMode === "sso_only" && (
            <div className="lp-sso-container">
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, textAlign: "center" }}>
                Sign in with your centralized enterprise identity provider:
              </div>
              <button
                type="button"
                onClick={handleSsoLogin}
                className="lp-sso-btn"
              >
                {renderSsoIcon(ssoProviderType, 20)}
                <span>{ssoButtonText}</span>
              </button>
            </div>
          )}

          {/* SSO FIRST MODE - SSO PRIMARY VIEW */}
          {loginAuthMode === "sso_first" && ssoActiveView === "sso" && (
            <div className="lp-sso-container">
              <button
                type="button"
                onClick={handleSsoLogin}
                className="lp-sso-btn lp-sso-btn-primary"
              >
                {renderSsoIcon(ssoProviderType, 20)}
                <span>{ssoButtonText}</span>
              </button>

              <div className="lp-auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                onClick={() => setSsoActiveView("email")}
                className="lp-switch-mode-btn"
              >
                <MailOutlined style={{ fontSize: 15 }} />
                <span>Sign in with Username & Password</span>
              </button>
            </div>
          )}

          {/* FORM (STANDARD, BOTH, OR SSO_FIRST TOGGLED TO EMAIL) */}
          {(loginAuthMode === "standard" ||
            loginAuthMode === "both" ||
            (loginAuthMode === "sso_first" && ssoActiveView === "email")) && (
            <Form name="login" onFinish={handleSubmit} layout="vertical" className="lp-form">
              {/* Back to SSO Button in SSO First mode */}
              {loginAuthMode === "sso_first" && ssoActiveView === "email" && (
                <button
                  type="button"
                  onClick={() => setSsoActiveView("sso")}
                  className="lp-back-to-sso"
                >
                  ← Back to Single Sign-On
                </button>
              )}

              {/* In Hybrid / Both mode, show SSO Button at top */}
              {loginAuthMode === "both" && (
                <div style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={handleSsoLogin}
                    className="lp-sso-btn"
                  >
                    {renderSsoIcon(ssoProviderType, 18)}
                    <span>{ssoButtonText}</span>
                  </button>
                  <div className="lp-auth-divider">
                    <span>or continue with email</span>
                  </div>
                </div>
              )}

              {/* OTP Mode */}
              {formData.type === "otp_verify" && (
                <div className="lp-otp-section">
                  <div className="lp-section-label">Enter the 6-digit OTP sent to your email</div>
                  <div className="flex justify-end mb-2">
                    <Button loading={resendLoading} size="small" type="dashed" onClick={() => handleSubmit({ resend_otp: true })}>
                      Resend OTP
                    </Button>
                  </div>
                  <div className="flex flex-col items-center justify-center w-full mb-3">
                    <Input.OTP
                      inputMode="numeric"
                      pattern="[0-9]*"
                      formatter={(str) => str.replace(/\D/g, "")}
                      length={6}
                      size="large"
                      value={formData.otp}
                      onChange={(e) => handleChange("otp", e)}
                    />
                    {errors?.otp && <div className="lp-error">{errors.otp}</div>}
                  </div>
                  <Button htmlType="submit" className="lp-btn-primary" block loading={loading}>
                    Verify &amp; Login
                  </Button>
                </div>
              )}

              {/* Email+Password Mode */}
              {formData.type === "email_verify" && (
                <>
                  {/* Email */}
                  <div style={{ marginBottom: 14 }}>
                    <Form.Item name="email" style={{ marginBottom: 0 }} label={<span style={{ fontWeight: 700, color: '#374151', fontSize: 13 }}>User Name</span>}>
                      <Input
                        prefix={<MailOutlined className="lp-input-icon" />}
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="lp-input"
                      />
                    </Form.Item>
                    {errors?.email && <div className="lp-error" style={{ marginTop: 4 }}>{errors.email}</div>}
                  </div>

                  {/* Password */}
                  <div style={{ marginBottom: 14 }}>
                    <Form.Item name="password" style={{ marginBottom: 0 }} label={<span style={{ fontWeight: 700, color: '#374151', fontSize: 13 }}>Password</span>}>
                      <Input.Password
                        prefix={<LockOutlined className="lp-input-icon" />}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        visibilityToggle={{ visible: showPassword, onVisibleChange: setShowPassword }}
                        className="lp-input"
                      />
                    </Form.Item>
                    {errors?.password && <div className="lp-error" style={{ marginTop: 4 }}>{errors.password}</div>}
                  </div>

                  {/* Captcha */}
                  <div className="lp-captcha-row">
                    <div className="lp-captcha-display">
                      <span className="lp-captcha-text">{captcha}</span>
                      <Button
                        icon={<ReloadOutlined />}
                        size="small"
                        type="text"
                        className="lp-captcha-refresh"
                        onClick={() => setCaptcha(generateCaptcha())}
                      />
                    </div>
                    <div className="lp-captcha-input-wrap">
                      <Input
                        placeholder="Enter captcha"
                        value={formData.captcha}
                        onChange={(e) => handleChange("captcha", e.target.value)}
                        className="lp-captcha-input"
                      />
                      {errors?.captcha && <div className="lp-error">{errors.captcha}</div>}
                    </div>
                  </div>

                  {/* Form Meta Row: Access Error + Forgot Password */}
                  <div className="lp-form-meta">
                    <div>{errors?.access_error && <span className="lp-error">{errors.access_error}</span>}</div>
                    <span className="lp-forgot" onClick={() => setIsOpenFPModal(true)}>
                      <FaKey style={{ marginRight: 5, fontSize: 12 }} /> Forgot Password?
                    </span>
                  </div>

                  {/* Submit */}
                  <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
                    <Button htmlType="submit" className="lp-btn-primary" block loading={loading}>
                      Login
                    </Button>
                  </Form.Item>

                  {/* Bottom NGO Partner Prompt Link */}
                  {(settings?.allow_ngo_registration !== "false" && settings?.allow_ngo_registration !== false) && (
                    <div style={{ marginTop: 14, textAlign: "center", fontSize: 12.5, color: "#64748b" }}>
                      New NGO Partner?{" "}
                      <Link
                        href="/ngo-registration"
                        style={{
                          color: "var(--primary-color, #15803d)",
                          fontWeight: 700,
                          textDecoration: "underline",
                        }}
                      >
                        Register as NGO Partner
                      </Link>
                    </div>
                  )}
                </>
              )}
            </Form>
          )}

          {/* Footer badge */}
          <div className="lp-right-footer">
            <FaShieldAlt style={{ color: "var(--primary-color, #15803d)", marginRight: 6 }} />
            <span style={{ color: "var(--primary-color, #15803d)", fontSize: 12, fontWeight: 500 }}>
              {securityBadgeText}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Right Side CSR Bubbles */}
      {showBubbles && (
        <div className="login-right-bubbles">
          <div className="csr-service-bubble bubble-1">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble1Icon, "leaf")}
            </span>
            <p style={{ whiteSpace: 'pre-line' }}>{bubble1}</p>
          </div>

          <div className="csr-service-bubble bubble-2">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble2Icon, "shield")}
            </span>
            <p style={{ whiteSpace: 'pre-line' }}>{bubble2}</p>
          </div>

          <div className="csr-service-bubble bubble-3">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble3Icon, "strategy")}
            </span>
            <p style={{ whiteSpace: 'pre-line' }}>{bubble3}</p>
          </div>

          <div className="csr-service-bubble bubble-4">
            <span className="csr-bubble-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getBubbleIconComponent(bubble4Icon, "hands")}
            </span>
            <p style={{ whiteSpace: 'pre-line' }}>{bubble4}</p>
          </div>
        </div>
      )}

      {isOpenFPModal && (
        <FPModal visible={isOpenFPModal} onClose={() => setIsOpenFPModal(false)} />
      )}

      {isOpenNgoModal && (
        <NgoRegisterModal visible={isOpenNgoModal} onClose={() => setIsOpenNgoModal(false)} />
      )}

      {/* Page footer */}
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
                <Link
                  href="https://techcsr.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TechCSR
                </Link>
              </>
            );
          })()}
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
