'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Card,
  Input,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Modal,
  Descriptions,
  Empty,
  Typography,
  Tooltip,
  Spin,
  Pagination,
  Dropdown,
} from "antd";
import * as AntdIcons from "@ant-design/icons";
import {
  ProjectOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  BarsOutlined,
  GlobalOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MoreOutlined,
  EditOutlined,
  DollarCircleOutlined,
  ApartmentOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  ScheduleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { privateHttpClient } from "@/services/api/httpClient";
import "./NgoProjectsView.css";

const renderActionIcon = (iconName, fallbackIcon = <EyeOutlined />) => {
  if (!iconName) return fallbackIcon;
  const IconComponent = AntdIcons[iconName];
  if (IconComponent) {
    return <IconComponent />;
  }
  return fallbackIcon;
};

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

function formatDuration(val, start, end) {
  if (start || end) {
    const s = start && dayjs(start).isValid() ? dayjs(start).format("DD MMM YYYY") : "";
    const e = end && dayjs(end).isValid() ? dayjs(end).format("DD MMM YYYY") : "";
    if (s && e) return `${s} - ${e}`;
    if (s || e) return s || e;
  }
  if (!val) return "Ongoing";
  if (Array.isArray(val)) {
    const parts = val.map((d) => (dayjs(d).isValid() ? dayjs(d).format("DD MMM YYYY") : d));
    return parts.filter(Boolean).join(" - ") || "Ongoing";
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const parts = parsed.map((d) => (dayjs(d).isValid() ? dayjs(d).format("DD MMM YYYY") : d));
        return parts.filter(Boolean).join(" - ") || val;
      }
    } catch {}
    return val;
  }
  return String(val);
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === "") return "-";
  const num = parseFloat(String(amount).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return String(amount);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NgoProjectsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [schema, setSchema] = useState(null);
  const [actions, setActions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [selectedProject, setSelectedProject] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await privateHttpClient.get("ngo/projects");
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setProjects(res.data.data);
      } else {
        setProjects([]);
      }
      if (res?.data?.schema) {
        setSchema(res.data.schema);
      }
      if (Array.isArray(res?.data?.actions)) {
        setActions(res.data.actions);
      } else {
        setActions([]);
      }
    } catch (err) {
      console.error("Failed to fetch NGO projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleActionClick = (action, project) => {
    const actSlug = action.slug || action.name?.toLowerCase().replace(/\s+/g, "_");
    const actType = action.type || action.display_type || action.action_type;

    if (actSlug === "view" || actSlug === "details" || actType === "Navigate to Full Page") {
      setSelectedProject(project);
      setDetailModalOpen(true);
      return;
    }

    if (action.custom_url) {
      let targetUrl = action.custom_url.replace(/:id\b/g, project.id).replace(/\[id\]/g, project.id);
      if (targetUrl.startsWith("/techcsr/")) {
        targetUrl = targetUrl.replace(/^\/techcsr/, "");
      }
      router.push(targetUrl);
      return;
    }

    if (
      actType === "OPEN_CHILD_FORM" ||
      actType === "Child Form Grid View" ||
      actType === "CHILD_FORM" ||
      action.child_form_slug ||
      action.target_child_form_schema ||
      ["monitoring", "project_pan", "project_beneficiary"].includes(actSlug)
    ) {
      const childSlug = action.child_form_slug || action.target_child_form_schema || actSlug;
      router.push(`/ngo/forms/project/${childSlug}/${project.id}`);
      return;
    }

    // Default fallback: open details
    setSelectedProject(project);
    setDetailModalOpen(true);
  };

  const getActionMenuItems = (project) => {
    const dynamicActions = actions.length > 0 ? actions : [
      { name: "View Details", slug: "view", icon: "EyeOutlined" },
    ];

    return dynamicActions.map((action, idx) => ({
      key: `${action.slug || idx}`,
      label: action.name || action.label || "Action",
      icon: renderActionIcon(action.icon),
      onClick: () => handleActionClick(action, project),
    }));
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = !searchTerm
      ? true
      : (p.project_title && p.project_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.project_category && p.project_category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.project_type && p.project_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.status && p.status.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const s = String(p.status || "ACTIVE").toUpperCase();
    if (statusFilter === "active") {
      return ["ACTIVE", "ONGOING", "APPROVED", "IN_PROGRESS", "SUBMIT", "SUBMITTED"].includes(s);
    }
    if (statusFilter === "completed") {
      return ["COMPLETED", "CLOSED", "ARCHIVED", "DRAFT"].includes(s);
    }
    return true;
  });

  const totalBeneficiaries = projects.reduce(
    (acc, cur) => acc + (Number(cur.tentative_beneficiary_number__direct) || 0),
    0
  );

  const activeCount = projects.filter((p) =>
    ["ACTIVE", "ONGOING", "APPROVED", "IN_PROGRESS", "SUBMIT", "SUBMITTED"].includes(
      String(p.status || "ACTIVE").toUpperCase()
    )
  ).length;

  const completedCount = projects.filter((p) =>
    ["COMPLETED", "CLOSED", "ARCHIVED", "DRAFT"].includes(
      String(p.status || "").toUpperCase()
    )
  ).length;

  const paginatedProjects = filteredProjects.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (statusStr) => {
    const s = String(statusStr || "ACTIVE").toUpperCase();
    if (["ACTIVE", "APPROVED", "ONGOING", "IN_PROGRESS", "SUBMIT", "SUBMITTED"].includes(s)) {
      return (
        <span className="rfp-status-pill active">
          <CheckCircleOutlined /> {s}
        </span>
      );
    }
    if (["COMPLETED", "CLOSED"].includes(s)) {
      return (
        <span className="rfp-status-pill completed">
          <ClockCircleOutlined /> {s}
        </span>
      );
    }
    return <span className="rfp-status-pill draft">{s}</span>;
  };

  const columns = [
    {
      title: "Project Title",
      dataIndex: "project_title",
      key: "project_title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>
            {text || `Project #${record.id}`}
          </div>
          {record.primary_sdg && (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              SDG: {record.primary_sdg}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Category / Type",
      key: "category",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
            {record.project_category || "General"}
          </Tag>
          {record.project_type && (
            <span style={{ fontSize: 12, color: "#64748b" }}>{record.project_type}</span>
          )}
        </Space>
      ),
    },
    {
      title: "Budget",
      key: "budget",
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: "#0f172a" }}>
          {formatCurrency(record.project_amount || record.budget_amount || record.project_total_cost)}
        </span>
      ),
    },
    {
      title: "Duration",
      key: "duration",
      render: (_, record) => formatDuration(record.project_duration, record.start_date || record.project_duration_start, record.submission_deadline || record.project_duration_end),
    },
    {
      title: "Direct Reach",
      dataIndex: "tentative_beneficiary_number__direct",
      key: "beneficiaries",
      render: (val) =>
        val ? (
          <Tag color="cyan" icon={<TeamOutlined />} style={{ borderRadius: 6, fontWeight: 600 }}>
            {Number(val).toLocaleString()}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (val) => getStatusBadge(val),
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Project Scope">
            <Button
              type="text"
              icon={<EyeOutlined style={{ fontSize: "16px", color: "#16a34a" }} />}
              onClick={() => {
                setSelectedProject(record);
                setDetailModalOpen(true);
              }}
              className="tbl-action-btn-view"
            />
          </Tooltip>
          <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={["click"]} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined style={{ fontSize: "16px", color: "#475569" }} />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className="open-rfp-container">
      {/* Slim Header Banner */}
      <div className="open-rfp-hero">
        <div className="open-rfp-hero-left">
          <div className="open-rfp-hero-icon">
            <ProjectOutlined />
          </div>
          <div className="open-rfp-hero-text">
            <Title level={4} className="open-rfp-hero-title">
              CSR Projects Management
            </Title>
            <span className="open-rfp-hero-desc">
              Track assigned CSR development projects, monitor execution milestones, manage beneficiary reach, and review deliverables.
            </span>
          </div>
        </div>
        <div className="open-rfp-hero-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchProjects}
            loading={loading}
            className="rfp-hero-btn-refresh"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]} className="open-rfp-stats-row">
        <Col xs={24} sm={8}>
          <div className="rfp-stat-card rfp-stat-card--total">
            <div className="rfp-stat-card-body">
              <span className="rfp-stat-card-label">Total Projects</span>
              <span className="rfp-stat-card-value">{projects.length}</span>
              <span className="rfp-stat-card-sub">All assigned CSR initiatives</span>
            </div>
            <div className="rfp-stat-card-icon">
              <ProjectOutlined />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="rfp-stat-card rfp-stat-card--active">
            <div className="rfp-stat-card-body">
              <span className="rfp-stat-card-label">Active / Ongoing</span>
              <span className="rfp-stat-card-value">{activeCount}</span>
              <span className="rfp-stat-card-sub">Currently under execution</span>
            </div>
            <div className="rfp-stat-card-icon">
              <CheckCircleOutlined />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="rfp-stat-card rfp-stat-card--beneficiaries">
            <div className="rfp-stat-card-body">
              <span className="rfp-stat-card-label">Direct Reach</span>
              <span className="rfp-stat-card-value">{totalBeneficiaries.toLocaleString()}</span>
              <span className="rfp-stat-card-sub">Total lives impacted</span>
            </div>
            <div className="rfp-stat-card-icon">
              <TeamOutlined />
            </div>
          </div>
        </Col>
      </Row>

      {/* Toolbar: Search, Filter Tabs & View Mode Switch */}
      <Card className="open-rfp-toolbar-card" style={{ overflow: "hidden" }} styles={{ body: { padding: "16px 22px" } }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={9} lg={8}>
            <Search
              className="open-rfp-search-input"
              placeholder="Search by project name, category, status..."
              allowClear
              enterButton={<SearchOutlined style={{ fontSize: "16px" }} />}
              size="large"
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  setSearchTerm("");
                  setPage(1);
                }
              }}
              style={{ width: "100%" }}
            />
          </Col>

          <Col xs={24} md={15} lg={16} style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="rfp-tab-track">
              <button
                type="button"
                className={`rfp-pill-tab rfp-pill-tab--all ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                <GlobalOutlined className="rfp-pill-icon" />
                <span>All Projects</span>
                <span className="rfp-pill-count">{projects.length}</span>
              </button>

              <button
                type="button"
                className={`rfp-pill-tab rfp-pill-tab--active ${statusFilter === "active" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                }}
              >
                <CheckCircleOutlined className="rfp-pill-icon" />
                <span>Active</span>
                <span className="rfp-pill-count">{activeCount}</span>
              </button>

              <button
                type="button"
                className={`rfp-pill-tab rfp-pill-tab--completed ${statusFilter === "completed" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("completed");
                  setPage(1);
                }}
              >
                <ClockCircleOutlined className="rfp-pill-icon" />
                <span>Completed / Other</span>
                <span className="rfp-pill-count">{completedCount}</span>
              </button>
            </div>

            {/* View Mode Switcher (Grid vs Table) */}
            <div className="view-mode-btn-group">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <AppstoreOutlined />
                <span style={{ display: "none" }}>Grid</span>
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <BarsOutlined />
                <span style={{ display: "none" }}>Table</span>
              </button>
            </div>

            <Tooltip title="Refresh Projects">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchProjects}
                loading={loading}
                className="rfp-btn-refresh"
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: "#64748b", fontWeight: 600, fontSize: "14px" }}>
            Loading CSR projects...
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="open-rfp-toolbar-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
                No CSR projects match your current search parameters or filter.
              </div>
            }
          >
            {searchTerm && (
              <Button
                type="link"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                style={{ color: "#059669", fontWeight: 600, marginTop: 8 }}
              >
                Clear Search Filter
              </Button>
            )}
          </Empty>
        </Card>
      ) : viewMode === "grid" ? (
        <>
          <Row gutter={[20, 20]}>
            {paginatedProjects.map((project, index) => {
              const projectTitle = project.project_title || project.title || `Project #${project.id}`;
              const directReach = project.tentative_beneficiary_number__direct
                ? Number(project.tentative_beneficiary_number__direct).toLocaleString()
                : "Not Specified";
              const duration = formatDuration(
                project.project_duration,
                project.start_date || project.project_duration_start,
                project.submission_deadline || project.project_duration_end
              );
              const category = project.project_category || "General CSR";
              const sdg = project.primary_sdg || project.sdg_goal;
              const budget = formatCurrency(project.project_amount || project.budget_amount || project.project_total_cost);

              return (
                <Col xs={24} sm={12} md={12} lg={8} xl={6} key={`project_${project.id || index}`}>
                  <Card
                    variant="borderless"
                    className="rfp-item-card"
                    styles={{ body: { display: "flex", flexDirection: "column", height: "100%", padding: "20px" } }}
                  >
                    {/* Header Status Row */}
                    <div className="rfp-card-header-row">
                      {getStatusBadge(project.status)}
                      <span className="rfp-category-chip">{category}</span>
                    </div>

                    {/* Title Row with Icon */}
                    <div className="rfp-card-title-container">
                      <div className="rfp-card-icon-avatar">
                        <ProjectOutlined />
                      </div>
                      <Tooltip title={projectTitle.length > 45 ? projectTitle : ""}>
                        <Title level={5} className="rfp-card-title">
                          {projectTitle}
                        </Title>
                      </Tooltip>
                    </div>

                    {/* Info Box */}
                    <div className="rfp-info-card-box">
                      {/* Budget */}
                      {budget !== "-" && (
                        <div className="rfp-budget-highlight">
                          <span className="rfp-budget-label">
                            <DollarCircleOutlined style={{ color: "#059669", fontSize: "14px" }} /> Budget
                          </span>
                          <span className="rfp-budget-val" style={{ color: "#059669", fontWeight: 700 }}>
                            {budget}
                          </span>
                        </div>
                      )}

                      {/* Direct Beneficiaries Highlight */}
                      <div className="rfp-budget-highlight" style={{ marginTop: 4 }}>
                        <span className="rfp-budget-label">
                          <TeamOutlined style={{ color: "#ea580c", fontSize: "14px" }} /> Direct Reach
                        </span>
                        <span className="rfp-budget-val" style={{ color: "#0f172a" }}>
                          {directReach}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="rfp-info-row">
                        <div className="rfp-info-row-item">
                          <span className="rfp-info-icon" style={{ color: "#2563eb" }}>
                            <ClockCircleOutlined />
                          </span>
                          <span className="rfp-info-label">Duration:</span>
                        </div>
                        <span className="rfp-info-val" style={{ fontWeight: 600 }}>{duration}</span>
                      </div>

                      {/* Primary SDG */}
                      {sdg && (
                        <div className="rfp-info-row">
                          <div className="rfp-info-row-item">
                            <span className="rfp-info-icon" style={{ color: "#10b981" }}>
                              <GlobalOutlined />
                            </span>
                            <span className="rfp-info-label">SDG:</span>
                          </div>
                          <span className="rfp-info-val" style={{ fontSize: "11.5px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sdg}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button Footer */}
                    <div className="rfp-card-footer" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Button
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          setSelectedProject(project);
                          setDetailModalOpen(true);
                        }}
                        className="rfp-btn-details"
                        style={{ flex: 1 }}
                      >
                        Project Details
                      </Button>
                      <Dropdown menu={{ items: getActionMenuItems(project) }} trigger={["click"]} placement="topRight">
                        <Button
                          icon={<MoreOutlined />}
                          style={{ borderRadius: 8, borderColor: "#cbd5e1" }}
                        />
                      </Dropdown>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Server/Client Pagination */}
          <div className="rfp-pagination-wrapper">
            <Text type="secondary" style={{ fontSize: "13.5px", fontWeight: 500, color: "#64748b" }}>
              Showing <strong style={{ color: "#0f172a" }}>{paginatedProjects.length}</strong> of{" "}
              <strong style={{ color: "#0f172a" }}>{filteredProjects.length}</strong> projects
            </Text>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={filteredProjects.length}
              onChange={(p, ps) => {
                setPage(p);
                setPageSize(ps);
              }}
              showSizeChanger
              pageSizeOptions={["8", "16", "24", "48"]}
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} projects`}
            />
          </div>
        </>
      ) : (
        /* Table View */
        <Card className="projects-table-card" styles={{ body: { padding: "0" } }}>
          <Table
            columns={columns}
            dataSource={filteredProjects}
            rowKey={(r) => r.id || r.project_title || Math.random()}
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ["8", "16", "24", "48"],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} projects`,
            }}
          />
        </Card>
      )}

      {/* Comprehensive Full-Width Single-Page Project Details Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(5, 150, 105, 0.12)",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  border: "1px solid rgba(5, 150, 105, 0.2)",
                  flexShrink: 0,
                }}
              >
                <ProjectOutlined />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a", lineHeight: 1.2 }}>
                  {selectedProject?.project_title || selectedProject?.title || `Project #${selectedProject?.id}`}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                    {selectedProject?.project_category || "CSR Project"}
                  </Tag>
                  <span>•</span>
                  <span>Financial Year: <strong>{selectedProject?.financial_year || selectedProject?.fy || "-"}</strong></span>
                  <span>•</span>
                  <span>Status:</span>
                  {getStatusBadge(selectedProject?.status)}
                </div>
              </div>
            </div>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button
            key="pan"
            icon={<AuditOutlined />}
            onClick={() => {
              setDetailModalOpen(false);
              router.push(`/ngo/forms/project/project_pan/${selectedProject?.id}`);
            }}
            style={{ borderRadius: 8, height: 38, fontWeight: 600 }}
          >
            Project PAN
          </Button>,
          <Button
            key="monitoring"
            icon={<ApartmentOutlined />}
            onClick={() => {
              setDetailModalOpen(false);
              router.push(`/ngo/forms/project/monitoring/${selectedProject?.id}`);
            }}
            style={{ borderRadius: 8, height: 38, fontWeight: 600 }}
          >
            Monitoring
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setDetailModalOpen(false)}
            style={{
              borderRadius: 8,
              height: 38,
              background: "#059669",
              borderColor: "#059669",
              fontWeight: 600,
              padding: "0 24px",
            }}
          >
            Close
          </Button>,
        ]}
        width="96vw"
        style={{ top: 15, maxWidth: "1600px", paddingBottom: 20 }}
        styles={{ body: { maxHeight: "calc(88vh - 110px)", overflowY: "auto", padding: "20px 24px" } }}
      >
        {selectedProject && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. Overview & Key Metrics */}
            <Card
              size="small"
              className="modal-section-card"
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  <InfoCircleOutlined style={{ color: "#059669" }} />
                  Project Overview & Basic Details
                </div>
              }
              style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
            >
              <Descriptions
                bordered
                column={3}
                size="small"
                styles={{ label: { fontWeight: 600, width: "16%", background: "#f8fafc", color: "#475569" } }}
              >
                <Descriptions.Item label="Project Title" span={2}>
                  <strong style={{ color: "#0f172a", fontSize: "14px" }}>
                    {selectedProject.project_title || selectedProject.title || `Project #${selectedProject.id}`}
                  </strong>
                </Descriptions.Item>
                <Descriptions.Item label="Total Budget" span={1}>
                  <strong style={{ color: "#059669", fontSize: "15px" }}>
                    {formatCurrency(selectedProject.project_amount || selectedProject.budget_amount || selectedProject.project_total_cost)}
                  </strong>
                </Descriptions.Item>
                <Descriptions.Item label="Project Category" span={1}>
                  <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
                    {selectedProject.project_category || "-"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Project Type" span={1}>
                  {selectedProject.project_type || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Financial Year" span={1}>
                  {selectedProject.financial_year || selectedProject.fy || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Duration" span={1}>
                  <span style={{ fontWeight: 600 }}>
                    {formatDuration(
                      selectedProject.project_duration,
                      selectedProject.start_date || selectedProject.project_duration_start,
                      selectedProject.submission_deadline || selectedProject.project_duration_end
                    )}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Direct Beneficiaries" span={1}>
                  {selectedProject.tentative_beneficiary_number__direct
                    ? `${Number(selectedProject.tentative_beneficiary_number__direct).toLocaleString()} lives`
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Indirect Beneficiaries" span={1}>
                  {selectedProject.tentative_beneficiary_number__indirect
                    ? `${Number(selectedProject.tentative_beneficiary_number__indirect).toLocaleString()} lives`
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="SDG Goal" span={1}>
                  {selectedProject.sdg_goal || selectedProject.primary_sdg || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Assigned Partner" span={1}>
                  {selectedProject.partner_name ? (
                    <Tag color="green" style={{ fontWeight: 600 }}>{selectedProject.partner_name}</Tag>
                  ) : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status" span={1}>
                  {getStatusBadge(selectedProject.status)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 2. Scope, Objectives & Criteria */}
            <Card
              size="small"
              className="modal-section-card"
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  <FileTextOutlined style={{ color: "#2563eb" }} />
                  Scope, Objectives & Eligibility
                </div>
              }
              style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
            >
              <Descriptions
                bordered
                column={1}
                size="small"
                styles={{ label: { fontWeight: 600, width: "20%", background: "#f8fafc", color: "#475569" } }}
              >
                {selectedProject.project_description && (
                  <Descriptions.Item label="Project Description">
                    <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                      {selectedProject.project_description}
                    </Paragraph>
                  </Descriptions.Item>
                )}
                {selectedProject.scope_of_work && (
                  <Descriptions.Item label="Scope of Work">
                    <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                      {selectedProject.scope_of_work}
                    </Paragraph>
                  </Descriptions.Item>
                )}
                {selectedProject.project_initiative_details && (
                  <Descriptions.Item label="Initiative Details">
                    <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                      {selectedProject.project_initiative_details}
                    </Paragraph>
                  </Descriptions.Item>
                )}
                {selectedProject.deliverables && (
                  <Descriptions.Item label="Deliverables">
                    <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                      {selectedProject.deliverables}
                    </Paragraph>
                  </Descriptions.Item>
                )}
                {selectedProject.tentative_impact && (
                  <Descriptions.Item label="Expected Impact">
                    <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                      {selectedProject.tentative_impact}
                    </Paragraph>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Eligibility Criteria">
                  <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                    {selectedProject.eligibility_criteria || "Standard partner eligibility applies."}
                  </Paragraph>
                </Descriptions.Item>
                <Descriptions.Item label="Terms & Conditions">
                  <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                    {selectedProject.terms_and_conditions || "Standard CSR agreement terms apply."}
                  </Paragraph>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 3. Dynamic Add-More Child Sections */}
            {(schema?.sections || [])
              .filter((sec) => sec.type === "add_more")
              .map((sec, sIdx) => {
                const secData = selectedProject[sec.slug] || selectedProject[sec.section_id] || selectedProject[sec.table] || [];
                if (!Array.isArray(secData) || secData.length === 0) return null;

                const fields = (sec.fields || []).filter((f) => f.visible !== false);
                const tableColumns = fields.length > 0
                  ? fields.map((f) => ({
                      title: f.label || f.db_field,
                      key: f.db_field,
                      dataIndex: f.db_field,
                      render: (val, record) => {
                        const labelVal = record[`${f.db_field}_label`] || record[`name_${f.db_field}`] || record[`${f.data_source?.label_key}_${f.db_field}`] || val;
                        if (f.type === "currency" || (f.db_field && (f.db_field.includes("amount") || f.db_field.includes("cost")))) {
                          return formatCurrency(labelVal);
                        }
                        return labelVal !== null && labelVal !== undefined && labelVal !== "" ? String(labelVal) : "-";
                      },
                    }))
                  : Object.keys(secData[0] || {})
                      .filter((k) => !["parent_id", "created_by", "updated_by", "deleted_at"].includes(k))
                      .map((k) => ({
                        title: k.replace(/_/g, " ").toUpperCase(),
                        dataIndex: k,
                        key: k,
                        render: (v) => (v !== null && v !== undefined ? String(v) : "-"),
                      }));

                const getSecIcon = (slug = "") => {
                  const s = slug.toLowerCase();
                  if (s.includes("location")) return <EnvironmentOutlined style={{ color: "#ea580c" }} />;
                  if (s.includes("budget")) return <DollarCircleOutlined style={{ color: "#059669" }} />;
                  if (s.includes("partner")) return <TeamOutlined style={{ color: "#2563eb" }} />;
                  if (s.includes("milestone")) return <ScheduleOutlined style={{ color: "#8b5cf6" }} />;
                  if (s.includes("sdg")) return <GlobalOutlined style={{ color: "#10b981" }} />;
                  return <ApartmentOutlined style={{ color: "#059669" }} />;
                };

                return (
                  <Card
                    key={`sec_${sec.section_id || sec.slug || sIdx}`}
                    size="small"
                    className="modal-section-card"
                    title={
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                          {getSecIcon(sec.slug || sec.section_label)}
                          {sec.section_label || sec.slug}
                        </div>
                        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
                          {secData.length} {secData.length === 1 ? "Record" : "Records"}
                        </Tag>
                      </div>
                    }
                    style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  >
                    <Table
                      dataSource={secData}
                      columns={tableColumns}
                      rowKey={(r) => r.id || Math.random()}
                      pagination={false}
                      size="middle"
                      bordered
                      scroll={{ x: "max-content" }}
                    />
                  </Card>
                );
              })}
          </div>
        )}
      </Modal>
    </div>
  );
}
