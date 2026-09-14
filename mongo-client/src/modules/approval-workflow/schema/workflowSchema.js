import * as yup from "yup";

export const workflowSchema = yup.object({
  word_module_id: yup.string().required("Module is required"),
  word_workflow_name: yup.string().required("Workflow name is required"),
  word_version: yup.number().required(),

  steps: yup
    .array()
    .min(1, "At least one step is required")
    .of(
      yup.object({
        wors_step_name: yup.string().required("Step name is required"),
        wors_role_id: yup.string().required("Role is required"),
        approvers: yup.array().min(1, "At least one approver is required"),

        actions: yup
          .array()
          .min(1, "At least one action is required")
          .of(
            yup.object({
              wora_action_name: yup.string().required("Action is required"),
              wora_next_step: yup.string().required("Next step is required"),
            })
          ),
      })
    ),
});
