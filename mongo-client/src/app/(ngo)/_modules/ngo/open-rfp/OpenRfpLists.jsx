'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Typography,
  Spin,
  Empty,
  Space,
  Input,
  Pagination,
  Tabs,
  Tooltip,
} from "antd";
import {
  FolderOpenOutlined,
  DollarOutlined,
  CalendarOutlined,
  SendOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  FileTextOutlined,
  WarningOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getOpenRfpsAPI } from "@/services/ngo-service";
import SubmitFloatedRfpModal from "../components/SubmitFloatedRfpModal";
import ViewSubmittedProposalModal from "../closed-rfp/components/ViewSubmittedProposalModal";
import OpenRfpDetailsModal from "./components/OpenRfpDetailsModal";
import "./OpenRfpLists.css";

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

export default function OpenRfpLists({ formSlug = "request_for_proposal" }) {
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ totalAssigned: 0, pendingCount: 0, submittedCount: 0 });

  const [selectedRfp, setSelectedRfp] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [viewProposalModalVisible, setViewProposalModalVisible] = useState(false);

  const fetchOpenRfps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getOpenRfpsAPI({
        page,
        limit,
        search: searchTerm,
        status_filter: statusFilter,
        form_slug: formSlug,
      });
      if (res.data?.success) {
        setRfps(res.data?.data || []);
        setTotalCount(res.data?.totalCount || 0);
        if (res.data?.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch open RFPs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, formSlug, searchTerm]);

  useEffect(() => {
    fetchOpenRfps();
  }, [fetchOpenRfps]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const openDetails = (rfp) => {
    setSelectedRfp(rfp);
    setDetailsModalVisible(true);
  };

  const openApplyForm = (rfp) => {
    if (rfp.is_already_submitted) return;
    setSelectedRfp(rfp);
    setApplyModalVisible(true);
  };

  const openMyProposal = (rfp) => {
    setSelectedRfp(rfp);
    setViewProposalModalVisible(true);
  };

  const getDeadlineInfo = (deadlineStr) => {
    if (!deadlineStr) return null;
    const deadline = dayjs(deadlineStr);
    const today = dayjs().startOf("day");
    const diffDays = deadline.diff(today, "day");

    if (diffDays < 0) {
      return { text: "Expired", color: "error", icon: <ClockCircleOutlined /> };
    }
    if (diffDays === 0) {
      return { text: "Closing Today", color: "error", icon: <WarningOutlined /> };
    }
    if (diffDays <= 3) {
      return { text: `${diffDays}d left`, color: "warning", icon: <ClockCircleOutlined /> };
    }
    return { text: `${diffDays}d remaining`, color: "normal", icon: <CalendarOutlined /> };
  };

  const formatBudget = (val) => {
    if (!val) return "As per Proposal";
    const strVal = String(val).trim();
    if (!isNaN(strVal) && !isNaN(parseFloat(strVal))) {
      const num = Number(strVal);
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(num);
    }
    return strVal;
  };

  return (
    <div className="open-rfp-container">
      {/* Slim Header Banner */}
      <div className="open-rfp-hero">
        <div className="open-rfp-hero-left">
          <div className="open-rfp-hero-icon">
            <FolderOpenOutlined />
          </div>
          <div className="open-rfp-hero-text">
            <Title level={4} className="open-rfp-hero-title">
              Open RFP Opportunities
            </Title>
            <span className="open-rfp-hero-desc">
              Explore active RFPs floated by CSR donors. Review project scope, check deadlines, and submit proposals.
            </span>
          </div>
        </div>
        <div className="open-rfp-hero-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchOpenRfps}
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
              <span className="rfp-stat-card-label">Open RFPs</span>
              <span className="rfp-stat-card-value">{stats.totalAssigned}</span>
              <span className="rfp-stat-card-sub">Active funding opportunities</span>
            </div>
            <div className="rfp-stat-card-icon">
              <FolderOpenOutlined />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="rfp-stat-card rfp-stat-card--pending">
            <div className="rfp-stat-card-body">
              <span className="rfp-stat-card-label">Action Required</span>
              <span className="rfp-stat-card-value">{stats.pendingCount}</span>
              <span className="rfp-stat-card-sub">Awaiting your response</span>
            </div>
            <div className="rfp-stat-card-icon">
              <ClockCircleOutlined />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="rfp-stat-card rfp-stat-card--submitted">
            <div className="rfp-stat-card-body">
              <span className="rfp-stat-card-label">Submitted</span>
              <span className="rfp-stat-card-value">{stats.submittedCount}</span>
              <span className="rfp-stat-card-sub">Proposals sent to donors</span>
            </div>
            <div className="rfp-stat-card-icon">
              <CheckCircleOutlined />
            </div>
          </div>
        </Col>
      </Row>

      {/* Toolbar: Search & Filter Tabs */}
      <Card className="open-rfp-toolbar-card" style={{ overflow: "hidden" }} styles={{ body: { padding: "16px 22px" } }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={10} lg={9}>
            <Search
              className="open-rfp-search-input"
              placeholder="Search by RFP title, scope, objective..."
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

          <Col xs={24} md={14} lg={15} style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
                <span>All Open</span>
                <span className="rfp-pill-count">{stats.totalAssigned}</span>
              </button>

              <button
                type="button"
                className={`rfp-pill-tab rfp-pill-tab--pending ${statusFilter === "pending" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("pending");
                  setPage(1);
                }}
              >
                <ClockCircleOutlined className="rfp-pill-icon" />
                <span>Action Required</span>
                <span className="rfp-pill-count">{stats.pendingCount}</span>
              </button>

              <button
                type="button"
                className={`rfp-pill-tab rfp-pill-tab--submitted ${statusFilter === "submitted" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("submitted");
                  setPage(1);
                }}
              >
                <CheckCircleOutlined className="rfp-pill-icon" />
                <span>Submitted</span>
                <span className="rfp-pill-count">{stats.submittedCount}</span>
              </button>
            </div>

            <Tooltip title="Refresh RFP List">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchOpenRfps}
                loading={loading}
                className="rfp-btn-refresh"
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Card Grid Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: "#64748b", fontWeight: 600, fontSize: "14px" }}>
            Loading Open RFP opportunities...
          </div>
        </div>
      ) : rfps.length === 0 ? (
        <Card className="open-rfp-toolbar-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
                No open RFPs match your current search parameters or status filter.
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
      ) : (
        <>
          <Row gutter={[20, 20]}>
            {rfps.map((rfp, index) => {
              const rfpTitle = rfp.project_details || rfp.title || rfp.name || `CSR RFP #${rfp.id}`;
              const budgetFormatted = formatBudget(rfp.budget_range || rfp.budget);
              const deadline = rfp.submission_deadline ? dayjs(rfp.submission_deadline).format("DD MMM YYYY") : "No Deadline";
              const isSubmitted = Boolean(rfp.is_already_submitted);
              const deadlineInfo = getDeadlineInfo(rfp.submission_deadline);

              return (
                <Col xs={24} sm={12} md={12} lg={8} xl={6} key={`rfp_open_${rfp.id}_${index}`}>
                  <Card
                    variant="borderless"
                    className={`rfp-item-card ${isSubmitted ? "is-submitted" : ""}`}
                    styles={{ body: { display: "flex", flexDirection: "column", height: "100%", padding: "20px" } }}
                  >
                    {/* Header Status Row */}
                    <div className="rfp-card-header-row">
                      {isSubmitted ? (
                        <span className="rfp-status-pill submitted">
                          <CheckCircleOutlined /> Submitted
                        </span>
                      ) : (
                        <span className="rfp-status-pill active">
                          <ClockCircleOutlined /> Active RFP
                        </span>
                      )}

                      {deadlineInfo && (
                        <span className={`rfp-deadline-chip ${deadlineInfo.color}`}>
                          {deadlineInfo.icon} {deadlineInfo.text}
                        </span>
                      )}
                    </div>

                    {/* Title Row with Icon */}
                    <div className="rfp-card-title-container">
                      <div className="rfp-card-icon-avatar">
                        <FolderOpenOutlined />
                      </div>
                      <Tooltip title={rfpTitle.length > 45 ? rfpTitle : ""}>
                        <Title level={5} className="rfp-card-title">
                          {rfpTitle}
                        </Title>
                      </Tooltip>
                    </div>

                    {/* Info Box */}
                    <div className="rfp-info-card-box">
                      {/* Budget Highlight */}
                      <div className="rfp-budget-highlight">
                        <span className="rfp-budget-label">
                          <DollarOutlined style={{ color: "#10b981", fontSize: "14px" }} /> Total Budget
                        </span>
                        <span className="rfp-budget-val">{budgetFormatted}</span>
                      </div>

                      {/* Deadline */}
                      <div className="rfp-info-row">
                        <div className="rfp-info-row-item">
                          <span className="rfp-info-icon" style={{ color: "#2563eb" }}>
                            <CalendarOutlined />
                          </span>
                          <span className="rfp-info-label">Deadline:</span>
                        </div>
                        <span className="rfp-info-val">{deadline}</span>
                      </div>

                      {/* Contact Person */}
                      {rfp.contact_person && (
                        <div className="rfp-info-row">
                          <div className="rfp-info-row-item">
                            <span className="rfp-info-icon" style={{ color: "#64748b" }}>
                              <UserOutlined />
                            </span>
                            <span className="rfp-info-label">Contact:</span>
                          </div>
                          <span className="rfp-info-val">{rfp.contact_person}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="rfp-card-footer">
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => openDetails(rfp)}
                        className="rfp-btn-details"
                        style={{ flex: 1 }}
                      >
                        Details
                      </Button>

                      {isSubmitted ? (
                        <Button
                          icon={<FileTextOutlined />}
                          onClick={() => openMyProposal(rfp)}
                          className="rfp-btn-view-submitted"
                          style={{ flex: 1.3 }}
                        >
                          My Proposal
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          onClick={() => openApplyForm(rfp)}
                          className="rfp-btn-submit"
                          style={{ flex: 1.3 }}
                        >
                          Submit RFP
                        </Button>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Server-Side Pagination Bar */}
          <div className="rfp-pagination-wrapper">
            <Text type="secondary" style={{ fontSize: "13.5px", fontWeight: 500, color: "#64748b" }}>
              Showing <strong style={{ color: "#0f172a" }}>{rfps.length}</strong> of{" "}
              <strong style={{ color: "#0f172a" }}>{totalCount}</strong> open RFPs
            </Text>
            <Pagination
              current={page}
              pageSize={limit}
              total={totalCount}
              onChange={(p, l) => {
                setPage(p);
                setLimit(l);
              }}
              showSizeChanger
              pageSizeOptions={["8", "16", "24", "48"]}
              showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} RFPs`}
            />
          </div>
        </>
      )}

      {/* View RFP Scope & Details Modal */}
      <OpenRfpDetailsModal
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        selectedRfp={selectedRfp}
        formSlug={formSlug}
        onApply={(rfp) => openApplyForm(rfp)}
        onViewProposal={(rfp) => openMyProposal(rfp)}
      />

      {/* Submit Floated RFP Proposal Modal */}
      <SubmitFloatedRfpModal
        open={applyModalVisible}
        onCancel={() => setApplyModalVisible(false)}
        rfpRecord={selectedRfp}
        formSlug={formSlug}
        onSuccess={fetchOpenRfps}
      />

      {/* View My Submitted Proposal Modal */}
      <ViewSubmittedProposalModal
        open={viewProposalModalVisible}
        onCancel={() => setViewProposalModalVisible(false)}
        rfpRecord={selectedRfp}
      />
    </div>
  );
}
