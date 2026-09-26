// client/src/modules/volunteering/components/VolunteeringBudgetTable.jsx
"use client";

import React, { useState, useEffect } from "react";
import { Table, Button, Input, InputNumber, Select, Popconfirm, Tag, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, CalculatorOutlined } from "@ant-design/icons";
import { DEFAULT_BUDGET_HEADS, DEFAULT_BUDGET_UNITS } from "../constants/volunteeringConstants";

export default function VolunteeringBudgetTable({ value = [], onChange, readOnly = false }) {
  const [items, setItems] = useState(Array.isArray(value) && value.length > 0 ? value : [
    { id: "b_init_1", budget_head: DEFAULT_BUDGET_HEADS[0], description: "", quantity: 1, unit: "Units", rate: 0, estimated_amount: 0 }
  ]);

  useEffect(() => {
    if (Array.isArray(value) && value.length > 0) {
      setItems(value);
    }
  }, [value]);

  const handleRowChange = (index, field, val) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };

    if (field === "quantity" || field === "rate") {
      const q = Number(field === "quantity" ? val : item.quantity) || 0;
      const r = Number(field === "rate" ? val : item.rate) || 0;
      item.estimated_amount = q * r;
    }

    updated[index] = item;
    setItems(updated);
    if (onChange) onChange(updated);
  };

  const handleAddRow = () => {
    const newRow = {
      id: `b_${Date.now()}`,
      budget_head: DEFAULT_BUDGET_HEADS[0],
      description: "",
      quantity: 1,
      unit: "Units",
      rate: 0,
      estimated_amount: 0
    };
    const updated = [...items, newRow];
    setItems(updated);
    if (onChange) onChange(updated);
  };

  const handleDeleteRow = (index) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    if (onChange) onChange(updated);
  };

  const totalEstimatedAmount = items.reduce((sum, item) => sum + (Number(item.estimated_amount) || 0), 0);

  const columns = [
    {
      title: "#",
      width: 45,
      render: (_, __, i) => <span className="font-semibold text-slate-400">{i + 1}</span>
    },
    {
      title: "Budget Head",
      dataIndex: "budget_head",
      width: 220,
      render: (val, _, i) =>
        readOnly ? (
          <Tag color="blue" className="font-medium">{val}</Tag>
        ) : (
          <Select
            value={val}
            style={{ width: "100%" }}
            options={DEFAULT_BUDGET_HEADS.map(h => ({ label: h, value: h }))}
            onChange={(newVal) => handleRowChange(i, "budget_head", newVal)}
          />
        )
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (val, _, i) =>
        readOnly ? (
          <span>{val || "—"}</span>
        ) : (
          <Input
            value={val}
            placeholder="Details / items required"
            onChange={(e) => handleRowChange(i, "description", e.target.value)}
          />
        )
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 110,
      render: (val, _, i) =>
        readOnly ? (
          <span className="font-semibold">{val}</span>
        ) : (
          <InputNumber
            min={1}
            value={val}
            style={{ width: "100%" }}
            onChange={(newVal) => handleRowChange(i, "quantity", newVal)}
          />
        )
    },
    {
      title: "Unit",
      dataIndex: "unit",
      width: 120,
      render: (val, _, i) =>
        readOnly ? (
          <span>{val}</span>
        ) : (
          <Select
            value={val}
            style={{ width: "100%" }}
            options={DEFAULT_BUDGET_UNITS.map(u => ({ label: u, value: u }))}
            onChange={(newVal) => handleRowChange(i, "unit", newVal)}
          />
        )
    },
    {
      title: "Rate (₹)",
      dataIndex: "rate",
      width: 120,
      render: (val, _, i) =>
        readOnly ? (
          <span>₹{(Number(val) || 0).toLocaleString()}</span>
        ) : (
          <InputNumber
            min={0}
            value={val}
            style={{ width: "100%" }}
            onChange={(newVal) => handleRowChange(i, "rate", newVal)}
          />
        )
    },
    {
      title: "Estimated Amount (₹)",
      dataIndex: "estimated_amount",
      width: 160,
      render: (val) => (
        <span className="font-bold text-slate-800">
          ₹{(Number(val) || 0).toLocaleString()}
        </span>
      )
    },
    ...(!readOnly
      ? [
          {
            title: "",
            width: 50,
            render: (_, __, i) => (
              <Popconfirm
                title="Remove budget line?"
                disabled={items.length <= 1}
                onConfirm={() => handleDeleteRow(i)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={items.length <= 1}
                />
              </Popconfirm>
            )
          }
        ]
      : [])
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalculatorOutlined className="text-blue-600" />
          <span className="font-bold text-slate-700 text-sm">Event Budget Breakdown</span>
        </div>
        {!readOnly && (
          <Button
            type="primary"
            ghost
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddRow}
            className="font-medium"
          >
            Add more +
          </Button>
        )}
      </div>

      <Table
        dataSource={items}
        rowKey={(record, i) => record.id || `row_${i}`}
        columns={columns}
        pagination={false}
        size="small"
        className="vol-budget-table"
      />

      <div className="vol-budget-summary-card">
        <span className="text-sm font-semibold text-slate-600">
          Total Estimated Event Budget:
        </span>
        <span className="text-lg font-extrabold text-blue-700">
          ₹{totalEstimatedAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
