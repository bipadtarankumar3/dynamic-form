// client/src/modules/volunteering/components/VolunteeringCalendarView.jsx
"use client";

import React, { useState } from "react";
import { Calendar, Badge, Card, Tag, Select, Input, Row, Col, Tooltip, Button, Popover } from "antd";
import dayjs from "dayjs";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { EVENT_TYPES, CSR_THEMES } from "../constants/volunteeringConstants";

export default function VolunteeringCalendarView({ events = [], onSelectEvent }) {
  const [themeFilter, setThemeFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  const filteredEvents = events.filter((e) => {
    if (themeFilter && e.csr_theme !== themeFilter) return false;
    if (typeFilter && e.event_type !== typeFilter) return false;
    return true;
  });

  const getEventsForDate = (date) => {
    const dateStr = date.format("YYYY-MM-DD");
    return filteredEvents.filter((e) => e.event_date === dateStr);
  };

  const getEventTypeMeta = (typeName) => {
    return EVENT_TYPES.find((t) => t.name.toLowerCase() === String(typeName || "").toLowerCase()) || {
      name: typeName,
      color: "#2563eb"
    };
  };

  const dateCellRender = (value) => {
    const dayEvents = getEventsForDate(value);
    if (!dayEvents || dayEvents.length === 0) return null;

    return (
      <div className="space-y-1 mt-1">
        {dayEvents.map((evt) => {
          const typeMeta = getEventTypeMeta(evt.event_type);
          const popoverContent = (
            <div className="w-64 space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-sm">{evt.event_name}</div>
              <div className="text-slate-500">{evt.program_name}</div>
              <div className="flex items-center gap-1 text-slate-600">
                <ClockCircleOutlined className="text-blue-500" />
                <span>{evt.start_time} - {evt.end_time}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600">
                <EnvironmentOutlined className="text-red-500" />
                <span className="truncate">{evt.event_location}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">
                  <TeamOutlined /> {evt.registered_count || 0}/{evt.max_volunteers || 0}
                </span>
                <Button
                  size="small"
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={() => onSelectEvent && onSelectEvent(evt)}
                >
                  View Details
                </Button>
              </div>
            </div>
          );

          return (
            <Popover key={evt.id} content={popoverContent} trigger="hover" title={null}>
              <div
                className="vol-calendar-event-cell shadow-sm"
                style={{ backgroundColor: typeMeta.color }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectEvent) onSelectEvent(evt);
                }}
              >
                <span className="truncate">{evt.event_name}</span>
              </div>
            </Popover>
          );
        })}
      </div>
    );
  };

  return (
    <div className="vol-calendar-wrapper shadow-sm">
      {/* Calendar Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-blue-600 text-lg" />
          <span className="font-bold text-slate-800 text-base">Employee Volunteering Calendar</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            allowClear
            placeholder="Filter by Theme"
            style={{ width: 190 }}
            value={themeFilter}
            onChange={setThemeFilter}
            options={CSR_THEMES.map((t) => ({ label: t, value: t }))}
          />
          <Select
            allowClear
            placeholder="Filter by Event Type"
            style={{ width: 190 }}
            value={typeFilter}
            onChange={setTypeFilter}
            options={EVENT_TYPES.map((t) => ({ label: t.name, value: t.name }))}
          />
        </div>
      </div>

      {/* Type Legend Chips */}
      <div className="flex items-center gap-2 flex-wrap pb-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Event Types:</span>
        {EVENT_TYPES.slice(0, 7).map((t) => (
          <span
            key={t.id}
            className="px-2 py-0.5 rounded text-white font-medium text-[10px]"
            style={{ backgroundColor: t.color }}
          >
            {t.name}
          </span>
        ))}
      </div>

      <Calendar cellRender={dateCellRender} />
    </div>
  );
}
