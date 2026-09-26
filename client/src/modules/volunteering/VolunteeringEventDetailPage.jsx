// client/src/modules/volunteering/VolunteeringEventDetailPage.jsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Tag,
  Button,
  Progress,
  Space,
  Table,
  Timeline,
  Avatar,
  Divider,
  Spin,
  message,
  Tooltip,
  Breadcrumb,
  Rate,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Alert,
  Tabs,
  Popconfirm,
  Image,
  Badge
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  PictureOutlined,
  AuditOutlined,
  ReadOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  BankOutlined,
  AimOutlined,
  CompassOutlined,
  GlobalOutlined,
  QrcodeOutlined,
  BranchesOutlined,
  SendOutlined,
  RocketOutlined,
  FileTextOutlined,
  StarOutlined,
  BellOutlined,
  EyeOutlined,
  ExportOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  CheckOutlined,
  CloseOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileOutlined,
  FullscreenOutlined,
  TrophyOutlined,
  VideoCameraOutlined
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { getUser } from "@/context/AuthContext";
import { INITIAL_EVENTS, EVENT_TYPES, CSR_THEMES, APPROVAL_STATUSES, ALL_COMPANY_EMPLOYEES } from "./constants/volunteeringConstants";
import { dynamicGeneralListViewAPI } from "@/services/dynamicForm-service";
import {
  getVolunteeringEventByIdAPI,
  updateVolunteerAttendanceAPI,
  updateEventStatusAPI,
  publishVolunteeringEventAPI,
  saveEventClosureAPI,
  saveEventStoryAPI
} from "@/services/volunteering-service";
import "./volunteering.css";

// Official Form Approval Panel from /admin/auth/approval-path/
import FormApprovalPanel from "@/modules/form-approval/FormApprovalPanel";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";

// Lifecycle Modals
import VolunteeringAttendanceModal from "./components/VolunteeringAttendanceModal";
import VolunteeringClosureModal from "./components/VolunteeringClosureModal";
import VolunteeringStoryModal from "./components/VolunteeringStoryModal";
import { hasModulePermissions } from "@/context/PermissionContext";

export default function VolunteeringEventDetailPage({ eventId }) {
  const router = useRouter();
  const loggedInUser = getUser();

  // Dynamic Module Permissions for volunteering-event
  const eventPermissions = hasModulePermissions("volunteering-event");
  const canList = eventPermissions.includes("list");
  const canView = eventPermissions.includes("view");
  const canAdd = eventPermissions.includes("add");
  const canEdit = eventPermissions.includes("edit");
  const canDelete = eventPermissions.includes("delete");
  const canPublish = eventPermissions.includes("publish");
  const canRegister = eventPermissions.includes("register");
  const canExport = eventPermissions.includes("export");

  const isAdminOrConfigurator = Boolean(
    loggedInUser?.isConfigurator ||
    loggedInUser?.role_slug === "superadmin" ||
    loggedInUser?.role_slug === "admin" ||
    loggedInUser?.role_slug === "configurator" ||
    loggedInUser?.role_id === 1 ||
    loggedInUser?.role_id === 2 ||
    canEdit ||
    canPublish
  );

  const [msgApi, msgContextHolder] = message.useMessage();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workflowState, setWorkflowState] = useState(null);

  // Modals state
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isClosureOpen, setIsClosureOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Enrolment table filter state (Default to Form Submitted or Accepted)
  const [volunteerStatusFilter, setVolunteerStatusFilter] = useState("FORM_SUBMITTED");

  // Attendee Form View Modal
  const [selectedAttendeeForm, setSelectedAttendeeForm] = useState(null);
  const [isAttendeeFormOpen, setIsAttendeeFormOpen] = useState(false);

  // In-App Document / PDF / Image Quick Preview Modal
  const [docPreviewModal, setDocPreviewModal] = useState({ open: false, url: "", title: "", isPdf: false, isImage: false });

  // Adjust Hours & Review Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedAdjustVolunteer, setSelectedAdjustVolunteer] = useState(null);

  // Load event details
  const fetchEventData = async () => {
    try {
      setLoading(true);
      // 1. Try dedicated dynamic backend API
      const serverRes = await getVolunteeringEventByIdAPI(eventId).catch(() => null);
      if (serverRes?.data?.data) {
        setEvent({ ...serverRes.data.data, id: eventId || serverRes.data.data.id });
        return;
      }

      // 2. Fallback to generic dynamic form list API
      const res = await dynamicGeneralListViewAPI({
        form_slug: "volunteering_event",
        page: 1,
        limit: 100,
      }).catch((err) => null);
      const dataList = res?.data?.data || res?.data?.rows || [];
      const numId = Number(eventId);
      const found = dataList.find(e => String(e.id) === String(eventId) || String(e.event_id) === String(eventId))
        || INITIAL_EVENTS.find(e => String(e.id) === String(eventId) || String(e.event_id) === String(eventId) || String(e.id) === String(numId + 100))
        || (numId > 0 && numId <= INITIAL_EVENTS.length ? INITIAL_EVENTS[numId - 1] : null)
        || INITIAL_EVENTS[0];
      setEvent({ ...found, id: eventId || found.id });
    } catch (err) {
      const numId = Number(eventId);
      const fallback = INITIAL_EVENTS.find(e => String(e.id) === String(eventId) || String(e.event_id) === String(eventId) || String(e.id) === String(numId + 100))
        || (numId > 0 && numId <= INITIAL_EVENTS.length ? INITIAL_EVENTS[numId - 1] : null)
        || INITIAL_EVENTS[0];
      setEvent({ ...fallback, id: eventId || fallback.id });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const handleUpdateEvent = async (updatedId, updates) => {
    setEvent(prev => (prev ? { ...prev, ...updates } : prev));
    try {
      await updateVolunteeringEventAPI(eventId || updatedId, updates).catch(() => null);
    } catch (e) {}
  };

  const scrollToApproval = () => {
    const el = document.getElementById("event-approval-workflow-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Publish Event Handler
  const handlePublishEvent = async () => {
    try {
      const res = await publishVolunteeringEventAPI(eventId || event.id);
      if (res?.data?.success) {
        msgApi.success(res.data.message || "🚀 Event published successfully! Broadcast notifications sent to all employees.");
      }
    } catch (e) {
      if (e?.response?.data?.message) {
        msgApi.warning(e.response.data.message);
      }
    }

    const updated = {
      ...event,
      approval_status: "PUBLISHED",
      published_at: new Date().toLocaleString()
    };
    setEvent(updated);
    fetchEventData();
  };

  // Submit / Resend for approval handler
  const handleSubmitForApproval = async () => {
    try {
      await submitEventForApprovalAPI(eventId || event.id).catch(() => null);
    } catch (e) {}

    const updated = {
      ...event,
      approval_status: "PENDING_APPROVAL"
    };
    setEvent(updated);
    msgApi.success("✅ Event submitted for approval! Approval workflow initiated.");
  };


  // Quick mark attendance toggle
  const handleToggleAttendance = async (volunteerId) => {
    const currentList = Array.isArray(event.volunteers) && event.volunteers.length > 0 ? event.volunteers : ALL_COMPANY_EMPLOYEES;
    let nextStatus = "Attended";
    let updatedHours = 4;
    let updatedCheckIn = "08:30 AM";

    const updatedVolunteers = currentList.map(v => {
      if (v.id === volunteerId || v.emp_id === volunteerId) {
        nextStatus = v.status === "Attended" ? "Accepted" : "Attended";
        updatedCheckIn = nextStatus === "Attended" ? (v.check_in || "08:30 AM") : null;
        updatedHours = nextStatus === "Attended" ? (v.hours || 4) : 0;
        return {
          ...v,
          status: nextStatus,
          check_in: updatedCheckIn,
          hours: updatedHours
        };
      }
      return v;
    });

    const attendedCount = updatedVolunteers.filter(v => v.status === "Attended").length;
    setEvent({
      ...event,
      volunteers: updatedVolunteers,
      attended_count: attendedCount
    });

    try {
      await updateVolunteerAttendanceAPI(eventId || event.id, volunteerId, {
        status: nextStatus,
        check_in: updatedCheckIn,
        hours: updatedHours
      }).catch(() => null);
    } catch (e) {}

    msgApi.success("Attendance status updated.");
  };

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

  const DEFAULT_IMAGE_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120' viewBox='0 0 160 120'><rect width='160' height='120' fill='%23f1f5f9' rx='8'/><circle cx='80' cy='50' r='18' fill='%23cbd5e1'/><rect x='35' y='76' width='90' height='14' rx='4' fill='%23cbd5e1'/><text x='80' y='108' font-family='sans-serif' font-size='10' font-weight='bold' fill='%2394a3b8' text-anchor='middle'>PROOF PHOTO</text></svg>";

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

  // Helper to check if volunteer has submitted actual feedback
  const hasFeedbackForm = (v) => {
    if (!v || !v.feedback_form) return false;
    if (typeof v.feedback_form === "string") {
      try {
        const parsed = JSON.parse(v.feedback_form);
        return Boolean(parsed && typeof parsed === "object" && Object.keys(parsed).length > 0 && (parsed.rating !== undefined || parsed.learnings || parsed.testimonial || parsed.hours !== undefined || parsed.submitted_at));
      } catch (e) {
        return false;
      }
    }
    if (typeof v.feedback_form === "object") {
      return Boolean(Object.keys(v.feedback_form).length > 0 && (v.feedback_form.rating !== undefined || v.feedback_form.learnings || v.feedback_form.testimonial || v.feedback_form.hours !== undefined || v.feedback_form.submitted_at));
    }
    return false;
  };

  // Admin Action: Approve Form Submission & Credit Hours
  const handleApproveFormSubmission = async (record) => {
    const currentList = Array.isArray(event.volunteers) && event.volunteers.length > 0 ? event.volunteers : ALL_COMPANY_EMPLOYEES;
    const volId = record.id || record.emp_id;
    const targetHours = record.feedback_form?.hours || record.hours || 4.0;

    const updatedVolunteers = currentList.map(v => {
      if (v.id === volId || v.emp_id === volId) {
        const existingFb = typeof v.feedback_form === "object" && v.feedback_form ? v.feedback_form : {};
        return {
          ...v,
          status: "Attended",
          hours: targetHours,
          feedback_form: {
            ...existingFb,
            verification_status: "Approved",
            verified_hours: targetHours,
            verified_at: new Date().toLocaleString()
          }
        };
      }
      return v;
    });

    const updatedEvent = {
      ...event,
      volunteers: updatedVolunteers,
      attended_count: updatedVolunteers.filter(v => v.status === "Attended").length
    };
    setEvent(updatedEvent);

    if (selectedAttendeeForm && (selectedAttendeeForm.id === volId || selectedAttendeeForm.emp_id === volId)) {
      setSelectedAttendeeForm({
        ...selectedAttendeeForm,
        status: "Attended",
        hours: targetHours,
        feedback_form: {
          ...(typeof selectedAttendeeForm.feedback_form === "object" ? selectedAttendeeForm.feedback_form : {}),
          verification_status: "Approved",
          verified_hours: targetHours,
          verified_at: new Date().toLocaleString()
        }
      });
    }

    try {
      await updateVolunteerAttendanceAPI(eventId || event.id, volId, {
        status: "Attended",
        hours: targetHours,
        feedback_form: {
          ...(typeof record.feedback_form === "object" ? record.feedback_form : {}),
          verification_status: "Approved",
          verified_hours: targetHours,
          verified_at: new Date().toLocaleString()
        }
      }).catch(() => null);
    } catch (e) {}

    msgApi.success(`✅ Volunteer form for ${record.name} approved & ${targetHours} hrs credited!`);
  };

  // Admin Action: Open Adjust Hours Modal
  const handleOpenAdjustModal = (record) => {
    setSelectedAdjustVolunteer(record);
    setIsAdjustModalOpen(true);
  };

  // Admin Action: Save Adjusted Hours & Review Notes
  const handleSaveAdjustHours = async (values) => {
    if (!selectedAdjustVolunteer) return;
    const currentList = Array.isArray(event.volunteers) && event.volunteers.length > 0 ? event.volunteers : ALL_COMPANY_EMPLOYEES;
    const volId = selectedAdjustVolunteer.id || selectedAdjustVolunteer.emp_id;
    const newHours = Number(values.hours) || 0;
    const newStatus = values.verification_status || "Approved";
    const notes = values.admin_notes || "";

    const updatedVolunteers = currentList.map(v => {
      if (v.id === volId || v.emp_id === volId) {
        const existingFb = typeof v.feedback_form === "object" && v.feedback_form ? v.feedback_form : {};
        return {
          ...v,
          status: "Attended",
          hours: newHours,
          feedback_form: {
            ...existingFb,
            hours: newHours,
            verification_status: newStatus,
            admin_notes: notes,
            verified_hours: newHours,
            verified_at: new Date().toLocaleString()
          }
        };
      }
      return v;
    });

    const updatedEvent = {
      ...event,
      volunteers: updatedVolunteers,
      attended_count: updatedVolunteers.filter(v => v.status === "Attended").length
    };
    setEvent(updatedEvent);

    if (selectedAttendeeForm && (selectedAttendeeForm.id === volId || selectedAttendeeForm.emp_id === volId)) {
      setSelectedAttendeeForm({
        ...selectedAttendeeForm,
        status: "Attended",
        hours: newHours,
        feedback_form: {
          ...(typeof selectedAttendeeForm.feedback_form === "object" ? selectedAttendeeForm.feedback_form : {}),
          hours: newHours,
          verification_status: newStatus,
          admin_notes: notes,
          verified_hours: newHours,
          verified_at: new Date().toLocaleString()
        }
      });
    }

    setIsAdjustModalOpen(false);

    try {
      await updateVolunteerAttendanceAPI(eventId || event.id, volId, {
        status: "Attended",
        hours: newHours,
        feedback_form: {
          ...(typeof selectedAdjustVolunteer.feedback_form === "object" ? selectedAdjustVolunteer.feedback_form : {}),
          hours: newHours,
          verification_status: newStatus,
          admin_notes: notes,
          verified_hours: newHours,
          verified_at: new Date().toLocaleString()
        }
      }).catch(() => null);
    } catch (e) {}

    msgApi.success(`Hours & review saved for ${selectedAdjustVolunteer.name} (${newHours} hrs).`);
  };

  // Admin Action: Request Revision
  const handleRequestRevision = async (record, reason = "Please revise submitted hours and learnings.") => {
    const currentList = Array.isArray(event.volunteers) && event.volunteers.length > 0 ? event.volunteers : ALL_COMPANY_EMPLOYEES;
    const volId = record.id || record.emp_id;

    const updatedVolunteers = currentList.map(v => {
      if (v.id === volId || v.emp_id === volId) {
        const existingFb = typeof v.feedback_form === "object" && v.feedback_form ? v.feedback_form : {};
        return {
          ...v,
          feedback_form: {
            ...existingFb,
            verification_status: "Revision Requested",
            admin_notes: reason
          }
        };
      }
      return v;
    });

    setEvent({ ...event, volunteers: updatedVolunteers });

    try {
      await updateVolunteerAttendanceAPI(eventId || event.id, volId, {
        feedback_form: {
          ...(typeof record.feedback_form === "object" ? record.feedback_form : {}),
          verification_status: "Revision Requested",
          admin_notes: reason
        }
      }).catch(() => null);
    } catch (e) {}

    msgApi.warning(`Revision requested from ${record.name}. Notification sent.`);
  };

  // Admin Action: Promote volunteer quote to Event Impact Story
  const handlePromoteToStory = async (record) => {
    const quote = record.feedback_form?.testimonial || record.feedback_form?.learnings || "";
    const updatedStory = {
      title: event.story?.title || `Community Impact: ${event.event_name}`,
      quote: quote,
      quote_author: `${record.name}, ${record.dept}`,
      narrative: record.feedback_form?.learnings || event.story?.narrative || "Volunteers mobilized across teams delivering impactful outcomes.",
      cover_image: event.story?.cover_image || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80"
    };

    const currentList = Array.isArray(event.volunteers) && event.volunteers.length > 0 ? event.volunteers : ALL_COMPANY_EMPLOYEES;
    const volId = record.id || record.emp_id;
    const updatedVolunteers = currentList.map(v => {
      if (v.id === volId || v.emp_id === volId) {
        const existingFb = typeof v.feedback_form === "object" && v.feedback_form ? v.feedback_form : {};
        return {
          ...v,
          feedback_form: {
            ...existingFb,
            verification_status: "Promoted to Story"
          }
        };
      }
      return v;
    });

    setEvent({
      ...event,
      story: updatedStory,
      volunteers: updatedVolunteers
    });

    try {
      await saveEventStoryAPI(eventId || event.id, updatedStory).catch(() => null);
      await updateVolunteerAttendanceAPI(eventId || event.id, volId, {
        feedback_form: {
          ...(typeof record.feedback_form === "object" ? record.feedback_form : {}),
          verification_status: "Promoted to Story"
        }
      }).catch(() => null);
    } catch (e) {}

    msgApi.success(`🌟 ${record.name}'s testimonial featured in Event Impact Story!`);
  };

  // Admin Action: Mark Accepted from Pending
  const handleAcceptVolunteer = async (volunteerId) => {
    const currentList = Array.isArray(event.volunteers) && event.volunteers.length > 0 ? event.volunteers : ALL_COMPANY_EMPLOYEES;
    const updatedVolunteers = currentList.map(v => {
      if (v.id === volunteerId || v.emp_id === volunteerId) {
        return { ...v, status: "Accepted" };
      }
      return v;
    });
    setEvent({
      ...event,
      volunteers: updatedVolunteers,
      registered_count: updatedVolunteers.filter(v => v.status === "Accepted" || v.status === "Attended").length
    });
    try {
      await updateVolunteerAttendanceAPI(eventId || event.id, volunteerId, { status: "Accepted" }).catch(() => null);
    } catch (e) {}
    msgApi.success("Employee marked as Accepted / Registered.");
  };

  // Admin Action: Send reminder to pending invite
  const handleSendReminder = (volunteer) => {
    msgApi.info(`📧 Reminder notification sent to ${volunteer.name} (${volunteer.email || volunteer.dept}).`);
  };

  // Save Edit Handler
  const handleSaveEdit = async (values) => {
    const updated = {
      ...event,
      ...values,
      total_budget: Number(values.total_budget) || event.total_budget,
      max_volunteers: Number(values.max_volunteers) || event.max_volunteers,
      min_volunteers: Number(values.min_volunteers) || event.min_volunteers
    };
    setEvent(updated);
    setIsEditOpen(false);

    try {
      await updateVolunteeringEventAPI(eventId || event.id, updated).catch(() => null);
    } catch (e) {}

    msgApi.success("Event details updated successfully.");
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    fetchEventData();
    msgApi.success("Event details updated successfully.");
  };

  if (loading || !event) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "#64748b", fontWeight: 600 }}>Loading Event Details...</div>
      </div>
    );
  }

  // Derive live status - PUBLISHED takes absolute precedence over workflow instance status
  const dbStatus = String(event.approval_status || "").toUpperCase();
  const isDbPublished = dbStatus === "PUBLISHED" || dbStatus === "OPEN_FOR_REGISTRATION" || dbStatus === "IN_PROGRESS" || dbStatus === "COMPLETED" || dbStatus === "CLOSED";

  let rawStatus = dbStatus || "DRAFT";
  let liveStatusLabel = "Draft";
  let liveStatusColor = "default";
  let currentPendingRoleName = "";

  if (isDbPublished) {
    rawStatus = "PUBLISHED";
    liveStatusLabel = "Published ✓";
    liveStatusColor = "success";
  } else if (workflowState?.hasWorkflow) {
    if (!workflowState.instance) {
      rawStatus = "DRAFT";
      liveStatusLabel = "Draft (Ready to Send)";
      liveStatusColor = "default";
    } else if (workflowState.instance.status === "APPROVED") {
      rawStatus = "APPROVED";
      liveStatusLabel = "Approved ✓";
      liveStatusColor = "cyan";
    } else if (workflowState.instance.status === "REJECTED") {
      rawStatus = "REJECTED";
      liveStatusLabel = "Rejected ✗";
      liveStatusColor = "error";
    } else if (workflowState.instance.status === "RESEND") {
      rawStatus = "RESEND";
      liveStatusLabel = "Returned for Revision";
      liveStatusColor = "orange";
    } else {
      rawStatus = "PENDING_APPROVAL";
      const currStep = workflowState.instance.current_step || 1;
      const currStepDef = (workflowState.steps || []).find(s => Number(s.step || s.level) === Number(currStep));
      currentPendingRoleName = currStepDef?.role_name || currStepDef?.role || `Step ${currStep}`;
      liveStatusLabel = `Pending (Step ${currStep}: ${currentPendingRoleName})`;
      liveStatusColor = "gold";
    }
  } else {
    const statusMeta = APPROVAL_STATUSES[rawStatus] || APPROVAL_STATUSES.DRAFT;
    liveStatusLabel = statusMeta.label;
    liveStatusColor = statusMeta.color;
  }

  const isDraft = rawStatus === "DRAFT";
  const isResend = rawStatus === "RESEND";
  const isPending = rawStatus === "PENDING_APPROVAL" || rawStatus === "PENDING_CSR_HEAD" || rawStatus === "PENDING_PROGRAM_MGR";
  const isDraftOrPending = isDraft || isResend || isPending;
  const isApproved = rawStatus === "APPROVED";
  const isPublishedOrBeyond = rawStatus === "PUBLISHED" || rawStatus === "OPEN_FOR_REGISTRATION" || rawStatus === "IN_PROGRESS" || rawStatus === "COMPLETED" || rawStatus === "CLOSED";

  const typeMeta = EVENT_TYPES.find(t => t.name.toLowerCase() === String(event.event_type || "").toLowerCase()) || { color: "#2563eb", name: event.event_type };
  const statusMeta = APPROVAL_STATUSES[rawStatus] || APPROVAL_STATUSES.DRAFT;
  const volunteerCapacityPercent = Math.min(100, Math.round(((event.registered_count || 0) / (event.max_volunteers || 1)) * 100));

  const budgetItems = Array.isArray(event.budget_items) ? event.budget_items : [];
  const volunteersList = (Array.isArray(event.volunteers) && event.volunteers.length > 0) ? event.volunteers : ALL_COMPANY_EMPLOYEES;

  const totalInvitedCount = volunteersList.length;
  const acceptedCount = volunteersList.filter(v => v.status === "Accepted" || v.status === "Attended").length;
  const attendedCount = volunteersList.filter(v => v.status === "Attended").length;
  const invitedPendingCount = volunteersList.filter(v => v.status === "Invited").length;
  const rejectedCount = volunteersList.filter(v => v.status === "Rejected").length;
  const submissionsCount = volunteersList.filter(v => hasFeedbackForm(v)).length;

  const displayedVolunteers = volunteersList.filter(v => {
    if (volunteerStatusFilter === "ALL") return true;
    if (volunteerStatusFilter === "ATTENDED") return v.status === "Attended";
    if (volunteerStatusFilter === "ACCEPTED") return v.status === "Accepted" || v.status === "Attended";
    if (volunteerStatusFilter === "INVITED") return v.status === "Invited";
    if (volunteerStatusFilter === "REJECTED") return v.status === "Rejected";
    if (volunteerStatusFilter === "FORM_SUBMITTED") return hasFeedbackForm(v);
    return true;
  });

  const mediaList = Array.isArray(event.media) && event.media.length > 0 ? event.media : [
    { id: "m1", url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60", caption: "Community health checkup drive kick-off" },
    { id: "m2", url: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=60", caption: "Doctors performing diagnostic screenings" },
    { id: "m3", url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=60", caption: "Volunteer team distributing nutritional kits" }
  ];

  const budgetColumns = [
    {
      title: "#",
      width: 45,
      align: "center",
      render: (_, __, i) => <span className="font-semibold text-slate-400">{i + 1}</span>
    },
    {
      title: "BUDGET HEAD",
      dataIndex: "budget_head",
      render: (h) => <Tag color="blue" className="font-bold text-xs">{h}</Tag>
    },
    {
      title: "DESCRIPTION",
      dataIndex: "description",
      render: (d) => <span className="text-slate-700 text-xs">{d || "—"}</span>
    },
    {
      title: "QTY",
      dataIndex: "quantity",
      align: "center",
      render: (q) => <span className="font-bold text-slate-800 text-xs">{q}</span>
    },
    {
      title: "UNIT",
      dataIndex: "unit",
      render: (u) => <span className="text-slate-500 text-xs">{u}</span>
    },
    {
      title: "RATE (₹)",
      dataIndex: "rate",
      align: "right",
      render: (r) => <span className="text-slate-700 text-xs">₹{(Number(r) || 0).toLocaleString()}</span>
    },
    {
      title: "ESTIMATED AMOUNT (₹)",
      dataIndex: "estimated_amount",
      align: "right",
      render: (a) => <span className="font-bold text-slate-900 text-xs">₹{(Number(a) || 0).toLocaleString()}</span>
    }
  ];

  // Dedicated Rich Columns for Form Submitted Tab with Documents & Photos
  const formSubmittedColumns = [
    {
      title: "EMPLOYEE",
      key: "employee",
      width: 220,
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar
            size={38}
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              fontWeight: 800,
              fontSize: 14,
              boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)"
            }}
          >
            {r.name?.[0]}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              {r.name}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
              <span style={{ fontFamily: "monospace", color: "#2563eb", fontWeight: 700, background: "#eff6ff", padding: "1px 5px", borderRadius: 4 }}>
                {r.emp_id}
              </span> • <span style={{ fontWeight: 600 }}>{r.dept}</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }} className="truncate">
              {r.email}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "HOURS & SHIFT",
      key: "hours_shift",
      width: 145,
      render: (_, r) => {
        const fb = r.feedback_form || {};
        const hoursClaimed = fb.hours !== undefined ? fb.hours : r.hours;
        return (
          <div>
            <Tag
              color="purple"
              style={{
                fontWeight: 800,
                fontSize: 12,
                borderRadius: 6,
                padding: "2px 8px",
                background: "#f3e8ff",
                borderColor: "#d8b4fe",
                color: "#7e22ce"
              }}
            >
              ⏱️ {hoursClaimed ? `${hoursClaimed} hrs` : "—"}
            </Tag>
            {(r.check_in || fb.check_in_time) && (
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontWeight: 500 }}>
                {r.check_in || fb.check_in_time} {r.check_out ? `- ${r.check_out}` : ""}
              </div>
            )}
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              {fb.submitted_at ? fb.submitted_at : "Event Completion"}
            </div>
          </div>
        );
      }
    },
    {
      title: "EXPERIENCE RATING",
      key: "rating",
      width: 140,
      render: (_, r) => {
        const rating = r.feedback_form?.rating || 5;
        const sentiment = rating === 5 ? "Excellent" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : "Average";
        return (
          <div>
            <Rate disabled value={rating} style={{ fontSize: 13, color: "#f59e0b" }} />
            <div style={{ fontSize: 11, fontWeight: 800, color: "#d97706", marginTop: 2 }}>
              {rating}.0 / 5.0 • <Tag color="gold" style={{ fontSize: 10, padding: "0 4px", margin: 0, fontWeight: 700 }}>{sentiment}</Tag>
            </div>
          </div>
        );
      }
    },
    {
      title: "KEY LEARNINGS & IMPACT",
      key: "learnings",
      render: (_, r) => {
        const learnings = r.feedback_form?.learnings || "Contributed to overall event activities and assisted beneficiaries.";
        return (
          <div style={{
            background: "#f8fafc",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            color: "#334155",
            maxHeight: 75,
            overflowY: "auto",
            lineHeight: 1.45
          }}>
            {learnings}
          </div>
        );
      }
    },
    {
      title: "TESTIMONIAL",
      key: "testimonial",
      render: (_, r) => {
        const quote = r.feedback_form?.testimonial;
        if (!quote) return <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>;
        return (
          <div style={{
            fontStyle: "italic",
            borderLeft: "3px solid #e11d48",
            background: "#fff1f2",
            padding: "6px 10px",
            borderRadius: "0 6px 6px 0",
            color: "#475569",
            fontSize: 11,
            lineHeight: 1.4
          }}>
            “{quote}”
          </div>
        );
      }
    },
    {
      title: "DOCS & PROOF",
      key: "documents",
      width: 170,
      render: (_, r) => {
        const photos = getVolunteerPhotos(r);
        const docs = getVolunteerDocuments(r);
        const totalFiles = photos.length + docs.length;

        if (totalFiles === 0) {
          return (
            <Tag color="default" style={{ fontSize: 11, color: "#94a3b8", borderRadius: 6, border: "1px dashed #cbd5e1" }}>
              No docs attached
            </Tag>
          );
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {photos.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Image.PreviewGroup>
                  {photos.slice(0, 2).map((p, idx) => (
                    <Image
                      key={idx}
                      src={p}
                      fallback={DEFAULT_IMAGE_FALLBACK}
                      alt="Proof photo"
                      width={32}
                      height={32}
                      style={{ borderRadius: 6, objectFit: "cover", border: "1px solid #cbd5e1" }}
                    />
                  ))}
                </Image.PreviewGroup>
                {photos.length > 2 && (
                  <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: "0 4px", borderRadius: 4, fontWeight: 700 }}>
                    +{photos.length - 2} photos
                  </Tag>
                )}
              </div>
            )}
            {docs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Tooltip title={docs.map(d => d.file_name).join(", ")}>
                  <Tag
                    color="blue"
                    icon={<PaperClipOutlined />}
                    onClick={() => {
                      setSelectedAttendeeForm(r);
                      setIsAttendeeFormOpen(true);
                    }}
                    style={{ fontSize: 11, margin: 0, padding: "1px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                  >
                    {docs.length} {docs.length === 1 ? "Document" : "Documents"}
                  </Tag>
                </Tooltip>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: "STATUS",
      key: "verification_status",
      width: 145,
      align: "center",
      render: (_, r) => {
        const status = r.feedback_form?.verification_status || (r.status === "Attended" ? "Pending Review" : "Pending Review");
        if (status === "Approved") {
          return <Tag color="success" style={{ fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>✓ Approved</Tag>;
        }
        if (status === "Revision Requested") {
          return <Tag color="error" style={{ fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>⚠️ Revision</Tag>;
        }
        if (status === "Promoted to Story") {
          return <Tag color="purple" style={{ fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>⭐ In Story</Tag>;
        }
        if (status === "Approved with Adjustment") {
          return <Tag color="cyan" style={{ fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>⚙️ Adjusted ({r.hours}h)</Tag>;
        }
        return <Tag color="gold" style={{ fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>⏱️ Under Review</Tag>;
      }
    },
    {
      title: "ADMIN ACTIONS",
      key: "actions",
      width: 250,
      align: "center",
      render: (_, r) => {
        const isApproved = r.feedback_form?.verification_status === "Approved";
        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", whiteSpace: "nowrap" }}>
            <Popconfirm
              title="Approve Volunteer Form"
              description={`Approve and credit ${r.feedback_form?.hours || r.hours || 4} hours for ${r.name}?`}
              onConfirm={() => handleApproveFormSubmission(r)}
              okText="Yes, Approve"
              cancelText="Cancel"
              okButtonProps={{ style: { background: "#16a34a", borderColor: "#16a34a" } }}
            >
              <Button
                size="small"
                type={isApproved ? "default" : "primary"}
                style={{
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 11,
                  background: isApproved ? "#f0fdf4" : "#16a34a",
                  borderColor: isApproved ? "#bbf7d0" : "#16a34a",
                  color: isApproved ? "#15803d" : "#ffffff"
                }}
              >
                {isApproved ? "Approved ✓" : "Approve"}
              </Button>
            </Popconfirm>

            <Tooltip title="Adjust Hours & Review Notes">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenAdjustModal(r)}
                style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, borderColor: "#3b82f6", color: "#1d4ed8" }}
              >
                Adjust
              </Button>
            </Tooltip>

            {r.feedback_form?.testimonial && (
              <Popconfirm
                title="Feature in Impact Story"
                description={`Feature ${r.name}'s testimonial quote in the public event Impact Story?`}
                onConfirm={() => handlePromoteToStory(r)}
                okText="Yes, Feature"
                cancelText="Cancel"
              >
                <Tooltip title="Feature in Event Impact Story">
                  <Button
                    size="small"
                    icon={<StarOutlined />}
                    style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, borderColor: "#f59e0b", color: "#d97706" }}
                  />
                </Tooltip>
              </Popconfirm>
            )}

            <Tooltip title="View Complete Form Details & Attached Docs">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedAttendeeForm(r);
                  setIsAttendeeFormOpen(true);
                }}
                style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, borderColor: "#7c3aed", color: "#7c3aed" }}
              />
            </Tooltip>

            <Popconfirm
              title="Request Form Revision"
              description={`Ask ${r.name} to revise submitted hours/details?`}
              onConfirm={() => handleRequestRevision(r)}
              okText="Request Revision"
              cancelText="Cancel"
            >
              <Tooltip title="Request Revision">
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}
                />
              </Tooltip>
            </Popconfirm>
          </div>
        );
      }
    }
  ];

  // Standard Columns for Accepted / Pending / All Tabs
  const standardVolunteerColumns = [
    {
      title: "EMPLOYEE ID",
      dataIndex: "emp_id",
      render: (id) => <span className="font-mono font-bold text-blue-600 text-xs">{id}</span>
    },
    {
      title: "NAME & CONTACT",
      dataIndex: "name",
      render: (name, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar size="small" style={{ background: "#e11d48", fontWeight: 700 }}>
            {name?.[0]}
          </Avatar>
          <div>
            <div className="font-bold text-slate-800 text-xs">{name}</div>
            <div className="text-[11px] text-slate-400">{r.email || `${name.toLowerCase().replace(/\s+/g, ".")}@techcsr.com`}</div>
          </div>
        </div>
      )
    },
    {
      title: "DEPARTMENT",
      dataIndex: "dept",
      render: (d) => <span className="text-slate-600 text-xs font-medium">{d}</span>
    },
    {
      title: "INVITE & ENROLMENT STATUS",
      dataIndex: "status",
      align: "center",
      render: (st) => {
        if (st === "Attended") return <Tag color="blue" className="font-bold text-xs">Attended ✓</Tag>;
        if (st === "Accepted") return <Tag color="success" className="font-bold text-xs">Accepted / Registered</Tag>;
        if (st === "Invited") return <Tag color="gold" className="font-bold text-xs">Invited (Pending Response)</Tag>;
        if (st === "Rejected") return <Tag color="error" className="font-bold text-xs">Declined ✗</Tag>;
        return <Tag color="default" className="text-xs">{st}</Tag>;
      }
    },
    {
      title: "CHECK-IN TIME",
      dataIndex: "check_in",
      render: (c) => <span className="text-xs text-slate-700 font-medium">{c || "—"}</span>
    },
    {
      title: "HOURS LOGGED",
      dataIndex: "hours",
      align: "center",
      render: (h) => <span className="font-bold text-slate-800 text-xs">{h ? `${h} hrs` : "—"}</span>
    },
    {
      title: "POST-EVENT FORM DATA",
      align: "center",
      render: (_, r) => {
        if (hasFeedbackForm(r)) {
          return (
            <Button
              size="small"
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedAttendeeForm(r);
                setIsAttendeeFormOpen(true);
              }}
              style={{ borderRadius: 6, fontWeight: 700, background: "#059669", borderColor: "#059669" }}
            >
              View Form ({r.feedback_form?.rating || 5}★)
            </Button>
          );
        }
        if (r.status === "Attended") {
          return <Tag color="warning" className="font-semibold text-xs">Pending Submission</Tag>;
        }
        return <span className="text-xs text-slate-400">—</span>;
      }
    },
    {
      title: "ACTION",
      align: "center",
      render: (_, r) => {
        if (r.status === "Invited") {
          return (
            <Space size={4}>
              <Popconfirm
                title="Mark Volunteer Accepted"
                description={`Mark ${r.name} as Accepted/Registered for this event?`}
                onConfirm={() => handleAcceptVolunteer(r.id || r.emp_id)}
                okText="Mark Accepted"
                cancelText="Cancel"
              >
                <Button
                  size="small"
                  type="primary"
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, background: "#16a34a", borderColor: "#16a34a" }}
                >
                  Mark Accepted
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Send Reminder Notification"
                description={`Send reminder notification to ${r.name} (${r.email || r.dept})?`}
                onConfirm={() => handleSendReminder(r)}
                okText="Send Reminder"
                cancelText="Cancel"
              >
                <Button
                  size="small"
                  icon={<BellOutlined />}
                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}
                >
                  Reminder
                </Button>
              </Popconfirm>
            </Space>
          );
        }
        return (
          <Popconfirm
            title={r.status === "Attended" ? "Undo Attendance Check-in" : "Mark as Attended"}
            description={r.status === "Attended" ? `Undo check-in for ${r.name}?` : `Confirm attendance check-in for ${r.name}?`}
            onConfirm={() => handleToggleAttendance(r.id || r.emp_id)}
            okText="Confirm"
            cancelText="Cancel"
          >
            <Button
              size="small"
              type={r.status === "Attended" ? "default" : "primary"}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}
            >
              {r.status === "Attended" ? "Undo Check-in" : "Mark Attended"}
            </Button>
          </Popconfirm>
        );
      }
    }
  ];

  // Modern Expandable row render for inline full details with Documents & Photos
  const renderExpandedVolunteerRow = (record) => {
    const fb = record.feedback_form;
    const photos = getVolunteerPhotos(record);
    const docs = getVolunteerDocuments(record);

    if (!fb || !hasFeedbackForm(record)) {
      return (
        <div style={{ padding: "14px 20px", background: "#f8fafc", borderRadius: 10, fontSize: 12, color: "#64748b", border: "1px dashed #cbd5e1" }}>
          No post-event form submitted yet for <strong>{record.name}</strong> ({record.emp_id}). Current status: <Tag color={record.status === "Accepted" ? "success" : "gold"}>{record.status}</Tag>
        </div>
      );
    }

    return (
      <div style={{ padding: "18px 22px", background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
        <Row gutter={[20, 16]}>
          {/* Col 1: Employee & Shift Audit */}
          <Col xs={24} md={7}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Volunteer & Shift Summary
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              {record.name}
              <Tag color="blue" style={{ fontSize: 11, fontWeight: 700, margin: 0 }}>{record.emp_id}</Tag>
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
              Dept: <strong style={{ color: "#0f172a" }}>{record.dept}</strong> • {record.email}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <Tag color="purple" style={{ fontWeight: 800, fontSize: 12, padding: "2px 8px" }}>
                {fb.hours || record.hours || 4} hrs claimed
              </Tag>
              <Tag color="gold" style={{ fontWeight: 700, fontSize: 12, padding: "2px 8px" }}>
                ⭐ {fb.rating || 5}.0/5
              </Tag>
              {fb.verification_status === "Approved" ? (
                <Tag color="success" style={{ fontWeight: 800, padding: "2px 8px" }}>✓ Verified</Tag>
              ) : (
                <Tag color="gold" style={{ fontWeight: 800, padding: "2px 8px" }}>⏱️ Under Review</Tag>
              )}
            </div>

            <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
              <div>⏱️ <strong>Shift:</strong> {record.check_in || fb.check_in_time || "08:15 AM"} {record.check_out ? `- ${record.check_out}` : ""}</div>
              <div style={{ marginTop: 2 }}>📅 <strong>Submitted:</strong> {fb.submitted_at || "Event Completion"}</div>
            </div>
          </Col>

          {/* Col 2: Key Learnings & Testimonial */}
          <Col xs={24} md={9}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Key Learnings & Feedback
            </div>
            <div style={{ fontSize: 12, color: "#334155", background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 6, lineHeight: 1.55 }}>
              {fb.learnings || "Contributed to overall event activities and assisted beneficiaries."}
            </div>

            {fb.testimonial && (
              <div style={{ marginTop: 8, fontStyle: "italic", borderLeft: "3px solid #e11d48", background: "#fff1f2", padding: "8px 12px", borderRadius: "0 8px 8px 0", color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
                “{fb.testimonial}”
              </div>
            )}

            {fb.admin_notes && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#0369a1", background: "#f0f9ff", padding: "6px 10px", borderRadius: 6, border: "1px solid #bae6fd" }}>
                <strong>Admin Remark:</strong> {fb.admin_notes}
              </div>
            )}
          </Col>

          {/* Col 3: Attached Proof Documents & Evidence */}
          <Col xs={24} md={8}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Attached Proof & Documents ({photos.length + docs.length})
            </div>

            {photos.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Event Photos & Media:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Image.PreviewGroup>
                    {photos.map((p, idx) => (
                      <Image
                        key={idx}
                        src={p}
                        fallback={DEFAULT_IMAGE_FALLBACK}
                        alt={`Photo ${idx + 1}`}
                        width={54}
                        height={54}
                        style={{ borderRadius: 8, objectFit: "cover", border: "1px solid #cbd5e1" }}
                      />
                    ))}
                  </Image.PreviewGroup>
                </div>
              </div>
            )}

            {docs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Uploaded Verification Documents:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {docs.map((doc, idx) => {
                    const isPdf = doc.doc_type === "pdf";
                    const isImg = doc.doc_type === "image";
                    const isWord = doc.doc_type === "word";
                    const isExcel = doc.doc_type === "excel";

                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#ffffff",
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          fontSize: 11
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          {isPdf ? <FilePdfOutlined style={{ color: "#ef4444" }} /> :
                           isImg ? <FileImageOutlined style={{ color: "#9333ea" }} /> :
                           isWord ? <FileWordOutlined style={{ color: "#2563eb" }} /> :
                           isExcel ? <FileExcelOutlined style={{ color: "#16a34a" }} /> :
                           <FileOutlined style={{ color: "#64748b" }} />}
                          <span className="truncate" style={{ fontWeight: 600, color: "#0f172a" }} title={doc.file_name}>
                            {doc.file_name}
                          </span>
                        </div>
                        {doc.file_path && (
                          <a
                            href={doc.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.file_name}
                            style={{ color: "#2563eb", fontWeight: 700, fontSize: 11, marginLeft: 6, whiteSpace: "nowrap" }}
                          >
                            <DownloadOutlined /> View
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {photos.length === 0 && docs.length === 0 && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, fontStyle: "italic" }}>
                No external photo or document proofs were uploaded with this submission.
              </div>
            )}

            {/* Quick Action Buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {canRegister && (
                <>
                  <Popconfirm
                    title="Approve Volunteer Hours"
                    description={`Approve and credit ${fb.hours || record.hours || 4} hours for ${record.name}?`}
                    onConfirm={() => handleApproveFormSubmission(record)}
                    okText="Yes, Approve"
                    cancelText="Cancel"
                    okButtonProps={{ style: { background: "#16a34a", borderColor: "#16a34a" } }}
                  >
                    <Button
                      size="small"
                      type="primary"
                      style={{ borderRadius: 6, fontSize: 11, background: "#16a34a", borderColor: "#16a34a", fontWeight: 700 }}
                    >
                      Approve Hours
                    </Button>
                  </Popconfirm>
                  <Button
                    size="small"
                    onClick={() => handleOpenAdjustModal(record)}
                    style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                  >
                    Adjust Hours
                  </Button>
                </>
              )}
              {(canAdd || canEdit) && fb.testimonial && (
                <Popconfirm
                  title="Feature in Impact Story"
                  description={`Feature ${record.name}'s testimonial in the public event Impact Story?`}
                  onConfirm={() => handlePromoteToStory(record)}
                  okText="Yes, Feature"
                  cancelText="Cancel"
                >
                  <Button
                    size="small"
                    icon={<StarOutlined />}
                    style={{ borderRadius: 6, fontSize: 11, color: "#d97706", borderColor: "#f59e0b", fontWeight: 600 }}
                  >
                    Feature Story
                  </Button>
                </Popconfirm>
              )}
              {canView && (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedAttendeeForm(record);
                    setIsAttendeeFormOpen(true);
                  }}
                  style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                >
                  Full Form
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  // Access restricted guard
  if (!loading && !canView && !canList) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: 800, margin: "40px auto", textAlign: "center" }}>
        <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 40, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>
            🔒
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Access Restricted</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            You do not have permission to view this event's details. Please contact your CSR administrator.
          </p>
          <Button type="primary" onClick={() => router.push("/admin/volunteering/portal")} style={{ borderRadius: 8, fontWeight: 700, background: "#8B1D42", borderColor: "#8B1D42" }}>
            Go to Volunteering Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: "0 auto", paddingBottom: 40 }}>
      {msgContextHolder}
      {/* Top Breadcrumb & Back Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {canList && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/admin/event/volunteering-event")}
              style={{
                fontWeight: 700,
                borderRadius: 8,
                borderColor: "#cbd5e1",
                background: "#ffffff",
                color: "#0f172a"
              }}
            >
              Back to Events & Calendar
            </Button>
          )}
          <Breadcrumb
            items={[
              ...(canList ? [{ title: <span style={{ cursor: "pointer", color: "#64748b" }} onClick={() => router.push("/admin/event/volunteering-event")}>Events & Calendar</span> }] : []),
              { title: <span style={{ color: "#0f172a", fontWeight: 600 }}>{event.event_name}</span> }
            ]}
          />
        </div>

        <Space size={8}>
          <Button
            icon={<RocketOutlined />}
            onClick={() => router.push("/admin/volunteering/portal")}
            style={{ borderRadius: 8, fontWeight: 700, borderColor: "#3b82f6", color: "#1d4ed8" }}
          >
            Employee Portal View
          </Button>
          {canEdit && (isDraft || isResend) && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsEditOpen(true)}
              style={{ borderRadius: 8, fontWeight: 600, borderColor: "#7c3aed", color: "#7c3aed" }}
            >
              Edit Event
            </Button>
          )}
        </Space>
      </div>

      {/* Sequential Workflow Gate Alert Banner */}
      {isDraft && (
        <Alert
          message={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <strong>🔒 Event in Draft Stage:</strong> You can edit event details freely. When ready, submit for approval to initiate the sequential verification workflow.
              </div>
              <Space size={8}>
                {canEdit && (
                  <Button size="small" onClick={() => setIsEditOpen(true)} icon={<EditOutlined />} style={{ borderRadius: 6, fontWeight: 700 }}>
                    Edit Event
                  </Button>
                )}
                {canPublish && (
                  <Button size="small" type="primary" onClick={handleSubmitForApproval} icon={<SendOutlined />} style={{ borderRadius: 6, fontWeight: 700, background: "#2563eb" }}>
                    Submit for Approval
                  </Button>
                )}
              </Space>
            </div>
          }
          type="warning"
          showIcon
          style={{ borderRadius: 12, marginBottom: 20, padding: "12px 18px", border: "1px solid #fde047" }}
        />
      )}

      {isResend && (
        <Alert
          message={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <strong>⚠️ Event Returned for Revision:</strong> Approver requested modifications. Please review feedback, edit details, and resend for approval.
              </div>
              <Space size={8}>
                {canEdit && (
                  <Button size="small" onClick={() => setIsEditOpen(true)} icon={<EditOutlined />} style={{ borderRadius: 6, fontWeight: 700 }}>
                    Edit Event
                  </Button>
                )}
                {canPublish && (
                  <Button size="small" type="primary" onClick={handleSubmitForApproval} icon={<SendOutlined />} style={{ borderRadius: 6, fontWeight: 700, background: "#ea580c", borderColor: "#ea580c" }}>
                    Resend for Approval
                  </Button>
                )}
              </Space>
            </div>
          }
          type="warning"
          showIcon
          style={{ borderRadius: 12, marginBottom: 20, padding: "12px 18px", border: "1px solid #fed7aa" }}
        />
      )}

      {isPending && (
        <Alert
          message={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <strong>⏳ Event Under Review:</strong> Currently awaiting review at <strong>{liveStatusLabel}</strong>. Once approved by the authorized reviewer, the event can be published to employees.
              </div>
              <Button size="small" type="primary" ghost icon={<BranchesOutlined />} onClick={scrollToApproval} style={{ borderRadius: 6, fontWeight: 700, borderColor: "#2563eb", color: "#2563eb" }}>
                View Approval Workflow
              </Button>
            </div>
          }
          type="info"
          showIcon
          style={{ borderRadius: 12, marginBottom: 20, padding: "12px 18px", border: "1px solid #93c5fd" }}
        />
      )}

      {isApproved && (
        <Alert
          message={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <strong>🎉 Event Approved!</strong> Approvals are completed. Publish this event now to broadcast notifications to all employees and open registrations in the Employee Hub.
              </div>
              {canPublish && (
                <Popconfirm
                  title="Publish Event & Broadcast Notifications?"
                  description="This will notify all company employees and open self-service registration in the Employee Portal."
                  onConfirm={handlePublishEvent}
                  okText="Yes, Publish Now"
                  cancelText="Cancel"
                >
                  <Button size="middle" type="primary" icon={<RocketOutlined />} style={{ borderRadius: 8, fontWeight: 800, background: "#16a34a", borderColor: "#16a34a" }}>
                    🚀 Publish Event & Send Notifications
                  </Button>
                </Popconfirm>
              )}
            </div>
          }
          type="success"
          showIcon
          style={{ borderRadius: 12, marginBottom: 20, padding: "12px 18px", border: "1px solid #86efac" }}
        />
      )}

      {isPublishedOrBeyond && (
        <Alert
          message={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <strong>📡 Event Published & Active:</strong> Notifications sent to all employees. Employee registration, check-ins, and post-event form submissions are live below.
              </div>
              <Tag color="success" style={{ fontWeight: 800, padding: "2px 10px" }}>OPEN FOR EMPLOYEES</Tag>
            </div>
          }
          type="info"
          showIcon
          style={{ borderRadius: 12, marginBottom: 20, padding: "10px 18px", border: "1px solid #93c5fd" }}
        />
      )}

      {/* Hero Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fdf2f8 100%)",
          border: "1px solid #fecdd3",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "0 4px 15px rgba(225, 29, 72, 0.06)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ maxWidth: 800 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, background: "#be123c", color: "#ffffff", padding: "2px 8px", borderRadius: 6 }}>
                {event.event_id}
              </span>
              <Tag color={typeMeta.color} style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, margin: 0 }}>
                {typeMeta.name}
              </Tag>
              <Tag color="magenta" style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, margin: 0 }}>
                {event.csr_theme}
              </Tag>
              <Tag color={liveStatusColor} style={{ fontSize: 11, fontWeight: 800, borderRadius: 6, margin: 0 }}>
                {liveStatusLabel}
              </Tag>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 6px 0", letterSpacing: -0.5 }}>
              {event.event_name}
            </h1>

            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Part of Program: <strong style={{ color: "#0f172a" }}>{event.program_name}</strong> ({event.program_id})
            </p>
          </div>

          {/* Quick Lifecycle Action Bar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isDraft && (
              <>
                {canEdit && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setIsEditOpen(true)}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Edit Event
                  </Button>
                )}
                {canPublish && (
                  <Popconfirm
                    title="Submit Event for Approval"
                    description="Are you sure you want to submit this event for approval workflow?"
                    onConfirm={handleSubmitForApproval}
                    okText="Yes, Submit"
                    cancelText="Cancel"
                  >
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      style={{ borderRadius: 8, fontWeight: 700, background: "#2563eb" }}
                    >
                      Submit for Approval
                    </Button>
                  </Popconfirm>
                )}
              </>
            )}

            {isResend && (
              <>
                {canEdit && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setIsEditOpen(true)}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Edit Event
                  </Button>
                )}
                {canPublish && (
                  <Popconfirm
                    title="Resend for Approval"
                    description="Are you sure you want to resend this updated event for approval?"
                    onConfirm={handleSubmitForApproval}
                    okText="Yes, Resend"
                    cancelText="Cancel"
                    okButtonProps={{ style: { background: "#ea580c", borderColor: "#ea580c" } }}
                  >
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      style={{ borderRadius: 8, fontWeight: 700, background: "#ea580c", borderColor: "#ea580c" }}
                    >
                      Resend for Approval
                    </Button>
                  </Popconfirm>
                )}
              </>
            )}

            {isPending && (
              <Button
                type="primary"
                ghost
                icon={<BranchesOutlined />}
                onClick={scrollToApproval}
                style={{ borderRadius: 8, fontWeight: 700, borderColor: "#e11d48", color: "#e11d48" }}
              >
                Approval Workflow
              </Button>
            )}

            {isApproved && canPublish && (
              <Popconfirm
                title="Publish Volunteering Event"
                description="Are you sure you want to publish this event to the employee portal and send notifications?"
                onConfirm={handlePublishEvent}
                okText="Yes, Publish Event"
                cancelText="Cancel"
                okButtonProps={{ style: { background: "#16a34a", borderColor: "#16a34a" } }}
              >
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  style={{ borderRadius: 8, fontWeight: 800, background: "#16a34a", borderColor: "#16a34a" }}
                >
                  Publish Event
                </Button>
              </Popconfirm>
            )}

            {isPublishedOrBeyond && (
              <>
                {canRegister && (
                  <Button
                    icon={<TeamOutlined />}
                    onClick={() => setIsAttendanceOpen(true)}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    QR Check-in & Attendance
                  </Button>
                )}

                {canEdit && (
                  <Button
                    icon={<AuditOutlined />}
                    onClick={() => setIsClosureOpen(true)}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Closure & Outcomes
                  </Button>
                )}

                <Button
                  icon={<ExportOutlined />}
                  onClick={() => router.push("/admin/volunteering/portal")}
                  style={{ borderRadius: 8, fontWeight: 600, color: "#9333ea", borderColor: "#d8b4fe" }}
                >
                  Employee Portal View
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4 Quick Metric KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <div className="vol-kpi-card">
            <div className="vol-kpi-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <CalendarOutlined />
            </div>
            <div className="min-w-0 flex-1">
              <div className="vol-kpi-title">Schedule & Time</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{event.event_date}</div>
              <div className="vol-kpi-sub">{event.start_time} - {event.end_time}</div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="vol-kpi-card">
            <div className="vol-kpi-icon-wrap" style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <EnvironmentOutlined />
            </div>
            <div className="min-w-0 flex-1">
              <div className="vol-kpi-title">Location & Venue</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }} className="truncate" title={event.event_location}>
                {event.event_location}
              </div>
              <div className="vol-kpi-sub">{event.meeting_point || "Main Entrance"}</div>
            </div>
          </div>
        </Col>

        {/* Third KPI: Capacity (Target when unapproved, live attendance when approved/published) */}
        <Col xs={24} sm={12} lg={6}>
          <div className="vol-kpi-card">
            <div className="vol-kpi-icon-wrap" style={{ background: "#faf5ff", color: "#9333ea" }}>
              <TeamOutlined />
            </div>
            <div className="min-w-0 flex-1">
              <div className="vol-kpi-title">{isPublishedOrBeyond ? "Attendance & Capacity" : "Volunteer Capacity"}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                {isPublishedOrBeyond ? `${attendedCount} Attended • ${acceptedCount} Reg` : `${event.max_volunteers || 0} Volunteers Max`}
              </div>
              {isPublishedOrBeyond ? (
                <Progress percent={volunteerCapacityPercent} size="small" strokeColor="#9333ea" style={{ margin: "2px 0 0" }} />
              ) : (
                <div className="vol-kpi-sub">Min required: {event.min_volunteers || 1} volunteers</div>
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="vol-kpi-card">
            <div className="vol-kpi-icon-wrap" style={{ background: "#ecfeff", color: "#0891b2" }}>
              <DollarOutlined />
            </div>
            <div className="min-w-0 flex-1">
              <div className="vol-kpi-title">Total Budget</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                ₹{(Number(event.total_budget) || 0).toLocaleString()}
              </div>
              <div className="vol-kpi-sub">{budgetItems.length} budget items planned</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Main Executive Body Layout (2 Columns Overview) */}
      <Row gutter={[20, 20]}>
        {/* Left Column: Objectives & Scope + Budget */}
        <Col xs={24} lg={16} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Section 1: Objectives & Scope */}
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                <AimOutlined style={{ color: "#e11d48" }} />
                Event Objectives & Scope
              </div>
            }
            style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
          >
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "#334155", marginBottom: 16 }}>
              {event.objective || "No primary objective text specified."}
            </div>

            {event.detailed_objectives && (
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>
                  Key Deliverables & Milestones
                </div>
                <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-line" }}>
                  {event.detailed_objectives}
                </div>
              </div>
            )}

            <Divider style={{ margin: "16px 0" }} />

            <Row gutter={[16, 12]}>
              <Col span={12}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Target Employee Groups</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{event.target_employee_groups || "All Employees"}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Registration Deadline</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e11d48", marginTop: 2 }}>{event.registration_deadline || "—"}</div>
              </Col>
            </Row>
          </Card>

          {/* Section 2: Budget Breakdown */}
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                  <DollarOutlined style={{ color: "#059669" }} />
                  Budget & Logistics Breakdown
                </div>
                <Tag color="green" style={{ fontSize: 12, fontWeight: 800, padding: "2px 8px" }}>
                  Total: ₹{(Number(event.total_budget) || 0).toLocaleString()}
                </Tag>
              </div>
            }
            style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
          >
            {budgetItems.length > 0 ? (
              <Table
                dataSource={budgetItems}
                columns={budgetColumns}
                rowKey="id"
                pagination={false}
                size="small"
                className="custom-vol-table"
              />
            ) : (
              <div style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                No itemized budget lines recorded. Total overall budget: ₹{(Number(event.total_budget) || 0).toLocaleString()}
              </div>
            )}
          </Card>
        </Col>

        {/* Right Column: Sticky Metadata, Logistics & Partner Info (1/3 width) */}
        <Col xs={24} lg={8} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card: Program & NGO Partner */}
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                <BankOutlined style={{ color: "#2563eb" }} />
                Program & NGO Partner
              </div>
            }
            style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Parent Program</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{event.program_name}</div>
                <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{event.program_id}</div>
              </div>

              <Divider style={{ margin: "4px 0" }} />

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Implementing NGO</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{event.implementing_ngo || "Direct Employee Led"}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Event Coordinator</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{event.event_coordinator || "—"}</div>
                {event.contact_person && (
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <PhoneOutlined style={{ color: "#2563eb" }} /> {event.contact_person}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Card: Venue & Logistics Details */}
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                <CompassOutlined style={{ color: "#ef4444" }} />
                Venue & Logistics Details
              </div>
            }
            style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Meeting Point</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{event.meeting_point || "Main Venue Entrance"}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Full Address</div>
                <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{event.address || event.event_location}</div>
              </div>

              {event.lat_lon && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>GPS Coordinates</div>
                  <div style={{ fontSize: 12, fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}>
                    <GlobalOutlined /> {event.lat_lon}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Card: Post-Event Closure Summary */}
          {(isApproved || isPublishedOrBeyond) && event.closure_summary?.status && (
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  <AuditOutlined style={{ color: "#059669" }} />
                  Post-Event Closure Summary
                </div>
              }
              style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Closure Status:</span>
                  <Tag color="green" style={{ fontWeight: 700 }}>{event.closure_summary.status}</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Beneficiaries Reached:</span>
                  <strong style={{ color: "#0f172a" }}>{event.closure_summary.actual_beneficiaries || "—"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Total Hours Logged:</span>
                  <strong style={{ color: "#0f172a" }}>{event.closure_summary.total_volunteer_hours || "—"} hrs</strong>
                </div>
                {event.closure_summary.volunteer_rating && (
                  <div>
                    <span style={{ color: "#64748b" }}>Volunteer Satisfaction:</span>
                    <div>
                      <Rate disabled defaultValue={event.closure_summary.volunteer_rating} allowHalf style={{ fontSize: 14 }} />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* FULL WIDTH Section 3: Employee Enrolment, Attendance & Form Submissions (Shown once Published) */}
      {isPublishedOrBeyond && (
        <div style={{ marginTop: 24, width: "100%" }}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  <TeamOutlined style={{ color: "#9333ea", fontSize: 18 }} />
                  Employee Enrolment, Attendance & Form Submissions ({volunteersList.length} Notified)
                </div>
                <Space size={6} wrap>
                  <Tag color="success" style={{ fontWeight: 700, padding: "2px 8px" }}>{acceptedCount} Accepted</Tag>
                  <Tag color="gold" style={{ fontWeight: 700, padding: "2px 8px" }}>{invitedPendingCount} Invited (Pending)</Tag>
                  <Tag color="purple" style={{ fontWeight: 700, padding: "2px 8px" }}>{submissionsCount} Forms Submitted</Tag>
                  <Tag color="blue" style={{ fontWeight: 700, padding: "2px 8px" }}>{attendedCount} Attended</Tag>
                  <Tag color="default" style={{ fontWeight: 700, padding: "2px 8px" }}>{totalInvitedCount} Total Notified</Tag>
                  <Tag color="error" style={{ fontWeight: 700, padding: "2px 8px" }}>{rejectedCount} Declined</Tag>
                </Space>
              </div>
            }
            style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            {/* Primary Filter Tabs: Accepted, Pending, Form Submitted */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { key: "ACCEPTED", label: `Accepted (${acceptedCount})`, color: "#16a34a" },
                  { key: "INVITED", label: `Pending (${invitedPendingCount})`, color: "#d97706" },
                  { key: "FORM_SUBMITTED", label: `Form Submitted (${submissionsCount})`, color: "#9333ea" },
                  { key: "ALL", label: `All Employees (${totalInvitedCount})`, color: "#2563eb" },
                  { key: "REJECTED", label: `Declined (${rejectedCount})`, color: "#dc2626" }
                ].map(tab => {
                  const isActive = volunteerStatusFilter === tab.key;
                  return (
                    <Button
                      key={tab.key}
                      size="middle"
                      type={isActive ? "primary" : "default"}
                      onClick={() => setVolunteerStatusFilter(tab.key)}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        height: 36,
                        background: isActive ? tab.color : "#ffffff",
                        borderColor: isActive ? tab.color : "#cbd5e1",
                        color: isActive ? "#ffffff" : "#334155",
                        boxShadow: isActive ? `0 2px 8px ${tab.color}33` : "none"
                      }}
                    >
                      {tab.label}
                    </Button>
                  );
                })}
              </div>

              {volunteerStatusFilter === "FORM_SUBMITTED" && (
                <Tag color="purple" style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 6, margin: 0 }}>
                  Showing {displayedVolunteers.length} Submitted Forms • Full Details & Admin Actions Active
                </Tag>
              )}
            </div>

            <Table
              dataSource={displayedVolunteers}
              columns={volunteerStatusFilter === "FORM_SUBMITTED" ? formSubmittedColumns : standardVolunteerColumns}
              rowKey={(r) => r.id || r.emp_id}
              pagination={{ pageSize: 8 }}
              size="middle"
              className="custom-vol-table"
              expandable={{
                expandedRowRender: renderExpandedVolunteerRow,
                rowExpandable: () => true
              }}
            />
          </Card>
        </div>
      )}

      {/* FULL WIDTH Section 4: Impact Story Showcase */}
      {event.story?.title && (
        <div style={{ marginTop: 24, width: "100%" }}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                <ReadOutlined style={{ color: "#ea580c" }} />
                Impact Story: {event.story.title}
              </div>
            }
            style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
          >
            {event.story.cover_image && (
              <div style={{ height: 220, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
                <img src={event.story.cover_image} alt="Story cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            {event.story.quote && (
              <div style={{ fontStyle: "italic", borderLeft: "4px solid #ea580c", paddingLeft: 12, marginBottom: 12, color: "#334155", fontSize: 14 }}>
                “{event.story.quote}”
                {event.story.quote_author && <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginTop: 4 }}>— {event.story.quote_author}</div>}
              </div>
            )}
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "#334155" }}>
              {event.story.narrative}
            </div>
          </Card>
        </div>
      )}

      {/* FULL WIDTH Section 5: Official Approval Path Workflow Engine */}
      <div id="event-approval-workflow-card" style={{ marginTop: 24, width: "100%" }}>
        <FormApprovalPanel
          form_slug="volunteering_event"
          record_id={eventId || event.id}
          onWorkflowLoaded={(wfData) => {
            setWorkflowState(wfData);
          }}
          onStatusChange={() => {
            fetchEventData();
          }}
        />
      </div>

      {/* Big Modern Attendee Submitted Form Modal Viewer with Full Details, Photos, Docs & Actions */}
      <Modal
        title={
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingRight: 24,
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
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  Volunteer Form & Impact Submission
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginTop: 2 }}>
                  Attendee: <strong style={{ color: "#0f172a" }}>{selectedAttendeeForm?.name}</strong> • <span style={{ fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}>{selectedAttendeeForm?.emp_id}</span> • {selectedAttendeeForm?.dept}
                </div>
              </div>
            </div>
            {selectedAttendeeForm?.feedback_form?.verification_status && (
              <Tag
                color={
                  selectedAttendeeForm.feedback_form.verification_status === "Approved" ? "success" :
                  selectedAttendeeForm.feedback_form.verification_status === "Revision Requested" ? "error" :
                  selectedAttendeeForm.feedback_form.verification_status === "Approved with Adjustment" ? "cyan" : "gold"
                }
                style={{ fontWeight: 800, fontSize: 13, padding: "4px 14px", borderRadius: 8, margin: 0 }}
              >
                {selectedAttendeeForm.feedback_form.verification_status === "Approved" ? "✓ Approved & Credited" :
                 selectedAttendeeForm.feedback_form.verification_status === "Revision Requested" ? "⚠️ Revision Requested" :
                 selectedAttendeeForm.feedback_form.verification_status === "Approved with Adjustment" ? "⚙️ Adjusted & Credited" : "⏱️ Pending Review"}
              </Tag>
            )}
          </div>
        }
        open={isAttendeeFormOpen}
        onCancel={() => setIsAttendeeFormOpen(false)}
        footer={[
          <Button
            key="close"
            size="large"
            onClick={() => setIsAttendeeFormOpen(false)}
            style={{ borderRadius: 8, fontWeight: 600, padding: "0 20px" }}
          >
            Close
          </Button>,
          selectedAttendeeForm?.feedback_form && (
            <Popconfirm
              key="revision"
              title="Request Form Revision"
              description="Notify the volunteer to review and revise their submitted hours or impact details?"
              onConfirm={() => {
                handleRequestRevision(selectedAttendeeForm);
                setIsAttendeeFormOpen(false);
              }}
              okText="Request Revision"
              cancelText="Cancel"
            >
              <Button
                size="large"
                danger
                icon={<CloseCircleOutlined />}
                style={{ borderRadius: 8, fontWeight: 600, padding: "0 18px" }}
              >
                Request Revision
              </Button>
            </Popconfirm>
          ),
          selectedAttendeeForm?.feedback_form?.testimonial && (
            <Button
              key="story"
              size="large"
              icon={<StarOutlined />}
              onClick={() => {
                handlePromoteToStory(selectedAttendeeForm);
                setIsAttendeeFormOpen(false);
              }}
              style={{ fontWeight: 700, borderRadius: 8, color: "#d97706", borderColor: "#f59e0b", background: "#fffbeb", padding: "0 18px" }}
            >
              Feature in Story
            </Button>
          ),
          selectedAttendeeForm?.feedback_form && (
            <Button
              key="adjust"
              size="large"
              icon={<EditOutlined />}
              onClick={() => {
                setIsAttendeeFormOpen(false);
                handleOpenAdjustModal(selectedAttendeeForm);
              }}
              style={{ fontWeight: 700, borderRadius: 8, borderColor: "#3b82f6", color: "#1d4ed8", background: "#eff6ff", padding: "0 18px" }}
            >
              Adjust Hours
            </Button>
          ),
          selectedAttendeeForm?.feedback_form && (
            <Popconfirm
              key="approve"
              title="Approve Form & Credit Hours"
              description={`Approve and credit ${selectedAttendeeForm.feedback_form.hours || selectedAttendeeForm.hours || 4} hours to ${selectedAttendeeForm.name}?`}
              onConfirm={() => {
                handleApproveFormSubmission(selectedAttendeeForm);
                setIsAttendeeFormOpen(false);
              }}
              okText="Yes, Approve"
              cancelText="Cancel"
              okButtonProps={{ style: { background: "#16a34a", borderColor: "#16a34a" } }}
            >
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  borderColor: "#16a34a",
                  fontWeight: 800,
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)",
                  padding: "0 24px"
                }}
              >
                Approve Form & Credit Hours
              </Button>
            </Popconfirm>
          )
        ]}
        width={"80vw"}
        style={{ top: 20, maxWidth: 1060 }}
        destroyOnHidden={true}
      >
        {selectedAttendeeForm?.feedback_form ? (
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
                  {selectedAttendeeForm.name?.[0]}
                </Avatar>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
                    {selectedAttendeeForm.name || selectedAttendeeForm.feedback_form?.submitted_by || selectedAttendeeForm.feedback_form?.name || "Employee"}
                    <span style={{ fontFamily: "monospace", fontSize: 12, background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: 6, fontWeight: 800 }}>
                      {selectedAttendeeForm.emp_id || selectedAttendeeForm.feedback_form?.emp_id}
                    </span>
                    <Tag color="cyan" style={{ margin: 0, fontWeight: 700, borderRadius: 4 }}>
                      {selectedAttendeeForm.dept || selectedAttendeeForm.feedback_form?.dept || "General"}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    <span>📧 {selectedAttendeeForm.email || selectedAttendeeForm.feedback_form?.email}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: 12, color: "#475569" }}>
                <div>⏱️ <strong>Shift Time:</strong> {selectedAttendeeForm.check_in || selectedAttendeeForm.feedback_form.check_in_time || "09:00 AM"} {selectedAttendeeForm.check_out ? `- ${selectedAttendeeForm.check_out}` : ""}</div>
                <div style={{ marginTop: 4, color: "#64748b" }}>📅 <strong>Submitted on:</strong> {selectedAttendeeForm.feedback_form.submitted_at || "Event Completion"}</div>
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
                    {selectedAttendeeForm.feedback_form.hours || selectedAttendeeForm.hours || 4} <span style={{ fontSize: 14, fontWeight: 700 }}>hrs</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 4, fontWeight: 700 }}>
                    {selectedAttendeeForm.status === "Attended" ? "✓ Verified Check-in" : "Self-Reported Attendance"}
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
                    <Rate disabled value={selectedAttendeeForm.feedback_form.rating || 5} style={{ color: "#f59e0b", fontSize: 18 }} />
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#b45309" }}>
                      {selectedAttendeeForm.feedback_form.rating || 5}.0
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#d97706", marginTop: 4, fontWeight: 700 }}>
                    {(selectedAttendeeForm.feedback_form.rating || 5) >= 5 ? "🌟 Highly Satisfied" : "👍 Positive Experience"}
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
                    {selectedAttendeeForm.feedback_form.verification_status === "Approved" ? (
                      <>
                        <CheckCircleOutlined style={{ color: "#16a34a" }} />
                        <span>Hours Verified & Credited</span>
                      </>
                    ) : selectedAttendeeForm.feedback_form.verification_status === "Approved with Adjustment" ? (
                      <>
                        <EditOutlined style={{ color: "#0891b2" }} />
                        <span>Adjusted & Credited</span>
                      </>
                    ) : selectedAttendeeForm.feedback_form.verification_status === "Revision Requested" ? (
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
                    CSR Points Earned: <strong>{((Number(selectedAttendeeForm.feedback_form.hours || selectedAttendeeForm.hours || 4)) * 10)} pts</strong>
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
                {selectedAttendeeForm.feedback_form.learnings || "Contributed proactively to all assigned on-ground volunteering activities, supported beneficiary interactions, and completed event goals."}
              </div>
            </div>

            {/* Testimonial Quote */}
            {selectedAttendeeForm.feedback_form.testimonial && (
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
                  “{selectedAttendeeForm.feedback_form.testimonial}”
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#9f1239", marginTop: 8 }}>
                  — {selectedAttendeeForm.name}, {selectedAttendeeForm.dept}
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
                  {getVolunteerPhotos(selectedAttendeeForm).length + getVolunteerDocuments(selectedAttendeeForm).length} Files Attached
                </Tag>
              </div>

              {/* Photos Gallery */}
              {getVolunteerPhotos(selectedAttendeeForm).length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <PictureOutlined style={{ color: "#ea580c" }} />
                    On-Ground Activity Photos ({getVolunteerPhotos(selectedAttendeeForm).length}) — <span style={{ fontWeight: 500, color: "#94a3b8" }}>Click to zoom and preview in lightbox</span>
                  </div>
                  <Image.PreviewGroup>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {getVolunteerPhotos(selectedAttendeeForm).map((photoUrl, idx) => (
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
              {getVolunteerDocuments(selectedAttendeeForm).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <FilePdfOutlined style={{ color: "#dc2626" }} />
                    Uploaded Verification Files ({getVolunteerDocuments(selectedAttendeeForm).length}):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                    {getVolunteerDocuments(selectedAttendeeForm).map((doc, idx) => {
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
                                ghost
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  if (isImg) {
                                    // Image preview
                                    setDocPreviewModal({ open: true, url: doc.file_path, title: doc.file_name, isPdf: false, isImage: true });
                                  } else if (isPdf) {
                                    // PDF preview
                                    setDocPreviewModal({ open: true, url: doc.file_path, title: doc.file_name, isPdf: true, isImage: false });
                                  } else {
                                    window.open(doc.file_path, "_blank");
                                  }
                                }}
                                style={{ borderRadius: 6, fontWeight: 700, fontSize: 12 }}
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

              {getVolunteerPhotos(selectedAttendeeForm).length === 0 && getVolunteerDocuments(selectedAttendeeForm).length === 0 && (
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

            {/* Admin Notes / Review History */}
            {selectedAttendeeForm.feedback_form.admin_notes && (
              <div style={{
                background: "#f0f9ff",
                padding: "14px 18px",
                borderRadius: 12,
                border: "1px solid #bae6fd"
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Admin Reviewer Notes & Remarks
                </div>
                <div style={{
                  fontSize: 13,
                  color: "#0c4a6e",
                  lineHeight: 1.6
                }}>
                  {selectedAttendeeForm.feedback_form.admin_notes}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
            <FileTextOutlined style={{ fontSize: 44, color: "#cbd5e1", marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#475569" }}>
              No post-event form submission found for this attendee.
            </div>
          </div>
        )}
      </Modal>

      {/* In-App Document / PDF / Image Quick Preview Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              {docPreviewModal.isPdf ? <FilePdfOutlined style={{ color: "#dc2626" }} /> :
               docPreviewModal.isImage ? <PictureOutlined style={{ color: "#ea580c" }} /> :
               <FileOutlined style={{ color: "#2563eb" }} />}
              <span className="truncate" style={{ maxWidth: 500 }} title={docPreviewModal.title}>
                Document Preview: {docPreviewModal.title}
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
        open={docPreviewModal.open}
        onCancel={() => setDocPreviewModal({ open: false, url: "", title: "", isPdf: false, isImage: false })}
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
        width={"80vw"}
        style={{ top: 20, maxWidth: 1100 }}
        destroyOnHidden={true}
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

      {/* Edit Event Modal (FormBuilder Engine) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
            <EditOutlined style={{ color: "#7c3aed" }} />
            Edit Volunteering Event: {event.event_id || event.event_name}
          </div>
        }
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        footer={null}
        width={"75vw"}
        style={{ top: 20, maxWidth: "96vw" }}
        destroyOnHidden={true}
        maskClosable={false}
      >
        {isEditOpen && (
          <DynamicAddEditFormV2
            form_slug="volunteering_event"
            mode="edit"
            selectedData={{ id: eventId || event.id, ...event }}
            onClose={() => {
              setIsEditOpen(false);
              fetchEventData();
            }}
            fetchData={fetchEventData}
          />
        )}
      </Modal>

      {/* Adjust Hours Modal */}
      <AdjustHoursModal
        open={isAdjustModalOpen}
        onCancel={() => setIsAdjustModalOpen(false)}
        volunteer={selectedAdjustVolunteer}
        onSave={handleSaveAdjustHours}
      />

      {/* Lifecycle Action Modals */}
      <VolunteeringAttendanceModal
        open={isAttendanceOpen}
        onCancel={() => setIsAttendanceOpen(false)}
        event={event}
        onUpdateEvent={handleUpdateEvent}
      />

      <VolunteeringClosureModal
        open={isClosureOpen}
        onCancel={() => setIsClosureOpen(false)}
        event={event}
        onUpdateEvent={handleUpdateEvent}
      />

      <VolunteeringStoryModal
        open={isStoryOpen}
        onCancel={() => setIsStoryOpen(false)}
        event={event}
        onUpdateEvent={handleUpdateEvent}
      />
    </div>
  );
}

/**
 * Isolated Adjust Hours Modal Component to encapsulate form state & prevent useForm disconnect warnings
 */
function AdjustHoursModal(props) {
  if (!props.open || !props.volunteer) return null;
  return <AdjustHoursModalContent {...props} />;
}

function AdjustHoursModalContent({ open, onCancel, volunteer, onSave }) {
  const [form] = Form.useForm();
  const claimedHours = volunteer.feedback_form?.hours !== undefined ? volunteer.feedback_form.hours : (volunteer.hours || 4.0);

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
          <EditOutlined style={{ color: "#2563eb" }} />
          Review & Adjust Volunteer Hours: {volunteer.name} ({volunteer.emp_id})
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Save & Apply Review"
      cancelText="Cancel"
      destroyOnHidden={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onSave(values)}
        initialValues={{
          hours: claimedHours,
          verification_status: volunteer.feedback_form?.verification_status || "Approved",
          admin_notes: volunteer.feedback_form?.admin_notes || ""
        }}
        style={{ marginTop: 12 }}
      >
        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 12, color: "#475569" }}>
          <div><strong>Employee:</strong> {volunteer.name} ({volunteer.dept})</div>
          <div><strong>Original Claimed Hours:</strong> {claimedHours} hrs</div>
          {volunteer.feedback_form?.learnings && (
            <div style={{ marginTop: 4 }}><strong>Learnings:</strong> {volunteer.feedback_form.learnings}</div>
          )}
        </div>

        <Form.Item
          name="hours"
          label={<span style={{ fontWeight: 700 }}>Approved / Verified Hours</span>}
          rules={[{ required: true, message: "Please enter approved volunteer hours" }]}
        >
          <InputNumber min={0} max={24} step={0.5} style={{ width: "100%" }} addonAfter="Hours" />
        </Form.Item>

        <Form.Item
          name="verification_status"
          label={<span style={{ fontWeight: 700 }}>Verification Decision</span>}
          rules={[{ required: true, message: "Please select verification status" }]}
        >
          <Select
            options={[
              { value: "Approved", label: "✓ Approve & Credit Full Claimed Hours" },
              { value: "Approved with Adjustment", label: "⚙️ Approve with Hours Adjustment" },
              { value: "Revision Requested", label: "⚠️ Request Revision from Volunteer" }
            ]}
          />
        </Form.Item>

        <Form.Item
          name="admin_notes"
          label={<span style={{ fontWeight: 700 }}>Admin Reviewer Notes / Remarks</span>}
        >
          <Input.TextArea rows={3} placeholder="e.g. Verified attendance sheet with on-ground NGO coordinator." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

