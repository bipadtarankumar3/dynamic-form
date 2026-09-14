import {
  Card,
  Input,
  Select,
  Row,
  Col,
  Popconfirm,
  Button,
  message,
} from "antd";
import ActionConfigurator from "../action/ActionConfigurator";
import { roleWiseUserLIstAPI } from "@/services/rbac-service";
import { useState } from "react";

export default function StepCard({
  step,
  index,
  workflow,
  setWorkflow,
  errors,
  removeStep,
  handleValidate,
  roleList,
}) {
  const [roleWiseUserList, setRoleWiseUserList] = useState([]);

  const handleGetRoleWiseUserList = async (wors_role_id) => {
    try {
      const res = await roleWiseUserLIstAPI({ role_id: wors_role_id });
      setRoleWiseUserList(res?.data?.data);
    } catch (e) {
      message.error(e?.response?.data?.message);
    }
  };

  const handleChange = (k, v) => {
    setWorkflow((prev) => {
      const prevStep = prev.steps[index];
      let updatedStep = { ...prevStep, [k]: v };

      if (k === "wors_role_id" && prevStep.wors_role_id !== v) {
        updatedStep.approvers = [];
      }

      const steps = [...prev.steps];
      steps[index] = updatedStep;

      return { ...prev, steps };
    });

    if (k === "wors_role_id" && v) {
      handleGetRoleWiseUserList(v);
    }
  };

  return (
    <Card
      className="mt-2"
      title={`Step ${index + 1}`}
      extra={
        index !== 0 && (
          <Popconfirm
            title="Are you sure you want to remove this step?"
            onConfirm={() => removeStep(index)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="dashed" danger>
              Remove
            </Button>
          </Popconfirm>
        )
      }
    >
      <Row gutter={16}>
        <Col span={8}>
          <Input
            placeholder="Step Name"
            value={step?.wors_step_name}
            onChange={(e) => handleChange("wors_step_name", e.target.value)}
          />
          {errors?.wors_step_name && (
            <div className="error text-danger">{errors.wors_step_name}</div>
          )}
        </Col>

        <Col span={8}>
          <Select
            showSearch
            allowClear
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            placeholder="Select Role"
            style={{ width: "100%" }}
            value={step?.wors_role_id || undefined}
            onChange={(v) => handleChange("wors_role_id", v)}
            options={roleList}
          />
          {errors?.wors_role_id && (
            <div className="error text-danger">{errors.wors_role_id}</div>
          )}
        </Col>

        <Col span={8}>
          <Select
            showSearch
            allowClear
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            placeholder="Select Approvers"
            style={{ width: "100%" }}
            mode="multiple"
            value={step?.approvers || undefined}
            onChange={(v) => handleChange("approvers", v)}
            options={roleWiseUserList}
          />
          {errors?.approvers && (
            <div className="error text-danger">{errors.approvers}</div>
          )}
        </Col>
      </Row>

      <ActionConfigurator
        stepIndex={index}
        actions={step.actions}
        errors={errors?.actions}
        workflow={workflow}
        setWorkflow={setWorkflow}
        handleValidate={handleValidate}
      />
    </Card>
  );
}
