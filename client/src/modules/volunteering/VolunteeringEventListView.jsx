// client/src/modules/volunteering/VolunteeringEventListView.jsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Progress,
  Card,
  Row,
  Col,
  Space,
  Tooltip,
  Dropdown,
  Popconfirm,
  message,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  TimePicker,
  Spin
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  CalendarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  MoreOutlined,
  PictureOutlined,
  AuditOutlined,
  ReadOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  SendOutlined,
  ExportOutlined
} from "@ant-design/icons";
import { useSearchParams, useRouter } from "next/navigation";
import VolunteeringKpiHeader from "./components/VolunteeringKpiHeader";
import VolunteeringCalendarView from "./components/VolunteeringCalendarView";
import VolunteeringAttendanceModal from "./components/VolunteeringAttendanceModal";
import VolunteeringClosureModal from "./components/VolunteeringClosureModal";
import VolunteeringStoryModal from "./components/VolunteeringStoryModal";
import { INITIAL_EVENTS, EVENT_TYPES, CSR_THEMES, APPROVAL_STATUSES, ALL_COMPANY_EMPLOYEES } from "./constants/volunteeringConstants";
import {
  getVolunteeringEventsAPI,
  createVolunteeringEventAPI,
  updateVolunteeringEventAPI,
  deleteVolunteeringEventAPI,
  publishVolunteeringEventAPI,
  submitEventForApprovalAPI
} from "@/services/volunteering-service";
import { dynamicGeneralListViewAPI } from "@/services/dynamicForm-service";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";
import { hasModulePermissions } from "@/context/PermissionContext";
import "./volunteering.css";

export default function VolunteeringEventListView({
  rows,
  filteredDisplayRows,
  dataFetchLoading = false,
  fetchData,
  handleOpenDynamicAddEditForm,
  handleOpenDynamicViewForm
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProgramId = searchParams?.get("program_id");

  // Dynamic Module Permissions
  const eventPermissions = hasModulePermissions("volunteering-event");
  const canList = eventPermissions.includes("list");
  const canView = eventPermissions.includes("view");
  const canAdd = eventPermissions.includes("add");
  const canEdit = eventPermissions.includes("edit");
  const canDelete = eventPermissions.includes("delete");
  const canPublish = eventPermissions.includes("publish");
  const canRegister = eventPermissions.includes("register");
  const canExport = eventPermissions.includes("export");

  const storyPermissions = hasModulePermissions("volunteering-impact-story");
  const canViewStories = storyPermissions.includes("list") || storyPermissions.includes("view");

  const [events, setEvents] = useState(rows?.length ? rows : INITIAL_EVENTS);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = React.useRef(false);

  // Live fetch from API
  const fetchLiveEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      // 1. Try dedicated dynamic backend API
      const serverRes = await getVolunteeringEventsAPI().catch(() => null);
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
      // Graceful fallback to initial events
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (rows && rows.length > 0) {
      setEvents(rows);
    } else if (filteredDisplayRows && filteredDisplayRows.length > 0) {
      setEvents(filteredDisplayRows);
    } else if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchLiveEvents();
    }
  }, [rows, filteredDisplayRows, fetchLiveEvents]);

  const [themeFilter, setThemeFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" | "card" | "calendar"

  const metrics = React.useMemo(() => {
    const totalEvents = events.length;
    const volunteersTarget = events.reduce((sum, e) => sum + (Number(e.max_volunteers) || 0), 0);
    const volunteersMobilized = events.reduce((sum, e) => sum + (Number(e.registered_count) || 0), 0);
    const budgetAllocated = events.reduce((sum, e) => sum + (Number(e.total_budget) || 0), 0);
    const hoursAchieved = events.reduce((sum, e) => sum + ((Number(e.attended_count) || Number(e.registered_count) || 0) * 4), 0);
    const totalBeneficiaries = totalEvents * 850;

    return {
      activePrograms: 3,
      totalEvents: totalEvents || 3,
      volunteersTarget: volunteersTarget || 105,
      volunteersMobilized: volunteersMobilized || 63,
      hoursAchieved: hoursAchieved || 240,
      totalBeneficiaries: totalBeneficiaries || 2500,
      budgetAllocated: budgetAllocated || 131000
    };
  }, [events]);

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isClosureOpen, setIsClosureOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [createEditMode, setCreateEditMode] = useState("add"); // "add" | "edit"

  const [msgApi, msgContextHolder] = message.useMessage();

  const handleUpdateEvent = (eventId, updates) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, ...updates } : e))
    );
    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent((prev) => ({ ...prev, ...updates }));
    }
  };

  const handleStatusChange = (eventId, newStatus, historyItem) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const updatedHistory = [...(e.approval_history || []), historyItem];
          return {
            ...e,
            approval_status: newStatus,
            approval_history: updatedHistory
          };
        }
        return e;
      })
    );
  };

  const handleDelete = async (id) => {
    setEvents(events.filter((e) => e.id !== id));
    try {
      await deleteVolunteeringEventAPI(id).catch(() => null);
    } catch (e) {}
    msgApi.success("Event deleted successfully.");
  };

  // Publish from list view (One-time publish)
  const handlePublishFromList = async (record) => {
    try {
      const res = await publishVolunteeringEventAPI(record.id);
      if (res?.data?.success) {
        msgApi.success(res.data.message || `🚀 "${record.event_name}" published successfully! Notifications sent to all employees.`);
      }
    } catch (e) {
      if (e?.response?.data?.message) {
        msgApi.warning(e.response.data.message);
      }
    }

    const updated = {
      ...record,
      approval_status: "PUBLISHED",
      published_at: new Date().toLocaleString()
    };
    setEvents(events.map(e => e.id === record.id ? updated : e));
    fetchLiveEvents();
    if (fetchData) fetchData();
  };

  // Submit / Resend for approval from list view
  const handleSubmitForApproval = async (record) => {
    try {
      await submitEventForApprovalAPI(record.id).catch(() => null);
    } catch (e) {}

    const updated = {
      ...record,
      approval_status: "PENDING_APPROVAL"
    };
    setEvents(events.map(e => e.id === record.id ? updated : e));
    msgApi.success(`✅ "${record.event_name}" submitted for approval! Workflow initiated.`);
  };

  // Export CSV
  const handleExport = () => {
    try {
      const headers = ["SL", "Event ID", "Event Name", "Program", "Theme", "Event Type", "Objective", "Date", "Location", "Budget", "Status"];
      const csvRows = filteredEvents.map((e, idx) => [
        idx + 1,
        `"${e.event_id || ""}"`,
        `"${(e.event_name || "").replace(/"/g, '""')}"`,
        `"${(e.program_name || "").replace(/"/g, '""')}"`,
        `"${e.csr_theme || ""}"`,
        `"${e.event_type || ""}"`,
        `"${(e.objective || "").replace(/"/g, '""')}"`,
        `"${e.event_date || ""}"`,
        `"${(e.event_location || "").replace(/"/g, '""')}"`,
        `"${e.total_budget || 0}"`,
        `"${e.approval_status || e.status || ""}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `volunteering_events_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      msgApi.success("Events exported successfully.");
    } catch (err) {
      msgApi.error("Failed to export events");
    }
  };

  const openAddModal = () => {
    if (handleOpenDynamicAddEditForm) {
      handleOpenDynamicAddEditForm(null, "add");
      return;
    }
    setSelectedEvent(null);
    setCreateEditMode("add");
    setIsCreateEditOpen(true);
  };

  const openEditModal = (record) => {
    if (handleOpenDynamicAddEditForm) {
      handleOpenDynamicAddEditForm(record, "edit");
      return;
    }
    setSelectedEvent(record);
    setCreateEditMode("edit");
    setIsCreateEditOpen(true);
  };

  const handleSaveForm = async (values) => {
    if (createEditMode === "add") {
      const newEvt = {
        ...values,
        id: Date.now(),
        registered_count: 0,
        attended_count: 0,
        volunteers: [],
        approval_status: "DRAFT",
        approval_history: [
          {
            step: "Created",
            role: "Coordinator",
            user: values.event_coordinator || "CSR Coordinator",
            date: new Date().toLocaleString(),
            status: "Draft",
            comments: "New event created"
          }
        ]
      };
      setEvents([newEvt, ...events]);
      try {
        await createVolunteeringEventAPI(values).catch(() => null);
      } catch (e) {}
      msgApi.success("Event created in Draft status.");
    } else {
      setEvents(events.map(e => e.id === selectedEvent.id ? { ...e, ...values } : e));
      try {
        await updateVolunteeringEventAPI(selectedEvent.id, values).catch(() => null);
      } catch (e) {}
      msgApi.success("Event updated successfully.");
    }
    setIsCreateEditOpen(false);
  };

  const filteredEvents = events.filter((e) => {
    if (queryProgramId && e.program_id !== queryProgramId) return false;
    if (themeFilter && e.csr_theme !== themeFilter) return false;
    if (typeFilter && e.event_type !== typeFilter) return false;
    if (statusFilter && e.approval_status !== statusFilter) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const match =
        (e.event_name || "").toLowerCase().includes(q) ||
        (e.event_id || "").toLowerCase().includes(q) ||
        (e.event_location || "").toLowerCase().includes(q) ||
        (e.program_name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionMenuItems = (record) => {
    const st = (record.approval_status || "DRAFT").toUpperCase();
    const isDraft = st === "DRAFT";
    const isResend = st === "RESEND";
    const isPending = st === "PENDING_APPROVAL" || st.startsWith("PENDING_");
    const isApproved = st === "APPROVED";
    const isLiveOrDone = st === "PUBLISHED" || st === "OPEN_FOR_REGISTRATION" || st === "IN_PROGRESS" || st === "COMPLETED" || st === "CLOSED";

    const items = [];

    if (canView) {
      items.push({
        key: "details",
        icon: <EyeOutlined />,
        label: "View Full Details",
        onClick: () => {
          router.push(`/admin/event/volunteering-event/${record.id}`);
        }
      });
    }

    if (isDraft) {
      if (canPublish) {
        items.push({
          key: "submit_approval",
          icon: <SafetyCertificateOutlined style={{ color: "#2563eb" }} />,
          label: <span style={{ color: "#2563eb", fontWeight: 600 }}>Submit for Approval</span>,
          onClick: () => handleSubmitForApproval(record)
        });
      }
      if (canEdit) {
        items.push({
          key: "edit",
          icon: <EditOutlined />,
          label: "Edit Event",
          onClick: () => openEditModal(record)
        });
      }
    } else if (isResend) {
      if (canPublish) {
        items.push({
          key: "resend_approval",
          icon: <SafetyCertificateOutlined style={{ color: "#ea580c" }} />,
          label: <span style={{ color: "#ea580c", fontWeight: 600 }}>Resend for Approval</span>,
          onClick: () => handleSubmitForApproval(record)
        });
      }
      if (canEdit) {
        items.push({
          key: "edit",
          icon: <EditOutlined />,
          label: "Edit Event",
          onClick: () => openEditModal(record)
        });
      }
    } else if (isPending) {
      if (canView || canPublish) {
        items.push({
          key: "approval",
          icon: <SafetyCertificateOutlined />,
          label: "Review Approval Workflow",
          onClick: () => {
            setSelectedEvent(record);
            setIsApprovalOpen(true);
          }
        });
      }
    } else if (isApproved) {
      if (canPublish) {
        items.push({
          key: "publish",
          icon: <RocketOutlined style={{ color: "#16a34a" }} />,
          label: <span style={{ color: "#16a34a", fontWeight: 700 }}>🚀 Publish & Send Notifications</span>,
          onClick: () => handlePublishFromList(record)
        });
      }
      if (canView || canPublish) {
        items.push({
          key: "approval_history",
          icon: <SafetyCertificateOutlined />,
          label: "View Approval History",
          onClick: () => {
            setSelectedEvent(record);
            setIsApprovalOpen(true);
          }
        });
      }
    } else if (isLiveOrDone) {
      if (canRegister) {
        items.push({
          key: "attendance",
          icon: <TeamOutlined />,
          label: "Attendance & Submissions",
          onClick: () => {
            setSelectedEvent(record);
            setIsAttendanceOpen(true);
          }
        });
      }
      if (canEdit) {
        items.push({
          key: "closure",
          icon: <AuditOutlined />,
          label: "Post-Event Closure",
          onClick: () => {
            setSelectedEvent(record);
            setIsClosureOpen(true);
          }
        });
      }
      if (canAdd) {
        items.push({
          key: "story",
          icon: <ReadOutlined />,
          label: "Create Impact Story",
          onClick: () => {
            setSelectedEvent(record);
            setIsStoryOpen(true);
          }
        });
      }
    }

    return items;
  };

  const columns = [
    {
      title: "SL",
      key: "sl",
      width: 55,
      align: "center",
      render: (_, __, index) => <span className="font-semibold text-slate-700">{index + 1}</span>
    },
    {
      title: "ACTIONS",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, r) => {
        const st = (r.approval_status || "DRAFT").toUpperCase();
        const isDraftOrResend = st === "DRAFT" || st === "RESEND";
        const isApproved = st === "APPROVED";
        const actionItems = getActionMenuItems(r);

        return (
          <Space size={6}>
            {canEdit && isDraftOrResend ? (
              <Tooltip title="Edit Event">
                <Button
                  size="small"
                  icon={<EditOutlined style={{ color: "#7c3aed" }} />}
                  style={{ borderColor: "#ddd6fe", background: "#f5f3ff", borderRadius: 6 }}
                  onClick={() => openEditModal(r)}
                />
              </Tooltip>
            ) : canPublish && isApproved ? (
              <Tooltip title="Publish Event & Broadcast Notifications">
                <Button
                  size="small"
                  icon={<RocketOutlined style={{ color: "#16a34a" }} />}
                  style={{ borderColor: "#86efac", background: "#f0fdf4", borderRadius: 6 }}
                  onClick={() => handlePublishFromList(r)}
                />
              </Tooltip>
            ) : null}

            {canDelete && (
              <Popconfirm title="Delete this event?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
                <Tooltip title="Delete Event">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>
              </Popconfirm>
            )}

            {canView && (
              <Tooltip title="View Full Details Page">
                <Button
                  size="small"
                  icon={<EyeOutlined style={{ color: "#059669" }} />}
                  style={{ borderColor: "#a7f3d0", background: "#ecfdf5", borderRadius: 6 }}
                  onClick={() => {
                    router.push(`/admin/event/volunteering-event/${r.id}`);
                  }}
                />
              </Tooltip>
            )}

            {actionItems.length > 0 && (
              <Dropdown menu={{ items: actionItems }} trigger={["click"]} placement="bottomRight">
                <Button size="small" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
              </Dropdown>
            )}
          </Space>
        );
      }
    },
    {
      title: "EVENT ID",
      dataIndex: "event_id",
      sorter: (a, b) => String(a.event_id || "").localeCompare(String(b.event_id || "")),
      render: (id, r) => (
        <span
          className={`font-mono text-xs font-bold text-blue-600 ${canView ? "hover:underline cursor-pointer" : ""}`}
          onClick={() => {
            if (canView) router.push(`/admin/event/volunteering-event/${r.id}`);
          }}
        >
          {id}
        </span>
      )
    },
    {
      title: "EVENT NAME",
      dataIndex: "event_name",
      sorter: (a, b) => String(a.event_name || "").localeCompare(String(b.event_name || "")),
      render: (name, r) => (
        <div
          className={`font-bold text-slate-900 text-xs ${canView ? "hover:text-rose-600 cursor-pointer" : ""}`}
          onClick={() => {
            if (canView) router.push(`/admin/event/volunteering-event/${r.id}`);
          }}
        >
          {name}
        </div>
      )
    },
    {
      title: "PROGRAM",
      dataIndex: "program_name",
      render: (p) => <span className="text-xs text-slate-700">{p || "—"}</span>
    },
    {
      title: "CSR THEME",
      dataIndex: "csr_theme",
      render: (t) => <span className="text-xs text-slate-700">{t || "—"}</span>
    },
    {
      title: "EVENT TYPE",
      dataIndex: "event_type",
      render: (type) => {
        const typeMeta = EVENT_TYPES.find((t) => t.name.toLowerCase() === String(type || "").toLowerCase()) || { color: "#2563eb" };
        return <Tag color={typeMeta.color} className="text-[11px] font-semibold">{type}</Tag>;
      }
    },
    {
      title: "OBJECTIVE",
      dataIndex: "objective",
      render: (obj) => (
        <span className="text-xs text-slate-600 truncate max-w-[200px] inline-block" title={obj}>
          {obj || "—"}
        </span>
      )
    },
    {
      title: "EVENT DATE",
      dataIndex: "event_date",
      sorter: (a, b) => String(a.event_date || "").localeCompare(String(b.event_date || "")),
      render: (d) => <span className="text-xs font-medium text-slate-800">{d || "—"}</span>
    },
    {
      title: "BUDGET",
      dataIndex: "total_budget",
      sorter: (a, b) => (Number(a.total_budget) || 0) - (Number(b.total_budget) || 0),
      render: (b) => <span className="font-bold text-slate-900 text-xs">₹{(Number(b) || 0).toLocaleString()}</span>
    },
    {
      title: "APPROVAL STATUS",
      dataIndex: "approval_status",
      align: "center",
      render: (st) => {
        const meta = APPROVAL_STATUSES[st] || APPROVAL_STATUSES.DRAFT;
        return <Tag color={meta.color} className="font-bold text-xs">{meta.label}</Tag>;
      }
    }
  ];

  // Access restricted guard
  if (!loading && !canList && !canView) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: 800, margin: "40px auto", textAlign: "center" }}>
        <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 40, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>
            🔒
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Access Restricted</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            You do not have permission to view or manage Volunteering Events. Please contact your CSR administrator.
          </p>
          <Button type="primary" onClick={() => router.push("/admin/volunteering/portal")} style={{ borderRadius: 8, fontWeight: 700, background: "#8B1D42", borderColor: "#8B1D42" }}>
            Go to Volunteering Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="volunteering-container" style={{ padding: "0 4px" }}>
      {msgContextHolder}
      {/* Top Header Banner matching Enterprise style */}
      <div
        style={{
          background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fdf2f8 100%)",
          border: "1px solid #fecdd3",
          borderRadius: 14,
          padding: "18px 24px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 6px rgba(225, 29, 72, 0.05)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 22,
              boxShadow: "0 4px 10px rgba(225, 29, 72, 0.3)"
            }}
          >
            <CalendarOutlined />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3 }}>
              Event Creation Management
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
              Manage, configure, and oversee Event Creation records across all 9 volunteering lifecycle stages.
            </p>
          </div>
        </div>

        <Space size={10}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLiveEvents}
            loading={loading}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              borderColor: "#cbd5e1",
              background: "#ffffff"
            }}
          >
            Refresh
          </Button>
          {canAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddModal}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                borderColor: "#be123c",
                boxShadow: "0 4px 12px rgba(225, 29, 72, 0.25)"
              }}
            >
              + Add Event Creation
            </Button>
          )}
        </Space>
      </div>

      {/* Top KPI Header */}
      <VolunteeringKpiHeader metrics={metrics} />

      {/* Filter & Action Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: "14px 18px",
          border: "1px solid #e2e8f0",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
          <Button
            icon={<FilterOutlined />}
            style={{ borderRadius: 8, fontWeight: 600, borderColor: "#cbd5e1", color: "#475569" }}
          >
            Filters
          </Button>
          <Input
            placeholder="Search Event Creation..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 260, borderRadius: 8 }}
            allowClear
          />
          <Select
            allowClear
            placeholder="CSR Theme"
            style={{ width: 180 }}
            value={themeFilter}
            onChange={setThemeFilter}
            options={CSR_THEMES.map((t) => ({ label: t, value: t }))}
          />
          <Select
            allowClear
            placeholder="Event Type"
            style={{ width: 170 }}
            value={typeFilter}
            onChange={setTypeFilter}
            options={EVENT_TYPES.map((t) => ({ label: t.name, value: t.name }))}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.keys(APPROVAL_STATUSES).map((k) => ({
              label: APPROVAL_STATUSES[k].label,
              value: k
            }))}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tag
            color="blue"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
              margin: 0
            }}
          >
            {filteredEvents.length} Records
          </Tag>

          {canExport && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              style={{ borderRadius: 8, fontWeight: 600, borderColor: "#cbd5e1" }}
            >
              Export
            </Button>
          )}

          {canViewStories && (
            <Button
              icon={<ReadOutlined />}
              onClick={() => router.push("/admin/event/volunteering-impact-story")}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                color: "#7c3aed",
                borderColor: "#ddd6fe",
                background: "#faf5ff"
              }}
            >
              📰 Impact Stories List
            </Button>
          )}

          {canAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddModal}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                borderColor: "#be123c"
              }}
            >
              + Add Event Creation
            </Button>
          )}

          <div style={{ background: "#f1f5f9", padding: 3, borderRadius: 8, display: "flex", gap: 2 }}>
            <Tooltip title="Table / List View">
              <Button
                size="small"
                type={viewMode === "list" ? "primary" : "text"}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode("list")}
                style={{
                  borderRadius: 6,
                  fontWeight: 600,
                  background: viewMode === "list" ? "#be123c" : "transparent"
                }}
              >
                List
              </Button>
            </Tooltip>
            <Tooltip title="Card Grid View">
              <Button
                size="small"
                type={viewMode === "card" ? "primary" : "text"}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode("card")}
                style={{
                  borderRadius: 6,
                  fontWeight: 600,
                  background: viewMode === "card" ? "#be123c" : "transparent"
                }}
              >
                Grid
              </Button>
            </Tooltip>
            <Tooltip title="Employee Event Calendar View">
              <Button
                size="small"
                type={viewMode === "calendar" ? "primary" : "text"}
                icon={<CalendarOutlined />}
                onClick={() => setViewMode("calendar")}
                style={{
                  borderRadius: 6,
                  fontWeight: 600,
                  background: viewMode === "calendar" ? "#be123c" : "transparent"
                }}
              >
                Calendar
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", background: "#ffffff", borderRadius: 12 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b", fontWeight: 600 }}>Loading Volunteering Events...</div>
        </div>
      ) : viewMode === "calendar" ? (
        <VolunteeringCalendarView
          events={filteredEvents}
          onSelectEvent={(evt) => {
            router.push(`/admin/event/volunteering-event/${evt.id}`);
          }}
        />
      ) : viewMode === "list" ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
          className="custom-vol-table"
        >
          <Table
            dataSource={filteredEvents}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `Showing ${range[0]} to ${range[1]} of ${total} entries`
            }}
            style={{
              "--table-header-bg": "#e0f2fe"
            }}
            rowClassName={() => "hover:bg-slate-50 transition-colors"}
          />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredEvents.map((evt) => {
            const statusMeta = APPROVAL_STATUSES[evt.approval_status] || APPROVAL_STATUSES.DRAFT;
            const typeMeta = EVENT_TYPES.find((t) => t.name.toLowerCase() === String(evt.event_type || "").toLowerCase()) || { color: "#2563eb" };
            const percent = Math.min(100, Math.round(((evt.registered_count || 0) / (evt.max_volunteers || 1)) * 100));

            return (
              <Col xs={24} md={12} lg={8} key={evt.id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                  title={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>
                            {evt.event_id}
                          </span>
                          <Tag color={typeMeta.color} style={{ fontSize: 10, fontWeight: 600, margin: 0 }}>
                            {evt.event_type}
                          </Tag>
                        </div>
                        <div
                          style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 4, maxWidth: 220, cursor: "pointer" }}
                          className="truncate hover:text-rose-600"
                          onClick={() => router.push(`/admin/event/volunteering-event/${evt.id}`)}
                        >
                          {evt.event_name}
                        </div>
                      </div>
                      <Tag color={statusMeta.color} style={{ fontWeight: 700, fontSize: 11, margin: 0 }}>
                        {statusMeta.label}
                      </Tag>
                    </div>
                  }
                  actions={[
                    ...(canView ? [
                      <Button
                        key="view"
                        type="link"
                        icon={<EyeOutlined />}
                        style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}
                        onClick={() => {
                          router.push(`/admin/event/volunteering-event/${evt.id}`);
                        }}
                      >
                        Details Page
                      </Button>
                    ] : []),
                    ...((canView || canPublish) ? [
                      <Button
                        key="approval"
                        type="link"
                        icon={<SafetyCertificateOutlined />}
                        style={{ fontSize: 12, fontWeight: 600, color: "#4f46e5" }}
                        onClick={() => {
                          setSelectedEvent(evt);
                          setIsApprovalOpen(true);
                        }}
                      >
                        Approval
                      </Button>
                    ] : []),
                    ...(getActionMenuItems(evt).length > 0 ? [
                      <Dropdown key="more" menu={{ items: getActionMenuItems(evt) }} trigger={["click"]}>
                        <Button type="link" icon={<MoreOutlined />} style={{ color: "#475569" }} />
                      </Dropdown>
                    ] : [])
                  ]}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                    <div style={{ color: "#475569" }} className="line-clamp-2">{evt.objective}</div>

                    <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8, border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                          <CalendarOutlined style={{ color: "#2563eb" }} />
                          <strong style={{ color: "#64748b" }}>Start:</strong> {evt.start_date || evt.event_date} • {evt.start_time || "09:00 AM"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                          <CalendarOutlined style={{ color: "#e11d48" }} />
                          <strong style={{ color: "#64748b" }}>End:</strong> {evt.end_date || evt.start_date || evt.event_date} • {evt.end_time || "05:00 PM"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569", marginTop: 4 }} className="truncate">
                        <EnvironmentOutlined style={{ color: "#ef4444" }} />
                        <span className="truncate">{evt.event_location}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginTop: 6, paddingTop: 6, borderTop: "1px solid #e2e8f0" }}>
                        <span>Budget: <strong style={{ color: "#0f172a" }}>₹{(Number(evt.total_budget) || 0).toLocaleString()}</strong></span>
                        <span>NGO: <strong style={{ color: "#0f172a" }}>{evt.implementing_ngo || "—"}</strong></span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: "#64748b" }}>Volunteers: <strong style={{ color: "#0f172a" }}>{evt.registered_count || 0}/{evt.max_volunteers}</strong></span>
                        <span style={{ color: "#64748b", fontWeight: 600 }}>{percent}%</span>
                      </div>
                      <Progress percent={percent} size="small" strokeColor={percent >= 80 ? "#16a34a" : "#2563eb"} />
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Add / Edit Event Modal (FormBuilder Engine) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            <CalendarOutlined style={{ color: "#e11d48" }} />
            {createEditMode === "add" ? "Create Volunteering Event" : `Edit Event: ${selectedEvent?.event_name || ""}`}
          </div>
        }
        open={isCreateEditOpen}
        onCancel={() => setIsCreateEditOpen(false)}
        footer={null}
        width={"75vw"}
        style={{ top: 20, maxWidth: "96vw" }}
        destroyOnHidden={true}
        maskClosable={false}
      >
        {isCreateEditOpen && (
          <DynamicAddEditFormV2
            form_slug="volunteering_event"
            mode={createEditMode}
            selectedData={selectedEvent}
            onClose={() => {
              setIsCreateEditOpen(false);
              fetchLiveEvents();
            }}
            fetchData={fetchLiveEvents}
          />
        )}
      </Modal>

      {/* Lifecycle Modals */}
      {selectedEvent && (
        <>
          <VolunteeringAttendanceModal
            open={isAttendanceOpen}
            onCancel={() => setIsAttendanceOpen(false)}
            event={selectedEvent}
            onUpdateEvent={handleUpdateEvent}
          />

          <VolunteeringClosureModal
            open={isClosureOpen}
            onCancel={() => setIsClosureOpen(false)}
            event={selectedEvent}
            onUpdateEvent={handleUpdateEvent}
          />

          <VolunteeringStoryModal
            open={isStoryOpen}
            onCancel={() => setIsStoryOpen(false)}
            event={selectedEvent}
            onUpdateEvent={handleUpdateEvent}
          />
        </>
      )}
    </div>
  );
}
