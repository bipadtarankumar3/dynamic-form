'use client';

import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Typography,
  Divider,
  Spin,
  Alert,
} from "antd";
import {
  IdcardOutlined,
  SafetyCertificateOutlined,
  FolderOpenOutlined,
  ProjectOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  BankOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import Link from "@/components/Link";
import { getUser, useAuth } from "@/context/AuthContext";
import { privateHttpClient } from "@/services/api/httpClient";

const { Title, Paragraph, Text } = Typography;

export default function NgoDashboardPage() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [profileStatus, setProfileStatus] = useState("DRAFT");
  const [ddStatus, setDdStatus] = useState("DRAFT");
  const [rfpStats, setRfpStats] = useState({ totalAssigned: 0, pendingCount: 0, submittedCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);

    const fetchOverview = async () => {
      try {
        setLoading(true);
        // Fetch Profile status
        const profRes = await privateHttpClient
          .get("/admin/ngo/profile-status?form_slug=implementation_partner")
          .catch(() => null);
        if (profRes?.data?.data?.status) {
          setProfileStatus(profRes.data.data.status);
        }

        // Fetch DD status
        const ddRes = await privateHttpClient
          .get("/admin/ngo/profile-status?form_slug=due_diligence")
          .catch(() => null);
        if (ddRes?.data?.data?.status) {
          setDdStatus(ddRes.data.data.status);
        }

        // Fetch RFP stats
        const rfpRes = await privateHttpClient
          .get("ngo/rfp-opportunities?limit=1")
          .catch(() => null);
        if (rfpRes?.data?.stats) {
          setRfpStats(rfpRes.data.stats);
        }
      } catch (err) {
        console.log("Overview fetch fallback:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const displayName = user?.name || authUser?.name || "NGO Partner";

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #16a34a 100%)",
          borderRadius: 16,
          padding: "26px 32px",
          color: "#ffffff",
          marginBottom: 24,
          boxShadow: "0 8px 24px rgba(21, 128, 61, 0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.2)",
              padding: "3px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <BankOutlined /> NGO PARTNER PORTAL
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px 0", color: "#ffffff" }}>
            Welcome back, {displayName}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 13.5, maxWidth: 680 }}>
            Manage your organization profile, track statutory Due Diligence records, submit proposals for active RFPs, and monitor project performance.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/ngo/profile">
            <Button
              type="primary"
              size="large"
              icon={<IdcardOutlined />}
              style={{
                background: "#ffffff",
                color: "#15803d",
                borderColor: "#ffffff",
                fontWeight: 700,
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              My Profile
            </Button>
          </Link>
          <Link to="/ngo/open-rfp">
            <Button
              size="large"
              icon={<FolderOpenOutlined />}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#ffffff",
                borderColor: "rgba(255,255,255,0.3)",
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              Browse Open RFPs
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Metric Status Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {/* Profile Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "20px 22px" } }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                <IdcardOutlined />
              </div>
              <Tag
                color={profileStatus === "APPROVED" ? "success" : profileStatus === "UNDER_REVIEW" ? "processing" : "warning"}
                style={{ fontWeight: 700, borderRadius: 4 }}
              >
                {profileStatus}
              </Tag>
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Organization Profile</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "4px 0 12px" }}>
              {profileStatus === "APPROVED" ? "Verified" : profileStatus === "UNDER_REVIEW" ? "Under Review" : "Action Required"}
            </div>
            <Link to="/ngo/profile" style={{ fontSize: 12.5, fontWeight: 600, color: "#15803d", display: "inline-flex", alignItems: "center", gap: 4 }}>
              View / Edit Profile <ArrowRightOutlined style={{ fontSize: 11 }} />
            </Link>
          </Card>
        </Col>

        {/* Due Diligence Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "20px 22px" } }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#f0fdf4",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
              <Tag
                color={ddStatus === "APPROVED" ? "success" : ddStatus === "UNDER_REVIEW" ? "processing" : "warning"}
                style={{ fontWeight: 700, borderRadius: 4 }}
              >
                {ddStatus}
              </Tag>
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Statutory DD Status</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "4px 0 12px" }}>
              {ddStatus === "APPROVED" ? "Compliance OK" : ddStatus === "UNDER_REVIEW" ? "Under Verification" : "Pending Upload"}
            </div>
            <Link to="/ngo/dd" style={{ fontSize: 12.5, fontWeight: 600, color: "#15803d", display: "inline-flex", alignItems: "center", gap: 4 }}>
              Manage Due Diligence <ArrowRightOutlined style={{ fontSize: 11 }} />
            </Link>
          </Card>
        </Col>

        {/* Open RFPs Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "20px 22px" } }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#fffbeb",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                <FolderOpenOutlined />
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#d97706" }}>
                {rfpStats.pendingCount || 0}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Open RFP Opportunities</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "4px 0 12px" }}>
              Active Proposals
            </div>
            <Link to="/ngo/open-rfp" style={{ fontSize: 12.5, fontWeight: 600, color: "#15803d", display: "inline-flex", alignItems: "center", gap: 4 }}>
              View Open RFPs <ArrowRightOutlined style={{ fontSize: 11 }} />
            </Link>
          </Card>
        </Col>

        {/* CSR Projects Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "20px 22px" } }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#faf5ff",
                  color: "#9333ea",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                <ProjectOutlined />
              </div>
              <Tag color="blue" style={{ fontWeight: 700, borderRadius: 4 }}>
                Active
              </Tag>
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Assigned CSR Projects</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "4px 0 12px" }}>
              Ongoing Work
            </div>
            <Link to="/ngo/projects" style={{ fontSize: 12.5, fontWeight: 600, color: "#15803d", display: "inline-flex", alignItems: "center", gap: 4 }}>
              View Projects List <ArrowRightOutlined style={{ fontSize: 11 }} />
            </Link>
          </Card>
        </Col>
      </Row>

      {/* Quick Action Navigation Grid */}
      <Card
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
            Quick Navigation &amp; Modules
          </span>
        }
        style={{
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        }}
        styles={{ body: { padding: "20px 24px" } }}
      >
        <Row gutter={[16, 16]}>
          {[
            {
              title: "Organization Profile",
              desc: "First review empty fields, click 'Add Profile' to submit, and update details anytime via edit mode.",
              icon: <IdcardOutlined style={{ fontSize: 24, color: "#15803d" }} />,
              link: "/ngo/profile",
              btnText: "Open Profile",
            },
            {
              title: "Due Diligence (DD)",
              desc: "Upload and verify statutory compliances (12A, 80G, CSR-1, FCRA, Audited Financials).",
              icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
              link: "/ngo/dd",
              btnText: "Open DD Form",
            },
            {
              title: "Open RFPs",
              desc: "Explore RFPs floated by corporate donors, evaluate criteria, and submit grants proposals.",
              icon: <FolderOpenOutlined style={{ fontSize: 24, color: "#d97706" }} />,
              link: "/ngo/open-rfp",
              btnText: "Explore RFPs",
            },
            {
              title: "Closed RFPs",
              desc: "View past submitted proposals, historical RFPs, and evaluation status.",
              icon: <CheckCircleFilled style={{ fontSize: 24, color: "#059669" }} />,
              link: "/ngo/closed-rfp",
              btnText: "View History",
            },
          ].map((item, idx) => (
            <Col xs={24} sm={12} key={idx}>
              <div
                style={{
                  padding: "16px 20px",
                  background: "#f8fafc",
                  borderRadius: 10,
                  border: "1px solid #f1f5f9",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    {item.icon}
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                      {item.title}
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Link to={item.link}>
                    <Button type="default" size="small" style={{ borderRadius: 6, fontWeight: 600 }}>
                      {item.btnText} →
                    </Button>
                  </Link>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
