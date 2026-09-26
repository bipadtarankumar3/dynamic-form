// client/src/services/volunteering-service.js
// ============================================================
// Dynamic Employee Volunteering Service
// Full API client for Programs, Events, Approvals, Attendance,
// Form Submissions, and Employee Portal Self-Service.
// ============================================================

import { privateHttpClient } from "@/services/api/httpClient";

const BASE = "volunteering";

// ------------------------------------------------------------
// 1. PROGRAMS API
// ------------------------------------------------------------
export const getVolunteeringProgramsAPI = async (params = {}) => {
  return await privateHttpClient.get(`${BASE}/programs`, { params });
};

export const getVolunteeringProgramByIdAPI = async (id) => {
  return await privateHttpClient.get(`${BASE}/programs/${id}`);
};

export const createVolunteeringProgramAPI = async (payload) => {
  return await privateHttpClient.post(`${BASE}/programs`, payload);
};

export const updateVolunteeringProgramAPI = async (id, payload) => {
  return await privateHttpClient.put(`${BASE}/programs/${id}`, payload);
};

export const deleteVolunteeringProgramAPI = async (id) => {
  return await privateHttpClient.delete(`${BASE}/programs/${id}`);
};

// ------------------------------------------------------------
// 2. EVENTS API
// ------------------------------------------------------------
export const getVolunteeringEventsAPI = async (params = {}) => {
  return await privateHttpClient.get(`${BASE}/events`, { params });
};

export const getVolunteeringEventByIdAPI = async (id) => {
  return await privateHttpClient.get(`${BASE}/events/${id}`);
};

export const createVolunteeringEventAPI = async (payload) => {
  return await privateHttpClient.post(`${BASE}/events`, payload);
};

export const updateVolunteeringEventAPI = async (id, payload) => {
  return await privateHttpClient.put(`${BASE}/events/${id}`, payload);
};

export const deleteVolunteeringEventAPI = async (id) => {
  return await privateHttpClient.delete(`${BASE}/events/${id}`);
};

// Lifecycle Actions
export const submitEventForApprovalAPI = async (id) => {
  return await privateHttpClient.post(`${BASE}/events/${id}/submit-approval`);
};

export const publishVolunteeringEventAPI = async (id) => {
  return await privateHttpClient.post(`${BASE}/events/${id}/publish`);
};

export const saveEventClosureAPI = async (id, payload) => {
  return await privateHttpClient.post(`${BASE}/events/${id}/closure`, payload);
};

export const saveEventStoryAPI = async (id, payload) => {
  return await privateHttpClient.post(`${BASE}/events/${id}/story`, payload);
};

// ------------------------------------------------------------
// 3. VOLUNTEERS & ATTENDANCE API
// ------------------------------------------------------------
export const getEventVolunteersAPI = async (id) => {
  return await privateHttpClient.get(`${BASE}/events/${id}/volunteers`);
};

export const updateVolunteerAttendanceAPI = async (eventId, volunteerId, payload) => {
  return await privateHttpClient.put(`${BASE}/events/${eventId}/volunteers/${volunteerId}/attendance`, payload);
};

export const addWalkInVolunteerAPI = async (eventId, payload) => {
  return await privateHttpClient.post(`${BASE}/events/${eventId}/volunteers/walk-in`, payload);
};

// ------------------------------------------------------------
// 4. EMPLOYEE SELF-SERVICE PORTAL API
// ------------------------------------------------------------
export const getPortalEventsAPI = async (empId) => {
  return await privateHttpClient.get(`${BASE}/portal/events`, { params: { emp_id: empId } });
};

export const submitPortalRsvpAPI = async (payload) => {
  return await privateHttpClient.post(`${BASE}/portal/rsvp`, payload);
};

export const submitPortalFeedbackAPI = async (payload) => {
  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    return await privateHttpClient.post(`${BASE}/portal/feedback`, payload, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
  return await privateHttpClient.post(`${BASE}/portal/feedback`, payload);
};

// ------------------------------------------------------------
// 5. IMPACT STORIES API
// ------------------------------------------------------------
export const getVolunteeringStoriesAPI = async (params = {}) => {
  return await privateHttpClient.get(`${BASE}/stories`, { params });
};

export const getVolunteeringStoryByIdAPI = async (id) => {
  return await privateHttpClient.get(`${BASE}/stories/${id}`);
};

export const createOrUpdateVolunteeringStoryAPI = async (payload) => {
  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    const id = payload.get("id");
    if (id) {
      return await privateHttpClient.put(`${BASE}/stories/${id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    }
    return await privateHttpClient.post(`${BASE}/stories`, payload, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  }
  if (payload.id) {
    return await privateHttpClient.put(`${BASE}/stories/${payload.id}`, payload);
  }
  return await privateHttpClient.post(`${BASE}/stories`, payload);
};

export const toggleStoryLikeAPI = async (id) => {
  return await privateHttpClient.post(`${BASE}/stories/${id}/like`);
};

export const addStoryCommentAPI = async (id, payload) => {
  return await privateHttpClient.post(`${BASE}/stories/${id}/comments`, payload);
};

export const deleteStoryCommentAPI = async (commentId) => {
  return await privateHttpClient.delete(`${BASE}/stories/comments/${commentId}`);
};

export const deleteVolunteeringStoryAPI = async (id) => {
  return await privateHttpClient.delete(`${BASE}/stories/${id}`);
};

