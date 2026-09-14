import { EyeOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { Button, DatePicker, message, Pagination, Select, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { privateHttpClient } from "@/services/api/httpClient";
import { hasModulePermissions } from "@/context/PermissionContext";
import AuditDiffModal from "./AuditDiffModal";
import {
  getAllUserAPI,
  getAuditTableNamesAPI,
} from "@/services/audit-service";
import dayjs from "dayjs";
const { RangePicker } = DatePicker;
export default function AuditLogList() {
  const perms = hasModulePermissions("audit");
  const [openCreate, setOpenCreate] = useState(false);
  const [openDiffView, setOpenDiffView] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
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
  const [filters, setFilters] = useState({
    id: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });

  // Debounce search input
  useEffect(() => {
    const delay = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setSearch(searchInput);
    }, 500);

    return () => clearTimeout(delay);
  }, [searchInput]);

  const buildPayload = useMemo(() => {
    return {
      start: (pagination.page - 1) * pagination.pageSize,
      length: pagination.pageSize,
      order: [
        {
          column: 0,
          dir: "desc",
          name: "id",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        {
          data: "id",
          name: "",
          searchable: "false",
          orderable: "false",
          search: { value: "", regex: false },
        },
        {
          data: "schema_name",
          name: "schema_name",
          searchable: "false",
          orderable: "false",
          search: { value: "", regex: false },
        },
        {
          data: "table_name",
          name: "table_name",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "operation",
          name: "operation",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "record_id",
          name: "record_id",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "changed_at",
          name: "changed_at",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "client_ip",
          name: "client_ip",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "client_app",
          name: "client_app",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "changed_by_name",
          name: "changed_by_name",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
      ],
      filterParams: {
        ...filters,
        ...filterData,
      },
    };
  }, [pagination.page, pagination.pageSize, search, filters, filterData]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await privateHttpClient.post("audit/dt", buildPayload);
      const data = response?.data;
      setRecords(data?.data || []);
      setTotalRecords(data?.recordsTotal || 0);
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (perms.includes("list")) {
      fetchData();

      getAuditTableNamesAPI()
        .then((res) => setTableList(res?.data?.data || []))
        .catch(() => {});

      getAllUserAPI()
        .then((res) => setUserList(res?.data?.data || []))
        .catch(() => {});
    }
  }, [fetchData, perms]);

  return (
    <div className="home-content p-3">
      <div className="card pb-3">
        <div className="card-header">
          <h5 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
            Audit Log
          </h5>
          <div className=""></div>
        </div>
        <div className="card-body">
          {perms.includes("list") && (
            <div className="flex gap-2">
              <Select
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase())
                }
                showSearch
                allowClear
                placeholder="Select User"
                style={{ width: "100%" }}
                options={userList}
                value={filterData?.user_id || undefined}
                onChange={(v) =>
                  setFilterData((prev) => ({ ...prev, user_id: v }))
                }
              />
              <Select
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase())
                }
                showSearch
                allowClear
                placeholder="Select Table"
                style={{ width: "100%" }}
                options={tableList}
                value={filterData?.table_name || undefined}
                onChange={(v) =>
                  setFilterData((prev) => ({ ...prev, table_name: v }))
                }
              />
              <Select
                filterOption={(input, option) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase())
                }
                showSearch
                allowClear
                placeholder="Select Operation"
                style={{ width: "100%" }}
                options={[
                  { label: "Insert", value: "INSERT" },
                  { label: "Update", value: "UPDATE" },
                  { label: "Delete", value: "DELETE" },
                ]}
                value={filterData?.operation_type || undefined}
                onChange={(v) =>
                  setFilterData((prev) => ({ ...prev, operation_type: v }))
                }
              />
              <div className="min-w-[250px]">
                <RangePicker
                  allowClear
                  classNames={{ popup: { root: "custom-range-dropdown" } }}
                  format="DD-MM-YYYY"
                  allowEmpty={[true, true]}
                  style={{ width: "100%" }}
                  value={
                    filterData?.date_range
                      ? [
                          filterData?.date_range?.from_date
                            ? dayjs(
                                filterData?.date_range?.from_date,
                                "YYYY-MM-DD",
                              )
                            : null,
                          filterData?.date_range?.to_date
                            ? dayjs(
                                filterData?.date_range?.to_date,
                                "YYYY-MM-DD",
                              )
                            : null,
                        ]
                      : null
                  }
                  onChange={(dates) => {
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
                        date_range: {
                          from_date: null,
                          to_date: null,
                        },
                      }));
                    }
                  }}
                />
              </div>
            </div>
          )}
          {/* TABLE */}
          <div className="overflow-x-auto mt-2">
            {perms.includes("list") ? (
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Schema
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Table
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Operation
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Record ID
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Changed Columns
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Changed By
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Changed At
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Client IP
                    </th>

                    <th className="px-4 py-2 border text-left font-semibold whitespace-nowrap">
                      Client App
                    </th>

                    <th className="px-4 py-2 border text-center font-semibold whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-6">
                        <Spin />
                      </td>
                    </tr>
                  ) : records?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-6 text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    records?.map((rec) => (
                      <tr key={rec?.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2 border">{rec?.schema_name}</td>

                        <td className="px-4 py-2 border">{rec?.table_name}</td>

                        <td className="px-4 py-2 border">
                          <span
                            className={`px-2 py-1 rounded text-white text-xs ${
                              rec?.operation === "INSERT"
                                ? "bg-green-500"
                                : rec?.operation === "UPDATE"
                                  ? "bg-blue-500"
                                  : "bg-red-500"
                            }`}
                          >
                            {rec?.operation}
                          </span>
                        </td>

                        <td className="px-4 py-2 border">{rec?.record_id}</td>

                        <td className="px-4 py-2 border">
                          {rec?.changed_columns?.length ? (
                            <span title={rec.changed_columns.join(", ")}>
                              {rec.changed_columns.slice(0, 2).join(", ")}
                              {rec.changed_columns.length > 2 && "..."}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-2 border">
                          {rec?.changed_by_name || "-"}
                        </td>

                        <td className="px-4 py-2 border">
                          {rec?.changed_at
                            ? moment(rec.changed_at).format("DD-MM-YYYY HH:mm")
                            : "-"}
                        </td>

                        <td className="px-4 py-2 border">
                          {rec?.client_ip || "-"}
                        </td>

                        <td className="px-4 py-2 border">
                          {rec?.client_app || "-"}
                        </td>

                        <td className="px-4 py-2 border text-center">
                          {perms.includes("view") && (
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setSelectedData(rec);
                                setOpenDiffView(true);
                              }}
                            >
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-4 text-danger">
                You don't have permission.
              </div>
            )}
          </div>
          <div className="flex justify-center pt-4">
            <Pagination
              current={pagination.page}
              pageSize={pagination.pageSize}
              total={totalRecords}
              onChange={(page, pageSize) => setPagination({ page, pageSize })}
            />
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {openDiffView && selectedData && (
        <AuditDiffModal
          open={openDiffView}
          onClose={() => setOpenDiffView(false)}
          selectedData={selectedData}
        />
      )}
    </div>
  );
}
