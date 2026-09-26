"use client";
import React from "react";
import { Button } from "antd";
import { ApartmentOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";

export const ListPageHeader = ({ onRefresh, onAdd, loading = false }) => {
  return (
    <div className="ap-page-header">
      <div className="ap-page-header-left">
        <div className="ap-page-header-icon">
          <ApartmentOutlined />
        </div>
        <div>
          <h1 className="ap-page-title">Approval Path Engine</h1>
          <p className="ap-page-subtitle">
            Design multi-level approval hierarchies, condition-based rule filters, and role-based action workflows.
          </p>
        </div>
      </div>

      <div className="ap-header-actions">
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
          className="ap-btn-refresh"
        >
          Refresh
        </Button>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAdd}
          className="ap-btn-create"
        >
          Add Approval Path
        </Button>
      </div>
    </div>
  );
};

export default ListPageHeader;
