"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { App, Button, Dropdown, Input, message, Modal, Switch, Table, Tag, Tooltip } from "antd";
import "@/modules/approval-path/approval-path-new.css";
import "@/modules/auth-management/permissions-page.css";
import {
  dynamicActiveInactiveAPI,
  dynamicGeneralExportExcel,
  dynamicSchemaDetailsAPI,
  dynamicViewListViewAPI,
} from "@/services/dynamicForm-service";
import { privateHttpClient } from "@/services/api/httpClient";
import DynamicFormModalsV2 from "@/modules/dynamic-form-v2/list-view/general-list-view/components/DynamicFormModalsV2";
import { buildColumnsOptimized } from "@/modules/dynamic-form-v2/list-view/general-list-view/helper/buildColumnWithData.helper";
import { hasModulePermissions } from "@/context/PermissionContext";
import dayjs from "dayjs";

const getFieldValue = (row, fieldKey) => {
  if (!row || !fieldKey) return undefined;
  let val = row[fieldKey];
  if (val === undefined || val === null) {
    const lowerKey = fieldKey.toLowerCase();
    const foundKey = Object.keys(row).find((k) => k.toLowerCase() === lowerKey);
    if (foundKey) val = row[foundKey];
  }
  return val;
};

export default function FinancialYearMasterView({ slug = "financial_year" }) {
  const [messageApi, contextHolder] = message.useMessage();
  const app = App.useApp();
  const modal = (app?.modal && typeof app.modal.confirm === 'function') ? app.modal : Modal;
  const rawPerms = hasModulePermissions(slug);
  const perms = Array.isArray(rawPerms) ? rawPerms : [];

  const [dataFetchLoading, setDataFetchLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [schema, setSchema] = useState(null);
  const [actions, setActions] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchKey, setSearchKey] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [openDynamicAddEditForm, setOpenDynamicAddEditForm] = useState(false);
  const [openDynamicViewForm, setOpenDynamicViewForm] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [mode, setMode] = useState("add");
  const [urlListAPI, setUrlListAPI] = useState({
    details_url_API: null,
    view_url_API: null,
  });

  const formRef = useRef(null);

  const fetchData = async () => {
    try {
      setDataFetchLoading(true);
      const payload = {
        form_slug: slug,
        filters: { search: "" },
        pagination: { current_page: 1, page_size: 100 },
      };

      const [res, schemaRes] = await Promise.all([
        dynamicViewListViewAPI(payload),
        dynamicSchemaDetailsAPI({ form_slug: slug }).catch(() => null),
      ]);

      const rawRes = res?.data || {};
      const respData = rawRes?.data !== undefined ? rawRes.data : rawRes;
      const listSchema = rawRes?.schema || {};
      const fullSchema =
        schemaRes?.data?.data?.schema_details ||
        schemaRes?.data?.schema_details ||
        schemaRes?.data?.data ||
        schemaRes?.data ||
        {};

      const fetchedRows = Array.isArray(respData?.rows)
        ? respData.rows
        : Array.isArray(respData)
        ? respData
        : [];

      setRows(fetchedRows);

      const activeSchema = {
        ...fullSchema,
        ...listSchema,
        title: listSchema?.title || fullSchema?.title || "Financial Year",
      };

      setSchema(activeSchema);

      if (respData?.details_url_API || respData?.view_url_API || respData?.urls) {
        setUrlListAPI({
          details_url_API: respData?.details_url_API || respData?.urls?.details_url_API,
          view_url_API: respData?.view_url_API || respData?.urls?.view_url_API,
        });
      }

      const mergedActions = [
        { slug: "view", name: "View", type: "FORM" },
        { slug: "edit", name: "Edit", type: "FORM" },
        { slug: "delete", name: "Delete", type: "API" },
      ];
      setActions(mergedActions);
    } catch (err) {
      console.error("Failed to load financial year data:", err);
    } finally {
      setDataFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const isRowActive = (r) => {
    const v = getFieldValue(r, "is_active") ?? getFieldValue(r, "status") ?? getFieldValue(r, "state");
    if (v === true || v === 1 || v === "1") return true;
    if (typeof v === "string") {
      const s = v.toLowerCase().trim();
      return s === "active" || s === "enabled" || s === "approved" || s === "published";
    }
    return true;
  };

  const isRowInactive = (r) => {
    const v = getFieldValue(r, "is_active") ?? getFieldValue(r, "status") ?? getFieldValue(r, "state");
    if (v === false || v === 0 || v === "0") return true;
    if (typeof v === "string") {
      const s = v.toLowerCase().trim();
      return s === "inactive" || s === "disabled" || s === "rejected" || s === "deleted" || s === "suspended";
    }
    return false;
  };

  const isRowCurrentFY = (r) => {
    const v = getFieldValue(r, "is_current") ?? getFieldValue(r, "is_default") ?? getFieldValue(r, "current");
    return v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true" || String(v).toLowerCase() === "yes";
  };

  const totalCount = rows.length;
  const activeCount = useMemo(() => rows.filter(isRowActive).length, [rows]);
  const inactiveCount = useMemo(() => rows.filter(isRowInactive).length, [rows]);
  const currentFYCount = useMemo(() => rows.filter(isRowCurrentFY).length, [rows]);

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (statusFilter === "active") {
      result = result.filter(isRowActive);
    } else if (statusFilter === "inactive") {
      result = result.filter(isRowInactive);
    } else if (statusFilter === "current") {
      result = result.filter(isRowCurrentFY);
    }

    if (searchKey.trim()) {
      const term = searchKey.toLowerCase().trim();
      result = result.filter((row) => {
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === "object") return false;
          return String(val).toLowerCase().includes(term);
        });
      });
    }

    return result;
  }, [rows, statusFilter, searchKey]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await dynamicGeneralExportExcel(slug);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExportLoading(false);
    }
  };

  const onEditAction = (record) => {
    const primaryKey = schema?.root_entity?.primary_key || "id";
    const pkValue = record?.[primaryKey] ?? record?.id ?? record?.[Object.keys(record || {}).find((k) => k.endsWith("_id"))];
    setSelectedData({ [primaryKey]: pkValue, id: pkValue });
    setMode("edit");
    setOpenDynamicAddEditForm(true);
  };

  const onViewAction = (record) => {
    const primaryKey = schema?.root_entity?.primary_key || "id";
    const pkValue = record?.[primaryKey] ?? record?.id ?? record?.[Object.keys(record || {}).find((k) => k.endsWith("_id"))];
    setSelectedData({ [primaryKey]: pkValue, id: pkValue });
    setMode("view");
    setOpenDynamicViewForm(true);
  };

  const handleDeleteAction = (record) => {
    modal.confirm({
      title: "Confirm Delete",
      content: `Are you sure you want to delete Financial Year "${record?.name || record?.financial_year || record?.fy || 'Record'}"?`,
      okText: "Yes, Delete",
      okType: "danger",
      onOk: async () => {
        try {
          const id = record.id || record[schema?.root_entity?.primary_key || "id"];
          await privateHttpClient.delete(`/dynamic-form/${slug}/${id}`);
          if (messageApi) messageApi.success("Financial Year deleted successfully");
          fetchData();
        } catch (err) {
          if (messageApi) messageApi.error(err?.response?.data?.message || "Failed to delete record");
        }
      },
    });
  };

  const handleToggleStatus = (record) => {
    const isActive = isRowActive(record);
    const primaryKey = schema?.root_entity?.primary_key || "id";
    const id = record.id || record[primaryKey];

    modal.confirm({
      title: "Confirm Status Change",
      content: `Do you want to ${isActive ? "deactivate" : "activate"} this Financial Year?`,
      onOk: async () => {
        try {
          await dynamicActiveInactiveAPI(schema?.api?.active_inactive || `/dynamic-form/${slug}/status`, {
            form_slug: slug,
            primary_key_value: id,
            is_active: !isActive,
          });
          if (messageApi) messageApi.success(`Status updated to ${!isActive ? "Active" : "Inactive"}`);
          fetchData();
        } catch (err) {
          if (messageApi) messageApi.error("Failed to update status");
        }
      },
    });
  };

  const tableColumns = useMemo(() => {
    return [
      {
        title: "#",
        key: "__index",
        width: 55,
        align: "center",
        className: "text-center align-middle",
        render: (_, __, index) => <span className="perm-index-badge">{index + 1}</span>,
      },
      {
        title: "Financial Year",
        key: "financial_year_name",
        render: (_, record) => {
          const name = record.name || record.financial_year || record.financial_year_name || record.fy_name || record.fy || record.title || "—";
          const isCurr = isRowCurrentFY(record);
          return (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-[13.5px]">{name}</span>
              {isCurr && (
                <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, padding: "1px 6px" }}>
                  CURRENT FY
                </Tag>
              )}
            </div>
          );
        },
      },
      {
        title: "Code / Short",
        key: "code",
        width: 140,
        render: (_, record) => {
          const code = record.code || record.fy_code || record.short_name || record.alias || "—";
          return <span className="text-slate-700 font-semibold text-[13px]">{code}</span>;
        },
      },
      {
        title: "Start Date",
        key: "start_date",
        width: 140,
        render: (_, record) => {
          const val = record.start_date || record.from_date || record.start;
          if (!val) return <span className="text-slate-300 italic">—</span>;
          return <span className="text-slate-700 text-[13px] font-medium">{dayjs(val).isValid() ? dayjs(val).format("DD MMM, YYYY") : val}</span>;
        },
      },
      {
        title: "End Date",
        key: "end_date",
        width: 140,
        render: (_, record) => {
          const val = record.end_date || record.to_date || record.end;
          if (!val) return <span className="text-slate-300 italic">—</span>;
          return <span className="text-slate-700 text-[13px] font-medium">{dayjs(val).isValid() ? dayjs(val).format("DD MMM, YYYY") : val}</span>;
        },
      },
      {
        title: "Status",
        key: "status",
        width: 140,
        render: (_, record) => {
          const isActive = isRowActive(record);
          return (
            <div className="flex items-center gap-2">
              <Switch
                size="small"
                checked={isActive}
                onChange={() => handleToggleStatus(record)}
                style={{ backgroundColor: isActive ? "#16a34a" : "#cbd5e1" }}
              />
              <span className={`perm-status-badge ${isActive ? "perm-status-badge--active" : "perm-status-badge--inactive"}`} style={{ padding: "2px 8px", fontSize: 11 }}>
                <span className="perm-status-dot" /> {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 110,
        align: "center",
        onHeaderCell: () => ({
          className: "ap-actions-header-cell",
        }),
        render: (_, record) => (
          <div className="db-views-action-btns" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Tooltip title="Edit Financial Year" color="#7c3aed">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEditAction(record)}
                className="conf-action-outline-btn conf-action-edit-view-btn"
              />
            </Tooltip>

            <Tooltip title="Delete Financial Year" color="#dc2626">
              <Button
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteAction(record)}
                className="conf-action-delete-btn"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(239, 68, 68, 0.6)",
                  color: "#dc2626",
                }}
              />
            </Tooltip>
          </div>
        ),
      },
    ];
  }, [rows]);

  return (
    <div className="perm-page-container">
      {contextHolder}

      {/* ── 1. ENTERPRISE PAGE HEADER ── */}
      <div className="perm-page-header">
        <div className="perm-page-header-left">
          <div className="perm-page-header-icon">
            <CalendarOutlined />
          </div>
          <div>
            <h1 className="perm-page-title">Financial Year Management</h1>
            <p className="perm-page-subtitle">
              Manage, configure, and oversee fiscal year cycles and reporting periods.
            </p>
          </div>
        </div>

        <div className="perm-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={dataFetchLoading}
            className="perm-btn-refresh"
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedData(null);
              setMode("add");
              setOpenDynamicAddEditForm(true);
            }}
            className="perm-btn-create"
          >
            Add Financial Year
          </Button>
        </div>
      </div>

      {/* ── 2. KPI STATS CARDS ── */}
      <div className="perm-stats-grid">
        <div className="perm-stat-card perm-stat-card--blue">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Total Financial Years</span>
            <span className="perm-stat-val">{totalCount}</span>
            <span className="perm-stat-sub">
              <CalendarOutlined /> Registered Fiscal Cycles
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <CalendarOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--green">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Active FY</span>
            <span className="perm-stat-val">{activeCount}</span>
            <span className="perm-stat-sub">
              <CheckCircleOutlined /> Enabled Fiscal Years
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <CheckCircleOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--orange">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Inactive FY</span>
            <span className="perm-stat-val">{inactiveCount}</span>
            <span className="perm-stat-sub">
              <StopOutlined /> Closed / Disabled
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <StopOutlined />
          </div>
        </div>

        <div className="perm-stat-card perm-stat-card--purple">
          <div className="perm-stat-content">
            <span className="perm-stat-label">Current FY</span>
            <span className="perm-stat-val">{currentFYCount > 0 ? currentFYCount : 1}</span>
            <span className="perm-stat-sub">
              <KeyOutlined /> Active System Year
            </span>
          </div>
          <div className="perm-stat-icon-box">
            <KeyOutlined />
          </div>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR (MATCHING USER DESIGN) ── */}
      <div className="perm-toolbar">
        <div className="perm-toolbar-left">
          <div className="perm-tab-track">
            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--all ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <span className="perm-pill-icon"><FolderOpenOutlined /></span>
              <span>All Financial Years</span>
              <span className="perm-pill-count">{totalCount}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--active ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              <span className="perm-pill-icon"><CheckCircleOutlined /></span>
              <span>Active</span>
              <span className="perm-pill-count">{activeCount}</span>
            </button>

            <button
              type="button"
              className={`perm-pill-tab perm-pill-tab--inactive ${statusFilter === "inactive" ? "active" : ""}`}
              onClick={() => setStatusFilter("inactive")}
            >
              <span className="perm-pill-icon"><StopOutlined /></span>
              <span>Inactive</span>
              <span className="perm-pill-count">{inactiveCount}</span>
            </button>

            {currentFYCount > 0 && (
              <button
                type="button"
                className={`perm-pill-tab perm-pill-tab--config ${statusFilter === "current" ? "active" : ""}`}
                onClick={() => setStatusFilter("current")}
              >
                <span className="perm-pill-icon"><KeyOutlined /></span>
                <span>Current FY</span>
                <span className="perm-pill-count">{currentFYCount}</span>
              </button>
            )}
          </div>
        </div>

        <div className="perm-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Input
            className="perm-search-input"
            placeholder="Search financial year, code, dates..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />

          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exportLoading}
            className="perm-btn-refresh"
          >
            Export
          </Button>
        </div>
      </div>

      {/* ── 4. MODERN ENTERPRISE TABLE CARD ── */}
      <div className="ap-card-table conf-card-table perm-card-table">
        <Table
          columns={tableColumns}
          dataSource={filteredRows.map((r, i) => ({ ...r, key: r.id || `fy_${i}` }))}
          rowKey="key"
          loading={dataFetchLoading}
          size="middle"
          scroll={{ x: "max-content" }}
          className="techcsr-modern-datatable perm-card-table"
          pagination={{
            defaultPageSize: 10,
            pageSizeOptions: ["10", "25", "50"],
            showSizeChanger: true,
            showQuickJumper: true,
            className: "perm-table-pagination",
            showTotal: (total, range) => (
              <span className="text-xs text-slate-500 font-semibold mr-3">
                Showing {range[0]} to {range[1]} of {total} entries
              </span>
            ),
            position: ["bottomRight"],
          }}
        />
      </div>

      {/* ── 5. DYNAMIC FORM MODALS ── */}
      <DynamicFormModalsV2
        openDynamicAddEditForm={openDynamicAddEditForm}
        handleCloseDynamicAddEditForm={() => setOpenDynamicAddEditForm(false)}
        schema={schema}
        formRef={formRef}
        formSlug={slug}
        fetchData={fetchData}
        selectedData={selectedData}
        mode={mode}
        urlListAPI={urlListAPI}
        openDynamicViewForm={openDynamicViewForm}
        setOpenDynamicViewForm={setOpenDynamicViewForm}
      />
    </div>
  );
}
