import React from "react";
import { Button, Tooltip } from "antd";
import {
  ApartmentOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ReloadOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import "../form-approval.css";

export default function PanelHeader({
  workflow,
  steps = [],
  status,
  rejectionInfo,
  onRefresh,
  loading,
}) {
  const s = String(status || "").toUpperCase();
  const isApproved = s === "APPROVED";
  const isRejected = s === "REJECTED";
  const isResend =
    s === "RESEND" ||
    rejectionInfo?.action === "RESEND" ||
    rejectionInfo?.action === "REQUEST_INFO";

  const headerClass = `fap-header ${
    isApproved
      ? "fap-header--approved"
      : isRejected
      ? "fap-header--rejected"
      : isResend
      ? "fap-header--resend"
      : "fap-header--default"
  }`;

  return (
    <div className={headerClass}>
      <div className="fap-collapse-title-row">
        <div className="fap-header-icon-box">
          {isApproved ? (
            <CheckCircleFilled className="fap-header-icon" />
          ) : isRejected ? (
            <CloseCircleFilled className="fap-header-icon" />
          ) : isResend ? (
            <RollbackOutlined className="fap-header-icon" />
          ) : (
            <ApartmentOutlined className="fap-header-icon" />
          )}
        </div>
        <div>
          <div className="fap-header-title">{workflow?.name || "Approval Workflow"}</div>
          <div className="fap-header-subtitle">
            {isApproved
              ? "All steps approved ✓"
              : isRejected
              ? "Workflow stopped — Rejected"
              : isResend
              ? `Workflow paused — Changes Requested at Step ${rejectionInfo?.step || 1}`
              : `${steps?.length || 0} approval step${steps?.length !== 1 ? "s" : ""} required`}
          </div>
        </div>
      </div>
      <Tooltip title="Refresh">
        <Button
          type="text"
          icon={<ReloadOutlined className="fap-header-refresh-btn" />}
          onClick={onRefresh}
          loading={loading}
        />
      </Tooltip>
    </div>
  );
}
