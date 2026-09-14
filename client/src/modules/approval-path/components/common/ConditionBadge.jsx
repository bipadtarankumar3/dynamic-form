"use client";
import React from "react";
import { Tag } from "antd";
import { FilterFilled } from "@ant-design/icons";
import { decodeOp } from "../../utils/approvalPathHelpers";

export const ConditionBadge = ({ condition, masterOptionsMap = {} }) => {
  if (!condition || !condition.field) return null;
  const opts = masterOptionsMap[condition.field] || [];
  const matched = opts.find((o) => String(o.value) === String(condition.value));
  const valLabel = matched ? matched.label : (condition.value_label || condition.value);
  const operator = decodeOp(condition.operator);

  return (
    <Tag
      color="purple"
      icon={<FilterFilled />}
      style={{
        fontWeight: 700,
        borderRadius: 4,
        padding: "2px 8px",
        margin: "2px 4px 2px 0",
        fontSize: "11px",
      }}
    >
      <strong>{condition.field}</strong> {operator} {valLabel || "Any"}
    </Tag>
  );
};

export default ConditionBadge;
