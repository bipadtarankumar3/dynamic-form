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
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "20px 24px",
        marginBottom: 16,
        boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
        position: "relative"
      }}
    >
      {loading && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)",
          borderRadius: 14, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Spin size="small" />
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 10px rgba(234, 88, 12, 0.25)",
            flexShrink: 0
          }}>
            <FolderOpenOutlined style={{ color: "#ffffff", fontSize: 22 }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                {projectData?.project_title || `Project #${projectId}`}
              </span>
              <Tag color="orange" style={{ fontWeight: 700, borderRadius: 6, fontSize: 11, margin: 0 }}>
                Project #{projectId}
              </Tag>
              {projectData?.project_type && (
                <Tag color="blue" style={{ borderRadius: 6, fontSize: 11, margin: 0, textTransform: "capitalize" }}>
                  {String(projectData.project_type).replace(/_/g, " ")}
                </Tag>
              )}
              {projectData?.project_category && (
                <Tag color="cyan" style={{ borderRadius: 6, fontSize: 11, margin: 0, textTransform: "capitalize" }}>
                  {String(projectData.project_category).replace(/_/g, " ")}
                </Tag>
              )}
            </div>

            {/* Sub-header meta line */}
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span>
                <CalendarOutlined style={{ color: "#ea580c", marginRight: 5 }} />
                {formatDate(projectData?.project_duration_start_date)} - {formatDate(projectData?.project_duration_end_date)}
              </span>
              <span>
                <EnvironmentOutlined style={{ color: "#0284c7", marginRight: 5 }} />
                {locationStr}
              </span>
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
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
          {projectData?.project_initiative_details && (
            <Button
              size="small"
              type="text"
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setExpanded(!expanded)}
              style={{ fontSize: 12, color: "#ea580c", fontWeight: 600 }}
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
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12
      }}>
        {/* Stat Item 1: SDG Goal */}
        <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <AimOutlined style={{ color: "#16a34a" }} /> SDG Goal
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {projectData?.goal_sdg_goal || projectData?.sdg_goal || "—"}
          </div>
        </div>

        {/* Stat Item 2: Beneficiaries */}
        <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <TeamOutlined style={{ color: "#0284c7" }} /> Beneficiaries
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
            {Number(projectData?.tentative_beneficiary_number_direct || 0).toLocaleString()} Direct
            {projectData?.tentative_beneficiary_number_indirect > 0 && ` | ${Number(projectData.tentative_beneficiary_number_indirect).toLocaleString()} Indirect`}
          </div>
        </div>

        {/* Stat Item 3: Budget */}
        {totalBudget > 0 && (
          <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <DollarOutlined style={{ color: "#d97706" }} /> Total Budget
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#d97706", marginTop: 2 }}>
              ₹ {totalBudget.toLocaleString()}
            </div>
          </div>
        )}

        {/* Stat Item 4: Schedule VII */}
        {projectData?.schedule_vii_name_schedule_vii && (
          <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <InfoCircleOutlined style={{ color: "#8b5cf6" }} /> Schedule VII
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
          marginTop: 12, paddingTop: 10, borderTop: "1px dashed #cbd5e1",
          fontSize: 12, color: "#475569", lineHeight: 1.6
        }}>
          <strong>Initiative Details:</strong> {projectData.project_initiative_details}
        </div>
      )}
    </div>
  );
};

export default ProjectHeaderCard;
