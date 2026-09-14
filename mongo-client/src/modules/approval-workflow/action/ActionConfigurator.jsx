import { Button, Col, Popconfirm, Row, Select } from "antd";
import { createEmptyAction } from "../workflow/WorkflowModal";

export default function ActionConfigurator({
  actions,
  errors,
  workflow,
  setWorkflow,
  handleValidate,
  stepIndex,
}) {
  const add = () => {
    setWorkflow((prev) => {
      const steps = [...prev?.steps];
      steps[stepIndex].actions.push(createEmptyAction());
      const updated = { ...prev, steps };
      return updated;
    });
  };

  const handleChange = (actionIndex, k, v) => {
    setWorkflow((prev) => {
      const steps = [...prev?.steps];
      steps[stepIndex].actions[actionIndex][k] = v;
      const updated = { ...prev, steps };
      return updated;
    });
  };

  const remove = (actionIndex) => {
    setWorkflow((prev) => {
      const steps = [...prev?.steps];
      let actions = steps?.[stepIndex]?.actions?.filter(
        (_, i) => i !== actionIndex
      );

      if (actions?.length === 0) {
        actions = [createEmptyAction()];
      }

      steps[stepIndex].actions = actions;

      const updated = { ...prev, steps };
      handleValidate(updated);
      return updated;
    });
  };

  return (
    <>
      <div className="mt-2 font-bold">Actions (Buttons)</div>

      {actions?.map((a, i) => (
        <Row key={i} gutter={16} className="p-1">
          <Col span={10}>
            <Select
              showSearch
              allowClear
              filterOption={(input, option) =>
                option?.label?.toLowerCase().includes(input.toLowerCase())
              }
              placeholder="Select Action"
              style={{ width: "100%" }}
              value={a?.wora_action_name || undefined}
              onChange={(v) => handleChange(i, "wora_action_name", v)}
              options={[
                { label: "Approve", value: "APPROVE" },
                { label: "Resend", value: "RESEND" },
              ]}
            />
            {errors?.[i]?.wora_action_name && (
              <div className="error text-danger">{errors[i].wora_action_name}</div>
            )}
          </Col>

          <Col span={10}>
            <Select
              showSearch
              allowClear
              filterOption={(input, option) =>
                option?.label?.toLowerCase().includes(input.toLowerCase())
              }
              placeholder="Select Next Step"
              style={{ width: "100%" }}
              value={a.wora_next_step}
              onChange={(v) => handleChange(i, "wora_next_step", v)}
              options={[
                { label: "Next", value: "NEXT" },
                { label: "Initiator", value: "INITIATOR" },
                { label: "End", value: "END" },
              ]}
            />
            {errors?.[i]?.wora_next_step && (
              <div className="error text-danger">{errors[i].wora_next_step}</div>
            )}
          </Col>

          <Col span={4}>
            <Popconfirm title="Remove action?" onConfirm={() => remove(i)}>
              <Button danger type="dashed">
                Remove
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      ))}

      <Button size="small" type="primary" onClick={add} className="mt-2">
        + Add Action
      </Button>
    </>
  );
}
