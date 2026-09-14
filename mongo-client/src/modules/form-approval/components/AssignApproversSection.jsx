import React from "react";
import { Avatar, Button, Select } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { getInitials, roleColor } from "../utils/formApprovalHelpers";
import "../form-approval.css";

export default function AssignApproversSection({
  steps = [],
  usersByRole = {},
  usersLoading = false,
  stepUserMap = {},
  setStepUserMap,
  saving = false,
  savedAssignment = null,
  onSaveAssignments,
}) {
  return (
    <>
      <div className="fap-step-assign-wrapper">
        <div className="fap-step-assign-title">Step 1: Assign Approvers</div>
        <div className="fap-step-assign-list">
          {steps.map((step, idx) => {
            const stepNum = step.step || idx + 1;
            const roleUsers = usersByRole[step.role_id] || [];

            return (
              <div key={stepNum} className="fap-step-assign-item">
                <div
                  className="fap-step-num-badge"
                  style={{ background: roleColor(idx) }}
                >
                  {stepNum}
                </div>
                <div>
                  <div className="fap-step-assign-label">
                    Step {stepNum}:{" "}
                    <span style={{ color: roleColor(idx) }}>
                      {step.role_name || step.role || `Role #${step.role_id}`}
                    </span>
                  </div>
                  <Select
                    showSearch
                    placeholder={
                      usersLoading
                        ? "Loading…"
                        : roleUsers.length === 0
                        ? "No users for this role"
                        : `Select approver…`
                    }
                    className="fap-select-full"
                    value={stepUserMap[stepNum] || undefined}
                    onChange={(val) => setStepUserMap((prev) => ({ ...prev, [stepNum]: val }))}
                    loading={usersLoading}
                    disabled={usersLoading || roleUsers.length === 0}
                    filterOption={(input, option) =>
                      String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={roleUsers.map((u) => ({
                      value: u.id,
                      label: `${u.name}${u.email ? ` (${u.email})` : ""}`,
                    }))}
                    optionRender={(opt) => (
                      <div className="fap-user-chip">
                        <Avatar
                          size={18}
                          className="fap-user-chip-avatar"
                          style={{ background: roleColor(idx) }}
                        >
                          {getInitials(String(opt.label).split("(")[0])}
                        </Avatar>
                        <span>{opt.label}</span>
                      </div>
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Approvers button */}
      <div className="fap-save-btn-row">
        <Button
          icon={<SaveOutlined />}
          loading={saving}
          onClick={onSaveAssignments}
          disabled={steps.some((s, i) => !stepUserMap[s.step || i + 1])}
          className="fap-btn-save-approvers"
        >
          {savedAssignment ? "Update Approvers" : "Save Approvers"}
        </Button>
      </div>
    </>
  );
}
