import React from "react";
import { Card, Input, Button, Table, Space, Collapse, Row, Col } from "antd";
import {
  TableOutlined, CheckOutlined, HolderOutlined,
  EditOutlined, DeleteOutlined, UpOutlined, DownOutlined
} from "@ant-design/icons";
import "../../database-views.css";

export default function Step3SelectFields({
  selectedFields,
  setSelectedFields,
  searchAvailableField,
  setSearchAvailableField,
  handleSelectAllBaseFields,
  draggedFieldIdx,
  setDraggedFieldIdx,
  moveSelectedField,
  collapseItems,
  activeChildConfigs,
  formatAlias,
  setActiveChildIndex,
  setCurrentStep,
  setEditingField,
  setTempAliasValue,
  setEditAliasModalOpen,
}) {
  const duplicateAliases = React.useMemo(() => {
    const counts = {};
    (selectedFields || []).forEach(f => {
      const a = (f.alias || f.field || '').trim().toLowerCase();
      if (a) counts[a] = (counts[a] || 0) + 1;
    });
    return Object.keys(counts).filter(a => counts[a] > 1);
  }, [selectedFields]);

  return (
    <div>
      <h3 className="db-step-title">Select Fields</h3>
      <p className="db-step-subtitle">
        Select the fields you want to show in this view
      </p>

      <Row gutter={24}>
        {/* LEFT PANEL: Available Fields Accordion */}
        <Col span={11}>
          <Card
            title={
              <div className="db-card-header-flex">
                <div className="db-card-header-title">
                  <TableOutlined style={{ color: "#ffffff", fontSize: 16 }} />
                  <span>Available Fields</span>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={handleSelectAllBaseFields}
                  className="db-btn-link-white"
                >
                  Select Base Fields
                </Button>
              </div>
            }
            size="small"
            className="db-card-radius"
            styles={{ body: { padding: "16px" } }}
          >
            <Input.Search
              placeholder="Search fields..."
              style={{ marginBottom: "16px" }}
              value={searchAvailableField}
              onChange={(e) => setSearchAvailableField(e.target.value)}
            />

            <div className="db-scroll-box">
              <Collapse
                defaultActiveKey={["base", "users_created_by"]}
                ghost
                expandIconPosition="end"
                items={collapseItems}
              />
            </div>
          </Card>
        </Col>

        {/* RIGHT PANEL: Selected Fields Table */}
        <Col span={13}>
          <Card
            title={
              <div className="db-card-header-flex">
                <div className="db-card-header-title">
                  <CheckOutlined style={{ color: "#ffffff", fontSize: 16 }} />
                  <span>Selected Fields ({selectedFields.length})</span>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setSelectedFields([])}
                  className="db-btn-link-danger"
                >
                  Clear All
                </Button>
              </div>
            }
            size="small"
            className="db-card-radius"
            styles={{ body: { padding: "16px" } }}
          >
            <div className="db-form-extra" style={{ marginBottom: "12px" }}>
              Drag to reorder fields
            </div>

            {duplicateAliases.length > 0 && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "#dc2626",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>⚠️ Duplicate field alias detected: <strong>"{duplicateAliases.join('", "')}"</strong>. Every column must have a unique alias.</span>
              </div>
            )}

            <div className="db-scroll-box">
              {selectedFields.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", background: "#fef2f2", border: "1px dashed #fca5a5", borderRadius: 8, color: "#ef4444", fontWeight: 600, fontSize: "13px" }}>
                  ⚠️ No fields selected yet. Please check the boxes in Available Fields on the left to add columns to this view.
                </div>
              ) : (
                <Table
                  bordered
                  className="db-selected-fields-table"
                  dataSource={selectedFields}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  onRow={(record, index) => ({
                    draggable: true,
                    onDragStart: (e) => {
                      e.dataTransfer.setData("text/plain", String(index));
                      setDraggedFieldIdx(index);
                    },
                    onDragOver: (e) => {
                      e.preventDefault();
                    },
                    onDrop: (e) => {
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                      if (!isNaN(fromIdx) && fromIdx !== index) {
                        moveSelectedField(fromIdx, index);
                      }
                      setDraggedFieldIdx(null);
                    },
                    style: {
                      cursor: "grab",
                      background: draggedFieldIdx === index ? "#eff6ff" : "inherit"
                    }
                  })}
                  columns={[
                    {
                      title: "#",
                      width: 70,
                      render: (_, __, idx) => (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <HolderOutlined style={{ color: "#64748b", cursor: "grab", fontSize: "14px" }} />
                          <span style={{ fontSize: "12px", color: "#64748b", minWidth: "16px" }}>{idx + 1}</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                            <Button
                              type="text"
                              size="small"
                              icon={<UpOutlined className="db-reorder-icon" />}
                              disabled={idx === 0}
                              onClick={(e) => { e.stopPropagation(); moveSelectedField(idx, idx - 1); }}
                              className="db-reorder-btn"
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<DownOutlined className="db-reorder-icon" />}
                              disabled={idx === selectedFields.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveSelectedField(idx, idx + 1); }}
                              className="db-reorder-btn"
                            />
                          </div>
                        </div>
                      )
                    },
                    {
                      title: "Field",
                      dataIndex: "field",
                      render: (val) => (
                        <span className="db-field-mono" style={{ fontWeight: 600, fontSize: "12px" }}>
                          {val}
                        </span>
                      )
                    },
                    {
                      title: "Source",
                      dataIndex: "table",
                      render: (src) => (
                        <span className="db-form-extra" style={{ fontFamily: "monospace" }}>
                          {src}
                        </span>
                      )
                    },
                    {
                      title: "Alias",
                      dataIndex: "alias",
                      render: (val, record) => {
                        const normalized = (val || "").trim().toLowerCase();
                        const isDuplicate = duplicateAliases.includes(normalized);
                        const isEmpty = !val || !val.trim();
                        const isError = isDuplicate || isEmpty;

                        return (
                          <div>
                            <Input
                              size="small"
                              value={val}
                              status={isError ? "error" : ""}
                              onChange={(e) => {
                                const newAlias = e.target.value;
                                setSelectedFields(prev => prev.map(f => f.id === record.id ? { ...f, alias: newAlias } : f));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                borderRadius: "6px",
                                borderColor: isError ? "#ef4444" : undefined,
                              }}
                            />
                            {isError && (
                              <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, display: "block", marginTop: "2px" }}>
                                ⚠️ {isEmpty ? "Alias is required" : "Duplicate alias"}
                              </span>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      title: "Actions",
                      width: 70,
                      render: (_, record) => (
                        <Space size="small">
                          <Button
                            icon={<EditOutlined />}
                            size="small"
                            type="text"
                            style={{ color: "#2563eb" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingField(record);
                              setTempAliasValue(record.alias || record.field);
                              setEditAliasModalOpen(true);
                            }}
                          />
                          <Button
                            icon={<DeleteOutlined />}
                            danger
                            size="small"
                            type="text"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFields(prev => prev.filter(f => f.id !== record.id));
                            }}
                          />
                        </Space>
                      )
                    }
                  ]}
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Dynamic Child Tables Summary block below */}
      {activeChildConfigs.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <Card title="Child Tables" size="small" className="db-card-radius">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeChildConfigs.map((ch, idx) => (
                <div key={ch.child_table} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
                  <div>
                    <span className="db-table-title-main">{ch.title || formatAlias(ch.child_table)}</span>
                    <span className="db-table-title-sub" style={{ marginLeft: "8px", fontFamily: "monospace", fontSize: "12px" }}>({ch.child_table})</span>
                    <div style={{ fontSize: "12px", color: "#2563eb", marginTop: "2px" }}>{ch.fields?.length || 0} fields selected</div>
                  </div>
                  <Button type="link" onClick={() => { setActiveChildIndex(idx); setCurrentStep(3); }}>
                    Configure &gt;
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
