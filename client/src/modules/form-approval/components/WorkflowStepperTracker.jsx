import React from "react";
import { Tag } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  RollbackOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "../form-approval.css";

export default function WorkflowStepperTracker({
  steps = [],
  instance = null,
  savedAssignment = null,
  currentStep = 1,
  rejectionStep = 1,
  isFinished = false,
  isResend = false,
  initiatorUser = null,
  stepUserMap = {},
}) {
  const isWorkflowStarted = Boolean(instance && instance.status !== "DRAFT");
  const isInitiatorActive = !isWorkflowStarted;

  // Build all nodes: Node 0 (Initiator) + Node 1..N (Steps)
  const allNodes = [
    {
      key: "initiator",
      type: "initiator",
      stepNum: 0,
      role_name: "Initiator",
      role: "Initiator",
      label: "Initiator",
      user: initiatorUser,
      isActive: isInitiatorActive,
      isCompleted: isWorkflowStarted,
      isResend: false,
      isRejected: false,
      isWaiting: false,
    },
    ...steps.map((s, idx) => {
      const stepNum = s.step || idx + 1;
      const assignment = (instance?.assignments || savedAssignment?.assignments || []).find(
        (a) => Number(a.step) === stepNum
      );
      const user = assignment?.user || null;

      let isCompleted = false;
      let isActive = false;
      let isStepResend = false;
      let isStepRejected = false;
      let isWaiting = false;

      if (!instance || instance.status === "DRAFT") {
        isWaiting = true;
      } else if (instance.status === "APPROVED") {
        isCompleted = true;
      } else if (instance.status === "RESEND" || isResend) {
        if (stepNum === rejectionStep) {
          isStepResend = true;
          isActive = true;
        } else if (stepNum < rejectionStep) {
          isCompleted = true;
        } else {
          isWaiting = true;
        }
      } else if (instance.status === "REJECTED") {
        if (stepNum === rejectionStep) {
          isStepRejected = true;
        } else if (stepNum < rejectionStep) {
          isCompleted = true;
        } else {
          isWaiting = true;
        }
      } else {
        // Active in-progress workflow
        if (stepNum < currentStep) {
          isCompleted = true;
        } else if (stepNum === currentStep) {
          isActive = true;
        } else {
          isWaiting = true;
        }
      }

      return {
        key: `step_${stepNum}`,
        type: "approver",
        stepNum,
        role_name: s.role_name || s.role || `Step ${stepNum}`,
        role: s.role,
        label: s.label || s.role_name,
        user,
        isActive,
        isCompleted,
        isResend: isStepResend,
        isRejected: isStepRejected,
        isWaiting,
      };
    }),
  ];

  return (
    <div className="fap-stepper-box">
      {/* Stepper horizontal row */}
      <div className="fap-stepper-row">
        {allNodes.map((node, idx) => {
          const isFirst = idx === 0;
          const prevNode = !isFirst ? allNodes[idx - 1] : null;
          const lineCompleted = prevNode?.isCompleted;

          const lineClass = `fap-stepper-line ${
            lineCompleted
              ? "fap-stepper-line--completed"
              : node.isActive
              ? "fap-stepper-line--active"
              : ""
          }`;

          const titleClass = `fap-node-title ${
            node.isActive
              ? "fap-node-title--active"
              : node.isCompleted
              ? "fap-node-title--completed"
              : node.isResend
              ? "fap-node-title--resend"
              : node.isRejected
              ? "fap-node-title--rejected"
              : "fap-node-title--waiting"
          }`;

          const userClass = `fap-node-user ${
            node.isActive ? "fap-node-user--active" : "fap-node-user--inactive"
          }`;

          return (
            <div key={node.key} className="fap-stepper-col">
              {/* Connector Line before this node */}
              {!isFirst && <div className={lineClass} />}

              {/* Circle Icon Container */}
              <div className="fap-circle-wrapper">
                {node.isCompleted ? (
                  <div className="fap-circle fap-circle--completed">
                    <CheckCircleFilled />
                  </div>
                ) : node.isResend ? (
                  <div className="fap-circle fap-circle--resend">
                    <RollbackOutlined />
                  </div>
                ) : node.isRejected ? (
                  <div className="fap-circle fap-circle--rejected">
                    <CloseCircleFilled />
                  </div>
                ) : node.isActive ? (
                  <div className="fap-circle fap-circle--active">
                    {node.type === "initiator" ? (
                      <UserOutlined className="fap-header-icon" />
                    ) : (
                      node.stepNum
                    )}
                  </div>
                ) : (
                  <div className="fap-circle fap-circle--waiting">{node.stepNum}</div>
                )}
              </div>

              {/* Title & Role */}
              <div className={titleClass}>
                {node.type === "initiator"
                  ? "Initiator"
                  : `${node.role_name || `Step ${node.stepNum}`}`}
              </div>

              {/* User Name Subtitle */}
              <div
                className={userClass}
                title={
                  node.user?.name ||
                  (node.type === "initiator" ? "Project Submitter" : "Pending Assignment")
                }
              >
                {node.user?.name ||
                  (node.type === "initiator" ? "Project Submitter" : "Pending Assignment")}
              </div>

              {/* Status Tag Badge */}
              <div>
                {node.isActive && (
                  <Tag
                    color={node.isResend ? "orange" : "purple"}
                    className="fap-stepper-tag-active"
                  >
                    {node.isResend
                      ? "Changes Requested"
                      : node.type === "initiator"
                      ? "Ready to Send"
                      : "Pending Step"}
                  </Tag>
                )}
                {node.isCompleted && (
                  <span className="fap-stepper-status-completed">
                    {node.type === "initiator" ? "Submitted ✓" : "Approved ✓"}
                  </span>
                )}
                {node.isRejected && (
                  <Tag color="error" className="fap-step-tag">
                    Rejected
                  </Tag>
                )}
                {node.isWaiting && (
                  <span className="fap-stepper-status-waiting">Waiting</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
