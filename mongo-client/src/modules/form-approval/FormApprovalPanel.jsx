"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Collapse,
  Divider,
  Modal,
  Skeleton,
  Tag,
  message,
} from "antd";
import {
  ApartmentOutlined,
  AuditOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { getUser } from "@/context/AuthContext";
import { fetchNotifications } from "@/store/slices/NotificationSlice";
import {
  getFormApprovalWorkflow,
  getUsersByRole,
  saveApprovalAssignments,
  sendForApproval,
  resendForApproval,
  reopenWorkflow,
  pullBackWorkflow,
  performApprovalAction,
} from "@/services/formApproval-service";

import { getStatusMeta } from "./utils/formApprovalHelpers";
import PanelHeader from "./components/PanelHeader";
import WorkflowStepperTracker from "./components/WorkflowStepperTracker";
import AssignApproversSection from "./components/AssignApproversSection";
import SendForApprovalSection from "./components/SendForApprovalSection";
import RejectionAlertCard from "./components/RejectionAlertCard";
import RoutingApproverInfo from "./components/RoutingApproverInfo";
import ApproverActionPanel from "./components/ApproverActionPanel";
import ApprovalProcessTrackView from "./components/ApprovalProcessTrackView";
import PullBackModal from "./components/PullBackModal";
import ResendApprovalModal from "./components/ResendApprovalModal";
import "./form-approval.css";

export default function FormApprovalPanel({
  form_slug,
  record_id,
  currentUserId: propUserId,
  onStatusChange,
  onOpenEdit,
}) {
  const loggedInUser = getUser();
  const currentUserId = propUserId || loggedInUser?.user_id || loggedInUser?.id;
  const dispatch = useDispatch();

  const [modal, modalContextHolder] = Modal.useModal();
  const [msgApi, msgContextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(null);
  const [usersByRole, setUsersByRole] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);

  // Stage 1 state
  const [stepUserMap, setStepUserMap] = useState({}); // { stepNum: userId }
  const [saving, setSaving] = useState(false);

  // Stage 2 state
  const [sendRemarks, setSendRemarks] = useState("");
  const [sendRemarksErr, setSendRemarksErr] = useState("");
  const [sending, setSending] = useState(false);

  // Stage 3 action state
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionRemarksErr, setActionRemarksErr] = useState("");
  const [actioning, setActioning] = useState(false);

  // Resend / Re-open modal state
  const [resendModalVisible, setResendModalVisible] = useState(false);
  const [resendRemarks, setResendRemarks] = useState("");
  const [resendRemarksErr, setResendRemarksErr] = useState("");
  const [resending, setResending] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Pull back modal state
  const [pullBackModalVisible, setPullBackModalVisible] = useState(false);
  const [pullBackRemarks, setPullBackRemarks] = useState("");
  const [pullingBack, setPullingBack] = useState(false);

  // ── Load State ────────────────────────────────────────────
  const loadState = useCallback(async () => {
    if (!form_slug || !record_id) return;
    setLoading(true);
    try {
      const res = await getFormApprovalWorkflow(form_slug, record_id);
      setState(res?.data?.data || null);
    } catch {
      msgApi.error("Failed to load approval workflow state");
    } finally {
      setLoading(false);
    }
  }, [form_slug, record_id, msgApi]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Load role users when workflow loaded
  useEffect(() => {
    const steps = state?.steps;
    if (!steps || steps.length === 0) return;

    const uniqueRoleIds = [...new Set(steps.map((s) => s.role_id).filter(Boolean))];
    if (uniqueRoleIds.length === 0) return;

    setUsersLoading(true);
    Promise.allSettled(
      uniqueRoleIds.map((rid) =>
        getUsersByRole(rid).then((r) => ({ rid, users: r?.data?.data || [] }))
      )
    )
      .then((results) => {
        const map = {};
        results.forEach((r) => {
          if (r.status === "fulfilled") map[r.value.rid] = r.value.users;
        });
        setUsersByRole(map);
      })
      .finally(() => setUsersLoading(false));
  }, [state?.steps]);

  // Pre-fill stepUserMap from saved assignments or active instance assignments
  useEffect(() => {
    const assignments =
      state?.instance?.assignments || state?.savedAssignment?.assignments;
    if (!assignments || assignments.length === 0) return;
    const map = {};
    assignments.forEach((a) => {
      map[a.step] = a.user_id;
    });
    setStepUserMap(map);
  }, [state?.savedAssignment, state?.instance]);

  // ── Derived State ─────────────────────────────────────────
  const hasWorkflow = state?.hasWorkflow === true;
  const steps = state?.steps || [];
  const instance = state?.instance || null;
  const savedAssignment = state?.savedAssignment || null;
  const approvalTrack = state?.approvalTrack || [];
  const isApproved = instance?.status === "APPROVED";
  const isRejected = instance?.status === "REJECTED";
  const isResend =
    instance?.status === "RESEND" ||
    instance?.rejectionInfo?.action === "RESEND" ||
    instance?.rejectionInfo?.action === "REQUEST_INFO";
  const isFinished = isApproved || isRejected || isResend;
  const currentStep = instance?.current_step || 1;

  const isAdmin =
    loggedInUser?.isConfigurator ||
    loggedInUser?.role_slug === "superadmin" ||
    loggedInUser?.role_slug === "admin" ||
    loggedInUser?.role_slug === "configurator" ||
    loggedInUser?.role_id === 1 ||
    loggedInUser?.role_id === 2;

  const initiatorUserId =
    instance?.initiator?.id ||
    instance?.created_by ||
    (instance?.history || []).find(
      (h) => h.action === "SEND_FOR_APPROVAL" || h.action === "RESEND_FOR_APPROVAL"
    )?.by_user_id;

  const isInitiator =
    isAdmin ||
    Boolean(initiatorUserId && Number(currentUserId) === Number(initiatorUserId));

  const canInitiateWorkflow = useMemo(() => {
    if (state?.canInitiate !== undefined) return Boolean(state.canInitiate);
    const allowedRoles = state?.initiator_roles || state?.matchedRule?.initiator_roles || state?.workflow?.initiator_roles || [];
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      const userRoleSlug = String(loggedInUser?.role_slug || loggedInUser?.role_name || "").toLowerCase();
      const userRoleId = Number(loggedInUser?.role_id);
      return (
        loggedInUser?.isConfigurator ||
        userRoleId === 1 ||
        userRoleSlug === "superadmin" ||
        userRoleSlug === "configurator" ||
        allowedRoles.some((r) => Number(r) === userRoleId || String(r).toLowerCase() === userRoleSlug)
      );
    }
    return isAdmin;
  }, [state?.canInitiate, state?.initiator_roles, state?.matchedRule, state?.workflow, loggedInUser, isAdmin]);

  const initiatorUser = useMemo(() => {
    if (instance?.initiator) return instance.initiator;
    if (canInitiateWorkflow && loggedInUser) return loggedInUser;
    return {
      name: "Admin",
      role_name: "Admin",
      role_slug: "admin",
    };
  }, [instance?.initiator, canInitiateWorkflow, loggedInUser]);

  const isCurrentApprover = useMemo(() => {
    if (!instance || !currentUserId || isFinished) return false;
    const curr = (instance.assignments || []).find(
      (a) => Number(a.step) === Number(currentStep)
    );
    return curr && Number(curr.user_id) === Number(currentUserId);
  }, [instance, currentUserId, currentStep, isFinished]);

  const rejectionStep = instance?.rejectionInfo?.step || currentStep;
  const prevStepNum = currentStep > 1 ? currentStep - 1 : 0;
  const prevAssignment = (instance?.assignments || []).find(
    (a) => Number(a.step) === Number(prevStepNum)
  );
  const isPrevApprover =
    prevAssignment && Number(prevAssignment.user_id) === Number(currentUserId);

  const canPullBack =
    !isFinished &&
    Boolean(instance) &&
    ((currentStep === 1 && (isInitiator || isAdmin)) ||
      (currentStep > 1 && (isPrevApprover || isAdmin)));

  // ── Handlers ──────────────────────────────────────────────
  const handleOpenPullBackModal = () => {
    setPullBackRemarks("");
    setPullBackModalVisible(true);
  };

  const handleConfirmPullBack = async () => {
    try {
      setPullingBack(true);
      const res = await pullBackWorkflow({
        form_slug,
        record_id: Number(record_id),
        remarks: pullBackRemarks.trim(),
      });
      if (res?.data?.success) {
        msgApi.success(res.data.message || "Workflow pulled back successfully!");
        setPullBackModalVisible(false);
        setPullBackRemarks("");
        await loadState();
        dispatch(fetchNotifications());
        if (typeof onStatusChange === "function") {
          onStatusChange(res.data.data?.status || "Draft");
        }
      } else {
        msgApi.error(res?.data?.message || "Failed to pull back workflow");
      }
    } catch (err) {
      msgApi.error(
        err?.response?.data?.message || err?.message || "Error pulling back workflow"
      );
    } finally {
      setPullingBack(false);
    }
  };

  const handleSaveAssignments = async () => {
    for (const step of steps) {
      const sn = step.step || steps.indexOf(step) + 1;
      if (!stepUserMap[sn]) {
        msgApi.warning(
          `Please select an approver for Step ${sn}: ${step.role_name || step.role}`
        );
        return;
      }
    }
    const assignments = steps.map((s, i) => ({
      step: s.step || i + 1,
      user_id: stepUserMap[s.step || i + 1],
      role_id: s.role_id,
      role: s.role,
      role_name: s.role_name,
      label: s.label || `Step ${s.step || i + 1}`,
      actions: s.actions || s.permitted_actions || ["approve", "reject"],
      reject_to_step: s.reject_to_step || "0",
    }));

    setSaving(true);
    try {
      await saveApprovalAssignments({
        form_slug,
        record_id: Number(record_id),
        assignments,
      });
      msgApi.success("Approvers saved! You can now send for approval.");
      await loadState();
    } catch (err) {
      msgApi.error(err?.response?.data?.message || "Failed to save approvers");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = () => {
    if (!sendRemarks.trim()) {
      setSendRemarksErr("Remarks are required");
      return;
    }
    modal.confirm({
      title: "Confirm: Send for Approval",
      icon: <SendOutlined className="fap-modal-header-icon" />,
      content: (
        <div>
          <p className="fap-field-label">Send this record for approval?</p>
          <div className="fap-assigned-modal-box">
            <strong>Remarks:</strong> {sendRemarks}
          </div>
        </div>
      ),
      okText: "Send for Approval",
      okButtonProps: { className: "fap-modal-btn-confirm" },
      cancelText: "Cancel",
      onOk: async () => {
        setSending(true);
        try {
          const res = await sendForApproval({
            form_slug,
            record_id: Number(record_id),
            remarks: sendRemarks,
          });
          msgApi.success("Sent for approval!");
          setSendRemarks("");
          setSendRemarksErr("");
          await loadState();
          dispatch(fetchNotifications());
          if (typeof onStatusChange === "function") {
            onStatusChange(res?.data?.data?.status || "PENDING");
          }
        } catch (err) {
          msgApi.error(err?.response?.data?.message || "Failed to send for approval");
        } finally {
          setSending(false);
        }
      },
    });
  };

  const handleReopen = () => {
    modal.confirm({
      title: "Re-open Workflow for Editing",
      icon: <ReloadOutlined className="fap-modal-header-icon" />,
      content:
        "This will reset the workflow to Draft status, allowing you to edit all form fields, modify approvers, and send again.",
      okText: "Yes, Re-open",
      okButtonProps: { className: "fap-modal-btn-confirm" },
      cancelText: "Cancel",
      onOk: async () => {
        setReopening(true);
        try {
          await reopenWorkflow({
            form_slug,
            record_id: Number(record_id),
            remarks: "Re-opened for editing",
          });
          msgApi.success("Workflow re-opened! Record is now in Draft mode.");
          await loadState();
          dispatch(fetchNotifications());
          if (typeof onStatusChange === "function") {
            onStatusChange("Draft");
          }
        } catch (err) {
          msgApi.error(err?.response?.data?.message || "Failed to re-open workflow");
        } finally {
          setReopening(false);
        }
      },
    });
  };

  const handleConfirmResend = async () => {
    if (!resendRemarks.trim()) {
      setResendRemarksErr("Remarks are required to explain the resubmission");
      return;
    }
    setResending(true);
    try {
      const res = await resendForApproval({
        form_slug,
        record_id: Number(record_id),
        remarks: resendRemarks,
      });
      msgApi.success("Record resubmitted for approval starting from Step 1!");
      setResendRemarks("");
      setResendRemarksErr("");
      setResendModalVisible(false);
      await loadState();
      dispatch(fetchNotifications());
      if (typeof onStatusChange === "function") {
        onStatusChange(res?.data?.data?.status || "PENDING");
      }
    } catch (err) {
      msgApi.error(err?.response?.data?.message || "Failed to resend for approval");
    } finally {
      setResending(false);
    }
  };

  const handleAction = (action) => {
    if (!actionRemarks.trim()) {
      setActionRemarksErr("Remarks are required");
      return;
    }
    const actionLabels = {
      APPROVE: "Approve",
      REJECT: "Reject",
      RESEND: "Resend / Request Info",
      FORWARD: "Forward",
      REVIEW: "Review & Pass",
    };
    const label = actionLabels[action] || action;
    modal.confirm({
      title: `Confirm: ${label}`,
      icon:
        action === "APPROVE" ? (
          <CheckCircleOutlined className="fap-stepper-status-completed" />
        ) : action === "REJECT" ? (
          <ExclamationCircleOutlined className="fap-field-required" />
        ) : action === "RESEND" ? (
          <RollbackOutlined className="fap-rejection-subtitle--resend" />
        ) : (
          <CheckCircleOutlined className="fap-modal-header-icon" />
        ),
      content: (
        <div>
          <p>
            Are you sure you want to perform action <strong>&ldquo;{label}&rdquo;</strong>{" "}
            for Step {currentStep}?
          </p>
          <div className="fap-assigned-modal-box">
            <strong>Remarks:</strong> {actionRemarks}
          </div>
        </div>
      ),
      okText: `Yes, ${label}`,
      okButtonProps: {
        danger: action === "REJECT",
        className:
          action === "APPROVE"
            ? "fap-btn-approve"
            : action === "RESEND"
            ? "fap-btn-resend-action"
            : action === "FORWARD"
            ? "fap-btn-forward"
            : undefined,
      },
      cancelText: "Cancel",
      onOk: async () => {
        setActioning(true);
        try {
          const res = await performApprovalAction({
            form_slug,
            record_id: Number(record_id),
            instance_id: instance.id,
            action,
            remarks: actionRemarks,
          });
          msgApi.success(`${label} completed successfully!`);
          setActionRemarks("");
          setActionRemarksErr("");
          await loadState();
          dispatch(fetchNotifications());
          if (typeof onStatusChange === "function") {
            onStatusChange(
              res?.data?.data?.status || (action === "APPROVE" ? "APPROVED" : "REJECTED")
            );
          }
        } catch (err) {
          msgApi.error(err?.response?.data?.message || "Action failed");
        } finally {
          setActioning(false);
        }
      },
    });
  };

  // ── Render Loading & Empty States ─────────────────────────
  if (loading) {
    return (
      <Card className="fap-card-loading">
        {modalContextHolder}
        {msgContextHolder}
        <Skeleton active paragraph={{ rows: 5 }} />
      </Card>
    );
  }

  if (!hasWorkflow) {
    return (
      <Card className="fap-empty-card" styles={{ body: { padding: 24 } }}>
        {modalContextHolder}
        {msgContextHolder}
        <div className="fap-empty-wrapper">
          <div className="fap-empty-icon-box">
            <ApartmentOutlined className="fap-empty-icon" />
          </div>
          <div>
            <div className="fap-empty-title">No Approval Workflow Configured</div>
            <div className="fap-empty-desc">
              No active approval path for <strong>{form_slug}</strong>. Create one in{" "}
              <a
                href="/techcsr/admin/forms/approval-path/"
                target="_blank"
                className="fap-empty-link"
              >
                Approval Path settings
              </a>{" "}
              with trigger form = <code className="fap-empty-code">{form_slug}</code>.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const statusMeta = instance ? getStatusMeta(instance.status) : null;

  return (
    <Card
      className="fap-card"
      style={{ border: `1px solid ${statusMeta?.border || "#e0e7ff"}` }}
      styles={{ body: { padding: 0 } }}
    >
      {modalContextHolder}
      {msgContextHolder}

      {/* Resend for Approval Modal */}
      <ResendApprovalModal
        visible={resendModalVisible}
        resending={resending}
        resendRemarks={resendRemarks}
        setResendRemarks={setResendRemarks}
        resendRemarksErr={resendRemarksErr}
        setResendRemarksErr={setResendRemarksErr}
        steps={steps}
        instance={instance}
        savedAssignment={savedAssignment}
        onCancel={() => setResendModalVisible(false)}
        onConfirm={handleConfirmResend}
      />

      {/* Pull Back Modal */}
      <PullBackModal
        visible={pullBackModalVisible}
        pullingBack={pullingBack}
        pullBackRemarks={pullBackRemarks}
        setPullBackRemarks={setPullBackRemarks}
        instance={instance}
        currentStep={currentStep}
        prevStepNum={prevStepNum}
        prevAssignment={prevAssignment}
        onCancel={() => setPullBackModalVisible(false)}
        onConfirm={handleConfirmPullBack}
      />

      {/* Header Banner */}
      <PanelHeader
        workflow={state.workflow}
        steps={steps}
        status={instance?.status}
        rejectionInfo={instance?.rejectionInfo}
        onRefresh={loadState}
        loading={loading}
      />

      <div className="fap-card-body">
        {/* Animated Horizontal Stepper */}
        <WorkflowStepperTracker
          steps={steps}
          instance={instance}
          savedAssignment={savedAssignment}
          currentStep={currentStep}
          rejectionStep={rejectionStep}
          isFinished={isFinished}
          isResend={isResend}
          initiatorUser={initiatorUser}
          stepUserMap={stepUserMap}
        />

        <Divider className="fap-divider-stage2" />

        {/* Stage 1: No active workflow instance yet → Assign Approvers / Send for Approval */}
        {!instance && (
          canInitiateWorkflow ? (
            <>
              <AssignApproversSection
                steps={steps}
                usersByRole={usersByRole}
                usersLoading={usersLoading}
                stepUserMap={stepUserMap}
                setStepUserMap={setStepUserMap}
                saving={saving}
                savedAssignment={savedAssignment}
                onSaveAssignments={handleSaveAssignments}
              />

              {/* Stage 2: Send for Approval section (after saving) */}
              <SendForApprovalSection
                steps={steps}
                savedAssignment={savedAssignment}
                sendRemarks={sendRemarks}
                setSendRemarks={setSendRemarks}
                sendRemarksErr={sendRemarksErr}
                setSendRemarksErr={setSendRemarksErr}
                sending={sending}
                onSend={handleSend}
              />
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              message="Awaiting Administrative Initiation"
              description="This record has not been sent for approval yet. An Administrator will configure approver assignments and send this record for approval."
              style={{ borderRadius: 10, marginTop: 8 }}
            />
          )
        )}

        {/* Stage 3+: Instance active */}
        {instance && (
          <>
            {/* Status: APPROVED alert */}
            {instance.status === "APPROVED" && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleFilled />}
                className="fap-alert-approved"
                message={
                  <span className="fap-alert-approved-text">
                    Fully Approved — all {steps.length} step(s) completed ✓
                  </span>
                }
              />
            )}

            {/* Status: REJECTED or RESEND alert card */}
            <RejectionAlertCard
              instance={instance}
              currentStep={currentStep}
              isResend={isResend}
              isInitiator={isInitiator}
              onOpenEdit={onOpenEdit}
              reopening={reopening}
              onReopen={handleReopen}
              sending={sending}
              onOpenResendModal={() => {
                setResendRemarks("");
                setResendRemarksErr("");
                setResendModalVisible(true);
              }}
            />

            {/* Routing & Approver Assignment info box + Pull Back */}
            {!isFinished && (
              <RoutingApproverInfo
                instance={instance}
                steps={steps}
                currentStep={currentStep}
                prevStepNum={prevStepNum}
                canPullBack={canPullBack}
                onOpenPullBackModal={handleOpenPullBackModal}
              />
            )}

            {/* Action panel for logged-in current approver */}
            {!isFinished && isCurrentApprover && (
              <ApproverActionPanel
                steps={steps}
                instance={instance}
                currentStep={currentStep}
                actionRemarks={actionRemarks}
                setActionRemarks={setActionRemarks}
                actionRemarksErr={actionRemarksErr}
                setActionRemarksErr={setActionRemarksErr}
                actioning={actioning}
                onAction={handleAction}
              />
            )}
          </>
        )}

        {/* Approval Process Track (Audit History Timeline) */}
        <Divider className="fap-divider-stage2" />
        <Collapse
          ghost
          defaultActiveKey={["approval_track"]}
          className="fap-collapse-track"
          items={[
            {
              key: "approval_track",
              label: (
                <div className="fap-collapse-title-row">
                  <AuditOutlined className="fap-modal-header-icon" />
                  <span className="fap-collapse-title-text">
                    Approval Process Track
                  </span>
                  <Tag color="purple" className="fap-collapse-tag">
                    {approvalTrack.length} record{approvalTrack.length !== 1 ? "s" : ""}
                  </Tag>
                </div>
              ),
              children: <ApprovalProcessTrackView trackList={approvalTrack} />,
            },
          ]}
        />
      </div>
    </Card>
  );
}
