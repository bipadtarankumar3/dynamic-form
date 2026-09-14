"use client";
import React from "react";
import { Tag } from "antd";

const ACTION_COLOR_MAP = {
  approve: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", label: "Approve" },
  reject: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", label: "Reject" },
  resend: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", label: "Resend / Info" },
  pull_back: { bg: "#fefce8", border: "#fef08a", text: "#854d0e", label: "Pull Back" },
  forward: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", label: "Forward" },
  review: { bg: "#faf5ff", border: "#e9d5ff", text: "#6b21a8", label: "Review" },
};

export const StepActionBadges = ({ actions = [] }) => {
  const acts = Array.isArray(actions) ? actions : actions ? [actions] : ["approve", "reject"];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {acts.map((act) => {
        const meta = ACTION_COLOR_MAP[act] || {
          bg: "#f8fafc",
          border: "#e2e8f0",
          text: "#475569",
          label: act,
        };
        return (
          <span
            key={act}
            style={{
              display: "inline-block",
              background: meta.bg,
              border: `1px solid ${meta.border}`,
              color: meta.text,
              fontSize: "11px",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
};

export default StepActionBadges;
