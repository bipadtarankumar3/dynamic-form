"use client";
// client/src/modules/volunteering/VolunteeringStoryListView.jsx
// Enterprise Community Impact Stories Management Dashboard

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Popconfirm,
  message,
  Tooltip,
  Image,
  Switch,
  Tag,
  Space,
  Avatar,
} from "antd";
import {
  ReadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HeartFilled,
  MessageFilled,
  SearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShareAltOutlined,
  EyeOutlined,
  AppstoreOutlined,
  FireOutlined,
  UserOutlined,
  FileTextOutlined,
  TagOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import {
  getVolunteeringStoriesAPI,
  deleteVolunteeringStoryAPI,
  createOrUpdateVolunteeringStoryAPI,
} from "@/services/volunteering-service";
import VolunteeringStoryEditor from "./components/VolunteeringStoryEditor";
import { hasModulePermissions } from "@/context/PermissionContext";
import "@/modules/auth-management/permissions-page.css";

const resolveMediaUrl = (p) => {
  if (!p || typeof p !== "string") return "";
  const s = p.trim();
  if (s.startsWith("blob:") || s.startsWith("data:") || /^https?:\/\//i.test(s)) return s;
  const base = process.env.NEXT_PUBLIC_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:6003/api/v1";
  const cleanBase = base.replace(/\/api\/v1\/?$/, "");
  const cleanRel = s.replace(/^\/?(api\/v1\/static\/|uploads\/)?/, "");
  return `${cleanBase}/api/v1/static/${cleanRel}`;
};

export default function VolunteeringStoryListView() {
  const router = useRouter();
  const [messageApi, ctx] = message.useMessage();

  // ── Dynamic Permissions ─────────────────────────────────────
  const storyPermissions = hasModulePermissions("volunteering-impact-story");
  const canList = storyPermissions.includes("list") || storyPermissions.includes("view");
  const canAdd = storyPermissions.includes("add");
  const canEdit = storyPermissions.includes("edit");
  const canDelete = storyPermissions.includes("delete");

  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);

  // ── Fetch Stories ──────────────────────────────────────────
  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVolunteeringStoriesAPI({ all: true });
      if (res?.data?.data) {
        setStories(res.data.data);
      }
    } catch (err) {
      console.error("Fetch stories error:", err);
      messageApi.error("Failed to load community impact stories");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    if (canList) {
      fetchStories();
    }
  }, [canList, fetchStories]);

  if (!canList) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", background: "#f8fafc", minHeight: "80vh" }}>
        {ctx}
        <div style={{ maxWidth: 440, margin: "0 auto", background: "#fff", padding: "40px 32px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>
            <FileTextOutlined />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Access Restricted</h3>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            You do not have permission to view or manage Community Impact Stories. Please contact your CSR Administrator.
          </p>
          <Button type="primary" onClick={() => router.push("/admin/volunteering/portal")}>
            Go to Volunteering Hub
          </Button>
        </div>
      </div>
    );
  }

  // ── Delete Story ───────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await deleteVolunteeringStoryAPI(id);
      if (res?.data?.success) {
        messageApi.success("Impact story deleted successfully");
        setStories((prev) => prev.filter((s) => s.id !== id));
      } else {
        messageApi.error(res?.data?.message || "Failed to delete story");
      }
    } catch (err) {
      messageApi.error("Failed to delete impact story");
    }
  };

  // ── Toggle Publish Status ──────────────────────────────────
  const handleToggleStatus = async (record) => {
    const isCurrentlyPublished =
      (record.status || "").toLowerCase() === "published" ||
      (record.status || "").toLowerCase() === "submit";
    const nextStatus = isCurrentlyPublished ? "Draft" : "Published";

    try {
      await createOrUpdateVolunteeringStoryAPI({
        id: record.id,
        status: nextStatus,
      });
      messageApi.success(`Story ${nextStatus === "Published" ? "published live" : "moved to draft"}`);
      setStories((prev) =>
        prev.map((s) => (s.id === record.id ? { ...s, status: nextStatus } : s))
      );
    } catch (err) {
      messageApi.error("Failed to update story status");
    }
  };

  // ── Copy Link ──────────────────────────────────────────────
  const handleCopyLink = (storyId) => {
    const url = `${window.location.origin}/techcsr/admin/event/volunteering-impact-story/${storyId}`;
    navigator.clipboard.writeText(url);
    messageApi.success("Story share link copied to clipboard! 📋");
  };

  // ── Metrics Calculation ────────────────────────────────────
  const metrics = useMemo(() => {
    const totalStories = stories.length;
    const published = stories.filter(
      (s) =>
        (s.status || "").toLowerCase() === "published" ||
        (s.status || "").toLowerCase() === "submit"
    ).length;
    const drafts = totalStories - published;
    const totalLikes = stories.reduce((acc, s) => acc + (Number(s.like_count) || 0), 0);
    const totalComments = stories.reduce((acc, s) => acc + (Number(s.comment_count) || 0), 0);
    const totalEngagement = totalLikes + totalComments;
    return { totalStories, published, drafts, totalLikes, totalComments, totalEngagement };
  }, [stories]);

  // ── Filtered Stories ───────────────────────────────────────
  const filteredStories = useMemo(() => {
    return stories.filter((s) => {
      const q = searchText.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.story_title && s.story_title.toLowerCase().includes(q)) ||
        (s.author_name && s.author_name.toLowerCase().includes(q)) ||
        (s.author_role && s.author_role.toLowerCase().includes(q)) ||
        (s.event_name && s.event_name.toLowerCase().includes(q)) ||
        (s.event_display_title && s.event_display_title.toLowerCase().includes(q)) ||
        (s.event_category && s.event_category.toLowerCase().includes(q));

      const sStatus = (s.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "PUBLISHED") {
        matchesStatus = sStatus === "published" || sStatus === "submit";
      } else if (statusFilter === "DRAFT") {
        matchesStatus = sStatus === "draft";
      }

      return matchesSearch && matchesStatus;
    });
  }, [stories, searchText, statusFilter]);

  // ── Table Columns ──────────────────────────────────────────
  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      align: "center",
      sorter: (a, b) => ((a.id || 0) > (b.id || 0) ? 1 : -1),
      render: (_, __, idx) => <span className="conf-index-badge">{idx + 1}</span>,
    },
    {
      title: "Story Profile & Headline",
      dataIndex: "story_title",
      key: "story_title",
      width: 320,
      sorter: (a, b) => (a.story_title || "").localeCompare(b.story_title || ""),
      render: (title, record) => {
        const coverSrc = resolveMediaUrl(record.cover_image);
        const authorInit = (record.author_name || record.story_title || "S")[0].toUpperCase();

        return (
          <div className="ap-wf-identity" style={{ alignItems: "flex-start" }}>
            {coverSrc ? (
              <div
                style={{
                  width: 52,
                  height: 48,
                  borderRadius: 10,
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "1.5px solid #e2e8f0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                }}
              >
                <img
                  src={coverSrc}
                  alt={title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            ) : (
              <div
                className="ap-wf-avatar"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                  boxShadow: "0 3px 10px rgba(124, 58, 237, 0.25)",
                  fontWeight: 800,
                  fontSize: 15,
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                }}
              >
                {authorInit}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                onClick={() => router.push(`/admin/event/volunteering-impact-story/${record.id}`)}
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  lineHeight: 1.35,
                  marginBottom: 3,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#7c3aed")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#0f172a")}
              >
                {title || `Impact Story #${record.id}`}
              </div>

              {record.excerpt && (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "11.5px",
                    lineHeight: 1.35,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    marginBottom: 3,
                  }}
                >
                  {record.excerpt}
                </div>
              )}

              <div style={{ color: "#94a3b8", fontSize: "11px", display: "flex", alignItems: "center", gap: 4 }}>
                <UserOutlined style={{ fontSize: 10, color: "#a855f7" }} />
                <span>
                  {record.author_name || "CSR Storyteller"}
                  {record.author_role ? ` • ${record.author_role}` : ""}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Event & Theme",
      dataIndex: "event_name",
      key: "event_name",
      width: 220,
      sorter: (a, b) =>
        (a.event_name || a.event_display_title || "").localeCompare(
          b.event_name || b.event_display_title || ""
        ),
      render: (evtName, record) => {
        const displayEvent = evtName || record.event_display_title;
        return (
          <div>
            {displayEvent ? (
              <span
                className="conf-badge-master-yes"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#f5f3ff",
                  color: "#7c3aed",
                  border: "1px solid #ddd6fe",
                  fontWeight: 600,
                  fontSize: "12px",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <CalendarOutlined style={{ fontSize: 11 }} />
                {displayEvent}
              </span>
            ) : (
              <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "12px" }}>
                Independent Story
              </span>
            )}

            {record.event_category && (
              <div style={{ marginTop: 4 }}>
                <span
                  className="conf-slug-code"
                  style={{
                    fontSize: "10.5px",
                    padding: "1px 7px",
                    background: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  {record.event_category}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Community Engagement",
      key: "engagement",
      width: 170,
      align: "center",
      sorter: (a, b) =>
        ((Number(a.like_count) || 0) + (Number(a.comment_count) || 0)) -
        ((Number(b.like_count) || 0) + (Number(b.comment_count) || 0)),
      render: (_, record) => (
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 20,
              fontSize: "11.5px",
              fontWeight: 700,
              background: "#fff1f2",
              color: "#e11d48",
              border: "1px solid #fecdd3",
            }}
          >
            <HeartFilled style={{ fontSize: 11 }} />
            {record.like_count || 0}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 20,
              fontSize: "11.5px",
              fontWeight: 700,
              background: "#f5f3ff",
              color: "#7c3aed",
              border: "1px solid #ddd6fe",
            }}
          >
            <MessageFilled style={{ fontSize: 11 }} />
            {record.comment_count || 0}
          </span>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      align: "center",
      sorter: (a, b) => {
        const aPub = (a.status || "").toLowerCase() === "published" || (a.status || "").toLowerCase() === "submit";
        const bPub = (b.status || "").toLowerCase() === "published" || (b.status || "").toLowerCase() === "submit";
        return (aPub ? 1 : 0) - (bPub ? 1 : 0);
      },
      render: (v, record) => {
        const isPublished =
          (record.status || "").toLowerCase() === "published" ||
          (record.status || "").toLowerCase() === "submit";

        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {canEdit && (
              <Tooltip title={isPublished ? "Click to set story to Draft" : "Click to Publish story live"}>
                <Switch
                  size="small"
                  checked={isPublished}
                  onChange={() => handleToggleStatus(record)}
                  style={{ backgroundColor: isPublished ? "#16a34a" : "#cbd5e1" }}
                />
              </Tooltip>
            )}
            <span className={isPublished ? "conf-badge-published" : "conf-badge-draft"}>
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Published At",
      dataIndex: "published_at",
      key: "published_at",
      width: 130,
      align: "center",
      sorter: (a, b) =>
        new Date(a.published_at || a.created_at || 0) -
        new Date(b.published_at || b.created_at || 0),
      render: (date, record) => {
        const effectiveDate = date || record.created_at;
        return (
          <span style={{ color: "#64748b", fontSize: "13px" }}>
            {effectiveDate
              ? new Date(effectiveDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })
              : "—"}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      align: "center",
      onHeaderCell: () => ({
        className: "ap-actions-header-cell",
      }),
      render: (_, record) => (
        <div className="db-views-action-btns">
          <Tooltip title="View Live Story" color="#7c3aed">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/admin/event/volunteering-impact-story/${record.id}`)}
              className="conf-action-outline-btn"
              style={{
                background: "#f5f3ff",
                border: "1px solid #ddd6fe",
                color: "#7c3aed",
              }}
            />
          </Tooltip>

          {canEdit && (
            <Tooltip title="Edit Impact Story" color="#3b82f6">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingStory(record);
                  setIsEditorOpen(true);
                }}
                className="conf-action-outline-btn conf-action-edit-view-btn"
              />
            </Tooltip>
          )}

          <Tooltip title="Copy Share Link" color="#059669">
            <Button
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => handleCopyLink(record.id)}
              className="conf-action-outline-btn"
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#059669",
              }}
            />
          </Tooltip>

          {canDelete && (
            <Popconfirm
              title="Delete Impact Story"
              description="Are you sure you want to delete this impact story?"
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true, style: { borderRadius: 6 } }}
              cancelButtonProps={{ style: { borderRadius: 6 } }}
            >
              <Tooltip title="Delete Story" color="#dc2626">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  className="conf-action-delete-btn"
                  style={{
                    background: "#ffffff",
                    border: "1px solid rgba(239, 68, 68, 0.6)",
                    color: "#dc2626",
                  }}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  if (!canList) {
    return (
      <div className="perm-page-container" style={{ textAlign: "center", padding: "60px 24px" }}>
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "#ffffff",
            padding: "40px",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fef2f2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              margin: "0 auto 16px auto",
            }}
          >
            <ReadOutlined />
          </div>
          <h2 style={{ color: "#0f172a", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
            Access Denied
          </h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            You do not have permission to view the Community Impact Stories management table.
          </p>
          <Button
            type="primary"
            onClick={() => router.push("/admin/volunteering/feed")}
            style={{
              background: "#7c3aed",
              borderColor: "#7c3aed",
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            Go to Impact Story Feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="perm-page-container">
      {ctx}

      {/* ── 1. PAGE HEADER ── */}
      <div className="perm-page-header">
        <div className="perm-page-header-left">
          <div
            className="perm-page-header-icon"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 6px 16px rgba(124, 58, 237, 0.3)",
            }}
          >
            <ReadOutlined />
          </div>
          <div>
            <h1 className="perm-page-title">Community Impact Stories</h1>
            <p className="perm-page-subtitle">
              Curate, publish, and track employee volunteering impact stories, reflections, and social engagement.
            </p>
          </div>
        </div>

        <div className="perm-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchStories}
            loading={loading}
            className="perm-btn-refresh"
          >
            Refresh
          </Button>

          {canAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingStory(null);
                setIsEditorOpen(true);
              }}
              className="perm-btn-create"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.25)",
              }}
            >
              Add Story
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. KPI STATS CARDS ── */}
      <div className="perm-stats-grid">
        <div className="perm-stat-card perm-stat-card--blue">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Total Stories</span>
            <span className="perm-stat-val">{metrics.totalStories}</span>
            <span className="perm-stat-sub">
              <ReadOutlined /> All Created Stories
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <ReadOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--green">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Published Stories</span>
            <span className="perm-stat-val">{metrics.published}</span>
            <span className="perm-stat-sub">
              <CheckCircleOutlined /> Live in Community Feed
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <CheckCircleOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--orange">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Draft Stories</span>
            <span className="perm-stat-val">{metrics.drafts}</span>
            <span className="perm-stat-sub">
              <ClockCircleOutlined /> Unpublished Drafts
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <ClockCircleOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--purple">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Social Engagement</span>
            <span className="perm-stat-val">{metrics.totalEngagement}</span>
            <span className="perm-stat-sub">
              <HeartFilled /> {metrics.totalLikes} Likes • {metrics.totalComments} Reflections
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <HeartFilled />
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
      <div className="perm-toolbar">
        <div className="perm-toolbar-left">
          <div className="perm-tab-track">
            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--all ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              <span className="perm-pill-icon"><AppstoreOutlined /></span>
              <span>All Stories</span>
              <span className="perm-pill-count">{metrics.totalStories}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--active ${statusFilter === "PUBLISHED" ? "active" : ""}`}
              onClick={() => setStatusFilter("PUBLISHED")}
            >
              <span className="perm-pill-icon"><CheckCircleOutlined /></span>
              <span>Published</span>
              <span className="perm-pill-count">{metrics.published}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--inactive ${statusFilter === "DRAFT" ? "active" : ""}`}
              onClick={() => setStatusFilter("DRAFT")}
            >
              <span className="perm-pill-icon"><ClockCircleOutlined /></span>
              <span>Drafts</span>
              <span className="perm-pill-count">{metrics.drafts}</span>
            </button>

            <button
              type="button"
              className="perm-pill-tab perm-pill-tab--config"
              onClick={() => router.push("/admin/volunteering/feed")}
              title="Open full page social feed view"
            >
              <span className="perm-pill-icon"><FireOutlined style={{ color: "#ea580c" }} /></span>
              <span>Social Feed</span>
            </button>
          </div>
        </div>

        <div className="perm-toolbar-right">
          <Input
            className="perm-search-input"
            placeholder="Search headline, author, event, or theme..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* ── 4. STORIES TABLE ── */}
      <div className="ap-card-table conf-card-table perm-card-table">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredStories}
          columns={columns}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total, range) => (
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Showing {range[0]} - {range[1]} of {total} stories
              </span>
            ),
          }}
          className="ap-custom-table"
        />
      </div>

      {/* ── 5. FULL-PAGE STORY STUDIO MODAL (FormsBuilder Experience) ── */}
      <Modal
        open={isEditorOpen}
        onCancel={() => {
          setIsEditorOpen(false);
          setEditingStory(null);
        }}
        footer={null}
        width="100vw"
        destroyOnHidden
        closeIcon={null}
        wrapClassName="story-studio-fullscreen-modal"
        style={{ top: 0, left: 0, maxWidth: "100vw", width: "100vw", margin: 0, padding: 0 }}
        styles={{
          body: {
            padding: 0,
            height: "100vh",
            maxHeight: "100vh",
            overflow: "hidden",
            background: "#f8fafc",
          },
          content: {
            padding: 0,
            borderRadius: 0,
            height: "100vh",
            maxHeight: "100vh",
            overflow: "hidden",
            boxShadow: "none",
          },
        }}
      >
        <VolunteeringStoryEditor
          storyData={editingStory}
          onSuccess={() => {
            setIsEditorOpen(false);
            setEditingStory(null);
            fetchStories();
          }}
          onCancel={() => {
            setIsEditorOpen(false);
            setEditingStory(null);
          }}
          isModal={true}
        />
      </Modal>
    </div>
  );
}
