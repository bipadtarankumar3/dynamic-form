'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Tag,
  Spin,
  Alert,
  Typography,
  Row,
  Col,
  Progress,
  Avatar,
  Space,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  ExclamationCircleFilled,
  FileProtectOutlined,
  HistoryOutlined,
  BankOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  CameraOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import { dynamicSchemaDetailsAPI } from "@/services/dynamicForm-service";
import NgoDetailsView from "./NgoDetailsView";
import NgoDynamicFormModal from "./NgoDynamicFormModal";
import NgoVersionHistoryModal from "./NgoVersionHistoryModal";
import "./NgoFormRecordView.css";

const { Title, Text, Paragraph } = Typography;

export default function NgoFormRecordView({
  formSlug = "implementation_partner",
  title = "NGO Organization Profile",
  description = "Review and manage your organizational details, statutory documents, and compliance records.",
  updateBtnLabel = "Update the profile",
  editBtnLabel = "Edit Profile",
  icon = <FileProtectOutlined />,
  isVersioned = false,
  apiEndpoint = "ngo/profile",
  showAvatar = true,
  showCompleteness = true,
}) {
  const [loading, setLoading] = useState(true);
  const [partnerRecord, setPartnerRecord] = useState(null);
  const [schemaData, setSchemaData] = useState(null);
  const [status, setStatus] = useState("DRAFT");
  const [currentVersion, setCurrentVersion] = useState(1);
  const [totalVersions, setTotalVersions] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // 1. Fetch current status / existing submission from its own API
  const fetchRecordData = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = isVersioned ? "ngo/due-diligence" : "ngo/profile";
      const res = await privateHttpClient.get(
        `${endpoint}?form_slug=${formSlug}`
      );

      if (res?.data?.success && res?.data?.data) {
        const payload = res.data.data;
        let rec = payload.record || (payload.id ? payload : null);
        if (rec && typeof rec === "object") {
          rec = { ...rec };
          Object.keys(rec).forEach((k) => {
            if (typeof rec[k] === "string") {
              const trimmed = rec[k].trim();
              if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
                try {
                  rec[k] = JSON.parse(trimmed);
                } catch (_) { }
              }
            }
          });
        }

        setPartnerRecord(rec && Object.keys(rec).length > 0 ? rec : null);
        setStatus(payload.status || rec?.status || "DRAFT");
        if (payload.version) setCurrentVersion(payload.version);
        if (payload.total_versions) setTotalVersions(payload.total_versions);
      } else {
        setPartnerRecord(null);
        setStatus("DRAFT");
      }
    } catch (err) {
      console.log("Failed to fetch NGO data for slug:", formSlug, err.message);
      setPartnerRecord(null);
      setStatus("DRAFT");
    } finally {
      setLoading(false);
    }
  }, [formSlug, isVersioned]);

  // 2. Fetch Form Builder schema for sections and fields
  const fetchFormSchema = useCallback(async () => {
    try {
      const res = await dynamicSchemaDetailsAPI({ form_slug: formSlug });
      if (res?.data?.success && res?.data?.data) {
        setSchemaData(res.data.data);
      }
    } catch (err) {
      console.log("Failed to fetch schema for slug:", formSlug, err.message);
    }
  }, [formSlug]);

  useEffect(() => {
    fetchRecordData();
    fetchFormSchema();
  }, [fetchRecordData, fetchFormSchema]);

  const hasRecord = Boolean(partnerRecord && Object.keys(partnerRecord).length > 0);
  const isApproved = String(status || "").toUpperCase() === "APPROVED";
  const isUnderReview = String(status || "").toUpperCase() === "UNDER_REVIEW";
  const isNeedsRevision = String(status || "").toUpperCase() === "NEEDS_REVISION";

  const allFields = (schemaData?.sections || []).flatMap((sec) => sec.fields || []);
  let totalRequiredFields = 0;
  let filledRequiredFields = 0;
  let totalAllFields = 0;
  let filledAllFields = 0;

  (schemaData?.sections || []).forEach((sec) => {
    const fields = sec.fields || [];
    if (!Array.isArray(fields) || fields.length === 0) return;

    if (sec.type === "add_more") {
      const rows =
        partnerRecord?.[sec.slug] ??
        partnerRecord?.[sec.section_id] ??
        partnerRecord?.[sec.table] ??
        [];
      const hasRows = Array.isArray(rows) && rows.length > 0;

      fields.forEach((f) => {
        const isReq = f.required === true || f.required === "true";
        totalAllFields++;
        if (isReq) totalRequiredFields++;

        if (hasRows) {
          const k = f.db_field || f.slug || f.field_id || f.name;
          const isFilled = rows.some((r) => {
            const val = r?.[k] !== undefined ? r[k] : r?.[f.name];
            return val !== undefined && val !== null && val !== "";
          });
          if (isFilled) {
            filledAllFields++;
            if (isReq) filledRequiredFields++;
          }
        }
      });
    } else {
      fields.forEach((f) => {
        const isReq = f.required === true || f.required === "true";
        totalAllFields++;
        if (isReq) totalRequiredFields++;

        const k = f.db_field || f.slug || f.field_id || f.name;
        const val = partnerRecord?.[k] !== undefined ? partnerRecord[k] : partnerRecord?.[f.name];
        if (val !== undefined && val !== null && val !== "") {
          filledAllFields++;
          if (isReq) filledRequiredFields++;
        }
      });
    }
  });

  const completionPercentage = totalRequiredFields > 0
    ? Math.round((filledRequiredFields / totalRequiredFields) * 100)
    : totalAllFields > 0
    ? Math.round((filledAllFields / totalAllFields) * 100)
    : hasRecord ? 100 : 0;


  const orgDisplayName =
    partnerRecord?.name_of_the_organization ||
    partnerRecord?.organization_name ||
    partnerRecord?.name ||
    (hasRecord ? "Registered NGO Partner" : title);

  const orgInitials = orgDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "NG";

  const handleSubmittedSuccess = async () => {
    await fetchRecordData();
  };

  return (
    <div className="ngo-profile-container">
      {/* Hero Profile Header Card */}
      <Card
        className="ngo-profile-card"
        styles={{ body: { padding: 0 } }}
      >
        <div className="ngo-profile-card-content">
          <div className="ngo-profile-header">
            {/* Left: Avatar + Titles + Chips */}
            <div className="ngo-profile-left">
              {showAvatar && (
                <div className="ngo-avatar-wrapper">
                  <Avatar size={74} className="ngo-avatar">
                    {orgInitials}
                  </Avatar>
                </div>
              )}

              <div>
                <div className="ngo-profile-info">
                  <h1 className="ngo-profile-name">
                    {orgDisplayName}
                  </h1>

                  {/* Status Badges */}
                  {hasRecord ? (
                    isApproved ? (
                      <Tag key="tag-approved" color="success" className="ngo-tag-approved">
                        <CheckCircleFilled /> Verified &amp; Approved
                      </Tag>
                    ) : isUnderReview ? (
                      <Tag key="tag-under-review" color="processing" className="ngo-tag-under-review">
                        <ClockCircleFilled /> Under Review
                      </Tag>
                    ) : isNeedsRevision ? (
                      <Tag key="tag-needs-revision" color="error" className="ngo-tag-needs-revision">
                        <ExclamationCircleFilled /> Revision Required
                      </Tag>
                    ) : (
                      <Tag key="tag-draft" className="ngo-tag-draft">
                        <div className="ngo-draft-dot" />
                        Draft
                      </Tag>
                    )
                  ) : (
                    <Tag key="tag-pending" className="ngo-tag-pending">
                      Pending Initial Submission
                    </Tag>
                  )}
                </div>

                <p className="ngo-profile-description">
                  {description}
                </p>

                {/* Quick Meta Chips */}
                <div className="ngo-meta-chips">
                  {partnerRecord?.primary_email && (
                    <Tag
                      key="meta-email"
                      icon={<MailOutlined />}
                      className="ngo-meta-email"
                    >
                      {partnerRecord.primary_email}
                    </Tag>
                  )}
                  {partnerRecord?.phone_no && (
                    <Tag
                      key="meta-phone"
                      icon={<PhoneOutlined />}
                      className="ngo-meta-phone"
                    >
                      {partnerRecord.phone_no}
                    </Tag>
                  )}
                  {partnerRecord?.csr_registration_number && (
                    <Tag
                      key="meta-csr"
                      icon={<SafetyCertificateOutlined />}
                      className="ngo-meta-csr"
                    >
                      CSR Reg: {partnerRecord.csr_registration_number}
                    </Tag>
                  )}
                  {partnerRecord?.darpan_no && (
                    <Tag
                      key="meta-darpan"
                      icon={<IdcardOutlined />}
                      className="ngo-meta-darpan"
                    >
                      Darpan ID: {partnerRecord.darpan_no}
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions & Completion Progress */}
            <div className="ngo-profile-right">

              {/* Profile Completion Indicator */}
              {showCompleteness && allFields.length > 0 && (
                <div className="ngo-completeness-card">
                  <div className="ngo-completeness-header">
                    <span className="ngo-completeness-title">
                      <CheckCircleOutlined className="ngo-completeness-icon" />
                      Profile Completeness
                    </span>
                    <span className="ngo-completeness-percent">{completionPercentage}%</span>
                  </div>
                  <Progress
                    percent={completionPercentage}
                    showInfo={false}
                    strokeColor="#22c55e"
                    trailColor="#e2e8f0"
                    size="small"
                  />
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="ngo-action-buttons">
                {isVersioned && hasRecord && (
                  <Button
                    icon={<HistoryOutlined />}
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="ngo-btn-history"
                  >
                    History
                  </Button>
                )}

                <Button
                  type="primary"
                  icon={hasRecord ? <EditOutlined /> : <PlusOutlined />}
                  onClick={() => setIsFormModalOpen(true)}
                  className={`ngo-btn-edit ${isVersioned && hasRecord ? 'ngo-btn-edit-partial' : 'ngo-btn-edit-full'}`}
                >
                  {hasRecord ? editBtnLabel : updateBtnLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <Card
          style={{
            textAlign: "center",
            padding: "80px 0",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: 16, color: "#64748b", fontWeight: 500 }}>
            Loading organizational profile records...
          </div>
        </Card>
      ) : (
        <div>
          {/* Status Alerts */}
          {!hasRecord && (
            <Alert
              type="info"
              showIcon
              message={
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  Initial Profile Setup Required
                </span>
              }
              description={
                <span style={{ fontSize: 13.5 }}>
                  No submission is recorded yet for this organization. Preview the required fields below and click the green{" "}
                  <strong>&quot;{updateBtnLabel}&quot;</strong> button above to complete your profile.
                </span>
              }
              style={{
                marginBottom: 20,
                borderRadius: 12,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
              }}
            />
          )}

          {hasRecord && isUnderReview && (
            <Alert
              type="info"
              showIcon
              message={
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  Profile Submitted &amp; Under Verification
                </span>
              }
              description={
                <span style={{ fontSize: 13.5 }}>
                  Your details have been submitted to the CSR review team. You can still use the{" "}
                  <strong>&quot;{editBtnLabel}&quot;</strong> button to revise or supplement your records if necessary.
                </span>
              }
              style={{
                marginBottom: 20,
                borderRadius: 12,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
              }}
            />
          )}

          {hasRecord && isApproved && (
            <Alert
              type="success"
              showIcon
              message={
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  Statutory Records Verified &amp; Approved
                </span>
              }
              description={
                <span style={{ fontSize: 13.5 }}>
                  Your organization is verified as an active CSR Implementation Partner. Any updates made will be recorded for ongoing compliance.
                </span>
              }
              style={{
                marginBottom: 20,
                borderRadius: 12,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
              }}
            />
          )}

          {/* Details View (Field names and values formatted like details page) */}
          <NgoDetailsView
            schema={schemaData}
            data={partnerRecord || {}}
            hasRecord={hasRecord}
            emptyPlaceholder="Not provided"
          />
        </div>
      )}

      {/* Dedicated Form Modal (Mounted only when open to prevent unmounted useForm warnings) */}
      {isFormModalOpen && (
        <NgoDynamicFormModal
          open={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          schema={schemaData}
          initialValues={partnerRecord || {}}
          mode={hasRecord ? "edit" : "add"}
          formSlug={formSlug}
          apiEndpoint={apiEndpoint}
          isVersioned={isVersioned}
          title={title}
          onSuccess={handleSubmittedSuccess}
        />
      )}

      {/* Version History Drawer (for DD) */}
      {isVersioned && (
        <NgoVersionHistoryModal
          open={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          formSlug={formSlug}
          schema={schemaData}
          currentVersion={currentVersion}
        />
      )}
    </div>
  );
}
