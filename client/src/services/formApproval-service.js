// client/src/services/formApproval-service.js
import { privateHttpClient } from "@/services/api/httpClient";

const BASE = "form-approval";

/** Full state: workflow config + saved assignments + active instance */
export const getFormApprovalWorkflow = (form_slug, record_id) =>
  privateHttpClient.get(`${BASE}/workflow`, { params: { form_slug, record_id } });

/** Active users for a given role (for approver selector) */
export const getUsersByRole = (roleId) =>
  privateHttpClient.get(`${BASE}/users-by-role/${roleId}`);

/** Stage 1: Save approver picks to t_workflow_instances as DRAFT (no active approval yet) */
export const saveApprovalAssignments = (payload) =>
  privateHttpClient.post(`${BASE}/save-assignments`, payload);

/** Stage 2: Send for approval — reads saved assignments from DB, creates instance + notifications */
export const sendForApproval = (payload) =>
  privateHttpClient.post(`${BASE}/send`, payload);

/** Resend for approval after rejection */
export const resendForApproval = (payload) =>
  privateHttpClient.post(`${BASE}/resend`, payload);

/** Re-open workflow (resets to DRAFT for editing) */
export const reopenWorkflow = (payload) =>
  privateHttpClient.post(`${BASE}/reopen`, payload);

/** Pull back / recall step before next approver acts */
export const pullBackWorkflow = (payload) =>
  privateHttpClient.post(`${BASE}/pull-back`, payload);

/** Approve or Reject current step */
export const performApprovalAction = (payload) =>
  privateHttpClient.post(`${BASE}/action`, payload);

/** Full history timeline */
export const getApprovalHistory = (form_slug, record_id) =>
  privateHttpClient.get(`${BASE}/history`, { params: { form_slug, record_id } });

