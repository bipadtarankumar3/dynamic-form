import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Typography,
  message,
} from "antd";
import React, { useState } from "react";
import * as Yup from "yup";


import { changePasswordApi } from "@/services/user-service";
 
const { Text } = Typography;
 
export const passwordSchema = Yup.object().shape({
  current_password: Yup.string().required("Current password is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/\d/, "Password must contain at least one number")
    .matches(
      /[@$!%*?&]/,
      "Password must contain at least one special character (@$!%*?&)"
    )
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm Password is required"),
});
 
const ChangePassword = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
 
  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };
 
  const handleValidation = async (data) => {
    try {
      await passwordSchema.validate(data, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      if (err && err.inner) {
        const formattedErrors = err.inner.reduce((acc, curr) => {
          acc[curr.path] = curr.message;
          return acc;
        }, {});
        setErrors(formattedErrors);
      }
      return false;
    }
  };
 
  const handleSubmit = async () => {
    const isValid = await handleValidation(formData);
    if (!isValid) {
      return;
    }
    setLoading(true);
    try {
      const res = await changePasswordApi(formData);
      onClose();
      message.success(res?.data?.message);
    } catch (error) {
      const { status, data } = error.response || {};
      if (status === 400) {
        setErrors(data?.errors || {});
      } else if (status === 404) {
        message.error(data?.message);
      }
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <Modal
      title={
        <>
          Change Password
       
        </>
      }
      maskClosable={false}
      style={{ top: 40 }}
      open={visible}
      onOk={handleSubmit}
      confirmLoading={loading}
      onCancel={onClose}
      footer={[
        <>
          <Divider
            key="divider"
            style={{ margin: "0 0 10px 0", borderColor: "lightGrey" }}
          />
          <Button key="back" onClick={onClose}>
            Cancel
          </Button>
          <Button
            key="submit"
            disabled={loading}
            type="primary"
            loading={loading}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </>,
      ]}
    >
      <Form
        layout="vertical"
        style={{
          height: "30vh",
          overflowY: "auto",
          overflowX: "hidden",
          padding: "5px",
        }}
      >
        <Row gutter={[16, 10]}>
          <Col span={24}>
            <label htmlFor="current_password" className="form-label">
              Current Password <span className="text-danger">*</span>
            </label>
            <Input
              placeholder="Enter Current Password"
              name="current_password"
              value={formData?.current_password}
              onChange={(e) => handleChange("current_password", e.target.value)}
            />
            {errors?.current_password && (
              <div className="error text-danger">
                {errors?.current_password}
              </div>
            )}
          </Col>
          <Col span={24}>
            <label htmlFor="password" className="form-label">
              Password <span className="text-danger">*</span>
            </label>
            <Input
              placeholder="Enter Password"
              name="password"
              value={formData?.password}
              onChange={(e) => handleChange("password", e.target.value)}
            />
            {errors?.password && (
              <div className="error text-danger">{errors?.password}</div>
            )}
          </Col>
          <Col span={24}>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password <span className="text-danger">*</span>
            </label>
            <Input
              placeholder="Enter Confirm Password"
              name="confirmPassword"
              value={formData?.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
            />
            {errors?.confirmPassword && (
              <div className="error text-danger">{errors?.confirmPassword}</div>
            )}
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
 
export default ChangePassword;