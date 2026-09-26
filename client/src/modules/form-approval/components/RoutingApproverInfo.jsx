import React from "react";
import { Button } from "antd";
import { ArrowRightOutlined, UndoOutlined } from "@ant-design/icons";
import UserChip from "./UserChip";
import { roleColor } from "../utils/formApprovalHelpers";
import "../form-approval.css";

export default function RoutingApproverInfo({
  instance,
  steps = [],
  currentStep = 1,
  prevStepNum = 0,
  canPullBack = false,
  onOpenPullBackModal,
}) {
  if (!instance) return null;

  return (
    <div className="fap-routing-box">
      <div className="fap-routing-header">
        <div className="fap-routing-title">
          Routing & Approver Assignment
        </div>

        {canPullBack && (
          <Button
            icon={<UndoOutlined />}
            onClick={onOpenPullBackModal}
            size="small"
            className="fap-btn-pullback"
          >
            Pull Back {currentStep === 1 ? "to Draft" : `to Step ${prevStepNum}`}
          </Button>
        )}
      </div>

      <div
        className={
          instance.next_approver && currentStep < steps.length
            ? "fap-routing-grid"
            : "fap-routing-block"
        }
      >
        {/* Current */}
        <div>
          <div className="fap-routing-label">
            Pending with (Step {currentStep}
            {currentStep >= steps.length ? " — Final Step" : ""})
          </div>
          <UserChip user={instance.current_approver} color={roleColor(currentStep - 1)} />
        </div>

        {instance.next_approver && currentStep < steps.length && (
          <>
            <ArrowRightOutlined className="fap-arrow-next" />

            {/* Next */}
            <div>
              <div className="fap-routing-label">
                Next Approver (Step {currentStep + 1})
              </div>
              <UserChip user={instance.next_approver} color={roleColor(currentStep)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
