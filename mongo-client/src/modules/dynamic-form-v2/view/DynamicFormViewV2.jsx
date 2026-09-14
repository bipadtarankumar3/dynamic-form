import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  dynamicFormViewAPI,
  dynamicSchemaDetailsAPI,
} from "@/services/dynamicForm-service";

import { Alert, Button, Modal, Spin, Tag } from "antd";
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  EditOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  RollbackOutlined,
  SendOutlined,
} from "@ant-design/icons";
import GeneralSectionViewV2 from "./general-section/GeneralSectionViewV2";
import AddMoreSectionViewV2 from "./add-more-section/AddMoreSectionViewV2";
import DynamicAddEditFormV2 from "../add-edit/DynamicAddEditFormV2";
import ParentFieldsPanel from "./ParentFieldsPanel";
import { useSearchParams } from "@/hooks/useNextRouter";
import { getUser } from "@/context/AuthContext";
import WorkflowActionPanel from "@/modules/approval-workflow/panel/WorkflowActionPanel";
import FormApprovalPanel from "@/modules/form-approval/FormApprovalPanel";
import { getDynamicFormHooks } from "../hooks/dynamicFormHookRegistryV2";
import { evaluateConditions } from "@/modules/dynamic-form-v2/helper/runTimeCondition.helper";

// ── Record Status Alert Banner (Handles Approved, Pending, Rejected, Resend, Draft) ──
function RecordStatusAlert({ status, title, onEdit }) {
  const s = String(status || "").trim().toUpperCase();
  if (!s) return null;

  if (s === "APPROVED") {
    return (
      <Alert
        type="success"
        showIcon
        icon={<CheckCircleFilled style={{ fontSize: 20, color: "#16a34a" }} />}
        style={{
          marginBottom: 16,
          borderRadius: 10,
          background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: "1px solid #86efac",
          padding: "12px 18px",
          boxShadow: "0 2px 8px rgba(220, 38, 38, 0.08)",
        }}
        message={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#15803d" }}>
              This {title || "Record"} has been Approved ✓
            </span>
            <Tag color="success" style={{ fontWeight: 700, borderRadius: 12, padding: "2px 10px", fontSize: 12 }}>
              STATUS: APPROVED
            </Tag>
          </div>
        }
        description={
          <span style={{ color: "#166534", fontSize: 13 }}>
            All required approval steps have been completed and verified.
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
        style={{
          marginBottom: 16,
          borderRadius: 10,
          background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
          border: "1px solid #fed7aa",
          padding: "12px 18px",
          boxShadow: "0 2px 8px rgba(234, 88, 12, 0.08)",
        }}
        message={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#9a3412" }}>
              Changes Requested for this {title || "Record"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {onEdit && (
                <Button size="small" icon={<EditOutlined />} onClick={onEdit} style={{ fontWeight: 600, borderRadius: 6, borderColor: "#ea580c", color: "#ea580c" }}>
                  Edit Record
                </Button>
              )}
              <Tag color="orange" style={{ fontWeight: 700, borderRadius: 12, padding: "2px 10px", fontSize: 12 }}>
                STATUS: CHANGES REQUESTED
              </Tag>
            </div>
          </div>
        }
        description={
          <span style={{ color: "#9a3412", fontSize: 13 }}>
            An approver sent back this record for revision. You can edit the details and resend for approval below.
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
        style={{
          marginBottom: 16,
          borderRadius: 10,
          background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
          border: "1px solid #fca5a5",
          padding: "12px 18px",
          boxShadow: "0 2px 8px rgba(220, 38, 38, 0.08)",
        }}
        message={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#991b1b" }}>
              This {title || "Record"} has been Rejected
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {onEdit && (
                <Button size="small" icon={<EditOutlined />} onClick={onEdit} style={{ fontWeight: 600, borderRadius: 6 }}>
                  Edit Record
                </Button>
              )}
              <Tag color="error" style={{ fontWeight: 700, borderRadius: 12, padding: "2px 10px", fontSize: 12 }}>
                STATUS: REJECTED
              </Tag>
            </div>
          </div>
        }
        description={
          <span style={{ color: "#991b1b", fontSize: 13 }}>
            This record was rejected during the approval workflow. You can edit the details and resend for approval below.
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
        style={{
          marginBottom: 16,
          borderRadius: 10,
          background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
          border: "1px solid #7dd3fc",
          padding: "12px 18px",
          boxShadow: "0 2px 8px rgba(2, 132, 199, 0.08)",
        }}
        message={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0369a1" }}>
              This {title || "Record"} is in Approval Workflow ⏳
            </span>
            <Tag color="processing" style={{ fontWeight: 700, borderRadius: 12, padding: "2px 10px", fontSize: 12 }}>
              STATUS: {s}
            </Tag>
          </div>
        }
        description={
          <span style={{ color: "#0369a1", fontSize: 13 }}>
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
        style={{
          marginBottom: 16,
          borderRadius: 10,
          background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
          border: "1px solid #fde68a",
          padding: "12px 18px",
          boxShadow: "0 2px 8px rgba(217, 119, 6, 0.08)",
        }}
        message={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#b45309" }}>
              This {title || "Record"} is in Draft
            </span>
            <Tag color="warning" style={{ fontWeight: 700, borderRadius: 12, padding: "2px 10px", fontSize: 12 }}>
              STATUS: DRAFT
            </Tag>
          </div>
        }
        description={
          <span style={{ color: "#92400e", fontSize: 13 }}>
            Save approver assignments and send for approval below to start the workflow.
          </span>
        }
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16, borderRadius: 10 }}
      message={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Status: {s}</span>
          <Tag color="default">{s}</Tag>
        </div>
      }
    />
  );
}

const DynamicFormViewV2 = ({
  onClose,
  selectedData,
  form_slug,
  view_url_API,
  title: titleProp,
  childrenInformation,
  parentId: propParentId,
  hideTitle = false,
  enableApproval = false,
}) => {
  const [searchParams] = useSearchParams();
  const ctx = searchParams.get("ctx");
  const decoded = useMemo(() => {
    if (!ctx) return null;
    try {
      return JSON.parse(atob(ctx));
    } catch {
      return null;
    }
  }, [ctx]);

  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState({});
  const [data, setData] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const isModalView = Boolean(onClose);
  const activeInactiveAction = schema?.actions?.find(
    (a) => a.slug === "active_inactive"
  );
  const isActiveKey = activeInactiveAction?.form_details?.is_active_key;

  const effectiveSlug = form_slug || decoded?.form_slug;
  const resolvedRecordId = selectedData?.id || data?.id || decoded?.primary_key_value || null;

  const loadViewData = React.useCallback(async () => {
    if (!effectiveSlug) return;
    try {
      setLoading(true);
      const [schemaRes, viewRes] = await Promise.all([
        dynamicSchemaDetailsAPI({ form_slug: effectiveSlug }),
        dynamicFormViewAPI(view_url_API || "dynamic-form/view", {
          selected_data: selectedData || {
            [decoded?.primary_key]: decoded?.primary_key_value,
          },
          form_slug: effectiveSlug,
        }),
      ]);
      setSchema(schemaRes?.data?.data || schemaRes?.data || {});
      setData(viewRes?.data?.data || viewRes?.data || {});
    } catch (err) {
      console.error("Error fetching view details:", err);
      setData({});
    } finally {
      setLoading(false);
    }
  }, [effectiveSlug, selectedData, decoded, view_url_API]);

  useEffect(() => {
    loadViewData();
  }, [loadViewData]);

  const memoizedSections = useMemo(
    () =>
      (schema?.sections || []).map((s, idx) => ({
        ...s,
        section_id: s.section_id || s.id || s.slug || `sec_${idx}`,
      })),
    [schema?.sections]
  );

  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    if (memoizedSections?.length > 0 && !activeSectionId) {
      setActiveSectionId(memoizedSections[0]?.section_id);
    }
  }, [memoizedSections, activeSectionId]);

  // Check if current user is initiator/creator or admin
  const loggedInUser = getUser();
  const currentUserId = loggedInUser?.user_id || loggedInUser?.id;
  const isAdmin =
    loggedInUser?.role_slug === "superadmin" ||
    loggedInUser?.role_slug === "admin" ||
    loggedInUser?.role_id === 1 ||
    loggedInUser?.role_id === 2;

  const recordCreatedBy = data?.created_by || data?.user_id || selectedData?.created_by;
  const isRecordCreator = Boolean(
    currentUserId && Number(currentUserId) === Number(recordCreatedBy)
  );

  const recordStatus = String(data?.status || data?.frm_status || "").trim().toUpperCase();
  const isApprovalLocked =
    recordStatus === "APPROVED" ||
    recordStatus.startsWith("PENDING_") ||
    recordStatus === "SEND_FOR_APPROVAL";

  // Only the initiator / record creator or admin can edit when in Draft, Rejected, or Resend
  const canEdit =
    !isApprovalLocked &&
    (isAdmin || isRecordCreator || recordStatus === "DRAFT" || recordStatus === "");

  // ── Parent Field Inheritance Panel ──────────────────────────────────────────
  const parentDisplayFields = Array.isArray(schema?.relation_with_parent?.display_fields)
    ? schema.relation_with_parent.display_fields
    : [];
  const resolvedParentIdForPanel =
    data?.parent_id ||
    selectedData?.parent_id ||
    propParentId ||
    childrenInformation?.parent_primary_key_value ||
    searchParams?.get("parent_id") ||
    searchParams?.get("partner_id") ||
    data?.partner_id ||
    null;
  const resolvedUserIdForPanel =
    data?.created_by ||
    data?.user_id ||
    selectedData?.created_by ||
    selectedData?.user_id ||
    searchParams?.get("user_id") ||
    currentUserId ||
    null;
  const showParentPanel =
    Boolean(schema?.parent_form_id) &&
    (Boolean(resolvedParentIdForPanel) || Boolean(resolvedUserIdForPanel)) &&
    parentDisplayFields.length > 0;

  return (
    <>
      {/* Edit Form Modal */}
      <Modal
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        width="75vw"
        style={{ top: 20, maxWidth: "96vw" }}
        title={`Edit ${titleProp || schema?.title || "Record"}`}
        footer={null}
        destroyOnHidden={true}
        maskClosable={false}
      >
        {editModalOpen && (
          <DynamicAddEditFormV2
            onClose={() => {
              setEditModalOpen(false);
              loadViewData();
            }}
            form_slug={effectiveSlug}
            fetchData={loadViewData}
            selectedData={selectedData || { id: resolvedRecordId }}
            mode="edit"
            details_url_API={view_url_API}
            childrenInformation={childrenInformation}
          />
        )}
      </Modal>

      {isModalView ? (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
              <Spin size="large" />
            </div>
          )}

          <div className="flex flex-col gap-4">
            {!hideTitle && (
              <div className="card-header flex justify-between items-center" style={{ background: "var(--primary-gradient, var(--primary-color, #15803d))", color: "#ffffff", padding: "12px 16px", borderRadius: "8px 8px 0 0" }}>
                <h5 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
                  {titleProp || schema?.title || decoded?.title || "Details"}
                </h5>
                {canEdit && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setEditModalOpen(true)}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      borderColor: "rgba(255, 255, 255, 0.4)",
                      color: "#ffffff",
                      fontWeight: 600,
                      borderRadius: 6,
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
            )}

            {/* Record Status Banner (Modal View) */}
            <RecordStatusAlert
              status={data?.status || data?.frm_status}
              title={titleProp || schema?.title}
              onEdit={canEdit ? () => setEditModalOpen(true) : null}
            />

            <div className="flex flex-col gap-4 w-full">
              {/* Parent Fields Reference Panel */}
              {showParentPanel && (
                <ParentFieldsPanel
                  form_slug={effectiveSlug}
                  parent_id={resolvedParentIdForPanel}
                  user_id={resolvedUserIdForPanel}
                  record_id={resolvedRecordId}
                  display_fields={parentDisplayFields}
                  parent_form_title={schema?.parent_form_title || schema?.parent_form_name || "Parent Form"}
                />
              )}
              {memoizedSections?.map((section) => {
                const isSecVisible = !section.conditions || evaluateConditions(section.conditions, data || {});
                if (!isSecVisible) return null;
                const currentSlug = form_slug || decoded?.form_slug;
                if (currentSlug === "monitoring" && section.type === "add_more") return null;
                return (
                  <div key={section.section_id} id={`view_sec_${section.section_id}`}>
                    {section.type === "general" && (
                      <GeneralSectionViewV2
                        section={section}
                        data={data || {}}
                        isActiveKey={isActiveKey}
                        form_slug={currentSlug}
                      />
                    )}
                    {section.type === "add_more" && (
                      <AddMoreSectionViewV2
                        section={section}
                        data={(data && (data[section.slug] || data[section.section_id])) || []}
                        allData={data || {}}
                        isActiveKey={isActiveKey}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hook-injected extra fields */}
            {(() => {
              const currentSlug = form_slug || decoded?.form_slug;
              const hooks = getDynamicFormHooks(currentSlug);
              if (!hooks.getExtraFields) return null;
              const resolvedParentId = propParentId || childrenInformation?.parent_primary_key_value || decoded?.parent_primary_key_value || data?.parent_id || data?.project_id || data?.project || selectedData?.parent_id || searchParams.get("parent_id") || null;
              return hooks.getExtraFields({
                form_slug: currentSlug,
                mode: "view",
                data,
                selectedData,
                childrenInformation,
                parentId: resolvedParentId,
                recordId: resolvedRecordId,
                sectionSlug: "after_all_sections",
                position: "after_all_sections",
                onOpenEdit: canEdit ? () => setEditModalOpen(true) : null,
                onStatusChange: (newStatus) => {
                  setData((prev) => ({ ...prev, status: newStatus }));
                  loadViewData();
                },
              });
            })()}
          </div>
          <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="home-content p-3">
          {!hideTitle && (
            <div className="card pb-3 mb-3">
              <div className="card-header flex justify-between items-center" style={{ background: "var(--primary-gradient, var(--primary-color, #15803d))", color: "#ffffff", padding: "12px 16px", borderRadius: "8px 8px 0 0" }}>
                <h5 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
                  {titleProp || schema?.title || decoded?.title || "Details"}
                </h5>
                {canEdit && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setEditModalOpen(true)}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      borderColor: "rgba(255, 255, 255, 0.4)",
                      color: "#ffffff",
                      fontWeight: 600,
                      borderRadius: 6,
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="card-body p-0">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
                <Spin size="large" />
              </div>
            )}

            {/* Record Status Banner */}
            <RecordStatusAlert
              status={data?.status || data?.frm_status}
              title={titleProp || schema?.title}
              onEdit={canEdit ? () => setEditModalOpen(true) : null}
            />

            <div className="flex flex-col gap-4 w-full">
              {/* Parent Fields Reference Panel */}
              {showParentPanel && (
                <ParentFieldsPanel
                  form_slug={effectiveSlug}
                  parent_id={resolvedParentIdForPanel}
                  user_id={resolvedUserIdForPanel}
                  record_id={resolvedRecordId}
                  display_fields={parentDisplayFields}
                  parent_form_title={schema?.parent_form_title || schema?.parent_form_name || "Parent Form"}
                />
              )}

             

              {memoizedSections?.map((section) => {
                const currentSlug = form_slug || decoded?.form_slug;
                if (currentSlug === "monitoring" && section.type === "add_more") return null;
                return (
                  <div key={section.section_id} id={`view_sec_${section.section_id}`}>
                    {section.type === "general" && (
                      <GeneralSectionViewV2
                        section={section}
                        data={data || {}}
                        isActiveKey={isActiveKey}
                        form_slug={currentSlug}
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
              {(() => {
                const currentSlug = form_slug || decoded?.form_slug;
                const hooks = getDynamicFormHooks(currentSlug);
                if (!hooks.getExtraFields) return null;
                const resolvedParentId = propParentId || childrenInformation?.parent_primary_key_value || decoded?.parent_primary_key_value || data?.parent_id || data?.project_id || data?.project || selectedData?.parent_id || searchParams.get("parent_id") || null;
                return hooks.getExtraFields({
                  form_slug: currentSlug,
                  mode: "view",
                  data,
                  selectedData,
                  childrenInformation,
                  parentId: resolvedParentId,
                  recordId: resolvedRecordId,
                  sectionSlug: "after_all_sections",
                  position: "after_all_sections",
                  onOpenEdit: () => setEditModalOpen(true),
                  onStatusChange: (newStatus) => {
                    setData((prev) => ({ ...prev, status: newStatus }));
                    loadViewData();
                  },
                });
              })()}

               {/* Form Approval Panel: Controlled dynamically by Form Builder (schema.enable_approval) or enableApproval prop */}
              {(() => {
                const currentSlug = form_slug || decoded?.form_slug;
                const isApprovalExplicitlyDisabled =
                  searchParams?.get("enable_approval") === "0" ||
                  searchParams?.get("enable_approval") === "false" ||
                  enableApproval === false;
                const isApprovalRequested =
                  !isApprovalExplicitlyDisabled &&
                  (
                    searchParams?.get("enable_approval") === "1" ||
                    searchParams?.get("enable_approval") === "true" ||
                    Boolean(enableApproval) ||
                    Boolean(schema?.enable_approval)
                  );
                if (!isApprovalRequested || !resolvedRecordId) return null;

                // Hide only from regular NGO user on NGO portal for due diligence
                const loggedIn = getUser();
                const roleStr = String(loggedIn?.role_slug || loggedIn?.role || "").toLowerCase();
                if ((currentSlug === "due_diligence" || schema?.slug === "due_diligence") && (roleStr === "ngo" || loggedIn?.role_id === 6)) {
                  return null;
                }

                return (
                  <div style={{ marginBottom: 8 }}>
                    <FormApprovalPanel
                      form_slug={currentSlug}
                      record_id={resolvedRecordId}
                      onStatusChange={(newStatus) => {
                        setData((prev) => ({ ...prev, status: newStatus }));
                        loadViewData();
                      }}
                      onOpenEdit={() => setEditModalOpen(true)}
                    />
                  </div>
                );
              })()}

            </div>
          </div>
          {decoded?.workflow_slug && (
            <WorkflowActionPanel
              reference_id={decoded?.primary_key_value}
              workflow_slug={decoded?.workflow_slug}
            />
          )}
        </div>
      )}
    </>
  );
};

export default DynamicFormViewV2;
