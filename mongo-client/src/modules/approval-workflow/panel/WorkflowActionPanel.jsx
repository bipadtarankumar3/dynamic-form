import {
  App,
  Button,
  Card,
  Collapse,
  Divider,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Steps,
  Tag,
  Timeline,
} from "antd";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import {
  availableWorkflowActionsAPI,
  performWorkflowActionAPI,
  viewWorkflowAPI,
} from "@/services/approvalWorkflow-service";
import RemarkBlock from "./RemarkBlock";
const { Panel } = Collapse;
const { TextArea } = Input;

const initialState = {
  loading: true,
  workflow: null,
  steps: [],
  logs: [],
  actions: [],
};

export default function WorkflowActionPanel({
  reference_id,
  workflow_slug,
  disabled = false,
  form_id,
}) {
  const { modal } = App.useApp();
  const [state, setState] = useState(initialState);
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  /* ================= FETCH BOTH APIS TOGETHER ================= */
  const fetchWorkflowState = async () => {
    if (!reference_id || !workflow_slug) return;

    setState((p) => ({ ...p, loading: true }));

    try {
      const [workflowRes, actionsRes] = await Promise.all([
        viewWorkflowAPI({ reference_id, workflow_slug }),
        availableWorkflowActionsAPI({ reference_id, workflow_slug }),
      ]);

      setState({
        loading: false,
        workflow: workflowRes?.data?.data?.workflow,
        steps: workflowRes?.data?.data?.steps || [],
        logs: workflowRes?.data?.data?.logs || [],
        actions: actionsRes?.data?.data || [],
      });
    } catch (e) {
      message.error("Failed to load workflow data");
      setState((p) => ({ ...p, loading: false }));
    }
  };

  useEffect(() => {
    fetchWorkflowState();
  }, [reference_id, workflow_slug]);

  /* ================= DERIVED VALUES ================= */
  const currentStepIndex = useMemo(() => {
    if (!state?.workflow) return -1;
    if (state.workflow.current_step_order === 0) return -1;
    return state.steps.findIndex((s) => s.status === "CURRENT");
  }, [state?.workflow, state?.steps]);

  /* =================  ACTUAL API CALL (runs ONLY after user confirms) ================= */
  const performAction = async (action) => {
    try {
      setSubmitLoading(true);

      const res = await performWorkflowActionAPI({
        instance_id: action?.wori_instance_id,
        action_name: action?.wora_action_name,
        remarks,
        form_id,
        workflow_slug,
      });

      setRemarks("");
      setErrors({});
      fetchWorkflowState();
      message.success(res?.data?.message);
    } catch (e) {
      message.error(e?.response?.data?.message || "Action failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ================= HANDLER WITH CONFIRMATION MODAL ================= */
  const handleAction = async (action) => {
    if (!remarks) {
      setErrors({ remarks: "Remarks is required" });
      return;
    }
    modal.confirm({
      title: "Confirm Action",
      content: (
        <div>
          Are you sure you want to <b>{action?.wora_action_name}</b> this?
        </div>
      ),
      okText: "Yes",
      cancelText: "No",
      okButtonProps: {
        danger: action?.wora_action_name === "REJECT",
      },
      onOk: async () => {
        try {
          await performAction(action);
        } catch (e) {
          message.error("Action failed");
          throw e; // keeps modal open
        }
      },
    });
  };

  if (Object.keys(state?.workflow || {}).length === 0) return null;

  const { workflow, steps, logs, actions, loading } = state;

  /* ================= RENDER ================= */
  return (
    <Card
      className="mt-2"
      title={
        <div className="flex justify-between">
          <span>Workflow Status & Actions</span>

          <div>
            {workflow?.status === "RESEND" ? (
              <Tag color="orange">Returned to Initiator</Tag>
            ) : workflow?.status === "APPROVED" ? (
              <Tag color="green"> Approved</Tag>
            ) : workflow?.status ? (
              <Tag color="orange">{workflow?.status}</Tag>
            ) : null}
          </div>
        </div>
      }
    >
      {state?.loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Spin size="large" spinning />
        </div>
      ) : (
        <>
          {/* Steps */}
          {steps?.length > 0 && (
            <Steps current={currentStepIndex} size="small">
              {steps?.map((s) => (
                <Steps.Step
                  key={s.order}
                  title={s.name}
                  status={
                    s.status === "COMPLETED"
                      ? "finish"
                      : s.status === "CURRENT"
                        ? "process"
                        : "wait"
                  }
                />
              ))}
            </Steps>
          )}

          <Divider />
          {logs?.length > 0 && (
            <Collapse defaultActiveKey={[]} className="mt-3">
              <Panel header="Workflow History" key="history">
                {logs?.length === 0 ? (
                  <div className="text-gray-400">No history available</div>
                ) : (
                  <Timeline
                    items={logs?.map((l, i) => ({
                      key: i,
                      children: (
                        <>
                          <div>
                            <b>{l?.action}</b>{" "}
                            <span className="text-gray-500">
                              by {l?.acted_by}
                            </span>
                          </div>
                          {l?.remarks && <RemarkBlock text={l.remarks} />}
                          <div className="text-xs text-gray-400 mt-1">
                            {moment(l.created_at).format("lll")}
                          </div>
                        </>
                      ),
                    }))}
                  />
                )}
              </Panel>
            </Collapse>
          )}
          {/* Actions */}
          {!disabled && actions?.length > 0 && (
            <>
              <Divider />

              <TextArea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks"
              />
              {errors?.remarks && (
                <div className="error text-danger">{errors?.remarks}</div>
              )}
              <div className="flex justify-end mt-2">
                <Space>
                  {actions?.map((a) => (
                    <Button
                      key={a?.wora_action_id}
                      type={
                        a?.wora_action_name === "APPROVE"
                          ? "primary"
                          : "default"
                      }
                      danger={a?.wora_action_name === "REJECT"}
                      disabled={submitLoading}
                      onClick={() => handleAction(a)}
                    >
                      {a?.wora_action_name}
                    </Button>
                  ))}
                </Space>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
