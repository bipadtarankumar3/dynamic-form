"use client";
import React from "react";
import { Card, Space, Table, Tag } from "antd";
import { ApartmentOutlined, UserOutlined } from "@ant-design/icons";
import { decodeOp, getRoleLabel } from "../../utils/approvalPathHelpers";

export const FlowMatrixRulesTable = ({
  rulesList = [],
  selectedRuleIndex = 0,
  onSelectRule,
  roles = [],
  dynamicLevelColumns = [],
}) => {
  return (
    <Card
      className="approval-card-main"
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ApartmentOutlined style={{ color: "#9333ea", fontSize: "18px" }} />
            <span style={{ fontWeight: 800, fontSize: "15px", color: "#1e293b" }}>
              Full Pipeline Architecture & Branch Routing Matrix
            </span>
          </div>
          <Tag color="purple" style={{ fontWeight: 800, borderRadius: 6, margin: 0 }}>
            {rulesList.length} Branch Routing Paths
          </Tag>
        </div>
      }
    >
      <Table
        dataSource={rulesList.map((r, i) => ({ ...r, _key: `flow_rule_${i}`, idx: i }))}
        rowKey="_key"
        pagination={false}
        bordered
        scroll={{ x: 900 }}
        rowClassName={(record) =>
          record.idx === selectedRuleIndex ? "matrix-condition-row" : "matrix-row-hover"
        }
        onRow={(record) => ({
          onClick: () => onSelectRule(record.idx),
          style: { cursor: "pointer" },
        })}
        columns={[
          {
            title: "#",
            width: 48,
            align: "center",
            render: (_, __, i) => <strong style={{ color: "#64748b" }}>{i + 1}</strong>,
          },
          {
            title: "Matrix Path / Rule Tier",
            dataIndex: "rule_name",
            width: 180,
            render: (v, r) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ color: "#1e293b", fontSize: "13px" }}>{v}</strong>
                {r.idx === selectedRuleIndex && (
                  <Tag
                    color="purple"
                    style={{ fontSize: "10px", borderRadius: 4, fontWeight: 700, margin: 0 }}
                  >
                    Inspecting
                  </Tag>
                )}
              </div>
            ),
          },
          {
            title: "Match Criteria / Conditions",
            dataIndex: "conditions",
            width: 250,
            render: (conds) => {
              if (!conds || conds.length === 0) return <Tag color="default">All Submissions</Tag>;
              return (
                <Space size={4} wrap>
                  {conds.map((c, ci) => (
                    <Tag key={ci} color="purple" style={{ fontWeight: 700, borderRadius: 4 }}>
                      {c.field} {decodeOp(c.operator)} {c.value_label || c.value}
                    </Tag>
                  ))}
                </Space>
              );
            },
          },
          {
            title: "Initiator",
            dataIndex: "initiator_roles",
            width: 170,
            render: (inits) => {
              if (!inits || inits.length === 0) return <Tag color="cyan">Any Role</Tag>;
              return (
                <Space size={3} wrap>
                  {inits.map((rId, ri) => (
                    <Tag
                      key={ri}
                      color="cyan"
                      icon={<UserOutlined />}
                      style={{ fontWeight: 700, borderRadius: 4, fontSize: "11px" }}
                    >
                      {getRoleLabel(rId, roles)}
                    </Tag>
                  ))}
                </Space>
              );
            },
          },
          ...dynamicLevelColumns,
        ]}
      />
    </Card>
  );
};

export default FlowMatrixRulesTable;
