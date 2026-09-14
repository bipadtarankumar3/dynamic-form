import React from "react";
import { Button, Space, Tag } from "antd";
import {
  CloseCircleFilled,
  EditOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { formatDate } from "../utils/formApprovalHelpers";
import "../form-approval.css";

export default function RejectionAlertCard({
  instance,
  currentStep,
  isResend,
  isInitiator,
  onOpenEdit,
  reopening,
  onReopen,
  sending,
  onOpenResendModal,
}) {
  if (!instance || (instance.status !== "REJECTED" && instance.status !== "RESEND" && !isResend)) {
    return null;
  }

  const isResendMode =
    instance.status === "RESEND" ||
    isResend ||
    instance.rejectionInfo?.action === "RESEND" ||
    instance.rejectionInfo?.action === "REQUEST_INFO";

  const boxClass = `fap-rejection-box ${
    isResendMode ? "fap-rejection-box--resend" : "fap-rejection-box--rejected"
  }`;

  return (
    <div className={boxClass}>
      {/* Header */}
      <div className="fap-rejection-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="fap-rejection-icon-box"
            style={{
              background: isResendMode ? "#ffedd5" : "#fee2e2",
              border: `1px solid ${isResendMode ? "#fdba74" : "#fca5a5"}`,
            }}
          >
            {isResendMode ? (
              <RollbackOutlined style={{ color: "#ea580c", fontSize: 20 }} />
            ) : (
              <CloseCircleFilled style={{ color: "#dc2626", fontSize: 20 }} />
            )}
          </div>
          <div>
            <div
              className={`fap-rejection-title ${
                isResendMode
                  ? "fap-rejection-title--resend"
                  : "fap-rejection-title--rejected"
              }`}
            >
              {isResendMode
                ? `Workflow Paused — Changes Requested at Step ${
                    instance.rejectionInfo?.step || currentStep
                  }`
                : `Workflow Stopped — Rejected at Step ${
                    instance.rejectionInfo?.step || currentStep
                  }`}
            </div>
            <div
              className={
                isResendMode
                  ? "fap-rejection-subtitle--resend"
                  : "fap-rejection-subtitle--rejected"
              }
            >
              {isResendMode ? "Changes requested by" : "Rejected by"}{" "}
              <strong>{instance.rejectionInfo?.actor_name || "Approver"}</strong>
              {instance.rejectionInfo?.role ? ` (${instance.rejectionInfo.role})` : ""} on{" "}
              {formatDate(instance.rejectionInfo?.at)}
            </div>
          </div>
        </div>
        <Tag
          color={isResendMode ? "orange" : "error"}
          className="fap-rejection-tag"
        >
          {isResendMode ? "STATUS: CHANGES REQUESTED" : "STATUS: REJECTED"}
        </Tag>
      </div>

      {/* Remarks */}
      {instance.rejectionInfo?.remarks && (
        <div
          className="fap-rejection-remarks"
          style={{
            borderLeft: `3.5px solid ${isResendMode ? "#ea580c" : "#dc2626"}`,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: isResendMode ? "#9a3412" : "#991b1b",
            }}
          >
            {isResendMode ? "Approver's Feedback / Request:" : "Approver's Reason:"}
          </span>{" "}
          &ldquo;{instance.rejectionInfo.remarks}&rdquo;
        </div>
      )}

      {/* Resubmit / Re-open Action Bar */}
      <div
        className="fap-rejection-action-bar"
        style={{ border: `1px solid ${isResendMode ? "#fed7aa" : "#fecaca"}` }}
      >
        <div>
          <div className="fap-rejection-action-title">
            {isInitiator
              ? "Ready to update and resubmit?"
              : `Awaiting revisions by initiator (${
                  instance.initiator?.name || "Initiator"
                })`}
          </div>
          <div className="fap-rejection-action-desc">
            {isInitiator
              ? "Edit the project data or resend for approval starting from Step 1."
              : "The project initiator has been notified to update the project data and resubmit for approval."}
          </div>
        </div>

        {isInitiator && (
          <Space wrap>
            {onOpenEdit && (
              <Button
                icon={<EditOutlined />}
                onClick={onOpenEdit}
                className="fap-btn-edit-data"
              >
                Edit Project Data
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              loading={reopening}
              onClick={onReopen}
              className="fap-btn-reopen"
            >
              Re-open & Change Approvers
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={onOpenResendModal}
              className="fap-btn-resend-gradient"
            >
              Resend for Approval
            </Button>
          </Space>
        )}
      </div>
    </div>
  );
}
