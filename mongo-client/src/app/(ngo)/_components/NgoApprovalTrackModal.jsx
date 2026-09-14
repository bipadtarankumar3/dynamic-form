'use client';

import React from "react";
import { Modal, Timeline, Tag, Empty, Typography, Card } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleFilled,
  FileDoneOutlined,
  UserOutlined,
  AuditOutlined,
  CalendarOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

export default function NgoApprovalTrackModal({
  open,
  onClose,
  approvalTrack = [],
  title = "Due Diligence Approval Track",
  versionNumber = null,
}) {
  const trackItems = Array.isArray(approvalTrack) ? approvalTrack : [];

  const getStatusIcon = (action) => {
    const act = String(action || "").toUpperCase();
    if (act.includes("APPROV")) {
      return <CheckCircleFilled style={{ fontSize: 18, color: "#16a34a" }} />;
    }
    if (act.includes("REJECT") || act.includes("REVIS") || act.includes("CHANGE")) {
      return <CloseCircleFilled style={{ fontSize: 18, color: "#dc2626" }} />;
    }
    if (act.includes("SEND") || act.includes("PENDING")) {
      return <SendOutlined style={{ fontSize: 17, color: "#2563eb" }} />;
    }
    return <FileDoneOutlined style={{ fontSize: 17, color: "#7c3aed" }} />;
  };

  const getStatusTag = (action, status) => {
    const act = String(action || status || "").toUpperCase();
    if (act.includes("APPROV")) {
      return <Tag color="success" style={{ fontWeight: 700 }}>APPROVED</Tag>;
    }
    if (act.includes("REJECT") || act.includes("REVIS")) {
      return <Tag color="error" style={{ fontWeight: 700 }}>REVISION REQUESTED</Tag>;
    }
    if (act.includes("SEND") || act.includes("PENDING")) {
      return <Tag color="processing" style={{ fontWeight: 700 }}>SENT FOR APPROVAL</Tag>;
    }
    return <Tag color="purple" style={{ fontWeight: 700 }}>SUBMITTED</Tag>;
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AuditOutlined style={{ color: "#15803d", fontSize: 20 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          {versionNumber && (
            <Tag color="cyan" style={{ fontWeight: 700, borderRadius: 10 }}>
              Version {versionNumber}
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      destroyOnHidden
    >
      <div style={{ padding: "16px 8px 8px 8px", maxHeight: "65vh", overflowY: "auto" }}>
        {trackItems.length === 0 ? (
          <Empty
            description="No approval track entries recorded yet."
            style={{ padding: "32px 0" }}
          />
        ) : (
          <Timeline
            mode="left"
            items={trackItems.slice().reverse().map((item, idx) => {
              const dateStr = item.timestamp
                ? dayjs(item.timestamp).format("DD MMM YYYY, hh:mm A")
                : "—";

              return {
                key: item.id || idx,
                dot: getStatusIcon(item.action || item.status),
                children: (
                  <Card
                    size="small"
                    style={{
                      marginBottom: 12,
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: idx === 0 ? "#f8fafc" : "#ffffff",
                      boxShadow: idx === 0 ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                    }}
                    styles={{ body: { padding: "12px 14px" } }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {getStatusTag(item.action, item.status)}
                        {item.version_number && (
                          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                            v{item.version_number}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11.5, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <CalendarOutlined /> {dateStr}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <UserOutlined style={{ color: "#4f46e5" }} />
                      <span>{item.performed_by_name || "Authorized User"}</span>
                      {item.performed_by_role && (
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500, background: "#f1f5f9", padding: "1px 6px", borderRadius: 6 }}>
                          {item.performed_by_role}
                        </span>
                      )}
                    </div>

                    {item.remarks && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          fontSize: 12.5,
                          color: "#334155",
                          fontStyle: "italic",
                        }}
                      >
                        &ldquo;{item.remarks}&rdquo;
                      </div>
                    )}
                  </Card>
                ),
              };
            })}
          />
        )}
      </div>
    </Modal>
  );
}
