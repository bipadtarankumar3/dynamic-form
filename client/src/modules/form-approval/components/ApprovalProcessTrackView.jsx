import React from "react";
import { Empty, Tag } from "antd";
import { formatDate, getTrackStatusConfig } from "../utils/formApprovalHelpers";
import "../form-approval.css";

export default function ApprovalProcessTrackView({ trackList = [] }) {
  if (!trackList || trackList.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No approval process tracking records yet"
      />
    );
  }

  return (
    <div className="fap-step-assign-list">
      {trackList.map((item, idx) => {
        const config = getTrackStatusConfig(item);

        return (
          <div
            key={item.apt_id || idx}
            className="fap-track-card"
            style={{
              background: config.bgGradient,
              border: `1.5px solid ${config.borderColor}`,
              borderLeft: `5px solid ${config.accentBar}`,
            }}
          >
            {/* Header: Status Tag & Step Title + Timestamp */}
            <div className="fap-track-header">
              <div className="fap-collapse-title-row">
                <span
                  className="fap-track-tag"
                  style={{
                    background: config.tagBg,
                    color: config.tagText,
                    border: `1px solid ${config.tagBorder}`,
                  }}
                >
                  {config.icon}
                  {config.tagLabel}
                </span>
                <span className="fap-track-step-name">
                  {item.apt_accept_step || "Workflow Action"}
                </span>
              </div>
              <div className="fap-track-date">
                📅 {formatDate(item.apt_created_at)}
              </div>
            </div>

            {/* Details: Actor & Recipient */}
            <div className="fap-track-grid" style={{ border: `1px solid ${config.borderColor}` }}>
              <div>
                👤 <strong className="fap-track-actor-label">Action By:</strong>{" "}
                <span className="fap-track-actor-name">
                  {item.user_name || item.user_email || `User #${item.apt_user_id}`}
                </span>{" "}
                <Tag color="blue" className="fap-step-tag">
                  {item.apt_user_role || "User"}
                </Tag>
              </div>

              {(item.recipient_name || item.recipient_email || item.apt_recipient_role) && (
                <div>
                  📧 <strong className="fap-track-actor-label">Assigned To:</strong>{" "}
                  <span className="fap-track-actor-name">
                    {item.recipient_name || item.recipient_email || `User #${item.apt_recipient_id}`}
                  </span>{" "}
                  {item.apt_recipient_role && (
                    <Tag color="purple" className="fap-step-tag">
                      {item.apt_recipient_role}
                    </Tag>
                  )}
                </div>
              )}
            </div>

            {/* Remarks */}
            {item.apt_remarks && (
              <div
                className="fap-track-remarks"
                style={{
                  borderLeft: `3.5px solid ${config.accentBar}`,
                  border: `1px solid ${config.borderColor}`,
                  borderLeftWidth: "3.5px",
                }}
              >
                💬 <strong style={{ color: config.accentBar }}>Remarks:</strong> &ldquo;{item.apt_remarks}&rdquo;
              </div>
            )}

            {/* Footer Metadata */}
            <div className="fap-track-footer">
              <span>
                Track ID: <code style={{ color: config.accentBar, fontWeight: 700 }}>{item.apt_id}</code>
              </span>
              <span>
                Status Flag:{" "}
                <strong
                  style={{
                    color: config.tagText,
                    background: config.tagBg,
                    padding: "1px 6px",
                    borderRadius: 6,
                  }}
                >
                  {item.apt_status_flag || "—"}
                </strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
