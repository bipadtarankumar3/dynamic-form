import { privateHttpClient } from "@/services/api/httpClient";

export const getUserProfileAPI = async () => {
  return await privateHttpClient.get("/auth/profile");
};

export const updateUserProfileAPI = async (formData) => {
  return await privateHttpClient.put("/auth/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const changePasswordApi = async (payload) => {
  return await privateHttpClient.post("/auth/change-password", payload);
};

export const loginAsAPI = async (payload) => {
  return await privateHttpClient.post("user/login-as", payload);
};

export const resetPasswordAPI = async (payload) => {
  return await privateHttpClient.post("user/reset-password", payload);
};

