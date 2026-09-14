'use client';

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Popconfirm, Spin, Tooltip, message, Empty } from "antd";
import {
  CheckOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  BellOutlined,
} from "@ant-design/icons";
import {
  FaCheck,
  FaChartLine,
  FaUserPlus,
  FaExclamation,
  FaDollarSign,
  FaBell,
  FaTrashAlt,
} from "react-icons/fa";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { deleteNotificationApi, markNotificationAsReadApi } from "@/services/notification-service";
import { fetchNotifications } from "@/store/slices/NotificationSlice";

dayjs.extend(relativeTime);

// Helper to get meta based on notification content
const getNotificationMeta = (item) => {
  const title = (item?.tntf_title || "").toLowerCase();
  const type = item?.type || "";

  if (type === "backup" || title.includes("backup") || title.includes("success")) {
    return {
      icon: <FaCheck style={{ fontSize: 15 }} />,
      bg: "#ecfdf5",
      color: "#10b981",
    };
  }
  if (type === "budget" || title.includes("budget") || title.includes("allocat")) {
    return {
      icon: <FaChartLine style={{ fontSize: 16 }} />,
      bg: "#fffbeb",
      color: "#f59e0b",
    };
  }
  if (type === "department" || title.includes("department") || title.includes("user") || title.includes("register")) {
    return {
      icon: <FaUserPlus style={{ fontSize: 16 }} />,
      bg: "#f5f3ff",
      color: "#8b5cf6",
    };
  }
  if (type === "security" || title.includes("security") || title.includes("policy") || title.includes("mfa") || title.includes("alert")) {
    return {
      icon: <FaExclamation style={{ fontSize: 16 }} />,
      bg: "#fef2f2",
      color: "#ef4444",
    };
  }
  if (type === "proposal" || title.includes("ngo") || title.includes("partner") || title.includes("approv") || title.includes("fund")) {
    return {
      icon: <FaDollarSign style={{ fontSize: 16 }} />,
      bg: "#faf5ff",
      color: "#a855f7",
    };
  }

  return {
    icon: <FaBell style={{ fontSize: 15 }} />,
    bg: "#f1f5f9",
    color: "#64748b",
  };
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const [msgApi, contextHolder] = message.useMessage();
  const { notifications, loading } = useSelector((state) => state.NotificationSlice);

  const [showOnlyRead, setShowOnlyRead] = useState(false);
  const [localList, setLocalList] = useState([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications());
    const handleRefresh = () => dispatch(fetchNotifications());
    window.addEventListener("refreshNotifications", handleRefresh);
    return () => window.removeEventListener("refreshNotifications", handleRefresh);
  }, [dispatch]);

  // Sync with real backend notifications
  useEffect(() => {
    if (Array.isArray(notifications)) {
      setLocalList(notifications);
    } else {
      setLocalList([]);
    }
  }, [notifications]);

  const unreadCount = localList.filter((n) => !n.tntf_is_read).length;
  const readCount = localList.filter((n) => n.tntf_is_read).length;
  const totalCount = localList.length;

  const filteredList = localList.filter((item) => {
    if (showOnlyRead) return Boolean(item.tntf_is_read);
    return !item.tntf_is_read;
  });

  const handleMarkAllAsRead = async () => {
    const unreadIds = localList.filter((n) => !n.tntf_is_read).map((n) => n.tntf_id).filter(Boolean);
    setLocalList((prev) =>
      prev.map((item) => ({ ...item, tntf_is_read: true }))
    );
    if (unreadIds.length > 0) {
      try {
        await markNotificationAsReadApi(unreadIds);
        dispatch(fetchNotifications());
      } catch (err) {
        console.error("Failed to mark all notifications as read:", err);
      }
    }
    msgApi.success("All notifications marked as read");
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const informaticIds = localList
        .filter((n) => n.tntf_is_informatic || n.tntf_is_deletable)
        .map((n) => n.tntf_id)
        .filter(Boolean);
      if (informaticIds.length > 0) {
        await deleteNotificationApi(informaticIds);
        dispatch(fetchNotifications());
        setLocalList((prev) => prev.filter((n) => !(n.tntf_is_informatic || n.tntf_is_deletable)));
        msgApi.success("Informational notifications cleared");
      } else {
        msgApi.info("No informatic notifications to clear");
      }
    } catch {
      msgApi.error("Failed to clear notifications");
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteItem = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      if (id) {
        await deleteNotificationApi([id]);
        dispatch(fetchNotifications());
      }
      setLocalList((prev) => prev.filter((item) => item.tntf_id !== id));
      msgApi.success("Notification deleted");
    } catch {
      setLocalList((prev) => prev.filter((item) => item.tntf_id !== id));
      msgApi.success("Notification deleted");
    }
  };

  const handleCardClick = async (item) => {
    // ONLY informatic notifications can be marked as read manually or on click.
    // Actionable workflow notifications (approvals, reviews, resends) remain unread until the user takes the step on the form.
    if (item?.tntf_is_informatic || item?.tntf_is_deletable) {
      setLocalList((prev) =>
        prev.map((n) => (n.tntf_id === item.tntf_id ? { ...n, tntf_is_read: true } : n))
      );
      if (item?.tntf_id && !item.tntf_is_read) {
        try {
          await markNotificationAsReadApi([item.tntf_id]);
          dispatch(fetchNotifications());
        } catch (err) {
          console.error("Failed to mark notification as read:", err);
        }
      }
    }

    if (item?.tntf_redirect_url) {
      window.open(`${process.env.NEXT_PUBLIC_BASE_URL}${item.tntf_redirect_url}`, "_blank");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        padding: "32px 40px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {contextHolder}

      <div>
        {/* Header section */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
              }}
            >
              Notifications
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                margin: "8px 0 0 0",
              }}
            >
              {showOnlyRead ? (
                <>
                  Showing{" "}
                  <span style={{ color: "#059669", fontWeight: 700 }}>
                    {readCount} read
                  </span>{" "}
                  notification{readCount === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  You have{" "}
                  <span style={{ color: "#2563eb", fontWeight: 700 }}>
                    {unreadCount} unread
                  </span>{" "}
                  alert{unreadCount === 1 ? "" : "s"} out of {totalCount} total
                </>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Toggle button: Show All Read / Show Unread */}
            <button
              type="button"
              onClick={() => setShowOnlyRead((prev) => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                color: showOnlyRead ? "#2563eb" : "#334155",
                backgroundColor: showOnlyRead ? "#eff6ff" : "#ffffff",
                border: showOnlyRead ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = showOnlyRead ? "#dbeafe" : "#f8fafc";
                e.currentTarget.style.borderColor = showOnlyRead ? "#2563eb" : "#94a3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = showOnlyRead ? "#eff6ff" : "#ffffff";
                e.currentTarget.style.borderColor = showOnlyRead ? "#3b82f6" : "#cbd5e1";
              }}
            >
              {showOnlyRead ? (
                <>
                  <BellOutlined style={{ fontSize: 13, color: "#2563eb" }} />
                  Show Unread ({unreadCount})
                </>
              ) : (
                <>
                  <CheckOutlined style={{ fontSize: 13, color: "#10b981" }} />
                  Show All Read ({readCount})
                </>
              )}
            </button>

            <Popconfirm
              title="Clear all notifications?"
              description="Are you sure you want to remove all notifications?"
              onConfirm={handleClearAll}
              okText="Yes, Clear"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              disabled={totalCount === 0}
            >
              <button
                type="button"
                disabled={totalCount === 0 || isClearing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: totalCount === 0 ? "#94a3b8" : "#334155",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  cursor: totalCount === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
                }}
                onMouseEnter={(e) => {
                  if (totalCount > 0) {
                    e.currentTarget.style.backgroundColor = "#fef2f2";
                    e.currentTarget.style.borderColor = "#fca5a5";
                    e.currentTarget.style.color = "#ef4444";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.color = totalCount === 0 ? "#94a3b8" : "#334155";
                }}
              >
                <DeleteOutlined style={{ fontSize: 13 }} />
                Clear all
              </button>
            </Popconfirm>
          </div>
        </div>

        {/* Notifications list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading && localList.length === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "80px 0",
              }}
            >
              <Spin size="large" />
            </div>
          ) : filteredList.length === 0 ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "60px 20px",
                textAlign: "center",
              }}
            >
              <Empty
                description={
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "14px" }}>
                      {showOnlyRead ? "No read notifications found" : "No unread notifications — you're all caught up!"}
                    </span>
                    {!showOnlyRead && readCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowOnlyRead(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#2563eb",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "underline",
                          padding: 0,
                        }}
                      >
                        Show {readCount} read notification{readCount === 1 ? "" : "s"}
                      </button>
                    )}
                  </div>
                }
              />
            </div>
          ) : (
            filteredList.map((item) => {
              const meta = getNotificationMeta(item);
              const isUnread = !item.tntf_is_read;
              const timeText =
                item.display_time ||
                (item.tntf_created_at
                  ? dayjs(item.tntf_created_at).fromNow()
                  : "Just now");

              return (
                <div
                  key={item.tntf_id}
                  onClick={() => handleCardClick(item)}
                  style={{
                    position: "relative",
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    padding: "18px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 4px 14px rgba(0, 0, 0, 0.05)";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    const delBtn = e.currentTarget.querySelector(".notif-card-del-btn");
                    if (delBtn) delBtn.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(0, 0, 0, 0.02)";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    const delBtn = e.currentTarget.querySelector(".notif-card-del-btn");
                    if (delBtn) delBtn.style.opacity = "0";
                  }}
                >
                  {/* Curved Left Accent Bar for Unread Notifications */}
                  {isUnread && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "5px",
                        backgroundColor: "#2563eb",
                        borderTopLeftRadius: "16px",
                        borderBottomLeftRadius: "16px",
                      }}
                    />
                  )}

                  {/* Left Icon + Text section */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      flex: 1,
                      minWidth: 0,
                      paddingLeft: isUnread ? "4px" : "0px",
                    }}
                  >
                    {/* Icon Squircle Badge */}
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        backgroundColor: meta.bg,
                        color: meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Text info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#1e293b",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.tntf_title}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#64748b",
                          marginTop: "4px",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.tntf_message}
                      </div>
                    </div>
                  </div>

                  {/* Right Time info and delete action */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        color: "#94a3b8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <ClockCircleOutlined style={{ fontSize: 13 }} />
                      <span>{timeText}</span>
                    </div>

                    {/* Delete button (only rendered for informatic / deletable notifications) */}
                    {(item.tntf_is_informatic || item.tntf_is_deletable) ? (
                      <Popconfirm
                        title="Delete notification?"
                        onConfirm={(e) => handleDeleteItem(item.tntf_id, e)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true, size: "small" }}
                      >
                        <button
                          type="button"
                          className="notif-card-del-btn"
                          onClick={(e) => e.stopPropagation()}
                          title="Delete notification"
                          style={{
                            opacity: 0,
                            transition: "opacity 0.2s ease, background-color 0.2s ease",
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "transparent",
                            color: "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#fee2e2";
                            e.currentTarget.style.color = "#ef4444";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#94a3b8";
                          }}
                        >
                          <FaTrashAlt style={{ fontSize: 12 }} />
                        </button>
                      </Popconfirm>
                    ) : (
                      !item.tntf_is_read && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "12px",
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Action Pending
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
