import { privateHttpClient } from "@/services/api/httpClient";

export const getNotificationListApi = async () => {
  return await privateHttpClient.get("tntf/list");
};

export const deleteNotificationApi = async (ids) => {
  return await privateHttpClient.post(`tntf/delete`, {
    ids,
  });
};

export const markNotificationAsReadApi = async (ids) => {
  return await privateHttpClient.post(`tntf/read`, {
    ids,
  });
};
