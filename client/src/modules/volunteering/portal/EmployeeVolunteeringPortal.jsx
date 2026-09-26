// client/src/modules/volunteering/portal/EmployeeVolunteeringPortal.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Progress,
  Badge,
  Modal,
  Form,
  Input,
  InputNumber,
  Rate,
  Upload,
  message,
  Space,
  Avatar,
  Divider,
  Alert,
  Tooltip,
  Select,
  Breadcrumb,
  Empty,
  DatePicker,
  Image,
  Popconfirm
} from "antd";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  CameraOutlined,
  FormOutlined,
  QrcodeOutlined,
  UserOutlined,
  EyeOutlined,
  BellOutlined,
  SmileOutlined,
  CheckOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  TrophyOutlined,
  FileDoneOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  InboxOutlined,
  VideoCameraOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileOutlined,
  PictureOutlined,
  EditOutlined,
  DownloadOutlined,
  PaperClipOutlined,
  AuditOutlined,
  FileTextOutlined,
  LinkOutlined,
  ExportOutlined,
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  ShareAltOutlined,
  ReadOutlined,
  BookOutlined,
  LikeOutlined,
  LikeFilled,
  SendOutlined,
  CheckCircleFilled
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { INITIAL_EVENTS, EVENT_TYPES, CSR_THEMES } from "../constants/volunteeringConstants";
import {
  getPortalEventsAPI,
  submitPortalRsvpAPI,
  submitPortalFeedbackAPI,
  getVolunteeringStoriesAPI,
  getVolunteeringStoryByIdAPI,
  toggleStoryLikeAPI,
  addStoryCommentAPI
} from "@/services/volunteering-service";
import { dynamicGeneralListViewAPI, dynamicSchemaDetailsAPI } from "@/services/dynamicForm-service";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";
import DynamicFormViewV2 from "@/modules/dynamic-form-v2/view/DynamicFormViewV2";
import { useAuth } from "@/context/AuthContext";
import { hasModulePermissions } from "@/context/PermissionContext";
import "../volunteering.css";
import "@/modules/auth-management/permissions-page.css";

const DEFAULT_IMAGE_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120' viewBox='0 0 160 120'><rect width='160' height='120' fill='%23f1f5f9' rx='8'/><circle cx='80' cy='50' r='18' fill='%23cbd5e1'/><rect x='35' y='76' width='90' height='14' rx='4' fill='%23cbd5e1'/><text x='80' y='108' font-family='sans-serif' font-size='10' font-weight='bold' fill='%2394a3b8' text-anchor='middle'>PROOF PHOTO</text></svg>";

// Helper to resolve static asset or document URL to absolute backend path
const resolveDocUrl = (p) => {
  if (!p || typeof p !== "string") return "";
  const pathStr = p.trim();
  if (!pathStr || pathStr === "NA" || pathStr === "[]" || pathStr === "null") return "";

  if (pathStr.startsWith("blob:") || pathStr.startsWith("data:")) {
    return pathStr;
  }

  if (/^https?:\/\//i.test(pathStr)) {
    return pathStr;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:6003/api/v1";
  const cleanBase = apiBaseUrl.replace(/\/api\/v1\/?$/, "");

  if (pathStr.startsWith("/api/v1/static")) {
    return `${cleanBase}${pathStr}`;
  }
  if (pathStr.startsWith("api/v1/static")) {
    return `${cleanBase}/${pathStr}`;
  }

  const cleanRel = pathStr.replace(/^\/?(uploads\/)?/, "");
  return `${cleanBase}/api/v1/static/${cleanRel}`;
};

// Helper to extract uploaded photos from volunteer record (deduplicated)
const getVolunteerPhotos = (r) => {
  if (!r) return [];
  const list = [];
  if (Array.isArray(r.photos)) list.push(...r.photos);
  if (Array.isArray(r.feedback_form?.photos)) list.push(...r.feedback_form.photos);
  if (Array.isArray(r.feedback_form?.images)) list.push(...r.feedback_form.images);
  if (Array.isArray(r.documents)) {
    r.documents.forEach(d => {
      const raw = typeof d === "string" ? d : d.file_path || d.url || d.file_name || "";
      const type = typeof d === "object" ? d.doc_type || d.type || "" : "";
      const name = typeof d === "object" ? d.file_name || d.name || "" : d;
      if (type === "image" || type?.startsWith("image/") || String(name || raw).match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
        list.push(raw);
      }
    });
  }

  const seen = new Set();
  const result = [];
  list.forEach(p => {
    const raw = typeof p === "string" ? p : p?.url || p?.file_path || "";
    const resolved = resolveDocUrl(raw);
    if (!resolved) return;
    const baseName = resolved.split("/").pop()?.split("?")[0]?.toLowerCase() || resolved.toLowerCase();
    if (!seen.has(baseName) && !seen.has(resolved.toLowerCase())) {
      seen.add(baseName);
      seen.add(resolved.toLowerCase());
      result.push(resolved);
    }
  });
  return result;
};

// Helper to extract uploaded documents from volunteer record (deduplicated, excluding photos shown in photo gallery)
const getVolunteerDocuments = (r) => {
  if (!r) return [];
  const list = [];
  if (Array.isArray(r.documents)) list.push(...r.documents);
  if (Array.isArray(r.attachments)) list.push(...r.attachments);
  if (Array.isArray(r.feedback_form?.attachments)) list.push(...r.feedback_form.attachments);
  if (Array.isArray(r.feedback_form?.uploaded_documents)) list.push(...r.feedback_form.uploaded_documents);

  // Set of photo filenames/paths already displayed in On-Ground Photos gallery
  const photoKeys = new Set(
    getVolunteerPhotos(r).map(u => {
      const base = u.split("/").pop()?.split("?")[0]?.toLowerCase();
      return base || u.toLowerCase();
    }).filter(Boolean)
  );

  const seen = new Set();
  const result = [];

  list.forEach((d, i) => {
    if (!d) return;
    let fileName = "";
    let rawPath = "";
    let docType = "doc";
    let docPurpose = "Volunteer Verification Proof";
    let fileSize = undefined;

    if (typeof d === "string") {
      rawPath = d;
      fileName = d.split("/").pop()?.split("?")[0] || `document_${i + 1}.pdf`;
    } else {
      rawPath = d.file_path || d.url || d.file_name || "";
      fileName = d.file_name || d.name || d.doc_title || rawPath.split("/").pop()?.split("?")[0] || `document_${i + 1}.pdf`;
      docType = d.doc_type || d.type || "doc";
      docPurpose = d.doc_purpose || d.purpose || "Volunteer Verification Proof";
      fileSize = d.file_size;
    }

    const resolvedPath = resolveDocUrl(rawPath);
    const cleanFileName = (fileName.split("/").pop()?.split("?")[0] || "").trim();
    const baseKey = (cleanFileName || resolvedPath || "").toLowerCase();

    // If this file is an image already displayed in the On-Ground Activity Photos gallery, do not repeat in document list
    if (photoKeys.has(cleanFileName.toLowerCase()) || (resolvedPath && photoKeys.has(resolvedPath.toLowerCase()))) {
      return;
    }

    // Deduplicate so each file appears only once
    if (seen.has(baseKey) || (resolvedPath && seen.has(resolvedPath.toLowerCase()))) {
      return;
    }
    seen.add(baseKey);
    if (resolvedPath) seen.add(resolvedPath.toLowerCase());

    const isImg = docType === "image" || docType?.startsWith("image/") || Boolean(fileName.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i));
    const isPdf = fileName.endsWith(".pdf") || docType === "pdf" || docType?.includes("pdf");
    const isDoc = Boolean(fileName.match(/\.(doc|docx)$/i)) || docType?.includes("word");
    const isXls = Boolean(fileName.match(/\.(xls|xlsx|csv)$/i)) || docType?.includes("sheet") || docType?.includes("excel");
    const isZip = Boolean(fileName.match(/\.(zip|rar|7z)$/i)) || docType?.includes("zip");
    const isVideo = Boolean(fileName.match(/\.(mp4|mov|avi|mkv|webm)$/i)) || docType?.startsWith("video");

    result.push({
      file_name: cleanFileName || fileName,
      file_path: resolvedPath,
      raw_path: rawPath,
      doc_type: isImg ? "image" : isPdf ? "pdf" : isDoc ? "word" : isXls ? "excel" : isZip ? "zip" : isVideo ? "video" : (docType || "doc"),
      doc_purpose: docPurpose,
      file_size: fileSize
    });
  });

  return result;
};

// Helper to extract videos from volunteer record
const getVolunteerVideos = (r) => {
  if (!r) return [];
  const list = [];
  if (Array.isArray(r.videos)) list.push(...r.videos);
  if (Array.isArray(r.feedback_form?.videos)) list.push(...r.feedback_form.videos);
  return Array.from(new Set(list.map(v => {
    const raw = typeof v === "string" ? v : v?.url || v?.file_path || "";
    return resolveDocUrl(raw);
  }).filter(Boolean)));
};

// Helper to format date strings cleanly
const formatEventDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
};

// Helper to format time strings cleanly
const formatTime = (timeStr) => {
  if (!timeStr) return "—";
  if (typeof timeStr === "string" && (timeStr.includes("AM") || timeStr.includes("PM"))) return timeStr;
  try {
    const parts = String(timeStr).split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    }
    return String(timeStr);
  } catch {
    return String(timeStr);
  }
};

// Helper to display event date or range
const getEventDateDisplay = (evt) => {
  if (!evt) return "—";
  const sDate = evt.start_date || evt.event_date;
  const eDate = evt.end_date || evt.start_date || evt.event_date;

  if (sDate && eDate && String(sDate).split("T")[0] !== String(eDate).split("T")[0]) {
    return `${formatEventDate(sDate)} - ${formatEventDate(eDate)}`;
  }
  return formatEventDate(sDate);
};

// Helper to parse date and time string into a valid dayjs object
const parseEventDateTime = (dateStr, timeStr, isEnd = false) => {
  if (!dateStr) return null;
  
  let d = dayjs(dateStr);
  if (!d.isValid()) {
    const nativeDate = new Date(dateStr);
    if (!isNaN(nativeDate.getTime())) {
      d = dayjs(nativeDate);
    } else {
      return null;
    }
  }

  let hours = isEnd ? 23 : 0;
  let minutes = isEnd ? 59 : 0;

  if (timeStr) {
    const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;

      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;

      hours = h;
      minutes = m;
    }
  }

  return d.hour(hours).minute(minutes).second(0).millisecond(0);
};

// Returns 'UPCOMING' | 'ACTIVE' | 'EXPIRED'
// Only ACTIVE when current date >= start date/time AND current date <= end date/time
const getEventTimingStatus = (evt) => {
  if (!evt) return "ACTIVE";
  const sDate = evt.start_date || evt.event_date;
  const eDate = evt.end_date || evt.start_date || evt.event_date;

  if (!sDate) return "ACTIVE";

  try {
    const now = dayjs();
    const startDT = parseEventDateTime(sDate, evt.start_time, false);
    const endDT = parseEventDateTime(eDate, evt.end_time, true);

    // If current time is before event start date & time -> UPCOMING
    if (startDT && startDT.isValid() && now.isBefore(startDT)) {
      return "UPCOMING";
    }

    // If current time is after event end date & time -> EXPIRED
    if (endDT && endDT.isValid() && now.isAfter(endDT)) {
      return "EXPIRED";
    }

    // Active ONLY during the event (now >= startDT && now <= endDT)
    return "ACTIVE";
  } catch {
    return "UPCOMING";
  }
};

export default function EmployeeVolunteeringPortal({ currentEmp: propEmp }) {
  const router = useRouter();
  const { user, userProfile } = useAuth() || {};

  // Permission check for Admin View
  const eventPermissions = hasModulePermissions("volunteering-event");
  const canAccessAdminView = Array.isArray(eventPermissions) && (
    eventPermissions.includes("list") ||
    eventPermissions.includes("view") ||
    eventPermissions.includes("add") ||
    eventPermissions.includes("edit")
  );

  const currentEmp = useMemo(() => {
    const numericUserId = !isNaN(Number(user?.id)) ? Number(user?.id) : (!isNaN(Number(userProfile?.id)) ? Number(userProfile?.id) : 1);
    const empCode = user?.employee_code || userProfile?.employee_code || (typeof user?.id === "string" && user?.id.startsWith("EMP") ? user.id : (propEmp?.id || "EMP-1001"));
    return propEmp || {
      id: empCode,
      user_id: propEmp?.user_id || numericUserId,
      name: user?.name || userProfile?.name || "Employee User",
      dept: user?.department || userProfile?.department || "General",
      email: user?.email || userProfile?.email || "user@techcsr.com"
    };
  }, [propEmp, user, userProfile]);

  const [msgApi, msgContextHolder] = message.useMessage();
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(false);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  // Post-Event Feedback Modal state
  const [selectedEventForForm, setSelectedEventForForm] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // In-Portal Event Details Modal state (no route change)
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);

  // In-Portal Read-Only Submitted Form View Modal state
  const [selectedSubmissionEvent, setSelectedSubmissionEvent] = useState(null);
  const [isViewSubmissionOpen, setIsViewSubmissionOpen] = useState(false);
  const [docPreviewModal, setDocPreviewModal] = useState({ open: false, url: "", title: "", isPdf: false, isImage: false });

  // Community Stories & Impact Feed state
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [selectedStoryForModal, setSelectedStoryForModal] = useState(null);
  const [isStoryReaderOpen, setIsStoryReaderOpen] = useState(false);
  const [storyComments, setStoryComments] = useState([]);
  const [storyCommentText, setStoryCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [likingStoryId, setLikingStoryId] = useState(null);

  // Load events
  const loadEvents = async () => {
    try {
      setLoading(true);
      // 1. Try dedicated portal API
      const serverRes = await getPortalEventsAPI(currentEmp?.id).catch(() => null);
      if (serverRes?.data?.data && serverRes.data.data.length > 0) {
        setEvents(serverRes.data.data);
        return;
      }

      // 2. Fallback to generic dynamic form list API
      const res = await dynamicGeneralListViewAPI({
        form_slug: "volunteering_event",
        page: 1,
        limit: 100,
      }).catch(() => null);
      const dataList = res?.data?.data || res?.data?.rows || [];
      if (dataList && dataList.length > 0) {
        setEvents(dataList);
      }
    } catch (err) {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  // Load published impact stories
  const loadStories = async () => {
    try {
      setStoriesLoading(true);
      const res = await getVolunteeringStoriesAPI();
      if (res?.data?.data) {
        setStories(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load impact stories:", err);
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadStories();
  }, [currentEmp?.id]);

  // Open Full Story Reader Modal & fetch real-time comments and likes
  const openStoryReader = async (story) => {
    try {
      setSelectedStoryForModal(story);
      setStoryComments(story.comments || []);
      setIsStoryReaderOpen(true);
      const res = await getVolunteeringStoryByIdAPI(story.id);
      if (res?.data?.data) {
        setSelectedStoryForModal(res.data.data);
        setStoryComments(res.data.data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load story details:", err);
    }
  };

  // Toggle Like on Story
  const handleToggleLike = async (storyId, e) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    try {
      setLikingStoryId(storyId);
      const res = await toggleStoryLikeAPI(storyId);
      if (res?.data?.success) {
        const { liked, like_count } = res.data;
        // Update in stories list
        setStories((prev) =>
          prev.map((s) => (s.id === storyId ? { ...s, user_has_liked: liked, like_count } : s))
        );
        // Update in active reader modal
        setSelectedStoryForModal((prev) =>
          prev && prev.id === storyId ? { ...prev, user_has_liked: liked, like_count } : prev
        );
        msgApi.success(liked ? "Story liked! ❤️" : "Story unliked");
      }
    } catch (err) {
      console.error("Toggle like error:", err);
      msgApi.error("Failed to update like status");
    } finally {
      setLikingStoryId(null);
    }
  };

  // Submit Verified Volunteer Comment
  const handlePostComment = async () => {
    if (!storyCommentText || !storyCommentText.trim()) {
      msgApi.warning("Please type a comment or reflection first");
      return;
    }
    if (!selectedStoryForModal) return;

    try {
      setIsSubmittingComment(true);
      const res = await addStoryCommentAPI(selectedStoryForModal.id, {
        comment_text: storyCommentText.trim(),
      });
      if (res?.data?.success && res.data.data) {
        const newComment = res.data.data;
        setStoryComments((prev) => [...prev, newComment]);
        setStoryCommentText("");
        // Update count in stories feed
        setStories((prev) =>
          prev.map((s) =>
            s.id === selectedStoryForModal.id
              ? { ...s, comment_count: (s.comment_count || 0) + 1 }
              : s
          )
        );
        setSelectedStoryForModal((prev) =>
          prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev
        );
        msgApi.success(
          newComment.is_attendee
            ? "Your reflection has been posted with a Verified Attendee badge! 🎖️"
            : "Your reflection has been posted!"
        );
      }
    } catch (err) {
      console.error("Post comment error:", err);
      msgApi.error(err.response?.data?.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Calculations for KPI Cards
  // Helper to match current employee in volunteers array
  const findEmployeeVolunteer = (volunteersList) => {
    if (!Array.isArray(volunteersList) || volunteersList.length === 0) return null;
    const curEmail = String(currentEmp?.email || "").toLowerCase().trim();
    const curName = String(currentEmp?.name || "").toLowerCase().trim();
    const curEmpId = String(currentEmp?.id || "").toLowerCase().trim();
    const curUserId = String(currentEmp?.user_id || "").toLowerCase().trim();

    const matchesEmp = (vol) => {
      if (!vol) return false;
      const vEmail = String(vol.email || "").toLowerCase().trim();
      const vName = String(vol.name || "").toLowerCase().trim();
      const vEmpId = String(vol.emp_id || "").toLowerCase().trim();
      const vUserId = String(vol.user_id || "").toLowerCase().trim();

      return (
        (curEmail && vEmail && curEmail === vEmail) ||
        (curEmpId && vEmpId && curEmpId === vEmpId) ||
        (curUserId && vUserId && curUserId === vUserId) ||
        (curName && vName && curName === vName)
      );
    };

    // 1. Prioritize matching volunteer with feedback_form
    const withFeedback = volunteersList.find(v => matchesEmp(v) && v.feedback_form);
    if (withFeedback) return withFeedback;

    // 2. Matching volunteer without feedback_form
    const matched = volunteersList.find(v => matchesEmp(v));
    if (matched) return matched;

    return null;
  };

  // 1. Upcoming Initiatives: Only published initiatives where employee has NOT yet registered
  const upcomingEventsList = useMemo(() => {
    return events.filter(e => {
      const st = String(e.approval_status || "").toUpperCase();
      const isPublished = st === "PUBLISHED" || st === "OPEN_FOR_REGISTRATION" || st === "IN_PROGRESS";
      if (!isPublished) return false;

      const v = findEmployeeVolunteer(e.volunteers);
      const userStatus = v?.status || (v ? e.user_registration_status : null);

      // Exclude if already Accepted (Registered) or Attended
      return userStatus !== "Accepted" && userStatus !== "Attended" && !v?.feedback_form;
    });
  }, [events, currentEmp]);

  // 2. My Registered Events & Passes: Initiatives where employee has accepted RSVP & has active pass
  const myRegisteredList = useMemo(() => {
    return events.filter(e => {
      const v = findEmployeeVolunteer(e.volunteers);
      const userStatus = v?.status || (v ? e.user_registration_status : null);
      return userStatus === "Accepted" && !v?.feedback_form;
    });
  }, [events, currentEmp]);

  // 3. Attendance & Completed Submissions: Initiatives where attendance was verified & submitted
  const myAttendedList = useMemo(() => {
    return events.filter(e => {
      const v = findEmployeeVolunteer(e.volunteers);
      const userStatus = v?.status || (v ? e.user_registration_status : null);
      return userStatus === "Attended" || Boolean(v?.feedback_form);
    });
  }, [events, currentEmp]);

  const totalImpactHours = useMemo(() => {
    return events.reduce((acc, e) => {
      const v = findEmployeeVolunteer(e.volunteers);
      return acc + (Number(v?.hours) || (v?.status === "Attended" ? 4 : 0));
    }, 0);
  }, [events, currentEmp]);

  // Filtered List based on Search & Select
  const filterEvent = (evt) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = String(evt.event_name || "").toLowerCase().includes(q);
      const matchLoc = String(evt.event_location || "").toLowerCase().includes(q);
      const matchTheme = String(evt.csr_theme || "").toLowerCase().includes(q);
      const matchNgo = String(evt.implementing_ngo || "").toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchTheme && !matchNgo) return false;
    }
    if (selectedTheme !== "ALL" && evt.csr_theme !== selectedTheme) return false;
    if (selectedType !== "ALL" && evt.event_type !== selectedType) return false;
    return true;
  };

  const filteredUpcoming = useMemo(() => upcomingEventsList.filter(filterEvent), [upcomingEventsList, searchQuery, selectedTheme, selectedType]);
  const filteredMyRegistered = useMemo(() => myRegisteredList.filter(filterEvent), [myRegisteredList, searchQuery, selectedTheme, selectedType]);
  const filteredMyAttended = useMemo(() => myAttendedList.filter(filterEvent), [myAttendedList, searchQuery, selectedTheme, selectedType]);

  // Handle Accept / Register for Event
  const handleAcceptEvent = async (event) => {
    const updatedVolunteers = [
      ...(event.volunteers || []).filter(v => v.emp_id !== currentEmp.id && v.email !== currentEmp.email && String(v.user_id) !== String(currentEmp.id)),
      {
        id: `v_${Date.now()}`,
        emp_id: currentEmp.id,
        user_id: currentEmp.id,
        name: currentEmp.name,
        email: currentEmp.email,
        dept: currentEmp.dept,
        status: "Accepted",
        registered_at: new Date().toLocaleString(),
        hours: 0,
        feedback_form: null
      }
    ];

    const updatedEvent = {
      ...event,
      registered_count: (event.registered_count || 0) + 1,
      user_registration_status: "Accepted",
      volunteers: updatedVolunteers
    };

    setEvents(events.map(e => e.id === event.id ? updatedEvent : e));
    setActiveTab("registered");

    try {
      await submitPortalRsvpAPI({
        event_id: event.id,
        emp_id: currentEmp.id,
        emp_name: currentEmp.name,
        email: currentEmp.email,
        dept: currentEmp.dept,
        status: "Accepted"
      }).catch(() => null);
    } catch (e) {}

    msgApi.success(`🎉 You are registered for "${event.event_name}"! Moved to "My Registered Events & Passes".`);
  };

  // Handle Decline Event
  const handleDeclineEvent = async (event) => {
    const updatedVolunteers = [
      ...(event.volunteers || []).filter(v => v.emp_id !== currentEmp.id && v.email !== currentEmp.email),
      {
        id: `v_${Date.now()}`,
        emp_id: currentEmp.id,
        name: currentEmp.name,
        email: currentEmp.email,
        dept: currentEmp.dept,
        status: "Rejected",
        registered_at: new Date().toLocaleString(),
        hours: 0
      }
    ];

    const updatedEvent = {
      ...event,
      user_registration_status: "Rejected",
      volunteers: updatedVolunteers
    };

    setEvents(events.map(e => e.id === event.id ? updatedEvent : e));

    try {
      await submitPortalRsvpAPI({
        event_id: event.id,
        emp_id: currentEmp.id,
        emp_name: currentEmp.name,
        email: currentEmp.email,
        dept: currentEmp.dept,
        status: "Rejected"
      }).catch(() => null);
    } catch (e) {}

    msgApi.info(`You have declined the invitation for "${event.event_name}".`);
  };

  // Handle Submit Post-Event Attendee Form from modal
  const handleFormSubmitSuccess = async (values) => {
    const checkInFormatted = values.check_in_time ? dayjs(values.check_in_time).format("YYYY-MM-DD hh:mm A") : null;
    const checkOutFormatted = values.check_out_time ? dayjs(values.check_out_time).format("YYYY-MM-DD hh:mm A") : null;

    const submissionData = {
      ...values,
      check_in_time: checkInFormatted,
      check_out_time: checkOutFormatted,
      submitted_at: new Date().toLocaleString(),
      submitted_by: currentEmp.name,
      emp_id: currentEmp.id
    };

    const updatedVolunteers = (selectedEventForForm.volunteers || []).map(v => {
      if (v.emp_id === currentEmp.id || v.name === currentEmp.name || v.email === currentEmp.email || (currentEmp.id && String(v.user_id) === String(currentEmp.id))) {
        return {
          ...v,
          status: "Attended",
          hours: values.hours || 4,
          feedback_form: submissionData
        };
      }
      return v;
    });

    const updatedEvent = {
      ...selectedEventForForm,
      user_is_attended: true,
      user_registration_status: "Attended",
      volunteers: updatedVolunteers
    };

    setEvents(events.map(e => e.id === selectedEventForForm.id ? updatedEvent : e));
    setIsFeedbackOpen(false);
    setActiveTab("attended");

    try {
      // Build multipart FormData to upload actual binary files to the server
      const formData = new FormData();
      formData.append("event_id", selectedEventForForm.id);
      formData.append("emp_id", currentEmp.id);
      formData.append("user_id", currentEmp.user_id || 1);
      formData.append("name", currentEmp.name || "Employee User");
      formData.append("email", currentEmp.email || "employee@cyberswift.com");
      formData.append("dept", currentEmp.dept || "General");
      if (checkInFormatted) formData.append("check_in_time", checkInFormatted);
      if (checkOutFormatted) formData.append("check_out_time", checkOutFormatted);
      formData.append("hours", values.hours || 4);
      formData.append("rating", values.rating || 5);
      formData.append("learnings", values.learnings || "");
      formData.append("testimonial", values.testimonial || "");

      // Append binary files for photos, videos, and documents
      if (Array.isArray(values.rawImageFiles)) {
        values.rawImageFiles.forEach((f) => {
          const fileObj = f.originFileObj || f;
          if (fileObj instanceof File || fileObj instanceof Blob) {
            formData.append("photos", fileObj, fileObj.name || "photo.jpg");
          }
        });
      }
      if (Array.isArray(values.rawVideoFiles)) {
        values.rawVideoFiles.forEach((f) => {
          const fileObj = f.originFileObj || f;
          if (fileObj instanceof File || fileObj instanceof Blob) {
            formData.append("videos", fileObj, fileObj.name || "video.mp4");
          }
        });
      }
      if (Array.isArray(values.rawDocFiles)) {
        values.rawDocFiles.forEach((f) => {
          const fileObj = f.originFileObj || f;
          if (fileObj instanceof File || fileObj instanceof Blob) {
            formData.append("attachments", fileObj, fileObj.name || "document.pdf");
          }
        });
      }

      // Also append any existing string URLs
      if (Array.isArray(values.photos)) {
        formData.append("photos", JSON.stringify(values.photos.filter(p => typeof p === "string")));
      }
      if (Array.isArray(values.uploaded_documents)) {
        formData.append("attachments", JSON.stringify(values.uploaded_documents.filter(d => typeof d === "string")));
      }

      const resp = await submitPortalFeedbackAPI(formData);
      if (resp && resp.data?.success === false) {
        msgApi.error(resp.data?.message || "Failed to submit attendance");
        return;
      }
      msgApi.success("🎉 Attendance, volunteer hours, and media submitted successfully! Impact logged in Completed Events.");
      if (typeof loadEvents === "function") {
        loadEvents();
      }
    } catch (e) {
      msgApi.error(e?.response?.data?.message || e.message || "Attendance submission failed");
    }
  };

  // Render a Single WordPress-Style Impact Story Card
  const renderStoryCard = (story) => {
    const highlights = Array.isArray(story.impact_highlights)
      ? story.impact_highlights
      : typeof story.impact_highlights === "string"
      ? (() => {
          try {
            return JSON.parse(story.impact_highlights);
          } catch {
            return story.impact_highlights.split("\n").filter(Boolean);
          }
        })()
      : [];

    const isLiking = likingStoryId === story.id;
    const hasLiked = story.user_has_liked;

    return (
      <Col xs={24} md={12} lg={8} key={story.id}>
        <Card
          hoverable
          className="vol-portal-card"
          style={{
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#ffffff",
            overflow: "hidden",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "100%" } }}
          onClick={() => openStoryReader(story)}
        >
          {/* Cover Media Banner */}
          <div
            style={{
              position: "relative",
              height: 200,
              width: "100%",
              overflow: "hidden",
              background: "#0f172a"
            }}
          >
            <img
              src={resolveDocUrl(story.cover_image) || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop"}
              alt={story.story_title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop";
              }}
            />
            {/* Top Category Badge */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(15, 23, 42, 0.85)",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <ReadOutlined style={{ color: "#c084fc" }} />
              {story.event_category || "Community Impact"}
            </div>

            {/* Read Time */}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(255, 255, 255, 0.9)",
                color: "#334155",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                backdropFilter: "blur(4px)"
              }}
            >
              ⏱️ {story.read_time_minutes || 3} min read
            </div>

            {/* Attendee Verified Ribbon */}
            {story.user_is_attendee && (
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 12,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 6,
                  boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <CheckCircleFilled /> You Attended This Event
              </div>
            )}
          </div>

          {/* Content Body */}
          <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              {/* Event Link */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#7c3aed",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <CalendarOutlined />
                <span className="truncate" style={{ maxWidth: 280 }}>
                  {story.event_display_title || story.event_title || "CSR Volunteering Initiative"}
                </span>
              </div>

              {/* Title / Headline */}
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.35,
                  marginBottom: 8,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {story.story_title}
              </h3>

              {/* Excerpt */}
              <p
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: 1.5,
                  marginBottom: 12,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {story.excerpt || story.story_content}
              </p>

              {/* Featured Pull Quote snippet */}
              {story.featured_quote && (
                <div
                  style={{
                    background: "#faf5ff",
                    borderLeft: "3px solid #9333ea",
                    padding: "8px 12px",
                    borderRadius: "0 8px 8px 0",
                    marginBottom: 12,
                    fontSize: 12,
                    color: "#581c87",
                    fontStyle: "italic"
                  }}
                >
                  "{story.featured_quote.length > 80 ? story.featured_quote.substring(0, 80) + "..." : story.featured_quote}"
                </div>
              )}

              {/* Impact Highlights Badges */}
              {highlights.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {highlights.slice(0, 2).map((hl, idx) => (
                    <Tag
                      key={idx}
                      color="purple"
                      style={{
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 11,
                        padding: "2px 8px",
                        margin: 0
                      }}
                    >
                      ✨ {hl}
                    </Tag>
                  ))}
                  {highlights.length > 2 && (
                    <Tag style={{ borderRadius: 6, fontSize: 11, margin: 0 }}>
                      +{highlights.length - 2} more
                    </Tag>
                  )}
                </div>
              )}
            </div>

            {/* Author Footer & Actions */}
            <div>
              <Divider style={{ margin: "12px 0" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Author Info */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar
                    size={30}
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {story.author_name?.charAt(0) || "A"}
                  </Avatar>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                      {story.author_name}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      {formatEventDate(story.published_at || story.created_at)}
                    </div>
                  </div>
                </div>

                {/* Like & Comment Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Button
                    size="small"
                    type="text"
                    loading={isLiking}
                    icon={
                      hasLiked ? (
                        <HeartFilled style={{ color: "#e11d48", fontSize: 16 }} />
                      ) : (
                        <HeartOutlined style={{ color: "#64748b", fontSize: 16 }} />
                      )
                    }
                    onClick={(e) => handleToggleLike(story.id, e)}
                    style={{
                      fontWeight: 700,
                      color: hasLiked ? "#e11d48" : "#64748b",
                      borderRadius: 6,
                      padding: "0 8px"
                    }}
                  >
                    {story.like_count || 0}
                  </Button>

                  <Button
                    size="small"
                    type="text"
                    icon={<MessageOutlined style={{ color: "#64748b", fontSize: 15 }} />}
                    style={{
                      fontWeight: 700,
                      color: "#64748b",
                      borderRadius: 6,
                      padding: "0 8px"
                    }}
                  >
                    {story.comment_count || 0}
                  </Button>

                  <Button
                    size="small"
                    type="primary"
                    style={{
                      borderRadius: 6,
                      fontWeight: 700,
                      background: "#7c3aed",
                      borderColor: "#7c3aed",
                      fontSize: 11
                    }}
                  >
                    Read
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Col>
    );
  };

  // Render a Single Event Card with Modern Enterprise UI
  const renderEventCard = (evt, cardType = "upcoming") => {
    const typeMeta = EVENT_TYPES.find(t => t.name.toLowerCase() === String(evt.event_type || "").toLowerCase()) || { color: "#2563eb", name: evt.event_type || "Volunteering" };
    const userRecord = findEmployeeVolunteer(evt.volunteers);
    const userStatus = userRecord?.status || (userRecord ? evt.user_registration_status : null);
    const isAttended = userStatus === "Attended" || Boolean(userRecord?.feedback_form);
    const fb = userRecord?.feedback_form;
    const hasFeedback = Boolean(fb && typeof fb === "object" && Object.keys(fb).length > 0);
    const capacityPercent = Math.min(100, Math.round(((evt.registered_count || 0) / (evt.max_volunteers || 1)) * 100));
    const timingStatus = getEventTimingStatus(evt);

    return (
      <Col xs={24} md={12} lg={12} key={evt.id}>
        <div
          className="vol-portal-card"
          style={{
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#ffffff",
            padding: "22px 24px",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 16px 32px -4px rgba(15, 23, 42, 0.1), 0 4px 12px rgba(0, 0, 0, 0.04)";
            e.currentTarget.style.borderColor = isAttended ? "#86efac" : userStatus === "Accepted" ? "#fbcfe8" : "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          {/* Top subtle accent highlight strip */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: isAttended
                ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                : userStatus === "Accepted"
                ? "linear-gradient(90deg, #8B1D42 0%, #e11d48 100%)"
                : userStatus === "Rejected"
                ? "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)"
                : "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
            }}
          />

          <div>
            {/* Card Header: Meta Badges and Status Pill */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontWeight: 700,
                    color: "#475569",
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    padding: "3px 10px",
                    borderRadius: 20,
                    letterSpacing: "0.02em",
                  }}
                >
                  {evt.event_id || `EVT-${evt.id}`}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#be123c",
                    background: "#fff1f2",
                    border: "1px solid #ffe4e6",
                    padding: "3px 10px",
                    borderRadius: 20,
                  }}
                >
                  {evt.event_type || "General"}
                </span>

                {evt.csr_theme && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#0284c7",
                      background: "#f0f9ff",
                      border: "1px solid #e0f2fe",
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    {evt.csr_theme}
                  </span>
                )}
              </div>

              {/* Modern Status Badge */}
              {isAttended ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontWeight: 750,
                    fontSize: 11.5,
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: "#ecfdf5",
                    color: "#047857",
                    border: "1px solid #a7f3d0",
                    boxShadow: "0 1px 2px rgba(16, 185, 129, 0.08)",
                  }}
                >
                  ★ Attended ({userRecord?.hours || fb?.hours || 4}h)
                </span>
              ) : userStatus === "Accepted" ? (
                timingStatus === "EXPIRED" ? (
                  <span
                    style={{
                      fontWeight: 750,
                      fontSize: 11.5,
                      padding: "4px 12px",
                      borderRadius: 20,
                      color: "#dc2626",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                    }}
                  >
                    ⏱ Expired
                  </span>
                ) : timingStatus === "ACTIVE" ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontWeight: 750,
                      fontSize: 11.5,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: "#f0fdf4",
                      color: "#16a34a",
                      border: "1px solid #bbf7d0",
                      boxShadow: "0 1px 2px rgba(22, 163, 74, 0.08)",
                    }}
                  >
                    ● Event Live
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontWeight: 750,
                      fontSize: 11.5,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      boxShadow: "0 1px 2px rgba(37, 99, 235, 0.08)",
                    }}
                  >
                    ✓ Registered
                  </span>
                )
              ) : userStatus === "Rejected" ? (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 750,
                    padding: "4px 12px",
                    borderRadius: 20,
                    color: "#dc2626",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                  }}
                >
                  ✗ Declined
                </span>
              ) : (
                <span
                  style={{
                    fontWeight: 750,
                    fontSize: 11.5,
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: "#fdf2f8",
                    color: "#9d174d",
                    border: "1px solid #fbcfe8",
                  }}
                >
                  Open for RSVP
                </span>
              )}
            </div>

            {/* Event Name */}
            <h3
              onClick={() => {
                setSelectedEventForDetail(evt);
                setIsEventDetailOpen(true);
              }}
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 6px 0",
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#8B1D42")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#0f172a")}
              title="Click to view full event details"
            >
              {evt.event_name}
            </h3>

            {/* Parent Program */}
            {evt.parent_program_name && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <ApartmentOutlined style={{ color: "#94a3b8", fontSize: 13 }} />
                <span>Program: <strong style={{ color: "#334155" }}>{evt.parent_program_name}</strong></span>
              </div>
            )}

            {/* Objective */}
            <p
              style={{
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.55,
                margin: "0 0 14px 0",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {evt.objective || "Join our team in creating a meaningful social impact and giving back to the community."}
            </p>

            {/* Meta Information Box */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 14,
                padding: "12px 14px",
                border: "1px solid #eef2f6",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {/* Start & End Date with Time */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "#fdf2f4",
                      color: "#8B1D42",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    <CalendarOutlined />
                  </div>
                  <span style={{ color: "#64748b", fontWeight: 600, minWidth: 38 }}>Start:</span>
                  <span style={{ color: "#0f172a", fontWeight: 700 }}>{formatEventDate(evt.start_date || evt.event_date)}</span>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  <ClockCircleOutlined style={{ color: "#8B1D42", fontSize: 11.5 }} />
                  <span style={{ color: "#334155", fontWeight: 600 }}>{formatTime(evt.start_time || "09:00:00")}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "#fff1f2",
                      color: "#e11d48",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    <CalendarOutlined />
                  </div>
                  <span style={{ color: "#64748b", fontWeight: 600, minWidth: 38 }}>End:</span>
                  <span style={{ color: "#0f172a", fontWeight: 700 }}>{formatEventDate(evt.end_date || evt.start_date || evt.event_date)}</span>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  <ClockCircleOutlined style={{ color: "#e11d48", fontSize: 11.5 }} />
                  <span style={{ color: "#334155", fontWeight: 600 }}>{formatTime(evt.end_time || "17:00:00")}</span>
                </div>
              </div>

              {/* Location */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  <EnvironmentOutlined />
                </div>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {evt.location || "On-site / Corporate Office"}
                </span>
              </div>

              {/* Partner & Coordinator */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11.5,
                  color: "#64748b",
                  borderTop: "1px dashed #e2e8f0",
                  paddingTop: 6,
                  marginTop: 2,
                }}
              >
                <span>Partner: <strong style={{ color: "#334155" }}>{evt.partner_ngo_name || "Direct CSR"}</strong></span>
                {evt.coordinator_name && (
                  <span>Lead: <strong style={{ color: "#334155" }}>{evt.coordinator_name}</strong></span>
                )}
              </div>
            </div>

            {/* Verified Attendance Summary (if attended) */}
            {isAttended && fb && (
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  border: "1px solid #bbf7d0",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 14,
                  fontSize: 11.5,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, color: "#166534", marginBottom: 4 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <CheckCircleOutlined style={{ color: "#16a34a" }} />
                    Verified Hours: {fb.hours || userRecord?.hours || 4} hrs
                  </span>
                  <Rate disabled defaultValue={fb.rating || 5} style={{ fontSize: 12, color: "#f59e0b" }} />
                </div>
                {(fb.check_in_time || fb.check_out_time) && (
                  <div style={{ color: "#15803d", marginBottom: 4, fontSize: 11 }}>
                    ⏱ <strong>Check-in:</strong> {fb.check_in_time || "—"} | <strong>Check-out:</strong> {fb.check_out_time || "—"}
                  </div>
                )}
                {fb.learnings && (
                  <div
                    style={{
                      color: "#334155",
                      fontStyle: "italic",
                      marginTop: 4,
                      fontSize: 11.5,
                      borderLeft: "3px solid #10b981",
                      paddingLeft: 8,
                    }}
                  >
                    "{fb.learnings.length > 90 ? fb.learnings.substring(0, 90) + "..." : fb.learnings}"
                  </div>
                )}
              </div>
            )}

            {/* Volunteer Capacity Progress Meter */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 5 }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>
                  Capacity: <strong style={{ color: "#0f172a" }}>{evt.registered_count || 0} / {evt.max_volunteers || 30}</strong> volunteers
                </span>
                <span
                  style={{
                    color: capacityPercent >= 90 ? "#ef4444" : "#64748b",
                    fontWeight: 700,
                  }}
                >
                  {capacityPercent}% filled
                </span>
              </div>
              <Progress
                percent={capacityPercent}
                size="small"
                showInfo={false}
                strokeColor={capacityPercent >= 90 ? "#ef4444" : "linear-gradient(90deg, #8B1D42 0%, #e11d48 100%)"}
                trailColor="#f1f5f9"
              />
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div style={{ paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
            {isAttended ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button
                  type="primary"
                  icon={<FileDoneOutlined />}
                  onClick={() => {
                    setSelectedSubmissionEvent(evt);
                    setIsViewSubmissionOpen(true);
                  }}
                  style={{
                    flex: 1,
                    fontWeight: 700,
                    borderRadius: 10,
                    height: 38,
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    borderColor: "#059669",
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)",
                  }}
                >
                  View Form Details
                </Button>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedEventForDetail(evt);
                    setIsEventDetailOpen(true);
                  }}
                  style={{
                    borderRadius: 10,
                    height: 38,
                    fontWeight: 600,
                    background: "#ffffff",
                    borderColor: "#e2e8f0",
                    color: "#334155",
                  }}
                >
                  Event Details
                </Button>
              </div>
            ) : userStatus === "Accepted" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {timingStatus === "ACTIVE" ? (
                  <Button
                    type="primary"
                    icon={<FormOutlined />}
                    onClick={() => {
                      setSelectedEventForForm(evt);
                      setIsFeedbackOpen(true);
                    }}
                    style={{
                      flex: 1,
                      fontWeight: 700,
                      borderRadius: 10,
                      height: 38,
                      background: "linear-gradient(135deg, #8B1D42 0%, #be123c 100%)",
                      borderColor: "#8B1D42",
                      boxShadow: "0 2px 8px rgba(139, 29, 66, 0.2)",
                    }}
                  >
                    Submit Attendance
                  </Button>
                ) : timingStatus === "UPCOMING" ? (
                  <Tooltip title={`Attendance submission opens on ${formatEventDate(evt.start_date || evt.event_date)} at ${formatTime(evt.start_time || "09:00:00")}`}>
                    <Button
                      disabled
                      icon={<ClockCircleOutlined />}
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        borderRadius: 10,
                        height: 38,
                        background: "#f8fafc",
                        color: "#94a3b8",
                        borderColor: "#e2e8f0",
                        cursor: "not-allowed",
                      }}
                    >
                      Opens {formatEventDate(evt.start_date || evt.event_date)}
                    </Button>
                  </Tooltip>
                ) : (
                  <Tooltip title={`Submission window expired on ${formatEventDate(evt.end_date || evt.start_date || evt.event_date)} at ${formatTime(evt.end_time || "17:00:00")}`}>
                    <Button
                      disabled
                      icon={<CloseCircleOutlined />}
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        borderRadius: 10,
                        height: 38,
                        background: "#fef2f2",
                        color: "#ef4444",
                        borderColor: "#fecaca",
                        cursor: "not-allowed",
                      }}
                    >
                      Event Expired
                    </Button>
                  </Tooltip>
                )}
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedEventForDetail(evt);
                    setIsEventDetailOpen(true);
                  }}
                  style={{
                    borderRadius: 10,
                    height: 38,
                    fontWeight: 600,
                    background: "#ffffff",
                    borderColor: "#e2e8f0",
                    color: "#334155",
                  }}
                >
                  Event Details
                </Button>
                <Popconfirm
                  title="Decline RSVP"
                  description={`Are you sure you want to decline registration for "${evt.event_name}"?`}
                  onConfirm={() => handleDeclineEvent(evt)}
                  okText="Yes, Decline"
                  cancelText="Cancel"
                >
                  <Button
                    danger
                    style={{
                      borderRadius: 10,
                      height: 38,
                      fontWeight: 600,
                      background: "#fff1f2",
                      borderColor: "#fecaca",
                    }}
                  >
                    Decline
                  </Button>
                </Popconfirm>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Popconfirm
                  title="Accept & Register for Event"
                  description={`Register for "${evt.event_name}" on ${formatEventDate(evt.start_date || evt.event_date)}?`}
                  onConfirm={() => handleAcceptEvent(evt)}
                  okText="Yes, RSVP"
                  cancelText="Cancel"
                >
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    style={{
                      flex: 1,
                      fontWeight: 700,
                      borderRadius: 10,
                      height: 38,
                      background: "linear-gradient(135deg, #8B1D42 0%, #be123c 100%)",
                      borderColor: "#8B1D42",
                      boxShadow: "0 2px 8px rgba(139, 29, 66, 0.2)",
                    }}
                  >
                    Accept & RSVP
                  </Button>
                </Popconfirm>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedEventForDetail(evt);
                    setIsEventDetailOpen(true);
                  }}
                  style={{
                    borderRadius: 10,
                    height: 38,
                    fontWeight: 600,
                    background: "#ffffff",
                    borderColor: "#e2e8f0",
                    color: "#334155",
                  }}
                >
                  Event Details
                </Button>
                <Popconfirm
                  title="Decline Event Invitation"
                  description={`Decline invitation for "${evt.event_name}"?`}
                  onConfirm={() => handleDeclineEvent(evt)}
                  okText="Yes, Decline"
                  cancelText="Cancel"
                >
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    style={{
                      borderRadius: 10,
                      height: 38,
                      fontWeight: 600,
                      background: "#fff1f2",
                      borderColor: "#fecaca",
                    }}
                  >
                    Decline
                  </Button>
                </Popconfirm>
              </div>
            )}
          </div>
        </div>
      </Col>
    );
  };

  return (
    <div className="perm-page-container" style={{ padding: "0 4px 48px 4px" }}>
      {msgContextHolder}

      {/* ── 1. PAGE HEADER ── */}
      <div className="perm-page-header">
        <div className="perm-page-header-left">
          <div
            className="perm-page-header-icon"
            style={{
              background: "linear-gradient(135deg, #8B1D42 0%, #be123c 100%)",
              boxShadow: "0 6px 16px rgba(139, 29, 66, 0.3)",
            }}
          >
            <TeamOutlined />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 className="perm-page-title">Employee Volunteering Hub</h1>
              <Tag color="#8B1D42" style={{ fontWeight: 800, borderRadius: 6, margin: 0, fontSize: 10, padding: "2px 8px" }}>
                EMPLOYEE PORTAL
              </Tag>
            </div>
            <p className="perm-page-subtitle">
              Welcome, <strong style={{ color: "#0f172a" }}>{currentEmp.name}</strong> • Discover CSR initiatives, confirm RSVP passes, and log verified impact hours.
            </p>
          </div>
        </div>

        <div className="perm-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={loadEvents}
            loading={loading}
            className="perm-btn-refresh"
          >
            Refresh
          </Button>

          {canAccessAdminView && (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => router.push("/admin/event/volunteering-event")}
              className="perm-btn-create"
              style={{
                background: "linear-gradient(135deg, #8B1D42 0%, #be123c 100%)",
                boxShadow: "0 4px 14px rgba(139, 29, 66, 0.25)",
              }}
            >
              Admin View
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. KPI STATS CARDS ── */}
      <div className="perm-stats-grid">
        <div className="perm-stat-card perm-stat-card--blue">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Open Initiatives</span>
            <span className="perm-stat-val">{upcomingEventsList.length}</span>
            <span className="perm-stat-sub">
              <CalendarOutlined /> Ready for RSVP
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <CalendarOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--purple">
          <div className="perm-stat-content">
            <span className="perm-stat-label">My Enrolments</span>
            <span className="perm-stat-val">{myRegisteredList.length}</span>
            <span className="perm-stat-sub">
              <TeamOutlined /> Confirmed passes
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <TeamOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--green">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Completed & Verified</span>
            <span className="perm-stat-val">{myAttendedList.length}</span>
            <span className="perm-stat-sub">
              <CheckCircleOutlined /> Events attended
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <CheckCircleOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--orange">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Total Impact Hours</span>
            <span className="perm-stat-val">{totalImpactHours} hrs</span>
            <span className="perm-stat-sub">
              <TrophyOutlined /> Verified contribution
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <TrophyOutlined />
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
      <div className="perm-toolbar">
        <div className="perm-toolbar-left">
          <div className="perm-tab-track">
            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--all ${activeTab === "upcoming" ? "active" : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              <span className="perm-pill-icon">🌟</span>
              <span>Upcoming Initiatives</span>
              <span className="perm-pill-count">{filteredUpcoming.length}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--active ${activeTab === "registered" ? "active" : ""}`}
              onClick={() => setActiveTab("registered")}
            >
              <span className="perm-pill-icon">🎟️</span>
              <span>My Enrolments</span>
              <span className="perm-pill-count">{filteredMyRegistered.length}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--config ${activeTab === "attended" ? "active" : ""}`}
              onClick={() => setActiveTab("attended")}
            >
              <span className="perm-pill-icon">📝</span>
              <span>Attendance & Submissions</span>
              <span className="perm-pill-count">{filteredMyAttended.length}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab ${activeTab === "stories" ? "active" : ""}`}
              onClick={() => setActiveTab("stories")}
            >
              <span className="perm-pill-icon">📰</span>
              <span>Impact Stories</span>
              <span className="perm-pill-count">{stories.length}</span>
            </button>
          </div>
        </div>

        <div className="perm-toolbar-right" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Input
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="Search by title, location, NGO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ borderRadius: 10, width: 240, height: 38 }}
          />
          <Select
            value={selectedTheme}
            onChange={setSelectedTheme}
            style={{ width: 160, height: 38 }}
            options={[
              { label: "All CSR Themes", value: "ALL" },
              ...CSR_THEMES.map(t => ({ label: t, value: t }))
            ]}
          />
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ width: 150, height: 38 }}
            options={[
              { label: "All Event Types", value: "ALL" },
              ...EVENT_TYPES.map(t => ({ label: t.name, value: t.name }))
            ]}
          />
        </div>
      </div>

      {/* ── 4. TAB CONTENT VIEW ── */}
      <div style={{ marginTop: 16 }}>
        {activeTab === "upcoming" && (
          filteredUpcoming.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: 16,
                padding: "60px 24px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <Empty
                description={
                  <span style={{ color: "#64748b", fontWeight: 600, fontSize: 14 }}>
                    No upcoming events match your search/filters
                  </span>
                }
              />
            </div>
          ) : (
            <Row gutter={[20, 20]}>
              {filteredUpcoming.map(evt => renderEventCard(evt, "upcoming"))}
            </Row>
          )
        )}

        {activeTab === "registered" && (
          filteredMyRegistered.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: 16,
                padding: "60px 24px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <SmileOutlined style={{ fontSize: 44, color: "#94a3b8", marginBottom: 12 }} />
              <h3 style={{ color: "#0f172a", fontWeight: 800, fontSize: 17, margin: "0 0 6px 0" }}>
                You have not enrolled in any upcoming events
              </h3>
              <p style={{ color: "#64748b", fontSize: 13, maxWidth: 440, margin: "0 auto 16px auto" }}>
                Browse through the Upcoming Initiatives tab and click "Accept & RSVP" to confirm your participation.
              </p>
              <Button
                type="primary"
                onClick={() => setActiveTab("upcoming")}
                style={{
                  background: "linear-gradient(135deg, #8B1D42 0%, #be123c 100%)",
                  borderColor: "#8B1D42",
                  borderRadius: 8,
                  fontWeight: 700,
                  height: 38,
                  padding: "0 20px"
                }}
              >
                Browse Upcoming Initiatives
              </Button>
            </div>
          ) : (
            <Row gutter={[20, 20]}>
              {filteredMyRegistered.map(evt => renderEventCard(evt, "registered"))}
            </Row>
          )
        )}

        {activeTab === "attended" && (
          filteredMyAttended.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: 16,
                padding: "60px 24px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <FileDoneOutlined style={{ fontSize: 44, color: "#94a3b8", marginBottom: 12 }} />
              <h3 style={{ color: "#0f172a", fontWeight: 800, fontSize: 17, margin: "0 0 6px 0" }}>
                No completed events awaiting submissions
              </h3>
              <p style={{ color: "#64748b", fontSize: 13, maxWidth: 460, margin: "0 auto" }}>
                Once you attend an event and submit your attendance and hours, your verified impact record will appear here.
              </p>
            </div>
          ) : (
            <Row gutter={[20, 20]}>
              {filteredMyAttended.map(evt => renderEventCard(evt, "attended"))}
            </Row>
          )
        )}

        {activeTab === "stories" && (
          stories.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: 16,
                padding: "60px 24px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <ReadOutlined style={{ fontSize: 44, color: "#94a3b8", marginBottom: 12 }} />
              <h3 style={{ color: "#0f172a", fontWeight: 800, fontSize: 17, margin: "0 0 6px 0" }}>
                No impact stories published yet
              </h3>
              <p style={{ color: "#64748b", fontSize: 13, maxWidth: 460, margin: "0 auto 16px auto" }}>
                Published community impact stories and volunteer post reflections will appear here.
              </p>
              <Button
                type="primary"
                onClick={() => router.push("/admin/volunteering/feed")}
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                  borderColor: "#7c3aed",
                  borderRadius: 8,
                  fontWeight: 700,
                  height: 38,
                  padding: "0 20px"
                }}
              >
                Go to Community Feed
              </Button>
            </div>
          ) : (
            <Row gutter={[20, 20]}>
              {stories.map((story) => renderStoryCard(story))}
            </Row>
          )
        )}
      </div>

      {/* Post-Event Volunteer Form Submission Modal */}
      <VolunteerFeedbackModal
        open={isFeedbackOpen}
        onCancel={() => setIsFeedbackOpen(false)}
        event={selectedEventForForm}
        currentEmp={currentEmp}
        onSubmitSuccess={handleFormSubmitSuccess}
      />

      {/* In-Portal Event Details Modal (No Route Change) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              <CalendarOutlined style={{ color: "#8B1D42" }} />
              Event Details: {selectedEventForDetail?.event_name}
            </div>
            {selectedEventForDetail?.csr_theme && (
              <Tag color="cyan" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                {selectedEventForDetail.csr_theme}
              </Tag>
            )}
          </div>
        }
        open={isEventDetailOpen}
        onCancel={() => setIsEventDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsEventDetailOpen(false)} style={{ background: "#8B1D42", borderColor: "#8B1D42", fontWeight: 700, borderRadius: 8 }}>
            Close Details
          </Button>
        ]}
        width={"80vw"}
        style={{ top: 20, maxWidth: 1060 }}
        destroyOnHidden={true}
      >
        {selectedEventForDetail && (
          <Tabs
            defaultActiveKey="dynamic_form"
            items={[
              {
                key: "dynamic_form",
                label: (
                  <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <FileTextOutlined style={{ color: "#8B1D42" }} /> FormBuilder Full Event Specifications
                  </span>
                ),
                children: (
                  <div style={{ marginTop: 8 }}>
                    <DynamicFormViewV2
                      form_slug="volunteering_event"
                      selectedData={{ id: selectedEventForDetail.id }}
                      hideTitle={true}
                    />
                  </div>
                )
              },
              {
                key: "quick_summary",
                label: (
                  <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <AuditOutlined style={{ color: "#2563eb" }} /> Summary & Schedule Overview
                  </span>
                ),
                children: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
                    {/* Header Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 800, color: "#64748b", background: "#f1f5f9", padding: "3px 8px", borderRadius: 4 }}>
                        {selectedEventForDetail.event_id || `EVT-${selectedEventForDetail.id}`}
                      </span>
                      <Tag color="blue" style={{ fontWeight: 700, borderRadius: 4 }}>
                        {selectedEventForDetail.event_type || "Volunteering"}
                      </Tag>
                      {selectedEventForDetail.csr_theme && (
                        <Tag color="cyan" style={{ fontWeight: 700, borderRadius: 4 }}>
                          {selectedEventForDetail.csr_theme}
                        </Tag>
                      )}
                      {selectedEventForDetail.parent_program_name && (
                        <Tag color="purple" style={{ fontWeight: 700, borderRadius: 4 }}>
                          Program: {selectedEventForDetail.parent_program_name}
                        </Tag>
                      )}
                    </div>

                    {/* Objective & Description */}
                    <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>
                        Event Objective & Social Impact
                      </div>
                      <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                        {selectedEventForDetail.objective || selectedEventForDetail.description || "Join our team in driving meaningful community development and corporate social responsibility."}
                      </div>
                    </div>

                    {/* Schedule & Location Grid */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <div style={{ background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#8B1D42", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <CalendarOutlined /> Schedule & Timing
                          </div>
                          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
                            Start: {formatEventDate(selectedEventForDetail.start_date || selectedEventForDetail.event_date)} at {formatTime(selectedEventForDetail.start_time || "09:00:00")}
                          </div>
                          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, marginTop: 2 }}>
                            End: {formatEventDate(selectedEventForDetail.end_date || selectedEventForDetail.start_date || selectedEventForDetail.event_date)} at {formatTime(selectedEventForDetail.end_time || "17:00:00")}
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} sm={12}>
                        <div style={{ background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <EnvironmentOutlined /> Location & Venue
                          </div>
                          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
                            {selectedEventForDetail.event_location || selectedEventForDetail.location || "Corporate Office / On-site"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            Meeting Point: <strong>{selectedEventForDetail.meeting_point || "Main Gate Entrance"}</strong>
                          </div>
                        </div>
                      </Col>
                    </Row>

                    {/* Logistics, NGO Partner & Coordinator */}
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={12}>
                        <div style={{ background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                            Implementing Partner NGO
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {selectedEventForDetail.implementing_ngo || selectedEventForDetail.partner_ngo_name || "Direct CSR Team"}
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} sm={12}>
                        <div style={{ background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
                            Event Coordinator / Contact
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {selectedEventForDetail.event_coordinator || selectedEventForDetail.coordinator_name || "CSR Operations Desk"}
                          </div>
                          {selectedEventForDetail.contact_person && (
                            <div style={{ fontSize: 11, color: "#2563eb", marginTop: 2 }}>
                              <PhoneOutlined /> {selectedEventForDetail.contact_person}
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>

                    {/* Capacity Meter */}
                    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                        <span>Volunteer Capacity</span>
                        <span>{selectedEventForDetail.registered_count || 0} / {selectedEventForDetail.max_volunteers || 30} enrolled</span>
                      </div>
                      <Progress
                        percent={Math.min(100, Math.round(((selectedEventForDetail.registered_count || 0) / (selectedEventForDetail.max_volunteers || 1)) * 100))}
                        size="small"
                        strokeColor="linear-gradient(90deg, #8B1D42 0%, #e11d48 100%)"
                      />
                    </div>
                  </div>
                )
              }
            ]}
          />
        )}
      </Modal>

      {/* In-Portal Read-Only Submitted Form Details Modal */}
      <Modal
        title={
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingRight: 32,
            paddingBottom: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 3px 10px rgba(16, 185, 129, 0.3)"
              }}>
                <FileTextOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                  Volunteer Form & Impact Submission
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  Attendee: <strong style={{ color: "#ffffff" }}>{currentEmp?.name}</strong> • <Tag color="blue" style={{ margin: 0, fontWeight: 700 }}>{currentEmp?.id}</Tag> • <Tag color="cyan" style={{ margin: 0, fontWeight: 700 }}>{currentEmp?.dept}</Tag>
                </div>
              </div>
            </div>
            {(() => {
              const userRecord = findEmployeeVolunteer(selectedSubmissionEvent?.volunteers);
              const fb = userRecord?.feedback_form || {};
              const st = fb.verification_status || "Pending Review";
              return (
                <Tag
                  color={
                    st === "Approved" ? "success" :
                    st === "Revision Requested" ? "error" :
                    st === "Approved with Adjustment" ? "cyan" : "gold"
                  }
                  style={{ fontWeight: 800, fontSize: 13, padding: "4px 14px", borderRadius: 8, margin: 0 }}
                >
                  {st === "Approved" ? "✓ Approved & Credited" :
                   st === "Revision Requested" ? "⚠️ Revision Requested" :
                   st === "Approved with Adjustment" ? "⚙️ Adjusted & Credited" : "⭐ Pending Review"}
                </Tag>
              );
            })()}
          </div>
        }
        open={isViewSubmissionOpen}
        onCancel={() => setIsViewSubmissionOpen(false)}
        footer={[
          <Button
            key="close"
            size="large"
            onClick={() => setIsViewSubmissionOpen(false)}
            style={{ borderRadius: 8, fontWeight: 600, padding: "0 20px" }}
          >
            Close
          </Button>
        ]}
        styles={{
          header: {
            background: "linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)",
            padding: "16px 24px",
            margin: "-20px -24px 16px -24px",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14
          }
        }}
        width={"80vw"}
        style={{ top: 20, maxWidth: 1060 }}
        destroyOnHidden={true}
      >
        {selectedSubmissionEvent && (() => {
          const userRecord = findEmployeeVolunteer(selectedSubmissionEvent.volunteers) || selectedSubmissionEvent.user_enrolment;
          const fb = userRecord?.feedback_form || {};
          const photos = getVolunteerPhotos(userRecord);
          const docs = getVolunteerDocuments(userRecord);
          const hoursVal = fb.hours !== undefined ? fb.hours : (userRecord?.hours || 4);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
              {/* Volunteer Header Profile Strip */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                borderRadius: 12,
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Avatar
                    size={48}
                    style={{
                      background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                      fontWeight: 900,
                      fontSize: 18,
                      boxShadow: "0 3px 8px rgba(79, 70, 229, 0.3)"
                    }}
                  >
                    {currentEmp?.name?.[0] || "U"}
                  </Avatar>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
                      {userRecord?.name || fb.submitted_by || fb.name || currentEmp.name}
                      <span style={{ fontFamily: "monospace", fontSize: 12, background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: 6, fontWeight: 800 }}>
                        {userRecord?.emp_id || fb.emp_id || currentEmp.id}
                      </span>
                      <Tag color="cyan" style={{ margin: 0, fontWeight: 700, borderRadius: 4 }}>
                        {userRecord?.dept || fb.dept || currentEmp.dept}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      <span>📧 {userRecord?.email || fb.email || currentEmp.email}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", fontSize: 12, color: "#475569" }}>
                  <div>⏱️ <strong>Shift Time:</strong> {fb.check_in_time || userRecord?.check_in || "09:00 AM"} {fb.check_out_time ? `- ${fb.check_out_time}` : (userRecord?.check_out ? `- ${userRecord.check_out}` : "")}</div>
                  <div style={{ marginTop: 4, color: "#64748b" }}>📅 <strong>Submitted on:</strong> {fb.submitted_at || "Event Completion"}</div>
                </div>
              </div>

              {/* Key KPI Stats Cards */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <div style={{
                    background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: "1px solid #ddd6fe",
                    boxShadow: "0 2px 6px rgba(124, 58, 237, 0.04)"
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#6d28d9", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Volunteer Hours Claimed
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#4c1d95", marginTop: 4 }}>
                      {hoursVal} <span style={{ fontSize: 14, fontWeight: 700 }}>hrs</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 4, fontWeight: 700 }}>
                      {userRecord?.status === "Attended" ? "✓ Verified Check-in" : "Self-Reported Attendance"}
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={8}>
                  <div style={{
                    background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: "1px solid #fde68a",
                    boxShadow: "0 2px 6px rgba(217, 119, 6, 0.04)"
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#b45309", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Experience & Satisfaction
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <Rate disabled value={fb.rating || 5} style={{ color: "#f59e0b", fontSize: 18 }} />
                      <span style={{ fontSize: 17, fontWeight: 900, color: "#b45309" }}>
                        {fb.rating || 5}.0
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#d97706", marginTop: 4, fontWeight: 700 }}>
                      {(fb.rating || 5) >= 5 ? "🌟 Highly Satisfied" : "👍 Positive Experience"}
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={8}>
                  <div style={{
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: "1px solid #bbf7d0",
                    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.04)"
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Admin Review & Points
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#166534", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      {fb.verification_status === "Approved" ? (
                        <>
                          <CheckCircleOutlined style={{ color: "#16a34a" }} />
                          <span>Hours Verified & Credited</span>
                        </>
                      ) : fb.verification_status === "Approved with Adjustment" ? (
                        <>
                          <EditOutlined style={{ color: "#0891b2" }} />
                          <span>Adjusted & Credited</span>
                        </>
                      ) : fb.verification_status === "Revision Requested" ? (
                        <>
                          <CloseCircleOutlined style={{ color: "#dc2626" }} />
                          <span>Revision Requested</span>
                        </>
                      ) : (
                        <>
                          <ClockCircleOutlined style={{ color: "#d97706" }} />
                          <span>Awaiting Admin Verification</span>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>
                      CSR Points Earned: <strong>{((Number(hoursVal)) * 10)} pts</strong>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Key Learnings & Impact */}
              <div style={{
                background: "#ffffff",
                padding: "16px 20px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <AuditOutlined style={{ color: "#2563eb", fontSize: 16 }} />
                  Key Learnings & On-Ground Contribution
                </div>
                <div style={{
                  fontSize: 14,
                  color: "#334155",
                  background: "#f8fafc",
                  padding: "14px 18px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  lineHeight: 1.7
                }}>
                  {fb.learnings || "Contributed proactively to all assigned on-ground volunteering activities, supported beneficiary interactions, and completed event goals."}
                </div>
              </div>

              {/* Testimonial Quote */}
              {fb.testimonial && (
                <div style={{
                  background: "#fff1f2",
                  padding: "16px 20px",
                  borderRadius: 12,
                  borderLeft: "5px solid #e11d48",
                  border: "1px solid #ffe4e6",
                  boxShadow: "0 1px 3px rgba(225, 29, 72, 0.05)"
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#be123c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StarOutlined style={{ color: "#e11d48", fontSize: 16 }} />
                      Volunteer Testimonial / Story Quote
                    </div>
                    <Tag color="magenta" style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
                      ⭐ Impact Story Candidate
                    </Tag>
                  </div>
                  <div style={{
                    fontStyle: "italic",
                    color: "#334155",
                    fontSize: 14,
                    lineHeight: 1.7
                  }}>
                    “{fb.testimonial}”
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#9f1239", marginTop: 8 }}>
                    — {userRecord?.name || currentEmp.name}, {userRecord?.dept || currentEmp.dept}
                  </div>
                </div>
              )}

              {/* Attached Proof Photos & Documents Section */}
              <div style={{
                background: "#ffffff",
                padding: "18px 20px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PaperClipOutlined style={{ color: "#7c3aed", fontSize: 16 }} />
                    Attached Proofs, Photos & Verification Documents
                  </div>
                  <Tag color="purple" style={{ fontWeight: 800, fontSize: 12, padding: "2px 10px", borderRadius: 6, margin: 0 }}>
                    {photos.length + docs.length} Files Attached
                  </Tag>
                </div>

                {/* Photos Gallery */}
                {photos.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <PictureOutlined style={{ color: "#ea580c" }} />
                      On-Ground Activity Photos ({photos.length}) — <span style={{ fontWeight: 500, color: "#94a3b8" }}>Click to zoom and preview in lightbox</span>
                    </div>
                    <Image.PreviewGroup>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {photos.map((photoUrl, idx) => (
                          <div
                            key={idx}
                            style={{
                              position: "relative",
                              borderRadius: 10,
                              overflow: "hidden",
                              border: "1px solid #cbd5e1",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                              cursor: "pointer"
                            }}
                          >
                            <Image
                              src={photoUrl}
                              fallback={DEFAULT_IMAGE_FALLBACK}
                              alt={`Proof photo ${idx + 1}`}
                              width={130}
                              height={95}
                              style={{ objectFit: "cover", display: "block" }}
                            />
                          </div>
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  </div>
                )}

                {/* Verification Documents List */}
                {docs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <FilePdfOutlined style={{ color: "#dc2626" }} />
                      Uploaded Verification Files ({docs.length}):
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                      {docs.map((doc, idx) => {
                        const isPdf = doc.doc_type === "pdf";
                        const isImg = doc.doc_type === "image";
                        const isWord = doc.doc_type === "word";
                        const isExcel = doc.doc_type === "excel";
                        const isZip = doc.doc_type === "zip";
                        const isVideo = doc.doc_type === "video";

                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "#f8fafc",
                              padding: "12px 16px",
                              borderRadius: 10,
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                              <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: isPdf ? "#fee2e2" : isImg ? "#f3e8ff" : isVideo ? "#e0e7ff" : isWord ? "#dbeafe" : isExcel ? "#dcfce7" : "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isPdf ? "#dc2626" : isImg ? "#9333ea" : isVideo ? "#4338ca" : isWord ? "#2563eb" : isExcel ? "#16a34a" : "#64748b",
                                flexShrink: 0
                              }}>
                                {isPdf ? <FilePdfOutlined style={{ fontSize: 18 }} /> :
                                 isImg ? <FileImageOutlined style={{ fontSize: 18 }} /> :
                                 isVideo ? <VideoCameraOutlined style={{ fontSize: 18 }} /> :
                                 isWord ? <FileWordOutlined style={{ fontSize: 18 }} /> :
                                 isExcel ? <FileExcelOutlined style={{ fontSize: 18 }} /> :
                                 isZip ? <FileZipOutlined style={{ fontSize: 18 }} /> :
                                 <FileOutlined style={{ fontSize: 18 }} />}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }} title={doc.file_name}>
                                  {doc.file_name}
                                </div>
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                  {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB • ` : ""}{doc.doc_purpose || "Volunteer Proof"}
                                </div>
                              </div>
                            </div>

                            <Space size={6} style={{ marginLeft: 12, flexShrink: 0 }}>
                              {doc.file_path && (
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<EyeOutlined />}
                                  onClick={() => {
                                    if (isImg) {
                                      setDocPreviewModal({ open: true, url: doc.file_path, title: doc.file_name, isPdf: false, isImage: true });
                                    } else if (isPdf) {
                                      setDocPreviewModal({ open: true, url: doc.file_path, title: doc.file_name, isPdf: true, isImage: false });
                                    } else {
                                      window.open(doc.file_path, "_blank");
                                    }
                                  }}
                                  style={{
                                    borderRadius: 6,
                                    fontWeight: 700,
                                    fontSize: 12,
                                    background: "linear-gradient(135deg, #be185d 0%, #9d174d 100%)",
                                    borderColor: "#be185d",
                                    color: "#fff"
                                  }}
                                >
                                  View
                                </Button>
                              )}
                              {doc.file_path && (
                                <a
                                  href={doc.file_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={doc.file_name}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    background: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    color: "#334155",
                                    textDecoration: "none"
                                  }}
                                  title="Download File"
                                >
                                  <DownloadOutlined style={{ fontSize: 13 }} />
                                </a>
                              )}
                            </Space>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {photos.length === 0 && docs.length === 0 && (
                  <div style={{
                    padding: "20px 24px",
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: "1px dashed #cbd5e1",
                    fontSize: 13,
                    color: "#64748b",
                    textAlign: "center"
                  }}>
                    No additional photo or document attachments were submitted by the volunteer.
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* File Preview Modal */}
      <Modal
        open={docPreviewModal.open}
        onCancel={() => setDocPreviewModal({ open: false, url: "", title: "", isPdf: false, isImage: false })}
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              {docPreviewModal.isPdf ? <FilePdfOutlined style={{ color: "#dc2626" }} /> :
               docPreviewModal.isImage ? <PictureOutlined style={{ color: "#ea580c" }} /> :
               <FileOutlined style={{ color: "#2563eb" }} />}
              <span className="truncate" style={{ maxWidth: 500 }} title={docPreviewModal.title}>
                Document Preview: {docPreviewModal.title || "File"}
              </span>
            </div>
            {docPreviewModal.url && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<ExportOutlined />}
                onClick={() => window.open(docPreviewModal.url, "_blank")}
                style={{ borderRadius: 6, fontWeight: 700 }}
              >
                Open in New Tab ↗
              </Button>
            )}
          </div>
        }
        width={"80vw"}
        style={{ top: 20, maxWidth: 1100 }}
        destroyOnHidden={true}
        footer={[
          <Button
            key="open_tab"
            icon={<ExportOutlined />}
            onClick={() => window.open(docPreviewModal.url, "_blank")}
            style={{ borderRadius: 8, fontWeight: 600, marginRight: 8 }}
          >
            Open in New Window
          </Button>,
          <a
            key="download"
            href={docPreviewModal.url}
            target="_blank"
            rel="noopener noreferrer"
            download={docPreviewModal.title}
            style={{ marginRight: 8 }}
          >
            <Button icon={<DownloadOutlined />} type="primary" ghost style={{ borderRadius: 8, fontWeight: 600 }}>
              Download Original File
            </Button>
          </a>,
          <Button
            key="close"
            type="primary"
            onClick={() => setDocPreviewModal({ open: false, url: "", title: "", isPdf: false, isImage: false })}
            style={{ borderRadius: 8, fontWeight: 600, background: "#8B1D42", borderColor: "#8B1D42" }}
          >
            Close Preview
          </Button>
        ]}
      >
        <div style={{ minHeight: 520, display: "flex", flexDirection: "column", background: "#f8fafc", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {docPreviewModal.isPdf ? (
            <object
              data={`${docPreviewModal.url}#toolbar=1&navpanes=0`}
              type="application/pdf"
              style={{ width: "100%", height: "70vh", minHeight: 520, border: "none" }}
            >
              <iframe
                src={`${docPreviewModal.url}#toolbar=1`}
                title={docPreviewModal.title}
                style={{ width: "100%", height: "70vh", minHeight: 520, border: "none" }}
              >
                <div style={{ padding: 40, textAlign: "center" }}>
                  <FilePdfOutlined style={{ fontSize: 48, color: "#dc2626", marginBottom: 16 }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{docPreviewModal.title}</div>
                  <p style={{ color: "#64748b", margin: "12px 0 20px 0" }}>
                    Your browser does not support embedded PDF previews in this window.
                  </p>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ExportOutlined />}
                    onClick={() => window.open(docPreviewModal.url, "_blank")}
                    style={{ background: "#dc2626", borderColor: "#dc2626", fontWeight: 700, borderRadius: 8 }}
                  >
                    Open PDF in New Window
                  </Button>
                </div>
              </iframe>
            </object>
          ) : docPreviewModal.isImage ? (
            <div style={{ padding: 20, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 480 }}>
              <img
                src={docPreviewModal.url}
                alt={docPreviewModal.title}
                style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 60 }}>
              <FileOutlined style={{ fontSize: 54, color: "#94a3b8", marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{docPreviewModal.title}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>This file format can be viewed directly by opening in a new tab or downloading.</div>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12 }}>
                <Button type="primary" size="large" icon={<ExportOutlined />} onClick={() => window.open(docPreviewModal.url, "_blank")} style={{ fontWeight: 700, borderRadius: 8 }}>
                  Open in New Window
                </Button>
                <a href={docPreviewModal.url} target="_blank" rel="noopener noreferrer" download={docPreviewModal.title}>
                  <Button size="large" icon={<DownloadOutlined />} style={{ fontWeight: 700, borderRadius: 8 }}>
                    Download File
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Full WordPress-Style Impact Story Reader Modal with Verified Comments & Live Likes */}
      <Modal
        open={isStoryReaderOpen}
        onCancel={() => {
          setIsStoryReaderOpen(false);
          setSelectedStoryForModal(null);
        }}
        width={880}
        footer={null}
        style={{ top: 20 }}
        destroyOnHidden={true}
      >
        {selectedStoryForModal && (() => {
          const story = selectedStoryForModal;
          const highlights = Array.isArray(story.impact_highlights)
            ? story.impact_highlights
            : typeof story.impact_highlights === "string"
            ? (() => {
                try {
                  return JSON.parse(story.impact_highlights);
                } catch {
                  return story.impact_highlights.split("\n").filter(Boolean);
                }
              })()
            : [];

          const tags = Array.isArray(story.tags)
            ? story.tags
            : typeof story.tags === "string"
            ? (() => {
                try {
                  return JSON.parse(story.tags);
                } catch {
                  return story.tags.split(",").map((t) => t.trim()).filter(Boolean);
                }
              })()
            : [];

          const paragraphs = (story.story_content || "")
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean);

          const hasLiked = story.user_has_liked;

          return (
            <div className="max-h-[85vh] overflow-y-auto pr-1">
              {/* Header Cover Banner */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 20,
                  maxHeight: 340,
                  background: "#0f172a"
                }}
              >
                <img
                  src={resolveDocUrl(story.cover_image) || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop"}
                  alt={story.story_title}
                  style={{ width: "100%", maxHeight: 340, objectFit: "cover" }}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.2) 60%, transparent 100%)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "24px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Tag color="#7c3aed" style={{ borderRadius: 6, fontWeight: 700, margin: 0 }}>
                      {story.event_category || "CSR Impact Story"}
                    </Tag>
                    <span style={{ color: "#e2e8f0", fontSize: 12 }}>
                      ⏱️ {story.read_time_minutes || 3} min read
                    </span>
                    {story.user_is_attendee && (
                      <Tag color="#10b981" style={{ borderRadius: 6, fontWeight: 700, margin: 0 }}>
                        <CheckCircleFilled /> Verified Event Attendee
                      </Tag>
                    )}
                  </div>
                  <h1 style={{ color: "#ffffff", fontSize: 24, fontWeight: 900, lineHeight: 1.3, margin: 0 }}>
                    {story.story_title}
                  </h1>
                </div>
              </div>

              {/* Author Info Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#f8fafc",
                  borderRadius: 10,
                  marginBottom: 20,
                  border: "1px solid #e2e8f0"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar size={40} style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", fontWeight: 700 }}>
                    {story.author_name?.charAt(0) || "A"}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{story.author_name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {story.author_role || "Impact Lead"} • Published on {formatEventDate(story.published_at || story.created_at)}
                    </div>
                  </div>
                </div>

                {/* Event Tag */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag color="cyan" style={{ borderRadius: 6, padding: "4px 10px", fontWeight: 700, margin: 0 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {story.event_display_title || story.event_title || "Volunteering Event"}
                  </Tag>
                </div>
              </div>

              {/* Lead Excerpt */}
              {story.excerpt && (
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.6,
                    color: "#334155",
                    padding: "16px 20px",
                    background: "#fdf4ff",
                    borderLeft: "4px solid #a855f7",
                    borderRadius: "0 10px 10px 0",
                    marginBottom: 20
                  }}
                >
                  {story.excerpt}
                </div>
              )}

              {/* Pull Quote Block */}
              {story.featured_quote && (
                <div
                  style={{
                    padding: "20px 24px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    margin: "20px 0",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: 24, color: "#a855f7", marginBottom: 4 }}>❝</div>
                  <div style={{ fontSize: 16, fontStyle: "italic", fontWeight: 600, color: "#1e293b", lineHeight: 1.6 }}>
                    {story.featured_quote}
                  </div>
                  {story.quote_attribution && (
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>
                      — {story.quote_attribution}
                    </div>
                  )}
                </div>
              )}

              {/* Story Narrative Content */}
              <div style={{ fontSize: 15, lineHeight: 1.8, color: "#1e293b", marginBottom: 24 }}>
                {paragraphs.map((para, pIdx) => (
                  <p key={pIdx} style={{ marginBottom: 16 }}>
                    {para}
                  </p>
                ))}
              </div>

              {/* Photo Gallery Grid */}
              {Array.isArray(story.gallery_images) && story.gallery_images.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <PictureOutlined style={{ color: "#7c3aed" }} />
                    On-Ground Activity Photo Gallery ({story.gallery_images.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                    {story.gallery_images.map((gImg, gIdx) => {
                      const gSrc = resolveDocUrl(typeof gImg === "object" ? gImg.file_path || gImg.url : gImg);
                      return (
                        <Image
                          key={gIdx}
                          src={gSrc}
                          alt={`Gallery photo ${gIdx + 1}`}
                          style={{ borderRadius: 10, objectFit: "cover", width: "100%", height: 110, border: "1px solid #e2e8f0" }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Impact Key Metrics Highlights */}
              {highlights.length > 0 && (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "linear-gradient(135deg, #fdf2f8 0%, #ede9fe 100%)",
                    borderRadius: 12,
                    border: "1px solid #ddd6fe",
                    marginBottom: 24
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#581c87", fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <TrophyOutlined style={{ color: "#7c3aed" }} />
                    Verified Social & Environmental Impact Metrics
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {highlights.map((hl, hIdx) => (
                      <div
                        key={hIdx}
                        style={{
                          background: "#ffffff",
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#6b21a8",
                          border: "1px solid #e9d5ff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.03)"
                        }}
                      >
                        🎯 {hl}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Likes & Social Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  marginBottom: 24
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Button
                    size="large"
                    type={hasLiked ? "primary" : "default"}
                    danger={hasLiked}
                    loading={likingStoryId === story.id}
                    icon={hasLiked ? <HeartFilled /> : <HeartOutlined />}
                    onClick={() => handleToggleLike(story.id)}
                    style={{
                      borderRadius: 8,
                      fontWeight: 700,
                      background: hasLiked ? "#e11d48" : "#ffffff",
                      borderColor: hasLiked ? "#e11d48" : "#cbd5e1"
                    }}
                  >
                    {hasLiked ? `Liked (${story.like_count || 0})` : `Like Story (${story.like_count || 0})`}
                  </Button>

                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                    <MessageOutlined style={{ marginRight: 6 }} />
                    {storyComments.length} Volunteer Reflections
                  </span>
                </div>

                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {tags.map((t, idx) => (
                      <Tag key={idx} style={{ borderRadius: 6, fontSize: 11, margin: 0 }}>
                        #{t}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments & Volunteer Reflections Thread */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <MessageOutlined style={{ color: "#7c3aed" }} />
                    Volunteer Community Reflections ({storyComments.length})
                  </h3>
                </div>

                {/* Attendee Status Banner */}
                {story.user_is_attendee ? (
                  <Alert
                    message="✨ You attended this event! Your reflections will be highlighted with a Verified Attendee badge."
                    type="success"
                    showIcon
                    style={{ borderRadius: 8, marginBottom: 16 }}
                  />
                ) : (
                  <Alert
                    message="Reflections from attendees and corporate volunteers who participated in this initiative."
                    type="info"
                    showIcon
                    style={{ borderRadius: 8, marginBottom: 16 }}
                  />
                )}

                {/* Post New Comment */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                  <Avatar
                    size={38}
                    style={{
                      background: "linear-gradient(135deg, #8B1D42 0%, #e11d48 100%)",
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    {currentEmp.name?.charAt(0) || "U"}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Input.TextArea
                      rows={3}
                      value={storyCommentText}
                      onChange={(e) => setStoryCommentText(e.target.value)}
                      placeholder="Share your personal reflections, key memories, or words of encouragement with fellow volunteers..."
                      style={{ borderRadius: 8, marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={isSubmittingComment}
                        onClick={handlePostComment}
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          background: "#7c3aed",
                          borderColor: "#7c3aed"
                        }}
                      >
                        Post Reflection
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                {storyComments.length === 0 ? (
                  <div
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      background: "#f8fafc",
                      borderRadius: 10,
                      border: "1px dashed #cbd5e1",
                      color: "#64748b",
                      fontSize: 13
                    }}
                  >
                    No reflections posted yet. Be the first volunteer to share your thoughts on this story!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {storyComments.map((comment) => (
                      <div
                        key={comment.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "14px 16px",
                          background: comment.is_attendee ? "#fdf4ff" : "#f8fafc",
                          borderRadius: 10,
                          border: comment.is_attendee ? "1px solid #f0abfc" : "1px solid #e2e8f0"
                        }}
                      >
                        <Avatar
                          size={36}
                          style={{
                            background: comment.is_attendee ? "#7c3aed" : "#64748b",
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          {comment.user_name?.charAt(0) || "V"}
                        </Avatar>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                              {comment.user_name}
                            </span>
                            {comment.user_dept && (
                              <span style={{ fontSize: 11, color: "#64748b" }}>
                                • {comment.user_dept}
                              </span>
                            )}
                            {comment.is_attendee && (
                              <Tag color="gold" icon={<CheckCircleFilled />} style={{ fontSize: 10, borderRadius: 4, fontWeight: 700, margin: 0 }}>
                                Verified Attendee
                              </Tag>
                            )}
                            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
                              {formatEventDate(comment.created_at)}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                            {comment.comment_text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

/**
 * Enhanced Post-Event Volunteer Attendance, Hours & Impact Feedback Modal
 */
function VolunteerFeedbackModal(props) {
  if (!props.open || !props.event) return null;
  return <VolunteerFeedbackModalContent {...props} />;
}

function VolunteerFeedbackModalContent({ open, onCancel, event, currentEmp, onSubmitSuccess }) {
  const [form] = Form.useForm();
  const [imageList, setImageList] = useState([]);
  const [videoList, setVideoList] = useState([]);
  const [docList, setDocList] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");

  const existingSubmission = useMemo(() => {
    return (event?.volunteers || []).find(v => v.emp_id === currentEmp.id || v.name === currentEmp.name || v.email === currentEmp.email)?.feedback_form;
  }, [event, currentEmp]);

  useEffect(() => {
    if (open && event) {
      // Default check-in and check-out to event date + start/end time if available
      const rawDate = event.start_date || event.event_date;
      const evtDate = rawDate ? dayjs(rawDate) : dayjs();
      const defaultCheckIn = existingSubmission?.check_in_time ? dayjs(existingSubmission.check_in_time) : evtDate.hour(9).minute(0);
      const defaultCheckOut = existingSubmission?.check_out_time ? dayjs(existingSubmission.check_out_time) : evtDate.hour(17).minute(0);

      form.setFieldsValue({
        check_in_time: defaultCheckIn,
        check_out_time: defaultCheckOut,
        hours: existingSubmission?.hours || 4.5,
        rating: existingSubmission?.rating || 5,
        learnings: existingSubmission?.learnings || "",
        testimonial: existingSubmission?.testimonial || ""
      });

      if (existingSubmission?.photos && Array.isArray(existingSubmission.photos)) {
        setImageList(existingSubmission.photos.map((p, idx) => ({ uid: `img-${idx}`, name: typeof p === 'string' ? p.split('/').pop() : p.name || 'photo.jpg', url: typeof p === 'string' ? p : p.url })));
      }
      if (existingSubmission?.videos && Array.isArray(existingSubmission.videos)) {
        setVideoList(existingSubmission.videos.map((v, idx) => ({ uid: `vid-${idx}`, name: typeof v === 'string' ? v.split('/').pop() : v.name || 'video.mp4', url: typeof v === 'string' ? v : v.url })));
      }
      if (existingSubmission?.attachments && Array.isArray(existingSubmission.attachments)) {
        setDocList(existingSubmission.attachments.map((d, idx) => ({ uid: `doc-${idx}`, name: typeof d === 'string' ? d.split('/').pop() : d.name || 'document.pdf', url: typeof d === 'string' ? d : d.url })));
      }
    }
  }, [open, event, existingSubmission, form]);

  // Auto calculate hours when Check-in or Check-out changes
  const handleTimeChange = () => {
    const checkIn = form.getFieldValue("check_in_time");
    const checkOut = form.getFieldValue("check_out_time");
    if (checkIn && checkOut && dayjs.isDayjs(checkIn) && dayjs.isDayjs(checkOut)) {
      const diffMinutes = checkOut.diff(checkIn, "minute");
      if (diffMinutes > 0) {
        const calculatedHours = Math.max(0.5, Math.round((diffMinutes / 60) * 10) / 10);
        form.setFieldsValue({ hours: calculatedHours });
      }
    }
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      const allVideos = [...videoList.map(f => f.name || f.url)];
      if (videoUrl.trim()) {
        allVideos.push(videoUrl.trim());
      }

      const rawImageFiles = imageList
        .map(f => f.originFileObj || (f instanceof File ? f : null))
        .filter(Boolean);
      const rawVideoFiles = videoList
        .map(f => f.originFileObj || (f instanceof File ? f : null))
        .filter(Boolean);
      const rawDocFiles = docList
        .map(f => f.originFileObj || (f instanceof File ? f : null))
        .filter(Boolean);

      onSubmitSuccess({
        ...values,
        rawImageFiles,
        rawVideoFiles,
        rawDocFiles,
        photos: imageList.map(f => f.url || f.name),
        videos: allVideos,
        uploaded_documents: docList.map(f => f.name || f.url)
      });
    } catch (err) {
      console.error("Form validation failed:", err);
    }
  };

  const isEditing = Boolean(existingSubmission);

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
          <FormOutlined style={{ color: "#8B1D42" }} />
          {isEditing ? "Update & Re-Submit Attendance & Hours: " : "Submit Event Attendance & Hours: "} {event?.event_name}
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleFinish}
      okText={isEditing ? "Save & Update Submission" : "Submit Attendance & Feedback"}
      okButtonProps={{ style: { background: "#8B1D42", borderColor: "#8B1D42", fontWeight: 700 } }}
      width={780}
      destroyOnHidden={true}
    >
      <Alert
        message={
          <span>
            Enter your actual <strong>Check-in</strong> and <strong>Check-out</strong> date/time, star rating, learnings, and upload photos/videos of your participation.
          </span>
        }
        type="info"
        showIcon
        style={{ marginTop: 8, marginBottom: 16, borderRadius: 8 }}
      />

      <Form
        form={form}
        layout="vertical"
      >
        {/* Check-in & Check-out Date & Time */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={<span style={{ fontWeight: 700 }}>📅 Check-in Date & Time</span>}
              name="check_in_time"
              rules={[{ required: true, message: "Please select check-in time" }]}
            >
              <DatePicker
                showTime={{ format: 'hh:mm A' }}
                format="YYYY-MM-DD hh:mm A"
                style={{ width: "100%", borderRadius: 6 }}
                onChange={handleTimeChange}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={<span style={{ fontWeight: 700 }}>🏁 Check-out Date & Time</span>}
              name="check_out_time"
              rules={[{ required: true, message: "Please select check-out time" }]}
            >
              <DatePicker
                showTime={{ format: 'hh:mm A' }}
                format="YYYY-MM-DD hh:mm A"
                style={{ width: "100%", borderRadius: 6 }}
                onChange={handleTimeChange}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={<span style={{ fontWeight: 700 }}>⏱ Contributed Volunteer Hours</span>}
              name="hours"
              rules={[{ required: true, message: "Please enter hours contributed" }]}
              extra="Auto-calculated from Check-in / Check-out duration"
            >
              <InputNumber min={0.5} max={24} step={0.5} style={{ width: "100%", borderRadius: 6 }} placeholder="e.g. 4.5" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={<span style={{ fontWeight: 700 }}>⭐ Event Experience Rating</span>}
              name="rating"
              rules={[{ required: true }]}
            >
              <Rate allowHalf style={{ color: "#f59e0b" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={<span style={{ fontWeight: 700 }}>💡 Key Learnings & Activities Performed</span>}
          name="learnings"
          rules={[{ required: true, message: "Please describe your activities and learnings" }]}
        >
          <Input.TextArea
            rows={3}
            style={{ borderRadius: 6 }}
            placeholder="Describe what activities you performed, outcomes achieved, and your personal experience..."
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 700 }}>💬 Quote / Testimonial for CSR Report (Optional)</span>}
          name="testimonial"
        >
          <Input.TextArea
            rows={2}
            style={{ borderRadius: 6 }}
            placeholder="Share an inspiring quote or reflection that can be featured in company CSR impact reports..."
          />
        </Form.Item>

        <Divider style={{ margin: "16px 0 12px" }}>📸 Event Media & Documents</Divider>

        <Row gutter={16}>
          {/* Photos Upload */}
          <Col xs={24} sm={12}>
            <Form.Item label={<span style={{ fontWeight: 700 }}><PictureOutlined style={{ color: "#8B1D42" }} /> Upload Event Photos (PNG, JPG)</span>}>
              <Upload
                multiple
                listType="picture"
                fileList={imageList}
                onChange={({ fileList }) => setImageList(fileList)}
                beforeUpload={() => false}
                accept="image/*"
              >
                <Button icon={<CameraOutlined />} style={{ width: "100%", borderRadius: 6 }}>
                  Select Photos
                </Button>
              </Upload>
            </Form.Item>
          </Col>

          {/* Videos Upload */}
          <Col xs={24} sm={12}>
            <Form.Item label={<span style={{ fontWeight: 700 }}><VideoCameraOutlined style={{ color: "#2563eb" }} /> Upload Event Videos (MP4, MOV)</span>}>
              <Upload
                multiple
                fileList={videoList}
                onChange={({ fileList }) => setVideoList(fileList)}
                beforeUpload={() => false}
                accept="video/*"
              >
                <Button icon={<VideoCameraOutlined />} style={{ width: "100%", borderRadius: 6 }}>
                  Select Video Clips
                </Button>
              </Upload>
            </Form.Item>
          </Col>

          {/* Supporting Documents */}
          <Col span={24}>
            <Form.Item label={<span style={{ fontWeight: 700 }}><FilePdfOutlined style={{ color: "#dc2626" }} /> Certificates / Supporting Documents (PDF, DOC)</span>}>
              <Upload
                multiple
                fileList={docList}
                onChange={({ fileList }) => setDocList(fileList)}
                beforeUpload={() => false}
                accept=".pdf,.doc,.docx"
              >
                <Button icon={<InboxOutlined />} style={{ borderRadius: 6 }}>
                  Attach Documents / Certificates
                </Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

