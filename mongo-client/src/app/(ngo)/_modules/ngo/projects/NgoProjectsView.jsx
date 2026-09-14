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
} from "antd";
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
} from "@ant-design/icons";
import dayjs from "dayjs";
import { privateHttpClient } from "@/services/api/httpClient";
import "./NgoProjectsView.css";

const { Title, Text } = Typography;
const { Search } = Input;

export default function NgoProjectsView() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
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
      return ["ACTIVE", "ONGOING", "APPROVED", "IN_PROGRESS"].includes(s);
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
    ["ACTIVE", "ONGOING", "APPROVED", "IN_PROGRESS"].includes(
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
    if (["ACTIVE", "APPROVED", "ONGOING", "IN_PROGRESS"].includes(s)) {
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
    return (
      <span className="rfp-status-pill draft">
        {s}
      </span>
    );
  };

  const columns = [
    {
      title: "Project Title",
      dataIndex: "project_title",
      key: "project_title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>
            {text || "Untitled Project"}
          </div>
          {record.primary_sdg && (
            <div style={{ fontSize: 12, color: "#64748b" }}>
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
      title: "Duration",
      dataIndex: "project_duration",
      key: "project_duration",
      render: (val) => val || "-",
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
      title: "Created Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (val) => (val ? dayjs(val).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      width: 80,
      render: (_, record) => (
        <Tooltip title="View Scope">
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
              const duration = project.project_duration || "Ongoing";
              const category = project.project_category || "General CSR";
              const sdg = project.primary_sdg;

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
                      <span className="rfp-category-chip">
                        {category}
                      </span>
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
                      {/* Direct Beneficiaries Highlight */}
                      <div className="rfp-budget-highlight">
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
                        <span className="rfp-info-val">{duration}</span>
                      </div>

                      {/* Primary SDG */}
                      {sdg && (
                        <div className="rfp-info-row">
                          <div className="rfp-info-row-item">
                            <span className="rfp-info-icon" style={{ color: "#10b981" }}>
                              <GlobalOutlined />
                            </span>
                            <span className="rfp-info-label">Primary SDG:</span>
                          </div>
                          <span className="rfp-info-val" style={{ fontSize: "11.5px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sdg}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button Footer */}
                    <div className="rfp-card-footer">
                      <Button
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          setSelectedProject(project);
                          setDetailModalOpen(true);
                        }}
                        className="rfp-btn-details"
                      >
                        Project Details
                      </Button>
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

      {/* Project Details Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(var(--primary-color-rgb, 5, 150, 105), 0.1)",
                color: "var(--primary-color, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              <ProjectOutlined />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              {selectedProject?.project_title || "Project Scope Details"}
            </span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setDetailModalOpen(false)}
            style={{
              borderRadius: 8,
              background: "var(--primary-gradient, var(--primary-color, #059669))",
              borderColor: "var(--primary-color, #059669)",
              fontWeight: 600,
            }}
          >
            Close Details
          </Button>,
        ]}
        width={800}
        style={{ top: 30 }}
      >
        {selectedProject && (
          <Descriptions
            bordered
            column={2}
            size="small"
            style={{ marginTop: 16 }}
            labelStyle={{ fontWeight: 600, width: "30%", background: "#f8fafc", color: "#475569" }}
          >
            <Descriptions.Item label="Project Title" span={2}>
              <strong style={{ color: "#0f172a", fontSize: "14px" }}>{selectedProject.project_title}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
                {selectedProject.project_category || "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              {selectedProject.project_type || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {getStatusBadge(selectedProject.status)}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {selectedProject.project_duration || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Primary SDG">
              {selectedProject.primary_sdg || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Secondary SDG">
              {selectedProject.secondary_sdg || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Direct Beneficiaries">
              {selectedProject.tentative_beneficiary_number__direct
                ? Number(selectedProject.tentative_beneficiary_number__direct).toLocaleString()
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Indirect Beneficiaries">
              {selectedProject.tentative_beneficiary_number__indirect
                ? Number(selectedProject.tentative_beneficiary_number__indirect).toLocaleString()
                : "-"}
            </Descriptions.Item>
            {selectedProject.project_summary && (
              <Descriptions.Item label="Summary" span={2}>
                <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                  {selectedProject.project_summary}
                </Paragraph>
              </Descriptions.Item>
            )}
            {selectedProject.project_objectives && (
              <Descriptions.Item label="Objectives" span={2}>
                <Paragraph style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                  {selectedProject.project_objectives}
                </Paragraph>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Created At" span={2}>
              {selectedProject.created_at
                ? dayjs(selectedProject.created_at).format("DD MMMM YYYY, hh:mm A")
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
