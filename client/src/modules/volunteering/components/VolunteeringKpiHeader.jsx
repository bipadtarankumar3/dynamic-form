// client/src/modules/volunteering/components/VolunteeringKpiHeader.jsx
"use client";

import React from "react";
import { Row, Col } from "antd";
import {
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  DollarOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";

export default function VolunteeringKpiHeader({ metrics }) {
  const data = metrics || {
    totalEvents: 26,
    activePrograms: 3,
    volunteersTarget: 700,
    hoursAchieved: 1380,
    totalBeneficiaries: 23000,
    budgetAllocated: 1900000
  };

  const cards = [
    {
      title: "Active Programs",
      value: data.activePrograms || 3,
      sub: "Across FY 24-25",
      icon: <CheckCircleOutlined />,
      bg: "#f0fdf4",
      color: "#16a34a"
    },
    {
      title: "Total Events",
      value: data.totalEvents || 26,
      sub: "12 Scheduled • 14 Done",
      icon: <CalendarOutlined />,
      bg: "#eff6ff",
      color: "#2563eb"
    },
    {
      title: "Target Volunteers",
      value: (data.volunteersTarget || 700).toLocaleString(),
      sub: "345 Mobilized (49%)",
      icon: <TeamOutlined />,
      bg: "#faf5ff",
      color: "#9333ea"
    },
    {
      title: "Volunteer Hours",
      value: `${(data.hoursAchieved || 1380).toLocaleString()} hrs`,
      sub: "Target: 2,800 hrs",
      icon: <ClockCircleOutlined />,
      bg: "#fff7ed",
      color: "#ea580c"
    },
    {
      title: "Beneficiaries",
      value: (data.totalBeneficiaries || 23000).toLocaleString(),
      sub: "Target: 25,000",
      icon: <HeartOutlined />,
      bg: "#fff1f2",
      color: "#e11d48"
    },
    {
      title: "Total Budget",
      value: `₹${((data.budgetAllocated || 1900000) / 100000).toFixed(1)} L`,
      sub: "₹9.2 L Utilized",
      icon: <DollarOutlined />,
      bg: "#ecfeff",
      color: "#0891b2"
    }
  ];

  return (
    <Row gutter={[16, 16]} className="mb-6">
      {cards.map((c, i) => (
        <Col xs={24} sm={12} md={8} lg={4} key={i}>
          <div className="vol-kpi-card">
            <div className="vol-kpi-icon-wrap" style={{ background: c.bg, color: c.color }}>
              {c.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="vol-kpi-title">{c.title}</div>
              <div className="vol-kpi-value">{c.value}</div>
              <div className="vol-kpi-sub">{c.sub}</div>
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
}
