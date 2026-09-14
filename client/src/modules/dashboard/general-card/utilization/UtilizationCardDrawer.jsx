import { DownloadOutlined } from "@ant-design/icons";
import { Button, Collapse, Drawer, message, Pagination, Spin } from "antd";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import { getUtilizationThemeWiseAPI } from "@/services/dashboard-service";
import { useSelector } from "react-redux";

const { Panel } = Collapse;
import { Tabs } from "antd";
import ThemeUtilizationChart from "./ThemeUtilizationChart";
const { TabPane } = Tabs;
const UtilizationCardDrawer = ({ open, onClose }) => {
  const filterValues = useSelector((state) => state.dashboardFilterSlice);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [proposalData, setProposalData] = useState({});
  const [tableLoading, setTableLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  /* ================= FETCH THEMES ================= */
  useEffect(() => {
    if (open) fetchThemes(filterValues);
  }, [open, filterValues]);

  const fetchThemes = async (filterValues) => {
    try {
      setLoading(true);
      const res = await getUtilizationThemeWiseAPI(filterValues);
      setThemes(res?.data?.data || []);
    } catch (err) {
      message.error("Failed to load themes");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DEBOUNCE SEARCH ================= */
  useEffect(() => {
    const delay = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setSearch(searchInput);
    }, 500);

    return () => clearTimeout(delay);
  }, [searchInput]);

  /* ================= PAYLOAD ================= */
  const buildPayload = useMemo(
    () => ({
      start: (pagination.page - 1) * pagination.pageSize,
      length: pagination.pageSize,
      order: [
        {
          column: 0,
          dir: "asc",
          name: "tpan_id",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        {
          data: "tpan_id",
          name: "tpan_id",
          searchable: "false",
          orderable: "false",
          search: { value: "", regex: false },
        },
        {
          data: "tpan_title",
          name: "tpan_title",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpan_status",
          name: "tpan_status",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpan_vendor_name",
          name: "tpan_vendor_name",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpan_vendor_type",
          name: "tpan_vendor_type",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpan_total_payment_required",
          name: "tpan_total_payment_required",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpan_payment_date",
          name: "tpan_payment_date",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tprjct_project_title",
          name: "tprjct_project_title",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
      ],
      filterParams: {
        theme_id: activeTheme,
        ...filterValues,
      },
    }),
    [pagination, activeTheme, search, filterValues],
  );

  /* ================= FETCH PROPOSALS ================= */
  const fetchProposalsByTheme = useCallback(async () => {
    if (!activeTheme) return;

    try {
      setTableLoading(true);

      const res = await privateHttpClient.post(
        "dash/utilization-by-theme-dt",
        buildPayload,
      );

      setProposalData((prev) => ({
        ...prev,
        [activeTheme]: {
          data: res?.data?.data || [],
          total: res?.data?.recordsTotal || 0,
        },
      }));
    } catch (err) {
      message.error("Failed to load utilization");
    } finally {
      setTableLoading(false);
    }
  }, [buildPayload, activeTheme]);

  useEffect(() => {
    fetchProposalsByTheme();
  }, [fetchProposalsByTheme]);

  /* ================= EXCEL DOWNLOAD ================= */
  const handleExcelDownload = async (theme_name) => {
    if (!activeTheme) return;

    try {
      const response = await privateHttpClient.post(
        "dash/utilization-by-theme-file-download",
        buildPayload,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
        },
      );

      let fileName = `${theme_name} Utilization List.xlsx`;

      const contentDisposition = response.headers["content-disposition"];

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error("Failed to download Excel file");
    }
  };

  return (
    <Drawer
      title="Theme Wise Utilization"
      placement="right"
      onClose={onClose}
      open={open}
      width={1000}
      destroyOnHidden
      footer={
        <div style={{ textAlign: "right" }}>
          <Button type="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <Tabs defaultActiveKey="table">
        <TabPane tab="Table View" key="table">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Spin />
            </div>
          ) : (
            <Collapse
              accordion
              onChange={(key) => {
                const selectedKey = Array.isArray(key) ? key[0] : key;

                if (selectedKey) {
                  setActiveTheme(selectedKey);
                  setPagination({ page: 1, pageSize: 5 });
                  setSearchInput("");
                  setSearch("");
                } else {
                  setActiveTheme(null);
                  setPagination({ page: 1, pageSize: 5 });
                  setSearchInput("");
                  setSearch("");
                  setProposalData({});
                }
              }}
            >
              {themes?.length > 0 ? (
                themes?.map((theme) => (
                  <Panel
                    header={`${theme?.tthm_name_of_theme} (₹${Number(
                      theme?.total_amount ?? 0,
                    ).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })})`}
                    key={theme?.tthm_id}
                  >
                    {/* SEARCH + DOWNLOAD */}
                    <div className="flex justify-between mb-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        className="border px-2 py-1 rounded w-40"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />

                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() =>
                          handleExcelDownload(theme?.tthm_name_of_theme)
                        }
                      >
                        Download
                      </Button>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full border text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border px-2">Project Title</th>
                            <th className="border px-2">PAN Title</th>
                            <th className="border px-2">NGO/Vendor Name</th>
                            <th className="border px-2">NGO/Vendor Type</th>
                            <th className="border px-2">Total Payment</th>
                            <th className="border px-2">Date</th>
                            <th className="border px-2">Created By</th>
                            <th className="border px-2">Created At</th>
                            <th className="border px-2">Status</th>
                            <th className="border px-2">Payment Released</th>
                          </tr>
                        </thead>

                        <tbody>
                          {tableLoading ||
                          proposalData?.[theme?.tthm_id]?.data === undefined ? (
                            <tr>
                              <td colSpan={10} className="text-center py-6">
                                <Spin />
                              </td>
                            </tr>
                          ) : proposalData?.[theme?.tthm_id]?.data?.length ===
                            0 ? (
                            <tr>
                              <td colSpan={10} className="text-center py-6">
                                No records found
                              </td>
                            </tr>
                          ) : (
                            proposalData?.[theme?.tthm_id]?.data?.map((row) => (
                              <tr key={row?.tprjct_id}>
                                <td className="border px-2">
                                  {row?.tprjct_project_title || ""}
                                </td>
                                <td className="border px-2">
                                  {row?.tpan_title}
                                </td>
                                <td className="border px-2">
                                  {row?.tpan_vendor_name}
                                </td>
                                <td className="border px-2">
                                  {row?.tpan_vendor_type}
                                </td>
                                <td className="border px-2">
                                  {row?.tpan_total_payment_required}
                                </td>
                                <td className="border px-2">
                                  {row?.tpan_payment_date
                                    ? moment(row?.tpan_payment_date).format(
                                        "DD-MM-YYYY",
                                      )
                                    : ""}
                                </td>
                                <td className="border px-2">
                                  {row?.created_by_name}
                                </td>
                                <td className="border px-2">
                                  {row?.tpan_created_at
                                    ? moment(row?.tpan_created_at).format(
                                        "DD-MM-YYYY",
                                      )
                                    : ""}
                                </td>
                                <td className="border px-2">
                                  {row?.tpan_status || ""}
                                </td>
                                <td className="border px-2">
                                  {row?.payment_release?.tpar_id
                                    ? "Released"
                                    : "Not Released"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION */}
                    <div className="flex justify-center pt-4">
                      <Pagination
                        current={pagination?.page}
                        pageSize={pagination?.pageSize}
                        total={proposalData?.[theme?.tthm_id]?.total || 0}
                        onChange={(page, pageSize) =>
                          setPagination({ page, pageSize })
                        }
                      />
                    </div>
                  </Panel>
                ))
              ) : (
                <div className="flex justify-center items-center h-full">
                  No records found
                </div>
              )}
            </Collapse>
          )}
        </TabPane>
        <TabPane tab="Chart View" key="chart">
          <div style={{ padding: 20 }}>
            <ThemeUtilizationChart data={themes} />
          </div>
        </TabPane>
      </Tabs>
    </Drawer>
  );
};

export default UtilizationCardDrawer;
