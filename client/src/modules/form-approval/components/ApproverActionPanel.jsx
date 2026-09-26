import React from "react";
import { Button, Input } from "antd";
import {
  AuditOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  RollbackOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "../form-approval.css";

const { TextArea } = Input;

export default function ApproverActionPanel({
  steps = [],
  instance,
  currentStep = 1,
  actionRemarks,
  setActionRemarks,
  actionRemarksErr,
  setActionRemarksErr,
  actioning,
  onAction,
}) {
  const currentStepConfig =
    steps.find((s) => Number(s.step || s.level) === Number(currentStep)) ||
    (instance?.assignments || []).find((a) => Number(a.step) === Number(currentStep)) ||
    steps[currentStep - 1] ||
    {};
  const rawStepActions =
    currentStepConfig.actions ||
    currentStepConfig.permitted_actions ||
    (instance?.assignments || []).find((a) => Number(a.step) === Number(currentStep))?.actions ||
    ["approve", "reject"];
  const stepActions = Array.isArray(rawStepActions)
    ? rawStepActions.map((a) => String(a).toLowerCase().trim())
    : ["approve", "reject"];

  return (
    <div className="fap-action-box">
      <div className="fap-action-title">
        <UserOutlined /> Your Action Required — Step {currentStep} (
        {currentStepConfig.role_name || currentStepConfig.role || "Approver"})
      </div>
      <TextArea
        rows={3}
        placeholder="Add your remarks… (required)"
        value={actionRemarks}
        onChange={(e) => {
          setActionRemarks(e.target.value);
          setActionRemarksErr("");
        }}
        className="fap-textarea-custom"
        style={{ marginBottom: 6 }}
        status={actionRemarksErr ? "error" : ""}
      />
      {actionRemarksErr && (
        <div className="fap-error-text" style={{ marginBottom: 8 }}>
          {actionRemarksErr}
        </div>
      )}
      <div className="fap-action-btn-group">
        {stepActions.includes("reject") && (
          <Button
            size="large"
            danger
            icon={<CloseCircleFilled />}
            loading={actioning}
            onClick={() => onAction("REJECT")}
            className="fap-btn-reject"
          >
            Reject
          </Button>
        )}
        {(stepActions.includes("resend") || stepActions.includes("request_info")) && (
          <Button
            size="large"
            icon={<RollbackOutlined />}
            loading={actioning}
            onClick={() => onAction("RESEND")}
            className="fap-btn-resend-action"
          >
            Resend / Request Info
          </Button>
        )}
        {stepActions.includes("forward") && (
          <Button
            size="large"
            icon={<SwapOutlined />}
            loading={actioning}
            onClick={() => onAction("FORWARD")}
            className="fap-btn-forward"
          >
            Forward
          </Button>
        )}
        {stepActions.includes("review") && (
          <Button
            size="large"
            icon={<AuditOutlined />}
            loading={actioning}
            onClick={() => onAction("REVIEW")}
            className="fap-btn-review"
          >
            Review & Pass
          </Button>
        )}
        {stepActions.includes("approve") && (
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleFilled />}
            loading={actioning}
            onClick={() => onAction("APPROVE")}
            className="fap-btn-approve"
          >
            {currentStep >= steps.length ? "Approve & Finalize" : `Approve — Step ${currentStep}`}
          </Button>
        )}
      </div>
    </div>
  );
}
