import React, { useState, useEffect } from "react";
import {
  Modal, Tabs, Button, Tag, Descriptions, Divider, Spin, Empty, Space, App,
  InputNumber, Input, Row, Col, Typography, Drawer, message as antdMessage
} from "antd";
import {
  EyeOutlined, StarOutlined, CheckCircleOutlined, UserOutlined,
  FileTextOutlined, DollarOutlined, SaveOutlined, ExportOutlined,
  TableOutlined
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { TextArea } = Input;

const PROPOSAL_FIELDS = [
  { key: "organization_profile",    label: "Organization Profile" },
  { key: "project_understanding",   label: "Project Understanding" },
  { key: "methodology",             label: "Methodology" },
  { key: "team",                    label: "Team" },
  { key: "implementation_plan",     label: "Implementation Plan" },
  { key: "risk_plan",               label: "Risk Plan" },
  { key: "budget",                  label: "Budget (₹)" },
  { key: "timeline",                label: "Timeline" },
  { key: "sustainability",          label: "Sustainability" },
  { key: "monitoring_framework",    label: "Monitoring Framework" },
];

// ── Multi-NGO Consolidated Side-by-Side Assessment Matrix Component ──────────
function MultiNgoMatrixView({ submissions, rfpRecord, criteria, onSaved, onClose }) {
  const { message } = App.useApp();
  const [matrixScores, setMatrixScores] = useState({});
  const [matrixOrgDetails, setMatrixOrgDetails] = useState({});
  const [matrixNotes, setMatrixNotes] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initScores = {};
    const initOrgDetails = {};
    const initNotes = {};
    submissions.forEach((sub) => {
      initNotes[sub.id] = sub.evaluation_notes || "";
      initScores[sub.id] = {};
      initOrgDetails[sub.id] = {};
      if (Array.isArray(sub.criteria_scores)) {
        sub.criteria_scores.forEach((cs) => {
          initScores[sub.id][cs.criterion_id] = cs.score;
          initOrgDetails[sub.id][cs.criterion_id] = cs.org_details || cs.details || "";
        });
      }
    });
    setMatrixScores(initScores);
    setMatrixOrgDetails(initOrgDetails);
    setMatrixNotes(initNotes);
  }, [submissions]);

  const handleScoreChange = (subId, critId, val) => {
    setMatrixScores((prev) => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        [critId]: val,
      },
    }));
  };

  const handleOrgDetailsChange = (subId, critId, val) => {
    setMatrixOrgDetails((prev) => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        [critId]: val,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises = submissions.map((sub) => {
        const subScores = matrixScores[sub.id] || {};
        const subOrgDetails = matrixOrgDetails[sub.id] || {};
        const criteriaScores = criteria.map((c) => ({
          criterion_id: c.id,
          criterion_name: c.criteria_name || c.name,
          score: Number(subScores[c.id] || 0),
          weightage: Number(c.weightage || c.weight || 10),
          weighted_score: (((Number(subScores[c.id] || 0)) / 10) * Number(c.weightage || c.weight || 10)).toFixed(2),
          org_details: subOrgDetails[c.id] ?? (c.org_details || sub.organization_profile || ""),
        }));

        const totalWeighted = criteria.reduce((acc, c) => {
          const s = Number(subScores[c.id] || 0);
          const w = Number(c.weightage || c.weight || 10);
          return acc + ((s / 10) * w);
        }, 0);

        return privateHttpClient.post("ngo/score", {
          submission_id: sub.id,
          criteria_scores: criteriaScores,
          rating: totalWeighted.toFixed(2),
          evaluation_notes: matrixNotes[sub.id] || "",
          final_status: "Evaluated",
        });
      });

      await Promise.all(promises);
      message.success("All NGO assessment scores & details saved successfully!");
      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (err) {
      console.error("Save all scores error:", err);
      message.error("Failed to save all scores.");
    } finally {
      setSaving(false);
    }
  };

  const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const rfpTitle = rfpRecord?.project_details || rfpRecord?.title || rfpRecord?.rfp_information || "CSR Request for Proposal";

  return (
    <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 16 }}>
      {/* Top Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, background: "#e2e8f0", padding: "8px 16px", borderRadius: 6 }}>
        <Text style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
          Assessment framework view — All Submitting NGOs ({submissions.length})
        </Text>
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSaveAll}
            style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", border: "none", fontWeight: 700 }}
          >
            Save All Scores
          </Button>
          <Button
            type="default"
            icon={<ExportOutlined />}
            style={{ background: "#2563eb", color: "#fff", borderColor: "#2563eb" }}
            onClick={() => message.info("Exporting comparative assessment matrix...")}
          >
            Export
          </Button>
          {onClose && <Button onClick={onClose}>Back</Button>}
        </Space>
      </div>

      {/* Table Container */}
      <div style={{ border: "2px solid #334155", borderRadius: 4, overflowX: "auto" }}>
        {/* Dark Teal Banners */}
        <div style={{ background: "#4a7c7d", color: "#ffffff", textAlign: "center", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
          Implementing Agency Assessment Framework
        </div>
        <div style={{ background: "#4a7c7d", color: "#ffffff", textAlign: "center", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderBottom: "2px solid #334155" }}>
          {rfpTitle}
        </div>

        {/* Matrix Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left", minWidth: `${500 + submissions.length * 300}px` }}>
          <thead>
            {/* Header Row 1: Fixed Columns + NGO Spans */}
            <tr style={{ background: "#4a7c7d", color: "#ffffff", borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
              <th rowSpan={2} style={{ padding: "8px 6px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "40px", textAlign: "center" }}>Sr.</th>
              <th rowSpan={2} style={{ padding: "8px 8px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "120px" }}>Focus</th>
              <th rowSpan={2} style={{ padding: "8px 8px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "150px" }}>Details</th>
              <th rowSpan={2} style={{ padding: "8px 8px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "160px" }}>Indicators</th>
              <th rowSpan={2} style={{ padding: "8px 6px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "70px", textAlign: "center" }}>Weightage</th>
              {submissions.map((sub) => (
                <th
                  key={sub.id}
                  colSpan={3}
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    borderRight: "1px solid rgba(255,255,255,0.4)",
                    background: "#3b6768",
                    fontWeight: 700
                  }}
                >
                  NGO ({sub.ngo_name || sub.ngo_email})
                </th>
              ))}
            </tr>

            {/* Header Row 2: Sub-columns for each NGO */}
            <tr style={{ background: "#4a7c7d", color: "#ffffff", borderBottom: "2px solid #334155" }}>
              {submissions.map((sub) => (
                <React.Fragment key={sub.id}>
                  <th style={{ padding: "6px 8px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "130px" }}>Comments</th>
                  <th style={{ padding: "6px 4px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "105px", textAlign: "center" }}>Score (out of 10)</th>
                  <th style={{ padding: "6px 4px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "75px", textAlign: "center" }}>Wt. Score</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, idx) => {
              const weightVal = Number(c.weightage || c.weight || 10);

              return (
                <tr key={c.id || idx} style={{ borderBottom: "1px solid #cbd5e1", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "6px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 600 }}>{alphabet[idx % alphabet.length]}</td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", color: "#334155" }}>{c.focus || c.category || "Evaluation Factor"}</td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", color: "#475569" }}>{c.details || c.description || c.criteria_name}</td>
                  <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", fontWeight: 600, color: "#0f172a" }}>{c.criteria_name || c.name}</td>
                  <td style={{ padding: "6px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 700, color: "#2563eb" }}>{weightVal}</td>

                  {/* 3 Columns per NGO */}
                  {submissions.map((sub) => {
                    const scoreVal = Number(matrixScores[sub.id]?.[c.id] || 0);
                    const wtScore = ((scoreVal / 10) * weightVal).toFixed(1);

                    return (
                      <React.Fragment key={sub.id}>
                        <td style={{ padding: "4px 6px", borderRight: "1px solid #cbd5e1" }}>
                          <Input
                            placeholder="Enter details..."
                            value={matrixOrgDetails[sub.id]?.[c.id] ?? (c.org_details || sub.organization_profile || "")}
                            onChange={(e) => handleOrgDetailsChange(sub.id, c.id, e.target.value)}
                            style={{ fontSize: "12px" }}
                          />
                        </td>
                        <td style={{ padding: "4px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                          <InputNumber
                            min={0}
                            max={10}
                            value={scoreVal}
                            onChange={(val) => handleScoreChange(sub.id, c.id, val)}
                            style={{ width: "70px" }}
                          />
                        </td>
                        <td style={{ padding: "6px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 700, color: "#16a34a" }}>
                          {wtScore}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}

            {/* Total Row */}
            <tr style={{ background: "#f1f5f9", fontWeight: 700, borderTop: "2px solid #334155" }}>
              <td colSpan={4} style={{ padding: "8px 12px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>Grand Total</td>
              <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid #cbd5e1", color: "#2563eb" }}>
                {criteria.reduce((sum, c) => sum + Number(c.weightage || c.weight || 10), 0)}
              </td>
              {submissions.map((sub) => {
                const totalWt = criteria.reduce((sum, c) => {
                  const s = Number(matrixScores[sub.id]?.[c.id] || 0);
                  const w = Number(c.weightage || c.weight || 10);
                  return sum + ((s / 10) * w);
                }, 0).toFixed(1);

                return (
                  <React.Fragment key={sub.id}>
                    <td colSpan={2} style={{ padding: "8px 8px", textAlign: "right", borderRight: "1px solid #cbd5e1" }}>Total Wt. Score:</td>
                    <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid #cbd5e1", color: "#16a34a", fontSize: 13 }}>
                      {totalWt}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Single NGO Assessment Framework Component ──────────────────────────────
function AssessmentFrameworkView({ submission, rfpRecord, criteria, onSaved, onClose }) {
  const { message } = App.useApp();
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState(submission?.evaluation_notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Array.isArray(submission?.criteria_scores) && submission.criteria_scores.length > 0) {
      const map = {};
      submission.criteria_scores.forEach((s) => {
        map[s.criterion_id] = s.score;
      });
      setScores(map);
    }
  }, [submission]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const criteriaScores = criteria.map((c) => ({
        criterion_id: c.id,
        criterion_name: c.criteria_name || c.name,
        score: Number(scores[c.id] || 0),
        weightage: Number(c.weightage || c.weight || 10),
        weighted_score: (((Number(scores[c.id] || 0)) / 10) * Number(c.weightage || c.weight || 10)).toFixed(2),
      }));

      const totalWeighted = criteria.reduce((acc, c) => {
        const s = Number(scores[c.id] || 0);
        const w = Number(c.weightage || c.weight || 10);
        return acc + ((s / 10) * w);
      }, 0);

      const res = await privateHttpClient.post("ngo/score", {
        submission_id: submission.id,
        criteria_scores: criteriaScores,
        rating: totalWeighted.toFixed(2),
        evaluation_notes: notes,
        final_status: "Evaluated",
      });

      if (res.data?.success) {
        message.success("Assessment scores saved successfully!");
        if (onSaved) onSaved();
      } else {
        message.error(res.data?.message || "Failed to save scores.");
      }
    } catch (err) {
      console.error("Save score error:", err);
      message.error("Failed to save scores.");
    } finally {
      setSaving(false);
    }
  };

  const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const rfpTitle = rfpRecord?.project_details || rfpRecord?.title || rfpRecord?.rfp_information || "CSR Request for Proposal";
  const ngoName = submission?.ngo_name || submission?.ngo_email || `NGO #${submission?.created_by}`;

  return (
    <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 16, marginTop: 8 }}>
      {/* Top Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, background: "#e2e8f0", padding: "8px 16px", borderRadius: 6 }}>
        <Text style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>Assessment framework view</Text>
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<ExportOutlined />}
            style={{ background: "#2563eb", borderRadius: 4 }}
            onClick={() => message.info("Exporting assessment framework...")}
          >
            Export
          </Button>
          {onClose && <Button size="small" style={{ borderRadius: 4 }} onClick={onClose}>Back</Button>}
        </Space>
      </div>

      {/* Outer Table Card */}
      <div style={{ border: "2px solid #334155", borderRadius: 4, overflow: "hidden" }}>
        {/* Dark Teal Banners */}
        <div style={{ background: "#4a7c7d", color: "#ffffff", textAlign: "center", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
          Implementing Agency Assessment Framework
        </div>
        <div style={{ background: "#4a7c7d", color: "#ffffff", textAlign: "center", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
          {rfpTitle}
        </div>
        <div style={{ background: "#4a7c7d", color: "#ffffff", textAlign: "center", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderBottom: "2px solid #334155" }}>
          NGO ({ngoName})
        </div>

        {/* Matrix Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#4a7c7d", color: "#ffffff", borderBottom: "2px solid #334155" }}>
              <th style={{ padding: "8px 6px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "40px", textAlign: "center" }}>Sr.</th>
              <th style={{ padding: "8px 8px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "130px" }}>Focus</th>
              <th style={{ padding: "8px 8px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "170px" }}>Details</th>
              <th style={{ padding: "8px 8px", borderRight: "1px solid rgba(255,255,255,0.3)" }}>Indicators</th>
              <th style={{ padding: "8px 6px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "75px", textAlign: "center" }}>Weightage</th>
              <th style={{ padding: "8px 8px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "140px" }}>Comments</th>
              <th style={{ padding: "8px 6px", borderRight: "1px solid rgba(255,255,255,0.3)", width: "115px", textAlign: "center" }}>Score (out of 10)</th>
              <th style={{ padding: "8px 6px", width: "85px", textAlign: "center" }}>Wt. Score</th>
            </tr>
          </thead>
          <tbody>
            {criteria.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                  No criteria configured for this RFP.
                </td>
              </tr>
            ) : (
              criteria.map((c, idx) => {
                const scoreVal = Number(scores[c.id] || 0);
                const weightVal = Number(c.weightage || c.weight || 10);
                const wtScore = ((scoreVal / 10) * weightVal).toFixed(1);

                return (
                  <tr key={c.id || idx} style={{ borderBottom: "1px solid #cbd5e1", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "6px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 600 }}>
                      {alphabet[idx % alphabet.length]}
                    </td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", color: "#334155" }}>
                      {c.focus || c.category || "Evaluation Factor"}
                    </td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", color: "#475569" }}>
                      {c.details || c.description || c.criteria_name}
                    </td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", fontWeight: 600, color: "#0f172a" }}>
                      {c.criteria_name || c.name}
                    </td>
                    <td style={{ padding: "6px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 700, color: "#2563eb" }}>
                      {weightVal}
                    </td>
                    <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", color: "#475569" }}>
                      {submission.organization_profile || "Verified"}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                      <InputNumber
                        min={0}
                        max={10}
                        value={scoreVal}
                        onChange={(val) => setScores((prev) => ({ ...prev, [c.id]: val }))}
                        style={{ width: "75px" }}
                      />
                    </td>
                    <td style={{ padding: "6px", textAlign: "center", fontWeight: 700, color: "#16a34a" }}>
                      {wtScore}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Total Row */}
            <tr style={{ background: "#f1f5f9", fontWeight: 700, borderTop: "2px solid #334155" }}>
              <td colSpan={4} style={{ padding: "8px 12px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>Grand Total</td>
              <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid #cbd5e1", color: "#2563eb" }}>
                {criteria.reduce((sum, c) => sum + Number(c.weightage || c.weight || 10), 0)}
              </td>
              <td colSpan={2} style={{ padding: "8px 12px", textAlign: "right", borderRight: "1px solid #cbd5e1" }}>Total Weighted Score:</td>
              <td style={{ padding: "8px", textAlign: "center", color: "#16a34a", fontSize: 13 }}>
                {criteria.reduce((sum, c) => {
                  const s = Number(scores[c.id] || 0);
                  const w = Number(c.weightage || c.weight || 10);
                  return sum + ((s / 10) * w);
                }, 0).toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <Text strong style={{ display: "block", marginBottom: 4 }}>Evaluator Remarks / Notes:</Text>
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter evaluation remarks..." />
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", border: "none", fontWeight: 700, height: 40, borderRadius: 8, paddingInline: 24 }}
        >
          Save Assessment Scores
        </Button>
      </div>
    </div>
  );
}

// ── Main Submissions & Evaluation Modal ──────────────────────────────────────
function RfpSubmissionsModalInner({ open, onCancel, rfpRecord }) {
  const { message } = App.useApp();
  const [submissions, setSubmissions] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("0");
  const [detailsDrawer, setDetailsDrawer] = useState({ open: false, submission: null });
  const [multiMatrixOpen, setMultiMatrixOpen] = useState(false);

  useEffect(() => {
    if (open && rfpRecord?.id) {
      fetchAll();
    }
  }, [open, rfpRecord?.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [subRes, critRes] = await Promise.all([
        privateHttpClient.get(`ngo/submitted-proposals?rfp_id=${rfpRecord.id}`),
        privateHttpClient.get(`ngo/criteria?rfp_id=${rfpRecord.id}`),
      ]);
      setSubmissions(subRes.data?.data || []);
      setCriteria(critRes.data?.data || []);
      setActiveTab("0");
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s) => {
    if (s === "Evaluated") return "success";
    if (s === "Submitted") return "processing";
    return "default";
  };

  const tabItems = submissions.map((sub, idx) => ({
    key: String(idx),
    label: (
      <span>
        <UserOutlined style={{ marginRight: 4 }} />
        {sub.ngo_name || sub.ngo_email || `NGO #${sub.id}`}
        <Tag color={statusColor(sub.final_status || sub.status)} style={{ marginLeft: 8, fontSize: 10 }}>
          {sub.final_status || sub.status || "Submitted"}
        </Tag>
      </span>
    ),
    children: (
      <div>
        {/* ── Proposal Summary Cards ── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {PROPOSAL_FIELDS.slice(0, 6).map((f) => (
            <Col xs={24} md={12} key={f.key}>
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 2 }}>{f.label}</Text>
                <Text style={{ fontWeight: 600, fontSize: 13 }}>{sub[f.key] || <span style={{ color: "#94a3b8" }}>—</span>}</Text>
              </div>
            </Col>
          ))}
        </Row>

        {/* ── Budget & Timeline ── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12}>
            <div style={{ background: "#ecfdf5", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}><DollarOutlined /> Budget (₹)</Text>
              <Text strong style={{ fontSize: 15, color: "#15803d" }}>
                {sub.budget ? `₹${Number(sub.budget).toLocaleString("en-IN")}` : "—"}
              </Text>
            </div>
          </Col>
          <Col xs={12}>
            <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 14px", border: "1px solid #bfdbfe" }}>
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Timeline</Text>
              <Text strong style={{ fontSize: 13, color: "#2563eb" }}>{sub.timeline || "—"}</Text>
            </div>
          </Col>
        </Row>

        {/* ── Quick Action Bar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setDetailsDrawer({ open: true, submission: sub })}
              style={{ borderRadius: 8 }}
            >
              View Full Proposal Form
            </Button>
          </Space>
          <Tag color={statusColor(sub.final_status || sub.status)} style={{ padding: "4px 12px", fontSize: 12 }}>
            Status: {sub.final_status || sub.status || "Submitted"}
          </Tag>
        </div>
      </div>
    ),
  }));

  return (
    <>
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: "#2563eb" }} />
            <span>NGO RFP Proposals & Assessment Framework Matrix — {rfpRecord?.project_details || rfpRecord?.rfp_information || `RFP #${rfpRecord?.id}`}</span>
          </Space>
        }
        open={open}
        onCancel={onCancel}
        destroyOnHidden
        width={1150}
        style={{ top: 15 }}
        footer={[
          <Button key="close" onClick={onCancel}>Close</Button>,
        ]}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: 12, color: "#64748b" }}>Loading submitted proposals & RFP criteria...</div>
          </div>
        ) : submissions.length === 0 ? (
          <Empty
            description="No proposals submitted yet for this RFP."
            style={{ padding: "60px 0" }}
          />
        ) : (
          <div>
            {/* Top Toolbar Action Button above Tabs */}
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "10px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div>
                <Text style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>NGO Submissions ({submissions.length})</Text>
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Select an NGO tab below or click the button to view the side-by-side comparative rating matrix.</Text>
              </div>
              <Button
                type="primary"
                icon={<TableOutlined />}
                onClick={() => setMultiMatrixOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                  border: "none",
                  fontWeight: 700,
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)"
                }}
              >
                ⭐ View / Score Assessment Matrix (All NGOs)
              </Button>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              items={tabItems}
              style={{ marginTop: 8 }}
            />
          </div>
        )}
      </Modal>

      {/* ── Multi-NGO Side-by-Side Assessment Matrix Modal ── */}
      <Modal
        open={multiMatrixOpen}
        onCancel={() => setMultiMatrixOpen(false)}
        footer={null}
        destroyOnHidden
        width={1250}
        style={{ top: 10 }}
      >
        <MultiNgoMatrixView
          submissions={submissions}
          rfpRecord={rfpRecord}
          criteria={criteria}
          onSaved={fetchAll}
          onClose={() => setMultiMatrixOpen(false)}
        />
      </Modal>

      {/* ── View All Details Drawer ── */}
      <Drawer
        title={
          <Space>
            <EyeOutlined style={{ color: "#2563eb" }} />
            <span>Full Proposal Form — {detailsDrawer.submission?.ngo_name || detailsDrawer.submission?.ngo_email}</span>
          </Space>
        }
        open={detailsDrawer.open}
        onClose={() => setDetailsDrawer({ open: false, submission: null })}
        width={800}
        destroyOnHidden
      >
        {detailsDrawer.submission && (
          <div>
            {/* NGO Header Card */}
            <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 12, padding: "16px 20px", color: "#fff", marginBottom: 20, boxShadow: "0 4px 14px rgba(15,23,42,0.15)" }}>
              <Row align="middle" justify="space-between">
                <Col>
                  <Title level={4} style={{ color: "#fff", margin: 0 }}>
                    {detailsDrawer.submission.ngo_name || "NGO Implementation Partner"}
                  </Title>
                  <Text style={{ color: "#94a3b8", fontSize: 13 }}>
                    📧 {detailsDrawer.submission.ngo_email || "No email"} | Submitted on: {detailsDrawer.submission.created_at ? dayjs(detailsDrawer.submission.created_at).format("DD MMM YYYY, HH:mm") : "Recently"}
                  </Text>
                </Col>
                <Col>
                  <Tag color={statusColor(detailsDrawer.submission.final_status || detailsDrawer.submission.status)} style={{ fontSize: 13, padding: "4px 12px", borderRadius: 16, fontWeight: 700 }}>
                    {detailsDrawer.submission.final_status || detailsDrawer.submission.status || "Submitted"}
                  </Tag>
                </Col>
              </Row>
            </div>

            {/* Proposal Sections */}
            <Divider orientation="left" style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
              📋 Proposal Sections
            </Divider>

            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              {PROPOSAL_FIELDS.map((f) => {
                const val = detailsDrawer.submission[f.key];
                const isBudget = f.key === "budget";

                return (
                  <Col xs={24} md={f.key === "organization_profile" || f.key === "project_understanding" || f.key === "methodology" || f.key === "implementation_plan" ? 24 : 12} key={f.key}>
                    <div style={{ background: isBudget ? "#ecfdf5" : "#f8fafc", borderRadius: 10, padding: "12px 16px", border: isBudget ? "1px solid #a7f3d0" : "1px solid #e2e8f0", height: "100%" }}>
                      <Text style={{ fontSize: 12, fontWeight: 700, color: isBudget ? "#047857" : "#475569", display: "block", marginBottom: 4 }}>
                        {f.label}
                      </Text>
                      {isBudget ? (
                        <Text strong style={{ fontSize: 18, color: "#047857" }}>
                          {val ? `₹${Number(val).toLocaleString("en-IN")}` : "—"}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 13, color: "#0f172a", whiteSpace: "pre-line", lineHeight: 1.5 }}>
                          {val || <span style={{ color: "#94a3b8", italic: true }}>No details provided</span>}
                        </Text>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>

            {/* Submitted Documents & Attachments */}
            <Divider orientation="left" style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
              📎 Submitted Proposal Documents & Attachments
            </Divider>

            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              {[
                { key: "proposal_pdf",        label: "Proposal PDF Document",     type: "pdf" },
                { key: "budget_excel",        label: "Financial Budget Excel",    type: "excel" },
                { key: "team_cvs",            label: "Team Member CVs",           type: "doc" },
                { key: "previous_experience", label: "Previous Experience Proof", type: "doc" },
                { key: "case_studies",        label: "Case Studies & Credentials",type: "doc" },
              ].map((doc) => {
                const docData = detailsDrawer.submission[doc.key];
                const hasDoc = Boolean(docData);

                return (
                  <Col xs={24} md={12} key={doc.key}>
                    <div
                      style={{
                        background: hasDoc ? "#f0f9ff" : "#f8fafc",
                        border: hasDoc ? "1px solid #bae6fd" : "1px dashed #cbd5e1",
                        borderRadius: 10,
                        padding: "14px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 13, color: hasDoc ? "#0369a1" : "#64748b", display: "block" }}>
                          📄 {doc.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: hasDoc ? "#0284c7" : "#94a3b8" }}>
                          {hasDoc ? "Uploaded Document Available" : "Not uploaded"}
                        </Text>
                      </div>

                      {hasDoc ? (
                        <Button
                          type="primary"
                          size="small"
                          icon={<ExportOutlined />}
                          style={{ background: "#0284c7", border: "none", borderRadius: 6, fontWeight: 600 }}
                          onClick={() => {
                            if (docData.startsWith("data:") || docData.startsWith("http")) {
                              const link = document.createElement("a");
                              link.href = docData;
                              link.download = `${doc.key}_${detailsDrawer.submission.id}`;
                              link.target = "_blank";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } else {
                              window.open(docData, "_blank");
                            }
                          }}
                        >
                          View Doc
                        </Button>
                      ) : (
                        <Tag color="default" style={{ fontSize: 11 }}>No File</Tag>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>

            {/* Evaluation Score Summary */}
            {detailsDrawer.submission.rating > 0 && (
              <>
                <Divider orientation="left" style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                  ⭐ Evaluation Rating & Notes
                </Divider>
                <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", color: "#92400e" }}>
                  <Text strong style={{ fontSize: 16, display: "block", marginBottom: 4 }}>
                    Total Weighted Rating: {detailsDrawer.submission.rating} / 100
                  </Text>
                  <Text style={{ fontSize: 13, color: "#78350f" }}>
                    Evaluator Remarks: {detailsDrawer.submission.evaluation_notes || "No remarks added."}
                  </Text>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}

export default function RfpSubmissionsModal(props) {
  return (
    <App>
      <RfpSubmissionsModalInner {...props} />
    </App>
  );
}
