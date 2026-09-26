// client/src/modules/project/ProjectHeaderCard.jsx
// ============================================================
// Premium Project Header Card Component
// Loaded via Dynamic Form Hooks on Child Form pages (e.g., Monitoring)
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { Tag, Spin, Button, Tooltip } from "antd";
import {
  FolderOpenOutlined,
  CalendarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  AimOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined
} from "@ant-design/icons";
import { dynamicFormViewAPI } from "@/services/dynamicForm-service";

const ProjectHeaderCard = ({ projectId }) => {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await dynamicFormViewAPI("dynamic-form/view", {
        form_slug: "project",
        selected_data: { id: projectId }
      });
      if (res?.data?.success || res?.data?.data) {
        setProjectData(res.data.data || res.data);
      }
    } catch (err) {
      console.error("[ProjectHeaderCard] Error fetching project:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  if (!projectId) return null;

  // Format Helper
  const formatDate = (dStr) => {
    if (!dStr) return "—";
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dStr;
    }
  };

  // Location string construction
  const locations = projectData?.project_project_location || [];
  const locationStr = locations.length > 0
    ? locations.map(l => [l.block, l.state_name_state || l.name_state].filter(Boolean).join(", ")).join(" | ")
    : (projectData?.tentative_area_covered || "—");

  // Total budget calculation
  const budgetList = projectData?.project_project_budget || [];
  const totalBudget = budgetList.reduce((acc, curr) => acc + (parseFloat(curr.total_amount || curr.amount) || 0), 0);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: "18px 22px",
        marginBottom: 14,
        boxShadow: "0 2px 12px -2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
        position: "relative",
      }}
    >
      {loading && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)",
          borderRadius: 16, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(2px)",
        }}>
          <Spin size="small" />
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
            flexShrink: 0
          }}>
            <FolderOpenOutlined style={{ color: "#ffffff", fontSize: 20 }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                {projectData?.project_title || `Project #${projectId}`}
              </span>
              <Tag
                style={{
                  background: "#f0fdf4",
                  color: "#15803d",
                  borderColor: "#bbf7d0",
                  fontWeight: 700,
                  borderRadius: 6,
                  fontSize: 11,
                  margin: 0,
                  padding: "1px 8px",
                }}
              >
                Project #{projectId}
              </Tag>
              {projectData?.project_type && (
                <Tag
                  style={{
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    borderColor: "#bfdbfe",
                    fontWeight: 600,
                    borderRadius: 6,
                    fontSize: 11,
                    margin: 0,
                    padding: "1px 8px",
                    textTransform: "capitalize",
                  }}
                >
                  {String(projectData.project_type).replace(/_/g, " ")}
                </Tag>
              )}
              {projectData?.project_category && (
                <Tag
                  style={{
                    background: "#f0fdfa",
                    color: "#0f766e",
                    borderColor: "#99f6e4",
                    fontWeight: 600,
                    borderRadius: 6,
                    fontSize: 11,
                    margin: 0,
                    padding: "1px 8px",
                    textTransform: "capitalize",
                  }}
                >
                  {String(projectData.project_category).replace(/_/g, " ")}
                </Tag>
              )}
            </div>

            {/* Sub-header meta line */}
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 5, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontWeight: 500 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <CalendarOutlined style={{ color: "#059669" }} />
                {formatDate(projectData?.project_duration_start_date)} – {formatDate(projectData?.project_duration_end_date)}
              </span>
              {locationStr && locationStr !== "—" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <EnvironmentOutlined style={{ color: "#0284c7" }} />
                  {locationStr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action button & expand toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tooltip title="Reload Project Info">
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={fetchProjectDetails}
              style={{ borderRadius: 8, borderColor: "#e2e8f0" }}
            />
          </Tooltip>
          {projectData?.project_initiative_details && (
            <Button
              size="small"
              type="text"
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setExpanded(!expanded)}
              style={{ fontSize: 12, color: "#059669", fontWeight: 700, borderRadius: 6 }}
            >
              {expanded ? "Less Details" : "More Details"}
            </Button>
          )}
        </div>
      </div>

      {/* Highlights Grid */}
      <div style={{
        marginTop: 14,
        paddingTop: 12,
        borderTop: "1px solid #f1f5f9",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 10
      }}>
        {/* Stat Item 1: SDG Goal */}
        <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 10, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <AimOutlined style={{ color: "#059669" }} /> SDG Goal
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {projectData?.goal_sdg_goal || projectData?.sdg_goal || "—"}
          </div>
        </div>

        {/* Stat Item 2: Beneficiaries */}
        <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 10, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <TeamOutlined style={{ color: "#0284c7" }} /> Beneficiaries
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
            {Number(projectData?.tentative_beneficiary_number_direct || 0).toLocaleString()} Direct
            {projectData?.tentative_beneficiary_number_indirect > 0 && ` | ${Number(projectData.tentative_beneficiary_number_indirect).toLocaleString()} Indirect`}
          </div>
        </div>

        {/* Stat Item 3: Budget */}
        {totalBudget > 0 && (
          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 10, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <DollarOutlined style={{ color: "#d97706" }} /> Total Budget
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#d97706", marginTop: 2 }}>
              ₹ {totalBudget.toLocaleString("en-IN")}
            </div>
          </div>
        )}

        {/* Stat Item 4: Schedule VII */}
        {projectData?.schedule_vii_name_schedule_vii && (
          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 10, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <InfoCircleOutlined style={{ color: "#7c3aed" }} /> Schedule VII
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={projectData.schedule_vii_name_schedule_vii}>
              {projectData.schedule_vii_name_schedule_vii}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Initiative Details */}
      {expanded && projectData?.project_initiative_details && (
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: "1px dashed #e2e8f0",
          fontSize: 12.5, color: "#475569", lineHeight: 1.6, background: "#f8fafc", padding: "10px 14px", borderRadius: 8
        }}>
          <strong style={{ color: "#1e293b" }}>Initiative Details:</strong> {projectData.project_initiative_details}
        </div>
      )}
    </div>
  );
};

export default ProjectHeaderCard;
