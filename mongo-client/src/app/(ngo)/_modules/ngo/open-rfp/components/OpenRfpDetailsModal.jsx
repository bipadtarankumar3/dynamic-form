'use client';

import React from "react";
import { Modal, Button, Space } from "antd";
import { AuditOutlined, SendOutlined, FileTextOutlined } from "@ant-design/icons";
import OpenRfpDetailsView from "../OpenRfpDetailsView";

export default function OpenRfpDetailsModal({
  open,
  onCancel,
  selectedRfp,
  onApply,
  onViewProposal,
}) {
  return (
    <Modal
      title={
        <Space>
          <AuditOutlined style={{ color: "#059669", fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Open RFP Scope &amp; Details</span>
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
          marginTop: "25px",
        },
      }}
      footer={[
        <Button key="close" onClick={onCancel} style={{ borderRadius: "8px" }}>
          Close
        </Button>,
        selectedRfp?.is_already_submitted ? (
          <Button
            key="view_sub"
            icon={<FileTextOutlined />}
            onClick={() => {
              onCancel();
              if (onViewProposal) onViewProposal(selectedRfp);
            }}
            style={{ borderRadius: "8px", fontWeight: 700, color: "#2563eb", borderColor: "#2563eb" }}
          >
            View My Proposal
          </Button>
        ) : (
          <Button
            key="apply"
            type="primary"
            icon={<SendOutlined />}
            onClick={() => {
              onCancel();
              if (onApply) onApply(selectedRfp);
            }}
            style={{ background: "#059669", borderColor: "#059669", borderRadius: "8px", fontWeight: 700 }}
          >
            Submit Proposal
          </Button>
        ),
      ]}
    >
      <OpenRfpDetailsView
        rfp={selectedRfp}
        isModal={true}
        onApply={(rfp) => {
          onCancel();
          if (onApply) onApply(rfp);
        }}
        onViewProposal={(rfp) => {
          onCancel();
          if (onViewProposal) onViewProposal(rfp);
        }}
      />
    </Modal>
  );
}
