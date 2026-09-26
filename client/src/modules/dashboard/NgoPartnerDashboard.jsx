'use client';

import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Alert,
  Tabs,
  Typography,
  Divider,
} from "antd";
import {
  BankOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  FileDoneOutlined,
  SendOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  ArrowRightOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import NgoFormRecordView from "@/app/(ngo)/_components/NgoFormRecordView";
import { publicHttpClient } from "@/services/api/httpClient";

const { Title, Paragraph } = Typography;

export default function NgoPartnerDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("due_diligence");
  const [profileStatus, setProfileStatus] = useState("Pending Due Diligence");

  return (
    <div style={{ padding: "20px 24px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #16a34a 100%)",
          borderRadius: 16,
          padding: "24px 28px",
          color: "#ffffff",
          marginBottom: 20,
          boxShadow: "0 8px 24px rgba(21, 128, 61, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <BankOutlined /> NGO PARTNER PORTAL
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px 0", color: "#ffffff" }}>
            Welcome, {user?.name || "NGO Partner"}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 13.5, maxWidth: 650 }}>
            Manage your organization profile, upload statutory due diligence records (12A, 80G, CSR-1), and apply for corporate CSR grants and floated RFPs.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            type="primary"
            size="large"
            icon={<FileProtectOutlined />}
            onClick={() => setActiveTab("due_diligence")}
            style={{
              background: "#ffffff",
              color: "#15803d",
              borderColor: "#ffffff",
              fontWeight: 700,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            Update Due Diligence
          </Button>
          <Link href="/ngo/open-rfp">
            <Button
              size="large"
              icon={<ArrowRightOutlined />}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#ffffff",
                borderColor: "rgba(255,255,255,0.3)",
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              Browse RFPs
            </Button>
          </Link>
        </div>
      </div>

      {/* Action Required Banner */}
      <Alert
        type="warning"
        showIcon
        message={
          <span style={{ fontWeight: 800, fontSize: 14 }}>
            Action Required: Submit Statutory Due Diligence &amp; Financial Audits
          </span>
        }
        description="To qualify for corporate CSR grants and submit proposals against RFPs, complete your 12A, 80G, MCA CSR-1, and 3-year audit submissions below for NGO Manager approval."
        style={{ marginBottom: 20, borderRadius: 12, border: "1px solid #fef08a", background: "#fefce8" }}
      />

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Account Status</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
                  <Tag color="success" style={{ fontWeight: 700, fontSize: 12 }}>Active Partner</Tag>
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <CheckCircleFilled />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Due Diligence Status</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#b45309", marginTop: 4 }}>
                  <Tag color="warning" style={{ fontWeight: 700, fontSize: 12 }}>Pending Submission</Tag>
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <ClockCircleFilled />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Open Grant RFPs</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                  Browse Opportunities
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <FolderOpenOutlined />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: "1px solid #e2e8f0" }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Submitted Proposals</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                  0 Proposals
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#faf5ff", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <FileDoneOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card
        style={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
        styles={{ body: { padding: "12px 24px 24px 24px" } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "due_diligence",
              label: (
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  <SafetyCertificateOutlined /> Statutory Due Diligence &amp; Profile
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <NgoFormRecordView
                    formSlug="due_diligence"
                    title="Due Diligence (DD)"
                    description="Upload and track statutory compliance records, 12A/80G registrations, CSR-1 certificates, FCRA, and banking details."
                    updateBtnLabel="Update Due Diligence"
                    editBtnLabel="Edit Due Diligence"
                    icon={<SafetyCertificateOutlined />}
                    isVersioned={true}
                    apiEndpoint="ngo/due-diligence"
                  />
                </div>
              ),
            },
            {
              key: "rfps",
              label: (
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  <FolderOpenOutlined /> Floated CSR RFPs
                </span>
              ),
              children: (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 36, color: "#94a3b8", marginBottom: 12 }}>
                    <FolderOpenOutlined />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
                    Explore Available CSR Grants
                  </h3>
                  <p style={{ color: "#64748b", fontSize: 13.5, maxWidth: 500, margin: "0 auto 16px auto" }}>
                    Once your Due Diligence is approved by the NGO Manager, you can participate in CSR grants and submit project proposals.
                  </p>
                  <Link href="/ngo/open-rfp">
                    <Button type="primary" style={{ background: "#15803d", borderColor: "#15803d", borderRadius: 8, fontWeight: 700 }}>
                      View All Floated RFPs
                    </Button>
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
