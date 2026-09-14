"use client";
import React from "react";
import { Button, Steps, Tag } from "antd";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  FormOutlined,
} from "@ant-design/icons";

export const WizardHeader = ({
  workflowName,
  isEditing,
  flowType,
  selectedFormSlug,
  currentStep,
  onStepClick,
  onClose,
}) => {
  const stepsItems = [
    { title: "1. Setup" },
    { title: flowType === "multi_level" ? "2. Matrix Rules" : "2. Approval Chain" },
    { title: "3. Verification" },
  ];

  return (
    <div className="approval-studio-header">
      <div className="approval-header-left">
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ fontSize: "16px", color: "#475569" }} />}
          onClick={onClose}
          className="approval-back-btn"
          title="Back / Close Studio"
        />
        <div className="approval-avatar-box">
          <ApartmentOutlined />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 className="approval-header-title">
              {workflowName || (isEditing ? "Edit Approval Architecture" : "New Approval Architecture")}
            </h2>
            <Tag
              color={flowType === "multi_level" ? "purple" : "blue"}
              style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}
            >
              {flowType === "multi_level" ? "Multi-Level Matrix Flow" : "Normal Flow"}
            </Tag>
            {selectedFormSlug && (
              <Tag
                color="cyan"
                icon={<FormOutlined />}
                style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}
              >
                {selectedFormSlug}
              </Tag>
            )}
          </div>
          <span className="approval-header-subtitle">
            Enterprise Multi-Level Approval Engine & Rule Matrix Studio
          </span>
        </div>
      </div>

      <div className="approval-stepper-wrap">
        <Steps
          current={currentStep}
          onChange={(s) => onStepClick(s)}
          size="small"
          responsive={false}
          items={stepsItems}
        />
      </div>
    </div>
  );
};

export default WizardHeader;
