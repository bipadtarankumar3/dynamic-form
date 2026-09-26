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
    <div style={{ marginBottom: 12 }}>
      {/* 1. Project Info Card */}
      <ProjectHeaderCard projectId={projectId} />

      {/* 2. Monitoring Horizontal Tabs Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 14,
          padding: "6px 8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
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
                padding: "8px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                border: isActive ? "1px solid #059669" : "1px solid transparent",
                background: isActive
                  ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                  : "transparent",
                color: isActive ? "#ffffff" : "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease-in-out",
                boxShadow: isActive ? "0 3px 10px rgba(5, 150, 105, 0.25)" : "none",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#0f172a";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#475569";
                }
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
