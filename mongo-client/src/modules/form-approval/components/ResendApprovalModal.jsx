import React from "react";
import { Alert, Button, Input, Modal, Tag } from "antd";
import { SendOutlined } from "@ant-design/icons";
import "../form-approval.css";

const { TextArea } = Input;

export default function ResendApprovalModal({
  visible,
  resending,
  resendRemarks,
  setResendRemarks,
  resendRemarksErr,
  setResendRemarksErr,
  steps = [],
  instance,
  savedAssignment,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      title={
        <div className="fap-modal-header">
          <SendOutlined className="fap-modal-header-icon" />
          <span>Resend for Approval</span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="resend"
          type="primary"
          icon={<SendOutlined />}
          loading={resending}
          onClick={onConfirm}
          className="fap-modal-btn-confirm"
        >
          Confirm & Resend
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className="fap-modal-body-top">
        <Alert
          type="info"
          showIcon
          className="fap-alert-info-modal"
          message={
            <span className="fap-alert-info-text">
              Resending will restart the workflow from <strong>Step 1</strong> (
              {steps[0]?.role_name || steps[0]?.role || "First Approver"}).
            </span>
          }
        />

        {/* Assigned approvers summary */}
        <div className="fap-assigned-modal-box">
          <div className="fap-assigned-modal-title">Assigned Approval Path:</div>
          <div className="fap-assigned-modal-list">
            {steps.map((s, idx) => {
              const stepNum = s.step || idx + 1;
              const assignment = (
                instance?.assignments ||
                savedAssignment?.assignments ||
                []
              ).find((a) => Number(a.step) === stepNum);
              return (
                <div key={stepNum} className="fap-assigned-modal-row">
                  <Tag
                    color={idx === 0 ? "purple" : "blue"}
                    className="fap-step-tag"
                  >
                    Step {stepNum}
                  </Tag>
                  <span className="fap-assigned-modal-user">
                    {assignment?.user?.name || "Assigned User"}
                  </span>
                  <span className="fap-assigned-modal-role">
                    — {s.role_name || s.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="fap-field-box">
          <div className="fap-modal-field-title-bold">
            Resubmission Remarks <span className="fap-field-required">*</span>
          </div>
          <TextArea
            rows={3}
            placeholder="Explain changes made or reason for resubmission…"
            value={resendRemarks}
            onChange={(e) => {
              setResendRemarks(e.target.value);
              setResendRemarksErr("");
            }}
            className="fap-textarea-custom"
            status={resendRemarksErr ? "error" : ""}
          />
          {resendRemarksErr && (
            <div className="fap-error-text">{resendRemarksErr}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
