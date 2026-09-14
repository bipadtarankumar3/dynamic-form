import React from "react";
import {
  Card, Input, Button, Table, Tag, Space, Select,
  Alert, Form, Row, Col, Checkbox, Radio
} from "antd";
import {
  HolderOutlined, EditOutlined, DeleteOutlined,
  PlusOutlined, TableOutlined, UnorderedListOutlined,
  AppstoreOutlined, UpOutlined, DownOutlined
} from "@ant-design/icons";
import "../../database-views.css";

export default function Step4ConfigureChildTable({
  activeChildConfigs,
  activeChildIndex,
  setActiveChildIndex,
  currentActiveChild,
  currentRealChildIdx,
  childConfigs,
  setChildConfigs,
  formatAlias,
  moveChildField,
  moveSubChildField,
  setIsAddFieldModalOpen,
  setEditingField,
  setTempAliasValue,
  setEditAliasModalOpen,
}) {
  const duplicateChildAliases = React.useMemo(() => {
    const counts = {};
    (currentActiveChild?.fields || []).forEach(f => {
      const a = (f.alias || f.field || '').trim().toLowerCase();
      if (a) counts[a] = (counts[a] || 0) + 1;
    });
    return Object.keys(counts).filter(a => counts[a] > 1);
  }, [currentActiveChild?.fields]);

  return (
    <div>
      <h3 className="db-step-title">Configure Child Table</h3>
      <p className="db-step-subtitle">
        Configure the child table fields and display settings
      </p>

      {activeChildConfigs.length === 0 ? (
        <Alert type="info" message="No child tables checked in Step 2 for the selected base table." />
      ) : (
        <Row gutter={24}>
          {/* Left Side: Child Tables List */}
          <Col span={7}>
            <Card title="Child Tables" size="small" className="db-card-radius">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {activeChildConfigs.map((ch, idx) => (
                  <div
                    key={ch.child_table}
                    onClick={() => setActiveChildIndex(idx)}
                    className={activeChildIndex === idx ? "db-child-card-selected" : "db-child-card-unselected"}
                  >
                    <div className={activeChildIndex === idx ? "db-child-title-selected" : "db-child-title-unselected"}>
                      {ch.title || formatAlias(ch.child_table)}
                    </div>
                    <div className="db-child-subtitle">
                      {ch.child_table}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* Right Side: Configure Selected Child Table */}
          <Col span={17}>
            {currentActiveChild && (
              <Card
                title={
                  <div className="db-card-header-flex">
                    <span>Child Table: {currentActiveChild.title}</span>
                    <Tag color="blue" style={{ fontFamily: "monospace" }}>{currentActiveChild.child_table}</Tag>
                  </div>
                }
                size="small"
                className="db-card-radius"
              >
                {/* Child Table Name Input */}
                <Form.Item label={<span style={{ fontWeight: 600 }}>Child Table Display Title</span>} style={{ marginBottom: "16px" }}>
                  <Input
                    size="large"
                    value={currentActiveChild.title}
                    onChange={(e) => {
                      if (currentRealChildIdx !== -1) {
                        const newC = [...childConfigs];
                        newC[currentRealChildIdx].title = e.target.value;
                        setChildConfigs(newC);
                      }
                    }}
                    style={{ width: "360px" }}
                  />
                </Form.Item>

                {/* Display As Radio Toggle */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>Display as</div>
                  <Radio.Group
                    value={currentActiveChild.display_type}
                    onChange={(e) => {
                      if (currentRealChildIdx !== -1) {
                        const newC = [...childConfigs];
                        newC[currentRealChildIdx].display_type = e.target.value;
                        setChildConfigs(newC);
                      }
                    }}
                  >
                    <Radio.Button value="table"><TableOutlined /> Table</Radio.Button>
                    <Radio.Button value="accordion"><UnorderedListOutlined /> Accordion</Radio.Button>
                    <Radio.Button value="cards"><AppstoreOutlined /> Cards</Radio.Button>
                  </Radio.Group>
                </div>

                {/* Child Table Column Inclusion Options */}
                <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Checkbox
                    checked={currentActiveChild.include_full_records !== false && currentActiveChild.include_mode !== "count_only"}
                    onChange={(e) => {
                      if (currentRealChildIdx !== -1) {
                        const isChecked = e.target.checked;
                        const newC = [...childConfigs];
                        newC[currentRealChildIdx].include_full_records = isChecked;
                        newC[currentRealChildIdx].include_mode = isChecked ? "full" : "count_only";
                        setChildConfigs(newC);
                      }
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                      Include Full JSON Array Records (e.g. {currentActiveChild.child_table.replace(/^t_frm_/, "")})
                    </span>
                  </Checkbox>

                  <Checkbox
                    checked={currentActiveChild.include_count !== false}
                    onChange={(e) => {
                      if (currentRealChildIdx !== -1) {
                        const newC = [...childConfigs];
                        newC[currentRealChildIdx].include_count = e.target.checked;
                        setChildConfigs(newC);
                      }
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                      Include Generic Total Count Column (e.g. {currentActiveChild.child_table.replace(/^t_frm_/, "")}_count)
                    </span>
                  </Checkbox>
                </div>

                {/* Conditional Status Counts Configurator */}
                <Card
                  size="small"
                  className="db-status-count-card"
                  title={
                    <div className="db-card-header-flex">
                      <span style={{ fontWeight: 600, fontSize: "13px" }}>Conditional Status Counts (e.g. Approved Count, Draft Count)</span>
                      <Button
                        type="link"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          if (currentRealChildIdx !== -1) {
                            const newC = [...childConfigs];
                            const conds = newC[currentRealChildIdx].status_counts || [];
                            const newCountItem = {
                              column: "status",
                              value: "approved",
                              alias: `${currentActiveChild.child_table.replace(/^t_frm_/, "")}_approved_count`
                            };
                            newC[currentRealChildIdx].status_counts = [...conds, newCountItem];
                            setChildConfigs(newC);
                          }
                        }}
                      >
                        + Add Status Count Filter
                      </Button>
                    </div>
                  }
                >
                  {(currentActiveChild.status_counts || []).length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      No status count filters defined. Click &quot;+ Add Status Count Filter&quot; above to add conditional counts (e.g. status = approved, status = draft).
                    </div>
                  ) : (
                    (currentActiveChild.status_counts || []).map((sc, scIdx) => (
                      <Row gutter={12} key={scIdx} style={{ marginBottom: "8px", alignItems: "center" }}>
                        <Col span={6}>
                          <Select
                            size="small"
                            placeholder="Select Column"
                            value={sc.column || "status"}
                            onChange={(val) => {
                              if (currentRealChildIdx !== -1) {
                                const newC = [...childConfigs];
                                newC[currentRealChildIdx].status_counts[scIdx].column = val;
                                setChildConfigs(newC);
                              }
                            }}
                            options={(currentActiveChild.all_columns && currentActiveChild.all_columns.length > 0
                              ? currentActiveChild.all_columns
                              : (currentActiveChild.fields || []).map(f => ({ column_name: f.field }))
                            ).map(c => ({
                              label: c.column_name,
                              value: c.column_name
                            }))}
                            style={{ width: "100%" }}
                          />
                        </Col>
                        <Col span={1} style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                          =
                        </Col>
                        <Col span={6}>
                          <Input
                            size="small"
                            placeholder="Value (approved)"
                            value={sc.value}
                            onChange={(e) => {
                              if (currentRealChildIdx !== -1) {
                                const val = e.target.value;
                                const newC = [...childConfigs];
                                newC[currentRealChildIdx].status_counts[scIdx].value = val;
                                const suggestedAlias = `${currentActiveChild.child_table.replace(/^t_frm_/, "")}_${val.toLowerCase().replace(/[^a-z0-9_]+/g, "_")}_count`;
                                newC[currentRealChildIdx].status_counts[scIdx].alias = suggestedAlias;
                                setChildConfigs(newC);
                              }
                            }}
                          />
                        </Col>
                        <Col span={9}>
                          <Input
                            size="small"
                            placeholder="Column Alias in View"
                            value={sc.alias}
                            onChange={(e) => {
                              if (currentRealChildIdx !== -1) {
                                const newC = [...childConfigs];
                                newC[currentRealChildIdx].status_counts[scIdx].alias = e.target.value;
                                setChildConfigs(newC);
                              }
                            }}
                          />
                        </Col>
                        <Col span={2}>
                          <Button
                            icon={<DeleteOutlined />}
                            danger
                            size="small"
                            type="text"
                            onClick={() => {
                              if (currentRealChildIdx !== -1) {
                                const newC = [...childConfigs];
                                newC[currentRealChildIdx].status_counts.splice(scIdx, 1);
                                setChildConfigs(newC);
                              }
                            }}
                          />
                        </Col>
                      </Row>
                    ))
                  )}
                </Card>

                {/* Connected Master Lookup Banner */}
                {(currentActiveChild.child_masters || []).length > 0 && (
                  <div className="db-master-lookup-box">
                    <strong style={{ color: "#334155" }}>🔗 Connected Master Lookup Tables:</strong>
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                      {currentActiveChild.child_masters.map((m, mIdx) => (
                        <Tag key={mIdx} color="purple" style={{ margin: 0 }}>
                          <strong>{m.target_table}</strong> (linked via <code>{m.source_column}</code>)
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Child Fields Table */}
                <Table
                  dataSource={currentActiveChild.fields}
                  rowKey={(record) => `${record.source_table || 'child'}_${record.source_column || 'main'}_${record.field}`}
                  pagination={false}
                  size="small"
                  onRow={(record, index) => ({
                    draggable: true,
                    onDragStart: (e) => {
                      e.dataTransfer.setData("text/plain", String(index));
                    },
                    onDragOver: (e) => {
                      e.preventDefault();
                    },
                    onDrop: (e) => {
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                      if (!isNaN(fromIdx) && fromIdx !== index) {
                        moveChildField(fromIdx, index);
                      }
                    },
                    style: { cursor: "grab" }
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
                              onClick={(e) => { e.stopPropagation(); moveChildField(idx, idx - 1); }}
                              className="db-reorder-btn"
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<DownOutlined className="db-reorder-icon" />}
                              disabled={idx === (currentActiveChild.fields || []).length - 1}
                              onClick={(e) => { e.stopPropagation(); moveChildField(idx, idx + 1); }}
                              className="db-reorder-btn"
                            />
                          </div>
                        </div>
                      )
                    },
                    {
                      title: "Field",
                      dataIndex: "field",
                      render: (val, record) => {
                        const isMasterJoin = record.source_table && record.source_table !== currentActiveChild.child_table;
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: isMasterJoin ? "#7c3aed" : "#1e40af" }}>
                              {val}
                            </span>
                            {isMasterJoin ? (
                              <Tag color="purple" style={{ fontSize: "10px", margin: 0, borderRadius: "4px" }}>
                                Master JOIN ({record.source_table})
                              </Tag>
                            ) : (
                              <Tag color="blue" style={{ fontSize: "10px", margin: 0, borderRadius: "4px" }}>
                                Child Field
                              </Tag>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      title: "Label",
                      dataIndex: "alias",
                      render: (val, record) => {
                        const normalized = (val || "").trim().toLowerCase();
                        const isDuplicate = duplicateChildAliases.includes(normalized);
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
                                const realChildIdx = childConfigs.findIndex(c => c.child_table === currentActiveChild.child_table);
                                if (realChildIdx !== -1) {
                                  const newConfigs = [...childConfigs];
                                  newConfigs[realChildIdx].fields = newConfigs[realChildIdx].fields.map(f =>
                                    f.field === record.field ? { ...f, alias: newAlias } : f
                                  );
                                  setChildConfigs(newConfigs);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                borderRadius: "6px",
                                borderColor: isError ? "#ef4444" : undefined,
                              }}
                            />
                            {isError && (
                              <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 600, display: "block", marginTop: "2px" }}>
                                ⚠️ {isEmpty ? "Label is required" : "Duplicate label"}
                              </span>
                            )}
                          </div>
                        );
                      }
                    },
                    {
                      title: "Width",
                      dataIndex: "width",
                      width: 120,
                      render: (w, record) => (
                        <Select
                          size="small"
                          value={w || "30%"}
                          onChange={(val) => {
                            const realChildIdx = childConfigs.findIndex(c => c.child_table === currentActiveChild.child_table);
                            if (realChildIdx !== -1) {
                              const newConfigs = [...childConfigs];
                              newConfigs[realChildIdx].fields = newConfigs[realChildIdx].fields.map(f =>
                                f.field === record.field ? { ...f, width: val } : f
                              );
                              setChildConfigs(newConfigs);
                            }
                          }}
                          options={[
                            { label: "20%", value: "20%" },
                            { label: "30%", value: "30%" },
                            { label: "40%", value: "40%" },
                            { label: "50%", value: "50%" }
                          ]}
                        />
                      )
                    },
                    {
                      title: "Actions",
                      width: 80,
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
                              const realChildIdx = childConfigs.findIndex(c => c.child_table === currentActiveChild.child_table);
                              if (realChildIdx !== -1) {
                                const newConfigs = [...childConfigs];
                                newConfigs[realChildIdx].fields = newConfigs[realChildIdx].fields.filter(f => f.field !== record.field);
                                setChildConfigs(newConfigs);
                              }
                            }}
                          />
                        </Space>
                      )
                    }
                  ]}
                />

                {/* Add Field Button */}
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => setIsAddFieldModalOpen(true)}
                  style={{ marginTop: "12px", fontWeight: 600 }}
                >
                  + Add Field
                </Button>

                {/* Sort Controls */}
                <Row gutter={16} style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ fontWeight: 600 }}>Sort By</span>}>
                      <Select
                        value={currentActiveChild.sort_by}
                        onChange={(val) => {
                          const newC = [...childConfigs];
                          newC[activeChildIndex].sort_by = val;
                          setChildConfigs(newC);
                        }}
                        options={(currentActiveChild.all_columns || []).map(c => ({
                          label: c.column_name,
                          value: c.column_name
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ fontWeight: 600 }}>Sort Order</span>}>
                      <Select
                        value={currentActiveChild.sort_order || "DESC"}
                        onChange={(val) => {
                          const newC = [...childConfigs];
                          newC[activeChildIndex].sort_order = val;
                          setChildConfigs(newC);
                        }}
                        options={[
                          { label: "Desc", value: "DESC" },
                          { label: "Asc", value: "ASC" }
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Level 2 Sub-Children (Grandchildren) Config Card */}
                {(currentActiveChild.sub_children || []).length > 0 && (
                  <div className="db-subchild-box">
                    <h4 className="db-subchild-title">
                      Nested Sub-Child Tables (Level 2 Grandchildren)
                    </h4>
                    {(currentActiveChild.sub_children || []).map((sc, scIdx) => (
                      <Card
                        key={scIdx}
                        size="small"
                        title={
                          <div className="db-card-header-flex">
                            <span className="db-table-title-cyan">
                              Sub-Child: {sc.child_table}
                            </span>
                            <Tag color="cyan" style={{ fontFamily: "monospace" }}>{sc.child_table}</Tag>
                          </div>
                        }
                        className="db-subchild-card"
                      >
                        <div className="db-subchild-link">
                          Foreign Key link: <code>{sc.child_foreign_key} &rarr; {currentActiveChild.child_table}.id</code>
                        </div>

                        <Table
                          dataSource={sc.fields || (sc.columns || []).map(c => ({ field: c.column_name, alias: formatAlias(c.column_name), type: c.data_type }))}
                          rowKey={(record) => `${record.source_table || 'sub'}_${record.field || record.column_name}`}
                          pagination={false}
                          size="small"
                          onRow={(record, sIndex) => ({
                            draggable: true,
                            onDragStart: (e) => {
                              e.dataTransfer.setData("text/plain", String(sIndex));
                            },
                            onDragOver: (e) => {
                              e.preventDefault();
                            },
                            onDrop: (e) => {
                              e.preventDefault();
                              const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                              if (!isNaN(fromIdx) && fromIdx !== sIndex) {
                                moveSubChildField(activeChildIndex, scIdx, fromIdx, sIndex);
                              }
                            },
                            style: { cursor: "grab" }
                          })}
                          columns={[
                            {
                              title: "#",
                              width: 70,
                              render: (_, __, sIdx) => (
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <HolderOutlined style={{ color: "#0e7490", cursor: "grab", fontSize: "14px" }} />
                                  <span style={{ fontSize: "12px", color: "#64748b", minWidth: "16px" }}>{sIdx + 1}</span>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                    <Button
                                      type="text"
                                      size="small"
                                      disabled={sIdx === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveSubChildField(activeChildIndex, scIdx, sIdx, sIdx - 1);
                                      }}
                                      className="db-reorder-sub-btn"
                                    >
                                      ▲
                                    </Button>
                                    <Button
                                      type="text"
                                      size="small"
                                      disabled={sIdx === (sc.fields || sc.columns || []).length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveSubChildField(activeChildIndex, scIdx, sIdx, sIdx + 1);
                                      }}
                                      className="db-reorder-sub-btn"
                                    >
                                      ▼
                                    </Button>
                                  </div>
                                </div>
                              )
                            },
                            {
                              title: "Sub-Child Field",
                              dataIndex: "field",
                              render: (val, record) => (
                                <span className="db-field-mono-cyan" style={{ fontWeight: 700 }}>
                                  {val || record.column_name}
                                </span>
                              )
                            },
                            {
                              title: "Field Alias / Label",
                              dataIndex: "alias",
                              render: (val, record) => (
                                <Input
                                  size="small"
                                  value={val || formatAlias(record.field || record.column_name)}
                                  onChange={(e) => {
                                    const newAlias = e.target.value;
                                    const newC = [...childConfigs];
                                    const currentSc = newC[activeChildIndex].sub_children[scIdx];
                                    const fieldsList = currentSc.fields || (currentSc.columns || []).map(c => ({ field: c.column_name, alias: formatAlias(c.column_name), type: c.data_type }));
                                    newC[activeChildIndex].sub_children[scIdx].fields = fieldsList.map(f =>
                                      (f.field || f.column_name) === (record.field || record.column_name)
                                        ? { ...f, alias: newAlias }
                                        : f
                                    );
                                    setChildConfigs(newC);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ borderRadius: "6px" }}
                                />
                              )
                            },
                            {
                              title: "Type",
                              dataIndex: "type",
                              width: 100,
                              render: (t, record) => <Tag color="cyan">{t || record.data_type}</Tag>
                            },
                            {
                              title: "Action",
                              width: 70,
                              render: (_, record) => (
                                <Button
                                  icon={<DeleteOutlined />}
                                  danger
                                  size="small"
                                  type="text"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newC = [...childConfigs];
                                    const currentSc = newC[activeChildIndex].sub_children[scIdx];
                                    const fieldsList = currentSc.fields || (currentSc.columns || []).map(c => ({ field: c.column_name, alias: formatAlias(c.column_name), type: c.data_type }));
                                    newC[activeChildIndex].sub_children[scIdx].fields = fieldsList.filter(f =>
                                      (f.field || f.column_name) !== (record.field || record.column_name)
                                    );
                                    setChildConfigs(newC);
                                  }}
                                />
                              )
                            }
                          ]}
                        />
                      </Card>
                    ))}
                  </div>
                )}

              </Card>
            )}
          </Col>
        </Row>
      )}
    </div>
  );
}
