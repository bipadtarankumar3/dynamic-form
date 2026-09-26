import { ReloadOutlined } from "@ant-design/icons";
import { Button, Form, Input, message, Modal, Typography } from "antd";
import { useState } from "react";
import * as Yup from "yup";
import { publicHttpClient } from "@/services/api/httpClient";

const { Title } = Typography;

// ✅ Step-wise validation
const getSchema = (type) => {
  if (type === "email_verify") {
    return Yup.object().shape({
      email: Yup.string()
        .email("Enter a valid email")
        .required("Email is required"),
      captcha: Yup.string().required("Captcha is required"),
    });
  }
  if (type === "otp_verify") {
    return Yup.object().shape({
      otp: Yup.string()
        .required("OTP is required")
        .matches(/^\d{6}$/, "Enter a valid 6-digit OTP"),
    });
  }
  if (type === "reset_password") {
    return Yup.object().shape({
      password: Yup.string()
        .required("Password is required")
        .min(6, "Password must be at least 6 characters")
        .matches(/[a-z]/, "Must contain at least one lowercase letter")
        .matches(/[A-Z]/, "Must contain at least one uppercase letter")
        .matches(/\d/, "Must contain at least one number")
        .matches(
          /[@$!%*?&]/,
          "Must contain at least one special character (@$!%*?&)",
        ),
      confirm_password: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required("Confirm Password is required"),
    });
  }
  return Yup.object();
};

// ✅ Captcha Generator
const generateCaptcha = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
};

const FPModal = ({ visible, onClose }) => {
  const [type, setType] = useState("email_verify");
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    captcha: "",
    otp: "",
    password: "",
    confirm_password: "",
  });

  // ✅ Handle input change
  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Validation
  const validateForm = async () => {
    try {
      const schema = getSchema(type);
      await schema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      const formatted = {};
      err.inner.forEach((e) => (formatted[e.path] = e.message));
      setErrors(formatted);
      return false;
    }
  };

  // ✅ Submit Handler
  async function handleSubmit(resend = false) {
    if (!resend) {
      const isValid = await validateForm();
      if (!isValid) return;
      // Captcha check (only step 1)
      if (type === "email_verify" && formData.captcha !== captcha) {
        setErrors({ captcha: "Invalid Captcha" });
        setCaptcha(generateCaptcha());
        setFormData((prev) => ({ ...prev, captcha: "" }));
        return;
      }
    }
    if (resend) {
      setResendLoading(true);
    } else {
      setLoading(true);
    }
    try {
      let payload = { type, email: formData.email };
      if (resend) {
        payload = {
          ...payload,
          type: "email_verify",
        };
      } else {
        if (type === "otp_verify") {
          payload = { ...payload, otp: formData.otp, token };
        } else if (type === "reset_password") {
          payload = {
            ...payload,
            token,
            password: formData.password,
            confirm_password: formData.confirm_password,
          };
        }
      }

      const res = await publicHttpClient.post("auth/forget-password", payload);
      const resData = res?.data;

      // Step transitions
      if (resData?.type === "otp_verify") {
        setToken(resData?.token);
        setType("otp_verify");
      } else if (resData?.type === "reset_password") {
        setToken(resData?.token);
        setType("reset_password");
      } else if (type === "reset_password") {
        setType("email_verify");
        setToken(null);
        onClose();
      }

      // Clear sensitive fields
      setFormData((prev) => ({
        ...prev,
        captcha: "",
        otp: "",
        password: "",
        confirm_password: "",
      }));
      setCaptcha(generateCaptcha());
      message.success(resData?.message || "Success!");
    } catch (err) {
      const { status, data } = err.response || {};
      if (status === 400 && data?.errors) setErrors(data.errors);
      else message.error(data?.message || "Something went wrong");
    } finally {
      setLoading(false);
      setResendLoading(false);
    }
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title="Reset Password"
      footer={[
        <Button
          key="reset"
          type="primary"
          loading={loading}
          onClick={() => handleSubmit()}
          className="reset-password-close-btn"
        >
          {type === "email_verify"
            ? "Send OTP"
            : type === "otp_verify"
              ? "Verify OTP"
              : "Reset Password"}
        </Button>,
      ]}
      centered
      width={500}
      maskClosable={false}
    >
      <div>
        {/* <Title level={4}>Reset Password</Title> */}

        {/* STEP 1: PHONE + CAPTCHA */}

        <label>Email</label>
        <Input
          value={formData.email}
          placeholder="Enter your email"
          disabled={type !== "email_verify"}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        {errors.email && (
          <div className="text-danger text-xs mt-1">{errors.email}</div>
        )}
        {type === "otp_verify" && (
          <div className="flex justify-end mt-2">
            <Button
              size="small"
              type="dashed"
              loading={resendLoading}
              onClick={() => handleSubmit(true)}
            >
              Resend OTP
            </Button>
          </div>
        )}
        {type === "email_verify" && (
          <>
            <div className="captcha-container mt-3">
              <div className="captcha-image">
                <div
                  className="captcha-text"
                  // style={{
                  //   userSelect: "none",
                  //   pointerEvents: "none",
                  // }}
                >
                  {captcha}
                </div>
              </div>
              <Form.Item className="captcha-input-container">
                <Input
                  placeholder="Enter Captcha"
                  className="captcha-input"
                  value={formData.captcha}
                  onChange={(e) => handleChange("captcha", e.target.value)}
                  name="captcha"
                />
                {errors?.captcha && (
                  <div
                    className="error text-danger"
                    style={{
                      textAlign: "left",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    {errors.captcha}
                  </div>
                )}
              </Form.Item>
              <Button
                icon={<ReloadOutlined />}
                className="captcha-refresh"
                onClick={() => setCaptcha(generateCaptcha())}
              />{" "}
              <br />
            </div>
          </>
        )}

        {/* STEP 2: OTP */}
        {type === "otp_verify" && (
          <>
            <label>Enter OTP</label> <br />
            <Input.OTP
              inputMode="numeric"
              pattern="[0-9]*"
              formatter={(str) => str.replace(/\D/g, "")}
              length={6}
              size="large"
              value={formData.otp}
              onChange={(e) => handleChange("otp", e)}
            />
            {errors.otp && (
              <div className="text-danger text-xs mt-1">{errors.otp}</div>
            )}
          </>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {type === "reset_password" && (
          <>
            <label className="mt-3">New Password</label>
            <Input.Password
              autoComplete="new-password"
              value={formData.password}
              placeholder="Enter new password"
              onChange={(e) => handleChange("password", e.target.value)}
            />
            {errors.password && (
              <div className="text-danger text-xs mt-1">{errors.password}</div>
            )}

            <label className="mt-3">Confirm Password</label>
            <Input.Password
              autoComplete="new-password"
              value={formData.confirm_password}
              placeholder="Confirm new password"
              onChange={(e) => handleChange("confirm_password", e.target.value)}
            />
            {errors.confirm_password && (
              <div className="text-danger text-xs mt-1">
                {errors.confirm_password}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default FPModal;
