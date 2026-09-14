// client/src/modules/monitoring/MonitoringHubHeader.jsx
// ============================================================
// Monitoring Hub Tab Bar Component
// Renders tabbed navigation matching the monitoring reports breakdown
// ============================================================

import React from "react";
import ProjectHeaderCard from "@/modules/project/ProjectHeaderCard";

export const MONITORING_TABS = [
  { key: "monitoring", label: "Monitoring", form_slug: "monitoring" },
  { key: "monthly_narrative_report", label: "Monthly Narrative Report", form_slug: "monthly_narrative_report" },
  { key: "monthly_review_meeting", label: "Monthly Review Meeting with IA's", form_slug: "monthly_review_meeting" },
  { key: "project_beneficiary", label: "Project Beneficiary", form_slug: "project_beneficiary" },
  { key: "site_visit_report", label: "Site Visit Report", form_slug: "site_visit_report" },
  // { key: "quarterly_submission", label: "Quarterly Submission", form_slug: "quarterly_submission" },
  // { key: "quarterly_review_meeting", label: "Quarterly Review Meeting with IA's", form_slug: "quarterly_review_meeting" },
  // { key: "quarterly_financial_review", label: "Quarterly Financial Review Report", form_slug: "quarterly_financial_review" },
  // { key: "annual_submission", label: "Annual Submission", form_slug: "annual_submission" },
  // { key: "project_collateral", label: "Project Collateral", form_slug: "project_collateral" }
];

const MonitoringHubHeader = ({ projectId, activeTab, onTabChange }) => {
  return (
    <div style={{ padding: "16px 24px 8px 24px", marginBottom: 8 }}>
      {/* 1. Project Info Card */}
      <ProjectHeaderCard projectId={projectId} />

      {/* 2. Monitoring Horizontal Tabs Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: "10px 14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "thin"
        }}
      >
        {MONITORING_TABS.map((t) => {
          const isActive = (activeTab || "monitoring") === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onTabChange && onTabChange(t.key, t.form_slug)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                border: "none",
                background: isActive
                  ? "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"
                  : "transparent",
                color: isActive ? "#ffffff" : "#475569",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isActive ? "0 3px 8px rgba(234, 88, 12, 0.25)" : "none",
                flexShrink: 0
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonitoringHubHeader;
