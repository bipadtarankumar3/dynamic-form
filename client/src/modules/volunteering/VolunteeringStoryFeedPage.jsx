"use client";
// client/src/modules/volunteering/VolunteeringStoryFeedPage.jsx
// Premium Blog-Listing Layout: Editorial cards, generous padding, sticky sidebar

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Row,
  Col,
  Avatar,
  Tag,
  Button,
  Input,
  Spin,
  Empty,
  App,
  Dropdown,
  Modal,
  Tooltip,
} from "antd";
import {
  MessageOutlined,
  ShareAltOutlined,
  SearchOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  FireOutlined,
  EyeOutlined,
  BookOutlined,
  BookFilled,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  LikeOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  CompassOutlined,
  RightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";
import { getUser } from "@/context/AuthContext";
import { hasModulePermissions } from "@/context/PermissionContext";
import {
  getVolunteeringStoriesAPI,
  getVolunteeringEventsAPI,
  deleteVolunteeringStoryAPI,
} from "@/services/volunteering-service";
import VolunteeringStoryEditor from "./components/VolunteeringStoryEditor";
import "@/modules/auth-management/permissions-page.css";
import "./volunteering.css";

dayjs.extend(relativeTime);

const resolveMediaUrl = (p) => {
  if (!p || typeof p !== "string") return "";
  const s = p.trim();
  if (s.startsWith("blob:") || s.startsWith("data:") || /^https?:\/\//i.test(s)) return s;
  const base =
    process.env.NEXT_PUBLIC_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:6003/api/v1";
  const cleanBase = base.replace(/\/api\/v1\/?$/, "");
  const cleanRel = s.replace(/^\/?(api\/v1\/static\/|uploads\/)?/, "");
  return `${cleanBase}/api/v1/static/${cleanRel}`;
};

const SAVED_STORAGE_KEY = "techcsr_saved_volunteering_stories";

const CATEGORY_COLORS = {
  Education: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Environment: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  Health: { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  Community: { bg: "#fdf4ff", text: "#8B1D42", border: "#e9d5ff" },
  Animal: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  default: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
};

function getCategoryStyle(cat) {
  if (!cat) return CATEGORY_COLORS.default;
  const key = Object.keys(CATEGORY_COLORS).find((k) =>
    cat.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CATEGORY_COLORS[key] : CATEGORY_COLORS.default;
}

function SidebarWidget({ icon, title, badge, badgeColor = "#8B1D42", children }) {
  return (
    <div className="blog-sidebar-widget">
      <div className="blog-sidebar-widget-header">
        <span className="blog-sidebar-widget-title">
          {icon}
          {title}
        </span>
        {badge !== undefined && (
          <span
            className="blog-sidebar-badge"
            style={{ background: badgeColor + "18", color: badgeColor }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="blog-sidebar-widget-body">{children}</div>
    </div>
  );
}

export default function VolunteeringStoryFeedPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const currentUser = getUser() || {};

  const feedPermissions = hasModulePermissions("feed");
  const storyPermissions = hasModulePermissions("volunteering-impact-story");

  const allowedActions = useMemo(() => {
    return Array.from(new Set([...feedPermissions, ...storyPermissions]));
  }, [feedPermissions, storyPermissions]);

  const canView =
    allowedActions.includes("list") ||
    allowedActions.includes("view") ||
    allowedActions.length > 0;
  const canPost = allowedActions.includes("add");
  const canEdit = allowedActions.includes("edit");
  const canDelete = allowedActions.includes("delete");
  const canShare = allowedActions.includes("share");

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [savedStoryIds, setSavedStoryIds] = useState({});
  const [visibleCount, setVisibleCount] = useState(6);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_STORAGE_KEY);
      if (stored) setSavedStoryIds(JSON.parse(stored));
    } catch {}
  }, []);

  const handleToggleSave = (storyId, e) => {
    if (e) e.stopPropagation();
    setSavedStoryIds((prev) => {
      const next = { ...prev, [storyId]: !prev[storyId] };
      try {
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      message.success(next[storyId] ? "Story saved! 🔖" : "Removed from bookmarks");
      return next;
    });
  };

  const fetchFeedStories = async () => {
    try {
      setLoading(true);
      const [storyRes, evtRes] = await Promise.all([
        getVolunteeringStoriesAPI(),
        getVolunteeringEventsAPI().catch(() => ({ data: { data: [] } })),
      ]);
      if (storyRes?.data?.data) setStories(storyRes.data.data);
      if (evtRes?.data?.data) setEvents(evtRes.data.data);
    } catch (err) {
      message.error("Failed to load impact stories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) fetchFeedStories();
  }, [canView]);

  const handleDeleteStory = async (id) => {
    try {
      const res = await deleteVolunteeringStoryAPI(id);
      if (res?.data?.success) {
        message.success("Story deleted");
        setStories((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      message.error("Failed to delete story");
    }
  };

  const handleCopyLink = (storyId) => {
    const url = `${window.location.origin}/techcsr/admin/event/volunteering-impact-story/${storyId}`;
    navigator.clipboard.writeText(url);
    message.success("Link copied! 📋");
  };

  const filteredStories = useMemo(() => {
    let list = (stories || []).filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (s.story_title && s.story_title.toLowerCase().includes(q)) ||
        (s.author_name && s.author_name.toLowerCase().includes(q)) ||
        (s.excerpt && s.excerpt.toLowerCase().includes(q)) ||
        (s.story_content && s.story_content.toLowerCase().includes(q)) ||
        (s.event_name && s.event_name.toLowerCase().includes(q)) ||
        (s.event_category && s.event_category.toLowerCase().includes(q))
      );
    });
    if (activeFilterTab === "trending") {
      list = [...list].sort(
        (a, b) =>
          Number(b.like_count || 0) +
          Number(b.comment_count || 0) -
          (Number(a.like_count || 0) + Number(a.comment_count || 0))
      );
    } else if (activeFilterTab === "saved") {
      list = list.filter((s) => savedStoryIds[s.id]);
    }
    return list;
  }, [stories, searchQuery, activeFilterTab, savedStoryIds]);

  const trendingStories = useMemo(
    () =>
      [...stories]
        .sort((a, b) => {
          const scoreA =
            (Number(a.like_count) || 0) * 2 + (Number(a.comment_count) || 0) * 3;
          const scoreB =
            (Number(b.like_count) || 0) * 2 + (Number(b.comment_count) || 0) * 3;
          return scoreB - scoreA;
        })
        .slice(0, 5),
    [stories]
  );

  const mySavedStories = useMemo(
    () => stories.filter((s) => savedStoryIds[s.id]).slice(0, 5),
    [stories, savedStoryIds]
  );

  const currentStories = useMemo(
    () =>
      [...stories]
        .sort(
          (a, b) =>
            new Date(b.created_at || b.published_at || 0) -
            new Date(a.created_at || a.published_at || 0)
        )
        .slice(0, 5),
    [stories]
  );

  const currentEventsList = useMemo(() => {
    const today = dayjs().startOf("day");
    const upcoming = events
      .filter((evt) => {
        if (!evt.start_date) return true; // include if no date set
        return dayjs(evt.start_date).isSame(today, "day") || dayjs(evt.start_date).isAfter(today);
      })
      .sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date) - new Date(b.start_date);
      });
    return upcoming.slice(0, 4);
  }, [events]);

  const paginatedStories = useMemo(
    () => filteredStories.slice(0, visibleCount),
    [filteredStories, visibleCount]
  );
  const hasMore = paginatedStories.length < filteredStories.length;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 4, filteredStories.length));
      setLoadingMore(false);
    }, 350);
  }, [loadingMore, hasMore, filteredStories.length]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore();
      },
      { rootMargin: "300px" }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMore, hasMore, loadingMore]);

  if (!canView) {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          background: "#f8fafc",
          minHeight: "80vh",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            margin: "0 auto",
            background: "#fff",
            padding: "44px 36px",
            borderRadius: 20,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "#fef2f2",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              margin: "0 auto 18px",
            }}
          >
            <FireOutlined />
          </div>
          <h3
            style={{ fontSize: 19, fontWeight: 800, color: "#1e293b", marginBottom: 10 }}
          >
            Access Restricted
          </h3>
          <p
            style={{
              color: "#64748b",
              fontSize: 13.5,
              lineHeight: 1.7,
              marginBottom: 22,
            }}
          >
            You do not have permission to view the Impact Story Feed. Please contact your
            CSR Administrator.
          </p>
          <Button
            type="primary"
            onClick={() => router.push("/admin/volunteering/portal")}
          >
            Go to Volunteering Hub
          </Button>
        </div>
      </div>
    );
  }

  const savedCount = Object.values(savedStoryIds).filter(Boolean).length;

  return (
    <div className="blog-feed-root">
      <div className="blog-feed-container">

        {/* ═══════════ PAGE HEADER ═══════════ */}
        <div className="blog-page-header">
          <div className="blog-page-header-left">
            <div className="blog-page-header-eyebrow">
              <span className="blog-eyebrow-dot" />
              Community Impact
            </div>
            <h1 className="blog-page-title">Volunteering Stories</h1>
            <p className="blog-page-subtitle">
              Celebrate employee achievements, explore on-ground CSR reflections, and
              discover community milestones.
            </p>
          </div>
          <div className="blog-page-header-right">
            {canPost && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingStory(null);
                  setIsEditorOpen(true);
                }}
                className="blog-write-btn"
              >
                Write a Story
              </Button>
            )}
          </div>
        </div>

        {/* ═══════════ FILTER BAR ═══════════ */}
        <div className="blog-filter-bar">
          <div className="blog-filter-tabs">
            {[
              {
                key: "all",
                label: "All Stories",
                icon: <CompassOutlined />,
                count: stories.length,
              },
              {
                key: "trending",
                label: "Trending",
                icon: (
                  <FireOutlined
                    style={{
                      color: activeFilterTab === "trending" ? "#fff" : "#ef4444",
                    }}
                  />
                ),
              },
              {
                key: "saved",
                label: "Bookmarks",
                icon: (
                  <BookOutlined
                    style={{
                      color: activeFilterTab === "saved" ? "#fff" : "#8B1D42",
                    }}
                  />
                ),
                count: savedCount,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`blog-filter-tab ${
                  activeFilterTab === tab.key ? "active" : ""
                }`}
                onClick={() => setActiveFilterTab(tab.key)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="blog-tab-count">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search stories, authors, causes..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            allowClear
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="blog-search-input"
          />
        </div>

        {/* ═══════════ MAIN LAYOUT ═══════════ */}
        <Row gutter={[36, 0]}>

          {/* ─── LEFT: BLOG CARDS ─── */}
          <Col xs={24} lg={15} xl={16}>
            {loading ? (
              <div className="blog-loading-state">
                <Spin size="large" />
                <p>Loading community impact stories…</p>
              </div>
            ) : filteredStories.length === 0 ? (
              <div className="blog-empty-state">
                <Empty
                  description={
                    <div>
                      <strong style={{ color: "#334155", fontSize: 16 }}>
                        No stories found
                      </strong>
                      <p style={{ color: "#94a3b8", marginTop: 6 }}>
                        Be the first to share a volunteering achievement!
                      </p>
                    </div>
                  }
                />
              </div>
            ) : (
              <>
                <div className="blog-card-grid">
                  {paginatedStories.map((story, idx) => {
                    const coverSrc = resolveMediaUrl(story.cover_image);
                    const authorInitial = (story.author_name || "V")[0].toUpperCase();
                    const effectiveDate = story.published_at || story.created_at;
                    const dateFormatted = effectiveDate
                      ? dayjs(effectiveDate).format("DD MMM YYYY")
                      : "Recent";
                    const timeAgo = effectiveDate ? dayjs(effectiveDate).fromNow() : "";
                    const isSaved = Boolean(savedStoryIds[story.id]);
                    const catStyle = getCategoryStyle(story.event_category);
                    const excerpt =
                      story.excerpt ||
                      (story.story_content
                        ? story.story_content.replace(/<[^>]*>?/gm, "").slice(0, 160)
                        : "");

                    const menuItems = [
                      {
                        key: "view",
                        icon: <EyeOutlined />,
                        label: "View Full Story",
                        onClick: () =>
                          router.push(
                            `/admin/event/volunteering-impact-story/${story.id}`
                          ),
                      },
                      {
                        key: "save",
                        icon: isSaved ? (
                          <BookFilled style={{ color: "#8B1D42" }} />
                        ) : (
                          <BookOutlined />
                        ),
                        label: isSaved ? "Remove Bookmark" : "Bookmark Story",
                        onClick: () => handleToggleSave(story.id),
                      },
                      ...(canEdit
                        ? [
                            {
                              key: "edit",
                              icon: <EditOutlined />,
                              label: "Edit Story",
                              onClick: () => {
                                setEditingStory(story);
                                setIsEditorOpen(true);
                              },
                            },
                          ]
                        : []),
                      ...(canShare
                        ? [
                            {
                              key: "share",
                              icon: <ShareAltOutlined />,
                              label: "Copy Share Link",
                              onClick: () => handleCopyLink(story.id),
                            },
                          ]
                        : []),
                      ...(canDelete
                        ? [
                            { type: "divider" },
                            {
                              key: "delete",
                              icon: <DeleteOutlined />,
                              danger: true,
                              label: "Delete Story",
                              onClick: () => handleDeleteStory(story.id),
                            },
                          ]
                        : []),
                    ];

                    return (
                      <div
                        key={story.id}
                        className="blog-card"
                        style={{ animationDelay: `${(idx % 4) * 60}ms` }}
                      >
                        {/* Cover Image */}
                        {coverSrc && (
                          <div
                            className="blog-card-cover"
                            onClick={() =>
                              router.push(
                                `/admin/event/volunteering-impact-story/${story.id}`
                              )
                            }
                          >
                            <img src={coverSrc} alt={story.story_title || "Cover"} />
                            {story.event_category && (
                              <span
                                className="blog-card-category-badge"
                                style={{
                                  background: catStyle.bg,
                                  color: catStyle.text,
                                  borderColor: catStyle.border,
                                }}
                              >
                                {story.event_category}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Card Body */}
                        <div className="blog-card-body">
                          {/* Title */}
                          <h3
                            className="blog-card-title"
                            onClick={() =>
                              router.push(
                                `/admin/event/volunteering-impact-story/${story.id}`
                              )
                            }
                          >
                            {story.story_title || "Untitled Impact Story"}
                          </h3>

                          {/* Excerpt */}
                          {excerpt && (
                            <p className="blog-card-excerpt">{excerpt}</p>
                          )}

                          {/* Meta: Author + Date */}
                          <div className="blog-card-meta">
                            <Avatar
                              size={30}
                              style={{
                                background:
                                  "linear-gradient(135deg, #8B1D42 0%, #8B1D42 100%)",
                                fontWeight: 800,
                                fontSize: 12,
                                flexShrink: 0,
                              }}
                            >
                              {authorInitial}
                            </Avatar>
                            <div className="blog-card-meta-text">
                              <span className="blog-card-author">
                                {story.author_name || "CSR Storyteller"}
                              </span>
                              <span className="blog-card-date">
                                <CalendarOutlined
                                  style={{ fontSize: 10, opacity: 0.7 }}
                                />
                                {dateFormatted}
                                {timeAgo && (
                                  <span className="blog-date-relative">
                                    ({timeAgo})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="blog-card-footer">
                          <div className="blog-card-counts">
                            <span className="blog-count-item">
                              <LikeOutlined style={{ fontSize: 13 }} />
                              {Number(story.like_count) || 0}
                            </span>
                            <span className="blog-count-item">
                              <MessageOutlined style={{ fontSize: 13 }} />
                              {Number(story.comment_count) || 0}
                            </span>
                          </div>
                          <div className="blog-card-actions">
                            <Tooltip title={isSaved ? "Bookmarked" : "Bookmark"}>
                              <button
                                type="button"
                                className={`blog-action-btn ${isSaved ? "saved" : ""}`}
                                onClick={(e) => handleToggleSave(story.id, e)}
                              >
                                {isSaved ? <BookFilled /> : <BookOutlined />}
                              </button>
                            </Tooltip>
                            <button
                              type="button"
                              className="blog-read-btn"
                              onClick={() =>
                                router.push(
                                  `/admin/event/volunteering-impact-story/${story.id}`
                                )
                              }
                            >
                              Read{" "}
                              <ArrowRightOutlined style={{ fontSize: 11 }} />
                            </button>
                            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                              <button type="button" className="blog-action-btn">
                                <MoreOutlined />
                              </button>
                            </Dropdown>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Infinite Scroll Sentinel */}
                <div ref={sentinelRef} className="blog-scroll-sentinel">
                  {loadingMore && (
                    <div className="blog-loading-more">
                      <Spin size="small" />
                      <span>Loading more stories…</span>
                    </div>
                  )}
                  {!hasMore && filteredStories.length > 6 && (
                    <div className="blog-end-marker">
                      ✓ All {filteredStories.length} stories loaded
                    </div>
                  )}
                </div>
              </>
            )}
          </Col>

          {/* ─── RIGHT: SIDEBAR ─── */}
          <Col xs={24} lg={9} xl={8}>
            <div className="blog-sidebar">

              {/* Trending */}
              <SidebarWidget
                icon={<FireOutlined style={{ color: "#ef4444" }} />}
                title="Trending Stories"
                badge="HOT 🔥"
                badgeColor="#ef4444"
              >
                {trendingStories.length === 0 ? (
                  <p className="blog-sidebar-empty">No trending stories yet</p>
                ) : (
                  <div className="blog-sidebar-list">
                    {trendingStories.map((st, idx) => {
                      const stCover = resolveMediaUrl(st.cover_image);
                      return (
                        <div
                          key={st.id || idx}
                          className="blog-sidebar-item"
                          onClick={() =>
                            router.push(
                              `/admin/event/volunteering-impact-story/${st.id}`
                            )
                          }
                        >
                          <div className="blog-sidebar-item-rank">#{idx + 1}</div>
                          <div className="blog-sidebar-item-thumb">
                            {stCover ? (
                              <img src={stCover} alt="" />
                            ) : (
                              <div className="blog-sidebar-thumb-placeholder">
                                {(st.story_title || "V")[0]}
                              </div>
                            )}
                          </div>
                          <div className="blog-sidebar-item-info">
                            <div className="blog-sidebar-item-title">
                              {st.story_title}
                            </div>
                            <div className="blog-sidebar-item-meta">
                              <span>👍 {st.like_count || 0}</span>
                              <span>💬 {st.comment_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SidebarWidget>

              {/* Saved */}
              <SidebarWidget
                icon={<BookFilled style={{ color: "#8B1D42" }} />}
                title="My Bookmarks"
                badge={`${mySavedStories.length} saved`}
                badgeColor="#8B1D42"
              >
                {mySavedStories.length === 0 ? (
                  <div className="blog-sidebar-save-hint">
                    <BookOutlined
                      style={{ fontSize: 22, color: "#d97a96", marginBottom: 6 }}
                    />
                    <p>
                      Click the bookmark icon on any story to save it here for quick
                      access.
                    </p>
                  </div>
                ) : (
                  <div className="blog-sidebar-list">
                    {mySavedStories.map((st) => (
                      <div
                        key={st.id}
                        className="blog-sidebar-item saved-item"
                        onClick={() =>
                          router.push(
                            `/admin/event/volunteering-impact-story/${st.id}`
                          )
                        }
                      >
                        <BookFilled
                          style={{
                            color: "#8B1D42",
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        />
                        <div className="blog-sidebar-item-info">
                          <div className="blog-sidebar-item-title">
                            {st.story_title}
                          </div>
                          <div className="blog-sidebar-item-meta">
                            By {st.author_name || "Volunteer"}
                          </div>
                        </div>
                        <RightOutlined
                          style={{ color: "#d97a96", fontSize: 11, flexShrink: 0 }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </SidebarWidget>

              {/* Recent */}
              <SidebarWidget
                icon={<ClockCircleOutlined style={{ color: "#0284c7" }} />}
                title="Recent Stories"
                badge="Latest"
                badgeColor="#0284c7"
              >
                <div className="blog-sidebar-list">
                  {currentStories.map((st) => (
                    <div
                      key={st.id}
                      className="blog-sidebar-item"
                      onClick={() =>
                        router.push(
                          `/admin/event/volunteering-impact-story/${st.id}`
                        )
                      }
                    >
                      <Avatar
                        size={32}
                        style={{
                          background: "#e0f2fe",
                          color: "#0284c7",
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {(st.author_name || "V")[0].toUpperCase()}
                      </Avatar>
                      <div className="blog-sidebar-item-info">
                        <div className="blog-sidebar-item-title">
                          {st.story_title}
                        </div>
                        <div className="blog-sidebar-item-meta">
                          {st.published_at
                            ? dayjs(st.published_at).fromNow()
                            : "Recent"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="blog-sidebar-view-all"
                  onClick={() => setActiveFilterTab("all")}
                >
                  View all stories <ArrowRightOutlined style={{ fontSize: 11 }} />
                </button>
              </SidebarWidget>

              {/* Events */}
              <SidebarWidget
                icon={<CalendarOutlined style={{ color: "#16a34a" }} />}
                title="Upcoming Events"
                badge={`${currentEventsList.length} upcoming`}
                badgeColor="#16a34a"
              >
                {currentEventsList.length === 0 ? (
                  <p className="blog-sidebar-empty">No upcoming events scheduled</p>
                ) : (
                  <div className="blog-sidebar-list">
                    {currentEventsList.map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        className="blog-sidebar-item event-item"
                        onClick={() =>
                          router.push("/admin/event/volunteering-event")
                        }
                      >
                        <div className="blog-event-date-badge">
                          <span>
                            {evt.start_date
                              ? dayjs(evt.start_date).format("DD")
                              : "—"}
                          </span>
                          <span>
                            {evt.start_date
                              ? dayjs(evt.start_date).format("MMM")
                              : "EVT"}
                          </span>
                        </div>
                        <div className="blog-sidebar-item-info">
                          <div className="blog-sidebar-item-title">
                            {evt.event_name || evt.title || "Volunteering Event"}
                          </div>
                          <div className="blog-sidebar-item-meta">
                            <EnvironmentOutlined style={{ fontSize: 10 }} />
                            {evt.location ||
                              evt.event_category ||
                              "Upcoming CSR Drive"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="blog-sidebar-view-all green"
                  onClick={() => router.push("/admin/event/volunteering-event")}
                >
                  See all events <ArrowRightOutlined style={{ fontSize: 11 }} />
                </button>
              </SidebarWidget>

            </div>
          </Col>
        </Row>
      </div>

      {/* Story Studio Modal */}
      <Modal
        open={isEditorOpen}
        onCancel={() => setIsEditorOpen(false)}
        footer={null}
        width="100vw"
        destroyOnHidden
        closeIcon={null}
        wrapClassName="story-studio-fullscreen-modal"
        style={{
          top: 0,
          left: 0,
          maxWidth: "100vw",
          width: "100vw",
          margin: 0,
          padding: 0,
        }}
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
          isModal={true}
          onSuccess={() => {
            setIsEditorOpen(false);
            fetchFeedStories();
          }}
          onCancel={() => setIsEditorOpen(false)}
        />
      </Modal>
    </div>
  );
}
