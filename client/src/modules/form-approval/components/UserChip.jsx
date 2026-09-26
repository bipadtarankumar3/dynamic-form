import React from "react";
import { Avatar, Typography } from "antd";
import { getInitials } from "../utils/formApprovalHelpers";
import "../form-approval.css";

const { Text } = Typography;

export default function UserChip({ user, color }) {
  if (!user) return <Text type="secondary" className="fap-role-text">—</Text>;
  return (
    <div className="fap-user-chip">
      <Avatar
        size={22}
        className="fap-user-chip-avatar"
        style={{ background: color || "#6366f1" }}
      >
        {getInitials(user.name)}
      </Avatar>
      <span className="fap-user-chip-name">{user.name}</span>
      {user.email && <span className="fap-user-chip-email">({user.email})</span>}
    </div>
  );
}
