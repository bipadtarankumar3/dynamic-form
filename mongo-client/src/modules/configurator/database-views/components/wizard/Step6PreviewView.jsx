import React, { useState, useEffect } from "react";
import { Card, Button, Table, Tag, Alert, Space, Typography, Spin, Empty, Tooltip } from "antd";
import { EditOutlined, CheckOutlined, ReloadOutlined, DatabaseOutlined, TableOutlined } from "@ant-design/icons";
import { privateHttpClient } from "@/services/api/httpClient";
import "../../database-views.css";

const { Text } = Typography;

export default function Step6PreviewView({
  viewInfo,
  selectedFields = [],
  activeChildConfigs = [],
  formatAlias,
  loading: parentLoading,
  handleCreateView,
  setCurrentStep,
  buildConfigObject,
}) {
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const fetchLivePreview = async () => {
    if (!buildConfigObject) return;
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const configObj = buildConfigObject();
      const res = await privateHttpClient.post("configurator/database-views/preview-pipeline", configObj);
      if (res.data?.success) {
        setPreviewData(res.data.data || []);
      } else {
        setPreviewError(res.data?.message || "Failed to load live preview");
      }
    } catch (err) {
      console.warn("Live preview fetch notice:", err);
      setPreviewError(err.response?.data?.message || "Unable to fetch live database records for preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePreview();
  }, []);

  // Build columns dynamically for the base view based on selectedFields
  const columns = selectedFields.map((f, idx) => {
    const colKey = f.alias || f.field;
    return {
      title: (
        <div style={{ fontWeight: 600 }}>
          <span>{f.alias || formatAlias(f.field)}</span>
          {f.table && f.table !== viewInfo.base_table && (
            <Tag color="blue" style={{ fontSize: "10px", marginLeft: "6px", lineHeight: "16px", padding: "0 4px" }}>
              {f.table}
            </Tag>
          )}
        </div>
      ),
      dataIndex: colKey,
      key: colKey || `col_${idx}`,
      ellipsis: true,
      render: (val, record) => {
        // In case dataIndex uses alias vs original field
        const actualVal = val !== undefined ? val : record[f.field];
        if (actualVal === null || actualVal === undefined || actualVal === "") {
          return <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>;
        }
        if (typeof actualVal === "boolean") {
          return <Tag color={actualVal ? "green" : "default"}>{actualVal ? "Yes" : "No"}</Tag>;
        }
        if (typeof actualVal === "object") {
          return <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{JSON.stringify(actualVal)}</span>;
        }
        return <span style={{ fontWeight: 500, color: "#1e293b" }}>{String(actualVal)}</span>;
      },
    };
  });

  return (
    <div>
      {/* Step Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h3 className="db-step-title" style={{ margin: 0 }}>
            Preview: {viewInfo.view_name || "Database View"}
          </h3>
          <span className="db-form-extra" style={{ display: "block", marginTop: "2px" }}>
            This is how the data will appear in MongoDB view <Tag color="geekblue">public.{viewInfo.database_view_name || "v_name"}</Tag>
          </span>
        </div>
        <Space size="middle">
          <Button
            className="db-btn-edit-view"
            icon={<EditOutlined />}
            onClick={() => setCurrentStep(0)}
          >
            Edit View
          </Button>
          <Button
            type="primary"
            className="db-wizard-publish-btn"
            icon={<CheckOutlined />}
            loading={parentLoading}
            onClick={handleCreateView}
            style={{
              height: 38,
              padding: "0 22px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Save & Exit
          </Button>
        </Space>
      </div>

      {previewError && (
        <Alert
          type="info"
          showIcon
          message="Preview Notice"
          description={previewError}
          style={{ marginBottom: "16px", borderRadius: "8px" }}
        />
      )}

      {/* Main Base Table Live Preview Card */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <DatabaseOutlined style={{ color: "#16a34a" }} />
              <span style={{ fontWeight: 700, fontSize: "15px" }}>
                {viewInfo.view_name || "Base View Records"}
              </span>
              <Tag color={previewData.length > 0 ? "green" : "default"}>
                {previewData.length} Live Record(s) Loaded
              </Tag>
            </div>
            <Tooltip title="Reload preview from database">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={previewLoading}
                onClick={fetchLivePreview}
                style={{ borderRadius: "6px" }}
              >
                Refresh Data
              </Button>
            </Tooltip>
          </div>
        }
        size="small"
        className="db-card-radius"
        style={{ marginBottom: "20px" }}
      >
        {selectedFields.length === 0 ? (
          <Alert type="warning" message="No fields selected for this view. Please go back to Step 3 to select fields." />
        ) : (
          <Spin spinning={previewLoading}>
            <Table
              dataSource={previewData}
              columns={columns}
              rowKey={(record) => record._id || record.id || record.Id || JSON.stringify(record)}
              pagination={previewData.length > 10 ? { pageSize: 10, size: "small" } : false}
              size="middle"
              bordered
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div>
                        <Text strong style={{ color: "#475569" }}>
                          No records currently found in database for "{viewInfo.view_name || "this form"}"
                        </Text>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                          All selected fields and relationships are configured correctly. Once form records are submitted, they will automatically appear here.
                        </div>
                      </div>
                    }
                  />
                ),
              }}
              scroll={{ x: "max-content" }}
            />
          </Spin>
        )}
      </Card>

      {/* Configured Child Tables Preview */}
      {activeChildConfigs.map((ch) => (
        <Card
          key={ch.child_table}
          title={
            <div className="db-card-header-flex">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TableOutlined style={{ color: "#0891b2" }} />
                <span>{ch.title || ch.child_table}</span>
                <Tag color="cyan">Child Table</Tag>
              </div>
              {(ch.sub_children || []).length > 0 && (
                <Tag color="purple">Has {(ch.sub_children || []).length} Sub-Child Table(s)</Tag>
              )}
            </div>
          }
          size="small"
          className="db-card-radius"
          style={{ marginBottom: "16px" }}
        >
          <Table
            dataSource={[]}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
            locale={{
              emptyText: (
                <div style={{ padding: "12px 0", color: "#64748b", fontSize: "13px" }}>
                  Child table configured with {(ch.fields || []).length} field(s). Sub-records will be linked via foreign key.
                </div>
              ),
            }}
            columns={[
              { title: "#", render: (_, __, idx) => idx + 1, width: 45, align: "center" },
              ...(ch.fields || []).map((f) => ({
                title: f.alias || f.field,
                dataIndex: f.alias || f.field,
                key: f.field || f.alias,
                render: (val) => val || <span style={{ color: "#94a3b8" }}>—</span>,
              })),
            ]}
          />
        </Card>
      ))}
    </div>
  );
}
