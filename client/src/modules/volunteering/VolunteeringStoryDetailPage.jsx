// client/src/modules/volunteering/VolunteeringStoryDetailPage.jsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Spin,
  Button,
  Tag,
  Avatar,
  Input,
  message,
  Alert,
  Modal,
  Image,
  Row,
  Col,
  Divider,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  ReadOutlined,
  LikeOutlined,
  LikeFilled,
  ShareAltOutlined,
  MessageOutlined,
  SendOutlined,
  EditOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  TrophyOutlined,
  FileImageOutlined,
  BookOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  getVolunteeringStoryByIdAPI,
  toggleStoryLikeAPI,
  addStoryCommentAPI,
  deleteStoryCommentAPI,
} from "@/services/volunteering-service";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";
import { useAuth } from "@/context/AuthContext";
import { hasModulePermissions } from "@/context/PermissionContext";

dayjs.extend(relativeTime);

const PRIMARY = "#8B1D42";
const PRIMARY_LIGHT = "#fdf2f5";
const PRIMARY_MID = "#f9c7d5";
const PRIMARY_DARK = "#6b1232";

const resolveMediaUrl = (src) => {
  if (!src) return "";
  let s = src;
  if (typeof src === "object") s = src.file_path || src.url || src.path || "";
  if (!s || typeof s !== "string") return "";
  const trimmed = s.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:") || /^https?:\/\//i.test(trimmed)) return trimmed;
  const base =
    process.env.NEXT_PUBLIC_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:6003/api/v1";
  const cleanBase = base.replace(/\/api\/v1\/?$/, "");
  const cleanRel = trimmed.replace(/^\/?(api\/v1\/static\/|uploads\/)?/, "");
  return `${cleanBase}/api/v1/static/${cleanRel}`;
};

function parseJsonOrArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val.split(",").map((t) => t.trim()).filter(Boolean); }
  }
  return [];
}

/* ─────────────────────────────────────────────────────────
   FbSubReply — Facebook-style single nested reply
   ───────────────────────────────────────────────────────── */
function FbSubReply({
  reply,
  currentEmpName,
  currentUserId,
  currentEmpId,
  isStoryCreator,
  isAdmin,
  canComment,
  onReplyClick,
  onDeleteComment,
  PRIMARY,
}) {
  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(0);

  const handleLike = () => {
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? Math.max(0, p - 1) : p + 1));
  };

  const canDelete =
    isStoryCreator ||
    isAdmin ||
    (currentUserId && String(reply.user_id) === String(currentUserId)) ||
    (currentEmpId && String(reply.emp_id) === String(currentEmpId)) ||
    reply.user_name === currentEmpName;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <Avatar
        size={28}
        src={reply.user_avatar ? resolveMediaUrl(reply.user_avatar) : undefined}
        style={{
          background: reply.is_attendee ? PRIMARY : "#64748b",
          fontWeight: 700,
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        {reply.user_name?.charAt(0)?.toUpperCase() || "V"}
      </Avatar>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Bubble wrapper for floating reaction */}
        <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
          <div
            style={{
              background: "#f0f2f5",
              borderRadius: "16px",
              padding: "7px 12px",
              wordBreak: "break-word",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 12.5, color: "#050505" }}>
                  {reply.user_name}
                </span>
                {reply.user_dept && (
                  <span style={{ fontSize: 11, color: "#65676b" }}>• {reply.user_dept}</span>
                )}
                {reply.is_attendee && (
                  <Tag
                    color="gold"
                    icon={<CheckCircleFilled />}
                    style={{ fontSize: 9.5, borderRadius: 8, fontWeight: 700, margin: 0, padding: "0 4px", lineHeight: "16px" }}
                  >
                    Attendee
                  </Tag>
                )}
              </div>

              {canDelete && (
                <Popconfirm
                  title="Delete this reply?"
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDeleteComment(reply.id)}
                >
                  <button
                    type="button"
                    title="Delete reply"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                      padding: "0 2px",
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              )}
            </div>

            <div style={{ fontSize: 13, color: "#050505", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
              {reply.comment_text || reply.comment}
            </div>
          </div>

          {/* Floating Reaction */}
          {likeCount > 0 && (
            <div
              onClick={handleLike}
              style={{
                position: "absolute",
                bottom: -7,
                right: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                background: "#ffffff",
                borderRadius: 10,
                padding: "1px 4px 1px 2px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                cursor: "pointer",
                fontSize: 10,
                color: "#65676b",
                fontWeight: 600,
                zIndex: 2,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#1877f2",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  color: "#fff",
                }}
              >
                👍
              </span>
              <span>{likeCount}</span>
            </div>
          )}
        </div>

        {/* Action Row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3, paddingLeft: 10 }}>
          <button
            type="button"
            onClick={handleLike}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: liked ? 700 : 600,
              color: liked ? "#1877f2" : "#65676b",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {liked ? "Liked" : "Like"}
          </button>

          {canComment && (
            <button
              type="button"
              onClick={onReplyClick}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                color: "#65676b",
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              Reply
            </button>
          )}

          <span style={{ fontSize: 11, color: "#65676b" }}>
            {dayjs(reply.created_at).fromNow()}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FbComment — Facebook-style single comment with replies
   ───────────────────────────────────────────────────────── */
function FbComment({
  comment,
  replies = [],
  currentEmpName,
  currentUserId,
  currentEmpId,
  isStoryCreator,
  isAdmin,
  canComment,
  onReplySubmit,
  onDeleteComment,
  PRIMARY,
  PRIMARY_LIGHT,
  PRIMARY_MID,
}) {
  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(0);
  const [showReplyInput, setShowReplyInput] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [replyToUser, setReplyToUser] = React.useState(null);
  const replyInputRef = React.useRef(null);

  const handleLike = () => {
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? Math.max(0, p - 1) : p + 1));
  };

  const handleOpenReply = (targetUserName) => {
    setShowReplyInput(true);
    if (targetUserName && targetUserName !== currentEmpName) {
      setReplyToUser(targetUserName);
      setReplyText(`@${targetUserName} `);
    } else {
      setReplyToUser(null);
    }
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 100);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || posting) return;
    setPosting(true);
    try {
      await onReplySubmit(replyText.trim(), comment.id);
      setReplyText("");
      setShowReplyInput(false);
      setReplyToUser(null);
    } finally {
      setPosting(false);
    }
  };

  const canDeleteRoot =
    isStoryCreator ||
    isAdmin ||
    (currentUserId && String(comment.user_id) === String(currentUserId)) ||
    (currentEmpId && String(comment.emp_id) === String(currentEmpId)) ||
    comment.user_name === currentEmpName;

  return (
    <div style={{ padding: "6px 0", position: "relative" }}>
      {/* Root Comment Row */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Avatar */}
        <Avatar
          size={36}
          src={comment.user_avatar ? resolveMediaUrl(comment.user_avatar) : undefined}
          style={{
            background: comment.is_attendee ? PRIMARY : "#64748b",
            fontWeight: 700,
            flexShrink: 0,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {comment.user_name?.charAt(0)?.toUpperCase() || "V"}
        </Avatar>

        {/* Bubble & Actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Bubble wrapper for floating reaction */}
          <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
            <div
              style={{
                background: "#f0f2f5",
                borderRadius: "18px",
                padding: "9px 14px",
                wordBreak: "break-word",
                border: comment.is_attendee ? `1px solid ${PRIMARY_MID}` : "1px solid transparent",
              }}
            >
              {/* Header: Name + Department + Badges + Options */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: "#050505",
                      cursor: "pointer",
                    }}
                  >
                    {comment.user_name}
                  </span>
                  {comment.user_dept && (
                    <span style={{ fontSize: 11.5, color: "#65676b" }}>• {comment.user_dept}</span>
                  )}
                  {comment.is_attendee && (
                    <Tag
                      color="gold"
                      icon={<CheckCircleFilled />}
                      style={{
                        fontSize: 10.5,
                        borderRadius: 10,
                        fontWeight: 700,
                        margin: 0,
                        padding: "0 6px",
                        lineHeight: "18px",
                      }}
                    >
                      Verified Attendee
                    </Tag>
                  )}
                </div>

                {canDeleteRoot && (
                  <Popconfirm
                    title="Delete this comment?"
                    description={replies.length > 0 ? "Deleting this comment will also delete all of its replies." : undefined}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onDeleteComment(comment.id)}
                  >
                    <button
                      type="button"
                      title={isStoryCreator ? "Story Creator: Delete comment" : "Delete comment"}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        padding: "0 4px",
                        fontSize: 13,
                        lineHeight: 1,
                      }}
                    >
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                )}
              </div>

              {/* Text */}
              <div style={{ fontSize: 14, color: "#050505", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                {comment.comment_text || comment.comment}
              </div>
            </div>

            {/* Floating Like Reaction Badge */}
            {likeCount > 0 && (
              <div
                onClick={handleLike}
                title={`${likeCount} like${likeCount > 1 ? "s" : ""}`}
                style={{
                  position: "absolute",
                  bottom: -8,
                  right: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: "1px 5px 1px 3px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "#65676b",
                  fontWeight: 600,
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#1877f2",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: "#fff",
                  }}
                >
                  👍
                </span>
                <span>{likeCount}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, paddingLeft: 12 }}>
            <button
              type="button"
              onClick={handleLike}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: liked ? 700 : 600,
                color: liked ? "#1877f2" : "#65676b",
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              {liked ? "Liked" : "Like"}
            </button>

            {canComment && (
              <button
                type="button"
                onClick={() => handleOpenReply(comment.user_name)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#65676b",
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                Reply
              </button>
            )}

            <span style={{ fontSize: 11.5, color: "#65676b" }}>
              {dayjs(comment.created_at).fromNow()}
            </span>
          </div>

          {/* Reply Thread (Nested) */}
          {(replies.length > 0 || showReplyInput) && (
            <div
              style={{
                marginLeft: 14,
                marginTop: 8,
                paddingLeft: 14,
                borderLeft: "2px solid #e4e6eb",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Nested Reply Bubbles */}
              {replies.map((reply) => (
                <FbSubReply
                  key={reply.id}
                  reply={reply}
                  currentEmpName={currentEmpName}
                  currentUserId={currentUserId}
                  currentEmpId={currentEmpId}
                  isStoryCreator={isStoryCreator}
                  isAdmin={isAdmin}
                  canComment={canComment}
                  onReplyClick={() => handleOpenReply(reply.user_name)}
                  onDeleteComment={onDeleteComment}
                  PRIMARY={PRIMARY}
                />
              ))}

              {/* Inline Reply Input Box */}
              {showReplyInput && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 4 }}>
                  <Avatar
                    size={28}
                    style={{
                      background: `linear-gradient(135deg, ${PRIMARY} 0%, #e11d48 100%)`,
                      fontWeight: 700,
                      fontSize: 11,
                      flexShrink: 0,
                      marginTop: 3,
                    }}
                  >
                    {currentEmpName?.charAt(0)?.toUpperCase() || "U"}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        position: "relative",
                        background: "#f0f2f5",
                        borderRadius: 18,
                        padding: "6px 36px 6px 12px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Input.TextArea
                        ref={replyInputRef}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onPressEnter={(e) => {
                          if (!e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setShowReplyInput(false);
                            setReplyText("");
                          }
                        }}
                        placeholder={`Reply to ${replyToUser || comment.user_name}…`}
                        style={{
                          background: "transparent",
                          border: "none",
                          resize: "none",
                          padding: 0,
                          fontSize: 13,
                          boxShadow: "none",
                          lineHeight: 1.4,
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSendReply}
                        disabled={posting || !replyText.trim()}
                        style={{
                          position: "absolute",
                          right: 8,
                          bottom: 6,
                          background: "transparent",
                          border: "none",
                          cursor: replyText.trim() ? "pointer" : "default",
                          color: replyText.trim() ? PRIMARY : "#bcc0c4",
                          fontSize: 14,
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <SendOutlined />
                      </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 6px 0" }}>
                      <span style={{ fontSize: 10.5, color: "#94a3b8" }}>
                        Press Enter to reply, Esc to cancel
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReplyInput(false);
                          setReplyText("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#65676b",
                          fontSize: 11,
                          padding: 0,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VolunteeringStoryDetailPage({ storyId }) {
  const router = useRouter();
  const { user, userProfile } = useAuth() || {};
  const [msgApi, msgContextHolder] = message.useMessage();

  const storyPermissions = hasModulePermissions("volunteering-impact-story");
  const feedPermissions = hasModulePermissions("feed");
  const allowedActions = React.useMemo(
    () => Array.from(new Set([...feedPermissions, ...storyPermissions])),
    [feedPermissions, storyPermissions]
  );

  const canEdit = allowedActions.includes("edit");
  const canLike = allowedActions.includes("like");
  const canComment = allowedActions.includes("comment");
  const canViewStoryList = storyPermissions.includes("list") || storyPermissions.includes("view");

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentEmpName = user?.name || userProfile?.name || "Volunteer";
  const currentUserId = user?.id || userProfile?.id;
  const currentEmpId = user?.emp_id || userProfile?.emp_id;
  const isAdmin = storyPermissions.includes("admin") || feedPermissions.includes("admin");

  const { rootComments, replyMap } = React.useMemo(() => {
    const map = {};
    const roots = [];
    (comments || []).forEach((c) => {
      if (c.parent_comment_id) {
        const pid = String(c.parent_comment_id);
        if (!map[pid]) map[pid] = [];
        map[pid].push(c);
      } else {
        roots.push(c);
      }
    });
    return { rootComments: roots, replyMap: map };
  }, [comments]);

  // Creator of the story can delete any comments/replies on their story
  const isStoryCreator = React.useMemo(() => {
    if (!story) return false;
    const authorName = story.author_name;
    const createdBy = story.created_by;
    if (createdBy && (String(createdBy) === String(currentUserId) || String(createdBy) === String(currentEmpId))) {
      return true;
    }
    if (authorName && currentEmpName && authorName.toLowerCase().trim() === currentEmpName.toLowerCase().trim()) {
      return true;
    }
    return false;
  }, [story, currentUserId, currentEmpId, currentEmpName]);

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await deleteStoryCommentAPI(commentId);
      if (res?.data?.success || res?.status === 200) {
        // Count how many comments were deleted (the parent comment + all its child replies)
        const deletedCount = comments.filter(
          (c) => String(c.id) === String(commentId) || String(c.parent_comment_id) === String(commentId)
        ).length;

        setComments((prev) =>
          prev.filter(
            (c) => String(c.id) !== String(commentId) && String(c.parent_comment_id) !== String(commentId)
          )
        );
        setStory((prev) => ({
          ...prev,
          comment_count: Math.max(0, (prev.comment_count || 0) - (deletedCount || 1)),
        }));
        msgApi.success(deletedCount > 1 ? `Comment and ${deletedCount - 1} replies deleted` : "Comment deleted");
      }
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleReplySubmit = async (text, parentCommentId) => {
    if (!text?.trim() || !story) return;
    try {
      const res = await addStoryCommentAPI(story.id, {
        comment_text: text.trim(),
        parent_comment_id: parentCommentId,
      });
      if (res?.data?.success && res.data.data) {
        setComments((prev) => [...prev, res.data.data]);
        setStory((prev) => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }));
        msgApi.success("Reply posted!");
      }
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Failed to post reply");
    }
  };

  const fetchStory = async () => {
    if (!storyId) return;
    try {
      setLoading(true);
      const res = await getVolunteeringStoryByIdAPI(storyId);
      if (res?.data?.data) {
        setStory(res.data.data);
        setComments(res.data.data.comments || []);
      } else {
        msgApi.error("Story not found");
      }
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Failed to load impact story");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStory(); }, [storyId]);

  const handleToggleLike = async () => {
    if (!story) return;
    try {
      setLiking(true);
      const res = await toggleStoryLikeAPI(story.id);
      if (res?.data?.success) {
        const { liked, like_count } = res.data;
        setStory((prev) => ({ ...prev, user_has_liked: liked, like_count }));
        msgApi.success(liked ? "Liked! ❤️" : "Unliked");
      }
    } catch { msgApi.error("Failed to update like"); }
    finally { setLiking(false); }
  };

  const handlePostComment = async () => {
    if (!commentText?.trim()) { msgApi.warning("Please enter your reflection"); return; }
    if (!story) return;
    try {
      setSubmittingComment(true);
      const res = await addStoryCommentAPI(story.id, { comment_text: commentText.trim() });
      if (res?.data?.success && res.data.data) {
        setComments((prev) => [...prev, res.data.data]);
        setCommentText("");
        setStory((prev) => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }));
        msgApi.success(res.data.data.is_attendee ? "Posted with Verified Attendee badge! 🎖️" : "Reflection posted!");
      }
    } catch (err) { msgApi.error(err.response?.data?.message || "Failed to post reflection"); }
    finally { setSubmittingComment(false); }
  };

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        {msgContextHolder}
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "#64748b", fontWeight: 600 }}>Loading Impact Story…</div>
      </div>
    );
  }

  if (!story) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        {msgContextHolder}
        <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
        <h2 style={{ color: "#0f172a", marginBottom: 8 }}>Story Not Found</h2>
        <Button type="primary" icon={<ArrowLeftOutlined />}
          onClick={() => router.push(canViewStoryList ? "/admin/event/volunteering-impact-story" : "/admin/volunteering/feed")}
          style={{ borderRadius: 8, fontWeight: 700, background: PRIMARY, borderColor: PRIMARY }}>
          {canViewStoryList ? "Back to Stories" : "Back to Feed"}
        </Button>
      </div>
    );
  }

  const highlights = parseJsonOrArray(story.impact_highlights);
  const tags = parseJsonOrArray(story.tags);
  const gallery = parseJsonOrArray(story.gallery_images);
  const hasLiked = story.user_has_liked;
  const publishedDate = dayjs(story.published_at || story.created_at);

  return (
    <div style={{ width: "100%", background: "#f8fafc", fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif" }}>
      {msgContextHolder}

      {/* ── Top Nav Bar ── */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "12px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(canViewStoryList ? "/admin/event/volunteering-impact-story" : "/admin/volunteering/feed")}
            style={{ borderRadius: 8, fontWeight: 600, height: 36 }}
          >
            {canViewStoryList ? "All Stories" : "Back to Feed"}
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
            <span
              style={{ color: PRIMARY, fontWeight: 600, cursor: "pointer" }}
              onClick={() => router.push(canViewStoryList ? "/admin/event/volunteering-impact-story" : "/admin/volunteering/feed")}
            >
              {canViewStoryList ? "Impact Stories" : "Feed"}
            </span>
            <span>/</span>
            <span style={{ color: "#94a3b8", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {story.story_title}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {canEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setIsEditModalOpen(true)}
              style={{ borderRadius: 8, fontWeight: 700, background: PRIMARY, borderColor: PRIMARY, height: 36 }}
            >
              Edit Story
            </Button>
          )}
          <Button
            icon={<ShareAltOutlined />}
            onClick={() => { navigator.clipboard.writeText(window.location.href); msgApi.success("Link copied! 📋"); }}
            style={{ borderRadius: 8, fontWeight: 600, height: 36 }}
          >
            Share
          </Button>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div style={{ position: "relative", width: "100%", overflow: "hidden", background: "#0f172a", marginBottom: 0 }}>
        <img
          src={resolveMediaUrl(story.cover_image) || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1400&auto=format&fit=crop"}
          alt={story.story_title}
          style={{ width: "100%", height: "clamp(200px, 30vw, 380px)", objectFit: "cover", display: "block", opacity: 0.9 }}
          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1400&auto=format&fit=crop"; }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.1) 100%)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "clamp(20px, 4vw, 48px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            {story.event_category && (
              <Tag style={{ background: PRIMARY, color: "#fff", border: "none", borderRadius: 6, fontWeight: 800, fontSize: 12, padding: "3px 12px", margin: 0 }}>
                {story.event_category}
              </Tag>
            )}
            <span style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <ClockCircleOutlined style={{ fontSize: 12 }} />
              {story.read_time_minutes || 3} min read
            </span>
            {story.user_is_attendee && (
              <Tag color="#10b981" style={{ borderRadius: 6, fontWeight: 800, fontSize: 12, padding: "3px 10px", margin: 0 }}>
                <CheckCircleFilled /> Verified Attendee
              </Tag>
            )}
          </div>
          <h1 style={{
            color: "#ffffff", fontSize: "clamp(20px, 3.5vw, 36px)", fontWeight: 900,
            lineHeight: 1.25, margin: 0, textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            maxWidth: 860, letterSpacing: "-0.02em",
          }}>
            {story.story_title}
          </h1>
          {/* Author strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <Avatar size={38} style={{ background: PRIMARY, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {(story.author_name || "A")[0]}
            </Avatar>
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>{story.author_name || "CSR Storyteller"}</div>
              <div style={{ color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{story.author_role || "Impact Lead"}</span>
                <span>•</span>
                <CalendarOutlined style={{ fontSize: 11 }} />
                <span>{publishedDate.format("DD MMM YYYY")}</span>
                <span style={{ color: "#64748b" }}>({publishedDate.fromNow()})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ width: "100%", padding: "32px clamp(16px, 4vw, 40px) 60px", boxSizing: "border-box" }}>
        <Row gutter={[32, 32]}>

          {/* ─────────── LEFT: Article Body ─────────── */}
          <Col xs={24} lg={16} xl={17}>

            {/* Linked Event Banner */}
            {(story.event_display_title || story.event_name) && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 18px", background: PRIMARY_LIGHT,
                borderRadius: 12, border: `1px solid ${PRIMARY_MID}`,
                marginBottom: 24, flexWrap: "wrap",
              }}>
                <CalendarOutlined style={{ color: PRIMARY, fontSize: 16, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 1 }}>
                    Linked Event
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {story.event_display_title || story.event_name}
                  </div>
                </div>
              </div>
            )}

            {/* Lead Excerpt */}
            {story.excerpt && (
              <div style={{
                fontSize: 17, fontWeight: 500, lineHeight: 1.7, color: "#334155",
                padding: "20px 24px", background: PRIMARY_LIGHT,
                borderLeft: `4px solid ${PRIMARY}`, borderRadius: "0 12px 12px 0",
                marginBottom: 28,
              }}>
                {story.excerpt}
              </div>
            )}

            {/* Featured Quote */}
            {story.featured_quote && (
              <div style={{
                padding: "28px 36px", background: "#f8fafc",
                border: "1px solid #e2e8f0", borderRadius: 16,
                margin: "0 0 28px 0", textAlign: "center",
              }}>
                <div style={{ fontSize: 40, color: PRIMARY, lineHeight: 1, marginBottom: 10, fontFamily: "Georgia, serif" }}>❝</div>
                <div style={{ fontSize: 18, fontStyle: "italic", fontWeight: 600, color: "#1e293b", lineHeight: 1.65 }}>
                  {story.featured_quote}
                </div>
                {story.quote_attribution && (
                  <div style={{ marginTop: 14, fontSize: 14, fontWeight: 800, color: PRIMARY }}>
                    — {story.quote_attribution}
                  </div>
                )}
              </div>
            )}

            {/* Story Body */}
            <div
              className="story-narrative-content"
              style={{
                fontSize: 16,
                lineHeight: 1.85,
                color: "#1e293b",
                marginBottom: 28,
                padding: 0,
                wordBreak: "break-word",
              }}
            >
              {/<[a-z][\s\S]*>/i.test(story.story_content || "") ? (
                <div
                  dangerouslySetInnerHTML={{ __html: story.story_content }}
                  style={{ lineHeight: 1.85, color: "#1e293b", fontSize: 16 }}
                />
              ) : (
                (story.story_content || "")
                  .split(/\n\n+/)
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((para, i) => <p key={i} style={{ marginBottom: 18, color: "#1e293b" }}>{para}</p>)
              )}
            </div>

            {/* Impact Highlights */}
            {highlights.length > 0 && (
              <div style={{
                padding: "20px 24px",
                background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fce7ee 100%)`,
                borderRadius: 16, border: `1px solid ${PRIMARY_MID}`, marginBottom: 32,
              }}>
                <div style={{ fontWeight: 800, color: PRIMARY_DARK, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrophyOutlined style={{ color: PRIMARY }} />
                  Verified Social & Environmental Impact Metrics
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {highlights.map((hl, i) => (
                    <div key={i} style={{
                      background: "#ffffff", padding: "9px 16px", borderRadius: 10,
                      fontWeight: 700, fontSize: 13.5, color: PRIMARY_DARK,
                      border: `1px solid ${PRIMARY_MID}`, boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}>
                      🎯 {hl}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {gallery.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileImageOutlined style={{ color: PRIMARY }} />
                  Activity Photo Gallery ({gallery.length} Photos)
                </div>
                <Image.PreviewGroup>
                  <Row gutter={[12, 12]}>
                    {gallery.map((imgUrl, i) => (
                      <Col xs={12} sm={8} md={6} key={i}>
                        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", height: 140, background: "#0f172a" }}>
                          <Image
                            src={resolveMediaUrl(imgUrl) || (typeof imgUrl === "string" ? imgUrl : imgUrl?.url)}
                            alt={`gallery-${i}`}
                            style={{ width: "100%", height: 140, objectFit: "cover" }}
                          />
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Image.PreviewGroup>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
                {tags.map((t, i) => (
                  <Tag key={i} style={{ borderRadius: 20, fontSize: 12, padding: "3px 12px", margin: 0, background: PRIMARY_LIGHT, color: PRIMARY_DARK, border: `1px solid ${PRIMARY_MID}`, fontWeight: 600 }}>
                    #{t}
                  </Tag>
                ))}
              </div>
            )}

            {/* ── Social Actions Bar ── */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", marginBottom: 32, overflow: "hidden" }}>
              {/* Counts */}
              <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {Number(story.like_count) > 0 ? (
                    <>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#1877f2", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>👍</span>
                      <span style={{ fontWeight: 600, color: "#475569", fontSize: 13 }}>{story.like_count} {story.like_count === 1 ? "like" : "likes"}</span>
                    </>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>Be the first to like this</span>
                  )}
                </div>
                {story.show_comments !== false && (
                  <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>
                    {comments.length} {comments.length === 1 ? "reflection" : "reflections"}
                  </span>
                )}
              </div>
              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                {/* Like */}
                {story.allow_likes !== false && canLike ? (
                  <button type="button" onClick={handleToggleLike} disabled={liking}
                    style={{ background: "transparent", border: "none", borderRight: "1px solid #f1f5f9", padding: "12px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: hasLiked ? "#1877f2" : "#475569", fontWeight: hasLiked ? 700 : 600, fontSize: 14, transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {hasLiked ? <LikeFilled style={{ fontSize: 17, color: "#1877f2" }} /> : <LikeOutlined style={{ fontSize: 17 }} />}
                    {hasLiked ? "Liked" : "Like"}
                  </button>
                ) : (
                  <button type="button" disabled style={{ background: "transparent", border: "none", borderRight: "1px solid #f1f5f9", padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#bcc0c4", fontSize: 14, cursor: "not-allowed" }}>
                    <LikeOutlined style={{ fontSize: 17 }} /> Like
                  </button>
                )}
                {/* Comment */}
                <button type="button"
                  onClick={() => { const el = document.getElementById("comment-input-area"); if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); } }}
                  style={{ background: "transparent", border: "none", borderRight: "1px solid #f1f5f9", padding: "12px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#475569", fontWeight: 600, fontSize: 14, transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <MessageOutlined style={{ fontSize: 17 }} /> Reflection
                </button>
                {/* Share */}
                <button type="button"
                  onClick={() => { navigator.clipboard.writeText(window.location.href); msgApi.success("Link copied! 📋"); }}
                  style={{ background: "transparent", border: "none", padding: "12px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#475569", fontWeight: 600, fontSize: 14, transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <ShareAltOutlined style={{ fontSize: 17 }} /> Share
                </button>
              </div>
            </div>

            {/* ── Facebook-style Comments Section ── */}
            {story.show_comments !== false && (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 20px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <MessageOutlined style={{ color: PRIMARY }} />
                    Comments
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>({comments.length})</span>
                  </h3>
                  {story.user_is_attendee && (
                    <span style={{ fontSize: 11.5, background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                      ✅ Verified Attendee
                    </span>
                  )}
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", marginBottom: 16 }} />

                {/* Comment List */}
                {rootComments.length === 0 ? (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div style={{ fontWeight: 600, color: "#64748b" }}>No comments yet</div>
                    <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>Be the first to share your volunteer experience and thoughts!</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    {rootComments.map((comment) => (
                      <FbComment
                        key={comment.id}
                        comment={comment}
                        replies={replyMap[String(comment.id)] || []}
                        currentEmpName={currentEmpName}
                        currentUserId={currentUserId}
                        currentEmpId={currentEmpId}
                        isStoryCreator={isStoryCreator}
                        isAdmin={isAdmin}
                        canComment={canComment && story.allow_comments !== false}
                        onReplySubmit={handleReplySubmit}
                        onDeleteComment={handleDeleteComment}
                        PRIMARY={PRIMARY}
                        PRIMARY_LIGHT={PRIMARY_LIGHT}
                        PRIMARY_MID={PRIMARY_MID}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom: Main comment input — Facebook style pill */}
                {story.allow_comments !== false && canComment ? (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                    <Avatar
                      size={36}
                      style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #e11d48 100%)`, fontWeight: 800, flexShrink: 0, fontSize: 14, marginTop: 2 }}
                    >
                      {currentEmpName.charAt(0)?.toUpperCase() || "U"}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          background: "#f0f2f5",
                          borderRadius: 20,
                          padding: "8px 12px 6px 14px",
                          display: "flex",
                          flexDirection: "column",
                          border: "1px solid transparent",
                          transition: "border-color 0.2s",
                        }}
                      >
                        <Input.TextArea
                          id="comment-input-area"
                          autoSize={{ minRows: 1, maxRows: 5 }}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onPressEnter={(e) => {
                            if (!e.shiftKey) {
                              e.preventDefault();
                              handlePostComment();
                            }
                          }}
                          placeholder="Write a comment… (Enter to post)"
                          style={{
                            background: "transparent",
                            border: "none",
                            resize: "none",
                            padding: 0,
                            fontSize: 14,
                            lineHeight: 1.45,
                            boxShadow: "none",
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            Press Enter to post, Shift + Enter for new line
                          </span>
                          <button
                            type="button"
                            onClick={handlePostComment}
                            disabled={submittingComment || !commentText.trim()}
                            title="Post comment"
                            style={{
                              background: commentText.trim() ? PRIMARY : "transparent",
                              color: commentText.trim() ? "#fff" : "#bcc0c4",
                              border: "none",
                              borderRadius: "50%",
                              width: 28,
                              height: 28,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: commentText.trim() ? "pointer" : "default",
                              transition: "all 0.2s",
                              padding: 0,
                            }}
                          >
                            <SendOutlined style={{ fontSize: 13 }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "10px 0", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
                    🔒 {!canComment ? "You don't have permission to comment." : "Comments are disabled."}
                  </div>
                )}
              </div>
            )}

          </Col>

          {/* ─────────── RIGHT: Sidebar ─────────── */}
          <Col xs={24} lg={8} xl={7}>
            <div style={{ position: "sticky", top: 76, display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Author Card */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                <div style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #e11d48 100%)`, padding: "20px 20px 28px", textAlign: "center" }}>
                  <Avatar size={64} style={{ background: "rgba(255,255,255,0.2)", fontWeight: 900, fontSize: 26, border: "3px solid rgba(255,255,255,0.4)", color: "#fff" }}>
                    {(story.author_name || "A")[0]}
                  </Avatar>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, marginTop: 10 }}>{story.author_name}</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 2 }}>{story.author_role || "CSR Storyteller"}</div>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#475569" }}>
                      <CalendarOutlined style={{ color: PRIMARY, fontSize: 14 }} />
                      Published {publishedDate.format("DD MMM YYYY")}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#475569" }}>
                      <ClockCircleOutlined style={{ color: PRIMARY, fontSize: 14 }} />
                      {story.read_time_minutes || 3} min read
                    </div>
                    {story.event_name && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#475569" }}>
                        <EnvironmentOutlined style={{ color: PRIMARY, fontSize: 14, marginTop: 2 }} />
                        <span>{story.event_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Engagement Stats */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 14 }}>Story Engagement</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Likes", value: Number(story.like_count) || 0, icon: "👍", color: "#1877f2" },
                    { label: "Reflections", value: comments.length, icon: "💬", color: PRIMARY },
                  ].map((stat) => (
                    <div key={stat.label} style={{ textAlign: "center", padding: "14px 10px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 22 }}>{stat.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, lineHeight: 1.2, marginTop: 4 }}>{stat.value}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 14 }}>Quick Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {canLike && story.allow_likes !== false && (
                    <button type="button" onClick={handleToggleLike} disabled={liking}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${hasLiked ? "#1877f2" : "#e2e8f0"}`, background: hasLiked ? "#eff6ff" : "#f8fafc", color: hasLiked ? "#1877f2" : "#475569", fontWeight: 700, fontSize: 13.5, cursor: "pointer", transition: "all 0.2s" }}>
                      {hasLiked ? <LikeFilled style={{ fontSize: 16, color: "#1877f2" }} /> : <LikeOutlined style={{ fontSize: 16 }} />}
                      {hasLiked ? "You Liked This" : "Like This Story"}
                    </button>
                  )}
                  <button type="button"
                    onClick={() => { const el = document.getElementById("comment-input-area"); if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); } }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: 13.5, cursor: "pointer", transition: "all 0.2s" }}>
                    <MessageOutlined style={{ fontSize: 16 }} /> Write a Reflection
                  </button>
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); msgApi.success("Link copied! 📋"); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: 13.5, cursor: "pointer", transition: "all 0.2s" }}>
                    <ShareAltOutlined style={{ fontSize: 16 }} /> Copy Share Link
                  </button>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>Story Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {tags.map((t, i) => (
                      <Tag key={i} style={{ borderRadius: 20, fontSize: 12, padding: "3px 12px", margin: 0, background: PRIMARY_LIGHT, color: PRIMARY_DARK, border: `1px solid ${PRIMARY_MID}`, fontWeight: 600 }}>
                        #{t}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </Col>
        </Row>
      </div>

      {/* Edit Modal */}
      <Modal
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 24 }}>
            <ReadOutlined style={{ color: PRIMARY, fontSize: 18 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Edit Impact Story</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Form Schema: <strong>volunteering_impact_story</strong></div>
            </div>
          </div>
        }
        width="75vw"
        style={{ top: 20, maxWidth: "96vw" }}
        footer={null}
        destroyOnHidden
        maskClosable={false}
      >
        <DynamicAddEditFormV2
          form_slug="volunteering_impact_story"
          mode="edit"
          selectedData={{ ...story, id: story.id }}
          parent_id={story.event_id}
          childrenInformation={{ form_slug: "volunteering_impact_story", parent_primary_key: "event_id", parent_primary_key_value: story.event_id }}
          onClose={() => setIsEditModalOpen(false)}
          fetchData={() => { setIsEditModalOpen(false); fetchStory(); }}
        />
      </Modal>
    </div>
  );
}
