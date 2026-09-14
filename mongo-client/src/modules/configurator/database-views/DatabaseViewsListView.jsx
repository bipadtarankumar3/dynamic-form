'use client';

import React, { useState, useEffect } from "react";
import {
  Table, Card, Button, Input, Tag, Space, Drawer, Modal,
  Popconfirm, Tooltip, Badge, Spin, Alert, Row, Col, Collapse, App
} from "antd";
import {
  PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
  ReloadOutlined, CodeOutlined, DeleteOutlined, DatabaseOutlined, PlusCircleOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, CopyOutlined, FormOutlined,
  LinkOutlined
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import DatabaseViewWizard from "./DatabaseViewWizard";
import DeleteDatabaseViewModal from "./components/DeleteDatabaseViewModal";
import ViewSqlModal from "./components/ViewSqlModal";
import "./database-views.css";
import Image from "next/image";
import DatabaseView from '@/assets/images/dashboard/DatabaseView.png';
import DatabaseActive from '@/assets/images/dashboard/DatabaseActive.png';
import DatabaseSql from '@/assets/images/dashboard/DatabaseSql.png';
import QueryEndpoints from '@/assets/images/dashboard/QueryEndpoints.png';
const API_BASE = "configurator/database-views";

export default function DatabaseViewsListView() {
  const { message } = App.useApp();
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewToDrop, setViewToDrop] = useState(null);

  // Wizard Modal State
  const [showWizard, setShowWizard] = useState(false);
  const [editingView, setEditingView] = useState(null);

  // Preview Drawer State
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState({ view_name: "", columns: [], data: [] });

  // SQL Modal State
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [selectedSql, setSelectedSql] = useState({ name: "", sql: "" });

  // Dependencies Drawer State
  const [showDeps, setShowDeps] = useState(false);
  const [depsData, setDepsData] = useState([]);

  useEffect(() => {
    fetchViews();
  }, []);

  const fetchViews = async () => {
    try {
      setLoading(true);
      const res = await privateHttpClient.get(API_BASE);
      if (res.data?.success) {
        setViews(res.data.data || []);
      }
    } catch (err) {
      console.error("[DatabaseViews] fetch error:", err);
      message.error("Failed to load database views");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (record) => {
    try {
      setPreviewLoading(true);
      setShowPreview(true);
      const res = await privateHttpClient.get(`${API_BASE}/${record.id}/preview`);
      if (res.data?.success) {
        setPreviewData({
          view_name: record.view_name,
          database_view_name: record.database_view_name,
          columns: res.data.columns || [],
          data: res.data.data || []
        });
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load preview data");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRefreshView = async (record) => {
    try {
      setLoading(true);
      const res = await privateHttpClient.post(`${API_BASE}/${record.id}/refresh`);
      if (res.data?.success) {
        message.success(res.data.message);
        fetchViews();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to refresh database view");
    } finally {
      setLoading(false);
    }
  };

  const handleDropView = async (record) => {
    try {
      setLoading(true);
      const res = await privateHttpClient.delete(`${API_BASE}/${record.id}`);
      if (res.data?.success) {
        message.success(res.data.message);
        fetchViews();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to drop view");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center",
      sorter: (a, b) => (a.id || 0) - (b.id || 0),
      render: (_, __, idx) => (
        <span className="conf-index-badge">
          {idx + 1}
        </span>
      )
    },
    {
      title: "View Name",
      dataIndex: "view_name",
      key: "view_name",
      sorter: (a, b) => (a.view_name || "").localeCompare(b.view_name || ""),
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>{text}</div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>{record.description || "Auto-generated view for form"}</div>
        </div>
      )
    },
    {
      title: "PostgreSQL View",
      dataIndex: "database_view_name",
      key: "database_view_name",
      sorter: (a, b) => (a.database_view_name || "").localeCompare(b.database_view_name || ""),
      render: (text) => (
        <span className="conf-slug-code" style={{ color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: 4 }}>
          public.{text}
        </span>
      )
    },
    {
      title: "Base Table",
      dataIndex: "base_table",
      key: "base_table",
      sorter: (a, b) => (a.base_table || "").localeCompare(b.base_table || ""),
      render: (text) => (
        <span className="conf-slug-code" style={{ color: "#2563eb" }}>
          {text}
        </span>
      )
    },
    {
      title: "Connected Admin Lists",
      key: "connected_forms",
      sorter: (a, b) => (a.connected_forms_count || 0) - (b.connected_forms_count || 0),
      render: (_, record) => {
        const forms = record.connected_forms || [];
        if (forms.length === 0) {
          return (
            <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
              — Not Connected
            </span>
          );
        }
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {forms.map((f) => (
              <Tag
                key={f.id || f.slug}
                color="blue"
                style={{
                  borderRadius: 6,
                  padding: "2px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                }}
              >
                <FormOutlined style={{ fontSize: 11 }} />
                <span>{f.title}</span>
                <span style={{ opacity: 0.65, fontSize: "10.5px" }}>({f.slug})</span>
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "view_type",
      key: "view_type",
      sorter: (a, b) => (a.view_type || "").localeCompare(b.view_type || ""),
      render: (type) => (
        <span className="conf-badge-master-yes">
          {type === "detail" ? "Detail View" : "Standard View"}
        </span>
      )
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      align: "center",
      sorter: (a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0),
      render: (active) => (
        <span className={active !== false ? "conf-badge-published" : "conf-badge-draft"}>
          {active !== false ? "ACTIVE" : "INACTIVE"}
        </span>
      )
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      render: (date) => (
        <span style={{ color: "#64748b", fontSize: "13px" }}>
          {new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      )
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <div className="db-views-action-btns" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Tooltip title="Preview" color="#16a34a">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenPreview(record)}
              className="conf-action-edit-btn conf-action-preview-btn"
            />
          </Tooltip>

          <Tooltip title="Edit" color="#7c3aed">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingView(record.configuration_json || record);
                setShowWizard(true);
              }}
              className="conf-action-outline-btn conf-action-edit-view-btn"
            />
          </Tooltip>

          <Tooltip title="Refresh" color="#ea580c">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRefreshView(record)}
              className="conf-action-outline-btn conf-action-refresh-btn"
            />
          </Tooltip>

          <Tooltip title="SQL" color="#2563eb">
            <Button
              size="small"
              icon={<CodeOutlined />}
              onClick={() => {
                setSelectedSql({ name: record.database_view_name, sql: record.generated_sql });
                setShowSqlModal(true);
              }}
              className="conf-action-outline-btn conf-action-sql-btn"
            />
          </Tooltip>

          <Tooltip title="Delete" color="#dc2626">
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => setViewToDrop(record)}
              className="conf-action-delete-btn"
            />
          </Tooltip>
        </div>
      )
    }
  ];

  const filteredViews = views.filter(v =>
    v.view_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    v.database_view_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    v.base_table?.toLowerCase().includes(searchText.toLowerCase())
  );
  const activeViewsCount = views.filter(v => v.is_valid !== false).length;

  return (
    <div className="conf-page-container">
      {/* Top Header */}
      <div className="conf-page-header">
        <div className="conf-page-header-left">
          <div className="conf-page-header-icon">
            <DatabaseOutlined />
          </div>
          <div>
            <h1 className="conf-page-title">Database Views</h1>
            <p className="conf-page-subtitle">Visually create and manage real PostgreSQL database views without writing SQL manually</p>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={() => {
            setEditingView(null);
            setShowWizard(true);
          }}
          className="conf-create-btn"
        >
          Create Database View
        </Button>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="conf-stats-grid">
        <div className="conf-stat-card conf-stat-card--blue">
          <div className="conf-stat-icon-boxs">
            <Image src={DatabaseView} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Total Views</span>
            <span className="conf-stat-val">{views.length}</span>
            <span className="conf-stat-sub">PostgreSQL database views</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--green">
          <div className="conf-stat-icon-boxs">
            <Image src={DatabaseActive} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Active Views</span>
            <span className="conf-stat-val">{activeViewsCount}</span>
            <span className="conf-stat-sub">Compiled without errors</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--orange">
          <div className="conf-stat-icon-boxs">
            <Image src={DatabaseSql} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">SQL Definitions</span>
            <span className="conf-stat-val">{views.length}</span>
            <span className="conf-stat-sub">Optimized PostgreSQL DDL</span>
          </div>
        </div>

        <div className="conf-stat-card conf-stat-card--purple">
          <div className="conf-stat-icon-boxs">
            <Image src={QueryEndpoints} alt="CSR Dashboard UI" width={200} height={200} />
          </div>
          <div className="conf-stat-content">
            <span className="conf-stat-label">Query Endpoints</span>
            <span className="conf-stat-val">{views.length}</span>
            <span className="conf-stat-sub">Live REST query endpoints</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="conf-toolbar">
        <div className="conf-toolbar-left">
          <div className="conf-pill-tab active">
            <span>All Database Views</span>
            <span className="conf-pill-count">{views.length}</span>
          </div>
        </div>

        <div className="conf-toolbar-right">
          <Input
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="Search views, tables, or postgres names..."
            className="conf-search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="conf-card-table">
        <Table
          dataSource={filteredViews}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: true }}
        />
      </div>

      {/* SQL PREVIEW MODAL */}
      <ViewSqlModal
        open={showSqlModal}
        onClose={() => setShowSqlModal(false)}
        sqlData={selectedSql}
      />

      {/* REAL VIEW DATA PREVIEW DRAWER */}
      <Drawer
        title={
          <div className="db-drawer-title-flex">
            {/* <EyeOutlined style={{ color: "#2563eb" }} /> */}
            <span>PostgreSQL View Data Preview: <b>public.{previewData.view_name}</b></span>
          </div>
        }
        open={showPreview}
        onClose={() => setShowPreview(false)}
        width="85%"
      >
        {previewLoading ? (
          <div className="db-center-spin-box"><Spin size="large" /></div>
        ) : (
          <div>
            <Alert
              type="info"
              showIcon
              message={`Displaying top ${previewData.data?.length || 0} real records directly queried from PostgreSQL database view public.${previewData.view_name}.`}
              className="db-alert-margin"
            />

            <Table
              dataSource={(previewData.data || []).map((item, idx) => ({ ...item, _rowKey: item.id || item.monitoring_id || `row_${idx}` }))}
              rowKey="_rowKey"
              scroll={{ x: "max-content" }}
              pagination={{ pageSize: 15 }}
              columns={(previewData.columns || []).map(c => ({
                title: c.column_name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                dataIndex: c.column_name,
                key: c.column_name,
                render: (val) => {
                  if (typeof val === "object" && val !== null) {
                    return (
                      <Tag color="cyan">
                        {Array.isArray(val) ? `${val.length} records` : "JSON object"}
                      </Tag>
                    );
                  }
                  return String(val ?? "-");
                }
              }))}
              expandable={{
                expandedRowRender: (record) => {
                  const childKeys = Object.keys(record).filter(k => Array.isArray(record[k]));
                  if (childKeys.length === 0) return <span className="db-empty-text">No child records</span>;

                  // Find view configuration json if present (from record or previewData)
                  const viewConfig = record.configuration_json || previewData.configuration_json || {};
                  const childTableConfigs = viewConfig.child_tables || [];

                  return (
                    <div className="db-child-drawer-box">
                      {childKeys.map(key => {
                        const cleanKey = String(key).toLowerCase().replace(/^t_frm_/, "");
                        const matchCfg = childTableConfigs.find(c => {
                          const cleanTable = String(c.child_table || "").toLowerCase().replace(/^t_frm_/, "");
                          const cleanTitle = String(c.title || "").toLowerCase();
                          return cleanTable === cleanKey || cleanTitle === cleanKey || cleanTable.includes(cleanKey) || cleanKey.includes(cleanTable);
                        });

                        const firstItem = record[key][0] || {};
                        let columnKeys = [];

                        if (matchCfg && matchCfg.fields && matchCfg.fields.length > 0) {
                          // Order columns by exact matchCfg.fields array order
                          const firstItemKeys = Object.keys(firstItem);
                          matchCfg.fields.forEach(f => {
                            const matchedKey = firstItemKeys.find(k =>
                              k === f.alias || k === f.field || k.toLowerCase() === (f.alias || "").toLowerCase() || k.toLowerCase() === (f.field || "").toLowerCase()
                            );
                            if (matchedKey && !columnKeys.includes(matchedKey)) {
                              columnKeys.push(matchedKey);
                            }
                          });
                          // Append any remaining keys from firstItem
                          firstItemKeys.forEach(k => {
                            if (!columnKeys.includes(k)) columnKeys.push(k);
                          });
                        } else {
                          columnKeys = Object.keys(firstItem);
                        }

                        const displayType = matchCfg?.display_type || "table";

                        const formatVal = (val) => {
                          if (val === null || val === undefined) return "-";
                          if (typeof val === "object") {
                            try {
                              return JSON.stringify(val);
                            } catch (e) {
                              return String(val);
                            }
                          }
                          return String(val);
                        };

                        return (
                          <div key={key} className="db-mb-16">
                            <div className="db-drawer-header-flex">
                              <h5 className="db-table-title-cyan" style={{ margin: 0, textTransform: "capitalize" }}>
                                Child Table: {matchCfg?.title || key} ({record[key]?.length || 0} items)
                              </h5>
                              <Tag color="cyan" className="db-tag-uppercase">
                                {displayType}
                              </Tag>
                            </div>

                            {(!record[key] || record[key].length === 0) ? (
                              <Tag>Empty array</Tag>
                            ) : displayType === "accordion" ? (
                              <Collapse
                                size="small"
                                className="db-collapse-custom"
                                items={(record[key] || []).map((item, idx) => {
                                  const titleVal = item.report_summary || item.report_date || item.title || item.name || `#${idx + 1}`;
                                  return {
                                    key: item.id || idx,
                                    label: (
                                      <span className="db-accordion-title">
                                        {matchCfg?.title || key} #{idx + 1}: {String(titleVal).slice(0, 50)}
                                      </span>
                                    ),
                                    children: (
                                      <Row gutter={[16, 12]}>
                                        {columnKeys.map(ck => (
                                          <Col span={8} key={ck}>
                                            <div className="db-col-label">
                                              {ck.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                            </div>
                                            <div className="db-col-val">
                                              {formatVal(item[ck])}
                                            </div>
                                          </Col>
                                        ))}
                                      </Row>
                                    )
                                  };
                                })}
                              />
                            ) : displayType === "cards" ? (
                              <Row gutter={[12, 12]}>
                                {(record[key] || []).map((item, idx) => (
                                  <Col xs={24} sm={12} md={8} key={item.id || idx}>
                                    <Card
                                      size="small"
                                      title={<span className="db-card-sub-title">{matchCfg?.title || key} #{idx + 1}</span>}
                                      className="db-card-border"
                                    >
                                      <div className="db-flex-col-gap">
                                        {columnKeys.map(ck => (
                                          <div key={ck} className="db-card-row-flex">
                                            <span className="db-card-row-label">
                                              {ck.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}:
                                            </span>
                                            <span className="db-card-row-val">
                                              {formatVal(item[ck])}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </Card>
                                  </Col>
                                ))}
                              </Row>
                            ) : (
                              <Table
                                dataSource={(record[key] || []).map((item, idx) => ({ ...item, _childRowKey: item.id || item.monitoring_id || `${key}_${idx}` }))}
                                rowKey="_childRowKey"
                                size="small"
                                pagination={false}
                                columns={columnKeys.map(ck => ({
                                  title: ck.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                                  dataIndex: ck,
                                  key: ck,
                                  render: (val) => formatVal(val)
                                }))}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              }}
            />
          </div>
        )}
      </Drawer>

      {/* CREATE / EDIT DATABASE VIEW WIZARD MODAL */}
      <Modal
        title={null}
        open={showWizard}
        onCancel={() => {
          setShowWizard(false);
          setEditingView(null);
        }}
        footer={null}
        width="100vw"
        className="full-width-wizard-modal"
        destroyOnHidden
      >
        <DatabaseViewWizard
          initialData={editingView}
          onClose={() => {
            setShowWizard(false);
            setEditingView(null);
          }}
          onSuccess={() => {
            setShowWizard(false);
            setEditingView(null);
            fetchViews();
          }}
        />
      </Modal>

      {/* Safe Database View Drop & Dependency Check Modal */}
      <DeleteDatabaseViewModal
        visible={!!viewToDrop}
        viewItem={viewToDrop}
        onCancel={() => setViewToDrop(null)}
        onSuccess={() => {
          setViewToDrop(null);
          fetchViews();
        }}
      />
    </div>
  );
}
