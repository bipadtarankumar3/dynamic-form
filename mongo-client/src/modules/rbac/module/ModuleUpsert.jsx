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
import { upsertModule } from "@/services/rbac-service";
const { Text } = Typography;
const Schema = Yup.object({
  mod_name: Yup.string().trim().min(3, "Minimum 3 characters").required("Module Name is required"),
});

const ModuleUpsert = (props) => {
  const { visible, onClose, data } = props;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    mod_name: "",
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
      const res = await upsertModule({
        ...formData,
        ...(data?.mod_id ? { mod_id: data?.mod_id } : {}),
      });
      $("#module_list_table").DataTable().ajax.reload();
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
        mod_name: data?.mod_name || "",
      });
    } else {
      setFormData({
        mod_name: "",
      });
    }
  }, [data]);
  return (
    <>
      <Modal
        title={
          <>
            {`${data?.mod_id ? "Update" : "Add"} Module`}
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
              <label htmlFor="mod_name" className="form-label">
                Name of Module <span className="text-danger">*</span>
              </label>
              <Input
                placeholder="Enter Module Name"
                name="mod_name"
                value={formData.mod_name}
                onChange={(e) => handleChange("mod_name", e.target.value)}
              />
              {errors?.mod_name && (
                <div className="error text-danger">{errors?.mod_name}</div>
              )}
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default ModuleUpsert;
