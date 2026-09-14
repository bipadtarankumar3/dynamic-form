"use client";
// client/src/modules/monitoring/KpiMonitoringSection.jsx
// ============================================================
// Enhanced KPI Monitoring Tracking Section
// Loads Project KPIs from t_frm_project_project_kpis joined with
// t_frm_kpi_master, computes historical prior actuals, cumulative total,
// achievement variance, progress %, and exposes getData() for submit.
// ============================================================

import React, { forwardRef, useImperativeHandle, useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Button, Input, InputNumber, Spin, Tag, Progress, message, Empty, Card, Row, Col, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  AimOutlined,
  BarChartOutlined,
  SaveOutlined,
  ReloadOutlined,
  TrophyOutlined,
  HistoryOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";

/**
 * KpiMonitoringSection
 * @param {number|string} projectId  - The linked project ID
 * @param {number|string} monitoringId - The current monitoring record ID (only in edit mode)
 * @param {string} mode             - "add" | "edit" | "view"
 */
const KpiMonitoringSection = forwardRef(({ projectId, monitoringId, mode }, ref) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [kpiRows, setKpiRows] = useState([]);
  const [trackingMap, setTrackingMap] = useState({}); // { kpi_detail_id: { actual_value, remarks, unit } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep refs synchronized so imperative getData() always reads latest values
  const kpiRowsRef = useRef(kpiRows);
  const trackingMapRef = useRef(trackingMap);
  const projectIdRef = useRef(projectId);

  useEffect(() => { kpiRowsRef.current = kpiRows; }, [kpiRows]);
  useEffect(() => { trackingMapRef.current = trackingMap; }, [trackingMap]);
  useEffect(() => { projectIdRef.current = projectId; }, [projectId]);

  // ── Load KPI rows for the project ──────────────────────────
  const loadKpiRows = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      let url = `/monitoring/kpi-rows?project_id=${projectId}`;
      if (monitoringId) url += `&monitoring_id=${monitoringId}`;
      const res = await privateHttpClient.get(url);
      setKpiRows(res?.data?.data || []);
    } catch (err) {
      console.error("[KpiMonitoringSection] Load KPI rows error:", err);
      setKpiRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, monitoringId]);

  // ── Load existing tracking rows for current monitoring ─────────
  const loadTracking = useCallback(async () => {
    if (!monitoringId) return;
    try {
      const res = await privateHttpClient.get(`/monitoring/kpi-tracking?monitoring_id=${monitoringId}`);
      const rows = res?.data?.data || [];
      const map = {};
      rows.forEach(r => {
        const kId = r.kpi_detail_id;
        const val = parseFloat(r.actual_value);
        map[kId] = {
          actual_value: !isNaN(val) ? val : (parseFloat(r.value) || 0),
          remarks: r.remarks || "",
          unit: r.unit || ""
        };
      });
      setTrackingMap(map);
    } catch (err) {
      console.error("[KpiMonitoringSection] Load tracking error:", err);
    }
  }, [monitoringId]);

  useEffect(() => { loadKpiRows(); }, [loadKpiRows]);
  useEffect(() => { loadTracking(); }, [loadTracking]);

  // ── Handle field changes ────────────────────────────────────
  const handleChange = (kpiDetailId, field, value) => {
    setTrackingMap(prev => {
      const nextMap = {
        ...prev,
        [kpiDetailId]: {
          ...(prev[kpiDetailId] || {}),
          [field]: value
        }
      };
      trackingMapRef.current = nextMap;
      return nextMap;
    });
  };

  const getActualVal = useCallback((kId) => {
    const map = trackingMap;
    const item = map[kId] ?? map[String(kId)] ?? map[Number(kId)];
    if (item && item.actual_value !== undefined && item.actual_value !== null && item.actual_value !== "") {
      const parsed = parseFloat(item.actual_value);
      return !isNaN(parsed) ? parsed : item.actual_value;
    }
    return "";
  }, [trackingMap]);

  const getRemarksVal = useCallback((kId) => {
    const map = trackingMap;
    const item = map[kId] ?? map[String(kId)] ?? map[Number(kId)];
    return item?.remarks || "";
  }, [trackingMap]);

  // ── Calculate metrics per row ────────────────────────────────
  const getRowMetrics = useCallback((row) => {
    const kId = row.kpi_detail_id;
    const target = parseFloat(row.target_value) || 0;
    const prior = parseFloat(row.previous_actual) || 0;
    const currentInput = parseFloat(getActualVal(kId)) || 0;
    const cumulative = prior + currentInput;
    const variance = cumulative - target;
    const pct = target > 0 ? Math.min(Math.round((cumulative / target) * 100), 100) : 0;
    const exactPct = target > 0 ? Math.round((cumulative / target) * 100) : 0;

    let statusTag = { label: "Pending", color: "default", icon: null };
    if (exactPct >= 100) {
      statusTag = { label: "Achieved 🎉", color: "success", icon: <CheckCircleOutlined /> };
    } else if (exactPct >= 70) {
      statusTag = { label: "On Track 🟢", color: "processing", icon: null };
    } else if (exactPct > 0 || cumulative > 0) {
      statusTag = { label: "In Progress 🟡", color: "warning", icon: null };
    }

    return { target, prior, currentInput, cumulative, variance, pct, exactPct, statusTag };
  }, [getActualVal]);

  // ── Top Summary Statistics Card Computation ─────────────────
  const summaryStats = useMemo(() => {
    let totalTarget = 0;
    let totalPrior = 0;
    let totalCurrent = 0;

    kpiRows.forEach(row => {
      const m = getRowMetrics(row);
      totalTarget += m.target;
      totalPrior += m.prior;
      totalCurrent += m.currentInput;
    });

    const totalCumulative = totalPrior + totalCurrent;
    const overallPct = totalTarget > 0 ? Math.min(Math.round((totalCumulative / totalTarget) * 100), 100) : 0;

    return {
      count: kpiRows.length,
      totalTarget,
      totalPrior,
      totalCurrent,
      totalCumulative,
      overallPct
    };
  }, [kpiRows, getRowMetrics]);

  // ── Expose getData() for main form submit pipeline ─────────
  useImperativeHandle(ref, () => ({
    getData: async () => {
      const rows = kpiRowsRef.current || [];
      const map = trackingMapRef.current || {};
      const currentProjId = projectIdRef.current || projectId;

      const kpiPayload = rows.map(row => {
        const item = map[row.kpi_detail_id] ?? map[String(row.kpi_detail_id)] ?? map[Number(row.kpi_detail_id)];
        const val = item?.actual_value;
        const parsedVal = (val !== undefined && val !== null && val !== "") ? (parseFloat(val) || 0) : 0;
        return {
          kpi_detail_id: row.kpi_detail_id,
          kpi_name: row.kpi_name,
          target_value: row.target_value,
          actual_value: parsedVal,
          unit: row.unit || item?.unit || "",
          remarks: item?.remarks || ""
        };
      });

      return {
        valid: true,
        errors: {},
        data: {
          kpi_tracking: kpiPayload,
          project_id: currentProjId
        }
      };
    }
  }));

  // ── Save all actual values directly ────────────────────────
  const handleSave = async () => {
    if (!monitoringId) {
      messageApi.warning("Please save the monitoring record using the Submit button at the bottom first!");
      return;
    }
    const rows = kpiRowsRef.current || [];
    if (rows.length === 0) {
      messageApi.warning("No KPI rows found for this project.");
      return;
    }

    const map = trackingMapRef.current || {};
    const kpiPayload = rows.map(row => {
      const item = map[row.kpi_detail_id] ?? map[String(row.kpi_detail_id)] ?? map[Number(row.kpi_detail_id)];
      const val = item?.actual_value;
      const parsedVal = (val !== undefined && val !== null && val !== "") ? (parseFloat(val) || 0) : 0;
      return {
        kpi_detail_id: row.kpi_detail_id,
        kpi_name: row.kpi_name,
        target_value: row.target_value,
        actual_value: parsedVal,
        unit: row.unit || item?.unit || "",
        remarks: item?.remarks || ""
      };
    });

    setSaving(true);
    try {
      const res = await privateHttpClient.post("/monitoring/kpi-tracking/save", {
        monitoring_id: monitoringId,
        project_id: projectId,
        kpi_rows: kpiPayload
      });
      if (res?.data?.success) {
        messageApi.success(res?.data?.message || "KPI tracking saved successfully!");
        loadTracking();
        loadKpiRows();
      } else {
        messageApi.error(res?.data?.message || "Failed to save KPI tracking.");
      }
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Failed to save KPI tracking.");
    } finally {
      setSaving(false);
    }
  };

  const getProgressColor = (pct) => {
    if (pct >= 100) return "#16a34a"; // emerald green
    if (pct >= 70)  return "#2563eb"; // blue
    if (pct >= 40)  return "#f59e0b"; // amber
    return "#dc2626";                 // red
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{
      background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
      border: "1.5px solid #bbf7d0",
      borderRadius: 14,
      padding: "20px 22px",
      marginTop: 12,
      boxShadow: "0 4px 20px -2px rgba(16, 185, 129, 0.08)"
    }}>
      {contextHolder}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #059669, #0284c7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 8px rgba(5, 150, 105, 0.25)"
          }}>
            <BarChartOutlined style={{ color: "#fff", fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              KPI Achievement Tracking
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Loaded {kpiRows.length} KPI{kpiRows.length !== 1 ? "s" : ""} from project</span>
              {!projectId && <Tag color="orange" style={{ fontSize: 11 }}>Select a project to load KPIs</Tag>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => { loadKpiRows(); loadTracking(); }}
            disabled={loading || !projectId}
            style={{ borderRadius: 6 }}
          >
            Refresh
          </Button>
          {mode !== "view" && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              size="small"
              loading={saving}
              onClick={handleSave}
              disabled={!monitoringId || kpiRows.length === 0}
              style={{
                background: "linear-gradient(135deg, #059669, #0284c7)",
                border: "none",
                fontWeight: 600,
                borderRadius: 6
              }}
            >
              Save KPI Actuals
            </Button>
          )}
        </div>
      </div>

      {/* Top Metric Cards Summary */}
      {projectId && kpiRows.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16
        }}>
          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Configured KPIs</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>{summaryStats.count}</div>
          </div>

          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Target</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
              {summaryStats.totalTarget.toLocaleString()}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Prior Achieved</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#64748b", marginTop: 2 }}>
              {summaryStats.totalPrior.toLocaleString()}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>This Report Actual</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#059669", marginTop: 2 }}>
              {summaryStats.totalCurrent.toLocaleString()}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Overall Achievement</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: getProgressColor(summaryStats.overallPct) }}>
                {summaryStats.overallPct}%
              </div>
              <Progress
                percent={summaryStats.overallPct}
                size="small"
                showInfo={false}
                strokeColor={getProgressColor(summaryStats.overallPct)}
                style={{ flex: 1, margin: 0 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* No project selected */}
      {!projectId && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: "#94a3b8", fontSize: 13 }}>Select a project to load KPI targets</span>}
          style={{ margin: "20px 0" }}
        />
      )}

      {/* Loading state */}
      {loading && projectId && (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <Spin size="default" />
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 10 }}>Loading project KPI data...</div>
        </div>
      )}

      {/* No KPI rows configured */}
      {!loading && projectId && kpiRows.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: "#94a3b8", fontSize: 13 }}>No KPI rows configured for this project yet. Add Project KPIs in the Project form first.</span>}
          style={{ margin: "20px 0" }}
        />
      )}

      {/* KPI Data Table */}
      {!loading && kpiRows.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0", background: "#ffffff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {[
                  "#",
                  "KPI Name",
                  "Unit",
                  "Target",
                  "Prior Achieved",
                  "Current Actual",
                  "Cumulative Total",
                  "Variance / Gap",
                  "Achievement Progress",
                  "Status",
                  "Remarks"
                ].map(h => (
                  <th key={h} style={{
                    padding: "10px 12px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: "#475569",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    whiteSpace: "nowrap"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpiRows.map((row, idx) => {
                const m = getRowMetrics(row);
                const color = getProgressColor(m.pct);

                return (
                  <tr
                    key={row.kpi_detail_id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                      transition: "background 0.15s ease"
                    }}
                  >
                    {/* # */}
                    <td style={{ padding: "11px 12px", color: "#94a3b8", fontWeight: 600, width: 32 }}>
                      {idx + 1}
                    </td>

                    {/* KPI Name */}
                    <td style={{ padding: "11px 12px", minWidth: 170 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#0f172a" }}>
                        <AimOutlined style={{ color: "#0284c7", fontSize: 13 }} />
                        {row.kpi_name}
                      </div>
                      {row.kpi_category && (
                        <Tag style={{ marginTop: 4, fontSize: 10, borderRadius: 4 }} color="blue">
                          {row.kpi_category}
                        </Tag>
                      )}
                    </td>

                    {/* Unit */}
                    <td style={{ padding: "11px 12px", width: 80 }}>
                      <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                        {row.unit || "Count"}
                      </Tag>
                    </td>

                    {/* Target Value */}
                    <td style={{ padding: "11px 12px", width: 90 }}>
                      <span style={{
                        background: "#dbeafe", color: "#1d4ed8",
                        borderRadius: 6, padding: "3px 9px",
                        fontWeight: 700, fontSize: 12, display: "inline-block"
                      }}>
                        {m.target.toLocaleString()}
                      </span>
                    </td>

                    {/* Prior Achieved */}
                    <td style={{ padding: "11px 12px", width: 100 }}>
                      <span style={{
                        background: "#f1f5f9", color: "#475569",
                        borderRadius: 6, padding: "3px 9px",
                        fontWeight: 600, fontSize: 12, display: "inline-block"
                      }}>
                        {m.prior.toLocaleString()}
                      </span>
                    </td>

                    {/* Current Actual Achievement */}
                    <td style={{ padding: "11px 12px", width: 130 }}>
                      {mode === "view" ? (
                        <span style={{
                          background: "#f0fdf4", color: "#166534",
                          borderRadius: 6, padding: "4px 10px",
                          fontWeight: 700, fontSize: 13, border: "1px solid #bbf7d0",
                          display: "inline-block"
                        }}>
                          {m.currentInput.toLocaleString()}
                        </span>
                      ) : (
                        <InputNumber
                          min={0}
                          value={getActualVal(row.kpi_detail_id)}
                          onChange={val => handleChange(row.kpi_detail_id, "actual_value", val)}
                          placeholder="0"
                          style={{ width: "100%", borderRadius: 7, fontWeight: 700 }}
                          controls={false}
                          prefix={<EditOutlined style={{ color: "#059669", fontSize: 11 }} />}
                        />
                      )}
                    </td>

                    {/* Cumulative Total */}
                    <td style={{ padding: "11px 12px", width: 110 }}>
                      <span style={{
                        background: "#ecfdf5", color: "#047857",
                        borderRadius: 6, padding: "3px 9px",
                        fontWeight: 800, fontSize: 13, border: "1px solid #a7f3d0",
                        display: "inline-block"
                      }}>
                        {m.cumulative.toLocaleString()}
                      </span>
                    </td>

                    {/* Variance / Gap */}
                    <td style={{ padding: "11px 12px", width: 110 }}>
                      {m.variance >= 0 ? (
                        <Tag color="success" style={{ fontWeight: 700, fontSize: 11, borderRadius: 6 }}>
                          +{m.variance.toLocaleString()}
                        </Tag>
                      ) : (
                        <Tag color="error" style={{ fontWeight: 700, fontSize: 11, borderRadius: 6 }}>
                          {m.variance.toLocaleString()}
                        </Tag>
                      )}
                    </td>

                    {/* Progress Bar & % */}
                    <td style={{ padding: "11px 12px", minWidth: 140 }}>
                      <Progress
                        percent={m.pct}
                        size="small"
                        strokeColor={color}
                        format={p => <span style={{ color, fontWeight: 700, fontSize: 11 }}>{m.exactPct}%</span>}
                      />
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "11px 12px", width: 110 }}>
                      <Tag
                        color={m.statusTag.color}
                        icon={m.statusTag.icon}
                        style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, padding: "2px 8px" }}
                      >
                        {m.statusTag.label}
                      </Tag>
                    </td>

                    {/* Remarks */}
                    <td style={{ padding: "11px 12px", minWidth: 160 }}>
                      {mode === "view" ? (
                        <span style={{ color: "#475569", fontSize: 12 }}>
                          {getRemarksVal(row.kpi_detail_id) || "—"}
                        </span>
                      ) : (
                        <Input
                          value={getRemarksVal(row.kpi_detail_id)}
                          onChange={e => handleChange(row.kpi_detail_id, "remarks", e.target.value)}
                          placeholder="Add remarks"
                          style={{ borderRadius: 7, fontSize: 12 }}
                          size="small"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Save Hint */}
      {!monitoringId && kpiRows.length > 0 && (
        <div style={{
          marginTop: 14, padding: "10px 14px",
          background: "#fffbebf5", border: "1px solid #fde68a",
          borderRadius: 8, fontSize: 12, color: "#92400e",
          display: "flex", alignItems: "center", gap: 8
        }}>
          <InfoCircleOutlined style={{ color: "#d97706", fontSize: 14 }} />
          <span>Save the monitoring record using <b>"Save Draft"</b> or <b>"Submit Final"</b> button below — KPI actuals will be saved against this monitoring entry.</span>
        </div>
      )}
    </div>
  );
});

KpiMonitoringSection.displayName = "KpiMonitoringSection";
export default KpiMonitoringSection;
