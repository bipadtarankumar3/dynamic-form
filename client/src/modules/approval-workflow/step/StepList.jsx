import { Button, message } from "antd";
import StepCard from "./StepCard";
import { createEmptyStep, initialData } from "../workflow/WorkflowModal";
import { roleListAPI } from "@/services/rbac-service";
import { useEffect, useState } from "react";

export default function StepList({
  workflow,
  setWorkflow,
  errors,
  handleValidate,
}) {
  const [roleList, setRoleList] = useState([]);
  const addStep = () => {
    setWorkflow((p) => ({
      ...p,
      steps: [...p?.steps, createEmptyStep()],
    }));
  };

  const removeStep = (i) => {
    setWorkflow((prev) => {
      let steps = prev?.steps?.filter((_, idx) => idx !== i);

      if (steps.length === 0) {
        steps = [createEmptyStep()];
      }

      const updatedWorkflow = { ...prev, steps };
      handleValidate(updatedWorkflow);
      return updatedWorkflow;
    });
  };

  useEffect(() => {
    roleListAPI()
      .then((res) => setRoleList(res?.data?.data))
      .catch((err) => message.error(err?.response?.data?.message));
  }, []);
  return (
    <>
      {workflow?.steps?.map((step, i) => (
        <StepCard
          key={i}
          index={i}
          step={step}
          workflow={workflow}
          setWorkflow={setWorkflow}
          errors={errors?.steps?.[i]}
          removeStep={removeStep}
          handleValidate={handleValidate}
          roleList={roleList}
        />
      ))}

      <Button type="primary" onClick={addStep} className="mt-2">
        + Add Step
      </Button>
    </>
  );
}
