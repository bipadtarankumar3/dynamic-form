import React, { useEffect, useState } from "react";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  CameraOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckCircleFilled,
  SafetyCertificateFilled,
  IdcardOutlined,
  ApartmentOutlined,
  AuditOutlined,
  InfoCircleOutlined,
  ThunderboltFilled,
  KeyOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import {
  Button,
  Input,
  Form,
  Upload,
  App,
  Row,
  Col,
  Tag,
  Tooltip,
  Avatar,
  Spin,
  Card,
  Divider,
  Modal,
} from "antd";
import { useSettings } from "@/context/SettingsContext";
import { useAuth, getUser } from "@/context/AuthContext";
import {
  getUserProfileAPI,
  updateUserProfileAPI,
  changePasswordApi,
} from "@/services/user-service";

export default function UserProfileSettings() {
  const { message } = App.useApp();
  const { getSettingUrl } = useSettings();
  const { userProfile, setUserProfile, refreshUserProfile } = useAuth();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  
  // Read local decoded token on init
  const localUser = typeof window !== "undefined" ? getUser() : {};

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [userData, setUserData] = useState(() => ({
    name: localUser?.name || "",
    email: localUser?.email || "",
    role: {
      name: localUser?.role_name || (localUser?.isConfigurator ? "Configurator" : localUser?.role_slug || "User"),
      slug: localUser?.role_slug || "",
    },
    mobile: localUser?.phone || localUser?.mobile || "",
  }));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const handlePasswordSubmit = async (values) => {
    try {
      setPasswordSaving(true);
      const payload = {
        current_password: values.current_password,
        password: values.new_password,
        confirm_password: values.confirm_password,
      };
      const res = await changePasswordApi(payload);
      if (res.data?.success) {
        message.success(res.data?.message || "Password changed successfully!");
        setIsPasswordModalOpen(false);
        passwordForm.resetFields();
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errors) {
        const fieldErrors = [];
        if (errData.errors.current_password) {
          fieldErrors.push({ name: "current_password", errors: [errData.errors.current_password] });
        }
        if (errData.errors.password) {
          fieldErrors.push({ name: "new_password", errors: [errData.errors.password] });
        }
        if (errData.errors.confirmPassword || errData.errors.confirm_password) {
          fieldErrors.push({ name: "confirm_password", errors: [errData.errors.confirmPassword || errData.errors.confirm_password] });
        }
        if (fieldErrors.length > 0) {
          passwordForm.setFields(fieldErrors);
        }
      }
      const errMsg =
        errData?.message ||
        errData?.errors?.current_password ||
        errData?.errors?.password ||
        "Failed to change password. Please check your inputs.";
      message.error(errMsg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      // Set initial values from local token immediately
      const tokenUser = getUser();
      if (tokenUser && Object.keys(tokenUser).length > 0) {
        form.setFieldsValue({
          name: tokenUser.name || "",
          email: tokenUser.email || "",
          mobile: tokenUser.phone || tokenUser.mobile || "",
          role: tokenUser.role_name || (tokenUser.isConfigurator ? "Configurator / Admin" : tokenUser.role_slug || "User"),
        });
      }

      // Fetch fresh profile from API
      const res = await getUserProfileAPI();
      if (res.data?.success && res.data?.data) {
        const u = res.data.data;
        setUserData(u);
        form.setFieldsValue({
          name: u.name || "",
          email: u.email || "",
          mobile: u.mobile || "",
          role: u.role?.name || u.role?.slug || (u.role?.isConfigurator ? "Configurator / Admin" : "User"),
          employee_code: u.employee_code || "",
          department: u.department || "",
          designation: u.designation || "",
        });
        if (u.profile_pic) {
          setAvatarPreview(getSettingUrl(u.profile_pic));
        } else {
          setAvatarPreview("");
        }
        setRemoveAvatar(false);
        setAvatarFile(null);
        setUserProfile(u);
      }
    } catch (err) {
      console.warn("Could not fetch profile endpoint, using token info:", err.message);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);


  const handleAvatarChange = (file) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("You can only upload image files!");
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("Image must be smaller than 5MB!");
      return false;
    }

    setAvatarFile(file);
    setRemoveAvatar(false);

    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setRemoveAvatar(true);
  };

  const onFinish = async (values) => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("name", (values.name || "").trim());
      formData.append("mobile", (values.mobile || "").trim());
      formData.append("employee_code", (values.employee_code || "").trim());
      formData.append("department", (values.department || "").trim());
      formData.append("designation", (values.designation || "").trim());

      if (avatarFile) {
        formData.append("profile_pic", avatarFile);
      } else if (removeAvatar) {
        formData.append("remove_avatar", "true");
      }

      const res = await updateUserProfileAPI(formData);

      if (res.data?.success) {
        message.success("Profile updated successfully!");
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        if (res.data.data) {
          setUserProfile(res.data.data);
        }
        fetchUserProfile();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <Spin size="large" tip="Loading profile details..." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 860 }}>
      {/* ── CARD 1: USER IDENTITY HERO ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: "24px 28px",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 180,
            height: 180,
            background: "radial-gradient(circle, rgba(21, 128, 61, 0.08) 0%, rgba(255, 255, 255, 0) 70%)",
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {/* Avatar Section */}
          <div style={{ position: "relative" }}>
            <Avatar
              key={avatarPreview ? `avatar-${avatarPreview}` : "no-avatar"}
              size={96}
              src={avatarPreview || undefined}
              style={{
                backgroundColor: avatarPreview ? "transparent" : "#15803d",
                color: "#ffffff",
                fontSize: 32,
                fontWeight: 800,
                border: "3px solid #ffffff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!avatarPreview && getInitials(userData?.name)}
            </Avatar>

            <Upload
              beforeUpload={handleAvatarChange}
              showUploadList={false}
              accept="image/*"
            >
              <button
                type="button"
                title="Change Avatar"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#15803d",
                  color: "#ffffff",
                  border: "2px solid #ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <CameraOutlined style={{ fontSize: 14 }} />
              </button>
            </Upload>
          </div>

          {/* User Details & Status */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" }}>
                {userData?.name || "Workspace User"}
              </h1>
              <Tag
                color="green"
                style={{
                  fontWeight: 700,
                  fontSize: 11.5,
                  borderRadius: 6,
                  padding: "2px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <SafetyCertificateFilled />
                {userData?.role?.name || userData?.role?.slug || "Configurator"}
              </Tag>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MailOutlined style={{ color: "#94a3b8" }} />
                {userData?.email || "No email"}
              </span>
              {userData?.mobile && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <PhoneOutlined style={{ color: "#94a3b8" }} />
                  {userData?.mobile}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <Upload beforeUpload={handleAvatarChange} showUploadList={false} accept="image/*">
                <Button size="small" icon={<CameraOutlined />} style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                  Change Photo
                </Button>
              </Upload>
              {avatarPreview && (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleRemoveAvatar}
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
                >
                  Remove Photo
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: PROFILE UPDATE FORM ── */}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        initialValues={{
          name: userData?.name || localUser?.name || "",
          email: userData?.email || localUser?.email || "",
          role: userData?.role?.name || localUser?.role_name || (localUser?.isConfigurator ? "Configurator / Admin" : localUser?.role_slug || "User"),
          mobile: userData?.mobile || localUser?.phone || localUser?.mobile || "",
          employee_code: userData?.employee_code || "",
          department: userData?.department || "",
          designation: userData?.designation || "",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: "28px 32px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
          }}
        >
          {/* Section: Locked Account Identity */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: "#f1f5f9",
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  <LockOutlined />
                </div>
                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                  Account Identity & Access Role
                </h3>
              </div>
              <Tag color="default" style={{ borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                Locked Fields
              </Tag>
            </div>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 16px 0" }}>
              Your email address and assigned system role are managed by administrators and cannot be altered here.
            </p>

            <Row gutter={20}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label={
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>Email Address</span>
                      <Tooltip title="Email is permanently tied to your account identity and login access.">
                        <LockOutlined style={{ color: "#94a3b8", fontSize: 13 }} />
                      </Tooltip>
                    </div>
                  }
                >
                  <Input
                    prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
                    suffix={
                      <Tooltip title="Cannot be changed">
                        <LockOutlined style={{ color: "#cbd5e1" }} />
                      </Tooltip>
                    }
                    disabled
                    size="large"
                    style={{
                      borderRadius: 8,
                      background: "#f8fafc",
                      color: "#1e293b",
                      WebkitTextFillColor: "#1e293b",
                      fontWeight: 600,
                      borderColor: "#e2e8f0",
                      cursor: "not-allowed",
                    }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="role"
                  label={
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>System Role & Permissions</span>
                      <Tooltip title="Assigned by system administrator according to organizational governance.">
                        <LockOutlined style={{ color: "#94a3b8", fontSize: 13 }} />
                      </Tooltip>
                    </div>
                  }
                >
                  <Input
                    prefix={<SafetyCertificateFilled style={{ color: "#15803d" }} />}
                    suffix={
                      <Tooltip title="Cannot be changed">
                        <LockOutlined style={{ color: "#cbd5e1" }} />
                      </Tooltip>
                    }
                    disabled
                    size="large"
                    style={{
                      borderRadius: 8,
                      background: "#f8fafc",
                      color: "#15803d",
                      WebkitTextFillColor: "#15803d",
                      fontWeight: 700,
                      borderColor: "#e2e8f0",
                      cursor: "not-allowed",
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider style={{ margin: "16px 0 28px 0", borderColor: "#f1f5f9" }} />

          {/* Section: Editable Personal & Organizational Information */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "#f0fdf4",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                <UserOutlined />
              </div>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                Personal & Work Details
              </h3>
            </div>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 16px 0" }}>
              Update your display name, contact phone number, and departmental positioning across the workspace.
            </p>

            <Row gutter={20}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label={<span style={{ fontWeight: 600, color: "#334155" }}>Full Name *</span>}
                  rules={[{ required: true, message: "Full Name is required" }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                    placeholder="e.g. John Doe"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="mobile"
                  label={<span style={{ fontWeight: 600, color: "#334155" }}>Mobile / Phone Number</span>}
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />}
                    placeholder="e.g. +91 98765 43210"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="employee_code"
                  label={<span style={{ fontWeight: 600, color: "#334155" }}>Employee Code / ID</span>}
                >
                  <Input
                    prefix={<IdcardOutlined style={{ color: "#94a3b8" }} />}
                    placeholder="e.g. EMP-10492"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="department"
                  label={<span style={{ fontWeight: 600, color: "#334155" }}>Department</span>}
                >
                  <Input
                    prefix={<ApartmentOutlined style={{ color: "#94a3b8" }} />}
                    placeholder="e.g. Corporate Social Responsibility"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="designation"
                  label={<span style={{ fontWeight: 600, color: "#334155" }}>Designation / Job Title</span>}
                >
                  <Input
                    prefix={<AuditOutlined style={{ color: "#94a3b8" }} />}
                    placeholder="e.g. Senior CSR Manager"
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div>
              {lastUpdated && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#15803d", fontWeight: 600 }}>
                  <CheckCircleFilled style={{ color: "#16a34a" }} />
                  Profile updated at {lastUpdated}
                </div>
              )}
            </div>

            <Button
              type="primary"
              className="conf-create-btn"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              style={{
                background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                borderColor: "#15803d",
                borderRadius: 8,
                height: 40,
                padding: "0 28px",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
              }}
            >
              Update Profile
            </Button>
          </div>
        </div>
      </Form>

      {/* ── CARD 3: SECURITY & PASSWORD MANAGEMENT ── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: "24px 28px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              <KeyOutlined />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Security & Password Management
              </h3>
              <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                Update your login password regularly to protect your account and maintain workspace security.
              </div>
            </div>
          </div>

          <Button
            type="default"
            icon={<KeyOutlined />}
            onClick={() => {
              passwordForm.resetFields();
              setIsPasswordModalOpen(true);
            }}
            style={{
              borderRadius: 8,
              height: 38,
              padding: "0 18px",
              fontWeight: 700,
              color: "#1e293b",
              borderColor: "#cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Change Password
          </Button>
        </div>
      </div>

      {/* ── CHANGE PASSWORD MODAL ── */}
      <Modal
        open={isPasswordModalOpen}
        onCancel={() => {
          setIsPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={460}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800 }}>
            <KeyOutlined style={{ color: "#15803d" }} />
            <span>Change Account Password</span>
          </div>
        }
      >
        <div style={{ padding: "12px 0 6px 0" }}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
            Enter your current password followed by your new password to update your login credentials.
          </p>

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="current_password"
              label={<span style={{ fontWeight: 600, color: "#334155" }}>Current Password *</span>}
              rules={[{ required: true, message: "Please enter your current password" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Enter current password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="new_password"
              label={<span style={{ fontWeight: 600, color: "#334155" }}>New Password *</span>}
              rules={[
                { required: true, message: "Please enter a new password" },
                { min: 6, message: "Password must be at least 6 characters" },
                { pattern: /[a-z]/, message: "Must contain at least one lowercase letter" },
                { pattern: /[A-Z]/, message: "Must contain at least one uppercase letter" },
                { pattern: /\d/, message: "Must contain at least one number" },
                { pattern: /[@$!%*?&]/, message: "Must contain at least one special character (@$!%*?&)" },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Min 6 chars with A-Z, a-z, 0-9, and symbols"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label={<span style={{ fontWeight: 600, color: "#334155" }}>Confirm New Password *</span>}
              dependencies={["new_password"]}
              rules={[
                { required: true, message: "Please confirm your new password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("new_password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("The two passwords that you entered do not match!"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Re-enter new password"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
              <Button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  passwordForm.resetFields();
                }}
                style={{ borderRadius: 8 }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={passwordSaving}
                style={{
                  background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                  borderColor: "#15803d",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                Update Password
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
}

