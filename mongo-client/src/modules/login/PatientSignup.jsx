import { InfoCircleOutlined, LockOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { toast } from "react-toastify";
import * as Yup from "yup";
import { publicHttpClient } from "@/services/api/httpClient";

const { Title } = Typography;

// ✅ Step-wise validation
const getSchema = (type) => {
  if (type === "email_verify") {
    return Yup.object().shape({
      ptnt_name: Yup.string().required("Name is required"),
      ptnt_email: Yup.string()
        .email("Enter a valid email")
        .required("Email is required"),
      ptnt_dob: Yup.string().required("Date of birth is required"),
      ptnt_gender: Yup.string().required("Gender is required"),
      ptnt_blood_group: Yup.string().required("Blood group is required"),
      password: Yup.string()
        .required("Password is required")
        .min(6, "Password must be at least 6 characters")
        .matches(/[a-z]/, "Must contain at least one lowercase letter")
        .matches(/[A-Z]/, "Must contain at least one uppercase letter")
        .matches(/\d/, "Must contain at least one number")
        .matches(
          /[@$!%*?&]/,
          "Must contain at least one special character (@$!%*?&)"
        ),
      ptnt_phone: Yup.string()
        .required("Phone number is required")
        .matches(/^\d{10}$/, "Enter a valid 10-digit phone number"),

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

  return Yup.object();
};

// ✅ Captcha Generator
const generateCaptcha = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
};

const passwordTooltip = (
  <div>
    <span>🔹 At least 6 characters</span> <br />
    <span>🔹 One lowercase letter</span> <br />
    <span>🔹 One uppercase letter</span> <br />
    <span>🔹 One number</span> <br />
    <span>🔹 One special character (@$!%*?&)</span>
  </div>
);

const PatientSignup = ({ visible, onClose }) => {
  const [type, setType] = useState("email_verify");
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [genderList] = useState([
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "others", label: "Others" },
  ]);
  const [bloodGroupList] = useState([
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
  ]);
  const [formData, setFormData] = useState({
    ptnt_name: "",
    ptnt_email: "",
    ptnt_phone: "",
    ptnt_dob: null,
    ptnt_gender: "",
    ptnt_blood_group: "",
    password: "",
    captcha: "",
    otp: "",
  });

  // ✅ Handle input change
  const handleChange = (name, value) => {
    if (name === "phone") value = value.replace(/\D/g, "").slice(0, 10);
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
        return;
      }
    }

    setLoading(true);
    try {
      let payload = { ...formData, type };

      if (type === "otp_verify") {
        payload = { ...payload, otp: formData.otp, token };
      }

      const res = await publicHttpClient.post("auth/patient-signup", payload);
      const resData = res?.data;

      // Step transitions
      if (resData?.type === "otp_verify") {
        setToken(resData?.token);
        setType("otp_verify");
      } else if (type === "otp_verify") {
        setType("email_verify");
        setToken(null);
        onClose();
      }

      // Clear sensitive fields
      setFormData((prev) => ({
        ...prev,
        captcha: "",
        otp: "",
      }));
      setCaptcha(generateCaptcha());
      toast.success(resData?.message || "Success!");
    } catch (err) {
      const { status, data } = err.response || {};
      if (status === 400 && data?.errors) setErrors(data.errors);
      else toast.error(data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button
          key="reset"
          type="primary"
          loading={loading}
          onClick={() => handleSubmit()}
          className="text-white"
        >
          {type === "email_verify"
            ? "Continue"
            : type === "otp_verify"
            ? "Submit"
            : ""}
        </Button>,
      ]}
      centered
      width={500}
      maskClosable={false}
    >
      <div>
        <Title level={4} className="text-center">
          Patient Signup
        </Title>
        {/* STEP 1: PHONE + CAPTCHA */}
        <label>Name</label>
        <Input
          className="mt-1"
          disabled={!(type === "email_verify")}
          value={formData.ptnt_name}
          placeholder="Enter your full name"
          onChange={(e) => handleChange("ptnt_name", e.target.value)}
        />
        {errors.ptnt_name && (
          <div className="text-danger text-xs mt-1">{errors.ptnt_name}</div>
        )}
        <label className="mt-1">Email</label>
        <Input
          className="mt-1"
          disabled={!(type === "email_verify")}
          value={formData.ptnt_email}
          placeholder="Enter your email address"
          onChange={(e) => handleChange("ptnt_email", e.target.value)}
        />
        {errors.ptnt_email && (
          <div className="text-danger text-xs mt-1">{errors.ptnt_email}</div>
        )}
        <label className="mt-1">Mobile Number</label>
        <Input
          className="mt-1"
          disabled={!(type === "email_verify")}
          value={formData.ptnt_phone}
          placeholder="Enter your mobile number"
          onChange={(e) => handleChange("ptnt_phone", e.target.value)}
        />
        {errors.ptnt_phone && (
          <div className="text-danger text-xs mt-1">{errors.ptnt_phone}</div>
        )}
        <label className="mt-1">DOB</label>
        <DatePicker
          disabled={!(type === "email_verify")}
          placeholder="Select date of birth"
          value={formData.ptnt_dob ? dayjs(formData.ptnt_dob) : null}
          onChange={(date) => {
            setFormData((prev) => ({
              ...prev,
              ptnt_dob: date ? date.format("YYYY-MM-DD") : null,
            }));
          }}
          className="w-full mt-1"
          disabledDate={(current) => current && current > dayjs().endOf("day")}
        />
        {errors.ptnt_dob && (
          <div className="text-danger text-xs mt-1">{errors.ptnt_dob}</div>
        )}
        <label className="mt-1">Gender</label>
        <div>
          <Select
            className="mt-1"
            disabled={!(type === "email_verify")}
            placeholder="Select gender"
            value={formData?.ptnt_gender || undefined}
            options={genderList}
            onChange={(e) => handleChange("ptnt_gender", e)}
            style={{ width: "100%" }}
          />
        </div>
        {errors.ptnt_gender && (
          <div className="text-danger text-xs mt-1">{errors.ptnt_gender}</div>
        )}
        <label className="mt-1">Blood Group</label>
        <div>
          <Select
            className="mt-1"
            disabled={!(type === "email_verify")}
            placeholder="Select blood group"
            value={formData?.ptnt_blood_group || undefined}
            options={bloodGroupList}
            onChange={(e) => handleChange("ptnt_blood_group", e)}
            style={{ width: "100%" }}
          />
        </div>
        {errors.ptnt_blood_group && (
          <div className="text-danger text-xs mt-1">
            {errors.ptnt_blood_group}
          </div>
        )}
        <label className="mt-1">Password</label>{" "}
        <Tooltip title={passwordTooltip} placement="top">
          <InfoCircleOutlined style={{ color: "#1890ff" }} />
        </Tooltip>
        <Input.Password
          disabled={!(type === "email_verify")}
          style={{ height: "38px" }}
          prefix={<LockOutlined />}
          placeholder="Enter password"
          value={formData.password}
          className="mt-1"
          onChange={(e) => handleChange("password", e.target.value)}
          visibilityToggle={{
            visible: showPassword,
            onVisibleChange: setShowPassword,
          }}
          autoComplete="new-password"
        />
        {errors.password && (
          <div className="text-danger text-xs mt-1">{errors.password}</div>
        )}
        {type === "email_verify" && (
          <>
            <div className="captcha-container mt-3">
              <div className="captcha-image">
                <div
                  className="captcha-text"
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
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
            <label>Enter OTP</label>
            <Input
              value={formData.otp}
              placeholder="Enter 6-digit OTP"
              onChange={(e) => handleChange("otp", e.target.value)}
              maxLength={6}
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

export default PatientSignup;
