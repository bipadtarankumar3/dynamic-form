import React from "react";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  RollbackOutlined,
  ReloadOutlined,
  UndoOutlined,
  SendOutlined,
} from "@ant-design/icons";

export const ROLE_COLORS = ["#6366f1", "#0284c7", "#16a34a", "#d97706", "#9333ea", "#dc2626"];
export const roleColor = (idx) => ROLE_COLORS[idx % ROLE_COLORS.length];

export function getInitials(name = "") {
  return (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function getStatusMeta(status = "") {
  const s = String(status).toUpperCase();
  if (s === "APPROVED") return { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Approved" };
  if (s === "REJECTED") return { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Rejected" };
  if (s === "RESEND" || s === "CHANGES_REQUESTED") return { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", label: "Changes Requested" };
  return { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Pending" };
}

export function getTrackStatusConfig(item) {
  const statusStr = String(item.apt_accept_status || "").toUpperCase();
  const flagStr = String(item.apt_status_flag || "").toUpperCase();

  // 1. Rejected
  if (statusStr.includes("REJECT") || flagStr === "REJECT" || flagStr === "REJECTED") {
    return {
      theme: "rejected",
      icon: <CloseCircleFilled style={{ color: "#dc2626" }} />,
      tagLabel: item.apt_accept_status || "Rejected",
      tagBg: "#fef2f2",
      tagText: "#dc2626",
      tagBorder: "#fca5a5",
      bgGradient: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
      borderColor: "#fecaca",
      accentBar: "#dc2626",
      chipColor: "#dc2626",
    };
  }

  // 2. Approved / Forwarded / Passed
  if (
    statusStr.includes("APPROV") ||
    statusStr.includes("FORWARD") ||
    statusStr.includes("REVIEW") ||
    flagStr === "APPROVED" ||
    flagStr === "FORWARD"
  ) {
    return {
      theme: "approved",
      icon: <CheckCircleFilled style={{ color: "#16a34a" }} />,
      tagLabel: item.apt_accept_status || "Approved",
      tagBg: "#f0fdf4",
      tagText: "#16a34a",
      tagBorder: "#86efac",
      bgGradient: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
      borderColor: "#bbf7d0",
      accentBar: "#16a34a",
      chipColor: "#16a34a",
    };
  }

  // 3. Resend / Changes Requested
  if (
    statusStr.includes("RESEND") ||
    statusStr.includes("CHANGES") ||
    statusStr.includes("REQUEST") ||
    flagStr === "RESENT" ||
    flagStr === "RESEND" ||
    flagStr === "REQUEST_INFO"
  ) {
    return {
      theme: "resend",
      icon: <RollbackOutlined style={{ color: "#ea580c" }} />,
      tagLabel: item.apt_accept_status || "Changes Requested",
      tagBg: "#fff7ed",
      tagText: "#ea580c",
      tagBorder: "#fdba74",
      bgGradient: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
      borderColor: "#fed7aa",
      accentBar: "#ea580c",
      chipColor: "#ea580c",
    };
  }

  // 4. Re-opened
  if (statusStr.includes("REOPEN") || flagStr === "REOPENED" || flagStr === "RESET") {
    return {
      theme: "reopened",
      icon: <ReloadOutlined style={{ color: "#9333ea" }} />,
      tagLabel: item.apt_accept_status || "Re-opened",
      tagBg: "#faf5ff",
      tagText: "#9333ea",
      tagBorder: "#d8b4fe",
      bgGradient: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
      borderColor: "#e9d5ff",
      accentBar: "#9333ea",
      chipColor: "#9333ea",
    };
  }

  // 5. Pulled Back
  if (statusStr.includes("PULL") || flagStr === "PULL_BACK") {
    return {
      theme: "pulled_back",
      icon: <UndoOutlined style={{ color: "#b45309" }} />,
      tagLabel: item.apt_accept_status || "Pulled Back",
      tagBg: "#fffbeb",
      tagText: "#b45309",
      tagBorder: "#fde68a",
      bgGradient: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
      borderColor: "#fde68a",
      accentBar: "#d97706",
      chipColor: "#b45309",
    };
  }

  // 6. Initiated / Initial Send
  return {
    theme: "initiated",
    icon: <SendOutlined style={{ color: "#0284c7" }} />,
    tagLabel: item.apt_accept_status || (flagStr === "INITIATED" ? "Initiated / Sent" : "Pending Approval"),
    tagBg: "#f0f9ff",
    tagText: "#0284c7",
    tagBorder: "#7dd3fc",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
    borderColor: "#bae6fd",
    accentBar: "#0284c7",
    chipColor: "#0284c7",
  };
}
