import React from "react";
import { Button, Divider, Input, Tag } from "antd";
import { SendOutlined } from "@ant-design/icons";
import UserChip from "./UserChip";
import { roleColor } from "../utils/formApprovalHelpers";
import "../form-approval.css";

const { TextArea } = Input;

export default function SendForApprovalSection({
  steps = [],
  savedAssignment,
  sendRemarks,
  setSendRemarks,
  sendRemarksErr,
  setSendRemarksErr,
  sending,
  onSend,
}) {
  if (!savedAssignment) return null;

  return (
    <>
      <Divider className="fap-divider-stage2">
        <span className="fap-stage2-badge">Step 2: Send for Approval</span>
      </Divider>

      {/* Saved approvers summary */}
      <div className="fap-saved-approvers-box">
        <div className="fap-saved-approvers-title">Assigned Approvers (saved)</div>
        <div className="fap-saved-approvers-list">
          {steps.map((s, idx) => {
            const stepNum = s.step || idx + 1;
            const assignment = savedAssignment.assignments?.find(
              (a) => Number(a.step) === stepNum
            );
            return (
              <div key={stepNum} className="fap-saved-approvers-row">
                <Tag color="blue" className="fap-step-tag">
                  Step {stepNum}
                </Tag>
                <UserChip user={assignment?.user} color={roleColor(idx)} />
                <span className="fap-role-text">— {s.role_name || s.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remarks */}
      <div className="fap-field-box">
        <div className="fap-field-label">
          Remarks <span className="fap-field-required">*</span>
        </div>
        <TextArea
          rows={3}
          placeholder="Add a note or reason for sending this for approval…"
          value={sendRemarks}
          onChange={(e) => {
            setSendRemarks(e.target.value);
            setSendRemarksErr("");
          }}
          className="fap-textarea-custom"
          status={sendRemarksErr ? "error" : ""}
        />
        {sendRemarksErr && <div className="fap-error-text">{sendRemarksErr}</div>}
      </div>

      <div className="fap-btn-row-right">
        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          loading={sending}
          onClick={onSend}
          className="fap-btn-send"
        >
          Send for Approval
        </Button>
      </div>
    </>
  );
}
