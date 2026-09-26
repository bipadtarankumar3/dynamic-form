'use client';

import React, { useState, useEffect } from "react";
import { Drawer, Timeline, Tag, Spin, Button, Card, Typography, Empty, Space } from "antd";
import { HistoryOutlined, ClockCircleOutlined, EyeOutlined, CheckCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import { privateHttpClient } from "@/services/api/httpClient";
import NgoDetailsView from "./NgoDetailsView";

const { Text, Title } = Typography;

export default function NgoVersionHistoryModal({
  open,
  onClose,
  formSlug = "due_diligence",
  schema,
  currentVersion = 1,
  userId = null,
}) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVersions();
      setSelectedSnapshot(null);
    }
  }, [open, formSlug, userId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      let url = `ngo/due-diligence/versions?form_slug=${formSlug}`;
      if (userId) url += `&user_id=${userId}`;
      const res = await privateHttpClient.get(url);
      if (res?.data?.success) {
        setVersions(res.data.data || []);
      }
    } catch (err) {
      console.log("Failed to fetch versions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewSnapshot = async (verNum) => {
    try {
      setLoadingSnapshot(true);
      const res = await privateHttpClient.get(`ngo/due-diligence/versions/${verNum}?form_slug=${formSlug}`);
      if (res?.data?.success && res?.data?.data) {
        const snap = res.data.data;
        let snapData = snap.data;
        if (typeof snapData === "string") {
          try { snapData = JSON.parse(snapData); } catch (_) {}
        }
        if (snapData && typeof snapData === "object") {
          snapData = { ...snapData };
          Object.keys(snapData).forEach((k) => {
            if (typeof snapData[k] === "string") {
              const trimmed = snapData[k].trim();
              if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
                try { snapData[k] = JSON.parse(trimmed); } catch (_) {}
              }
            }
          });
        }
        snap.data = snapData;
        setSelectedSnapshot(snap);
      }
    } catch (err) {
      console.log("Failed to fetch version snapshot:", err.message);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HistoryOutlined style={{ color: "#15803d", fontSize: 18 }} />
          <span style={{ fontWeight: 700 }}>Due Diligence Version History</span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={selectedSnapshot ? 1050 : 680}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#64748b" }}>Loading version history...</div>
        </div>
      ) : versions.length === 0 ? (
        <Empty description="No previous versions recorded yet." />
      ) : selectedSnapshot ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Button onClick={() => setSelectedSnapshot(null)} style={{ fontWeight: 600, borderRadius: 6 }}>
              ← Back to Version List
            </Button>
            <Tag color="purple" style={{ fontWeight: 700, padding: "3px 10px" }}>
              Snapshot of Version {selectedSnapshot.version_number}
            </Tag>
          </div>
          <NgoDetailsView
            schema={schema}
            data={selectedSnapshot.data || {}}
            hasRecord={true}
          />
        </div>
      ) : (
        <Timeline
          style={{ marginTop: 16 }}
          items={versions.map((ver) => {
            const isCurrent = ver.version_number === currentVersion;
            return {
              key: ver.id,
              color: isCurrent ? "#15803d" : "#94a3b8",
              dot: isCurrent ? <CheckCircleFilled style={{ color: "#15803d", fontSize: 16 }} /> : <ClockCircleOutlined />,
              children: (
                <div
                  style={{
                    padding: "12px 16px",
                    background: isCurrent ? "#f0fdf4" : "#f8fafc",
                    border: isCurrent ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: isCurrent ? "#166534" : "#1e293b" }}>
                      Version {ver.version_number} {isCurrent && "(Current Active)"}
                    </span>
                    <Tag color={ver.status === "APPROVED" ? "success" : "processing"}>
                      {ver.status || "UNDER_REVIEW"}
                    </Tag>
                  </div>
                  <p style={{ margin: "2px 0 6px", fontSize: 12.5, color: "#64748b" }}>
                    {ver.change_summary || "Routine compliance update"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      {dayjs(ver.created_at).format("DD MMM YYYY, hh:mm A")}
                    </span>
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => viewSnapshot(ver.version_number)}
                      style={{ padding: 0, fontWeight: 600 }}
                    >
                      View Snapshot
                    </Button>
                  </div>
                </div>
              ),
            };
          })}
        />
      )}
    </Drawer>
  );
}
