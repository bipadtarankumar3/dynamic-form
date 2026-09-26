// client/src/modules/volunteering/components/VolunteeringEventDetailModal.jsx
"use client";

import React, { useState } from "react";
import { Modal, Tabs, Tag, Button, Card, Descriptions, Progress, Avatar, Image, Empty, Divider, Rate } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  PictureOutlined,
  AuditOutlined,
  ReadOutlined,
  DollarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CompassOutlined
} from "@ant-design/icons";
import VolunteeringBudgetTable from "./VolunteeringBudgetTable";
import { APPROVAL_STATUSES, EVENT_TYPES } from "../constants/volunteeringConstants";

export default function VolunteeringEventDetailModal({
  open,
  onCancel,
  event,
  onOpenApproval,
  onOpenAttendance,
  onOpenMedia,
  onOpenClosure,
  onOpenStory
}) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!event) return null;

  const statusMeta = APPROVAL_STATUSES[event.approval_status] || APPROVAL_STATUSES.DRAFT;
  const eventTypeMeta = EVENT_TYPES.find(t => t.name.toLowerCase() === String(event.event_type || "").toLowerCase()) || {
    color: "#2563eb"
  };

  const volunteerPercent = Math.min(100, Math.round(((event.registered_count || 0) / (event.max_volunteers || 1)) * 100));

  const items = [
    {
      key: "overview",
      label: (
        <span className="flex items-center gap-1.5">
          <CalendarOutlined /> Overview & Venue
        </span>
      ),
      children: (
        <div className="space-y-4 py-2">
          <Card size="small" className="bg-slate-50/70 border-slate-200">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {event.event_id} • {event.csr_theme}
            </div>
            <div className="text-lg font-extrabold text-slate-900 mt-1">
              {event.event_name}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Part of Program: <strong className="text-blue-700">{event.program_name}</strong>
            </div>
          </Card>

          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Event Type">
              <Tag color={eventTypeMeta.color} className="font-semibold">{event.event_type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Approval Status">
              <Tag color={statusMeta.color} className="font-bold uppercase">{statusMeta.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Event Date">
              <span className="font-semibold text-slate-800">{event.event_date}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              <span>{event.start_time} - {event.end_time}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Registration Deadline">
              <span>{event.registration_deadline || "—"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Volunteer Capacity">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{event.registered_count || 0} / {event.max_volunteers || 0}</span>
                <Progress percent={volunteerPercent} size="small" style={{ width: 100 }} />
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Implementing NGO">
              <span className="font-semibold">{event.implementing_ngo || "—"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Event Coordinator">
              <span>{event.event_coordinator || "—"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Contact Person">
              <span>{event.contact_person || "—"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Target Groups">
              {Array.isArray(event.target_employee_groups)
                ? event.target_employee_groups.map((g, i) => <Tag key={i}>{g}</Tag>)
                : <span>{event.target_employee_groups || "All Employees"}</span>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Event Venue" span={2}>
              <div>
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  <EnvironmentOutlined className="text-red-500" /> {event.event_location}
                </div>
                {event.address && <div className="text-xs text-slate-500 mt-0.5">{event.address}</div>}
                <div className="text-xs text-slate-400 mt-1 flex gap-3">
                  {event.meeting_point && <span>Meeting Point: <strong>{event.meeting_point}</strong></span>}
                  {event.distance_from_office && <span>Distance: <strong>{event.distance_from_office} km</strong></span>}
                  {event.lat_lon && <span>Coordinates: <strong>{event.lat_lon}</strong></span>}
                </div>
              </div>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )
    },
    {
      key: "objectives",
      label: (
        <span className="flex items-center gap-1.5">
          <CompassOutlined /> Objectives & Scope
        </span>
      ),
      children: (
        <div className="space-y-3 py-2">
          <Card size="small" title="Core Objective" className="border-slate-200">
            <p className="text-slate-700 text-sm mb-0 leading-relaxed">{event.objective || "No objective recorded."}</p>
          </Card>
          {event.detailed_objectives && (
            <Card size="small" title="Detailed Deliverables & Target Outcomes" className="border-slate-200">
              <pre className="text-slate-700 text-xs font-sans whitespace-pre-wrap mb-0">{event.detailed_objectives}</pre>
            </Card>
          )}
        </div>
      )
    },
    {
      key: "budget",
      label: (
        <span className="flex items-center gap-1.5">
          <DollarOutlined /> Budget Breakdown
        </span>
      ),
      children: (
        <div className="py-2">
          <VolunteeringBudgetTable
            value={event.budget_items || []}
            readOnly={true}
          />
        </div>
      )
    },
    {
      key: "volunteers",
      label: (
        <span className="flex items-center gap-1.5">
          <TeamOutlined /> Volunteers ({event.registered_count || 0})
        </span>
      ),
      children: (
        <div className="py-2 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-semibold">Registered Volunteer Roster</span>
            <Button
              type="primary"
              size="small"
              icon={<TeamOutlined />}
              onClick={() => {
                onCancel();
                if (onOpenAttendance) onOpenAttendance(event);
              }}
            >
              Open Attendance & Hours Tracker
            </Button>
          </div>
          {(event.volunteers && event.volunteers.length > 0) ? (
            <div className="space-y-2">
              {event.volunteers.map((v) => (
                <div key={v.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar icon={<UserOutlined />} className="bg-blue-500" />
                    <div>
                      <div className="font-bold text-slate-800">{v.name}</div>
                      <div className="text-[11px] text-slate-400">{v.emp_id} • {v.dept}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag color={v.status === "Attended" ? "success" : "default"}>{v.status}</Tag>
                    {v.hours ? <strong className="text-blue-600">{v.hours} hrs</strong> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="No volunteers registered yet." />
          )}
        </div>
      )
    },
    {
      key: "media",
      label: (
        <span className="flex items-center gap-1.5">
          <PictureOutlined /> Media & Proof ({event.media?.length || 0})
        </span>
      ),
      children: (
        <div className="py-2 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-semibold">Event Media Submissions</span>
            <Button
              type="primary"
              size="small"
              icon={<PictureOutlined />}
              onClick={() => {
                onCancel();
                if (onOpenMedia) onOpenMedia(event);
              }}
            >
              Manage / Submit Media
            </Button>
          </div>
          {(event.media && event.media.length > 0) ? (
            <Image.PreviewGroup>
              <div className="vol-media-grid">
                {event.media.map((m) => (
                  <div key={m.id} className="vol-media-item">
                    <Image src={m.url} alt={m.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div className="vol-media-caption">{m.caption}</div>
                  </div>
                ))}
              </div>
            </Image.PreviewGroup>
          ) : (
            <Empty description="No media uploaded yet." />
          )}
        </div>
      )
    },
    {
      key: "closure",
      label: (
        <span className="flex items-center gap-1.5">
          <AuditOutlined /> Closure & Stories
        </span>
      ),
      children: (
        <div className="py-2 space-y-3">
          <div className="flex gap-2">
            <Button
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-500"
              icon={<AuditOutlined />}
              onClick={() => {
                onCancel();
                if (onOpenClosure) onOpenClosure(event);
              }}
            >
              Post-Event Closure Sign-off
            </Button>
            <Button
              type="primary"
              className="bg-purple-600 hover:bg-purple-500"
              icon={<ReadOutlined />}
              onClick={() => {
                onCancel();
                if (onOpenStory) onOpenStory(event);
              }}
            >
              Create Impact Story
            </Button>
          </div>

          {event.closure_summary && (
            <Card size="small" title="Closure Impact Summary" className="border-emerald-200 bg-emerald-50/30">
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>Beneficiaries: <strong>{event.closure_summary.actual_beneficiaries || "—"}</strong></div>
                <div>Hours Logged: <strong>{event.closure_summary.actual_hours_logged || "—"} hrs</strong></div>
                <div>Spend: <strong>₹{(event.closure_summary.actual_spend || event.total_budget || 0).toLocaleString()}</strong></div>
              </div>
              <div className="text-xs text-slate-600">
                <strong>Key Learnings: </strong> {event.closure_summary.key_learnings}
              </div>
              {event.closure_summary.rating && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-semibold">Feedback Rating:</span>
                  <Rate disabled defaultValue={event.closure_summary.rating} allowHalf style={{ fontSize: 13 }} />
                </div>
              )}
            </Card>
          )}

          {event.story && (
            <Card size="small" title="Published Impact Story" className="border-purple-200 bg-purple-50/30">
              <div className="font-bold text-slate-800 text-sm">{event.story.story_title}</div>
              <div className="text-xs text-slate-500 mt-0.5">By {event.story.author_name}</div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{event.story.story_body}</p>
            </Card>
          )}
        </div>
      )
    }
  ];

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-2">
            <CalendarOutlined className="text-blue-600 text-lg" />
            <span className="font-bold text-base">Volunteering Event Details</span>
          </div>
          <Button
            type="primary"
            size="small"
            icon={<SafetyCertificateOutlined />}
            className="bg-indigo-600 hover:bg-indigo-500 font-semibold"
            onClick={() => {
              onCancel();
              if (onOpenApproval) onOpenApproval(event);
            }}
          >
            Approval Workflow
          </Button>
        </div>
      }
      width={850}
      footer={[
        <Button key="close" type="primary" onClick={onCancel}>
          Close
        </Button>
      ]}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </Modal>
  );
}
