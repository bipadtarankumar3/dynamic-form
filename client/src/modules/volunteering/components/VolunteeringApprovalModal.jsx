// client/src/modules/volunteering/components/VolunteeringApprovalModal.jsx
"use client";

import React, { useState } from "react";
import { Modal, Steps, Button, Input, Tag, Card, Divider, Avatar, message, Timeline } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  RollbackOutlined,
  CommentOutlined
} from "@ant-design/icons";
import { APPROVAL_STATUSES } from "../constants/volunteeringConstants";

export default function VolunteeringApprovalModal({ open, onCancel, event, onStatusChange }) {
  const [msgApi, msgContextHolder] = message.useMessage();
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const currentStatusKey = event.approval_status || "DRAFT";
  const statusMeta = APPROVAL_STATUSES[currentStatusKey] || APPROVAL_STATUSES.DRAFT;

  const steps = [
    { title: "Event Created", description: "Coordinator" },
    { title: "Program Manager", description: "Target & Feasibility" },
    { title: "CSR Head Approval", description: "Budget & Policy" },
    { title: "Published", description: "Open for Employees" }
  ];

  const getActiveStep = () => {
    if (currentStatusKey === "DRAFT") return 0;
    if (currentStatusKey === "PENDING_PROGRAM_MGR") return 1;
    if (currentStatusKey === "PENDING_CSR_HEAD") return 2;
    if (currentStatusKey === "APPROVED" || currentStatusKey === "OPEN_FOR_REGISTRATION") return 4;
    return 1;
  };

  const handleAction = (newStatus, actionLabel) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      msgApi.success(`Event has been ${actionLabel.toLowerCase()} successfully.`);
      if (onStatusChange) {
        const historyItem = {
          step: actionLabel,
          user: "Admin / Approver",
          role: "CSR Management",
          date: new Date().toLocaleString(),
          status: actionLabel,
          comments: comments || "Approved as per CSR program guidelines."
        };
        onStatusChange(event.id, newStatus, historyItem);
      }
      setComments("");
      setTimeout(() => {
        onCancel();
      }, 400);
    }, 500);
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2">
          <SafetyCertificateOutlined className="text-blue-600 text-lg" />
          <span className="font-bold text-base">Volunteering Event Approval Workflow</span>
        </div>
      }
      width={720}
      footer={null}
    >
      {msgContextHolder}
      <div className="py-2 space-y-5">
        {/* Header Event Summary Card */}
        <Card size="small" className="bg-slate-50 border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {event.event_id} • {event.csr_theme}
              </div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {event.event_name}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Program: <span className="font-semibold text-slate-700">{event.program_name}</span> | Date: <span className="font-semibold text-slate-700">{event.event_date}</span>
              </div>
            </div>
            <Tag color={statusMeta.color} className="font-bold text-xs px-2.5 py-1 uppercase">
              {statusMeta.label}
            </Tag>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Budget: <strong className="text-slate-800">₹{(event.total_budget || 0).toLocaleString()}</strong></span>
            <span>Target Volunteers: <strong className="text-slate-800">{event.max_volunteers || 0}</strong></span>
            <span>Coordinator: <strong className="text-slate-800">{event.event_coordinator || "—"}</strong></span>
          </div>
        </Card>

        {/* Multi-Step Visual Timeline */}
        <div className="px-3">
          <Steps
            current={getActiveStep()}
            status={currentStatusKey === "REJECTED" ? "error" : "process"}
            items={steps}
          />
        </div>

        {/* Approval History / Audit Trail */}
        <div>
          <div className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
            <ClockCircleOutlined className="text-slate-400" />
            Approval Audit Trail
          </div>
          <Timeline
            items={(event.approval_history || [
              { step: "Creation", user: event.event_coordinator || "Coordinator", date: "Initial draft", comments: "Event draft initiated." }
            ]).map((h, idx) => ({
              color: h.status === "Rejected" ? "red" : "green",
              children: (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{h.step} ({h.user} - {h.role || "Reviewer"})</span>
                    <span className="text-slate-400 font-normal">{h.date}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5 mb-0 italic">"{h.comments}"</p>
                </div>
              )
            }))}
          />
        </div>

        {/* Approver Action Panel */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
            <CommentOutlined className="text-blue-600" />
            Reviewer Remarks / Feedback
          </div>
          <Input.TextArea
            rows={3}
            placeholder="Enter approval notes, modification requests, or rejection rationale..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />

          <div className="flex items-center justify-between mt-4">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleAction("REJECTED", "Rejected")}
              loading={loading}
            >
              Reject Event
            </Button>

            <div className="flex items-center gap-2">
              <Button
                icon={<RollbackOutlined />}
                onClick={() => handleAction("DRAFT", "Sent Back")}
                loading={loading}
              >
                Send Back for Edits
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={() => handleAction("APPROVED", "Approved")}
                loading={loading}
              >
                Approve & Publish Event
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
