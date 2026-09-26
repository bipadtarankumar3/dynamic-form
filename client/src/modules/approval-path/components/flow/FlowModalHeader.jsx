"use client";
import React from "react";
import { Button, Tag } from "antd";
import { ApartmentOutlined, ArrowLeftOutlined, CloseOutlined, FormOutlined } from "@ant-design/icons";

export const FlowModalHeader = ({
  wfName,
  isMulti,
  isActive,
  triggerForm,
  rulesCount = 0,
  onClose,
}) => {
  return (
    <div className="approval-studio-header">
      <div className="approval-header-left">
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ fontSize: "16px", color: "#475569" }} />}
          onClick={onClose}
          className="approval-back-btn"
          title="Close View"
        />
        <div className="approval-avatar-box">
          <ApartmentOutlined />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 className="approval-header-title">{wfName}</h2>
            <Tag
              color={isMulti ? "purple" : "blue"}
              style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}
            >
              {isMulti ? `Multi-Level Matrix Flow (${rulesCount} Rules)` : "Normal Sequential Flow"}
            </Tag>
            {isActive ? (
              <Tag color="success" style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                ACTIVE
              </Tag>
            ) : (
              <Tag color="default" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                INACTIVE
              </Tag>
            )}
            {triggerForm && (
              <Tag
                color="cyan"
                icon={<FormOutlined />}
                style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}
              >
                {triggerForm}
              </Tag>
            )}
          </div>
          <span className="approval-header-subtitle">
            Visual Pipeline Architecture & Real-Time Decision Graph
          </span>
        </div>
      </div>

      <Button
        type="primary"
        size="large"
        icon={<CloseOutlined />}
        onClick={onClose}
        style={{
          borderRadius: 10,
          fontWeight: 800,
          padding: "0 22px",
          background: "linear-gradient(135deg, #4f46e5, #6366f1)",
          borderColor: "#4f46e5",
          boxShadow: "0 4px 14px rgba(79,70,229,0.25)",
        }}
      >
        Close Flow View
      </Button>
    </div>
  );
};

export default FlowModalHeader;
