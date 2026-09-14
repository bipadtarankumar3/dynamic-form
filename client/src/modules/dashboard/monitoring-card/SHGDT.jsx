import { DownloadOutlined } from "@ant-design/icons";
import { Button, Drawer, Pagination, Spin, message } from "antd";
import { useEffect, useMemo, useState, useCallback } from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import moment from "moment";
import { FaMapPin } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetcheMonitoringGeojson } from "../../../store/slices/monitoringGeojsonSlice";
const SHGDT = ({ type, color_code }) => {
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
          name: "tsdgdet_id",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        {
          data: "tsdgdet_id",
          name: "tsdgdet_id",
          searchable: "true",
        },
        {
          data: "tprjct_project_title",
          name: "tprjct_project_title",
          searchable: "true",
        },

        // HLMMU data
        {
          data: "tsdgdet_shg_name",
          name: "tsdgdet_shg_name",
          searchable: "true",
        },
        {
          data: "tsdgdet_group_date",
          name: "tsdgdet_group_date",
          searchable: "true",
        },
        {
          data: "tsdgdet_shg_cat",
          name: "tsdgdet_shg_cat",
          searchable: "true",
        },
        {
          data: "tsdgdet_sector_of_activity",
          name: "tsdgdet_sector_of_activity",
          searchable: "true",
        },
        {
          data: "tsdgdet_bank_acc_no",
          name: "tsdgdet_bank_acc_no",
          searchable: "true",
        },
        {
          data: "tsdgdet_ifsc",
          name: "tsdgdet_ifsc",
          searchable: "true",
        },

        // village
        {
          data: "tvill_village_name",
          name: "tvill_village_name",
          searchable: "true",
        },
        {
          data: "tblk_block_name",
          name: "tblk_block_name",
          searchable: "true",
        },
        {
          data: "tgramp_gram_panchayat_name",
          name: "tgramp_gram_panchayat_name",
          searchable: "true",
        },
        {
          data: "tdis_district_name",
          name: "tdis_district_name",
          searchable: "true",
        },
        {
          data: "tng_name",
          name: "tng_name",
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

  /* ================= FETCH SHG ================= */
  const fetchSHGList = useCallback(async () => {
    try {
      setLoading(true);

      const res = await privateHttpClient.post("dash/shg-dt", buildPayload);

      setRecords(res?.data?.data || []);
      setTotalRecords(res?.data?.recordsTotal || 0);
    } catch (err) {
      message.error("Failed to load SHG list");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (open) fetchSHGList();
  }, [fetchSHGList, open]);

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
          <h4>Total SHGs Formed</h4>
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
              <th className="border px-2">SHG Name</th>
              <th className="border px-2">Village</th>
              <th className="border px-2">Block</th>
              <th className="border px-2">Panchayat/Ward</th>
              <th className="border px-2">District</th>
              <th className="border px-2">Group Formation Date</th>
              <th className="border px-2">Implementing Partner</th>
              <th className="border px-2">SHG Category</th>
              <th className="border px-2">Sector of Activity</th>
              <th className="border px-2">Bank A/C No.</th>
              <th className="border px-2">IFSC</th>
              <th className="border px-2">Created By</th>
              <th className="border px-2">Created At</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={15} className="text-center py-6">
                  <Spin />
                </td>
              </tr>
            ) : records?.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-6">
                  No records found
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr key={row?.tsdgdet_id}>
                  <td className="border px-2">
                    {row?.tsdgdet_latitude && row?.tsdgdet_longitude && (
                      <FaMapPin
                        className="text-amber-500 cursor-pointer"
                        size={20}
                        onClick={() => {
                          dispatch(
                            fetcheMonitoringGeojson({
                              type,
                              monitoring_id: row?.tsdgdet_id,
                            }),
                          );
                        }}
                      />
                    )}
                  </td>
                  <td className="border px-2">{row?.tprjct_project_title}</td>
                  <td className="border px-2">{row?.tsdgdet_shg_name}</td>
                  <td className="border px-2">{row?.tvill_village_name}</td>
                  <td className="border px-2">{row?.tblk_block_name}</td>
                  <td className="border px-2">
                    {row?.tgramp_gram_panchayat_name}
                  </td>
                  <td className="border px-2">{row?.tdis_district_name}</td>
                  <td className="border px-2">
                    {row?.tsdgdet_group_date
                      ? moment(row?.tsdgdet_group_date).format("DD MMM YYYY")
                      : ""}
                  </td>
                  <td className="border px-2">{row?.tng_name}</td>
                  <td className="border px-2">{row?.tsdgdet_shg_cat}</td>
                  <td className="border px-2">
                    {row?.tsdgdet_sector_of_activity}
                  </td>
                  <td className="border px-2">{row?.tsdgdet_bank_acc_no}</td>
                  <td className="border px-2">{row?.tsdgdet_ifsc}</td>
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

export default SHGDT;
