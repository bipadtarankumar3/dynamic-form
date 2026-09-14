import React from "react";
import { Card, Button, Table, Tag, Alert, Space, Row, Col } from "antd";
import { EditOutlined, CheckOutlined } from "@ant-design/icons";
import "../../database-views.css";

export default function Step6PreviewView({
  viewInfo,
  selectedFields,
  activeChildConfigs,
  formatAlias,
  loading,
  handleCreateView,
  setCurrentStep,
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h3 className="db-step-title" style={{ margin: 0 }}>
            Preview: {viewInfo.view_name || "Database View"}
          </h3>
          <span className="db-form-extra" style={{ display: "block", marginTop: "2px" }}>
            This is how the data will appear in public.{viewInfo.database_view_name || "v_name"}
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
            loading={loading}
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

      <Card title={viewInfo.view_name || "View Details"} size="small" className="db-card-radius" style={{ marginBottom: "20px" }}>
        <Row gutter={[24, 16]}>
          {selectedFields.length === 0 ? (
            <Col span={24}>
              <Alert type="warning" message="No fields selected for this view." />
            </Col>
          ) : (
            selectedFields.slice(0, 8).map((f) => (
              <Col span={8} key={f.id}>
                <div className="db-form-extra">{f.alias}</div>
                <div style={{ fontWeight: 700, color: "#1e293b" }}>Sample {f.alias}</div>
              </Col>
            ))
          )}
        </Row>
      </Card>

      {activeChildConfigs.map((ch) => (
        <Card
          key={ch.child_table}
          title={
            <div className="db-card-header-flex">
              <span>{ch.title || ch.child_table}</span>
              {(ch.sub_children || []).length > 0 && (
                <Tag color="cyan">Has {(ch.sub_children || []).length} Sub-Child Table(s)</Tag>
              )}
            </div>
          }
          size="small"
          className="db-card-radius"
          style={{ marginBottom: "16px" }}
        >
          <Table
            dataSource={[
              { id: 1, sample_field: "Sample Entry 1" },
              { id: 2, sample_field: "Sample Entry 2" }
            ]}
            rowKey="id"
            pagination={false}
            size="small"
            expandable={(ch.sub_children || []).length > 0 ? {
              expandedRowRender: () => (
                <div style={{ background: "#f0fdfa", padding: "14px 16px", borderRadius: "8px", border: "1px solid #99f6e4" }}>
                  <h5 style={{ margin: "0 0 8px 0", color: "#0f766e", fontWeight: 700, fontSize: "13px" }}>
                    Nested Sub-Child Records:
                  </h5>
                  {(ch.sub_children || []).map(sc => (
                    <div key={sc.child_table} style={{ marginBottom: "10px" }}>
                      <div className="db-table-title-cyan" style={{ fontSize: "12px", marginBottom: "6px" }}>
                        {formatAlias(sc.child_table)} ({sc.child_table})
                      </div>
                      <Table
                        dataSource={[
                          { id: 101, sample_val: "Sample Sub-Child Record 1" },
                          { id: 102, sample_val: "Sample Sub-Child Record 2" }
                        ]}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: "#", render: (_, __, sIdx) => sIdx + 1, width: 35 },
                          ...((sc.fields || sc.columns || []).map(f => ({
                            title: f.alias || formatAlias(f.field || f.column_name),
                            key: f.field || f.column_name || f.alias,
                            render: () => <span style={{ fontWeight: 600 }}>Sample {f.alias || formatAlias(f.field || f.column_name)}</span>
                          })))
                        ]}
                      />
                    </div>
                  ))}
                </div>
              ),
              defaultExpandedRowKeys: [1]
            } : undefined}
            columns={[
              { title: "#", render: (_, __, idx) => idx + 1, width: 40 },
              ...(ch.fields || []).map(f => ({
                title: f.alias || f.field,
                key: f.field || f.alias,
                render: () => <span style={{ fontWeight: 600 }}>Sample {f.alias || f.field}</span>
              }))
            ]}
          />
        </Card>
      ))}
    </div>
  );
}
