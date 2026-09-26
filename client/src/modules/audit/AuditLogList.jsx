'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  message,
  Pagination,
  Select,
  Spin,
  Input,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Space,
  Empty,
  Badge,
} from "antd";
import {
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  HistoryOutlined,
  UserOutlined,
  TableOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import moment from "moment";
import dayjs from "dayjs";
import { privateHttpClient } from "@/services/api/httpClient";
import { hasModulePermissions } from "@/context/PermissionContext";
import AuditDiffModal from "./AuditDiffModal";
import { getAllUserAPI, getAuditTableNamesAPI } from "@/services/audit-service";

const { RangePicker } = DatePicker;

export default function AuditLogList() {
  const perms = hasModulePermissions("audit");
  // Default to allowed if permissions array is not strictly configured
  const canList = !perms || perms.length === 0 || perms.includes("list") || perms.includes("view");
  const canView = !perms || perms.length === 0 || perms.includes("view");

  const [openDiffView, setOpenDiffView] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const [filterData, setFilterData] = useState({
    date_range: {
      from_date: null,
      to_date: null,
    },
    user_id: "",
    table_name: "",
    operation_type: "",
  });

  const [tableList, setTableList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15,
  });

  // Debounce search input
  useEffect(() => {
    const delay = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setSearch(searchInput);
    }, 400);

    return () => clearTimeout(delay);
  }, [searchInput]);

  const buildPayload = useMemo(() => {
    return {
      start: (pagination.page - 1) * pagination.pageSize,
      length: pagination.pageSize,
      search: {
        value: search || "",
        regex: false,
      },
      filterParams: {
        ...filterData,
      },
    };
  }, [pagination.page, pagination.pageSize, search, filterData]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await privateHttpClient.post("audit/dt", buildPayload);
      const data = response?.data;
      setRecords(data?.data || []);
      setTotalRecords(data?.recordsTotal || data?.recordsFiltered || 0);
    } catch (error) {
      console.warn("Failed to load audit logs:", error);
      message.error(error?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (canList) {
      fetchData();
    }
  }, [fetchData, canList]);

  useEffect(() => {
    getAuditTableNamesAPI()
      .then((res) => setTableList(res?.data?.data || []))
      .catch(() => {});

    getAllUserAPI()
      .then((res) => setUserList(res?.data?.data || []))
      .catch(() => {});
  }, []);

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterData({
      date_range: { from_date: null, to_date: null },
      user_id: "",
      table_name: "",
      operation_type: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getOperationBadge = (op) => {
    const s = String(op || "").toUpperCase();
    if (s === "INSERT" || s === "CREATE") {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          INSERT
        </span>
      );
    }
    if (s === "UPDATE" || s === "EDIT") {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          UPDATE
        </span>
      );
    }
    if (s === "DELETE") {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          DELETE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
        {s}
      </span>
    );
  };

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(filterData.user_id) ||
    Boolean(filterData.table_name) ||
    Boolean(filterData.operation_type) ||
    Boolean(filterData.date_range.from_date);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-full">
      {/* Top Header Card */}
      <Card
        className="shadow-sm rounded-xl border border-slate-200"
        styles={{ body: { padding: "16px 20px" } }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shadow-sm"
              style={{ background: "var(--primary-gradient, var(--primary-color, #15803d))" }}
            >
              <HistoryOutlined />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 m-0">
                System Audit Trail & Logs
              </h4>
              <p className="text-xs text-slate-500 m-0">
                Complete traceability and chronological history of all record updates, insertions, approvals, and mutations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge count={totalRecords} overflowCount={99999} color="#2563eb" />
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
              className="rounded-lg font-medium"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-center">
          {/* Search Box */}
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search action, ID, IP..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            allowClear
            className="rounded-lg"
          />

          {/* User Select */}
          <Select
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            showSearch
            allowClear
            placeholder="Filter by User"
            options={userList}
            value={filterData?.user_id || undefined}
            onChange={(v) => {
              setPagination((p) => ({ ...p, page: 1 }));
              setFilterData((prev) => ({ ...prev, user_id: v || "" }));
            }}
            className="w-full"
          />

          {/* Form / Table Select */}
          <Select
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
            showSearch
            allowClear
            placeholder="Filter by Form / Table"
            options={tableList}
            value={filterData?.table_name || undefined}
            onChange={(v) => {
              setPagination((p) => ({ ...p, page: 1 }));
              setFilterData((prev) => ({ ...prev, table_name: v || "" }));
            }}
            className="w-full"
          />

          {/* Operation Select */}
          <Select
            allowClear
            placeholder="Filter by Operation"
            options={[
              { label: "INSERT / CREATE", value: "INSERT" },
              { label: "UPDATE / EDIT", value: "UPDATE" },
              { label: "DELETE", value: "DELETE" },
            ]}
            value={filterData?.operation_type || undefined}
            onChange={(v) => {
              setPagination((p) => ({ ...p, page: 1 }));
              setFilterData((prev) => ({ ...prev, operation_type: v || "" }));
            }}
            className="w-full"
          />

          {/* Date Range Picker */}
          <RangePicker
            allowClear
            format="DD-MM-YYYY"
            value={
              filterData?.date_range?.from_date
                ? [
                    dayjs(filterData.date_range.from_date),
                    dayjs(filterData.date_range.to_date || filterData.date_range.from_date),
                  ]
                : null
            }
            onChange={(dates) => {
              setPagination((p) => ({ ...p, page: 1 }));
              if (dates?.[0] && dates?.[1]) {
                setFilterData((prev) => ({
                  ...prev,
                  date_range: {
                    from_date: dates[0].format("YYYY-MM-DD"),
                    to_date: dates[1].format("YYYY-MM-DD"),
                  },
                }));
              } else {
                setFilterData((prev) => ({
                  ...prev,
                  date_range: { from_date: null, to_date: null },
                }));
              }
            }}
            className="w-full rounded-lg"
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Filtered results active</span>
            <Button
              type="link"
              size="small"
              onClick={handleResetFilters}
              className="text-xs p-0 text-blue-600 font-semibold"
            >
              Reset all filters
            </Button>
          </div>
        )}
      </Card>

      {/* Main Table Card */}
      <Card
        className="shadow-sm rounded-xl border border-slate-200 overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Module / Form</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Changes</th>
                <th className="px-4 py-3">Actor / User</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <Spin size="large" />
                    <div className="mt-2 text-xs text-slate-500 font-medium">Loading audit trail...</div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <Empty description="No audit log entries found matching your query." />
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => {
                  const globalIdx = (pagination.page - 1) * pagination.pageSize + idx + 1;
                  return (
                    <tr
                      key={rec.id || idx}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedIndex(idx);
                        setOpenDiffView(true);
                      }}
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{globalIdx}</td>

                      <td className="px-4 py-3">
                        <Tag color="geekblue" className="font-semibold rounded-md border-0 uppercase text-xs">
                          {rec.table_name || rec.module || "Form"}
                        </Tag>
                      </td>

                      <td className="px-4 py-3">
                        {getOperationBadge(rec.operation || rec.action)}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-700 text-xs font-semibold">
                        {rec.record_id || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {rec.changed_columns && rec.changed_columns !== "-" ? (
                          <Tag color="orange" className="rounded-md font-medium text-xs">
                            {rec.changed_columns}
                          </Tag>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <UserOutlined className="text-slate-400 text-xs" />
                          <span>{rec.changed_by || rec.changed_by_name || "System"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {rec.changed_at || rec.created_at
                          ? moment(rec.changed_at || rec.created_at).format("DD MMM YYYY, hh:mm A")
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {rec.ip_address || rec.client_ip || "127.0.0.1"}
                      </td>

                      <td
                        className="px-4 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setSelectedIndex(idx);
                            setOpenDiffView(true);
                          }}
                          className="rounded-md font-semibold text-xs h-7 px-2.5"
                        >
                          View Diff
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Showing{" "}
            <strong>
              {records.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(pagination.page * pagination.pageSize, totalRecords)}
            </strong>{" "}
            of <strong>{totalRecords}</strong> entries
          </div>

          <Pagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={totalRecords}
            showSizeChanger
            pageSizeOptions={["10", "15", "25", "50", "100"]}
            onChange={(page, pageSize) => setPagination({ page, pageSize })}
            size="small"
          />
        </div>
      </Card>

      {/* ENHANCED AUDIT DIFF MODAL WITH PREVIOUS/NEXT RECORD STEPPING */}
      {openDiffView && (
        <AuditDiffModal
          open={openDiffView}
          onClose={() => setOpenDiffView(false)}
          selectedData={records[selectedIndex]}
          records={records}
          currentIndex={selectedIndex}
          onNavigate={(newIdx) => setSelectedIndex(newIdx)}
        />
      )}
    </div>
  );
}
