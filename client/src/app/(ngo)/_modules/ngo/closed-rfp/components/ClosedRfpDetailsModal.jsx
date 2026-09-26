import React from "react";
import { Modal, Button, Space } from "antd";
import { AuditOutlined, FileTextOutlined, SendOutlined } from "@ant-design/icons";
import ClosedRfpDetailsView from "../ClosedRfpDetailsView";

export default function ClosedRfpDetailsModal({
  open,
  onCancel,
  selectedRfp,
  onApply,
  onViewProposal,
}) {
  return (
    <Modal
      className="rfp-gradient-modal"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="rfp-modal-icon-badge">
            <AuditOutlined />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#ffffff", lineHeight: 1.3 }}>
              Closed RFP Scope &amp; Evaluation Record
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.92)" }}>
              RFP Ref: #{selectedRfp?.id} • {selectedRfp?.project_details || selectedRfp?.title || "Request for Proposal"}
            </p>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      width={1120}
      style={{ top: 20, maxWidth: "95vw" }}
      closeIcon={<span style={{ color: "#ffffff", fontSize: 16 }}>✕</span>}
      styles={{
        body: {
          maxHeight: "calc(88vh - 110px)",
          overflowY: "auto",
          padding: "20px 24px",
          background: "#f8fafc",
        },
      }}
      footer={[
        <Button
          key="close"
          onClick={onCancel}
          style={{
            borderRadius: "8px",
            minWidth: 90,
            height: 38,
            fontWeight: 600,
          }}
        >
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
            className="rfp-btn-view-submitted"
            style={{
              borderRadius: "8px",
              fontWeight: 700,
              height: 38,
              paddingInline: 18,
            }}
          >
            My Proposal
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
            className="rfp-btn-submit"
            style={{
              borderRadius: "8px",
              fontWeight: 700,
              height: 38,
              paddingInline: 18,
            }}
          >
            Submit RFP
          </Button>
        ),
      ]}
    >
      <ClosedRfpDetailsView
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
