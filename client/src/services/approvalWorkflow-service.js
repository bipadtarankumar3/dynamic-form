import { privateHttpClient } from "@/services/api/httpClient";

export const workflowModuleListAPI = async (payload) => {
  return await privateHttpClient.get("approval-workflow/module-list", payload);
};
export const workflowListAPI = async (payload) => {
  return await privateHttpClient.get("approval-workflow/list", payload);
};

export const createWorkflowAPI = async (payload) => {
  return await privateHttpClient.post("approval-workflow/create", payload);
};

export const availableWorkflowActionsAPI = async (payload) => {
  return await privateHttpClient.post("approval-workflow/available-workflow-actions", payload);
};
export const viewWorkflowAPI = async (payload) => {
  return await privateHttpClient.post("approval-workflow/view-workflow", payload);
};

export const performWorkflowActionAPI = async (payload) => {
  return await privateHttpClient.post("approval-workflow/perform-workflow-action", payload);
};