import axios from "axios";
import authUtils from "@/utils/authUtils";
import { toast } from "react-toastify";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_PUBLIC_API_URL || "";

const publicHttpClient = axios.create({
  baseURL: PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const privateHttpClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

privateHttpClient.interceptors.request.use((config) => {
  const token = authUtils.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

privateHttpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isPublicUrl = typeof window !== "undefined" && (
        window.location.pathname.includes("/public") ||
        window.location.search.includes("mode=form_only") ||
        window.location.search.includes("view=form") ||
        window.location.search.includes("form_only=true")
      );
      if (!isPublicUrl) {
        authUtils.removeToken();
        window.location.href = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/`;
      }
    } else if (
      error.response?.status === 403 &&
      error.response?.data?.code === "FORCE_PASSWORD_CHANGE"
    ) {
      // VAPT: Server is enforcing first-login password change.
      // Fire a custom event so the NGO layout shows the blocking modal
      // regardless of sessionStorage state.
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ngo_is_first_login", "1");
        window.dispatchEvent(new CustomEvent("ngo:force_password_change"));
      }
    } else if (error.response?.status === 500) {
      const data = error?.response?.data || {};
      const errorMessage = data.originalError || data.message;
      toast.error(errorMessage);
    }
    return Promise.reject(error);
  }
);

export { privateHttpClient, publicHttpClient };
