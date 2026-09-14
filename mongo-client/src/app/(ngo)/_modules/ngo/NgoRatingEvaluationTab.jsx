import React, { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Rate,
  Tag,
  Button,
  Input,
  Select,
  message,
  Space,
  Typography,
  Spin,
  Empty,
  Divider,
  Row,
  Col
} from "antd";
import {
  StarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  FileTextOutlined,
  UserOutlined,
  SaveOutlined
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function NgoRatingEvaluationTab() {
  const [loading, setLoading] = useState(false);
  const [rfpList, setRfpList] = useState([]);
  const [selectedRfpId, setSelectedRfpId] = useState(null);
  const [selectedRfp, setSelectedRfp] = useState(null);
  const [ngoSubmissions, setNgoSubmissions] = useState([]);
  const [activeNgoTabKey, setActiveNgoTabKey] = useState(null);
  
  // Rating form state per NGO
  const [evaluations, setEvaluations] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch List of Floated RFPs
  const fetchRfps = async () => {
    try {
      setLoading(true);
      const res = await privateHttpClient.post("admin/forms/request_for_proposal/list-view", { limit: 100, page: 1 });
      const rows = res.data?.data || res.data?.rows || [];
      setRfpList(rows);
      if (rows.length > 0) {
        setSelectedRfpId(rows[0].id);
        setSelectedRfp(rows[0]);
      }
    } catch (err) {
      console.error("Failed to fetch RFPs:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Submissions for Selected RFP
  const fetchSubmissionsForRfp = async (rfpId, rfpObj) => {
    try {
      setLoading(true);
      const [subRes, dueRes] = await Promise.allSettled([
        privateHttpClient.post("admin/forms/rfp_proposal_submission/list-view", { limit: 100, page: 1 }),
        privateHttpClient.post("admin/forms/partner_due_dilligence/list-view", { limit: 100, page: 1 })
      ]);

      const subRows = (subRes.status === "fulfilled" && (subRes.value.data?.data || subRes.value.data?.rows)) || [];
      const dueRows = (dueRes.status === "fulfilled" && (dueRes.value.data?.data || dueRes.value.data?.rows)) || [];

      const allRows = [...subRows, ...dueRows];

      // Filter rows belonging to selected RFP if rfp_id present, or show all submissions
      const filtered = allRows.filter(r => String(r.rfp_id) === String(rfpId) || !rfpId);

      setNgoSubmissions(filtered);

      // Initialize rating evaluation state map for each NGO
      const evalMap = {};
      filtered.forEach((sub, idx) => {
        const subId = sub.id || idx;
        evalMap[subId] = {
          rating: sub.rating || 5,
          final_status: sub.final_status || "Shortlisted",
          evaluation_notes: sub.evaluation_notes || "",
          criteria_scores: sub.criteria_scores || {}
        };
      });
      setEvaluations(evalMap);

      if (filtered.length > 0) {
        setActiveNgoTabKey(String(filtered[0].id || 0));
      } else {
        setActiveNgoTabKey(null);
      }
    } catch (err) {
      console.error("Failed to fetch NGO submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfps();
  }, []);

  useEffect(() => {
    if (selectedRfpId) {
      const match = rfpList.find(r => String(r.id) === String(selectedRfpId));
      setSelectedRfp(match || null);
      fetchSubmissionsForRfp(selectedRfpId, match);
    }
  }, [selectedRfpId]);

  // Update dynamic criteria score for specific NGO
  const handleScoreChange = (submissionId, criterion, score) => {
    setEvaluations(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        criteria_scores: {
          ...(prev[submissionId]?.criteria_scores || {}),
          [criterion]: score
        }
      }
    }));
  };

  // Update notes/remarks or final decision
  const handleEvalFieldChange = (submissionId, field, val) => {
    setEvaluations(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: val
      }
    }));
  };

  // Save evaluation for NGO
  const handleSaveEvaluation = async (submission) => {
    const subId = submission.id;
    const evalData = evaluations[subId] || {};
    try {
      setSubmitting(true);
      await privateHttpClient.post("ngo/evaluation/rate", {
        due_diligence_id: subId,
        rfp_id: selectedRfpId,
        rating: evalData.rating || 5,
        criteria_scores: evalData.criteria_scores || {},
        evaluation_notes: evalData.evaluation_notes || "",
        final_status: evalData.final_status || "Shortlisted"
      });
      message.success(`Criteria rating & evaluation saved for "${submission.organization_name || submission.name || 'NGO'}"!`);
      fetchSubmissionsForRfp(selectedRfpId, selectedRfp);
    } catch (err) {
      console.error("Save evaluation error:", err);
      message.error("Failed to save evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  // Extract dynamic criteria list defined for RFP
  let criteriaList = ["Technical & Execution Capacity", "Financial & Budget Feasibility", "Governance & Compliance"];
  if (selectedRfp?.evaluation_criteria && Array.isArray(selectedRfp.evaluation_criteria)) {
    if (selectedRfp.evaluation_criteria.length > 0) {
      criteriaList = selectedRfp.evaluation_criteria;
    }
  }

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined style={{ color: "#f59e0b", fontSize: "20px" }} />
          <span style={{ fontWeight: 800, color: "#0f172a" }}>NGO Submissions & Dynamic Criteria Rating Dashboard</span>
        </Space>
      }
      variant="borderless"
      style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}
    >
      {/* RFP Dropdown Selection */}
      <div style={{ marginBottom: 20, background: "#f8fafc", padding: 16, borderRadius: 8 }}>
        <Text strong style={{ display: "block", marginBottom: 6, color: "#334155" }}>
          Select Request for Proposal (RFP):
        </Text>
        <Select
          style={{ width: "100%", maxWidth: 500 }}
          value={selectedRfpId}
          onChange={(val) => setSelectedRfpId(val)}
          loading={loading}
          placeholder="Choose an RFP to view NGO submissions & rate..."
        >
          {rfpList.map(rfp => (
            <Option key={rfp.id} value={rfp.id}>
              {rfp.title || rfp.rfp_title || rfp.name || `RFP #${rfp.id}`} {rfp.status ? `(${rfp.status})` : ''}
            </Option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" tip="Loading NGO submissions and criteria..." />
        </div>
      ) : ngoSubmissions.length === 0 ? (
        <Empty description="No NGO submissions received yet for this RFP." />
      ) : (
        /* Tab-Wise NGO Evaluation Interface */
        <Tabs
          activeKey={activeNgoTabKey}
          onChange={(key) => setActiveNgoTabKey(key)}
          type="card"
          items={ngoSubmissions.map((sub, idx) => {
            const subId = String(sub.id || idx);
            const ngoName = sub.organization_name || sub.name || sub.contact_person || `NGO Partner #${idx + 1}`;
            const evalState = evaluations[sub.id] || {};
            const currentScores = evalState.criteria_scores || {};

            return {
              key: subId,
              label: (
                <Space>
                  <UserOutlined style={{ color: "#2563eb" }} />
                  <span style={{ fontWeight: 600 }}>{ngoName}</span>
                  {sub.final_status && (
                    <Tag color={sub.final_status.toLowerCase().includes('award') ? 'gold' : sub.final_status.toLowerCase().includes('short') ? 'green' : 'default'}>
                      {sub.final_status}
                    </Tag>
                  )}
                </Space>
              ),
              children: (
                <div style={{ padding: 16, background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Row gutter={[24, 24]}>
                    {/* Left Column: NGO Proposal Info */}
                    <Col xs={24} md={10}>
                      <Card size="small" title="NGO Proposal Details" style={{ background: "#f8fafc" }}>
                        <Paragraph style={{ margin: 0 }}>
                          <Text type="secondary">NGO Name: </Text>
                          <Text strong>{ngoName}</Text>
                        </Paragraph>
                        <Paragraph style={{ margin: "4px 0" }}>
                          <Text type="secondary">Email: </Text>
                          <Text>{sub.email || sub.official_email || "N/A"}</Text>
                        </Paragraph>
                        <Paragraph style={{ margin: "4px 0" }}>
                          <Text type="secondary">Project Title: </Text>
                          <Text strong color="blue">{sub.project_title || sub.proposal_title || "Proposal Application"}</Text>
                        </Paragraph>
                        <Paragraph style={{ margin: "4px 0" }}>
                          <Text type="secondary">Proposed Budget: </Text>
                          <Text strong color="green">₹{sub.proposed_budget || sub.total_budget || "As per Proposal"}</Text>
                        </Paragraph>
                        {sub.proposal_summary && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Summary / SOW:</Text>
                            <Paragraph style={{ background: "#fff", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}>
                              {sub.proposal_summary}
                            </Paragraph>
                          </div>
                        )}
                      </Card>
                    </Col>

                    {/* Right Column: Dynamic Criteria Rating Inputs */}
                    <Col xs={24} md={14}>
                      <Title level={5} style={{ color: "#0f172a" }}>
                        Criteria-Based Rating for {ngoName}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
                        Rate this NGO against each criterion defined during RFP creation.
                      </Text>

                      {/* Render input fields for each criteria */}
                      {criteriaList.map((criterion, cIdx) => (
                        <div key={cIdx} style={{ marginBottom: 16, padding: 12, border: "1px solid #f1f5f9", borderRadius: 8, background: "#fafafa" }}>
                          <Text strong style={{ fontSize: 14, color: "#1e293b", display: "block" }}>
                            {cIdx + 1}. {criterion}
                          </Text>
                          <Space style={{ marginTop: 8 }}>
                            <Rate
                              allowHalf
                              value={currentScores[criterion] || 5}
                              onChange={(val) => handleScoreChange(sub.id, criterion, val)}
                              style={{ fontSize: 18, color: "#f59e0b" }}
                            />
                            <Text style={{ fontWeight: 700, marginLeft: 8 }}>
                              {currentScores[criterion] || 5} / 5 Stars
                            </Text>
                          </Space>
                        </div>
                      ))}

                      <Divider style={{ margin: "16px 0" }} />

                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: "block", marginBottom: 6 }}>
                          Final Decision for {ngoName}:
                        </Text>
                        <Select
                          value={evalState.final_status || "Shortlisted"}
                          onChange={(val) => handleEvalFieldChange(sub.id, "final_status", val)}
                          style={{ width: "100%" }}
                        >
                          <Option value="Shortlisted">Greenlist / Shortlist NGO</Option>
                          <Option value="Awarded">Award RFP Project</Option>
                          <Option value="Rejected">Reject Application</Option>
                        </Select>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <Text strong style={{ display: "block", marginBottom: 6 }}>
                          Evaluation Remarks / Feedback:
                        </Text>
                        <Input.TextArea
                          rows={3}
                          placeholder="Enter compliance evaluation notes, financial feasibility feedback, etc..."
                          value={evalState.evaluation_notes || ""}
                          onChange={(e) => handleEvalFieldChange(sub.id, "evaluation_notes", e.target.value)}
                        />
                      </div>

                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={submitting}
                        onClick={() => handleSaveEvaluation(sub)}
                        style={{
                          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                          border: "none",
                          fontWeight: 700,
                          borderRadius: 6
                        }}
                      >
                        Save Rating & Evaluation for {ngoName}
                      </Button>
                    </Col>
                  </Row>
                </div>
              )
            };
          })}
        />
      )}
    </Card>
  );
}
