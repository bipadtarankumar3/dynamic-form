'use client';

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Modal,
  Tag,
  Button,
  Spin,
  Empty,
  Typography,
  Tabs,
  Space,
  Input,
  Radio,
  Tooltip,
  Divider,
  Card,
  Row,
  Col,
  Badge,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  HistoryOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  LaptopOutlined,
  SearchOutlined,
  DiffOutlined,
  CodeOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { getAuditDetailsByIdAPI } from "@/services/audit-service";

const { Text, Title, Paragraph } = Typography;

export default function AuditDiffModal({
  open,
  onClose,
  selectedData,
  records = [],
  currentIndex = -1,
  onNavigate,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filterMode, setFilterMode] = useState("changed"); // 'changed' | 'all' | 'unchanged'
  const [fieldSearch, setFieldSearch] = useState("");
  const [activeTab, setActiveTab] = useState("diff");
  const [copiedKey, setCopiedKey] = useState(null);

  const currentLog = useMemo(() => {
    if (currentIndex >= 0 && records && records[currentIndex]) {
      return records[currentIndex];
    }
    return selectedData;
  }, [currentIndex, records, selectedData]);

  const fetchAuditDetails = useCallback(async () => {
    if (!currentLog) return;
    try {
      setLoading(true);
      const payload = {
        id: currentLog?.id || currentLog?._id,
      };
      const res = await getAuditDetailsByIdAPI(payload);
      if (res?.data?.success && res?.data?.data) {
        setData(res.data.data);
      } else {
        // Fallback to embedded old_data / new_data from currentLog
        setData({
          id: currentLog.id || currentLog._id,
          table_name: currentLog.table_name || currentLog.module,
          operation: currentLog.operation || currentLog.action,
          record_id: currentLog.record_id,
          old_data: currentLog.old_data || {},
          new_data: currentLog.new_data || {},
          user_name: currentLog.changed_by_name || currentLog.changed_by || currentLog.user_name || "System",
          created_at: currentLog.changed_at || currentLog.created_at,
          ip_address: currentLog.client_ip || currentLog.ip_address,
          client_app: currentLog.client_app || currentLog.user_agent,
        });
      }
    } catch (error) {
      console.warn("Falling back to local record for audit details:", error);
      setData({
        id: currentLog?.id || currentLog?._id,
        table_name: currentLog?.table_name || currentLog?.module,
        operation: currentLog?.operation || currentLog?.action,
        record_id: currentLog?.record_id,
        old_data: currentLog?.old_data || {},
        new_data: currentLog?.new_data || {},
        user_name: currentLog?.changed_by_name || currentLog?.changed_by || currentLog?.user_name || "System",
        created_at: currentLog?.changed_at || currentLog?.created_at,
        ip_address: currentLog?.client_ip || currentLog?.ip_address,
        client_app: currentLog?.client_app || currentLog?.user_agent,
      });
    } finally {
      setLoading(false);
    }
  }, [currentLog]);

  useEffect(() => {
    if (open && currentLog) {
      fetchAuditDetails();
    }
  }, [open, currentLog, fetchAuditDetails]);

  // Keyboard Navigation (Left / Right arrow)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" && currentIndex > 0 && onNavigate) {
        onNavigate(currentIndex - 1);
      } else if (
        e.key === "ArrowRight" &&
        currentIndex < records.length - 1 &&
        onNavigate
      ) {
        onNavigate(currentIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, records.length, onNavigate]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === "object" ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const oldData = data?.old_data || {};
  const newData = data?.new_data || {};

  const allKeys = useMemo(() => {
    return Array.from(
      new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])
    ).filter(
      (k) =>
        !["_id", "__v", "deleted_at", "frm_status", "form_version"].includes(k)
    );
  }, [oldData, newData]);

  const formatValue = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch (_) {
        return String(val);
      }
    }
    return String(val);
  };

  const diffItems = useMemo(() => {
    return allKeys.map((key) => {
      const hasOld = oldData && Object.prototype.hasOwnProperty.call(oldData, key);
      const hasNew = newData && Object.prototype.hasOwnProperty.call(newData, key);
      const oldVal = hasOld ? oldData[key] : undefined;
      const newVal = hasNew ? newData[key] : undefined;

      let status = "unchanged";
      if (!hasOld && hasNew) {
        status = "added";
      } else if (hasOld && !hasNew) {
        status = "removed";
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        status = "modified";
      }

      const label = key
        .replace(/^.*?_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      return {
        key,
        label,
        oldVal,
        newVal,
        oldFormatted: formatValue(oldVal),
        newFormatted: formatValue(newVal),
        status,
        isChanged: status !== "unchanged",
      };
    });
  }, [allKeys, oldData, newData]);

  const filteredDiffItems = useMemo(() => {
    return diffItems.filter((item) => {
      if (filterMode === "changed" && !item.isChanged) return false;
      if (filterMode === "unchanged" && item.isChanged) return false;
      if (fieldSearch.trim()) {
        const q = fieldSearch.toLowerCase();
        const matchesKey = item.key.toLowerCase().includes(q);
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesOld = String(item.oldFormatted).toLowerCase().includes(q);
        const matchesNew = String(item.newFormatted).toLowerCase().includes(q);
        return matchesKey || matchesLabel || matchesOld || matchesNew;
      }
      return true;
    });
  }, [diffItems, filterMode, fieldSearch]);

  const changedCount = diffItems.filter((d) => d.isChanged).length;
  const unchangedCount = diffItems.filter((d) => !d.isChanged).length;

  const opType = String(data?.operation || currentLog?.operation || currentLog?.action || "UPDATE").toUpperCase();
  const getOpBadge = () => {
    if (opType.includes("INSERT") || opType.includes("CREATE")) return <Tag color="green" style={{ fontWeight: 700, borderRadius: 6, fontSize: 12 }}>INSERT / CREATE</Tag>;
    if (opType.includes("DELETE")) return <Tag color="red" style={{ fontWeight: 700, borderRadius: 6, fontSize: 12 }}>DELETE</Tag>;
    if (opType.includes("APPROV") || opType.includes("WORKFLOW")) return <Tag color="purple" style={{ fontWeight: 700, borderRadius: 6, fontSize: 12 }}>{opType}</Tag>;
    return <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6, fontSize: 12 }}>UPDATE</Tag>;
  };

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < records.length - 1;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      destroyOnHidden
      style={{ top: 20 }}
      styles={{
        header: { borderBottom: "1px solid #e2e8f0", paddingBottom: 12 },
        body: { padding: "16px 20px" },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
                fontSize: 18,
              }}
            >
              <HistoryOutlined />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Audit Log Inspection
                </span>
                {getOpBadge()}
                <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600 }}>
                  {data?.table_name || currentLog?.table_name || currentLog?.module || "Form"}
                </Tag>
              </div>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Record ID: <strong style={{ color: "#334155" }}>{data?.record_id || currentLog?.record_id || "N/A"}</strong>
              </span>
            </div>
          </div>

          {/* Previous / Next Navigator */}
          {records && records.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color="default" style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                Log {currentIndex + 1} of {records.length}
              </Tag>
              <Tooltip title="Previous Log (Left Arrow Key)">
                <Button
                  size="small"
                  icon={<LeftOutlined />}
                  disabled={!hasPrev}
                  onClick={() => onNavigate && onNavigate(currentIndex - 1)}
                  style={{ borderRadius: 6, fontWeight: 600 }}
                >
                  Previous
                </Button>
              </Tooltip>
              <Tooltip title="Next Log (Right Arrow Key)">
                <Button
                  size="small"
                  disabled={!hasNext}
                  onClick={() => onNavigate && onNavigate(currentIndex + 1)}
                  style={{ borderRadius: 6, fontWeight: 600 }}
                >
                  Next <RightOutlined />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>Loading full audit diff...</div>
        </div>
      ) : !data ? (
        <Empty description="No audit data found" />
      ) : (
        <div>
          {/* Metadata Summary Banner */}
          <Card
            size="small"
            style={{
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              marginBottom: 16,
            }}
          >
            <Row gutter={[16, 12]} align="middle">
              <Col xs={24} sm={12} md={6}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <UserOutlined style={{ color: "#3b82f6", fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      Changed By
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {data?.user_name || currentLog?.changed_by || "System"}
                    </div>
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ClockCircleOutlined style={{ color: "#f59e0b", fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      Timestamp
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {data?.created_at ? moment(data.created_at).format("DD MMM YYYY, hh:mm:ss A") : "—"}
                    </div>
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GlobalOutlined style={{ color: "#10b981", fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      IP Address
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {data?.ip_address || currentLog?.client_ip || currentLog?.ip_address || "127.0.0.1"}
                    </div>
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <LaptopOutlined style={{ color: "#8b5cf6", fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      Client App
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={data?.client_app || currentLog?.client_app || currentLog?.user_agent}
                    >
                      {data?.client_app || currentLog?.client_app || currentLog?.user_agent || "Web Browser"}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Main Diff Content Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            items={[
              {
                key: "diff",
                label: (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <DiffOutlined /> Visual Diff ({changedCount} Changed)
                  </span>
                ),
                children: (
                  <div>
                    {/* Diff Controls & Filter Bar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <Radio.Group
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        size="small"
                      >
                        <Radio.Button value="changed">
                          Only Changed ({changedCount})
                        </Radio.Button>
                        <Radio.Button value="all">
                          All Fields ({allKeys.length})
                        </Radio.Button>
                        <Radio.Button value="unchanged">
                          Unchanged ({unchangedCount})
                        </Radio.Button>
                      </Radio.Group>

                      <Input
                        size="small"
                        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                        placeholder="Search field or value..."
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        allowClear
                        style={{ width: 220, borderRadius: 6 }}
                      />
                    </div>

                    {/* Diff Table */}
                    {filteredDiffItems.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px 20px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px dashed #cbd5e1",
                        }}
                      >
                        <Empty
                          description={
                            filterMode === "changed" && changedCount === 0
                              ? "No fields were modified in this record update."
                              : "No matching fields found."
                          }
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          overflowX: "auto",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          maxHeight: 450,
                          overflowY: "auto",
                        }}
                      >
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, textAlign: "left", fontSize: 13 }}>
                          <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "#f8fafc" }}>
                            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                              <th style={{ padding: "10px 14px", fontWeight: 700, color: "#334155", width: "26%", borderBottom: "2px solid #e2e8f0" }}>
                                Field
                              </th>
                              <th style={{ padding: "10px 14px", fontWeight: 700, color: "#dc2626", width: "32%", borderBottom: "2px solid #e2e8f0", background: "#fef2f2" }}>
                                Previous / Old Value
                              </th>
                              <th style={{ padding: "10px 14px", fontWeight: 700, color: "#16a34a", width: "32%", borderBottom: "2px solid #e2e8f0", background: "#f0fdf4" }}>
                                Next / New Value
                              </th>
                              <th style={{ padding: "10px 14px", fontWeight: 700, color: "#475569", width: "10%", textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDiffItems.map((item, idx) => (
                              <tr
                                key={item.key}
                                style={{
                                  background: item.isChanged
                                    ? idx % 2 === 0 ? "#ffffff" : "#fcfcfd"
                                    : "#ffffff",
                                  borderBottom: "1px solid #f1f5f9",
                                }}
                              >
                                <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.label}</div>
                                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{item.key}</div>
                                </td>

                                <td
                                  style={{
                                    padding: "10px 14px",
                                    borderBottom: "1px solid #f1f5f9",
                                    background: item.isChanged ? "#fff1f2" : "transparent",
                                    color: item.isChanged ? "#991b1b" : "#64748b",
                                    wordBreak: "break-word",
                                    verticalAlign: "top",
                                  }}
                                >
                                  {item.oldFormatted}
                                </td>

                                <td
                                  style={{
                                    padding: "10px 14px",
                                    borderBottom: "1px solid #f1f5f9",
                                    background: item.isChanged ? "#f0fdf4" : "transparent",
                                    color: item.isChanged ? "#166534" : "#64748b",
                                    fontWeight: item.isChanged ? 600 : 400,
                                    wordBreak: "break-word",
                                    verticalAlign: "top",
                                  }}
                                >
                                  {item.newFormatted}
                                </td>

                                <td style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center", verticalAlign: "top" }}>
                                  {item.status === "modified" && (
                                    <Tag color="orange" style={{ borderRadius: 4, fontWeight: 700, fontSize: 11, margin: 0 }}>
                                      Modified
                                    </Tag>
                                  )}
                                  {item.status === "added" && (
                                    <Tag color="green" style={{ borderRadius: 4, fontWeight: 700, fontSize: 11, margin: 0 }}>
                                      Added
                                    </Tag>
                                  )}
                                  {item.status === "removed" && (
                                    <Tag color="red" style={{ borderRadius: 4, fontWeight: 700, fontSize: 11, margin: 0 }}>
                                      Removed
                                    </Tag>
                                  )}
                                  {item.status === "unchanged" && (
                                    <Tag color="default" style={{ borderRadius: 4, fontSize: 11, margin: 0 }}>
                                      Same
                                    </Tag>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "json",
                label: (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <CodeOutlined /> Raw JSON State
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#dc2626", fontSize: 13 }}>
                          Previous State (Old JSON)
                        </span>
                        <Button
                          size="small"
                          icon={copiedKey === "old" ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
                          onClick={() => handleCopy(oldData, "old")}
                        >
                          {copiedKey === "old" ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <pre
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 12,
                          maxHeight: 380,
                          overflowY: "auto",
                          margin: 0,
                        }}
                      >
                        {JSON.stringify(oldData, null, 2)}
                      </pre>
                    </Col>

                    <Col span={12}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#16a34a", fontSize: 13 }}>
                          Next State (New JSON)
                        </span>
                        <Button
                          size="small"
                          icon={copiedKey === "new" ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
                          onClick={() => handleCopy(newData, "new")}
                        >
                          {copiedKey === "new" ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <pre
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 12,
                          maxHeight: 380,
                          overflowY: "auto",
                          margin: 0,
                        }}
                      >
                        {JSON.stringify(newData, null, 2)}
                      </pre>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
