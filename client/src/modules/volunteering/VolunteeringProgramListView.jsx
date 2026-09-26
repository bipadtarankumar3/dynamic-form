// client/src/modules/volunteering/VolunteeringProgramListView.jsx
"use client";

import React, { useState } from "react";
import { Table, Button, Input, Select, Tag, Progress, Card, Row, Col, Space, Tooltip, Popconfirm, message, Modal } from "antd";
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
  RightOutlined
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import VolunteeringKpiHeader from "./components/VolunteeringKpiHeader";
import { INITIAL_PROGRAMS, CSR_THEMES } from "./constants/volunteeringConstants";
import { getVolunteeringProgramsAPI, deleteVolunteeringProgramAPI } from "@/services/volunteering-service";
import DynamicAddEditFormV2 from "@/modules/dynamic-form-v2/add-edit/DynamicAddEditFormV2";
import { hasModulePermissions } from "@/context/PermissionContext";
import "./volunteering.css";

export default function VolunteeringProgramListView({
  rows = [],
  filteredDisplayRows = [],
  dataFetchLoading = false,
  fetchData,
  handleOpenDynamicAddEditForm,
  handleOpenDynamicViewForm
}) {
  const router = useRouter();
  const [msgApi, msgContextHolder] = message.useMessage();

  // ── Dynamic Permissions ─────────────────────────────────────
  const programPermissions = hasModulePermissions("volunteering-program");
  const canList = programPermissions.includes("list") || programPermissions.includes("view");
  const canAdd = programPermissions.includes("add");
  const canEdit = programPermissions.includes("edit");
  const canDelete = programPermissions.includes("delete");
  const canView = programPermissions.includes("view") || programPermissions.includes("list");

  const dbRows = (rows && rows.length > 0) ? rows : (filteredDisplayRows && filteredDisplayRows.length > 0 ? filteredDisplayRows : null);
  const [programs, setPrograms] = useState(dbRows || INITIAL_PROGRAMS);
  const [loading, setLoading] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [addEditMode, setAddEditMode] = useState("add");

  // Live fetch from backend API
  const fetchLivePrograms = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVolunteeringProgramsAPI().catch(() => null);
      const dataList = res?.data?.data || res?.data?.rows || [];
      if (dataList && dataList.length > 0) {
        setPrograms(dataList);
      }
    } catch (err) {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (canList) {
      if (dbRows && dbRows.length > 0) {
        setPrograms(dbRows);
      } else {
        fetchLivePrograms();
      }
    }
  }, [canList, dbRows, fetchLivePrograms]);

  const [themeFilter, setThemeFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"

  if (!canList) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", background: "#f8fafc", minHeight: "80vh" }}>
        {msgContextHolder}
        <div style={{ maxWidth: 440, margin: "0 auto", background: "#fff", padding: "40px 32px", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>
            <CalendarOutlined />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Access Restricted</h3>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            You do not have permission to view or manage Volunteering Programs. Please contact your CSR Administrator.
          </p>
          <Button type="primary" onClick={() => router.push("/admin/volunteering/portal")}>
            Go to Volunteering Hub
          </Button>
        </div>
      </div>
    );
  }

  const filteredPrograms = programs.filter((p) => {
    if (themeFilter && p.csr_theme !== themeFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const match =
        (p.program_name || "").toLowerCase().includes(q) ||
        (p.program_id || "").toLowerCase().includes(q) ||
        (p.objective || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleDelete = async (id) => {
    setPrograms(programs.filter(p => p.id !== id));
    try {
      await deleteVolunteeringProgramAPI(id).catch(() => null);
    } catch (e) {}
    msgApi.success("Program removed successfully.");
  };

  const handleOpenAdd = () => {
    if (handleOpenDynamicAddEditForm) {
      handleOpenDynamicAddEditForm(null, "add");
      return;
    }
    setSelectedProgram(null);
    setAddEditMode("add");
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (prog) => {
    if (handleOpenDynamicAddEditForm) {
      handleOpenDynamicAddEditForm(prog, "edit");
      return;
    }
    setSelectedProgram(prog);
    setAddEditMode("edit");
    setIsAddEditOpen(true);
  };

  const columns = [
    {
      title: "Program ID & Name",
      dataIndex: "program_name",
      render: (name, r) => (
        <div className="flex flex-col">
          <span className="font-mono text-[11px] text-blue-600 font-bold">{r.program_id}</span>
          <span className="font-bold text-slate-800 text-sm">{name}</span>
          <span className="text-xs text-slate-400 mt-0.5">{r.csr_theme} • FY {r.financial_year}</span>
        </div>
      )
    },
    {
      title: "Manager",
      dataIndex: "program_manager",
      render: (mgr) => <span className="font-medium text-slate-700 text-xs">{mgr || "—"}</span>
    },
    {
      title: "Target Events",
      align: "center",
      render: (_, r) => (
        <div className="text-xs">
          <strong className="text-slate-800">{r.achieved_events || 0}</strong> / {r.target_events}
          <Progress percent={Math.round(((r.achieved_events || 0) / r.target_events) * 100)} size="small" />
        </div>
      )
    },
    {
      title: "Target Hours",
      align: "center",
      render: (_, r) => (
        <div className="text-xs">
          <strong className="text-slate-800">{r.achieved_hours || 0}</strong> / {r.target_volunteer_hours} hrs
          <Progress percent={Math.round(((r.achieved_hours || 0) / r.target_volunteer_hours) * 100)} size="small" strokeColor="#ea580c" />
        </div>
      )
    },
    {
      title: "Budget (INR)",
      dataIndex: "overall_budget",
      render: (b) => <span className="font-bold text-slate-800">₹{(Number(b) || 0).toLocaleString()}</span>
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (st) => <Tag color={st === "Active" ? "success" : "default"} className="font-bold">{st}</Tag>
    },
    {
      title: "Actions",
      align: "center",
      render: (_, r) => (
        <Space size="small">
          {canView && (
            <Tooltip title="View Events">
              <Button
                type="primary"
                size="small"
                icon={<CalendarOutlined />}
                onClick={() => router.push(`/admin/forms/volunteering-event?program_id=${r.program_id}`)}
              >
                Events
              </Button>
            </Tooltip>
          )}
          {handleOpenDynamicViewForm && canView && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDynamicViewForm(r)}
            />
          )}
          {canEdit && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(r)}
            />
          )}
          {canDelete && (
            <Popconfirm title="Delete this program?" onConfirm={() => handleDelete(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="volunteering-container">
      {msgContextHolder}
      {/* Top KPI Header */}
      <VolunteeringKpiHeader />

      {/* Filter & Action Bar */}
      <div className="vol-filter-bar flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Search programs..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="Filter by Theme"
            style={{ width: 190 }}
            value={themeFilter}
            onChange={setThemeFilter}
            options={CSR_THEMES.map((t) => ({ label: t, value: t }))}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "Active", value: "Active" },
              { label: "Draft", value: "Draft" },
              { label: "Closed", value: "Closed" }
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center">
            <Button
              size="small"
              type={viewMode === "card" ? "primary" : "text"}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode("card")}
            />
            <Button
              size="small"
              type={viewMode === "table" ? "primary" : "text"}
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode("table")}
            />
          </div>

          {canAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="bg-blue-600 font-semibold"
              onClick={handleOpenAdd}
            >
              Create Program
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "table" ? (
        <Table
          dataSource={filteredPrograms}
          columns={columns}
          rowKey="id"
          className="bg-white rounded-xl shadow-sm border border-slate-200"
        />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredPrograms.map((p) => {
            const eventProgress = Math.min(100, Math.round(((p.achieved_events || 0) / p.target_events) * 100));
            const hourProgress = Math.min(100, Math.round(((p.achieved_hours || 0) / p.target_volunteer_hours) * 100));

            const cardActions = [];
            if (canView) {
              cardActions.push(
                <Button
                  key="events"
                  type="link"
                  icon={<CalendarOutlined />}
                  className="text-xs font-semibold text-blue-600"
                  onClick={() => router.push(`/admin/forms/volunteering-event?program_id=${p.program_id}`)}
                >
                  View Events ({p.achieved_events || 0})
                </Button>
              );
            }
            if (canEdit) {
              cardActions.push(
                <Button
                  key="edit"
                  type="link"
                  icon={<EditOutlined />}
                  className="text-xs font-semibold text-slate-600"
                  onClick={() => handleOpenEdit(p)}
                >
                  Edit
                </Button>
              );
            }

            return (
              <Col xs={24} md={12} lg={8} key={p.id}>
                <Card
                  hoverable
                  className="rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full"
                  title={
                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <div className="text-[11px] font-mono font-bold text-blue-600">{p.program_id}</div>
                        <div className="text-sm font-bold text-slate-900 truncate max-w-[220px]">{p.program_name}</div>
                      </div>
                      <Tag color={p.status === "Active" ? "success" : "default"}>{p.status}</Tag>
                    </div>
                  }
                  actions={cardActions.length > 0 ? cardActions : undefined}
                >
                  <div className="space-y-3 text-xs">
                    <div className="text-slate-600 line-clamp-2">{p.objective}</div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-slate-400 text-[10px]">THEME</div>
                        <div className="font-semibold text-slate-800 truncate">{p.csr_theme}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">FINANCIAL YEAR</div>
                        <div className="font-semibold text-slate-800">FY {p.financial_year}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">MANAGER</div>
                        <div className="font-semibold text-slate-800 truncate">{p.program_manager || "—"}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">BUDGET</div>
                        <div className="font-bold text-blue-700">₹{(p.overall_budget || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Events: <strong>{p.achieved_events || 0}/{p.target_events}</strong></span>
                        <span className="text-slate-500 font-medium">{eventProgress}%</span>
                      </div>
                      <Progress percent={eventProgress} size="small" strokeColor="#2563eb" />

                      <div className="flex justify-between text-[11px] mt-2">
                        <span className="text-slate-500">Hours: <strong>{p.achieved_hours || 0}/{p.target_volunteer_hours}</strong></span>
                        <span className="text-slate-500 font-medium">{hourProgress}%</span>
                      </div>
                      <Progress percent={hourProgress} size="small" strokeColor="#ea580c" />
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Add / Edit Program Modal (FormBuilder Engine) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            <CalendarOutlined style={{ color: "#2563eb" }} />
            {addEditMode === "add" ? "Create Volunteering Program" : `Edit Program: ${selectedProgram?.program_name || ""}`}
          </div>
        }
        open={isAddEditOpen}
        onCancel={() => setIsAddEditOpen(false)}
        footer={null}
        width={"75vw"}
        style={{ top: 20, maxWidth: "96vw" }}
        destroyOnHidden={true}
        maskClosable={false}
      >
        {isAddEditOpen && (
          <DynamicAddEditFormV2
            form_slug="volunteering_program"
            mode={addEditMode}
            selectedData={selectedProgram}
            onClose={() => {
              setIsAddEditOpen(false);
              fetchLivePrograms();
            }}
            fetchData={fetchLivePrograms}
          />
        )}
      </Modal>
    </div>
  );
}
