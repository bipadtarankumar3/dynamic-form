import React from "react";
import { Input, Modal } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import "../form-approval.css";

const { TextArea } = Input;

export default function PullBackModal({
  visible,
  pullingBack,
  pullBackRemarks,
  setPullBackRemarks,
  instance,
  currentStep,
  prevStepNum,
  prevAssignment,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      title={
        <div className="fap-modal-header">
          <UndoOutlined className="fap-modal-header-icon--warning" />
          <span>Pull Back Approval Request</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      confirmLoading={pullingBack}
      okText="Confirm Pull Back"
      okButtonProps={{ className: "fap-modal-btn-pullback" }}
      onOk={onConfirm}
      destroyOnHidden
    >
      <div className="fap-modal-body-pad">
        <p className="fap-modal-desc-text">
          You are recalling this approval request from{" "}
          <strong>
            {instance?.current_approver?.name || `Step ${currentStep} Approver`}
          </strong>
          .
          {currentStep === 1
            ? " The workflow will return to Draft / Initiator stage so you can modify project data, change approvers, or resend."
            : ` The workflow will return to Step ${prevStepNum} (${
                prevAssignment?.label || prevAssignment?.role_name || "Previous Step"
              }) so you can take your action (Approve, Resend, Reject) again.`}
        </p>
        <div className="fap-modal-field-title">
          Remarks / Reason for Pulling Back (Optional):
        </div>
        <TextArea
          rows={3}
          value={pullBackRemarks}
          onChange={(e) => setPullBackRemarks(e.target.value)}
          placeholder="E.g. Need to revise details before approver review..."
          className="fap-textarea-custom"
        />
      </div>
    </Modal>
  );
}
