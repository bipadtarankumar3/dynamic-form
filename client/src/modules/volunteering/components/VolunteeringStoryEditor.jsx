"use client";
// client/src/modules/volunteering/components/VolunteeringStoryEditor.jsx
// Full-Page Impact Story Studio & Blog Editor

import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Upload,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Divider,
  InputNumber,
  App,
  Image,
  Tooltip,
  Popconfirm,
  Switch,
  Avatar,
} from "antd";
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  PictureOutlined,
  ReadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  PlusOutlined,
  CalendarOutlined,
  UserOutlined,
  TagOutlined,
  TrophyOutlined,
  CommentOutlined,
  EyeOutlined,
  SendOutlined,
  SaveOutlined,
  CheckCircleFilled,
  LinkOutlined,
  ClockCircleOutlined,
  LockOutlined,
  SettingOutlined,
  HeartOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import {
  createOrUpdateVolunteeringStoryAPI,
  getVolunteeringEventsAPI,
} from "@/services/volunteering-service";
import RichTextEditor from "@/components/common/RichTextEditor";
import { useAuth, getUser } from "@/context/AuthContext";

const CSR_THEME_OPTIONS = [
  "Healthcare & Nutrition",
  "Environment & Tree Plantation",
  "Education & Literacy",
  "Youth Mentorship & Skill Development",
  "Women Empowerment",
  "Disaster Relief & Rehabilitation",
  "Animal Welfare",
  "Coastal Clean-up & Conservation",
  "Elderly Care",
];

const resolveMediaUrl = (p) => {
  if (!p || typeof p !== "string") return "";
  const s = p.trim();
  if (s.startsWith("blob:") || s.startsWith("data:") || /^https?:\/\//i.test(s)) return s;
  const base = process.env.NEXT_PUBLIC_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:6003/api/v1";
  const cleanBase = base.replace(/\/api\/v1\/?$/, "");
  const cleanRel = s.replace(/^\/?(api\/v1\/static\/|uploads\/)?/, "");
  return `${cleanBase}/api/v1/static/${cleanRel}`;
};

export default function VolunteeringStoryEditor({
  storyData = null,
  eventId = null,
  onSuccess,
  onCancel,
  isModal = false,
}) {
  const { message } = App.useApp();
  const { user, userProfile } = useAuth() || {};
  const currentUser = getUser() || {};

  const displayName =
    userProfile?.name ||
    (userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim() : "") ||
    user?.name ||
    user?.full_name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.username ||
    "";

  const displayRole =
    userProfile?.role?.name ||
    userProfile?.role_name ||
    userProfile?.designation ||
    userProfile?.department ||
    user?.role?.name ||
    user?.role_name ||
    user?.designation ||
    user?.department ||
    user?.role ||
    currentUser?.role ||
    currentUser?.department ||
    "";

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Watch live values for dynamic header
  const watchedTitle = Form.useWatch("story_title", form);
  const watchedStatus = Form.useWatch("status", form);

  // Cover photo state
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState(
    storyData?.cover_image ? resolveMediaUrl(storyData.cover_image) : ""
  );

  // Gallery photos state
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [existingGallery, setExistingGallery] = useState(
    Array.isArray(storyData?.gallery_images)
      ? storyData.gallery_images
      : typeof storyData?.gallery_images === "string"
      ? (() => {
          try {
            return JSON.parse(storyData.gallery_images);
          } catch {
            return [];
          }
        })()
      : []
  );

  // Dynamic impact highlights
  const [highlights, setHighlights] = useState(
    Array.isArray(storyData?.impact_highlights)
      ? storyData.impact_highlights
      : typeof storyData?.impact_highlights === "string"
      ? (() => {
          try {
            return JSON.parse(storyData.impact_highlights);
          } catch {
            return storyData.impact_highlights.split("\n").filter(Boolean);
          }
        })()
      : []
  );
  const [highlightInput, setHighlightInput] = useState("");

  // Fetch events for selection
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const res = await getVolunteeringEventsAPI();
        if (res?.data?.data) {
          setEvents(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load events for story editor:", err);
      } finally {
        setEventsLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Initialize form fields
  useEffect(() => {
    if (storyData) {
      const parsedTags = Array.isArray(storyData.tags)
        ? storyData.tags
        : typeof storyData.tags === "string"
        ? (() => {
            try {
              return JSON.parse(storyData.tags);
            } catch {
              return storyData.tags.split(",").map((t) => t.trim()).filter(Boolean);
            }
          })()
        : [];

      form.setFieldsValue({
        story_title: storyData.story_title || "",
        story_slug: storyData.story_slug || "",
        event_id: storyData.event_id || storyData.parent_id || eventId || undefined,
        excerpt: storyData.excerpt || "",
        story_content: storyData.story_content || "",
        featured_quote: storyData.featured_quote || "",
        quote_attribution: storyData.quote_attribution || "",
        author_name: storyData.author_name || displayName || "CSR Storyteller",
        author_role: storyData.author_role || displayRole || "CSR Volunteer",
        tags: parsedTags,
        status: storyData.status
          ? storyData.status.toLowerCase() === "draft"
            ? "Draft"
            : "Published"
          : "Published",
        read_time_minutes: storyData.read_time_minutes || 3,
        allow_likes: storyData.allow_likes !== false,
        show_likes: storyData.show_likes !== false,
        allow_comments: storyData.allow_comments !== false,
        show_comments: storyData.show_comments !== false,
      });
      if (storyData.cover_image) {
        setCoverPhotoPreview(resolveMediaUrl(storyData.cover_image));
      }
    } else {
      form.setFieldsValue({
        event_id: eventId || undefined,
        author_name: displayName || "CSR Volunteer",
        author_role: displayRole || "Corporate Volunteering",
        status: "Published",
        read_time_minutes: 3,
        tags: ["Volunteering", "Social Impact"],
        allow_likes: true,
        show_likes: true,
        allow_comments: true,
        show_comments: true,
      });
    }
  }, [storyData, eventId, form, displayName, displayRole]);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    const currentSlug = form.getFieldValue("story_slug");
    if (!storyData || !currentSlug) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      form.setFieldsValue({ story_slug: generatedSlug });
    }
  };

  const handleAddHighlight = () => {
    if (!highlightInput.trim()) return;
    if (!highlights.includes(highlightInput.trim())) {
      setHighlights([...highlights, highlightInput.trim()]);
    }
    setHighlightInput("");
  };

  const handleRemoveHighlight = (idx) => {
    setHighlights(highlights.filter((_, i) => i !== idx));
  };

  const handleCoverPhotoUpload = ({ file }) => {
    setCoverPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const handleGalleryPhotoUpload = ({ file }) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setGalleryFiles((prev) => [...prev, { file, preview: e.target.result, name: file.name }]);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleRemoveNewGallery = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingGallery = (index) => {
    setExistingGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitStatus = null) => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const formData = new FormData();
      if (storyData?.id) {
        formData.append("id", storyData.id);
      }

      formData.append("story_title", values.story_title);
      formData.append("story_slug", values.story_slug || "");
      if (values.event_id) {
        formData.append("event_id", values.event_id);
      }
      formData.append("excerpt", values.excerpt || "");
      formData.append("story_content", values.story_content || "");
      formData.append("featured_quote", values.featured_quote || "");
      formData.append("quote_attribution", values.quote_attribution || "");
      formData.append("author_name", values.author_name || "CSR Impact Lead");
      formData.append("author_role", values.author_role || "CSR Communications");
      formData.append("status", submitStatus || values.status || "Published");
      formData.append("read_time_minutes", values.read_time_minutes || 3);
      formData.append("impact_highlights", JSON.stringify(highlights));
      formData.append("tags", JSON.stringify(values.tags || []));
      formData.append("allow_likes", values.allow_likes !== false);
      formData.append("show_likes", values.show_likes !== false);
      formData.append("allow_comments", values.allow_comments !== false);
      formData.append("show_comments", values.show_comments !== false);

      // Cover photo
      if (coverPhotoFile) {
        formData.append("cover_image", coverPhotoFile);
      } else if (storyData?.cover_image) {
        formData.append("cover_image", storyData.cover_image);
      }

      // Existing gallery preserved
      formData.append("existing_gallery", JSON.stringify(existingGallery));

      // New gallery uploads
      galleryFiles.forEach((item) => {
        formData.append("gallery_images", item.file);
      });

      const res = await createOrUpdateVolunteeringStoryAPI(formData);

      if (res?.data?.success || res?.status === 200 || res?.status === 201) {
        message.success(
          submitStatus === "Draft"
            ? "Story draft saved successfully! 💾"
            : "Impact story published live! 🚀"
        );
        if (onSuccess) {
          onSuccess(res?.data?.data);
        }
      } else {
        message.error(res?.data?.message || "Failed to save story");
      }
    } catch (err) {
      if (err.errorFields) {
        message.error("Please fill in all required fields marked with *");
      } else {
        console.error("Story save error:", err);
        message.error("An error occurred while saving the story");
      }
    } finally {
      setSaving(false);
    }
  };

  const isDraft = (watchedStatus || "Published").toLowerCase() === "draft";
  const displayTitle = watchedTitle || storyData?.story_title || "Write & Publish Impact Story";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxHeight: "100vh",
        background: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* ── 1. FULL-PAGE TOP NAVIGATION HEADER (FormsBuilder Style) ── */}
      <header
        style={{
          height: 62,
          minHeight: 62,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        {/* Header Left: Back Button, Title & Status Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onCancel && (
            <Popconfirm
              title="Exit Story Studio?"
              description="Any unsaved changes will be lost. Are you sure you want to exit?"
              onConfirm={onCancel}
              okText="Exit"
              cancelText="Stay"
              okButtonProps={{ danger: true, style: { borderRadius: 6 } }}
              cancelButtonProps={{ style: { borderRadius: 6 } }}
              placement="bottomLeft"
            >
              <button
                type="button"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#334155",
                  fontSize: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.2s",
                }}
                title="Back to Impact Stories"
              >
                <ArrowLeftOutlined />
              </button>
            </Popconfirm>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                color: "#0f172a",
                maxWidth: 540,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayTitle}
            </h1>
            <Tag
              color={isDraft ? "warning" : "success"}
              style={{
                borderRadius: 12,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 800,
                border: "none",
              }}
            >
              {isDraft ? "DRAFT" : "PUBLISHED"}
            </Tag>
          </div>
        </div>

        {/* Header Right: Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onCancel && (
            <Button
              onClick={onCancel}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                height: 38,
                borderColor: "#cbd5e1",
              }}
            >
              Cancel
            </Button>
          )}

          <Button
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => handleSubmit("Draft")}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              height: 38,
              borderColor: "#cbd5e1",
              color: "#475569",
              background: "#ffffff",
            }}
          >
            Save as Draft
          </Button>

          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={saving}
            onClick={() => handleSubmit("Published")}
            style={{
              borderRadius: 8,
              fontWeight: 800,
              height: 38,
              padding: "0 20px",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              borderColor: "#7c3aed",
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
            }}
          >
            🚀 Publish Impact Story
          </Button>
        </div>
      </header>

      {/* ── 2. SCROLLABLE WORKSPACE CANVAS ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px 48px 32px",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <Form form={form} layout="vertical">
            <Row gutter={[24, 24]}>
              {/* LEFT COLUMN: Main Editorial Content Canvas */}
              <Col xs={24} lg={15} xl={16}>
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                    padding: "24px 28px",
                    marginBottom: 24,
                  }}
                >
                  {/* 1. Story Headline */}
                  <Form.Item
                    name="story_title"
                    label={
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
                        Story Title & Headline *
                      </span>
                    }
                    rules={[{ required: true, message: "Please enter an engaging story headline" }]}
                  >
                    <Input
                      placeholder="e.g. 500 Saplings Planted: How Volunteers Restored Kurla's Urban Green Cover"
                      onChange={handleTitleChange}
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        borderRadius: 10,
                        padding: "12px 16px",
                        color: "#0f172a",
                        borderColor: "#cbd5e1",
                      }}
                    />
                  </Form.Item>

                  {/* 2. Story Slug & Associated Event */}
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="event_id"
                        label={
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                            <CalendarOutlined style={{ color: "#7c3aed" }} /> Associated
                            Volunteering Event
                          </span>
                        }
                        tooltip="Select the event this impact story is celebrating"
                      >
                        <Select
                          placeholder="Select Volunteering Event"
                          loading={eventsLoading}
                          showSearch
                          optionFilterProp="children"
                          allowClear
                          style={{ borderRadius: 8, height: 42 }}
                        >
                          {events.map((evt) => (
                            <Select.Option key={evt.id} value={evt.id}>
                              {evt.event_name || `Event #${evt.id}`}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="story_slug"
                        label={
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                            Story Permalink / Slug
                          </span>
                        }
                      >
                        <Input
                          placeholder="urban-green-cover-plantation"
                          prefix={<span style={{ color: "#94a3b8", fontSize: 12 }}>stories/</span>}
                          style={{ borderRadius: 8, height: 42 }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* 3. Story Excerpt */}
                  <Form.Item
                    name="excerpt"
                    label={
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                        Story Lead Summary / Excerpt
                      </span>
                    }
                    tooltip="Brief 2-3 sentence overview shown in feed cards and social previews"
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Over 45 passionate employee volunteers partnered with GreenEarth Trust on Saturday morning to plant native saplings and log 180+ verified social impact hours..."
                      style={{
                        borderRadius: 10,
                        padding: "12px 14px",
                        fontSize: 14,
                        lineHeight: 1.6,
                        background: "#fdf4ff",
                        borderColor: "#e9d5ff",
                      }}
                    />
                  </Form.Item>

                  <Divider style={{ margin: "20px 0" }} />

                  {/* 4. Full Rich Story Narrative */}
                  <Form.Item
                    name="story_content"
                    label={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
                          Full Story Narrative (Article Content) *
                        </span>
                        <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
                          ✨ Rich Text & WYSIWYG Formatter
                        </span>
                      </div>
                    }
                    rules={[{ required: true, message: "Please provide the story narrative body" }]}
                  >
                    <RichTextEditor
                      placeholder="Write the full on-ground journey, challenges overcome, volunteer reflections, and the transformative impact achieved..."
                      minHeight={260}
                    />
                  </Form.Item>

                  <Divider style={{ margin: "20px 0" }} />

                  {/* 5. Pull Quote / Testimonial Box */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                      borderRadius: 14,
                      border: "1px solid #d8b4fe",
                      padding: "20px 22px",
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14.5,
                        color: "#6b21a8",
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CommentOutlined />
                      Featured Pull-Quote / Volunteer Testimonial
                    </div>

                    <Form.Item
                      name="featured_quote"
                      label={
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#581c87" }}>
                          Impact Quote
                        </span>
                      }
                    >
                      <Input.TextArea
                        rows={2}
                        placeholder='e.g. "Volunteering isn&apos;t just giving hours—it&apos;s building the community we all wish to live in."'
                        style={{
                          borderRadius: 8,
                          borderColor: "#c084fc",
                          background: "#ffffff",
                          fontSize: 14,
                          fontStyle: "italic",
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="quote_attribution"
                      label={
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#581c87" }}>
                          Quote Attribution / Person & Role
                        </span>
                      }
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder="e.g. Rahul Verma • Senior Cloud Architect & Lead Volunteer"
                        style={{ borderRadius: 8, borderColor: "#c084fc", background: "#ffffff" }}
                      />
                    </Form.Item>
                  </div>

                  {/* 6. Quantifiable Impact Highlights Builder */}
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14.5,
                        color: "#0f172a",
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <TrophyOutlined style={{ color: "#eab308" }} />
                      Key Impact Highlights & Measurable Statistics
                    </div>
                    <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 12px 0" }}>
                      Add quantifiable bullet points highlighting results achieved (e.g. &apos;500+
                      Saplings Planted&apos;, &apos;180 Volunteer Hours&apos;).
                    </p>

                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      <Input
                        placeholder="e.g. 500+ Native Saplings Planted"
                        value={highlightInput}
                        onChange={(e) => setHighlightInput(e.target.value)}
                        onPressEnter={handleAddHighlight}
                        style={{ borderRadius: 8, height: 40 }}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddHighlight}
                        style={{
                          borderRadius: 8,
                          height: 40,
                          fontWeight: 700,
                          background: "#7c3aed",
                          borderColor: "#7c3aed",
                        }}
                      >
                        Add Stat
                      </Button>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {highlights.map((item, idx) => (
                        <Tag
                          key={idx}
                          closable
                          onClose={() => handleRemoveHighlight(idx)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 20,
                            fontSize: 13,
                            fontWeight: 700,
                            background: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #a7f3d0",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <CheckCircleFilled style={{ color: "#10b981" }} />
                          {item}
                        </Tag>
                      ))}
                      {highlights.length === 0 && (
                        <span style={{ fontSize: 12.5, color: "#94a3b8", fontStyle: "italic" }}>
                          No impact stats added yet. Type above and click &quot;Add Stat&quot;.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Col>

              {/* RIGHT COLUMN: Media, Author, Tags & Publishing Meta */}
              <Col xs={24} lg={9} xl={8}>
                {/* 1. Publishing Status & Options Card */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                    padding: "20px 22px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#0f172a",
                      marginBottom: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <SendOutlined style={{ color: "#7c3aed" }} />
                    Publishing Settings
                  </div>

                  <Form.Item
                    name="status"
                    label={
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                        Story Publication Status
                      </span>
                    }
                  >
                    <Select style={{ borderRadius: 8, height: 40 }}>
                      <Select.Option value="Published">
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>
                          🟢 Published (Visible in Feed)
                        </span>
                      </Select.Option>
                      <Select.Option value="Draft">
                        <span style={{ color: "#d97706", fontWeight: 700 }}>
                          🟡 Draft (Admin Only)
                        </span>
                      </Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="read_time_minutes"
                    label={
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                        ⏱️ Estimated Read Time (Minutes)
                      </span>
                    }
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={1}
                      max={60}
                      style={{ width: "100%", borderRadius: 8, height: 40 }}
                    />
                  </Form.Item>
                </div>

                {/* 2. Engagement & Social Permissions Card */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                    padding: "20px 22px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#0f172a",
                      marginBottom: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <LockOutlined style={{ color: "#7c3aed" }} />
                    Community Permissions
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                          Allow Likes & Reactions
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>
                          Let volunteers react with hearts
                        </div>
                      </div>
                      <Form.Item name="allow_likes" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                          Show Likes Count
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>
                          Display total likes in feed
                        </div>
                      </div>
                      <Form.Item name="show_likes" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>

                    <Divider style={{ margin: "4px 0" }} />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                          Allow Comments
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>
                          Enable volunteer reflections
                        </div>
                      </div>
                      <Form.Item name="allow_comments" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                          Show Comments Section
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>
                          Display reflections thread
                        </div>
                      </div>
                      <Form.Item name="show_comments" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </div>
                  </div>
                </div>

                {/* 3. Hero Cover Photo Card */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                    padding: "20px 22px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#0f172a",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <PictureOutlined style={{ color: "#7c3aed" }} />
                    Hero Cover Photo
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px 0" }}>
                    High-resolution landscape image displayed as the main post banner.
                  </p>

                  {coverPhotoPreview ? (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <img
                        src={coverPhotoPreview}
                        alt="Cover preview"
                        style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <Upload
                          accept="image/*,.png,.jpg,.jpeg,.webp"
                          showUploadList={false}
                          beforeUpload={(file) => handleCoverPhotoUpload({ file })}
                        >
                          <Button
                            size="small"
                            icon={<CloudUploadOutlined />}
                            style={{ borderRadius: 6, fontWeight: 700 }}
                          >
                            Replace
                          </Button>
                        </Upload>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            setCoverPhotoFile(null);
                            setCoverPhotoPreview("");
                          }}
                          style={{ borderRadius: 6 }}
                        />
                      </div>
                    </div>
                  ) : (
                    <Upload.Dragger
                      accept="image/*,.png,.jpg,.jpeg,.webp"
                      showUploadList={false}
                      beforeUpload={(file) => handleCoverPhotoUpload({ file })}
                      style={{
                        borderRadius: 12,
                        borderColor: "#cbd5e1",
                        background: "#f8fafc",
                        padding: "16px 0",
                      }}
                    >
                      <p
                        className="ant-upload-drag-icon"
                        style={{ margin: 0, color: "#7c3aed", fontSize: 28 }}
                      >
                        <CloudUploadOutlined />
                      </p>
                      <p
                        style={{
                          fontWeight: 700,
                          color: "#334155",
                          margin: "8px 0 2px 0",
                          fontSize: 13,
                        }}
                      >
                        Click or drag image to upload cover
                      </p>
                      <p style={{ color: "#94a3b8", fontSize: 11.5, margin: 0 }}>
                        PNG, JPG, WebP up to 15MB
                      </p>
                    </Upload.Dragger>
                  )}
                </div>

                {/* 3. On-Ground Photo Gallery Card */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                    padding: "20px 22px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#0f172a",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <PictureOutlined style={{ color: "#4f46e5" }} />
                    On-Ground Photo Gallery
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px 0" }}>
                    Add multiple candid snapshots from the volunteer activity.
                  </p>

                  {/* Existing & New Gallery Thumbnail Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {existingGallery.map((gImg, idx) => {
                      const gSrc = resolveMediaUrl(
                        typeof gImg === "object" ? gImg.file_path || gImg.url : gImg
                      );
                      return (
                        <div
                          key={`exist-${idx}`}
                          style={{
                            position: "relative",
                            height: 74,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <img
                            src={gSrc}
                            alt="Gallery"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingGallery(idx)}
                            style={{
                              position: "absolute",
                              top: 3,
                              right: 3,
                              background: "rgba(220, 38, 38, 0.85)",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              fontSize: 10,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}

                    {galleryFiles.map((item, idx) => (
                      <div
                        key={`new-${idx}`}
                        style={{
                          position: "relative",
                          height: 74,
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "2px solid #7c3aed",
                        }}
                      >
                        <img
                          src={item.preview}
                          alt="New Gallery"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewGallery(idx)}
                          style={{
                            position: "absolute",
                            top: 3,
                            right: 3,
                            background: "rgba(220, 38, 38, 0.85)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            fontSize: 10,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <Upload
                    accept="image/*,.png,.jpg,.jpeg,.webp"
                    showUploadList={false}
                    multiple
                    beforeUpload={(file) => handleGalleryPhotoUpload({ file })}
                  >
                    <Button
                      block
                      icon={<PlusOutlined />}
                      style={{ borderRadius: 8, fontWeight: 700, borderColor: "#cbd5e1" }}
                    >
                      + Add Gallery Photos
                    </Button>
                  </Upload>
                </div>

                {/* 4. Author & Tags Card */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 16,
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                    padding: "20px 22px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#0f172a",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <UserOutlined style={{ color: "#7c3aed" }} />
                      <span>Story Author & Themes</span>
                    </div>
                    <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 12, fontSize: 11 }}>
                      👤 Logged-in User
                    </Tag>
                  </div>

                  {/* Current Logged-in User Live Card */}
                  {(displayName || displayRole) && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                        borderRadius: 10,
                        border: "1px solid #ddd6fe",
                        marginBottom: 14,
                      }}
                    >
                      <Avatar
                        size={36}
                        style={{
                          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                          fontWeight: 800,
                          color: "#ffffff",
                        }}
                      >
                        {(displayName || "U")[0].toUpperCase()}
                      </Avatar>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1e1b4b", lineHeight: 1.2 }}>
                          {displayName || "Logged In User"}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#6d28d9", marginTop: 2, fontWeight: 600 }}>
                          {displayRole || "CSR Volunteer"}
                        </div>
                      </div>
                    </div>
                  )}

                  <Form.Item
                    name="author_name"
                    label={
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                        Author / Reporter Name
                      </span>
                    }
                  >
                    <Input
                      placeholder={displayName || "Author name"}
                      prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                      style={{ borderRadius: 8, height: 40 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="author_role"
                    label={
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                        Author Role / Department
                      </span>
                    }
                  >
                    <Input
                      placeholder={displayRole || "Author role / department"}
                      prefix={<IdcardOutlined style={{ color: "#94a3b8" }} />}
                      style={{ borderRadius: 8, height: 40 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="tags"
                    label={
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                        <TagOutlined /> Keywords & Focus Tags
                      </span>
                    }
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      mode="tags"
                      placeholder="Add tags e.g. Plantation, CleanCity"
                      tokenSeparators={[","]}
                      style={{ width: "100%", borderRadius: 8 }}
                    />
                  </Form.Item>
                </div>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </div>
  );
}
