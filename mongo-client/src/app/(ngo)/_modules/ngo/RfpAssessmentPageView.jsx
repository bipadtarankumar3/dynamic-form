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
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

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

function RfpAssessmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { modal, message } = App.useApp();

  const rfpId = searchParams.get("rfp_id") || searchParams.get("id");

  const [rfpRecord, setRfpRecord] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [floatDetails, setFloatDetails] = useState({ float_date: null, remarks: "", floated_ngos_count: 0, ngo_names: [] });
  const [loading, setLoading] = useState(true);

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

  // Approval Modal & Role/User Selection State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rolesList, setRolesList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [sendingApproval, setSendingApproval] = useState(false);

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
    fetchRolesAndUsers();
  }, []);

  const fetchRolesAndUsers = async () => {
    try {
      const [rolesRes, usersRes] = await Promise.allSettled([
        privateHttpClient.get("auth/roles"),
        privateHttpClient.get("auth/users"),
      ]);

      if (rolesRes.status === "fulfilled") {
        setRolesList(rolesRes.value?.data?.data || []);
      }
      if (usersRes.status === "fulfilled") {
        setUsersList(usersRes.value?.data?.data || []);
      }
    } catch (err) {
      console.warn("fetchRolesAndUsers warning:", err);
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

  const handleConfirmSendForApproval = async () => {
    if (!selectedUserId && !selectedRoleId) {
      message.warning("Please select a role and user to send the approval notification.");
      return;
    }

    const selectedUserObj = usersList.find(u => String(u.id) === String(selectedUserId) || u.email === selectedUserId);
    const selectedRoleObj = rolesList.find(r => String(r.id) === String(selectedRoleId) || r.name === selectedRoleId);
    const targetUserName = selectedUserObj?.name || selectedUserObj?.email || "Selected Approver";
    const targetRoleName = selectedRoleObj?.name || "Role";

    modal.confirm({
      title: "Confirm Submit for Approval",
      icon: <SendOutlined style={{ color: "#dc2626" }} />,
      content: `Are you sure you want to submit this RFP Assessment Matrix for approval to ${targetUserName} (${targetRoleName})?`,
      okText: "Yes, Send for Approval",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setSendingApproval(true);
        try {
          await handleSaveAll("Sent for Approval", {
            approver_role_id: selectedRoleId,
            assigned_approver_id: selectedUserId,
            approval_remarks: approvalRemarks
          });

          message.success(`Notification & RFP Assessment Matrix sent for approval to ${targetUserName} (${targetRoleName})!`);
          setApprovalModalOpen(false);
        } catch (err) {
          console.error("handleConfirmSendForApproval error:", err);
          message.error("Failed to send matrix for approval.");
        } finally {
          setSendingApproval(false);
        }
      }
    });
  };

  const handleTagPartner = async (sub) => {
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
    const taggedSub = submissions.find(s => String(s.id) === String(taggedNgoId));
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const ngoName = taggedSub?.ngo_name || taggedSub?.ngo_email || "NGO Partner";
    window.location.href = `${baseUrl}/admin/forms/project?rfp_id=${rfpId}&ngo_id=${taggedNgoId}&ngo_name=${encodeURIComponent(ngoName)}`;
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
                  {submissions.map((sub) => {
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

                          {/* 2. Approve & Tag Button (Only shown when no NGO is tagged yet) */}
                          {isTagged ? (
                            <Tag color="gold" style={{ fontSize: 11, fontWeight: 800, borderRadius: 10, margin: 0, padding: "4px 8px", whiteSpace: "nowrap" }}>
                              🏆 Tagged Partner
                            </Tag>
                          ) : !taggedNgoId ? (
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
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* Header Row 2 */}
                <tr style={{ background: "#7f1d1d", color: "#ffffff", borderBottom: "2px solid #b91c1c" }}>
                  {submissions.map((sub) => {
                    const isHighlighted = sub.id === highlightedNgoId;
                    const isTagged = String(sub.id) === String(taggedNgoId);
                    const subScoresObj = matrixScores[sub.id] || {};
                    const hasEnteredScores = Object.values(subScoresObj).some((val) => Number(val) > 0);
                    const isScored = isTagged || Number(sub.rating || 0) > 0 || hasEnteredScores || ["Evaluated", "Selected", "Submitted"].includes(sub.final_status);

                    const subHeaderBg = isHighlighted
                      ? "#0284c7"
                      : isTagged
                      ? "#14532d"
                      : isScored
                      ? "#0f766e"
                      : "#7f1d1d";

                    return (
                      <React.Fragment key={sub.id}>
                        <th style={{ padding: "10px 8px", borderRight: "1px solid rgba(255,255,255,0.2)", borderLeft: isHighlighted ? "3px solid #0284c7" : "none", background: subHeaderBg, color: "#ffffff", width: "180px", minWidth: "180px", transition: "all 0.4s ease" }}>Comments</th>
                        <th style={{ padding: "10px 4px", borderRight: "1px solid rgba(255,255,255,0.2)", background: subHeaderBg, color: "#ffffff", width: "120px", minWidth: "120px", textAlign: "center", transition: "all 0.4s ease" }}>Score (out of 10)</th>
                        <th style={{ padding: "10px 4px", borderRight: isHighlighted ? "3px solid #0284c7" : "1px solid rgba(255,255,255,0.2)", background: subHeaderBg, color: "#ffffff", width: "90px", minWidth: "90px", textAlign: "center", transition: "all 0.4s ease" }}>Wt. Score</th>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {criteria.map((c, idx) => {
                  const weightVal = Number(c.weightage || c.weight || 10);

                  return (
                    <tr key={c.id || idx} style={{ borderBottom: "1px solid #cbd5e1", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <td style={{ padding: "10px 10px", borderRight: "1px solid #cbd5e1", fontWeight: 700, color: "#0f172a" }}>
                        {c.criteria_name || c.name}
                      </td>
                      <td style={{ padding: "10px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontWeight: 800, color: "#dc2626", fontSize: 13 }}>
                        {weightVal}
                      </td>

                      {/* 3 Columns per NGO */}
                      {submissions.map((sub) => {
                        const isHighlighted = sub.id === highlightedNgoId;
                        const isTagged = String(sub.id) === String(taggedNgoId);
                        const subScoresObj = matrixScores[sub.id] || {};
                        const hasEnteredScores = Object.values(subScoresObj).some((val) => Number(val) > 0);
                        const isScored = isTagged || Number(sub.rating || 0) > 0 || hasEnteredScores || ["Evaluated", "Selected", "Submitted"].includes(sub.final_status);

                        const scoreVal = Number(matrixScores[sub.id]?.[c.id] || 0);
                        const wtScore = ((scoreVal / 10) * weightVal).toFixed(1);

                        // Comments are ONLY evaluation notes typed for this criterion, NOT falling back to organization profile!
                        const orgDetailText = matrixOrgDetails[sub.id]?.[c.id] ?? (c.org_details || "");

                        const cellBg = isHighlighted
                          ? "#f0f9ff"
                          : isTagged
                          ? (idx % 2 === 0 ? "#f0fdf4" : "#dcfce7")
                          : isScored
                          ? (idx % 2 === 0 ? "#f0fdfa" : "#ccfbf1")
                          : (idx % 2 === 0 ? "#ffffff" : "#f8fafc");

                        return (
                          <React.Fragment key={sub.id}>
                            <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", borderLeft: isHighlighted ? "3px solid #0284c7" : "none", background: cellBg, transition: "all 0.4s ease" }}>
                              <div style={{ fontSize: "12px", color: orgDetailText ? "#1e293b" : "#94a3b8", fontWeight: orgDetailText ? 600 : 400, fontStyle: orgDetailText ? "normal" : "italic", padding: "2px 4px" }}>
                                {orgDetailText || "—"}
                              </div>
                            </td>
                            <td style={{ padding: "6px 4px", textAlign: "center", borderRight: "1px solid #cbd5e1", background: cellBg, transition: "all 0.4s ease" }}>
                              <Tag color={isScored ? "blue" : "default"} style={{ fontWeight: 800, fontSize: "12px", padding: "2px 10px", borderRadius: 6, margin: 0 }}>
                                {scoreVal} / 10
                              </Tag>
                            </td>
                            <td style={{ padding: "10px 4px", textAlign: "center", borderRight: isHighlighted ? "3px solid #0284c7" : "1px solid #cbd5e1", background: cellBg, fontWeight: 800, color: "#16a34a", fontSize: 13, transition: "all 0.4s ease" }}>
                              {wtScore}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr style={{ background: "#fecdd3", fontWeight: 800, borderTop: "2px solid #b91c1c" }}>
                  <td style={{ padding: "12px 14px", borderRight: "1px solid #cbd5e1", textAlign: "center", fontSize: 13, color: "#881337" }}>
                    Grand Total Weightage & Score
                  </td>
                  <td style={{ padding: "12px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1", color: "#dc2626", fontSize: 14 }}>
                    {criteria.reduce((sum, c) => sum + Number(c.weightage || c.weight || 10), 0)}
                  </td>
                  {submissions.map((sub) => {
                    const isHighlighted = sub.id === highlightedNgoId;
                    const totalWt = criteria.reduce((sum, c) => {
                      const s = Number(matrixScores[sub.id]?.[c.id] || 0);
                      const w = Number(c.weightage || c.weight || 10);
                      return sum + ((s / 10) * w);
                    }, 0).toFixed(1);

                    return (
                      <React.Fragment key={sub.id}>
                        <td colSpan={2} style={{ padding: "12px 10px", textAlign: "right", borderRight: "1px solid #cbd5e1", borderLeft: isHighlighted ? "3px solid #0284c7" : "none", background: isHighlighted ? "#bae6fd" : "transparent", fontSize: 13, color: "#1e293b", transition: "all 0.5s ease" }}>
                          Total Wt. Score:
                        </td>
                        <td style={{ padding: "12px 6px", textAlign: "center", borderRight: isHighlighted ? "3px solid #0284c7" : "1px solid #cbd5e1", background: isHighlighted ? "#bae6fd" : "transparent", color: "#15803d", fontSize: 15, transition: "all 0.5s ease" }}>
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

        {/* Bottom Action Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 24, alignItems: "center" }}>
          {!isEditMode ? (
            <div
              style={{
                width: "100%",
                background: taggedNgoId ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: taggedNgoId ? "1.5px solid #86efac" : "1.5px solid #cbd5e1",
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
                    background: taggedNgoId ? "#bbf7d0" : "#e2e8f0",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: taggedNgoId ? "#166534" : "#475569",
                    flexShrink: 0
                  }}
                >
                  <TrophyOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>
                    {taggedNgoId
                      ? `RFP Approved — Selected Partner: ${submissions.find(s => String(s.id) === String(taggedNgoId))?.ngo_name || "NGO Partner"}`
                      : "Approver Action: Select NGO Implementation Partner"}
                  </Text>
                  <Text style={{ fontSize: 12, color: taggedNgoId ? "#15803d" : "#64748b" }}>
                    {taggedNgoId
                      ? "Implementation partner tagged and locked. Selection is finalized."
                      : "Select 1 NGO implementation partner to approve & tag for this RFP."}
                  </Text>
                </div>
              </div>

              {/* Actions Row */}
              <Space align="center" size={10} wrap style={{ margin: 0 }}>
                {taggedNgoId ? (
                  <Tag
                    color="success"
                    icon={<CheckCircleOutlined />}
                    style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8, margin: 0 }}
                  >
                    Selection Locked ({submissions.find(s => String(s.id) === String(taggedNgoId))?.ngo_name || "NGO"})
                  </Tag>
                ) : (
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
                )}
              </Space>
            </div>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={saving}
              onClick={() => setApprovalModalOpen(true)}
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%)",
                border: "2px solid #fde047",
                borderRadius: 10,
                fontWeight: 700,
                height: 44,
                paddingInline: 32,
                boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)"
              }}
            >
              Send for Approval
            </Button>
          )}
        </div>
      </Card>

      {/* ── View & Edit NGO Assessment Modal ── */}
      <Modal
        title={
          <Space align="center" size={10}>
            <EyeOutlined style={{ color: "#2563eb", fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Full Proposal Form & Assessment — {detailsDrawer.submission?.ngo_name || detailsDrawer.submission?.ngo_email}
            </span>
          </Space>
        }
        open={detailsDrawer.open}
        onCancel={() => setDetailsDrawer({ open: false, submission: null })}
        width="90%"
        centered
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

              {/* Proposal Sections */}
              <Divider orientation="left" style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                📜 Proposal Sections & Written Submissions
              </Divider>

              <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                {[
                  { key: "organization_profile",    label: "Org Profile",               icon: "🏢" },
                  { key: "project_understanding",   label: "Project Understanding",     icon: "🎯" },
                  { key: "methodology",             label: "Methodology & Approach",    icon: "⚙️" },
                  { key: "team",                    label: "Team Structure",            icon: "👥" },
                  { key: "implementation_plan",     label: "Implementation Plan",       icon: "📅" },
                  { key: "risk_plan",               label: "Risk Management Plan",      icon: "⚠️" },
                  { key: "budget",                  label: "Proposed Financial Budget", icon: "💰", isBudget: true },
                  { key: "timeline",                label: "Project Timeline",          icon: "⏳" },
                  { key: "sustainability",          label: "Sustainability Model",      icon: "🌿" },
                  { key: "monitoring_framework",    label: "Monitoring Framework",      icon: "📊" },
                ].map((field) => {
                  const val = detailsDrawer.submission[field.key];
                  const isBudget = field.isBudget;
                  const hasContent = Boolean(val && String(val).trim() !== "" && val !== "0");

                  return (
                    <Col xs={24} sm={12} md={6} lg={6} xl={6} key={field.key}>
                      <div
                        style={{
                          background: isBudget ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "#ffffff",
                          borderRadius: 10,
                          padding: "12px 14px",
                          border: isBudget ? "1.5px solid #86efac" : "1px solid #e2e8f0",
                          height: "100%",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                          display: "flex",
                          flexDirection: "column"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 15 }}>{field.icon}</span>
                          <Text style={{ fontSize: 12, fontWeight: 700, color: isBudget ? "#15803d" : "#334155" }} ellipsis={{ tooltip: field.label }}>
                            {field.label}
                          </Text>
                        </div>

                        {isBudget ? (
                          <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #bbf7d0", display: "inline-block", marginTop: "auto" }}>
                            <Text strong style={{ fontSize: 17, color: "#166534" }}>
                              {val ? `₹ ${Number(val).toLocaleString("en-IN")}` : "—"}
                            </Text>
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: 12,
                              color: hasContent ? "#0f172a" : "#94a3b8",
                              whiteSpace: "pre-line",
                              lineHeight: 1.5,
                              background: hasContent ? "#f8fafc" : "transparent",
                              padding: hasContent ? "8px 10px" : "0",
                              borderRadius: 6,
                              border: hasContent ? "1px solid #f1f5f9" : "none",
                              maxHeight: 120,
                              overflowY: "auto"
                            }}
                          >
                            {hasContent ? val : <span style={{ fontStyle: "italic" }}>No details</span>}
                          </div>
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

              <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                {[
                  { key: "proposal_pdf",        label: "Proposal PDF",          icon: "📄" },
                  { key: "budget_excel",        label: "Budget Excel",          icon: "📊" },
                  { key: "team_cvs",            label: "Team Member CVs",       icon: "👥" },
                  { key: "previous_experience", label: "Experience Proof",     icon: "📜" },
                  { key: "case_studies",        label: "Case Studies",          icon: "🏆" },
                ].map((doc) => {
                  const docData = detailsDrawer.submission[doc.key];
                  const hasDoc = Boolean(docData && String(docData).trim() !== "" && docData !== "null" && docData !== "[]");

                  return (
                    <Col xs={24} sm={12} md={6} lg={6} xl={6} key={doc.key}>
                      <div
                        style={{
                          background: hasDoc ? "#f0f9ff" : "#f8fafc",
                          border: hasDoc ? "1.5px solid #7dd3fc" : "1px dashed #cbd5e1",
                          borderRadius: 10,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          height: "100%",
                          boxShadow: hasDoc ? "0 2px 6px rgba(14, 165, 233, 0.08)" : "none",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div
                            style={{
                              fontSize: 18,
                              background: hasDoc ? "#e0f2fe" : "#f1f5f9",
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {doc.icon}
                          </div>
                          <div>
                            <Text strong style={{ fontSize: 12, color: hasDoc ? "#0369a1" : "#475569", display: "block" }} ellipsis={{ tooltip: doc.label }}>
                              {doc.label}
                            </Text>
                            {hasDoc ? (
                              <Tag color="processing" style={{ fontSize: 10, borderRadius: 10, fontWeight: 600, paddingInline: 4, margin: 0 }}>
                                ✅ Ready
                              </Tag>
                            ) : (
                              <Tag color="default" style={{ fontSize: 10, borderRadius: 10, paddingInline: 4, margin: 0 }}>
                                Empty
                              </Tag>
                            )}
                          </div>
                        </div>

                        {hasDoc ? (
                          <div style={{ display: "flex", gap: 6, width: "100%" }}>
                            <Button
                              type="primary"
                              size="small"
                              icon={<EyeOutlined />}
                              style={{
                                flex: 1,
                                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                                border: "none",
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: 11,
                                height: 28
                              }}
                              onClick={() => handleViewDocument(docData, doc.label)}
                            >
                              View
                            </Button>
                            <Button
                              type="default"
                              size="small"
                              icon={<ExportOutlined />}
                              style={{
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 11,
                                height: 28,
                                borderColor: "#0284c7",
                                color: "#0284c7",
                                paddingInline: 6
                              }}
                              onClick={() => handleViewDocument(docData, doc.label)}
                            />
                          </div>
                        ) : (
                          <Tag color="default" style={{ fontSize: 10, textAlign: "center", width: "100%", margin: 0 }}>No File Attached</Tag>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>

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

      {/* ── Send for Approval Modal (Role & User Selection) ── */}
      <Modal
        title={
          <Space align="center">
            <SendOutlined style={{ color: "#dc2626", fontSize: 20 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
              Send RFP Assessment Matrix for Approval
            </span>
          </Space>
        }
        open={approvalModalOpen}
        onCancel={() => setApprovalModalOpen(false)}
        footer={null}
        width={580}
        centered
        destroyOnHidden
      >
        <div style={{ padding: "10px 0" }}>
          <Text style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 18 }}>
            Before submitting for final approval, select the target Role and specific User to send the approval notification.
          </Text>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, color: "#0f172a", display: "block", marginBottom: 6 }}>
              1. Select Approval Role:
            </Text>
            <Select
              placeholder="Choose role (e.g. CSR Head, Admin, Manager)"
              value={selectedRoleId}
              onChange={(val) => {
                setSelectedRoleId(val);
                setSelectedUserId(null);
              }}
              style={{ width: "100%", borderRadius: 8 }}
              size="large"
            >
              {rolesList.map((r) => (
                <Select.Option key={r.id || r.role_id || r.name} value={r.id || r.role_id || r.name}>
                  👤 {r.name || r.role_name || r.role}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, color: "#0f172a", display: "block", marginBottom: 6 }}>
              2. Select Approver User:
            </Text>
            <Select
              placeholder="Choose user to notify for approval"
              value={selectedUserId}
              onChange={(val) => setSelectedUserId(val)}
              style={{ width: "100%", borderRadius: 8 }}
              size="large"
            >
              {usersList
                .filter((u) => !selectedRoleId || String(u.role_id || u.usr_role_id) === String(selectedRoleId) || u.role === selectedRoleId)
                .map((u) => (
                  <Select.Option key={u.id || u.usr_id || u.email} value={u.id || u.usr_id || u.email}>
                    📧 {u.name || u.usr_name || u.email} ({u.role_name || u.role || "User"})
                  </Select.Option>
                ))}
            </Select>
          </div>

          <div style={{ marginBottom: 22 }}>
            <Text strong style={{ fontSize: 13, color: "#0f172a", display: "block", marginBottom: 6 }}>
              3. Approval Remarks & Instructions (Optional):
            </Text>
            <Input.TextArea
              rows={3}
              placeholder="Enter remarks or instructions for the approver..."
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button onClick={() => setApprovalModalOpen(false)} style={{ borderRadius: 8, fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sendingApproval}
              onClick={handleConfirmSendForApproval}
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                border: "none",
                borderRadius: 8,
                fontWeight: 800,
                paddingInline: 24
              }}
            >
              Send Notification & Submit for Approval
            </Button>
          </div>
        </div>
      </Modal>
      {/* ── Approval Process Track Audit Modal ── */}
      <Modal
        title={
          <Space align="center">
            <HistoryOutlined style={{ color: "#2563eb", fontSize: 20 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
              RFP Approval Process Track Audit Trail (RFP #{rfpId})
            </span>
          </Space>
        }
        open={trackModalOpen}
        onCancel={() => setTrackModalOpen(false)}
        footer={null}
        width={720}
        centered
        destroyOnHidden
      >
        <div style={{ padding: "12px 0", maxHeight: "70vh", overflowY: "auto" }}>
          {approvalTrackData.length === 0 ? (
            <Empty description="No approval process track history found for this RFP yet." />
          ) : (
            <Timeline
              mode="alternate"
              items={approvalTrackData.map((item, idx) => {
                const isApproved = item.apt_accept_status === "Approved";
                const isPending = item.apt_accept_status === "Pending Approval";

                return {
                  key: item.apt_id || idx,
                  color: isApproved ? "green" : isPending ? "orange" : "blue",
                  dot: isApproved ? <CheckCircleOutlined style={{ fontSize: 16 }} /> : <ClockCircleOutlined style={{ fontSize: 16 }} />,
                  children: (
                    <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: 12, border: "1px solid #cbd5e1", textAlign: "left" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Tag color={isApproved ? "success" : "processing"} style={{ fontWeight: 800, borderRadius: 10, paddingInline: 10 }}>
                          {item.apt_accept_step || item.apt_accept_status}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          📅 {item.apt_created_at ? dayjs(item.apt_created_at).format("DD MMM YYYY, HH:mm A") : "—"}
                        </Text>
                      </div>

                      <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginBottom: 4 }}>
                        👤 By: {item.user_name || item.user_email || `User #${item.apt_user_id}`} ({item.apt_user_role || "User"})
                      </div>

                      {item.recipient_name || item.apt_recipient_role ? (
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                          📧 Assigned To: {item.recipient_name || item.recipient_email || `Role: ${item.apt_recipient_role}`}
                        </div>
                      ) : null}

                      {item.apt_remarks ? (
                        <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic", marginTop: 6, background: "#ffffff", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                          💬 Remarks: "{item.apt_remarks}"
                        </div>
                      ) : null}

                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, borderTop: "1px dashed #e2e8f0", paddingTop: 4 }}>
                        ID: <code style={{ color: "#2563eb", fontWeight: 700 }}>{item.apt_id}</code> | Created By (User ID): <strong>{item.apt_created_by}</strong> | Updated By (User ID): <strong>{item.apt_updated_by}</strong>
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
