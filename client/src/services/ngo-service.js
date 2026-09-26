// client/src/services/ngo-service.js
// ============================================================
// NGO & RFP Service Layer
// Centralized API calls for Open RFPs, Closed RFPs, Proposals, & Projects
// ============================================================

import { privateHttpClient } from "@/services/api/httpClient";

const BASE = "ngo";

/**
 * Fetch Open RFP opportunities
 * @param {Object} params - { page, limit, search, status_filter, form_slug }
 */
export const getOpenRfpsAPI = async (params = {}) => {
  return await privateHttpClient.get(`${BASE}/open-rfp`, { params });
};

/**
 * Fetch Closed RFPs & Submissions
 * @param {Object} params - { page, limit, search, status_filter, form_slug }
 */
export const getClosedRfpsAPI = async (params = {}) => {
  return await privateHttpClient.get(`${BASE}/closed-rfp`, { params });
};

/**
 * Fetch My Submitted Proposal & Evaluation Feedback for a given RFP
 * @param {string|number} rfpId
 */
export const getMyProposalAPI = async (rfpId) => {
  return await privateHttpClient.get(`${BASE}/my-proposal/${rfpId}`);
};

/**
 * Submit RFP Proposal
 * @param {Object} payload
 */
export const submitRfpProposalAPI = async (payload) => {
  return await privateHttpClient.post(`${BASE}/submit-proposal`, payload);
};

/**
 * Float RFP to selected NGOs (Admin action)
 * @param {Object} payload
 */
export const floatRfpAPI = async (payload) => {
  return await privateHttpClient.post(`${BASE}/float`, payload);
};

/**
 * Save NGO Evaluation & Rating
 * @param {Object} payload
 */
export const saveNgoEvaluationAPI = async (payload) => {
  return await privateHttpClient.post(`${BASE}/evaluation/rate`, payload);
};

/**
 * Fetch Dedicated NGO Projects list
 * @param {Object} params
 */
export const getNgoProjectsAPI = async (params = {}) => {
  return await privateHttpClient.get(`${BASE}/projects`, { params });
};

/**
 * Fetch NGO Profile Status for logged-in user
 */
export const getNgoProfileStatusAPI = async () => {
  return await privateHttpClient.get(`${BASE}/profile-status`);
};

/**
 * Fetch NGO Profile details
 */
export const getNgoProfileAPI = async () => {
  return await privateHttpClient.get(`${BASE}/profile`);
};

/**
 * Fetch NGO Due Diligence details
 */
export const getNgoDueDiligenceAPI = async () => {
  return await privateHttpClient.get(`${BASE}/due-diligence`);
};
