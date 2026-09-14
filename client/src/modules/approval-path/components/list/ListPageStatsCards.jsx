"use client";
import React from "react";
import {
  ApartmentOutlined,
  CheckCircleFilled,
  FileTextFilled,
  LinkOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

export const ListPageStatsCards = ({ stats }) => {
  const { total = 0, active = 0, drafts = 0, uniqueForms = 0 } = stats || {};

  const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
  const draftsPercent = total > 0 ? Math.round((drafts / total) * 100) : 0;

  return (
    <div className="ap-stats-grid">
      {/* 1. Total Workflows */}
      <div className="ap-stat-card ap-stat-card--blue">
        <div className="ap-stat-content">
          <span className="ap-stat-label">Total Workflows</span>
          <span className="ap-stat-val">{total}</span>
          <span className="ap-stat-sub">
            <ArrowUpOutlined style={{ fontSize: 11 }} /> +0% vs last month
          </span>
        </div>
        <div className="ap-stat-icon-box">
          <ApartmentOutlined />
        </div>
      </div>

      {/* 2. Active in Prod */}
      <div className="ap-stat-card ap-stat-card--green">
        <div className="ap-stat-content">
          <span className="ap-stat-label">Active in Prod</span>
          <span className="ap-stat-val">{active}</span>
          <span className="ap-stat-sub">{activePercent}% of total</span>
        </div>
        <div className="ap-stat-icon-box">
          <CheckCircleFilled />
        </div>
      </div>

      {/* 3. Draft Workflows */}
      <div className="ap-stat-card ap-stat-card--orange">
        <div className="ap-stat-content">
          <span className="ap-stat-label">Draft Workflows</span>
          <span className="ap-stat-val">{drafts}</span>
          <span className="ap-stat-sub">{draftsPercent}% of total</span>
        </div>
        <div className="ap-stat-icon-box">
          <FileTextFilled />
        </div>
      </div>

      {/* 4. Connected Forms */}
      <div className="ap-stat-card ap-stat-card--purple">
        <div className="ap-stat-content">
          <span className="ap-stat-label">Connected Forms</span>
          <span className="ap-stat-val">{uniqueForms}</span>
          <span className="ap-stat-sub">
            {uniqueForms} form{uniqueForms !== 1 ? "s" : ""} linked
          </span>
        </div>
        <div className="ap-stat-icon-box">
          <LinkOutlined />
        </div>
      </div>
    </div>
  );
};

export default ListPageStatsCards;
