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
  Input,
  Pagination,
  Tooltip,
} from "antd";
import {
  LockOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  FileTextOutlined,
  TrophyOutlined,
  StarFilled,
  GlobalOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getClosedRfpsAPI } from "@/services/ngo-service";
import ViewSubmittedProposalModal from "./components/ViewSubmittedProposalModal";
import ClosedRfpDetailsModal from "./components/ClosedRfpDetailsModal";
import "./ClosedRfpLists.css";

const { Title, Text } = Typography;
const { Search } = Input;

export default function ClosedRfpLists({ formSlug = "request_for_proposal" }) {
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
  const [viewProposalModalVisible, setViewProposalModalVisible] = useState(false);

  const fetchClosedRfps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getClosedRfpsAPI({
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
      console.error("Failed to fetch closed RFPs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, formSlug, searchTerm]);

  useEffect(() => {
    fetchClosedRfps();
  }, [fetchClosedRfps]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const openDetails = (rfp) => {
    setSelectedRfp(rfp);
    setDetailsModalVisible(true);
  };

  const openMyProposal = (rfp) => {
    setSelectedRfp(rfp);
    setViewProposalModalVisible(true);
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

  const getEvaluationStatusBadge = (rfp) => {
    const status = String(rfp.final_status || rfp.submission_status || "").toLowerCase();
    if (status.includes("award") || status.includes("select")) {
      return (
        <span className="rfp-status-pill awarded">
          <TrophyOutlined /> Awarded
        </span>
      );
    }
    if (status.includes("shortlist")) {
      return (
        <span className="rfp-status-pill shortlisted">
          <CheckCircleOutlined /> Shortlisted
        </span>
      );
    }
    if (status.includes("reject")) {
      return (
        <span className="rfp-status-pill rejected">
          Not Selected
        </span>
      );
    }
    if (status.includes("review") || status.includes("evaluat")) {
      return (
        <span className="rfp-status-pill review">
          <ClockCircleOutlined /> Under Review
        </span>
      );
    }
    if (rfp.is_already_submitted) {
      return (
        <span className="rfp-status-pill submitted">
          <CheckCircleOutlined /> Submitted
        </span>
      );
    }
    return null;
  };

  return (
    <div className="open-rfp-container">
      {/* Slim Header Banner */}
      <div className="open-rfp-hero">
        <div className="open-rfp-hero-left">
          <div className="open-rfp-hero-icon">
            <LockOutlined />
          </div>
          <div className="open-rfp-hero-text">
            <Title level={4} className="open-rfp-hero-title">
              Closed RFPs &amp; Proposal Evaluations
            </Title>
            <span className="open-rfp-hero-desc">
              Browse archived and completed Requests for Proposals. Review your past proposal submissions, check evaluation stages, scores, and committee feedback.
            </span>
          </div>
        </div>
        <div className="open-rfp-hero-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchClosedRfps}
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
              <span className="rfp-stat-card-label">Total Closed</span>
              <span className="rfp-stat-card-value">{stats.totalAssigned}</span>
              <span className="rfp-stat-card-sub">Completed &amp; archived RFPs</span>
            </div>
            <div className="rfp-stat-card-icon">
              <LockOutlined />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="rfp-stat-card rfp-stat-card--submitted">
            <div className="rfp-stat-card-body">
              <span className="rfp-stat-card-label">My Submissions</span>
              <span className="rfp-stat-card-value">{stats.submittedCount}</span>
              <span className="rfp-stat-card-sub">Proposals submitted for review</span>
            </div>
            <div className="rfp-stat-card-icon">
              <CheckCircleOutlined />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="rfp-stat-card rfp-stat-card--pending">
            <div className="rfp-stat-card-body">
              <span className="rfp-stat-card-label">Not Submitted</span>
              <span className="rfp-stat-card-value">{stats.pendingCount}</span>
              <span className="rfp-stat-card-sub">Archived without proposal</span>
            </div>
            <div className="rfp-stat-card-icon">
              <ClockCircleOutlined />
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
              placeholder="Search closed RFP records, scope, title..."
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
                <span>All Closed</span>
                <span className="rfp-pill-count">{stats.totalAssigned}</span>
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
                <span>My Submissions</span>
                <span className="rfp-pill-count">{stats.submittedCount}</span>
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
                <span>Not Submitted</span>
                <span className="rfp-pill-count">{stats.pendingCount}</span>
              </button>
            </div>

            <Tooltip title="Refresh Closed RFPs">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchClosedRfps}
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
            Loading closed RFP records...
          </div>
        </div>
      ) : rfps.length === 0 ? (
        <Card className="open-rfp-toolbar-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
                No closed RFPs match your current search parameters or filter.
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
              const deadline = rfp.submission_deadline ? dayjs(rfp.submission_deadline).format("DD MMM YYYY") : "Ended";
              const isSubmitted = Boolean(rfp.is_already_submitted);
              const ratingVal = parseFloat(rfp.rating) || 0;

              return (
                <Col xs={24} sm={12} md={12} lg={8} xl={6} key={`rfp_closed_${rfp.id}_${index}`}>
                  <Card
                    variant="borderless"
                    className={`rfp-item-card ${isSubmitted ? "is-submitted" : ""}`}
                    styles={{ body: { display: "flex", flexDirection: "column", height: "100%", padding: "20px" } }}
                  >
                    {/* Header Status Row */}
                    <div className="rfp-card-header-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span className="rfp-status-pill closed">
                          <LockOutlined /> Closed
                        </span>
                        {getEvaluationStatusBadge(rfp)}
                      </div>

                      {rfp.submitted_at && (
                        <span className="rfp-deadline-chip">
                          <CalendarOutlined /> {dayjs(rfp.submitted_at).format("DD MMM YYYY")}
                        </span>
                      )}
                    </div>

                    {/* Title Row with Icon */}
                    <div className="rfp-card-title-container">
                      <div className="rfp-card-icon-avatar" style={{ background: isSubmitted ? "rgba(var(--primary-color-rgb, 5, 150, 105), 0.1)" : "rgba(100, 116, 139, 0.1)", color: isSubmitted ? "var(--primary-color, #059669)" : "#64748b", borderColor: isSubmitted ? "rgba(var(--primary-color-rgb, 5, 150, 105), 0.25)" : "#cbd5e1" }}>
                        <LockOutlined />
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

                      {/* Closed On */}
                      <div className="rfp-info-row">
                        <div className="rfp-info-row-item">
                          <span className="rfp-info-icon" style={{ color: "#64748b" }}>
                            <CalendarOutlined />
                          </span>
                          <span className="rfp-info-label">Closed on:</span>
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

                      {/* CSR Score if available */}
                      {ratingVal > 0 && (
                        <div className="rfp-info-row" style={{ marginTop: 2, paddingTop: 6, borderTop: "1px dashed #e2e8f0" }}>
                          <div className="rfp-info-row-item">
                            <span className="rfp-info-icon" style={{ color: "#eab308" }}>
                              <StarFilled />
                            </span>
                            <span className="rfp-info-label">CSR Score:</span>
                          </div>
                          <span className="rfp-info-val" style={{ color: "#0f172a", fontWeight: 700 }}>
                            {ratingVal.toFixed(1)} / 5
                          </span>
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
                        Scope
                      </Button>

                      {isSubmitted ? (
                        <Button
                          type="primary"
                          icon={<FileTextOutlined />}
                          onClick={() => openMyProposal(rfp)}
                          className="rfp-btn-view-submitted"
                          style={{ flex: 1.4 }}
                        >
                          View Evaluation
                        </Button>
                      ) : (
                        <Button
                          disabled
                          className="rfp-btn-closed-disabled"
                          style={{ flex: 1.2 }}
                        >
                          Closed
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
              <strong style={{ color: "#0f172a" }}>{totalCount}</strong> closed RFPs
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

      {/* RFP Scope & Details Modal */}
      <ClosedRfpDetailsModal
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        selectedRfp={selectedRfp}
        formSlug={formSlug}
        onViewProposal={(rfp) => openMyProposal(rfp)}
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
