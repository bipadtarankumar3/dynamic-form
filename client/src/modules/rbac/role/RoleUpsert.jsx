import React from "react";
import { DeleteOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Typography
} from "antd";
import $ from "jquery";
import { useEffect, useState } from "react";
import { CiSquarePlus } from "react-icons/ci";
import { MultiSelect } from "react-multi-select-component";
import Select from "react-select";
import { toast } from "react-toastify";
import * as Yup from "yup";
import {
  moduleList,
  permissionList,
  roleDetails,
  upsertRole,
} from "@/services/rbac-service";
const { Text } = Typography;
const Schema = Yup.object({
  rol_name: Yup.string().trim().required("Role Name is required"),
  assignments: Yup.array()
    .of(
      Yup.object().shape({
        mod_id: Yup.string().required("Module is required"),
        permissions: Yup.array().min(1, "At least one permission is required"),
      })
    )
    .min(1, "At least one module permission is required"),
});

const initialValue = {
  rol_name: "",
  assignments: [{ mod_id: "", permissions: [] }],
};

const RoleUpsert = (props) => {
  const { visible, onClose, data } = props;
  const [loading, setLoading] = useState(false);
  const [roleData, setRoleData] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(initialValue);

  const handleAddField = (type, newValue) => {
    setFormData((prevState) => ({
      ...prevState,
      [type]: Array.isArray(prevState[type])
        ? [...prevState[type], newValue]
        : [newValue],
    }));
  };

  const handleRemoveField = (type, index) => {
    // Create a new array without the removed field
    const updatedDetails = Array.isArray(formData[type])
      ? formData[type].filter((_, i) => i !== index)
      : [];

    // Update formData with the updated details, or use a default value if it's empty
    setFormData((prevState) => {
      const newFormData = {
        ...prevState,
        [type]:
          updatedDetails?.length === 0
            ? [getDefaultValue(type)]
            : updatedDetails,
      };

      handleValidation(newFormData);

      return newFormData;
    });
  };

  const getDefaultValue = (type) => {
    switch (type) {
      case "assignments":
        return { mod_id: "", permissions: [] };
      default:
        return { mod_id: "", permissions: [] };
    }
  };

  const handleChange = (name, value, index, subField) => {
    let updatedData = { ...formData };

    if (
      Array.isArray(formData[name]) &&
      typeof index === "number" &&
      subField
    ) {
      const arr = [...formData[name]];
      arr[index] = {
        ...arr[index],
        [subField]: value,
      };
      updatedData[name] = arr;
    } else {
      updatedData = { ...updatedData, [name]: value };
    }
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
      const res = await upsertRole({
        ...formData,
      });
      $("#role_list_table").DataTable().ajax.reload();
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
    if (Object.keys(roleData || {}).length > 0) {
      setFormData({
        ...roleData,
        assignments:
          roleData?.assignments?.length > 0
            ? roleData?.assignments
            : [getDefaultValue("assignments")],
      });
    } else {
      setFormData(initialValue);
    }
  }, [roleData]);

  useEffect(() => {
    if (data?.rol_id) {
      roleDetails({ role_id: data?.rol_id })
        .then((data) => {
          setRoleData(data?.data?.data || []);
        })
        .catch((error) => {
          toast.error(
            error?.response?.data?.originalError ||
              error?.response?.data?.message
          );
        });
    }
  }, [data]);

  useEffect(() => {
    permissionList()
      .then((data) => {
        setPermissions(data?.data?.data || []);
      })
      .catch((error) => {
        toast.error(
          error?.response?.data?.originalError || error?.response?.data?.message
        );
      });

    moduleList()
      .then((data) => {
        setModules(data?.data?.data || []);
      })
      .catch((error) => {
        toast.error(
          error?.response?.data?.originalError || error?.response?.data?.message
        );
      });
  }, []);

  return (
    <>
      <Modal
        title={
          <>
            {`${data?.rol_id ? "Update" : "Add"} Role`}
          
            <Text className="block"
              style={{ fontSize: "12px", fontWeight: "bold", color: "#fff" }}
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
        width={800}
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
            height: "60vh",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "5px",
          }}
        >
          <Row gutter={[8, 16]}>
            <Col span={12}>
              <label htmlFor="rol_name" className="form-label">
                Role <span className="text-danger">*</span>
              </label>
              <Input
                readOnly
                placeholder="Enter Role Name"
                name="rol_name"
                value={formData.rol_name}
                onChange={(e) => handleChange("rol_name", e.target.value)}
              />
              {errors?.rol_name && (
                <div className="error text-danger">{errors?.rol_name}</div>
              )}
            </Col>
            <Col span={24} style={{ backgroundColor: "rgb(214 230 247)" }}>
              <b>Module & Permission :</b>{" "}
              <span className="text-danger">*</span>
            </Col>

            {Array.isArray(formData?.assignments) &&
              formData?.assignments.map((item, index) => (
                <React.Fragment key={index}>
                  <Col span={10}>
                    <label htmlFor="mod_id" className="form-label">
                      Module <span className="text-danger">*</span>
                    </label>
                    <Select
                      options={modules.filter(
                        (opt) =>
                          !formData?.assignments?.some(
                            (row, i) =>
                              i !== index && row?.mod_id === opt?.value
                          )
                      )}
                      value={
                        modules.find(({ value }) => value == item?.mod_id) || ""
                      }
                      onChange={(newValue) => {
                        handleChange(
                          "assignments",
                          String(newValue?.value || ""),
                          index,
                          "mod_id"
                        );
                      }}
                      isClearable
                      maxMenuHeight={150}
                      placeholder="Select Module"
                    />
                    {errors?.[`assignments[${index}].mod_id`] && (
                      <div className="error text-danger">
                        {errors?.[`assignments[${index}].mod_id`]}
                      </div>
                    )}
                  </Col>
                  <Col span={10}>
                    <label htmlFor="mod_id" className="form-label">
                      Permission <span className="text-danger">*</span>
                    </label>
                    <MultiSelect
                      hasSelectAll={false}
                      options={permissions}
                      value={item?.permissions || []}
                      onChange={(value) => {
                        handleChange(
                          "assignments",
                          value,
                          index,
                          "permissions"
                        );
                      }}
                      labelledBy=""
                    />
                    {errors?.[`assignments[${index}].permissions`] && (
                      <div className="error text-danger">
                        {errors?.[`assignments[${index}].permissions`]}
                      </div>
                    )}
                  </Col>
                  <Col
                    className="flex justify-center items-center ml-5 mt-7"
                    span={3}
                  >
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <CiSquarePlus
                          style={{
                            color: "green",
                            fontSize: "24px",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            handleAddField("assignments", {
                              mod_id: "",
                              permissions: [],
                            })
                          }
                        />
                      )}
                      <Popconfirm
                        title="Are you sure to delete this?"
                        onConfirm={() =>
                          handleRemoveField("assignments", index)
                        }
                        okText="Yes"
                        cancelText="No"
                      >
                        <DeleteOutlined
                          style={{
                            color: "red",
                            fontSize: "20px",
                            cursor: "pointer",
                          }}
                        />
                      </Popconfirm>
                    </div>
                  </Col>
                </React.Fragment>
              ))}
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default RoleUpsert;
