import { Button, Card, Col, Input, message, Modal, Row, Select } from "antd";
import { useEffect, useState } from "react";
import {
  createWorkflowAPI,
  workflowModuleListAPI,
} from "@/services/approvalWorkflow-service";
import { parseYupErrors } from "../helper/yupErrorParser";
import { workflowSchema } from "../schema/workflowSchema";
import StepList from "../step/StepList";

export const initialData = {
  word_module_id: "",
  word_workflow_name: "",
  word_version: 1,
  steps: [
    {
      wors_step_name: "",
      wors_role_id: "",
      approvers: [],
      actions: [
        {
          wora_action_name: "",
          wora_next_step: "NEXT",
        },
      ],
    },
  ],
};

export const createEmptyAction = () => ({
  wora_action_name: "",
  wora_next_step: "NEXT",
});
export const createEmptyStep = () => ({
  wors_step_name: "",
  wors_role_id: "",
  approvers: [],
  actions: [createEmptyAction()],
});

export default function WorkflowModal({ open, onClose, fetchWorkflows }) {
  const [workflow, setWorkflow] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [moduleList, setModuleList] = useState([]);

  const handleValidate = async (workflow) => {
    try {
      await workflowSchema.validate(workflow, {
        abortEarly: false,
      });
      setErrors({});
      return true;
    } catch (e) {
      setErrors(parseYupErrors(e));
      return false;
    }
  };

  const handleChange = (name, value) => {
    setWorkflow((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async () => {
    try {
      const isValid = await handleValidate(workflow);
      if (!isValid) return;
      const res = await createWorkflowAPI(workflow);
      fetchWorkflows();
      onClose();
      message.success(res?.data?.message);
    } catch (e) {
      if (e?.response?.data?.errors) {
        setErrors(e?.response?.data?.errors);
      }
      if (e?.response?.data?.message) {
        message.error(e?.response?.data?.message);
      }
    }
  };

  useEffect(() => {
    workflowModuleListAPI()
      .then((res) => {
        setModuleList(res?.data?.data);
      })
      .catch((e) => {
        message.error(e?.response?.data?.message);
      });
  }, []);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1200}
      style={{ top: 20 }}
      footer={null}
      destroyOnHidden={true}
      title={ "Create Workflow"}
    >
      <div className="relative max-h-[70vh] overflow-y-auto p-1">
        <Card title="Workflow Details">
          <Row gutter={16}>
            <Col span={12}>
              <Select
                showSearch
                allowClear
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: "100%" }}
                value={workflow?.word_module_id || undefined}
                placeholder="Select Module"
                onChange={(v) => handleChange("word_module_id", v)}
                options={moduleList}
              />
              {errors?.word_module_id && (
                <div className="error text-danger">{errors.word_module_id}</div>
              )}
            </Col>

            <Col span={12}>
              <Input
                placeholder="Workflow Name"
                value={workflow?.word_workflow_name}
                onChange={(e) =>
                  handleChange("word_workflow_name", e.target.value)
                }
              />
              {errors?.word_workflow_name && (
                <div className="error text-danger">
                  {errors.word_workflow_name}
                </div>
              )}
            </Col>
          </Row>
        </Card>

        <StepList
          workflow={workflow}
          setWorkflow={setWorkflow}
          errors={errors}
          handleValidate={handleValidate}
        />
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={submit}>
          Save Workflow
        </Button>
      </div>
    </Modal>
  );
}
