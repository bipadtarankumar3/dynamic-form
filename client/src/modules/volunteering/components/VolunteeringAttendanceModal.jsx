// client/src/modules/volunteering/components/VolunteeringAttendanceModal.jsx
"use client";

import React, { useState } from "react";
import { Modal, Table, Button, Tag, Input, InputNumber, Switch, message, Popconfirm, Avatar, Badge } from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PlusOutlined,
  QrcodeOutlined,
  SaveOutlined
} from "@ant-design/icons";

export default function VolunteeringAttendanceModal({ open, onCancel, event, onUpdateEvent }) {
  const [msgApi, msgContextHolder] = message.useMessage();
  const initialVolunteers = (event?.volunteers && event.volunteers.length > 0) ? event.volunteers : [
    { id: "v1", emp_id: "EMP0142", name: "Priya Nair", email: "priya.nair@company.com", dept: "Tech", status: "Attended", check_in: "07:35 AM", check_out: "11:35 AM", hours: 4.0 },
    { id: "v2", emp_id: "EMP0209", name: "Amit Joshi", email: "amit.joshi@company.com", dept: "Marketing", status: "Attended", check_in: "07:40 AM", check_out: "11:30 AM", hours: 4.0 },
    { id: "v3", emp_id: "EMP0311", name: "Sanya Roy", email: "sanya.roy@company.com", dept: "HR", status: "Registered", check_in: "", check_out: "", hours: 0 },
    { id: "v4", emp_id: "EMP0415", name: "Kunal Ghosh", email: "kunal.g@company.com", dept: "Operations", status: "Attended", check_in: "07:30 AM", check_out: "11:30 AM", hours: 4.0 },
    { id: "v5", emp_id: "EMP0519", name: "Ritu Verma", email: "ritu.v@company.com", dept: "Legal", status: "Registered", check_in: "", check_out: "", hours: 0 }
  ];

  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpId, setNewEmpId] = useState("");

  if (!event) return null;

  const totalAttended = volunteers.filter(v => v.status === "Attended").length;
  const totalHoursLogged = volunteers.reduce((acc, v) => acc + (Number(v.hours) || 0), 0);

  const toggleAttendance = (index) => {
    const updated = [...volunteers];
    const current = updated[index];
    const isAttending = current.status === "Attended";

    updated[index] = {
      ...current,
      status: isAttending ? "Registered" : "Attended",
      check_in: isAttending ? "" : "08:00 AM",
      check_out: isAttending ? "" : "12:00 PM",
      hours: isAttending ? 0 : 4.0
    };
    setVolunteers(updated);
  };

  const handleHoursChange = (index, hours) => {
    const updated = [...volunteers];
    updated[index] = { ...updated[index], hours: Number(hours) || 0 };
    setVolunteers(updated);
  };

  const handleAddWalkIn = () => {
    if (!newEmpName) {
      msgApi.error("Please enter employee name.");
      return;
    }
    const newEntry = {
      id: `v_${Date.now()}`,
      emp_id: newEmpId || `EMP${Math.floor(1000 + Math.random() * 9000)}`,
      name: newEmpName,
      email: `${newEmpName.toLowerCase().replace(/\s+/g, ".")}@company.com`,
      dept: "General",
      status: "Attended",
      check_in: "08:00 AM",
      check_out: "12:00 PM",
      hours: 4.0
    };
    setVolunteers([...volunteers, newEntry]);
    setNewEmpName("");
    setNewEmpId("");
    msgApi.success("Walk-in volunteer checked in!");
  };

  const handleSave = () => {
    if (onUpdateEvent) {
      onUpdateEvent(event.id, {
        volunteers: volunteers,
        attended_count: totalAttended
      });
    }
    msgApi.success("Attendance and volunteer hours saved successfully!");
    setTimeout(() => {
      onCancel();
    }, 400);
  };

  const columns = [
    {
      title: "Employee",
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Avatar icon={<UserOutlined />} className="bg-blue-600" />
          <div>
            <div className="font-bold text-slate-800 text-xs">{r.name}</div>
            <div className="text-[11px] text-slate-400">{r.emp_id} • {r.dept}</div>
          </div>
        </div>
      )
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (st) => (
        <Tag color={st === "Attended" ? "success" : "default"} className="font-semibold text-xs">
          {st}
        </Tag>
      )
    },
    {
      title: "Check-in",
      dataIndex: "check_in",
      render: (val) => <span className="text-xs text-slate-600">{val || "—"}</span>
    },
    {
      title: "Check-out",
      dataIndex: "check_out",
      render: (val) => <span className="text-xs text-slate-600">{val || "—"}</span>
    },
    {
      title: "Hours Logged",
      render: (_, r, idx) => (
        <InputNumber
          min={0}
          max={24}
          step={0.5}
          value={r.hours}
          size="small"
          disabled={r.status !== "Attended"}
          onChange={(val) => handleHoursChange(idx, val)}
          style={{ width: 80 }}
        />
      )
    },
    {
      title: "Mark Attendance",
      align: "center",
      render: (_, r, idx) => (
        <Switch
          checked={r.status === "Attended"}
          onChange={() => toggleAttendance(idx)}
          checkedChildren="Present"
          unCheckedChildren="Absent"
        />
      )
    }
  ];

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2">
          <ClockCircleOutlined className="text-blue-600 text-lg" />
          <span className="font-bold text-base">Attendance & Time Tracking</span>
        </div>
      }
      width={800}
      footer={[
        <Button key="close" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          className="bg-blue-600"
        >
          Save Attendance ({totalAttended} Present)
        </Button>
      ]}
    >
      {msgContextHolder}
      <div className="space-y-4 py-2">
        {/* KPI Banner */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-center">
            <div className="text-xs text-slate-500 font-medium">Total Registered</div>
            <div className="text-lg font-bold text-slate-800">{volunteers.length}</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <div className="text-xs text-emerald-600 font-medium">Attended / Present</div>
            <div className="text-lg font-bold text-emerald-700">{totalAttended}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-blue-600 font-medium">Total Volunteer Hours</div>
            <div className="text-lg font-bold text-blue-700">{totalHoursLogged.toFixed(1)} hrs</div>
          </div>
        </div>

        {/* Walk-in Add row */}
        <div className="flex items-center gap-2 p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
          <span className="text-xs font-bold text-blue-900 whitespace-nowrap">Add Walk-in:</span>
          <Input
            size="small"
            placeholder="Employee Name"
            value={newEmpName}
            onChange={(e) => setNewEmpName(e.target.value)}
            style={{ width: 180 }}
          />
          <Input
            size="small"
            placeholder="Emp ID (Optional)"
            value={newEmpId}
            onChange={(e) => setNewEmpId(e.target.value)}
            style={{ width: 140 }}
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddWalkIn}
          >
            Check-in Walk-in
          </Button>
        </div>

        {/* Volunteers Table */}
        <Table
          dataSource={volunteers}
          rowKey="id"
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ y: 280 }}
        />
      </div>
    </Modal>
  );
}
