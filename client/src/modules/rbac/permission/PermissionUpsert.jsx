import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Typography,
} from "antd";
import $ from "jquery";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as Yup from "yup";
import { upsertPermission } from "@/services/rbac-service";
const { Text } = Typography;
const Schema = Yup.object({
  perm_name: Yup.string().trim().min(3, "Minimum 3 characters").required("Permission Name is required"),
});

const PermissionUpsert = (props) => {
  const { visible, onClose, data } = props;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    perm_name: "",
  });

  const handleChange = (name, value) => {
    let updatedData;
    updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
  };

  const handleValidation = async (data) => {
    try {
      await Schema.validate(data, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof Error && "inner" in err) {
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
      const res = await upsertPermission({
        ...formData,
        ...(data?.perm_id ? { perm_id: data?.perm_id } : {}),
      });
      $("#permission_list_table").DataTable().ajax.reload();
      onClose();
      toast.success(res?.data?.message);
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 400) {
        setErrors(data?.errors || {});
      } else if (status === 404) {
        toast.error(data?.message || "Not found");
      } else if (!status) {
        toast.error("Network error or server unavailable.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setErrors({});
    if (Object.keys(data || {}).length > 0) {
      setFormData({
        perm_name: data?.perm_name || "",
      });
    } else {
      setFormData({
        perm_name: "",
      });
    }
  }, [data]);
  return (
    <>
      <Modal
        title={
          <>
            {`${data?.perm_id ? "Update" : "Add"} Permission`}
            <br />
            <Text
              type="secondary"
              style={{ fontSize: "12px", fontWeight: "bold", color: "#1890ff" }}
            >
              Please fill in all required fields.
            </Text>
          </>
        }
        style={{ top: 40 }}
        open={visible}
        onOk={handleSubmit}
        confirmLoading={loading}
        onCancel={onClose}
        maskClosable={false}
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
            height: "50vh",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "5px",
          }}
        >
          <Row gutter={[8, 16]}>
            <Col span={24}>
              <label htmlFor="perm_name" className="form-label">
                Name of Permission <span className="text-danger">*</span>
              </label>
              <Input
                placeholder="Enter Permission Name"
                name="perm_name"
                value={formData.perm_name}
                onChange={(e) => handleChange("perm_name", e.target.value)}
              />
              {errors?.perm_name && (
                <div className="error text-danger">{errors?.perm_name}</div>
              )}
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default PermissionUpsert;
