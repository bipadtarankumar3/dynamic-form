'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Tag,
  Spin,
  Alert,
  Progress,
  Avatar,
  Modal,
  Input,
  Tooltip,
  message,
} from "antd";
import {
  EditOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  ExclamationCircleFilled,
  HistoryOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  LockOutlined,
  UserOutlined,
  SafetyOutlined,
  ArrowRightOutlined,
  AuditOutlined,
  SendOutlined,
  CloseCircleFilled,
  ApartmentOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { privateHttpClient } from "@/services/api/httpClient";
import { dynamicSchemaDetailsAPI } from "@/services/dynamicForm-service";
import NgoDetailsView from "@/app/(ngo)/_components/NgoDetailsView";
import NgoVersionHistoryModal from "@/app/(ngo)/_components/NgoVersionHistoryModal";
import NgoApprovalTrackModal from "@/app/(ngo)/_components/NgoApprovalTrackModal";
import DdFormModal from "./DdFormModal";
import FormApprovalPanel from "@/modules/form-approval/FormApprovalPanel";
import ParentFieldsPanel from "@/modules/dynamic-form-v2/view/ParentFieldsPanel";
import "@/app/(ngo)/_components/NgoFormRecordView.css";

const DD_FORM_SLUG    = "due_diligence";
const DD_API_ENDPOINT = "ngo/due-diligence";
const DD_DESCRIPTION  =
  "Upload and track statutory compliance records, 12A/80G registrations, CSR-1 certificates, FCRA, and banking details. Every update maintains complete version history.";

function calculateSectionCompleteness(schema, record) {
  if (!schema?.sections || !record) return 0;
  let totalRequired = 0;
  let filledRequired = 0;
  let totalAll = 0;
  let filledAll = 0;

  schema.sections.forEach((sec) => {
    const fields = sec.fields || [];
    if (!Array.isArray(fields) || fields.length === 0) return;

    if (sec.type === "add_more") {
      const rows =
        record[sec.slug] ??
        record[sec.section_id] ??
        record[sec.table] ??
        [];
      const hasRows = Array.isArray(rows) && rows.length > 0;

      fields.forEach((f) => {
        const isReq = f.required === true || f.required === "true";
        totalAll++;
        if (isReq) totalRequired++;

        if (hasRows) {
          const k = f.db_field || f.slug || f.field_id || f.name;
          const isFilled = rows.some((r) => {
            const val = r?.[k] !== undefined ? r[k] : r?.[f.name];
            return val !== undefined && val !== null && val !== "";
          });
          if (isFilled) {
            filledAll++;
            if (isReq) filledRequired++;
          }
        }
      });
    } else {
      fields.forEach((f) => {
        const isReq = f.required === true || f.required === "true";
        totalAll++;
        if (isReq) totalRequired++;

        const k = f.db_field || f.slug || f.field_id || f.name;
        const val = record?.[k] !== undefined ? record[k] : record?.[f.name];
        if (val !== undefined && val !== null && val !== "") {
          filledAll++;
          if (isReq) filledRequired++;
        }
      });
    }
  });

  if (totalRequired > 0) {
    return Math.round((filledRequired / totalRequired) * 100);
  }
  return totalAll > 0 ? Math.round((filledAll / totalAll) * 100) : 100;
}

export default function DdRecordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user: authUser } = useAuth();

  // ── Query Parameters for Custom Page routing ─────────────────────────
  const queryUserId = searchParams.get("user_id");
  const queryPartnerId = searchParams.get("partner_id");
  const queryParentSlug = searchParams.get("parent_slug") || searchParams.get("parent") || "";
  const queryFormSlug = searchParams.get("form_slug") || DD_FORM_SLUG;
  const isApprovalExplicitlyDisabled = searchParams.get("enable_approval") === "0" || searchParams.get("enable_approval") === "false";
  const isApprovalExplicitlyEnabled = searchParams.get("enable_approval") === "1" || searchParams.get("enable_approval") === "true";
  const isAlwaysLastRow = searchParams.get("always_last_row") !== "0";

  const userRole = String(authUser?.role_slug || authUser?.role || "").toLowerCase();
  const isReviewingOtherUser = Boolean(
    (queryUserId && String(queryUserId) !== String(authUser?.id)) || queryPartnerId
  );
  const isNgoPortalRoute = Boolean(pathname?.includes("/ngo/dd"));

  const isReviewerOrAdmin = Boolean(
    authUser?.isConfigurator ||
    authUser?.role_id === 1 ||
    authUser?.role_id === 2 ||
    ["admin", "configurator", "super_admin", "superadmin", "manager", "employee", "approver", "system admin"].some((r) => userRole.includes(r)) ||
    (!userRole.includes("ngo") && authUser?.role_id !== 6)
  );

  // Approval bar and approval engine panel ONLY show if approval is enabled (via query param or schema), NEVER if explicitly disabled, and NEVER on NGO's own /ngo/dd page
  const showApprovalBar =
    !isNgoPortalRoute &&
    !isApprovalExplicitlyDisabled &&
    (isApprovalExplicitlyEnabled || (Boolean(schemaData?.enable_approval) && (isReviewerOrAdmin || isReviewingOtherUser)));

  // ── DD record state ─────────────────────────────────────────────────
  const [loading, setLoading]             = useState(true);
  const [partnerRecord, setPartnerRecord] = useState(null);
  const [schemaData, setSchemaData]       = useState(null);
  const [status, setStatus]               = useState("DRAFT");
  const [currentVersion, setCurrentVersion] = useState(1);
  const [approvalTrack, setApprovalTrack]   = useState([]);
  const [targetUserId, setTargetUserId]     = useState(null);
  const [resolvedRecordId, setResolvedRecordId] = useState(null);

  // ── Profile guard (must be 100% completed) ──────────────────────────
  const [profileReady, setProfileReady]                 = useState(false);
  const [profileLoading, setProfileLoading]             = useState(true);
  const [profileRecord, setProfileRecord]               = useState(null);
  const [profileCompletionPct, setProfileCompletionPct] = useState(0);

  // ── Modal state ─────────────────────────────────────────────────────
  const [isFormModalOpen, setIsFormModalOpen]                   = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen]             = useState(false);
  const [isApprovalTrackModalOpen, setIsApprovalTrackModalOpen] = useState(false);

  // 1. Fetch DD record (always last row details if specified or default)
  const fetchDdRecord = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${DD_API_ENDPOINT}?form_slug=${queryFormSlug}`;
      if (queryUserId) url += `&user_id=${encodeURIComponent(queryUserId)}`;
      if (queryPartnerId) url += `&partner_id=${encodeURIComponent(queryPartnerId)}`;
      if (queryParentSlug) url += `&parent_slug=${encodeURIComponent(queryParentSlug)}`;
      if (isAlwaysLastRow) url += `&always_last_row=1`;

      const res = await privateHttpClient.get(url);
      if (res?.data?.success && res?.data?.data) {
        const payload = res.data.data;
        let rec = payload.record || (payload.id ? payload : null);
        if (rec && typeof rec === "object") {
          rec = { ...rec };
          Object.keys(rec).forEach((k) => {
            if (typeof rec[k] === "string") {
              const t = rec[k].trim();
              if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
                try { rec[k] = JSON.parse(t); } catch (_) {}
              }
            }
          });
        }
        setPartnerRecord(rec && Object.keys(rec).length > 0 ? rec : null);
        setStatus(payload.status || rec?.status || "DRAFT");
        if (payload.version) setCurrentVersion(payload.version);
        if (payload.approval_track && Array.isArray(payload.approval_track)) {
          setApprovalTrack(payload.approval_track);
        } else {
          setApprovalTrack([]);
        }
        if (payload.user_id) setTargetUserId(payload.user_id);
        setResolvedRecordId(payload.id || payload.frm_id || payload.version_id || null);
      } else {
        setPartnerRecord(null);
        setStatus("DRAFT");
        setApprovalTrack([]);
        setResolvedRecordId(null);
      }
    } catch {
      setPartnerRecord(null);
      setStatus("DRAFT");
      setApprovalTrack([]);
      setResolvedRecordId(null);
    } finally {
      setLoading(false);
    }
  }, [queryFormSlug, queryUserId, queryPartnerId, isAlwaysLastRow]);

  // 2. Fetch DD form schema
  const fetchSchema = useCallback(async () => {
    try {
      const res = await dynamicSchemaDetailsAPI({ form_slug: queryFormSlug });
      if (res?.data?.success && res?.data?.data) setSchemaData(res.data.data);
    } catch {}
  }, [queryFormSlug]);

  // 3. Profile completeness guard — bypassed if viewing as Reviewer/Admin
  const checkProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      let profileUrl = "ngo/profile?form_slug=implementation_partner";
      if (queryUserId) profileUrl += `&user_id=${encodeURIComponent(queryUserId)}`;
      if (queryPartnerId) profileUrl += `&partner_id=${encodeURIComponent(queryPartnerId)}`;

      const [profRes, schemaRes] = await Promise.all([
        privateHttpClient.get(profileUrl),
        dynamicSchemaDetailsAPI({ form_slug: "implementation_partner" }).catch(() => null),
      ]);

      const payload = profRes?.data?.data;
      const rec = payload?.record || (payload?.id ? payload : null);
      const hasRealRecord = Boolean(payload?.has_record || (rec && rec.id));
      const profileStatus = String(payload?.status || rec?.status || "DRAFT").toUpperCase();

      setProfileRecord(rec && Object.keys(rec).length > 0 ? rec : null);

      const pSchema = schemaRes?.data?.data;
      const pct = calculateSectionCompleteness(pSchema, rec);
      setProfileCompletionPct(pct);

      if (isReviewerOrAdmin) {
        setProfileReady(true);
      } else {
        const isComplete = hasRealRecord && pct >= 100;
        setProfileReady(Boolean(isComplete));
      }
    } catch {
      if (isReviewerOrAdmin) {
        setProfileReady(true);
      } else {
        setProfileReady(false);
        setProfileCompletionPct(0);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [queryUserId, queryPartnerId, isReviewerOrAdmin]);

  useEffect(() => {
    checkProfile();
    fetchDdRecord();
    fetchSchema();
  }, [checkProfile, fetchDdRecord, fetchSchema]);

  // ── 1. Loading state ────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div style={{ minHeight: "calc(100vh - 140px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <Card style={{ textAlign: "center", padding: "36px 50px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <Spin size="large" />
          <div style={{ marginTop: 14, color: "#64748b", fontWeight: 600, fontSize: 13.5 }}>
            Verifying profile completion and Due Diligence status...
          </div>
        </Card>
      </div>
    );
  }

  // ── 2. Profile NOT 100% Completed ── DO NOT SHOW ANY DD ACTIVITY (Only for regular NGO) ───
  if (!profileReady) {
    return (
      <div style={{ minHeight: "calc(100vh - 140px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px" }}>
        <Card
          style={{
            maxWidth: 520,
            width: "100%",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            border: "1px solid #fed7aa",
            background: "#ffffff",
            textAlign: "center",
          }}
          styles={{ body: { padding: "22px 26px" } }}
        >
          {/* Lock Icon */}
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              border: "1.5px solid #fbbf24",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px auto",
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
            }}
          >
            <LockOutlined style={{ fontSize: 24 }} />
          </div>

          <Tag
            color="warning"
            style={{
              padding: "2px 10px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 11,
              marginBottom: 8,
              letterSpacing: "0.5px",
            }}
          >
            ACTION REQUIRED
          </Tag>

          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 6px 0",
              letterSpacing: "-0.3px",
            }}
          >
            Organization Profile Incomplete ({profileCompletionPct}% Completed)
          </h2>

          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              lineHeight: 1.5,
              maxWidth: 440,
              margin: "0 auto 12px auto",
            }}
          >
            You must complete <strong>100% of your Organization Profile</strong> before you can view, upload, or perform any activity in Due Diligence.
          </p>

          <div
            style={{
              background: "#f8fafc",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              marginBottom: 12,
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 700,
                color: "#334155",
              }}
            >
              <span>Profile Completeness</span>
              <span style={{ color: profileCompletionPct === 100 ? "#16a34a" : "#d97706", fontSize: 12.5 }}>
                {profileCompletionPct}% / 100%
              </span>
            </div>
            <Progress
              percent={profileCompletionPct}
              size="small"
              strokeColor={profileCompletionPct === 100 ? "#16a34a" : "#f59e0b"}
              trailColor="#e2e8f0"
              showInfo={false}
            />
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#78350f",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 16,
              lineHeight: 1.45,
            }}
          >
            Statutory Due Diligence verification depends on complete organization details. Finish your profile to unlock this section.
          </div>

          <Button
            type="primary"
            icon={<UserOutlined />}
            onClick={() => router.push("/ngo/profile")}
            style={{
              background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
              borderColor: "#15803d",
              height: 40,
              paddingInline: 28,
              fontSize: 13.5,
              fontWeight: 700,
              borderRadius: 8,
              boxShadow: "0 4px 14px rgba(22, 163, 74, 0.25)",
            }}
          >
            Complete Profile ({100 - profileCompletionPct}% remaining) <ArrowRightOutlined style={{ fontSize: 12, marginLeft: 4 }} />
          </Button>
        </Card>
      </div>
    );
  }

  // ── 3. Profile IS Completed or Viewed as Admin ── SHOW FULL DD PAGE ─
  const hasRecord       = Boolean(partnerRecord && Object.keys(partnerRecord).length > 0);
  const statusUpper     = String(status || "").toUpperCase();
  const isApproved      = statusUpper === "APPROVED";
  const isUnderReview   = statusUpper === "UNDER_REVIEW";
  const isNeedsRevision = statusUpper === "NEEDS_REVISION" || statusUpper === "REJECTED";
  const isSentApproval  = statusUpper === "SENT_FOR_APPROVAL" || statusUpper.startsWith("PENDING");

  // Lock editing for NGO when in approval mode (UNDER_REVIEW, SENT_FOR_APPROVAL, PENDING_...).
  // Once approved or revision requested (rejected), editing unlocks.
  const isLockedForNgo  = !showApprovalBar && hasRecord && (isUnderReview || isSentApproval);

  // Only the NGO partner can edit/update Due Diligence. Admin is an auditor/reviewer and cannot edit the NGO's statutory documents.
  const isNgoOwner = !showApprovalBar && (!queryUserId || String(queryUserId) === String(authUser?.id));

  const allFields = (schemaData?.sections || []).flatMap((s) => s.fields || []);
  const completionPct = calculateSectionCompleteness(schemaData, partnerRecord) || (hasRecord ? 100 : 0);

  const orgDisplayName =
    profileRecord?.name_of_the_organization ||
    profileRecord?.organization_name ||
    profileRecord?.name ||
    partnerRecord?.name_of_the_organization ||
    authUser?.name ||
    "Organization Due Diligence";

  const orgInitials =
    orgDisplayName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "DD";

  return (
    <div className="ngo-profile-container">

      {/* ── Admin / Reviewer Approval Action Bar ─────────────────────── */}
      {showApprovalBar && (
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            borderRadius: 14,
            padding: "14px 20px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.15)",
            border: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 18,
              }}
            >
              <AuditOutlined />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 14 }}>
                  Due Diligence Review &amp; Approval
                </span>
                <Tag color="blue" style={{ fontWeight: 700, borderRadius: 10 }}>
                  Version {currentVersion}
                </Tag>
                {isApproved ? (
                  <Tag color="success" style={{ fontWeight: 700 }}>VERIFIED &amp; APPROVED</Tag>
                ) : isNeedsRevision ? (
                  <Tag color="error" style={{ fontWeight: 700 }}>REVISION REQUESTED</Tag>
                ) : isSentApproval ? (
                  <Tag color="processing" style={{ fontWeight: 700 }}>PENDING APPROVAL</Tag>
                ) : (
                  <Tag color="warning" style={{ fontWeight: 700 }}>UNDER REVIEW</Tag>
                )}
              </div>
              <p style={{ color: "#94a3b8", fontSize: 12, margin: "2px 0 0 0" }}>
                {isAlwaysLastRow
                  ? "Displaying latest submitted version data. Review compliance documents and take approval decision."
                  : "Review compliance documents and take approval decision."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Button
              icon={<ApartmentOutlined />}
              onClick={() => {
                const el = document.getElementById("approval-path-engine-card");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12.5,
                background: "#4f46e5",
                color: "#ffffff",
                borderColor: "#4338ca",
              }}
            >
              Approval Path Engine
            </Button>

            <Button
              icon={<AuditOutlined />}
              onClick={() => setIsApprovalTrackModalOpen(true)}
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                borderColor: "rgba(255, 255, 255, 0.25)",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              Approval Track {approvalTrack.length > 0 && `(${approvalTrack.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Hero Header Card ──────────────────────────────────────────── */}
      <Card className="ngo-profile-card" styles={{ body: { padding: 0 } }}>
        <div className="ngo-profile-card-content">
          <div className="ngo-profile-header">

            {/* Left */}
            <div className="ngo-profile-left">
              <div className="ngo-avatar-wrapper">
                <Avatar size={74} className="ngo-avatar">{orgInitials}</Avatar>
              </div>
              <div>
                <div className="ngo-profile-info">
                  <h1 className="ngo-profile-name">{orgDisplayName}</h1>
                  {hasRecord ? (
                    isApproved ? (
                      <Tag color="success" className="ngo-tag-approved">
                        <CheckCircleFilled /> Verified &amp; Approved
                      </Tag>
                    ) : isUnderReview ? (
                      <Tag color="processing" className="ngo-tag-under-review">
                        <ClockCircleFilled /> Under Review
                      </Tag>
                    ) : isNeedsRevision ? (
                      <Tag color="error" className="ngo-tag-needs-revision">
                        <ExclamationCircleFilled /> Revision Required
                      </Tag>
                    ) : isSentApproval ? (
                      <Tag color="processing" className="ngo-tag-under-review">
                        <SendOutlined /> Sent for Approval
                      </Tag>
                    ) : (
                      <Tag className="ngo-tag-draft">
                        <div className="ngo-draft-dot" /> Draft
                      </Tag>
                    )
                  ) : (
                    <Tag className="ngo-tag-pending">Pending Initial Submission</Tag>
                  )}
                </div>
                <p className="ngo-profile-description">{DD_DESCRIPTION}</p>
                <div className="ngo-meta-chips">
                  {(profileRecord?.primary_email || partnerRecord?.primary_email || authUser?.email) && (
                    <Tag icon={<MailOutlined />} className="ngo-meta-email">
                      {profileRecord?.primary_email || partnerRecord?.primary_email || authUser?.email}
                    </Tag>
                  )}
                  {(profileRecord?.phone_no || partnerRecord?.phone_no) && (
                    <Tag icon={<PhoneOutlined />} className="ngo-meta-phone">
                      {profileRecord?.phone_no || partnerRecord?.phone_no}
                    </Tag>
                  )}
                  {(profileRecord?.csr_registration_number || partnerRecord?.csr_registration_number || partnerRecord?.darpan_no) && (
                    <Tag icon={<IdcardOutlined />} className="ngo-meta-darpan">
                      Reg No: {profileRecord?.csr_registration_number || partnerRecord?.csr_registration_number || partnerRecord?.darpan_no}
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Compliance Status & Action Panel */}
            <div className="ngo-profile-right">
              {allFields.length > 0 && (
                <div className="ngo-completeness-card">
                  <div className="ngo-completeness-header">
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>Due Diligence Completeness</span>
                    <span className="ngo-completeness-percent">{completionPct}%</span>
                  </div>
                  <Progress
                    percent={completionPct}
                    showInfo={false}
                    strokeColor={{ '0%': '#10b981', '100%': '#059669' }}
                    trailColor="#e2e8f0"
                    size="small"
                  />
                </div>
              )}

              <div className="ngo-action-buttons-group">
                {/* Primary Action Button (Edit / Locked) */}
                {isNgoOwner && (
                  isLockedForNgo ? (
                    <Tooltip title="Your Due Diligence submission is currently under administrative review in approval mode. Editing is disabled until an approval decision or revision request is made.">
                      <div style={{ width: "100%" }}>
                        <Button
                          disabled
                          icon={<LockOutlined />}
                          className="ngo-action-primary-btn"
                          style={{
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            background: "#f1f5f9",
                            color: "#94a3b8",
                            borderColor: "#cbd5e1",
                            cursor: "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          Locked — Under Review
                        </Button>
                      </div>
                    </Tooltip>
                  ) : (
                    <Button
                      type="primary"
                      icon={hasRecord ? <EditOutlined /> : <SafetyOutlined />}
                      onClick={() => setIsFormModalOpen(true)}
                      className="ngo-action-primary-btn"
                      style={{
                        background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
                        borderColor: "#15803d",
                        boxShadow: "0 2px 10px rgba(22, 163, 74, 0.25)",
                      }}
                    >
                      {hasRecord ? "Edit Due Diligence" : "Update Due Diligence"}
                    </Button>
                  )
                )}

                {/* Secondary Action Row (Approval Track & History) */}
                {(approvalTrack.length > 0 || hasRecord) && (
                  <div className="ngo-action-secondary-row">
                    {hasRecord && (
                      <Button
                        icon={<HistoryOutlined />}
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="ngo-action-secondary-btn"
                      >
                        History {currentVersion ? `(v${currentVersion})` : ""}
                      </Button>
                    )}
                    {approvalTrack.length > 0 && (
                      <Button
                        icon={<AuditOutlined />}
                        onClick={() => setIsApprovalTrackModalOpen(true)}
                        className="ngo-action-secondary-btn"
                      >
                        Approval Track ({approvalTrack.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: "80px 0", borderRadius: 16, border: "1px solid #e2e8f0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: "#64748b", fontWeight: 500 }}>Loading Due Diligence records...</div>
        </Card>
      ) : (
        <div>
          {/* DD status alerts */}
          {!hasRecord && (
            <Alert type="info" showIcon
              message={<span style={{ fontWeight: 700, fontSize: 14 }}>Due Diligence Submission Required</span>}
              description={<span style={{ fontSize: 13.5 }}>No DD record submitted yet. Click <strong>&quot;Update Due Diligence&quot;</strong> above to begin uploading your statutory compliance documents.</span>}
              style={{ marginBottom: 20, borderRadius: 12, border: "1px solid #bfdbfe", background: "#eff6ff" }}
            />
          )}
          {hasRecord && isUnderReview && (
            <Alert type="info" showIcon
              message={<span style={{ fontWeight: 700, fontSize: 14 }}>Due Diligence Submitted &amp; Under Administrative Review</span>}
              description={<span style={{ fontSize: 13.5 }}>Your Due Diligence records have been submitted and sent to the Admin team for review and approval. Form editing is currently locked while in approval mode. Once reviewed or approved, you can view or update compliance details.</span>}
              style={{ marginBottom: 20, borderRadius: 12, border: "1px solid #bfdbfe", background: "#eff6ff" }}
            />
          )}
          {hasRecord && isSentApproval && (
            <Alert type="info" showIcon
              message={<span style={{ fontWeight: 700, fontSize: 14 }}>Due Diligence in Approval Workflow</span>}
              description={<span style={{ fontSize: 13.5 }}>This Due Diligence package is awaiting final administrative approval sign-off. Form editing is locked until the workflow completes.</span>}
              style={{ marginBottom: 20, borderRadius: 12, border: "1px solid #bfdbfe", background: "#eff6ff" }}
            />
          )}
          {hasRecord && isApproved && (
            <Alert type="success" showIcon
              message={<span style={{ fontWeight: 700, fontSize: 14 }}>Due Diligence Verified &amp; Approved</span>}
              description={<span style={{ fontSize: 13.5 }}>Your statutory compliance records are verified. If any information changes in the future, you can click <strong>&quot;Edit Due Diligence&quot;</strong> to submit an updated version.</span>}
              style={{ marginBottom: 20, borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4" }}
            />
          )}
          {hasRecord && isNeedsRevision && (
            <Alert type="error" showIcon
              message={<span style={{ fontWeight: 700, fontSize: 14 }}>Revision Required — Editing Unlocked</span>}
              description={<span style={{ fontSize: 13.5 }}>The review team has requested changes or corrections. Click <strong>&quot;Edit Due Diligence&quot;</strong> to address the remarks and submit a revised version.</span>}
              style={{ marginBottom: 20, borderRadius: 12, border: "1px solid #fecaca", background: "#fff1f2" }}
            />
          )}

          {/* Parent Form Reference Details Panel */}
          {(schemaData?.parent_form_id || queryPartnerId || partnerRecord?.parent_id || profileRecord?.id || queryUserId) && (
            <div style={{ marginBottom: 20 }}>
              <ParentFieldsPanel
                form_slug={queryFormSlug || DD_FORM_SLUG}
                parent_id={partnerRecord?.parent_id || queryPartnerId || profileRecord?.id}
                user_id={targetUserId || queryUserId || partnerRecord?.user_id || partnerRecord?.created_by || profileRecord?.user_id}
                record_id={resolvedRecordId || partnerRecord?.id}
                display_fields={schemaData?.relation_with_parent?.display_fields || []}
                parent_form_title={schemaData?.parent_form_title || schemaData?.parent_form_name || "Implementation Partner Details"}
              />
            </div>
          )}

          <NgoDetailsView schema={schemaData} data={partnerRecord || {}} hasRecord={hasRecord} emptyPlaceholder="Not provided" />

          {/* Form Approval Panel: ONLY rendered for Admin / Reviewer on Admin review pages, NEVER on NGO's /ngo/dd page */}
          {showApprovalBar && hasRecord && (
            <div id="approval-path-engine-card" style={{ marginTop: 24 }}>
              <FormApprovalPanel
                form_slug={queryFormSlug || DD_FORM_SLUG}
                record_id={resolvedRecordId || partnerRecord?.id || targetUserId || authUser?.id}
                onStatusChange={(newStatus) => {
                  setStatus(newStatus);
                  fetchDdRecord();
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* DD Form Modal */}
      {isFormModalOpen && (
        <DdFormModal
          open={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          schema={schemaData}
          initialValues={partnerRecord || {}}
          mode={hasRecord ? "edit" : "add"}
          onSuccess={fetchDdRecord}
        />
      )}

      {/* Version History Modal */}
      <NgoVersionHistoryModal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        formSlug={queryFormSlug}
        schema={schemaData}
        currentVersion={currentVersion}
        userId={targetUserId || queryUserId}
      />

      {/* Approval Track Modal */}
      <NgoApprovalTrackModal
        open={isApprovalTrackModalOpen}
        onClose={() => setIsApprovalTrackModalOpen(false)}
        approvalTrack={approvalTrack}
        versionNumber={currentVersion}
      />
    </div>
  );
}
