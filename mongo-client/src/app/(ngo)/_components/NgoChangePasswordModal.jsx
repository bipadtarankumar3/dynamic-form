'use client';

import { useState } from "react";
import { Modal, Input, Button, Alert, Progress } from "antd";
import { LockOutlined, SafetyOutlined, CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import { toast } from "react-toastify";

// ─── Password strength helpers ─────────────────────────────────────────────
const RULES = [
  { regex: /[a-z]/,        label: "One lowercase letter" },
  { regex: /[A-Z]/,        label: "One uppercase letter" },
  { regex: /\d/,           label: "One number" },
  { regex: /[^A-Za-z0-9]/, label: "One special character (!@#$% etc.)" },
  { regex: /.{8,}/,        label: "At least 8 characters" },
];

function getStrength(pwd) {
  const passed = RULES.filter((r) => r.regex.test(pwd)).length;
  return { passed, total: RULES.length };
}

function strengthColor(passed) {
  if (passed <= 1) return "#ef4444";
  if (passed <= 2) return "#f97316";
  if (passed <= 3) return "#eab308";
  if (passed <= 4) return "#84cc16";
  return "#22c55e";
}

function strengthLabel(passed) {
  if (passed <= 1) return "Very Weak";
  if (passed <= 2) return "Weak";
  if (passed <= 3) return "Fair";
  if (passed <= 4) return "Good";
  return "Strong";
}

// ─── Component ──────────────────────────────────────────────────────────────
const NgoChangePasswordModal = ({ onSuccess }) => {
  const [formData, setFormData] = useState({ password: "", confirm_password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.password) {
      errs.password = "New password is required";
    } else if (formData.password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    } else {
      const failedRule = RULES.find((r) => !r.regex.test(formData.password));
      if (failedRule) errs.password = `Password must contain: ${failedRule.label.toLowerCase()}`;
    }
    if (!formData.confirm_password) {
      errs.confirm_password = "Please confirm your new password";
    } else if (formData.password !== formData.confirm_password) {
      errs.confirm_password = "Passwords do not match";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await privateHttpClient.post("/auth/ngo/change-password", {
        password: formData.password,
        confirm_password: formData.confirm_password,
      });
      toast.success(res?.data?.message || "Password changed successfully!");
      sessionStorage.removeItem("ngo_is_first_login");
      onSuccess();
    } catch (err) {
      const { status, data } = err?.response || {};
      if (status === 400 && data?.errors) {
        setErrors(data.errors);
      } else {
        toast.error(data?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const { passed } = getStrength(formData.password);
  const percent = Math.round((passed / RULES.length) * 100);

  return (
    <Modal
      open={true}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      centered
      width={480}
      styles={{ mask: { backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.6)" } }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            marginBottom: 14,
            boxShadow: "0 8px 24px rgba(22,163,74,0.35)",
          }}
        >
          <SafetyOutlined style={{ fontSize: 28, color: "#fff" }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>
          Set Your New Password
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#6b7280", lineHeight: 1.5 }}>
          For your security, you must create a new password before accessing the portal.
        </p>
      </div>

      {/* Info alert */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20, borderRadius: 8, fontSize: 13 }}
        message={
          <span>
            Your account was created with a <strong>temporary password</strong>. Please set a strong,
            personal password to continue.
          </span>
        }
      />

      {/* New Password */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>
          <LockOutlined style={{ marginRight: 6, color: "#16a34a" }} />
          New Password
        </label>
        <Input.Password
          size="large"
          placeholder="Enter new password"
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          style={{ borderRadius: 8, borderColor: errors.password ? "#ef4444" : undefined }}
        />
        {errors.password && (
          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.password}</div>
        )}

        {/* Strength bar */}
        {formData.password.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Progress
              percent={percent}
              strokeColor={strengthColor(passed)}
              showInfo={false}
              size="small"
              strokeLinecap="square"
              style={{ marginBottom: 6 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: strengthColor(passed), fontWeight: 600 }}>
                Strength: {strengthLabel(passed)}
              </span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{passed}/{RULES.length} requirements met</span>
            </div>
            {/* Rule checklist */}
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
              {RULES.map((rule) => {
                const ok = rule.regex.test(formData.password);
                return (
                  <div key={rule.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5 }}>
                    {ok
                      ? <CheckCircleFilled style={{ color: "#22c55e" }} />
                      : <CloseCircleFilled style={{ color: "#d1d5db" }} />}
                    <span style={{ color: ok ? "#374151" : "#9ca3af" }}>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>
          <LockOutlined style={{ marginRight: 6, color: "#16a34a" }} />
          Confirm Password
        </label>
        <Input.Password
          size="large"
          placeholder="Re-enter new password"
          value={formData.confirm_password}
          onChange={(e) => handleChange("confirm_password", e.target.value)}
          onPressEnter={handleSubmit}
          style={{ borderRadius: 8, borderColor: errors.confirm_password ? "#ef4444" : undefined }}
        />
        {errors.confirm_password && (
          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.confirm_password}</div>
        )}
        {formData.confirm_password && formData.password && !errors.confirm_password &&
          formData.password === formData.confirm_password && (
          <div style={{ color: "#22c55e", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircleFilled /> Passwords match
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        onClick={handleSubmit}
        disabled={passed < RULES.length}
        style={{
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
          height: 44,
          background: passed >= RULES.length
            ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
            : undefined,
          border: "none",
          boxShadow: passed >= RULES.length ? "0 4px 14px rgba(22,163,74,0.4)" : undefined,
        }}
      >
        Set New Password &amp; Continue
      </Button>

      <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
        🔒 This step is mandatory and cannot be skipped.
      </p>
    </Modal>
  );
};

export default NgoChangePasswordModal;
