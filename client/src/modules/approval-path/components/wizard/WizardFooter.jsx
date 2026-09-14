"use client";
import React from "react";
import { Button, Space } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  SaveOutlined,
} from "@ant-design/icons";

export const WizardFooter = ({
  currentStep,
  onPrev,
  onNext,
  onSaveDraft,
  onPublish,
  saving = false,
}) => {
  return (
    <div className="approval-studio-footer">
      <div>
        {currentStep > 0 && (
          <Button
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={onPrev}
            style={{ borderRadius: 8, fontWeight: 700 }}
          >
            Previous Step
          </Button>
        )}
      </div>

      <Space size={12}>
        <Button
          size="large"
          icon={<SaveOutlined />}
          onClick={onSaveDraft}
          loading={saving}
          style={{ borderRadius: 8, fontWeight: 700 }}
        >
          Save as Draft
        </Button>

        {currentStep < 2 ? (
          <Button
            type="primary"
            size="large"
            onClick={onNext}
            style={{
              borderRadius: 8,
              fontWeight: 800,
              padding: "0 24px",
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              borderColor: "#4f46e5",
            }}
          >
            Next Step <ArrowRightOutlined />
          </Button>
        ) : (
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleFilled />}
            onClick={onPublish}
            loading={saving}
            style={{
              borderRadius: 8,
              fontWeight: 800,
              padding: "0 28px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              borderColor: "#10b981",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
            }}
          >
            Publish & Activate Approval Path
          </Button>
        )}
      </Space>
    </div>
  );
};

export default WizardFooter;
