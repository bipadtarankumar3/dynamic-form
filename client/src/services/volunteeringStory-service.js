// client/src/services/volunteeringStory-service.js
import { privateHttpClient } from "@/services/api/httpClient";

const BASE = "volunteering/stories";

export const getVolunteeringStoriesAPI = async (params = {}) => {
  return await privateHttpClient.get(BASE, { params });
};

export const getVolunteeringStoryByIdAPI = async (id) => {
  return await privateHttpClient.get(`${BASE}/${id}`);
};

export const createOrUpdateVolunteeringStoryAPI = async (payload) => {
  if (payload instanceof FormData) {
    const id = payload.get("id");
    if (id) {
      return await privateHttpClient.put(`${BASE}/${id}`, payload);
    }
    return await privateHttpClient.post(BASE, payload);
  }
  if (payload.id) {
    return await privateHttpClient.put(`${BASE}/${payload.id}`, payload);
  }
  return await privateHttpClient.post(BASE, payload);
};

export const toggleStoryLikeAPI = async (id) => {
  return await privateHttpClient.post(`${BASE}/${id}/like`);
};

export const addStoryCommentAPI = async (id, payload) => {
  return await privateHttpClient.post(`${BASE}/${id}/comments`, payload);
};

export const deleteStoryCommentAPI = async (commentId) => {
  return await privateHttpClient.delete(`${BASE}/comments/${commentId}`);
};
