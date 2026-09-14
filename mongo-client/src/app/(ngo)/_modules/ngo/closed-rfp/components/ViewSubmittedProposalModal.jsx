import React, { useState, useEffect } from "react";
import {
  Modal,
  Descriptions,
  Tag,
  Typography,
  Spin,
  Alert,
  Rate,
  Divider,
  Card,
  Row,
  Col,
  Button,
  Space,
  Empty
} from "antd";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  AuditOutlined,
  DownloadOutlined,
  StarOutlined,
  CommentOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getMyProposalAPI } from "@/services/ngo-service";

const { Title, Text, Paragraph } = Typography;

export default function ViewSubmittedProposalModal({ open, onCancel, rfpRecord }) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const rfpId = rfpRecord?.id;

  useEffect(() => {
    if (open && rfpId) {
      fetchProposalData();
    } else {
      setProposal(null);
      setErrorMsg("");
    }
  }, [open, rfpId]);

  const fetchProposalData = async () => {
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
  };

  const parseCriteriaScores = (raw) => {
    if (!raw) return [];
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(obj)) return obj;
      return Object.entries(obj).map(([key, val]) => ({
        name: key,
        score: typeof val === "object" ? val.score : val,
        remarks: typeof val === "object" ? val.remarks : "",
      }));
    } catch {
      return [];
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("award") || s.includes("select") || s.includes("approv")) return "success";
    if (s.includes("shortlist")) return "processing";
    if (s.includes("reject")) return "error";
    if (s.includes("review")) return "warning";
    return "default";
  };

  const downloadFile = (base64OrUrl, filename) => {
    if (!base64OrUrl) return;
    const a = document.createElement("a");
    a.href = base64OrUrl;
    a.download = filename || "attachment";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const criteriaList = parseCriteriaScores(proposal?.criteria_scores);

  return (
    <Modal
      title={
        <Space>
          <AuditOutlined style={{ color: "#2563eb", fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            My Proposal &amp; CSR Evaluation Details
          </span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      width={900}
      style={{ top: 24, maxWidth: "94vw" }}
      styles={{ body: { maxHeight: "calc(88vh - 120px)", overflowY: "auto", padding: "18px 24px" } }}
      footer={[
        <Button key="close" type="primary" onClick={onCancel} style={{ borderRadius: "8px", minWidth: 90 }}>
          Close
        </Button>
      ]}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b" }}>Loading submission &amp; evaluation data...</div>
        </div>
      ) : errorMsg ? (
        <Alert
          message="Notice"
          description={errorMsg}
          type="info"
          showIcon
          style={{ margin: "20px 0", borderRadius: 8 }}
        />
      ) : !proposal ? (
        <Empty description="No proposal submission found for this RFP." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Header Card: RFP & Outcome Summary */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff",
              padding: "18px 22px",
              borderRadius: "12px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            }}
          >
            <Row align="middle" justify="space-between" gutter={[16, 12]}>
              <Col xs={24} md={16}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                  RFP Submission Record
                </div>
                <Title level={4} style={{ color: "#ffffff", margin: "4px 0 6px", fontWeight: 700 }}>
                  {proposal.project_details || proposal.title || rfpRecord?.title || `RFP #${rfpId}`}
                </Title>
                <Space size={12} wrap>
                  <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    Submitted: {proposal.created_at ? dayjs(proposal.created_at).format("DD MMM YYYY, hh:mm A") : "N/A"}
                  </Text>
                  {proposal.budget && (
                    <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                      <DollarOutlined style={{ marginRight: 4 }} />
                      Proposed Budget: ₹{Number(proposal.budget).toLocaleString("en-IN")}
                    </Text>
                  )}
                </Space>
              </Col>

              <Col xs={24} md={8} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Evaluation Status</div>
                <Tag
                  color={getStatusColor(proposal.final_status || proposal.status)}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 16,
                  }}
                >
                  {(proposal.final_status || proposal.status || "Submitted").toUpperCase()}
                </Tag>
                {proposal.rating && (
                  <div style={{ marginTop: 8 }}>
                    <Rate
                      disabled
                      allowHalf
                      value={parseFloat(proposal.rating) || 0}
                      style={{ fontSize: 14, color: "#facc15" }}
                    />
                    <span style={{ marginLeft: 6, fontWeight: 700, color: "#facc15", fontSize: 13 }}>
                      {parseFloat(proposal.rating).toFixed(1)} / 5
                    </span>
                  </div>
                )}
              </Col>
            </Row>
          </div>

          {/* Reviewer Feedback Section */}
          {(proposal.evaluation_notes || criteriaList.length > 0) && (
            <Card
              size="small"
              title={
                <Space>
                  <CommentOutlined style={{ color: "#e11d48" }} />
                  <span style={{ fontWeight: 700 }}>CSR Reviewer Feedback &amp; Criteria Scoring</span>
                </Space>
              }
              style={{ borderRadius: 10, borderColor: "#fed7aa", background: "#fff7ed" }}
            >
              {proposal.evaluation_notes && (
                <div style={{ marginBottom: criteriaList.length ? 12 : 0 }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: "block" }}>
                    Committee Notes / Feedback:
                  </Text>
                  <Paragraph style={{ margin: "4px 0 0", fontSize: 13.5, color: "#334155" }}>
                    {proposal.evaluation_notes}
                  </Paragraph>
                </div>
              )}

              {criteriaList.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Evaluation Criteria Breakdown:
                  </Text>
                  <Row gutter={[10, 10]}>
                    {criteriaList.map((crit, idx) => (
                      <Col xs={24} sm={12} key={idx}>
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: "1px solid #fed7aa",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1e293b" }}>{crit.name}</span>
                            <Tag color="blue" style={{ fontWeight: 700 }}>
                              {crit.score !== undefined ? `${crit.score} pts` : "Evaluated"}
                            </Tag>
                          </div>
                          {crit.remarks && (
                            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>{crit.remarks}</div>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Card>
          )}

          {/* Proposal Narrative Details */}
          <Descriptions
            bordered
            size="middle"
            column={1}
            style={{ background: "#ffffff", borderRadius: 8, overflow: "hidden" }}
          >
            {proposal.organization_profile && (
              <Descriptions.Item label={<strong style={{ width: 150, display: "inline-block" }}>Organization Profile</strong>}>
                {proposal.organization_profile}
              </Descriptions.Item>
            )}
            {proposal.project_understanding && (
              <Descriptions.Item label={<strong>Project Understanding</strong>}>
                {proposal.project_understanding}
              </Descriptions.Item>
            )}
            {proposal.methodology && (
              <Descriptions.Item label={<strong>Methodology &amp; Approach</strong>}>
                {proposal.methodology}
              </Descriptions.Item>
            )}
            {proposal.implementation_plan && (
              <Descriptions.Item label={<strong>Implementation Plan</strong>}>
                {proposal.implementation_plan}
              </Descriptions.Item>
            )}
            {proposal.team && (
              <Descriptions.Item label={<strong>Team Composition</strong>}>
                {proposal.team}
              </Descriptions.Item>
            )}
            {proposal.timeline && (
              <Descriptions.Item label={<strong>Project Timeline</strong>}>
                {proposal.timeline}
              </Descriptions.Item>
            )}
            {proposal.risk_plan && (
              <Descriptions.Item label={<strong>Risk Mitigation Plan</strong>}>
                {proposal.risk_plan}
              </Descriptions.Item>
            )}
            {proposal.sustainability && (
              <Descriptions.Item label={<strong>Sustainability Plan</strong>}>
                {proposal.sustainability}
              </Descriptions.Item>
            )}
            {proposal.monitoring_framework && (
              <Descriptions.Item label={<strong>Monitoring Framework</strong>}>
                {proposal.monitoring_framework}
              </Descriptions.Item>
            )}
            {proposal.previous_experience && (
              <Descriptions.Item label={<strong>Past Track Record</strong>}>
                {proposal.previous_experience}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Attachments Section */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              Uploaded Proposal Documents
            </div>
            <Row gutter={[10, 10]}>
              {[
                { label: "Technical Proposal (PDF)", data: proposal.proposal_pdf, ext: "pdf" },
                { label: "Financial Budget (Excel)", data: proposal.budget_excel, ext: "xlsx" },
                { label: "Key Personnel CVs", data: proposal.team_cvs, ext: "pdf" },
                { label: "Case Studies / Credentials", data: proposal.case_studies, ext: "pdf" },
              ].map((doc, idx) => (
                <Col xs={24} sm={12} key={idx}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: doc.data ? "#f8fafc" : "#f1f5f9",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Space>
                      <FileTextOutlined style={{ color: doc.data ? "#2563eb" : "#94a3b8", fontSize: 16 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: doc.data ? "#0f172a" : "#94a3b8" }}>
                        {doc.label}
                      </span>
                    </Space>
                    {doc.data ? (
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => downloadFile(doc.data, `${doc.label.replace(/[^a-z0-9]/gi, "_")}.${doc.ext}`)}
                        style={{ borderRadius: 6, fontSize: 11 }}
                      >
                        Download
                      </Button>
                    ) : (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>Not Attached</span>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}
    </Modal>
  );
}
