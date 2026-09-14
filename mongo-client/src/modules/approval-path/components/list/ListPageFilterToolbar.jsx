"use client";
import React from "react";
import { Input, Select } from "antd";
import {
  SearchOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  EditOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";

export const ListPageFilterToolbar = ({
  searchQuery,
  onSearchChange,
  selectedFormFilter,
  onFormFilterChange,
  selectedStatusFilter,
  onStatusFilterChange,
  formList = [],
  stats = {},
}) => {
  const { total = 0, active = 0, drafts = 0 } = stats || {};
  const inactive = Math.max(0, total - active - drafts);

  const statusTabs = [
    { key: "all", label: "All Workflows", count: total, icon: <AppstoreOutlined /> },
    { key: "active", label: "Active", count: active, icon: <CheckCircleOutlined /> },
    { key: "draft", label: "Drafts", count: drafts, icon: <EditOutlined /> },
    { key: "inactive", label: "Inactive", count: inactive, icon: <PauseCircleOutlined /> },
  ];

  return (
    <div className="ap-toolbar">
      {/* Left: Status Filter Segment Tabs */}
      <div className="ap-toolbar-left">
        <div className="ap-tab-track">
          {statusTabs.map((tab) => {
            const isActive = selectedStatusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`ap-pill-tab ap-pill-tab--${tab.key} ${isActive ? "active" : ""}`}
                onClick={() => onStatusFilterChange(tab.key)}
              >
                <span className="ap-pill-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="ap-pill-count">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Form Filter & Search Input */}
      <div className="ap-toolbar-right">
        <Select
          className="ap-form-select"
          size="middle"
          value={selectedFormFilter}
          onChange={onFormFilterChange}
          options={[
            { label: "All Trigger Forms", value: "all" },
            ...formList.map((f) => ({ label: `Form: ${f.label}`, value: f.value })),
          ]}
        />

        <Input
          className="ap-search-input"
          size="middle"
          placeholder="Search workflow name, slug, or form..."
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
        />
      </div>
    </div>
  );
};

export default ListPageFilterToolbar;
