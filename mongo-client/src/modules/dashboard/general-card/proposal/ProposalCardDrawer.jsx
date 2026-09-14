import { DownloadOutlined } from "@ant-design/icons";
import { Button, Collapse, Drawer, message, Pagination, Spin } from "antd";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import { getProposalCountThemeWiseAPI } from "@/services/dashboard-service";
import { useSelector } from "react-redux";
import { Tabs } from "antd";
import ThemeStatusRadialChart from "./ThemeStatusRadialChart";
const { Panel } = Collapse;
const { TabPane } = Tabs;
const ProposalCardDrawer = ({ open, onClose }) => {
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
      const res = await getProposalCountThemeWiseAPI(filterValues);
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
          dir: "desc",
          name: "tpro_id",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        { data: "tpro_id", name: "tpro_id" },
        {
          data: "tpro_proposal_title",
          name: "tpro_proposal_title",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpro_timeline_of_project_start_date",
          name: "tpro_timeline_of_project_start_date",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpro_timeline_of_project_end_date",
          name: "tpro_timeline_of_project_end_date",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpro_proposal_fund_req",
          name: "tpro_proposal_fund_req",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpro_created_by",
          name: "tpro_created_by",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "tpro_status",
          name: "tpro_status",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "name",
          name: "name",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "deliverable_count",
          name: "deliverable_count",
          searchable: "false",
          orderable: "false",
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
        "dash/proposal-by-theme-dt",
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
      message.error("Failed to load proposals");
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
        "dash/proposal-by-theme-file-download",
        buildPayload,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
        },
      );

      let fileName = `${theme_name} Proposals List.xlsx`;

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
      title="Theme Wise Proposals"
      placement="right"
      onClose={onClose}
      open={open}
      width={900}
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
                    header={`${theme?.tthm_name_of_theme} (${theme?.total_proposal})`}
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
                            <th className="border px-2">Title</th>
                            <th className="border px-2">Duration</th>
                            <th className="border px-2">Amount</th>
                            <th className="border px-2">Created By</th>
                            <th className="border px-2">No of Deliverables</th>
                            <th className="border px-2">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {tableLoading ||
                          proposalData?.[theme?.tthm_id]?.data === undefined ? (
                            <tr>
                              <td colSpan={5} className="text-center py-6">
                                <Spin />
                              </td>
                            </tr>
                          ) : proposalData?.[theme?.tthm_id]?.data?.length ===
                            0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6">
                                No records found
                              </td>
                            </tr>
                          ) : (
                            proposalData?.[theme?.tthm_id]?.data?.map((row) => (
                              <tr key={row?.tpro_id}>
                                <td className="border px-2">
                                  {row?.tpro_proposal_title || ""}
                                </td>
                                <td className="border px-2">
                                  {row?.tpro_timeline_of_project_start_date &&
                                  row?.tpro_timeline_of_project_end_date
                                    ? moment(
                                        row?.tpro_timeline_of_project_start_date,
                                      ).format("DD-MM-YYYY")
                                    : ""}{" "}
                                  -{" "}
                                  {row?.tpro_timeline_of_project_end_date
                                    ? moment(
                                        row?.tpro_timeline_of_project_end_date,
                                      ).format("DD-MM-YYYY")
                                    : ""}
                                </td>
                                <td className="border px-2">
                                  {row?.tpro_proposal_fund_req
                                    ? row?.tpro_proposal_fund_req?.toLocaleString()
                                    : ""}
                                </td>
                                <td className="border px-2">
                                  {row?.created_by_name || ""}
                                </td>
                                <td className="border px-2">
                                  {row?.deliverable_count || ""}
                                </td>
                                <td className="border px-2">
                                  {row?.tpro_status || ""}
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
        {/* ================= CHART TAB (NEW) ================= */}
        <TabPane tab="Chart View" key="chart">
          <div style={{ padding: 20 }}>
            <ThemeStatusRadialChart data={themes} />
          </div>
        </TabPane>
      </Tabs>
      {/* ================= END TAB VIEW ================= */}
    </Drawer>
  );
};

export default ProposalCardDrawer;
