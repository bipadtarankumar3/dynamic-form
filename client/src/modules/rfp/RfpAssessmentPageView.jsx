'use client';

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card, Button, InputNumber, Input, Row, Col, Typography,
  Tag, Space, Spin, Empty, App, Breadcrumb, Tabs, Divider, Drawer, Modal, Tooltip, Select, Radio, Timeline
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ExportOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StarOutlined,
  FileTextOutlined,
  UserOutlined,
  SendOutlined,
  DollarOutlined,
  CalendarOutlined,
  TrophyOutlined,
  CheckSquareOutlined,
  RocketOutlined,
  EditOutlined,
  HistoryOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import { dynamicSchemaDetailsAPI } from "@/services/dynamicForm-service";
import NgoDetailsView from "@/app/(ngo)/_components/NgoDetailsView";
import FormApprovalPanel from "@/modules/form-approval/FormApprovalPanel";
import { getUser } from "@/context/AuthContext";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

function RfpAssessmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { modal, message } = App.useApp();

  const rfpId = searchParams.get("rfp_id") || searchParams.get("id");

  const [rfpRecord, setRfpRecord] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [floatDetails, setFloatDetails] = useState({ float_date: null, remarks: "", floated_ngos_count: 0, ngo_names: [] });
  const [proposalSchema, setProposalSchema] = useState(null);
  const [workflowState, setWorkflowState] = useState(null);
  const [loading, setLoading] = useState(true);

  // User & Initiator permissions
  const loggedInUser = getUser();
  const currentUserId = loggedInUser?.user_id || loggedInUser?.id;

  const initiatorId =
    workflowState?.instance?.initiator?.id ||
    workflowState?.instance?.created_by ||
    rfpRecord?.created_by ||
    rfpRecord?.user_id;

  const initiatorName =
    workflowState?.instance?.initiator?.name ||
    rfpRecord?.created_by_name ||
    "Initiator";

  const isInitiator = Boolean(
    currentUserId && initiatorId && Number(currentUserId) === Number(initiatorId)
  );

  // Matrix state
  const [matrixScores, setMatrixScores] = useState({});
  const [matrixOrgDetails, setMatrixOrgDetails] = useState({});
  const [matrixNotes, setMatrixNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modal & Temporary Highlight State
  const [detailsDrawer, setDetailsDrawer] = useState({ open: false, submission: null });
  const [highlightedNgoId, setHighlightedNgoId] = useState(null);
  const highlightTimeoutRef = React.useRef(null);

  // Tagged Implementation Partner State
  const [taggedNgoId, setTaggedNgoId] = useState(null);

  // Approval Process Track Audit State
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [approvalTrackData, setApprovalTrackData] = useState([]);
  const [loadingTrack, setLoadingTrack] = useState(false);

  const fetchApprovalTrack = async () => {
    setLoadingTrack(true);
    try {
      const res = await privateHttpClient.get(`ngo/approval-track?rfp_id=${rfpId}`);
      setApprovalTrackData(res.data?.data || []);
      setTrackModalOpen(true);
    } catch (err) {
      console.warn("fetchApprovalTrack warning:", err);
      message.error("Failed to load approval process track history.");
    } finally {
      setLoadingTrack(false);
    }
  };

  const [drawerScores, setDrawerScores] = useState({});
  const [drawerOrgDetails, setDrawerOrgDetails] = useState({});
  const [drawerNotes, setDrawerNotes] = useState("");
  const [drawerSaving, setDrawerSaving] = useState(false);

  const handleViewDocument = (rawDocData, defaultFileName = "document") => {
    if (!rawDocData) return;

    let docStr = rawDocData;

    if (typeof docStr === "object" && docStr !== null) {
      if (Array.isArray(docStr) && docStr.length > 0) {
        docStr = docStr[0]?.file_path || docStr[0]?.url || docStr[0] || "";
      } else {
        docStr = docStr.file_path || docStr.url || "";
      }
    } else if (typeof docStr === "string" && (docStr.trim().startsWith("[") || docStr.trim().startsWith("{"))) {
      try {
        const parsed = JSON.parse(docStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          docStr = parsed[0]?.file_path || parsed[0]?.url || parsed[0] || docStr;
        } else if (typeof parsed === "object" && parsed !== null) {
          docStr = parsed.file_path || parsed.url || docStr;
        }
      } catch (e) {}
    }

    if (typeof docStr !== "string" || !docStr.trim()) return;
    docStr = docStr.trim();

    if (docStr.startsWith("data:")) {
      try {
        const arr = docStr.split(",");
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const win = window.open(blobUrl, "_blank");
        if (!win) {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `${defaultFileName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      } catch (err) {
        console.error("Error opening base64 document:", err);
      }
    }

    let fileUrl = docStr;
    if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
      const cleanRel = fileUrl.replace(/^\/?(uploads\/)?/, "");
      const apiBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_API_URL || "http://localhost:6003/api/v1";
      fileUrl = `${apiBaseUrl}/static/${cleanRel}`;
    }

    window.open(fileUrl, "_blank");
  };

  const triggerNgoHighlight = (ngoId) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedNgoId(ngoId);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedNgoId(null);
    }, 3500);
  };

  const openNgoDrawer = (sub) => {
    const subScores = matrixScores[sub.id] || {};
    const subOrg = matrixOrgDetails[sub.id] || {};
    const subNotes = matrixNotes[sub.id] || sub.evaluation_notes || "";

    const initScores = {};
    const initOrg = {};
    criteria.forEach((c) => {
      initScores[c.id] = subScores[c.id] !== undefined ? subScores[c.id] : 0;
      initOrg[c.id] = subOrg[c.id] !== undefined ? subOrg[c.id] : "";
    });

    setDrawerScores(initScores);
    setDrawerOrgDetails(initOrg);
    setDrawerNotes(subNotes);
    triggerNgoHighlight(sub.id);
    setDetailsDrawer({ open: true, submission: sub });
  };

  const handleSubmitDrawerScores = async () => {
    if (!detailsDrawer.submission) return;
    setDrawerSaving(true);
    try {
      const sub = detailsDrawer.submission;
      const criteriaScores = criteria.map((c) => ({
        criterion_id: c.id,
        criterion_name: c.criteria_name || c.name,
        score: Number(drawerScores[c.id] || 0),
        weightage: Number(c.weightage || c.weight || 10),
        weighted_score: (((Number(drawerScores[c.id] || 0)) / 10) * Number(c.weightage || c.weight || 10)).toFixed(2),
        org_details: drawerOrgDetails[c.id] ?? (c.org_details || sub.organization_profile || ""),
      }));

      const totalWeighted = criteria.reduce((acc, c) => {
        const s = Number(drawerScores[c.id] || 0);
        const w = Number(c.weightage || c.weight || 10);
        return acc + ((s / 10) * w);
      }, 0);

      await privateHttpClient.post("ngo/score", {
        submission_id: sub.id,
        criteria_scores: criteriaScores,
        rating: totalWeighted.toFixed(2),
        evaluation_notes: drawerNotes || "",
        final_status: "Evaluated",
      });

      message.success(`Assessment score submitted successfully for ${sub.ngo_name || sub.ngo_email}!`);

      setMatrixScores((prev) => ({ ...prev, [sub.id]: drawerScores }));
      setMatrixOrgDetails((prev) => ({ ...prev, [sub.id]: drawerOrgDetails }));
      setMatrixNotes((prev) => ({ ...prev, [sub.id]: drawerNotes }));

      triggerNgoHighlight(sub.id);
      setDetailsDrawer({ open: false, submission: null });
      fetchData();
    } catch (err) {
      console.error("handleSubmitDrawerScores error:", err);
      message.error("Failed to submit assessment score.");
    } finally {
      setDrawerSaving(false);
    }
  };

  useEffect(() => {
    fetchProposalSchema();
  }, []);

  const fetchProposalSchema = async () => {
    try {
      const res = await dynamicSchemaDetailsAPI({ form_slug: "rfp_submission" });
      if (res.data?.success && res.data?.data) {
        setProposalSchema(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch rfp_submission schema:", err);
    }
  };

  useEffect(() => {
    if (rfpId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [rfpId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, critRes] = await Promise.all([
        privateHttpClient.get(`ngo/submitted-proposals?rfp_id=${rfpId}`),
        privateHttpClient.get(`ngo/criteria?rfp_id=${rfpId}`),
      ]);

      let rfpData = subRes.data?.rfpRecord || {};
      try {
        const rfpRes = await privateHttpClient.post("dynamic-form/view", { form_slug: "request_for_proposal", id: rfpId });
        if (rfpRes.data?.data) {
          rfpData = { ...rfpData, ...rfpRes.data.data };
        }
      } catch (err) {
        console.warn("dynamic-form/view optional fetch warning:", err?.response?.status || err);
      }

      const subsData = subRes.data?.data || [];
      const critsData = critRes.data?.data || [];
      const floatInfo = subRes.data?.floatDetails || {};

      setRfpRecord(rfpData);
      setSubmissions(subsData);
      setCriteria(critsData);

      // Check if an NGO is tagged after final approval
      const isApprovedOrTagged = rfpData.status === "Partner Tagged" || rfpData.status === "Approved" || subsData.some(s => s.final_status === "Selected");
      const tagged = isApprovedOrTagged ? (rfpData.tagged_ngo_id || subsData.find(s => s.final_status === "Selected")?.id || null) : null;
      setTaggedNgoId(tagged);

      setFloatDetails({
        float_date: floatInfo.float_date || rfpData.float_date || rfpData.created_at || null,
        remarks: floatInfo.remarks || rfpData.float_remarks || rfpData.remarks || "No remarks provided.",
        floated_ngos_count: floatInfo.floated_ngos_count || (Array.isArray(rfpData.floated_ngos) ? rfpData.floated_ngos.length : subsData.length),
        ngo_names: floatInfo.ngo_names || [],
      });

      // Initialize matrix state
      const initScores = {};
      const initOrgDetails = {};
      const initNotes = {};

      subsData.forEach((sub) => {
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

      // Check if scores have already been sent for approval
      const isLockedForApproval =
        ["Sent for Approval", "Approved", "Submitted for Approval", "Completed", "Partner Tagged", "NGO Selected"].includes(rfpData.status) ||
        subsData.some((sub) =>
          ["Sent for Approval", "Approved", "Submitted for Approval", "Completed", "Selected"].includes(sub.final_status) ||
          ["Sent for Approval", "Approved", "Submitted for Approval", "Completed"].includes(sub.status)
        );

      // Admin can edit criteria scores until sent for approval
      setIsEditMode(!isLockedForApproval);
    } catch (err) {
      console.error("fetchData error:", err);
      message.error("Failed to load assessment data.");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (subId, critId, val) => {
    setMatrixScores((prev) => ({
      ...prev,
      [subId]: { ...(prev[subId] || {}), [critId]: val },
    }));
  };

  const handleOrgDetailsChange = (subId, critId, val) => {
    setMatrixOrgDetails((prev) => ({
      ...prev,
      [subId]: { ...(prev[subId] || {}), [critId]: val },
    }));
  };

  const handleSaveAll = async (statusOverride, extraPayload = {}) => {
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
          rfp_id: rfpId,
          criteria_scores: criteriaScores,
          rating: totalWeighted.toFixed(2),
          evaluation_notes: matrixNotes[sub.id] || "",
          final_status: statusOverride || "Evaluated",
          ...extraPayload
        });
      });

      await Promise.all(promises);
      message.success(
        statusOverride === "Sent for Approval"
          ? "Assessment matrix submitted for approval!"
          : "All NGO assessment scores saved successfully!"
      );
      if (statusOverride === "Sent for Approval") {
        setIsEditMode(false);
      } else {
        setIsEditMode(true);
      }
      fetchData();
    } catch (err) {
      console.error("handleSaveAll error:", err);
      message.error("Failed to save scores.");
    } finally {
      setSaving(false);
    }
  };

  const handleTagPartner = async (sub) => {
    if (!isInitiator) {
      message.warning(`Only the RFP initiator (${initiatorName}) is authorized to select and tag the winning implementation partner.`);
      return;
    }

    if (taggedNgoId) {
      const currentlyTaggedSub = submissions.find(s => String(s.id) === String(taggedNgoId));
      const currentlyTaggedName = currentlyTaggedSub?.ngo_name || currentlyTaggedSub?.ngo_email || "NGO Partner";
      message.warning(`Selection is locked. ${currentlyTaggedName} is already selected as the implementation partner for this RFP.`);
      return;
    }

    const ngoName = sub.ngo_name || sub.ngo_email || "NGO Partner";

    modal.confirm({
      title: "Confirm NGO Partner Selection & Locking",
      icon: <CheckCircleOutlined style={{ color: "#16a34a" }} />,
      content: `Are you sure you want to select and approve ${ngoName} as the implementation partner for RFP #${rfpId}? Once selected, this selection is final and cannot be changed.`,
      okText: "Yes, Approve & Select NGO",
      okButtonProps: { style: { background: "#16a34a", borderColor: "#16a34a" } },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await privateHttpClient.post("ngo/select-partner", {
            rfp_id: rfpId,
            submission_id: sub.id,
            ngo_name: ngoName
          });
          setTaggedNgoId(sub.id);
          message.success(`🏆 ${ngoName} selected & locked as implementation partner for RFP #${rfpId}!`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("refreshNotifications"));
          }
          fetchData();
        } catch (err) {
          console.warn("handleTagPartner warning:", err);
          setTaggedNgoId(sub.id);
          message.success(`🏆 ${ngoName} selected & locked!`);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("refreshNotifications"));
          }
          fetchData();
        }
      }
    });
  };

  const handleCreateProjectForTaggedPartner = () => {
    const taggedSub = submissions.find(s => String(s.id) === String(taggedNgoId) || String(s.created_by) === String(taggedNgoId) || String(s.partner_id) === String(taggedNgoId));
    const ngoName = taggedSub?.ngo_name || taggedSub?.name_of_the_organization || rfpRecord?.tagged_ngo_name || taggedSub?.ngo_email || "NGO Partner";
    const effectiveNgoId = taggedNgoId || taggedSub?.id || taggedSub?.partner_id || rfpRecord?.tagged_ngo_id || "";
    router.push(`/admin/forms/project?rfp_id=${rfpId}&ngo_id=${effectiveNgoId}&ngo_name=${encodeURIComponent(ngoName)}`);
  };

  const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const rfpTitle =
    rfpRecord?.rfp_title ||
    rfpRecord?.title ||
    rfpRecord?.project_title ||
    rfpRecord?.project_details ||
    rfpRecord?.rfp_information ||
    rfpRecord?.name ||
    `Request for Proposal #${rfpId}`;

  // Highest score calculation
  const highestScore = submissions.reduce((max, sub) => {
    const r = Number(sub.rating || 0);
    return r > max ? r : max;
  }, 0);

  const totalWeightage = (criteria || []).reduce(
    (sum, c) => sum + Number(c.weightage || c.weight || 10),
    0
  );

  const isRfpApproved =
    ["Approved", "Partner Tagged", "NGO Selected", "Selected"].includes(rfpRecord?.status) ||
    rfpRecord?.approval_status === "Approved" ||
    Boolean(taggedNgoId);

  const isRfpInApproval =
    ["Sent for Approval", "Submitted for Approval", "Pending Approval", "In Review"].includes(rfpRecord?.status) ||
    ["Pending Approval", "In Review"].includes(rfpRecord?.approval_status);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "120px 0", minHeight: "85vh", background: "#f8fafc" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "#475569", fontWeight: 700, fontSize: 15 }}>
          Loading Assessment Framework Matrix...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 48px", width: "100%" }}>
      {/* ── Top Breadcrumb & Navigation Bar ── */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space align="center" size={12}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            style={{
              borderRadius: 8,
              borderColor: "#cbd5e1",
              fontWeight: 600,
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}
          >
            Back
          </Button>

          <Button
            icon={<HistoryOutlined style={{ color: "#2563eb" }} />}
            onClick={fetchApprovalTrack}
            loading={loadingTrack}
            style={{
              borderRadius: 8,
              borderColor: "#93c5fd",
              color: "#1e40af",
              background: "#eff6ff",
              fontWeight: 700,
              boxShadow: "0 2px 6px rgba(37,99,235,0.1)"
            }}
          >
            📜 View Approval Track History
          </Button>

          <Breadcrumb
            items={[
              { title: <span style={{ color: "#64748b" }}>Admin</span> },
              { title: <span style={{ color: "#64748b" }}>Request for Proposal</span> },
              { title: <span style={{ color: "#0f172a", fontWeight: 700 }}>Assessment Framework View & Approval</span> },
            ]}
          />
        </Space>
      </div>

      {/* ── RFP Float Details & Status Overview Card ── */}
      <Card
        style={{
          borderRadius: 16,
          background: "#ffffff",
          marginBottom: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          border: "1px solid #cbd5e1"
        }}
        styles={{ body: { padding: "20px 24px" } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Space align="center">
            <SendOutlined style={{ color: "#dc2626", fontSize: 18 }} />
            <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
              RFP Float Details & Status Overview
            </Text>
          </Space>
          <Tag color="volcano" style={{ borderRadius: 12, padding: "4px 12px", fontWeight: 800, fontSize: 12 }}>
            Status: {rfpRecord?.status || "Floated"}
          </Tag>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: "block", color: "#64748b" }}>
                📅 Floated Date
              </Text>
              <Text strong style={{ fontSize: 14, color: "#0f172a" }}>
                {floatDetails.float_date ? dayjs(floatDetails.float_date).format("DD MMM YYYY") : "Recently Floated"}
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div style={{ background: "#eff6ff", padding: "12px 16px", borderRadius: 10, border: "1px solid #bfdbfe" }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: "block", color: "#1e40af" }}>
                👥 Assigned NGOs
              </Text>
              <Text strong style={{ fontSize: 14, color: "#1d4ed8" }}>
                {floatDetails.floated_ngos_count || submissions.length} NGO(s) Assigned
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div style={{ background: "#f0fdf4", padding: "12px 16px", borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: "block", color: "#166534" }}>
                ✅ Proposals Submitted
              </Text>
              <Text strong style={{ fontSize: 14, color: "#15803d" }}>
                {submissions.length} Submitted
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div style={{ background: "#fefce8", padding: "12px 16px", borderRadius: 10, border: "1px solid #fde68a" }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: "block", color: "#854d0e" }}>
                ⏳ Pending Submissions
              </Text>
              <Text strong style={{ fontSize: 14, color: "#b45309" }}>
                {Math.max(0, (floatDetails.floated_ngos_count || submissions.length) - submissions.length)} Pending
              </Text>
            </div>
          </Col>
        </Row>

        {/* Float Remarks */}
        <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <Text strong style={{ fontSize: 12, color: "#334155", display: "block", marginBottom: 2 }}>
            📝 Float Remarks & Notes:
          </Text>
          <Text style={{ fontSize: 13, color: "#475569" }}>
            {floatDetails.remarks || "No additional remarks added during float."}
          </Text>
        </div>
      </Card>

      {/* ── Key Metrics Overview Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }} styles={{ body: { padding: "16px 20px" } }}>
            <Space align="center" size={12}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserOutlined style={{ fontSize: 20, color: "#2563eb" }} />
              </div>
              <div>
                <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>No Of NGOs Submitted</Text>
                <Text strong style={{ fontSize: 22, color: "#0f172a" }}>{submissions.length}</Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }} styles={{ body: { padding: "16px 20px" } }}>
            <Space align="center" size={12}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckSquareOutlined style={{ fontSize: 20, color: "#16a34a" }} />
              </div>
              <div>
                <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>Criteria Factors</Text>
                <Text strong style={{ fontSize: 22, color: "#0f172a" }}>{criteria.length}</Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }} styles={{ body: { padding: "16px 20px" } }}>
            <Space align="center" size={12}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fefce8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrophyOutlined style={{ fontSize: 20, color: "#ca8a04" }} />
              </div>
              <div>
                <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>Highest Score</Text>
                <Text strong style={{ fontSize: 22, color: "#ca8a04" }}>{highestScore} <span style={{ fontSize: 13, color: "#94a3b8" }}>/ 100</span></Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }} styles={{ body: { padding: "16px 20px" } }}>
            <Space align="center" size={12}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <StarOutlined style={{ fontSize: 20, color: "#9333ea" }} />
              </div>
              <div>
                <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>Total Weightage</Text>
                <Text strong style={{ fontSize: 22, color: "#9333ea" }}>
                  {criteria.reduce((sum, c) => sum + Number(c.weightage || c.weight || 10), 0)} pts
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ── Main Comparative Assessment Matrix Table ── */}
      <Card style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", marginBottom: 24 }} styles={{ body: { padding: "20px 24px" } }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 800 }}>
              Implementing Agency Assessment Framework Matrix
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Score each NGO across fixed criteria. Scores & notes are saved and computed automatically.
            </Text>
          </div>
          <Tag color="purple" style={{ padding: "6px 14px", fontSize: 12, borderRadius: 14, fontWeight: 700 }}>
            Comparative Side-by-Side Rating
          </Tag>
        </div>

        <div style={{ border: "2px solid #dc2626", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(220, 38, 38, 0.12)" }}>
          {/* Table Header Banners */}
          <div style={{ background: "linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ea580c 100%)", color: "#ffffff", textAlign: "center", fontWeight: 800, fontSize: 15, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.2)", letterSpacing: "0.02em" }}>
            Implementing Agency Assessment Framework
          </div>
          <div style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)", color: "#fde047", textAlign: "center", fontWeight: 700, fontSize: 14, padding: "8px 16px", borderBottom: "2px solid #b91c1c" }}>
            {rfpTitle}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto", overflowY: "hidden", maxWidth: "100%", paddingBottom: 6 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left", minWidth: `${300 + submissions.length * 420}px` }}>
              <thead>
                {/* Header Row 1 */}
                <tr style={{ background: "#991b1b", color: "#ffffff", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
                  <th rowSpan={2} style={{ padding: "12px 10px", borderRight: "1px solid rgba(255,255,255,0.2)", width: "200px" }}>Indicators</th>
                  <th rowSpan={2} style={{ padding: "12px 8px", borderRight: "1px solid rgba(255,255,255,0.2)", width: "90px", textAlign: "center" }}>Weightage</th>
                  {submissions.length === 0 ? (
                    <th
                      colSpan={3}
                      style={{
                        padding: "12px 14px",
                        textAlign: "center",
                        background: "#991b1b",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#fecaca"
                      }}
                    >
                      NGO Submissions (0 Submitted)
                    </th>
                  ) : (
                    submissions.map((sub) => {
                      const isHighlighted = sub.id === highlightedNgoId;
                      const isTagged = String(sub.id) === String(taggedNgoId);
                      const subScoresObj = matrixScores[sub.id] || {};
                      const hasEnteredScores = Object.values(subScoresObj).some((val) => Number(val) > 0);
                      const isScored = isTagged || Number(sub.rating || 0) > 0 || hasEnteredScores || ["Evaluated", "Selected", "Submitted"].includes(sub.final_status);

                      const headerBg = isHighlighted
                        ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                        : isTagged
                        ? "linear-gradient(135deg, #15803d 0%, #166534 100%)"
                        : isScored
                        ? "linear-gradient(135deg, #0f766e 0%, #115e59 100%)"
                        : "#991b1b";

                      return (
                        <th
                          key={sub.id}
                          colSpan={3}
                          style={{
                            padding: "12px 14px",
                            textAlign: "center",
                            borderRight: isHighlighted ? "3px solid #0284c7" : "1px solid rgba(255,255,255,0.3)",
                            borderLeft: isHighlighted ? "3px solid #0284c7" : "none",
                            borderTop: isHighlighted ? "4px solid #38bdf8" : "none",
                            background: headerBg,
                            fontWeight: 800,
                            fontSize: 14,
                            color: "#ffffff",
                            transition: "all 0.4s ease",
                            whiteSpace: "nowrap"
                          }}
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "nowrap", justifyContent: "center", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>NGO ({sub.ngo_name || sub.ngo_email})</span>
                            
                            {isTagged ? (
                              <Tag color="gold" style={{ fontSize: 11, fontWeight: 800, borderRadius: 10, margin: 0, whiteSpace: "nowrap" }}>
                                🏆 Tagged Partner
                              </Tag>
                            ) : isScored ? (
                              <Tag color="cyan" style={{ fontSize: 10, fontWeight: 800, borderRadius: 10, margin: 0, whiteSpace: "nowrap" }}>
                                ✅ Form Submitted
                              </Tag>
                            ) : (
                              <Tag color="default" style={{ fontSize: 10, fontWeight: 700, borderRadius: 10, margin: 0, opacity: 0.9, whiteSpace: "nowrap" }}>
                                ⏳ Pending Score
                              </Tag>
                            )}

                            {/* 1. Eye Button */}
                            <Tooltip title="View NGO details & score form">
                              <Button
                                type="text"
                                size="small"
                                icon={<EyeOutlined style={{ color: "#ffffff", fontSize: 15 }} />}
                                onClick={() => openNgoDrawer(sub)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "rgba(255, 255, 255, 0.25)",
                                  borderRadius: "50%",
                                  width: 28,
                                  height: 28,
                                  border: "1px solid rgba(255, 255, 255, 0.5)",
                                  cursor: "pointer",
                                  flexShrink: 0
                                }}
                              />
                            </Tooltip>

                            {/* 2. Approve & Tag Button (Only shown to INITIATOR AFTER RFP is officially approved in workflow) */}
                            {isTagged ? (
                              <Tag color="gold" style={{ fontSize: 11, fontWeight: 800, borderRadius: 10, margin: 0, padding: "4px 8px", whiteSpace: "nowrap" }}>
                                🏆 Tagged Partner
                              </Tag>
                            ) : isRfpApproved && !taggedNgoId ? (
                              isInitiator ? (
                                <Tooltip title={`Approve & Tag ${sub.ngo_name || sub.ngo_email} as Implementation Partner`}>
                                  <Button
                                    type="default"
                                    size="small"
                                    icon={<TrophyOutlined style={{ color: "#15803d" }} />}
                                    onClick={() => handleTagPartner(sub)}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      background: "#ffffff",
                                      color: "#15803d",
                                      borderColor: "#ffffff",
                                      borderRadius: 8,
                                      height: 28,
                                      paddingInline: 10,
                                      fontWeight: 700,
                                      fontSize: 11,
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                                      cursor: "pointer",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0
                                    }}
                                  >
                                    Approve & Tag
                                  </Button>
                                </Tooltip>
                              ) : (
                                <Tag color="blue" style={{ fontSize: 10.5, fontWeight: 600, borderRadius: 6, margin: 0, padding: "2px 6px" }}>
                                  Awaiting Initiator
                                </Tag>
                              )
                            ) : null}
                          </div>
                        </th>
                      );
                    })
                  )}
                </tr>

                {/* Header Row 2 */}
                <tr style={{ background: "#7f1d1d", color: "#ffffff", borderBottom: "2px solid #b91c1c" }}>
                  {submissions.length === 0 ? (
                    <th colSpan={3} style={{ padding: "10px 12px", textAlign: "center", background: "#7f1d1d", color: "#fecaca" }}>
                      Status / Submission Progress
                    </th>
                  ) : (
                    submissions.map((sub) => {
                      const totalWeighted = (criteria || []).reduce((acc, c) => {
                        const s = Number((matrixScores[sub.id] || {})[c.id] || 0);
                        const w = Number(c.weightage || c.weight || 10);
                        return acc + ((s / 10) * w);
                      }, 0);

                      return (
                        <React.Fragment key={`sub_hdr_${sub.id}`}>
                          <th style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, textAlign: "left", width: 140, background: "#065f46" }}>Comments</th>
                          <th style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, textAlign: "center", width: 110, background: "#047857" }}>Score (out of 10)</th>
                          <th style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, textAlign: "center", width: 85, background: "#059669" }}>Wt. Score</th>
                        </React.Fragment>
                      );
                    })
                  )}
                </tr>
              </thead>

              {/* Table Body - Criteria Rows */}
              <tbody>
                {criteria.length === 0 ? (
                  <tr>
                    <td colSpan={2 + (submissions.length > 0 ? submissions.length * 3 : 3)} style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                      No evaluation criteria defined for this RFP.
                    </td>
                  </tr>
                ) : (
                  criteria.map((c, cIdx) => (
                    <tr
                      key={c.id || cIdx}
                      style={{
                        background: cIdx % 2 === 0 ? "#ffffff" : "#faf5f5",
                        borderBottom: "1px solid #fecaca",
                        transition: "background 0.2s ease"
                      }}
                    >
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1e293b", fontSize: 13, borderRight: "1px solid #fee2e2" }}>
                        {c.criteria_name || c.name || `Indicator ${cIdx + 1}`}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#b91c1c", fontSize: 13, borderRight: "2px solid #ef4444" }}>
                        {c.weightage || c.weight || 10}
                      </td>

                      {submissions.length === 0 ? (
                        <td colSpan={3} style={{ padding: "12px 14px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                          —
                        </td>
                      ) : (
                        submissions.map((sub) => {
                          const scoreVal = (matrixScores[sub.id] || {})[c.id];
                          const scoreNum = scoreVal !== undefined ? scoreVal : "";
                          const commentVal = (matrixOrgDetails[sub.id] || {})[c.id] ?? (c.org_details || sub.organization_profile || "");
                          const weightNum = Number(c.weightage || c.weight || 10);
                          const weightedVal = scoreNum !== "" ? (((Number(scoreNum)) / 10) * weightNum).toFixed(1) : "—";
                          const isHighlighted = highlightedNgoId === sub.id;

                          return (
                            <React.Fragment key={`sub_cell_${sub.id}_${c.id}`}>
                              <td style={{ padding: "8px 10px", fontSize: 12, color: "#334155", borderRight: "1px solid #e2e8f0", background: isHighlighted ? "#ecfdf5" : "inherit" }}>
                                {commentVal ? (
                                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }} title={commentVal}>
                                    {commentVal}
                                  </span>
                                ) : (
                                  <span style={{ color: "#cbd5e1" }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: "8px 10px", textAlign: "center", borderRight: "1px solid #e2e8f0", background: isHighlighted ? "#ecfdf5" : "inherit" }}>
                                {scoreNum !== "" ? (
                                  <Tag color="blue" style={{ fontWeight: 700, borderRadius: 12, paddingInline: 8 }}>
                                    {scoreNum} / 10
                                  </Tag>
                                ) : (
                                  <Tag color="default" style={{ color: "#94a3b8" }}>—</Tag>
                                )}
                              </td>
                              <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#15803d", fontSize: 12.5, borderRight: "1.5px solid #cbd5e1", background: isHighlighted ? "#dcfce7" : "inherit" }}>
                                {weightedVal}
                              </td>
                            </React.Fragment>
                          );
                        })
                      )}
                    </tr>
                  ))
                )}

                {/* Grand Total Row */}
                <tr style={{ background: "#fee2e2", borderTop: "2px solid #ef4444", fontWeight: 800 }}>
                  <td style={{ padding: "14px", color: "#991b1b", fontSize: 13, borderRight: "1px solid #fecaca" }}>
                    Grand Total Weightage &amp; Score
                  </td>
                  <td style={{ padding: "14px", textAlign: "center", color: "#991b1b", fontSize: 14, borderRight: "2px solid #ef4444" }}>
                    {totalWeightage}
                  </td>

                  {submissions.length === 0 ? (
                    <td colSpan={3} style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                      —
                    </td>
                  ) : (
                    submissions.map((sub) => {
                      const totalWeighted = (criteria || []).reduce((acc, c) => {
                        const s = Number((matrixScores[sub.id] || {})[c.id] || 0);
                        const w = Number(c.weightage || c.weight || 10);
                        return acc + ((s / 10) * w);
                      }, 0);

                      const isTagged = taggedNgoId && String(taggedNgoId) === String(sub.id);

                      return (
                        <React.Fragment key={`total_${sub.id}`}>
                          <td style={{ padding: "14px 10px", textAlign: "right", color: "#065f46", fontSize: 13, fontWeight: 700, borderRight: "1px solid #d1fae5" }}>
                            {isTagged ? "🏆 Tagged Partner" : "Total Wt. Score:"}
                          </td>
                          <td colSpan={2} style={{ padding: "14px 10px", textAlign: "center", color: "#047857", fontSize: 14, fontWeight: 800, borderRight: "1.5px solid #cbd5e1", background: isTagged ? "#bbf7d0" : "#d1fae5" }}>
                            {totalWeighted.toFixed(1)}
                          </td>
                        </React.Fragment>
                      );
                    })
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div style={{ marginTop: 20 }}>
          {isRfpApproved ? (
            <div
              style={{
                background: taggedNgoId ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: taggedNgoId ? "1.5px solid #86efac" : "1.5px solid #93c5fd",
                borderRadius: 12,
                padding: "14px 20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
              }}
            >
              {/* Info Block */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    fontSize: 20,
                    background: taggedNgoId ? "#bbf7d0" : "#bfdbfe",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: taggedNgoId ? "#166534" : "#1d4ed8",
                    flexShrink: 0
                  }}
                >
                  <TrophyOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>
                    {taggedNgoId
                      ? `RFP Approved — Selected Partner: ${submissions.find(s => String(s.id) === String(taggedNgoId))?.ngo_name || "NGO Partner"}`
                      : isInitiator
                      ? "RFP Approved! Select Winning Implementation Partner"
                      : "RFP Approved — Awaiting Initiator Partner Selection"}
                  </Text>
                  <Text style={{ fontSize: 12, color: taggedNgoId ? "#15803d" : "#1e40af" }}>
                    {taggedNgoId
                      ? "Implementation partner tagged and locked. Selection is finalized."
                      : isInitiator
                      ? "The approval workflow is complete. Choose 1 NGO below to approve & tag."
                      : `The approval workflow is complete. Only the RFP initiator (${initiatorName}) is authorized to select and tag the winning partner.`}
                  </Text>
                </div>
              </div>

              {/* Actions Row */}
              <Space align="center" size={10} wrap style={{ margin: 0 }}>
                {taggedNgoId ? (
                  <>
                    <Tag
                      color="success"
                      icon={<CheckCircleOutlined />}
                      style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8, margin: 0 }}
                    >
                      Selection Locked ({submissions.find(s => String(s.id) === String(taggedNgoId))?.ngo_name || "NGO"})
                    </Tag>
                    <Button
                      type="primary"
                      icon={<RocketOutlined />}
                      onClick={handleCreateProjectForTaggedPartner}
                      style={{
                        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                        borderRadius: 8,
                        fontWeight: 700,
                        height: 36,
                        boxShadow: "0 2px 6px rgba(37,99,235,0.2)"
                      }}
                    >
                      Create Project
                    </Button>
                  </>
                ) : isInitiator ? (
                  submissions.map((sub) => (
                    <Button
                      key={sub.id}
                      type="primary"
                      onClick={() => handleTagPartner(sub)}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        height: 36,
                        background: "#ffffff",
                        borderColor: "#16a34a",
                        color: "#15803d",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                      }}
                    >
                      Approve & Select {sub.ngo_name || sub.ngo_email}
                    </Button>
                  ))
                ) : (
                  <Tag color="processing" style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    🔒 Selection restricted to Initiator ({initiatorName})
                  </Tag>
                )}
              </Space>
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ background: "#fff7ed", padding: "12px 18px", borderRadius: 10, border: "1px solid #fed7aa", width: "100%" }}>
              <Text style={{ fontSize: 13, color: "#c2410c", fontWeight: 600 }}>
                ⏳ <strong>Pending NGO Proposals:</strong> No NGO proposals have been submitted yet. At least 1 NGO must submit a proposal form before you can evaluate and submit this RFP for approval.
              </Text>
            </div>
          ) : (
            <div style={{ background: "#f8fafc", padding: "12px 18px", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
              <Text type="secondary" style={{ fontSize: 12.5, color: "#475569" }}>
                ℹ️ <strong>Workflow Sequence:</strong> Click the 👁️ icon on any NGO column to view the full proposal and submit assessment scores → Submit the <strong>Approval Path Workflow</strong> below. Once final approval is granted, NGO Partner Selection will unlock.
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* ── Approval Path Workflow Engine (Locked until at least 1 NGO submits a proposal) ── */}
      {rfpId && submissions.length > 0 ? (
        <div id="rfp-approval-path-engine-card" style={{ marginTop: 24, marginBottom: 24 }}>
          <FormApprovalPanel
            form_slug="request_for_proposal"
            record_id={rfpId}
            onWorkflowLoaded={(wf) => {
              setWorkflowState(wf);
            }}
            onStatusChange={() => {
              fetchData();
            }}
          />
        </div>
      ) : (
        <Card
          style={{
            marginTop: 24,
            marginBottom: 24,
            borderRadius: 14,
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}
          styles={{ body: { padding: "36px 20px" } }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text strong style={{ fontSize: 15, color: "#334155", display: "block" }}>
                  Approval Workflow Locked (No NGO Submissions)
                </Text>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4, maxWidth: 520, marginInline: "auto" }}>
                  Assigned NGOs must submit at least 1 proposal form for this RFP before the assessment scores can be evaluated and sent through the multi-level approval workflow.
                </div>
              </div>
            }
          />
        </Card>
      )}

      {/* ── View & Edit NGO Assessment Modal ── */}
      <Modal
        className="rfp-gradient-modal"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="rfp-modal-icon-badge">
              <EyeOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#ffffff", lineHeight: 1.3 }}>
                Full Proposal Form &amp; Assessment
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.92)" }}>
                Organization: {detailsDrawer.submission?.ngo_name || detailsDrawer.submission?.ngo_email || "NGO Implementation Partner"} • RFP #{rfpId}
              </p>
            </div>
          </div>
        }
        open={detailsDrawer.open}
        onCancel={() => setDetailsDrawer({ open: false, submission: null })}
        width={1200}
        style={{ top: 20, maxWidth: "96vw" }}
        closeIcon={<span style={{ color: "#ffffff", fontSize: 16 }}>✕</span>}
        footer={null}
        destroyOnHidden
      >
        <div style={{ maxHeight: "78vh", overflowY: "auto", paddingRight: 8 }}>
          {detailsDrawer.submission && (
            <div>
              {/* NGO Header Card */}
              <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 12, padding: "18px 22px", color: "#fff", marginBottom: 20 }}>
                <Row align="middle" justify="space-between">
                  <Col>
                    <Title level={4} style={{ color: "#fff", margin: 0 }}>
                      {detailsDrawer.submission.ngo_name || "NGO Implementation Partner"}
                    </Title>
                    <Text style={{ color: "#94a3b8", fontSize: 13 }}>
                      📧 {detailsDrawer.submission.ngo_email || "No email"} | Submitted: {detailsDrawer.submission.created_at ? dayjs(detailsDrawer.submission.created_at).format("DD MMM YYYY, HH:mm") : "Recently"}
                    </Text>
                  </Col>
                  <Col>
                    <Tag color={detailsDrawer.submission.final_status === "Evaluated" ? "success" : "processing"} style={{ fontSize: 13, padding: "4px 12px", borderRadius: 16, fontWeight: 700 }}>
                      {detailsDrawer.submission.final_status || detailsDrawer.submission.status || "Submitted"}
                    </Tag>
                  </Col>
                </Row>
              </div>

              {/* ── Dynamic Form Sections Rendered via NgoDetailsView ── */}
              <div style={{ marginBottom: 24 }}>
                {proposalSchema ? (
                  <NgoDetailsView
                    schema={proposalSchema}
                    data={{
                      ...detailsDrawer.submission,
                      documents: detailsDrawer.submission.documents || [],
                      t_documents: detailsDrawer.submission.documents || [],
                      format_of_budget: detailsDrawer.submission.format_of_budget || [],
                      t_format_of_budget: detailsDrawer.submission.format_of_budget || [],
                    }}
                    hasRecord={true}
                    emptyPlaceholder="Not provided"
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Spin tip="Loading form schema..." />
                  </div>
                )}
              </div>

              {/* Assessment Scoring & Score Adding Section */}
              <Divider orientation="left" style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                ⭐ Implementing Agency Assessment Scoring
              </Divider>

              {(() => {
                const subStatus = detailsDrawer.submission?.final_status || detailsDrawer.submission?.status;
                const isModalEditable = isEditMode && !["Sent for Approval", "Approved", "Submitted for Approval", "Completed"].includes(subStatus);

                const totalMaxWeight = criteria.reduce((sum, c) => sum + Number(c.weightage || c.weight || 10), 0);
                const totalObtainedScore = criteria.reduce((sum, c) => sum + ((Number(drawerScores[c.id] || 0) / 10) * Number(c.weightage || c.weight || 10)), 0).toFixed(1);
                const scorePercentage = totalMaxWeight > 0 ? (Number(totalObtainedScore) / totalMaxWeight) * 100 : 0;

                return (
                  <Card
                    style={{
                      borderRadius: 14,
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      marginBottom: 24,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.04)"
                    }}
                    styles={{ body: { padding: "20px" } }}
                  >
                    {/* Evaluated Score Header Bar */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                        padding: "16px 20px",
                        borderRadius: 12,
                        marginBottom: 18,
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>
                          Score & Evaluate — {detailsDrawer.submission?.ngo_name || detailsDrawer.submission?.ngo_email}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {isModalEditable
                            ? "Enter scores (0-10) and criteria notes for this NGO proposal below."
                            : "Assessment scores and feedback for this NGO are locked (Read-Only Mode)."}
                        </Text>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ textAlign: "right" }}>
                          <Text style={{ fontSize: 11, color: "#64748b", fontWeight: 700, display: "block", letterSpacing: "0.03em" }}>
                            EVALUATED SCORE
                          </Text>
                          <Text strong style={{ fontSize: 20, color: "#0f172a" }}>
                            {totalObtainedScore} <span style={{ fontSize: 13, color: "#64748b" }}>/ {totalMaxWeight}</span>
                          </Text>
                        </div>
                        <Tag
                          color={scorePercentage >= 70 ? "success" : scorePercentage >= 40 ? "warning" : "default"}
                          style={{ fontSize: 14, fontWeight: 800, padding: "6px 14px", borderRadius: 12, margin: 0 }}
                        >
                          {scorePercentage.toFixed(0)}%
                        </Tag>
                      </div>
                    </div>

                    {/* Criteria Scoring Rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {criteria.map((c) => {
                        const weightVal = Number(c.weightage || c.weight || 10);
                        const scoreVal = Number(drawerScores[c.id] || 0);
                        const wtScore = ((scoreVal / 10) * weightVal).toFixed(1);

                        return (
                          <div
                            key={c.id}
                            style={{
                              background: "#f8fafc",
                              padding: "12px 16px",
                              borderRadius: 10,
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <Row gutter={[12, 10]} align="middle">
                              {/* 1. Criterion Title & Weight */}
                              <Col xs={24} sm={8} md={7}>
                                <Text strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>
                                  {c.criteria_name || c.name}
                                </Text>
                                <Tag color="blue" style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, marginTop: 2, paddingInline: 6 }}>
                                  Weightage: {weightVal} pts
                                </Tag>
                              </Col>

                              {/* 2. Score (0 - 10) Input */}
                              <Col xs={12} sm={8} md={4}>
                                <Text style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 2 }}>
                                  Score (0-10):
                                </Text>
                                {isModalEditable ? (
                                  <InputNumber
                                    min={0}
                                    max={10}
                                    value={scoreVal}
                                    onChange={(val) => setDrawerScores((prev) => ({ ...prev, [c.id]: val }))}
                                    style={{ width: "100%", borderRadius: 6, fontWeight: 700 }}
                                  />
                                ) : (
                                  <Tag color="blue" style={{ fontWeight: 800, fontSize: 12, padding: "3px 10px", borderRadius: 6, margin: 0 }}>
                                    {scoreVal} / 10
                                  </Tag>
                                )}
                              </Col>

                              {/* 3. Weighted Score Badge */}
                              <Col xs={12} sm={8} md={4} style={{ textAlign: "center" }}>
                                <Text style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 2 }}>
                                  Weighted Score:
                                </Text>
                                <Tag color="green" style={{ fontSize: 13, fontWeight: 800, padding: "3px 12px", borderRadius: 6, margin: 0 }}>
                                  {wtScore} / {weightVal}
                                </Tag>
                              </Col>

                              {/* 4. Inline Criteria Notes */}
                              <Col xs={24} md={9}>
                                <Text style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 2 }}>
                                  Comment:
                                </Text>
                                {isModalEditable ? (
                                  <Input
                                    placeholder="Enter comment for this criterion..."
                                    value={drawerOrgDetails[c.id] || ""}
                                    onChange={(e) => setDrawerOrgDetails((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                    style={{ borderRadius: 6, fontSize: 12 }}
                                  />
                                ) : (
                                  <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600, background: "#ffffff", padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                                    {drawerOrgDetails[c.id] || "—"}
                                  </div>
                                )}
                              </Col>
                            </Row>
                          </div>
                        );
                      })}

                      {/* General Summary Notes */}
                      <div style={{ marginTop: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                          📝 General Evaluation Notes / Summary:
                        </Text>
                        {isModalEditable ? (
                          <Input.TextArea
                            rows={2}
                            placeholder="Enter overall assessment feedback for this NGO..."
                            value={drawerNotes}
                            onChange={(e) => setDrawerNotes(e.target.value)}
                            style={{ borderRadius: 8, fontSize: 12 }}
                          />
                        ) : (
                          <div style={{ fontSize: 12, color: "#1e293b", background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            {drawerNotes || "No general notes provided."}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div style={{ marginTop: 12, textAlign: "right" }}>
                        {isModalEditable ? (
                          <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={drawerSaving}
                            onClick={handleSubmitDrawerScores}
                            style={{
                              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                              border: "none",
                              borderRadius: 8,
                              fontWeight: 700,
                              height: 42,
                              paddingInline: 28,
                              boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)"
                            }}
                          >
                            Submit Assessment & Save Score
                          </Button>
                        ) : (
                          <Tag
                            color="success"
                            icon={<CheckCircleOutlined />}
                            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, borderRadius: 8, margin: 0 }}
                          >
                            🔒 Ratings Submitted & Locked (Read-Only Mode)
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Approval Process Track Audit Modal ── */}
      <Modal
        className="rfp-gradient-modal"
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="rfp-modal-icon-badge">
              <HistoryOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#ffffff", lineHeight: 1.3 }}>
                RFP Approval Process Track Audit Trail
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.92)" }}>
                RFP Ref: #{rfpId} • Chronological approval lifecycle and stage tracking
              </p>
            </div>
          </div>
        }
        open={trackModalOpen}
        onCancel={() => setTrackModalOpen(false)}
        footer={null}
        width={1080}
        style={{ top: 20, maxWidth: "96vw" }}
        closeIcon={<span style={{ color: "#ffffff", fontSize: 16 }}>✕</span>}
        destroyOnHidden
      >
        <div style={{ padding: "16px 8px", maxHeight: "76vh", overflowY: "auto" }}>
          {approvalTrackData.length === 0 ? (
            <Empty description="No approval process track history found for this RFP yet." style={{ padding: "60px 0" }} />
          ) : (
            <Timeline
              mode="left"
              items={approvalTrackData.map((item, idx) => {
                const isApproved = item.apt_accept_status === "Approved";
                const isPending = item.apt_accept_status === "Pending Approval";

                return {
                  key: item.apt_id || idx,
                  color: isApproved ? "green" : isPending ? "orange" : "blue",
                  dot: isApproved ? <CheckCircleOutlined style={{ fontSize: 18 }} /> : <ClockCircleOutlined style={{ fontSize: 18 }} />,
                  children: (
                    <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: 12, border: "1px solid #cbd5e1", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                        <Tag color={isApproved ? "success" : "processing"} style={{ fontWeight: 800, borderRadius: 10, paddingInline: 12, fontSize: 13 }}>
                          {item.apt_accept_step || item.apt_accept_status}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                          📅 {item.apt_created_at ? dayjs(item.apt_created_at).format("DD MMM YYYY, HH:mm A") : "—"}
                        </Text>
                      </div>

                      <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, marginBottom: 4 }}>
                        👤 By: {item.user_name || item.user_email || `User #${item.apt_user_id}`} <span style={{ color: "#64748b", fontWeight: 500 }}>({item.apt_user_role || "User"})</span>
                      </div>

                      {item.recipient_name || item.apt_recipient_role ? (
                        <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
                          📧 Assigned To: <strong>{item.recipient_name || item.recipient_email || `Role: ${item.apt_recipient_role}`}</strong>
                        </div>
                      ) : null}

                      {item.apt_remarks ? (
                        <div style={{ fontSize: 13, color: "#334155", fontStyle: "italic", marginTop: 8, background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                          💬 Remarks: "{item.apt_remarks}"
                        </div>
                      ) : null}

                      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 10, borderTop: "1px dashed #e2e8f0", paddingTop: 6, display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <span>ID: <code style={{ color: "#2563eb", fontWeight: 700 }}>{item.apt_id}</code></span>
                        <span>Created By (User ID): <strong>{item.apt_created_by}</strong> | Updated By (User ID): <strong>{item.apt_updated_by}</strong></span>
                      </div>
                    </div>
                  )
                };
              })}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function RfpAssessmentPageView() {
  return (
    <App>
      <RfpAssessmentContent />
    </App>
  );
}
