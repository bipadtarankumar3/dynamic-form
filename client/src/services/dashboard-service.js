import { privateHttpClient } from "@/services/api/httpClient";

export const getDashboardCountsAPI = async (payload) => {
  return await privateHttpClient.post("dash/counts", payload);
};

export const getProposalCountThemeWiseAPI = async (payload) => {
  return await privateHttpClient.post(
    "dash/proposal-count-theme-wise",
    payload,
  );
};

export const getProjectCountThemeWiseAPI = async (payload) => {
  return await privateHttpClient.post(
    "dash/project-count-theme-wise",
    payload,
  );
};
export const getBudgetDetailsAPI = async (payload) => {
  return await privateHttpClient.post(
    "dash/budget-details",
    payload,
  );
};

export const getUtilizationThemeWiseAPI = async (payload) => {
  return await privateHttpClient.post(
    "dash/utilization-theme-wise",
    payload,
  );
};