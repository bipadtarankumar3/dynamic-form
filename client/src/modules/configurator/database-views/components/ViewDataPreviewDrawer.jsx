import React from "react";
import { Drawer, Alert, Table, Tag, Collapse, Row, Col, Spin } from "antd";
import { EyeOutlined } from "@ant-design/icons";

export default function ViewDataPreviewDrawer({ open, onClose, loading, previewData }) {
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
    <Drawer
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <EyeOutlined style={{ color: "#2563eb" }} />
          <span>PostgreSQL View Data Preview: <b>public.{previewData.view_name}</b></span>
        </div>
      }
      open={open}
      onClose={onClose}
      width="85%"
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}><Spin size="large" /></div>
      ) : (
        <div>
          <Alert
            type="info"
            showIcon
            message={`Displaying top ${previewData.data?.length || 0} real records directly queried from PostgreSQL database view public.${previewData.view_name}.`}
            style={{ marginBottom: "16px" }}
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
                if (childKeys.length === 0) return <span style={{ color: "#94a3b8" }}>No child records</span>;

                const viewConfig = record.configuration_json || previewData.configuration_json || {};
                const childTableConfigs = viewConfig.child_tables || [];

                return (
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
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
                        const firstItemKeys = Object.keys(firstItem);
                        matchCfg.fields.forEach(f => {
                          const matchedKey = firstItemKeys.find(k =>
                            k === f.alias || k === f.field || k.toLowerCase() === (f.alias || "").toLowerCase() || k.toLowerCase() === (f.field || "").toLowerCase()
                          );
                          if (matchedKey && !columnKeys.includes(matchedKey)) {
                            columnKeys.push(matchedKey);
                          }
                        });
                        firstItemKeys.forEach(k => {
                          if (!columnKeys.includes(k)) columnKeys.push(k);
                        });
                      } else {
                        columnKeys = Object.keys(firstItem);
                      }

                      columnKeys = columnKeys.filter(ck => !Array.isArray(firstItem[ck]));
                      const displayType = matchCfg?.display_type || "table";

                      return (
                        <div key={key} style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <h5 style={{ margin: 0, color: "#0e7490", textTransform: "capitalize", fontWeight: 700 }}>
                              Child Table: {matchCfg?.title || key} ({record[key]?.length || 0} items)
                            </h5>
                            <Tag color="cyan" style={{ textTransform: "uppercase", fontSize: "10px", fontWeight: 700 }}>
                              {displayType}
                            </Tag>
                          </div>

                          {(!record[key] || record[key].length === 0) ? (
                            <Tag>Empty array</Tag>
                          ) : displayType === "accordion" ? (
                            <Collapse
                              size="small"
                              style={{ borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1" }}
                              items={(record[key] || []).map((item, idx) => {
                                const titleVal = item.report_summary || item.report_date || item.title || item.name || `#${idx + 1}`;
                                return {
                                  key: item.id || idx,
                                  label: (
                                    <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                      {matchCfg?.title || key} #{idx + 1}: {String(titleVal).slice(0, 50)}
                                    </span>
                                  ),
                                  children: (
                                    <Row gutter={[16, 12]}>
                                      {columnKeys.map(ck => (
                                        <Col span={8} key={ck}>
                                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                                            {ck.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                          </div>
                                          <div style={{ fontSize: "13px", fontWeight: 500, color: "#0f172a", wordBreak: "break-word" }}>
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
                                    title={<span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{matchCfg?.title || key} #{idx + 1}</span>}
                                    style={{ borderRadius: "8px", border: "1px solid #cbd5e1" }}
                                  >
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                      {columnKeys.map(ck => (
                                        <div key={ck} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px" }}>
                                          <span style={{ color: "#64748b", fontWeight: 600 }}>
                                            {ck.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}:
                                          </span>
                                          <span style={{ color: "#0f172a", fontWeight: 500, textAlign: "right" }}>
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
                              expandable={{
                                expandedRowRender: (childRecord) => {
                                  const subChildKeys = Object.keys(childRecord).filter(k => Array.isArray(childRecord[k]) && k !== "_childRowKey");
                                  if (subChildKeys.length === 0) return <span style={{ color: "#94a3b8", fontSize: "12px" }}>No sub-child records</span>;

                                  return (
                                    <div style={{ padding: "10px 14px", background: "#f0fdfa", borderRadius: "8px", border: "1px solid #99f6e4" }}>
                                      {subChildKeys.map(scKey => {
                                        const subData = childRecord[scKey] || [];
                                        const subFirst = subData[0] || {};
                                        const subCols = Object.keys(subFirst).filter(k => !Array.isArray(subFirst[k]) && k !== "_subRowKey");

                                        return (
                                          <div key={scKey} style={{ marginBottom: "10px" }}>
                                            <div style={{ fontWeight: 700, color: "#0e7490", fontSize: "12px", marginBottom: "6px" }}>
                                              Sub-Child Table: {scKey.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} ({subData.length} items)
                                            </div>
                                            {subData.length === 0 ? (
                                              <Tag>No records</Tag>
                                            ) : (
                                              <Table
                                                dataSource={subData.map((sItem, sIdx) => ({ ...sItem, _subRowKey: sItem.id || `sub_${sIdx}` }))}
                                                rowKey="_subRowKey"
                                                size="small"
                                                pagination={false}
                                                columns={subCols.map(sCk => ({
                                                  title: sCk.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                                                  dataIndex: sCk,
                                                  key: sCk,
                                                  render: (val) => formatVal(val)
                                                }))}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                },
                                rowExpandable: (childRecord) => Object.keys(childRecord).some(k => Array.isArray(childRecord[k]) && childRecord[k].length > 0)
                              }}
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
  );
}
