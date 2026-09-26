import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Tag,
  Typography,
  Spin,
  Alert,
  Card,
  Row,
  Col,
  Button,
  Space,
  Empty,
  Tabs,
  Progress,
  Divider,
  Tooltip,
  Table
} from "antd";
import {
  FileTextOutlined,
  CalendarOutlined,
  AuditOutlined,
  CommentOutlined,
  TrophyOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  RocketOutlined,
  SafetyCertificateOutlined,
  DollarCircleOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  EyeOutlined,
  BankOutlined,
  ArrowRightOutlined,
  StarFilled
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { getMyProposalAPI } from "@/services/ngo-service";
import { dynamicSchemaDetailsAPI } from "@/services/dynamicForm-service";
import NgoDetailsView from "@/app/(ngo)/_components/NgoDetailsView";

const { Title, Text, Paragraph } = Typography;

export default function ViewSubmittedProposalModal({
  open,
  onCancel,
  rfpRecord,
  formSlug = "rfp_submission"
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [schemaData, setSchemaData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("evaluation");

  const rfpId = rfpRecord?.id;

  const fetchSchema = useCallback(async () => {
    try {
      const res = await dynamicSchemaDetailsAPI({ form_slug: formSlug || "rfp_submission" });
      if (res.data?.success && res.data?.data) {
        setSchemaData(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch proposal form schema:", err);
    }
  }, [formSlug]);

  const fetchProposalData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await getMyProposalAPI(rfpId);
      if (res.data?.success && res.data?.data) {
        setProposal(res.data.data);
      } else {
        setErrorMsg(res.data?.message || "Proposal submission details not found.");
      }
    } catch (err) {
      console.error("Failed to load proposal details:", err);
      setErrorMsg(err.response?.data?.message || "Failed to load submitted proposal details.");
    } finally {
      setLoading(false);
    }
  }, [rfpId]);

  useEffect(() => {
    if (open && rfpId) {
      setActiveTab("evaluation");
      fetchSchema();
      fetchProposalData();
    } else {
      setProposal(null);
      setErrorMsg("");
    }
  }, [open, rfpId, fetchSchema, fetchProposalData]);

  const parseCriteriaScores = (raw) => {
    if (!raw) return [];
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(obj)) {
        return obj.map((item, idx) => ({
          name: item.criterion_name || item.criteria_name || item.name || `Evaluation Indicator ${idx + 1}`,
          score: item.score !== undefined ? Number(item.score) : 0,
          weightage: item.weightage !== undefined ? Number(item.weightage) : 10,
          weighted_score:
            item.weighted_score !== undefined
              ? Number(item.weighted_score)
              : (((Number(item.score || 0)) / 10) * (Number(item.weightage || 10))),
          remarks: item.org_details || item.details || item.remarks || item.comment || "",
        }));
      }
      return Object.entries(obj).map(([key, val], idx) => ({
        name: key || `Evaluation Indicator ${idx + 1}`,
        score: typeof val === "object" ? Number(val.score || 0) : Number(val || 0),
        weightage: typeof val === "object" ? Number(val.weightage || 10) : 10,
        weighted_score: typeof val === "object" && val.weighted_score ? Number(val.weighted_score) : 0,
        remarks: typeof val === "object" ? (val.remarks || val.org_details || "") : "",
      }));
    } catch {
      return [];
    }
  };

  const criteriaList = parseCriteriaScores(proposal?.criteria_scores);

  const totalMaxWeightage = criteriaList.length > 0
    ? criteriaList.reduce((sum, c) => sum + (c.weightage || 10), 0)
    : 80;

  const totalEarnedScore = proposal?.rating !== undefined && proposal?.rating !== null && proposal?.rating !== ""
    ? Number(proposal.rating)
    : criteriaList.reduce((sum, c) => sum + (Number(c.weighted_score) || 0), 0);

  const scorePercentage = totalMaxWeightage > 0
    ? Math.min(100, Math.round((totalEarnedScore / totalMaxWeightage) * 100))
    : 0;

  const rawStatus = String(proposal?.final_status || proposal?.status || "").trim();
  const isSelected =
    rawStatus.toLowerCase().includes("select") ||
    rawStatus.toLowerCase().includes("award") ||
    String(proposal?.rfp?.status || "").toLowerCase().includes("selected") ||
    String(proposal?.rfp?.tagged_ngo_id) === String(proposal?.id);

  const isApproved = rawStatus.toLowerCase().includes("approv") || isSelected;
  const isEvaluated = rawStatus.toLowerCase().includes("evaluat") || criteriaList.length > 0;
  const isRejected = rawStatus.toLowerCase().includes("reject");

  // Merge submitted proposal record with dynamic child collections
  const mergedProposalRecord = proposal
    ? {
        ...proposal,
        documents: proposal.documents || [],
        t_documents: proposal.documents || [],
        format_of_budget: proposal.format_of_budget || [],
        t_format_of_budget: proposal.format_of_budget || [],
      }
    : {};

  return (
    <Modal
      className="rfp-gradient-modal"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="rfp-modal-icon-badge">
            {isSelected ? <TrophyOutlined style={{ color: "#059669" }} /> : <AuditOutlined />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#ffffff", lineHeight: 1.3 }}>
              My Proposal &amp; CSR Evaluation Details
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.92)" }}>
              RFP Ref: #{rfpId} • {proposal?.title || rfpRecord?.title || "Request for Proposal"}
            </p>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      width={1180}
      style={{ top: 20, maxWidth: "96vw" }}
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
          type="primary"
          onClick={onCancel}
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            border: "none",
            borderRadius: 8,
            minWidth: 110,
            height: 38,
            fontWeight: 700,
          }}
        >
          Close
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 14, color: "#64748b", fontWeight: 600, fontSize: 13 }}>
            Loading proposal submission and evaluation data...
          </div>
        </div>
      ) : errorMsg ? (
        <Alert
          message="Proposal Status Notice"
          description={errorMsg}
          type="info"
          showIcon
          style={{ margin: "24px 0", borderRadius: 10 }}
        />
      ) : !proposal ? (
        <Empty description="No proposal submission found for this RFP." style={{ padding: "60px 0" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ── Top Summary Header Hero Card ── */}
          <div
            style={{
              background: isSelected
                ? "linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)"
                : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff",
              padding: "20px 24px",
              borderRadius: "14px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              border: isSelected ? "1.5px solid #34d399" : "1px solid #334155",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isSelected && (
              <div
                style={{
                  position: "absolute",
                  right: -20,
                  top: -20,
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />
            )}

            <Row align="middle" justify="space-between" gutter={[16, 16]}>
              <Col xs={24} md={15}>
                <Space size={8} style={{ marginBottom: 6 }}>
                  <Tag
                    color={isSelected ? "gold" : "blue"}
                    style={{
                      borderRadius: 6,
                      fontWeight: 800,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      paddingInline: 8,
                    }}
                  >
                    {isSelected ? "🏆 Selected Partner" : "RFP Submission Record"}
                  </Tag>
                  <Tag style={{ borderRadius: 6, background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "none", fontSize: 11 }}>
                    RFP #{rfpId}
                  </Tag>
                </Space>

                <Title level={4} style={{ color: "#ffffff", margin: "2px 0 8px", fontWeight: 800, fontSize: 18 }}>
                  {proposal.project_details || proposal.title || rfpRecord?.title || `Request for Proposal #${rfpId}`}
                </Title>

                <Space size={16} wrap>
                  <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                    <CalendarOutlined style={{ marginRight: 5, color: "#60a5fa" }} />
                    Submitted: <strong>{proposal.created_at ? dayjs(proposal.created_at).format("DD MMM YYYY, hh:mm A") : "—"}</strong>
                  </Text>
                  {proposal.name_of_the_organization && (
                    <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                      <BankOutlined style={{ marginRight: 5, color: "#34d399" }} />
                      Organization: <strong>{proposal.name_of_the_organization}</strong>
                    </Text>
                  )}
                </Space>
              </Col>

              <Col xs={24} md={9} style={{ textAlign: "right" }}>
                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <Tag
                    color={
                      isSelected
                        ? "success"
                        : isApproved
                        ? "cyan"
                        : isRejected
                        ? "error"
                        : isEvaluated
                        ? "processing"
                        : "default"
                    }
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      padding: "5px 16px",
                      borderRadius: 20,
                      letterSpacing: "0.5px",
                      margin: 0,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}
                  >
                    {isSelected
                      ? "🏆 SELECTED & AWARDED"
                      : (proposal.final_status || proposal.status || "SUBMITTED").toUpperCase()}
                  </Tag>

                  {/* Evaluation Score Pill */}
                  {totalEarnedScore > 0 && (
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        backdropFilter: "blur(6px)",
                        borderRadius: 10,
                        padding: "6px 12px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <StarFilled style={{ color: "#facc15", fontSize: 15 }} />
                      <span style={{ fontSize: 12, color: "#cbd5e1" }}>Evaluation Score:</span>
                      <strong style={{ fontSize: 14, color: "#facc15" }}>
                        {totalEarnedScore.toFixed(1)} / {totalMaxWeightage} pts
                      </strong>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </div>

          {/* ── Tabs Navigation ── */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            style={{ marginTop: 4 }}
            items={[
              {
                key: "evaluation",
                label: (
                  <span style={{ fontWeight: 700 }}>
                    <CommentOutlined style={{ marginRight: 6 }} />
                    CSR Evaluation &amp; Results
                  </span>
                ),
              },
              {
                key: "proposal_form",
                label: (
                  <span style={{ fontWeight: 700 }}>
                    <FileTextOutlined style={{ marginRight: 6 }} />
                    Full Proposal Form
                  </span>
                ),
              },
            ]}
          />

          {/* ── TAB 1: Evaluation Outcome, Feedback & Selected Highlights ── */}
          {activeTab === "evaluation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* If Selected: Hero Awarded Partner Celebration Banner */}
              {isSelected && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    border: "1.5px solid #86efac",
                    borderRadius: 14,
                    padding: "20px 24px",
                    boxShadow: "0 4px 12px rgba(22, 163, 74, 0.08)",
                  }}
                >
                  <Row orientation="horizontal" align="middle" gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: "#22c55e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            fontSize: 24,
                            flexShrink: 0,
                            boxShadow: "0 4px 10px rgba(34, 197, 94, 0.3)",
                          }}
                        >
                          <TrophyOutlined />
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 17, color: "#14532d", display: "block" }}>
                            Congratulations! Your Organization is Selected as Implementation Partner
                          </Text>
                          <Paragraph style={{ margin: "4px 0 0", color: "#166534", fontSize: 13 }}>
                            Your proposal for <strong>{proposal.project_details || proposal.title || `RFP #${rfpId}`}</strong> has been evaluated and approved by the CSR Committee. You have been officially awarded this project.
                          </Paragraph>
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} lg={8} style={{ textAlign: "right" }}>
                      <Space wrap size={10}>
                        <Button
                          type="primary"
                          icon={<RocketOutlined />}
                          onClick={() => router.push("/ngo/projects")}
                          style={{
                            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                            borderRadius: 8,
                            fontWeight: 700,
                            height: 38,
                            boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                          }}
                        >
                          Go to My Projects
                        </Button>
                        <Button
                          icon={<SafetyCertificateOutlined />}
                          onClick={() => router.push("/ngo/dd")}
                          style={{
                            borderRadius: 8,
                            fontWeight: 600,
                            height: 38,
                          }}
                        >
                          Due Diligence
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Divider style={{ margin: "16px 0 14px", borderColor: "#bbf7d0" }} />

                  {/* Next Steps Roadmap */}
                  <div>
                    <Text strong style={{ fontSize: 13, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      📋 Implementation Partner Onboarding Roadmap:
                    </Text>
                    <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
                      <Col xs={24} sm={8}>
                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                          <Text strong style={{ color: "#15803d", fontSize: 13, display: "block" }}>
                            1. MOU &amp; Agreement
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            CSR Administration initiates the formal MOU agreement.
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                          <Text strong style={{ color: "#15803d", fontSize: 13, display: "block" }}>
                            2. Due Diligence Check
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Ensure compliance certificates (12A, 80G, CSR-1) are active.
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                          <Text strong style={{ color: "#15803d", fontSize: 13, display: "block" }}>
                            3. Milestone Kick-off
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Commence project activities and quarterly progress reporting.
                          </Text>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              )}

              {/* Committee Overall Feedback Card */}
              {proposal.evaluation_notes && (
                <Card
                  title={
                    <Space>
                      <CommentOutlined style={{ color: "#0284c7" }} />
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>CSR Committee Evaluation Feedback</span>
                    </Space>
                  }
                  style={{ borderRadius: 14, border: "1px solid #bae6fd", background: "#f0f9ff" }}
                  styles={{ body: { padding: "16px 20px" } }}
                >
                  <Paragraph style={{ margin: 0, fontSize: 14, color: "#0369a1", fontStyle: "italic", lineHeight: 1.6 }}>
                    "{proposal.evaluation_notes}"
                  </Paragraph>
                </Card>
              )}

              {/* Score Meter & Criteria Matrix Card */}
              <Card
                title={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <Space>
                      <StarFilled style={{ color: "#eab308" }} />
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>Criteria-by-Criteria Assessment Breakdown</span>
                    </Space>
                    <Tag color="green" style={{ fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 10px", margin: 0 }}>
                      Total Score: {totalEarnedScore.toFixed(1)} / {totalMaxWeightage} pts ({scorePercentage}%)
                    </Tag>
                  </div>
                }
                style={{ borderRadius: 14, border: "1px solid #e2e8f0", background: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
                styles={{ body: { padding: "18px 20px" } }}
              >
                {/* Progress bar visual */}
                <div style={{ marginBottom: 20, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 13, color: "#334155" }}>Overall Evaluation Score Fulfillment</Text>
                    <Text strong style={{ fontSize: 13, color: isSelected ? "#15803d" : "#0284c7" }}>
                      {totalEarnedScore.toFixed(1)} / {totalMaxWeightage} Points
                    </Text>
                  </div>
                  <Progress
                    percent={scorePercentage}
                    strokeColor={{
                      "0%": "#0284c7",
                      "100%": isSelected ? "#10b981" : "#3b82f6",
                    }}
                    status="active"
                  />
                </div>

                {/* Criteria Cards Grid */}
                {criteriaList.length === 0 ? (
                  <Empty description="No individual criteria scores recorded for this proposal." />
                ) : (
                  <Row gutter={[14, 14]}>
                    {criteriaList.map((crit, idx) => (
                      <Col xs={24} sm={12} key={idx}>
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "14px 16px",
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                              <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                                {crit.name}
                              </Text>
                              <Space size={6}>
                                <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                                  Score: {crit.score} / 10
                                </Tag>
                                <Tag color="green" style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                                  Wt: {Number(crit.weighted_score).toFixed(1)} pts
                                </Tag>
                              </Space>
                            </div>
                            {crit.remarks ? (
                              <div style={{ fontSize: 12, color: "#475569", background: "#f8fafc", padding: "6px 10px", borderRadius: 6, border: "1px dashed #cbd5e1" }}>
                                💬 <em>{crit.remarks}</em>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11.5, color: "#94a3b8", fontStyle: "italic" }}>
                                No specific remarks entered.
                              </div>
                            )}
                          </div>

                          <div style={{ marginTop: 10, fontSize: 11, color: "#64748b", textAlign: "right" }}>
                            Max Weightage: <strong>{crit.weightage || 10} pts</strong>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card>
            </div>
          )}

          {/* ── TAB 2: Full Submitted Proposal Form (Dynamic Form View) ── */}
          {activeTab === "proposal_form" && (
            <Card
              title={
                <Space>
                  <FileTextOutlined style={{ color: "#2563eb" }} />
                  <span style={{ fontWeight: 700 }}>Submitted Proposal Details (Form Record)</span>
                </Space>
              }
              style={{ borderRadius: 14, border: "1px solid #e2e8f0" }}
              styles={{ body: { padding: "20px 24px" } }}
            >
              {schemaData ? (
                <NgoDetailsView
                  schema={schemaData}
                  data={mergedProposalRecord}
                  hasRecord={true}
                  emptyPlaceholder="Not provided"
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Spin />
                  <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
                    Loading dynamic schema...
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </Modal>
  );
}
