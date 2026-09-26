"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Breadcrumb,
  Button,
  App,
  Spin,
  Space,
  Tag,
  Alert,
  Row,
  Col,
  Card,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  ReloadOutlined,
  FileProtectOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  RollbackOutlined,
  FileTextOutlined,
  TrophyOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  CopyOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  dynamicFormViewAPI,
  dynamicSchemaDetailsAPI,
} from "@/services/dynamicForm-service";
import GeneralSectionViewV2 from "@/modules/dynamic-form-v2/view/general-section/GeneralSectionViewV2";
import AddMoreSectionViewV2 from "@/modules/dynamic-form-v2/view/add-more-section/AddMoreSectionViewV2";
import ParentFieldsPanel from "@/modules/dynamic-form-v2/view/ParentFieldsPanel";
import { getUser } from "@/context/AuthContext";
import { getDynamicFormHooks } from "@/modules/dynamic-form-v2/hooks/dynamicFormHookRegistryV2";
import {
  evaluateConditions,
  evaluateActionConditions,
} from "@/modules/dynamic-form-v2/helper/runTimeCondition.helper";

// ── Status Alert Banner ──
function RecordStatusAlert({ status, onEdit }) {
  const s = String(status || "").trim().toUpperCase();
  if (!s) return null;

  if (s === "APPROVED") {
    return (
      <Alert
        type="success"
        showIcon
        icon={<CheckCircleFilled style={{ fontSize: 20, color: "#16a34a" }} />}
        className="mb-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-xs"
        message={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-green-800">
              This RFP is Approved and Active ✓
            </span>
            <Tag color="success" className="font-bold rounded-full px-3 py-0.5 text-xs">
              STATUS: APPROVED
            </Tag>
          </div>
        }
        description={
          <span className="text-xs text-green-700">
            All approvals have been completed. This RFP is eligible to accept applications from NGOs.
          </span>
        }
      />
    );
  }

  if (s === "RESEND" || s === "CHANGES_REQUESTED") {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<RollbackOutlined style={{ fontSize: 20, color: "#ea580c" }} />}
        className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-xs"
        message={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-amber-900">
              Changes Requested for this RFP
            </span>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={onEdit}
                  className="font-semibold text-amber-800 border-amber-400 hover:bg-amber-100"
                >
                  Edit RFP
                </Button>
              )}
              <Tag color="orange" className="font-bold rounded-full px-3 py-0.5 text-xs">
                STATUS: CHANGES REQUESTED
              </Tag>
            </div>
          </div>
        }
        description={
          <span className="text-xs text-amber-800">
            An approver sent back this RFP for revisions. Please update the details and resend for approval.
          </span>
        }
      />
    );
  }

  if (s === "REJECTED") {
    return (
      <Alert
        type="error"
        showIcon
        icon={<CloseCircleFilled style={{ fontSize: 20, color: "#dc2626" }} />}
        className="mb-4 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 p-4 shadow-xs"
        message={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-rose-900">
              This RFP has been Rejected
            </span>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={onEdit}
                  className="font-semibold text-rose-800 border-rose-400 hover:bg-rose-100"
                >
                  Edit RFP
                </Button>
              )}
              <Tag color="error" className="font-bold rounded-full px-3 py-0.5 text-xs">
                STATUS: REJECTED
              </Tag>
            </div>
          </div>
        }
        description={
          <span className="text-xs text-rose-800">
            This RFP proposal was rejected during the approval workflow.
          </span>
        }
      />
    );
  }

  if (s.startsWith("PENDING") || s === "SEND_FOR_APPROVAL" || s === "IN_REVIEW") {
    const rolePart = s.replace(/^PENDING_?/, "").replace(/_/g, " ");
    return (
      <Alert
        type="info"
        showIcon
        icon={<ClockCircleFilled style={{ fontSize: 20, color: "#0284c7" }} />}
        className="mb-4 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4 shadow-xs"
        message={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-sky-900">
              This RFP is Under Review ⏳
            </span>
            <Tag color="processing" className="font-bold rounded-full px-3 py-0.5 text-xs">
              STATUS: {s}
            </Tag>
          </div>
        }
        description={
          <span className="text-xs text-sky-800">
            Currently in approval workflow{rolePart ? ` — Pending with: ${rolePart}` : ""}.
          </span>
        }
      />
    );
  }

  if (s === "DRAFT" || s === "NOT_SUBMITTED") {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<FileTextOutlined style={{ fontSize: 20, color: "#d97706" }} />}
        className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-xs"
        message={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-amber-900">
              This RFP is in Draft
            </span>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={onEdit}
                  className="font-semibold text-amber-800 border-amber-400 hover:bg-amber-100"
                >
                  Edit RFP
                </Button>
              )}
              <Tag color="warning" className="font-bold rounded-full px-3 py-0.5 text-xs">
                STATUS: DRAFT
              </Tag>
            </div>
          </div>
        }
        description={
          <span className="text-xs text-amber-800">
            This RFP is not yet published. You can edit the parameters before floating to NGOs.
          </span>
        }
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      className="mb-4 rounded-xl border border-slate-200 p-3 shadow-xs"
      message={
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold">Status: {s}</span>
          <Tag color="default">{s}</Tag>
        </div>
      }
    />
  );
}

export default function RfpDetailsPage() {
  const formSlug = "request_for_proposal";
  const router = useRouter();
  const params = useParams();
  const rfpId = params?.id;
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState(null);
  const [data, setData] = useState({});

  const formatBudget = (val) => {
    if (!val) return "As per Proposal";
    const strVal = String(val).trim();
    if (strVal.includes("-") || strVal.toLowerCase().includes("to")) {
      const parts = strVal.split(/[-–—]|(?:\bto\b)/i).map((p) => p.trim());
      if (parts.length === 2) {
        const num1 = Number(parts[0].replace(/[^0-9.]/g, ""));
        const num2 = Number(parts[1].replace(/[^0-9.]/g, ""));
        if (!isNaN(num1) && !isNaN(num2) && (num1 > 0 || num2 > 0)) {
          const fmt1 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num1);
          const fmt2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num2);
          return `${fmt1} – ${fmt2}`;
        }
      }
    }
    const numOnly = Number(strVal.replace(/[^0-9.]/g, ""));
    if (!isNaN(numOnly) && numOnly > 0) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(numOnly);
    }
    return strVal;
  };

  const loadViewData = useCallback(async () => {
    if (!rfpId) return;
    try {
      setLoading(true);
      const [schemaRes, viewRes] = await Promise.all([
        dynamicSchemaDetailsAPI({ form_slug: formSlug }),
        dynamicFormViewAPI("dynamic-form/view", {
          selected_data: { id: rfpId },
          form_slug: formSlug,
        }),
      ]);

      const schemaData =
        schemaRes?.data?.data?.schema_details ||
        schemaRes?.data?.schema_details ||
        schemaRes?.data?.data ||
        schemaRes?.data ||
        {};

      const recordData =
        viewRes?.data?.data ||
        viewRes?.data ||
        {};

      setSchema(schemaData);
      setData(recordData);
    } catch (err) {
      console.error("Error fetching RFP view details:", err);
      message.error("Failed to load Request for Proposal details.");
      setData({});
    } finally {
      setLoading(false);
    }
  }, [formSlug, rfpId, message]);

  useEffect(() => {
    loadViewData();
  }, [loadViewData]);

  const loggedInUser = getUser();
  const currentUserId = loggedInUser?.user_id || loggedInUser?.id;
  const isAdmin =
    loggedInUser?.role_slug === "superadmin" ||
    loggedInUser?.role_slug === "admin" ||
    loggedInUser?.role_id === 1 ||
    loggedInUser?.role_id === 2;

  const recordCreatedBy = data?.created_by || data?.user_id;
  const isRecordCreator = Boolean(
    currentUserId && Number(currentUserId) === Number(recordCreatedBy)
  );

  const recordStatus = String(data?.status || data?.frm_status || "").trim().toUpperCase();
  const isApprovalLocked =
    recordStatus === "APPROVED" ||
    recordStatus.startsWith("PENDING_") ||
    recordStatus === "SEND_FOR_APPROVAL";

  const editAction = schema?.actions?.find((a) => a.slug === "edit");
  const hasConfiguredConditions = Boolean(
    editAction?.conditions &&
    (Array.isArray(editAction.conditions)
      ? editAction.conditions.length > 0
      : Array.isArray(editAction.conditions?.rules)
      ? editAction.conditions.rules.length > 0
      : Object.keys(editAction.conditions).length > 0)
  );

  const passesEditActionConditions = editAction ? evaluateActionConditions(editAction, data) : true;

  const canEdit = editAction
    ? (hasConfiguredConditions
        ? passesEditActionConditions
        : (!isApprovalLocked && (recordStatus === "DRAFT" || recordStatus === "" || isAdmin || isRecordCreator)))
    : (!isApprovalLocked && (recordStatus === "DRAFT" || recordStatus === ""));

  const activeInactiveAction = schema?.actions?.find(
    (a) => a.slug === "active_inactive"
  );
  const isActiveKey = activeInactiveAction?.form_details?.is_active_key;

  const memoizedSections = useMemo(() => schema?.sections || [], [schema?.sections]);
  const formHooks = useMemo(() => getDynamicFormHooks(formSlug), [formSlug]);

  const parentDisplayFields = Array.isArray(schema?.relation_with_parent?.display_fields)
    ? schema.relation_with_parent.display_fields
    : [];
  const showParentPanel =
    Boolean(schema?.parent_form_id) &&
    Boolean(data?.parent_id || data?.project_id) &&
    parentDisplayFields.length > 0;

  const rfpTitle = data?.project_details || schema?.title || `Request for Proposal #${rfpId}`;
  const budgetText = formatBudget(data?.budget_range || data?.budget || data?.total_budget);
  const deadlineText = data?.submission_deadline ? dayjs(data.submission_deadline).format("DD MMM YYYY") : "Open / Ongoing";
  const contactText = data?.contact_person || data?.coordinator || null;

  const copyRfpCode = () => {
    const code = `RFP-${String(rfpId).padStart(4, "0")}`;
    navigator.clipboard.writeText(code);
    message.success(`Copied RFP ID ${code} to clipboard`);
  };

  if (!rfpId) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 bg-slate-50 min-h-screen">
        <Spin size="large" />
        <span className="text-slate-500 font-medium">Loading RFP details...</span>
      </div>
    );
  }

  return (
    <div className="perm-page-container p-6 bg-slate-50 min-h-screen">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <Breadcrumb
          items={[
            {
              title: (
                <span
                  onClick={() => router.push("/admin/request-for-proposal")}
                  className="cursor-pointer text-slate-500 hover:text-blue-600 font-medium"
                >
                  RFP Management
                </span>
              ),
            },
            {
              title: (
                <span className="text-slate-800 font-semibold">
                  RFP #{rfpId} Scope &amp; Details
                </span>
              ),
            },
          ]}
          className="text-xs"
        />

        <Space wrap size={10}>
          {canEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => router.push(`/admin/request-for-proposal/edit/${rfpId}`)}
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                borderRadius: 8,
                fontWeight: 600,
                height: 36,
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              }}
            >
              Edit RFP
            </Button>
          )}

          <Button
            type="primary"
            icon={<TrophyOutlined />}
            onClick={() => router.push(`/admin/rfp-assessment?rfp_id=${rfpId}`)}
            style={{
              background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              height: 36,
              boxShadow: "0 2px 8px rgba(217, 119, 6, 0.25)",
            }}
          >
            Assessment &amp; NGO Submissions
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={loadViewData}
            loading={loading}
            style={{ borderRadius: 8, height: 36, fontWeight: 500 }}
          >
            Refresh
          </Button>

          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/admin/request-for-proposal")}
            style={{ borderRadius: 8, height: 36, fontWeight: 500 }}
          >
            Back to List
          </Button>
        </Space>
      </div>

      {/* ── Ultra Modern Hero Banner Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
          marginBottom: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Space size={8} wrap style={{ marginBottom: 10 }}>
              <Tag
                color="#475569"
                icon={<FileProtectOutlined />}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "6px",
                  border: "none",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                RFP Specification
              </Tag>

              <Tag
                color={
                  recordStatus === "APPROVED"
                    ? "success"
                    : recordStatus === "REJECTED"
                    ? "error"
                    : recordStatus === "DRAFT"
                    ? "warning"
                    : "processing"
                }
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "6px",
                }}
              >
                {recordStatus || "ACTIVE"}
              </Tag>

              <Tooltip title="Click to copy RFP ID">
                <Tag
                  onClick={copyRfpCode}
                  style={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.12)",
                    color: "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "6px",
                    fontSize: 11.5,
                    padding: "2px 8px",
                  }}
                >
                  <Space size={4}>
                    <span>RFP-{String(rfpId).padStart(4, "0")}</span>
                    <CopyOutlined style={{ fontSize: 11 }} />
                  </Space>
                </Tag>
              </Tooltip>
            </Space>

            <h1
              style={{
                color: "#ffffff",
                margin: "4px 0 8px",
                fontSize: "22px",
                fontWeight: 800,
                lineHeight: 1.3,
                letterSpacing: "-0.3px",
              }}
            >
              {rfpTitle}
            </h1>

            <div style={{ color: "#94a3b8", fontSize: "13px" }}>
              <Space size={18} wrap>
                <span>
                  📅 Created: <strong style={{ color: "#e2e8f0" }}>{data?.created_at ? dayjs(data.created_at).format("DD MMM YYYY") : "—"}</strong>
                </span>
                {contactText && (
                  <span>
                    👤 Coordinator: <strong style={{ color: "#e2e8f0" }}>{contactText}</strong>
                  </span>
                )}
                {data?.target_beneficiaries && (
                  <span>
                    🎯 Beneficiaries: <strong style={{ color: "#e2e8f0" }}>{data.target_beneficiaries}</strong>
                  </span>
                )}
              </Space>
            </div>
          </Col>

          <Col xs={24} lg={8} style={{ textAlign: "right" }}>
            <div style={{ display: "inline-flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              <Button
                type="primary"
                size="large"
                icon={<TrophyOutlined />}
                onClick={() => router.push(`/admin/rfp-assessment?rfp_id=${rfpId}`)}
                style={{
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  height: 44,
                  paddingInline: 24,
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35)",
                }}
              >
                Go to RFP Assessment
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      {/* ── 4 Quick Highlight Stat Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              background: "#ffffff",
              borderLeft: "4px solid #10b981",
              height: "100%",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Budget Range / Allocation
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#059669", marginTop: 4 }}>
              {budgetText}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <DollarOutlined /> <span>Estimated grant budget</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              background: "#ffffff",
              borderLeft: "4px solid #2563eb",
              height: "100%",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Submission Deadline
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {deadlineText}
            </div>
            <div style={{ fontSize: 11, color: "#2563eb", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <CalendarOutlined /> <span>NGO Proposal Cut-off</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              background: "#ffffff",
              borderLeft: "4px solid #7c3aed",
              height: "100%",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              RFP Lifecycle Stage
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {recordStatus === "APPROVED" ? "Approved & Live" : recordStatus || "In Progress"}
            </div>
            <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <FileProtectOutlined /> <span>System workflow status</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              background: "#ffffff",
              borderLeft: "4px solid #d97706",
              height: "100%",
              cursor: "pointer",
            }}
            styles={{ body: { padding: "16px 20px" } }}
            onClick={() => router.push(`/admin/rfp-assessment?rfp_id=${rfpId}`)}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Assessment Matrix
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#b45309", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Score Submissions</span>
              <TrophyOutlined style={{ fontSize: 15 }} />
            </div>
            <div style={{ fontSize: 11, color: "#d97706", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <span>Click to view NGO evaluations →</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Status Banner ── */}
      <RecordStatusAlert
        status={data?.status || data?.frm_status}
        onEdit={canEdit ? () => router.push(`/admin/request-for-proposal/edit/${rfpId}`) : null}
      />

      {/* ── Content View ── */}
      {loading ? (
        <div className="bg-white rounded-xl p-16 shadow-xs border border-slate-200/80 flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <span className="text-xs text-slate-500 font-medium">
            Loading RFP data from Form Builder...
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Parent Fields Reference Panel */}
          {showParentPanel && (
            <ParentFieldsPanel
              form_slug={formSlug}
              parent_id={data?.parent_id || data?.project_id}
              user_id={data?.created_by || data?.user_id}
              record_id={rfpId}
              display_fields={parentDisplayFields}
              parent_form_title={schema?.parent_form_title || "Project / Parent"}
            />
          )}

          {/* Dynamic Form Sections from Form Builder */}
          {memoizedSections.map((section) => {
            const isSecVisible =
              !section.conditions ||
              evaluateConditions(section.conditions, data || {});
            if (!isSecVisible) return null;

            return (
              <div key={section.section_id} id={`view_sec_${section.section_id}`}>
                {section.type === "general" && (
                  <GeneralSectionViewV2
                    section={section}
                    data={data || {}}
                    isActiveKey={isActiveKey}
                    form_slug={formSlug}
                  />
                )}
                {section.type === "add_more" && (
                  <AddMoreSectionViewV2
                    section={section}
                    data={data?.[section.slug] || data?.[section.section_id] || []}
                    allData={data || {}}
                    isActiveKey={isActiveKey}
                  />
                )}
              </div>
            );
          })}

          {/* Hook-injected extra fields */}
          {formHooks?.getExtraFields &&
            formHooks.getExtraFields({
              form_slug: formSlug,
              mode: "view",
              data,
              selectedData: { id: rfpId },
              recordId: rfpId,
              sectionSlug: "after_all_sections",
              position: "after_all_sections",
              onOpenEdit: canEdit
                ? () => router.push(`/admin/request-for-proposal/edit/${rfpId}`)
                : null,
              onStatusChange: (newStatus) => {
                setData((prev) => ({ ...prev, status: newStatus }));
                loadViewData();
              },
            })}
        </div>
      )}
    </div>
  );
}

