'use client';

import React from "react";
import { Modal, Button, Space } from "antd";
import { AuditOutlined, FileTextOutlined } from "@ant-design/icons";
import ClosedRfpDetailsView from "../ClosedRfpDetailsView";

export default function ClosedRfpDetailsModal({
  open,
  onCancel,
  selectedRfp,
  onViewProposal,
}) {
  return (
    <Modal
      title={
        <Space>
          <AuditOutlined style={{ color: "#334155", fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Closed RFP Record &amp; Scope</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      width={1100}
      style={{ top: 20, maxWidth: "95vw" }}
      styles={{
        body: {
          maxHeight: "calc(88vh - 110px)",
          overflowY: "auto",
          padding: "16px 20px",
          background: "#f8fafc",
        },
      }}
      footer={[
        <Button key="close" onClick={onCancel} style={{ borderRadius: "8px" }}>
          Close
        </Button>,
        selectedRfp?.is_already_submitted ? (
          <Button
            key="view_sub"
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => {
              onCancel();
              if (onViewProposal) onViewProposal(selectedRfp);
            }}
            style={{ borderRadius: "8px", fontWeight: 700, background: "#2563eb", borderColor: "#2563eb" }}
          >
            View My Submission &amp; Evaluation
          </Button>
        ) : null,
      ]}
    >
      <ClosedRfpDetailsView
        rfp={selectedRfp}
        isModal={true}
        onViewProposal={(rfp) => {
          onCancel();
          if (onViewProposal) onViewProposal(rfp);
        }}
      />
    </Modal>
  );
}
