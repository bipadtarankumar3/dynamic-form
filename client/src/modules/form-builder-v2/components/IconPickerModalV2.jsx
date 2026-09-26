"use client";

import React, { useState, useMemo } from "react";
import { Modal, Input, Tabs, Tooltip, Button, Tag } from "antd";
import * as AntdIcons from "@ant-design/icons";
import {
  FileTextOutlined,
  FormOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  SnippetsOutlined,
  ContainerOutlined,
  CopyOutlined,
  ReadOutlined,
  BookOutlined,
  FileProtectOutlined,
  ProfileOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  SendOutlined,
  SyncOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  BranchesOutlined,
  NodeIndexOutlined,
  DashboardOutlined,
  FundOutlined,
  ScheduleOutlined,
  CalendarOutlined,
  TableOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  AuditOutlined,
  SolutionOutlined,
  DollarOutlined,
  PayCircleOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  TrophyOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  KeyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";

const EXPLICIT_ICON_MAP = {
  FileTextOutlined,
  FormOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  SnippetsOutlined,
  ContainerOutlined,
  CopyOutlined,
  ReadOutlined,
  BookOutlined,
  FileProtectOutlined,
  ProfileOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  SendOutlined,
  SyncOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  BranchesOutlined,
  NodeIndexOutlined,
  DashboardOutlined,
  FundOutlined,
  ScheduleOutlined,
  CalendarOutlined,
  TableOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  AuditOutlined,
  SolutionOutlined,
  DollarOutlined,
  PayCircleOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  TrophyOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  KeyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  UserSwitchOutlined,
};

export const getAntdIconComponent = (iconName) => {
  if (!iconName) return null;
  const name = String(iconName).trim();
  const key = name.endsWith("Outlined") || name.endsWith("Filled") || name.endsWith("TwoTone")
    ? name
    : `${name}Outlined`;

  return (
    EXPLICIT_ICON_MAP[name] ||
    EXPLICIT_ICON_MAP[key] ||
    AntdIcons[name] ||
    AntdIcons[key] ||
    AntdIcons.default?.[name] ||
    AntdIcons.default?.[key] ||
    null
  );
};

const ICON_GROUPS = [
  {
    key: "documents",
    category: "Documents & Forms",
    icons: [
      "FileTextOutlined",
      "FormOutlined",
      "FilePdfOutlined",
      "FileWordOutlined",
      "FileExcelOutlined",
      "FolderOutlined",
      "FolderOpenOutlined",
      "SnippetsOutlined",
      "ContainerOutlined",
      "CopyOutlined",
      "ReadOutlined",
      "BookOutlined",
      "FileProtectOutlined",
      "ProfileOutlined",
      "FileAddOutlined",
      "FileSearchOutlined",
    ],
  },
  {
    key: "actions",
    category: "Actions & Tasks",
    icons: [
      "EyeOutlined",
      "EditOutlined",
      "DeleteOutlined",
      "PlusOutlined",
      "CheckOutlined",
      "CloseOutlined",
      "ReloadOutlined",
      "DownloadOutlined",
      "UploadOutlined",
      "SendOutlined",
      "SyncOutlined",
      "SaveOutlined",
      "PlayCircleOutlined",
      "StopOutlined",
      "CheckCircleOutlined",
      "ExclamationCircleOutlined",
    ],
  },
  {
    key: "data",
    category: "Data & Charts",
    icons: [
      "ProjectOutlined",
      "BarChartOutlined",
      "PieChartOutlined",
      "LineChartOutlined",
      "DatabaseOutlined",
      "BranchesOutlined",
      "NodeIndexOutlined",
      "DashboardOutlined",
      "FundOutlined",
      "ScheduleOutlined",
      "CalendarOutlined",
      "TableOutlined",
      "AreaChartOutlined",
      "DotChartOutlined",
    ],
  },
  {
    key: "business",
    category: "Business & Security",
    icons: [
      "AuditOutlined",
      "SolutionOutlined",
      "DollarOutlined",
      "PayCircleOutlined",
      "BankOutlined",
      "SafetyCertificateOutlined",
      "TagOutlined",
      "TrophyOutlined",
      "LockOutlined",
      "UnlockOutlined",
      "SafetyOutlined",
      "KeyOutlined",
      "SettingOutlined",
      "TeamOutlined",
      "UserOutlined",
      "UserSwitchOutlined",
    ],
  },
  {
    key: "emojis",
    category: "Emojis",
    icons: [
      "📑", "💳", "⚠️", "🔒", "📊", "📝", "📁", "🔍", "📋", "📄",
      "🎯", "📈", "✅", "🔄", "⚙️", "📌", "🔗", "👤", "💼", "🏷️",
      "⭐", "💡", "🚀", "🔔", "✉️", "🗑️", "✏️", "👁️"
    ],
  },
];

export default function IconPickerModalV2({
  visible,
  open,
  onClose,
  onSelectIcon,
  onSelect,
  currentIcon = "",
  selectedIcon = "",
  zIndex = 1100,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [customInput, setCustomInput] = useState("");

  const isOpen = open !== undefined ? open : visible;
  const activeIcon = selectedIcon || currentIcon || "";
  const selectHandler = onSelectIcon || onSelect;

  const handleSelect = (iconName) => {
    if (selectHandler) selectHandler(iconName);
    if (onClose) onClose();
  };

  const renderIconCard = (iconName) => {
    const IconComp = getAntdIconComponent(iconName);
    const isSelected = activeIcon === iconName;

    return (
      <Tooltip key={iconName} title={iconName} placement="top">
        <button
          type="button"
          onClick={() => handleSelect(iconName)}
          className={`
            flex flex-col items-center justify-center p-2 rounded-lg transition-all cursor-pointer border
            ${isSelected
              ? "border-purple-600 bg-purple-50 text-purple-700 font-semibold ring-2 ring-purple-200"
              : "border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/50 hover:text-purple-600 hover:scale-105"
            }
          `}
          style={{ width: "84px", height: "74px" }}
        >
          <div className="h-7 flex items-center justify-center text-slate-800">
            {IconComp ? (
              <IconComp style={{ fontSize: 24, color: isSelected ? "#7c3aed" : "#1e293b" }} />
            ) : (
              <span style={{ fontSize: 24, color: "#1e293b" }}>{iconName}</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 truncate w-full text-center mt-1 font-medium">
            {IconComp ? iconName.replace("Outlined", "") : iconName}
          </span>
        </button>
      </Tooltip>
    );
  };

  const filteredGroups = useMemo(() => {
    return ICON_GROUPS.map((group) => {
      const icons = group.icons.filter((icon) =>
        icon.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...group, icons };
    }).filter((group) => group.icons.length > 0);
  }, [searchTerm]);

  const displayedGroups = useMemo(() => {
    if (activeTab === "all") return filteredGroups;
    return filteredGroups.filter((g) => g.key === activeTab);
  }, [activeTab, filteredGroups]);

  const tabItems = [
    { key: "all", label: "🔥 All Icons" },
    { key: "documents", label: "📑 Documents" },
    { key: "actions", label: "⚡ Actions" },
    { key: "data", label: "📊 Data & Charts" },
    { key: "business", label: "🛡️ Business & Roles" },
    { key: "emojis", label: "😀 Emojis" },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-6 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-800">Select Action Icon</span>
            {activeIcon && (
              <Tag color="purple" className="flex items-center gap-1 font-medium">
                Current: {activeIcon}
              </Tag>
            )}
          </div>
          <a
            href="https://ant.design/components/icon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
          >
            🔗 Browse Ant Design Icons ↗
          </a>
        </div>
      }
      open={isOpen}
      zIndex={zIndex}
      onCancel={onClose}
      footer={
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            danger
            onClick={() => handleSelect("")}
            disabled={!activeIcon}
          >
            Clear / Remove Icon
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      }
      width={720}
      centered
      destroyOnHidden
    >
      <div className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="md:col-span-2">
            <Input.Search
              placeholder="Search icons (e.g. file, edit, check, chart, audit, lock)..."
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            <Input
              placeholder="Custom Icon / Emoji"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onPressEnter={() => {
                if (customInput.trim()) handleSelect(customInput.trim());
              }}
            />
            <Button
              type="primary"
              disabled={!customInput.trim()}
              onClick={() => handleSelect(customInput.trim())}
            >
              Apply
            </Button>
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
          className="mb-2"
        />

        <div className="max-h-[380px] overflow-y-auto pr-1">
          {displayedGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-2xl mb-1">🔍</div>
              No matching icons found for &quot;{searchTerm}&quot;. Try typing custom name above.
            </div>
          ) : (
            displayedGroups.map((group) => (
              <div key={group.category} className="mb-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.category} ({group.icons.length})
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {group.icons.map(renderIconCard)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
