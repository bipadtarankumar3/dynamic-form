import { Pagination, Spin, message } from "antd";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaMapPin } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { privateHttpClient } from "@/services/api/httpClient";
import { fetcheMonitoringGeojson } from "../../../store/slices/monitoringGeojsonSlice";
const MegaCampDT = ({ type, color_code }) => {
  const filterValues = useSelector((state) => state.dashboardFilterSlice);

  const dispatch = useDispatch();
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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
          name: "thlmcam_id",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        {
          data: "thlmcam_id",
          name: "thlmcam_id",
          searchable: "true",
        },
        {
          data: "tprjct_project_title",
          name: "tprjct_project_title",
          searchable: "true",
        },

        // HLMMU data
        {
          data: "thlmcam_place",
          name: "thlmcam_place",
          searchable: "true",
        },

        // village
        {
          data: "tvill_village_name",
          name: "tvill_village_name",
          searchable: "true",
        },

        // metadata
        {
          data: "name",
          name: "name",
          searchable: "true",
        },
      ],
      filterParams: {
        ...filterValues,
      },
    }),
    [pagination, search, filterValues],
  );

  /* ================= FETCH MMU ORGANIZED ================= */
  const fetchMegaCampList = useCallback(async () => {
    try {
      setLoading(true);

      const res = await privateHttpClient.post(
        "dash/mega-camp-dt",
        buildPayload,
      );

      setRecords(res?.data?.data || []);
      setTotalRecords(res?.data?.recordsTotal || 0);
    } catch (err) {
      message.error("Failed to load Mega Camp list");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (open) fetchMegaCampList();
  }, [fetchMegaCampList, open]);

  /* ================= EXCEL DOWNLOAD ================= */
  const handleExcelDownload = async () => {
    try {
      const response = await privateHttpClient.post(
        "dash/ngo-list-file-download",
        buildPayload,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
        },
      );

      let fileName = "NGO/Venvor List.xlsx";

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
   <div className="monitoring-card-table-section">
      {/* SEARCH + DOWNLOAD */}
       <div className="monitoring-card-table-header">
        <div className="flex justify-between">
          <h4>Total Mega Camp Organized</h4>
          <input
            type="text"
            placeholder="Search..."
            className="border px-2 py-1 rounded w-20"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />

          {/* <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExcelDownload}
        >
          Download
        </Button> */}
        </div>
      </div>
      <div className="monitoring-card-table-body">
          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead style={{ backgroundColor: color_code }}>
                <tr>
                  <th className="border px-2">Map</th>
                  <th className="border px-2">Project Title</th>
                  <th className="border px-2">Village</th>
                  <th className="border px-2">Place</th>
                  <th className="border px-2">Created By</th>
                  <th className="border px-2">Created At</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6">
                      <Spin />
                    </td>
                  </tr>
                ) : records?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6">
                      No records found
                    </td>
                  </tr>
                ) : (
                  records.map((row) => (
                    <tr key={row?.thlmcam_id}>
                      <td className="border px-2">
                        {row?.thlmcam_longitude && row?.thlmcam_latitude && (
                          <FaMapPin
                            className="text-amber-500 cursor-pointer"
                            size={20}
                            onClick={() => {
                              dispatch(
                                fetcheMonitoringGeojson({
                                  type,
                                  monitoring_id: row?.thlmcam_id,
                                }),
                              );
                            }}
                          />
                        )}
                      </td>
                      <td className="border px-2">{row?.tprjct_project_title}</td>
                      <td className="border px-2">{row?.tvill_village_name}</td>
                      <td className="border px-2">{row?.thlmcam_place}</td>
                      <td className="border px-2">{row?.name}</td>

                      <td className="border px-2">
                        {row?.created_at
                          ? moment(row.created_at).format("DD MMM YYYY, hh:mm A")
                          : ""}
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
              current={pagination.page}
              pageSize={pagination.pageSize}
              total={totalRecords}
              onChange={(page, pageSize) => setPagination({ page, pageSize })}
            />
          </div>
      </div>
    </div>
  );
};

export default MegaCampDT;
