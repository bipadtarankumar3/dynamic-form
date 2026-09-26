import { Pagination, Spin, message } from "antd";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaMapPin } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { privateHttpClient } from "@/services/api/httpClient";
import { fetcheMonitoringGeojson } from "../../../store/slices/monitoringGeojsonSlice";
const MMUOrganizedDT = ({ type, color_code }) => {
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
          name: "thlmmu_id",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        {
          data: "thlmmu_id",
          name: "thlmmu_id",
          searchable: "true",
        },
        {
          data: "tprjct_project_title",
          name: "tprjct_project_title",
          searchable: "true",
        },

        // HLMMU data
        {
          data: "thlmmu_date",
          name: "thlmmu_date",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_male_patients",
          name: "thlmmu_no_of_male_patients",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_female_patients",
          name: "thlmmu_no_of_female_patients",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_child",
          name: "thlmmu_no_of_child",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_patient_gen_med",
          name: "thlmmu_no_of_patient_gen_med",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_patient_in_ortho",
          name: "thlmmu_no_of_patient_in_ortho",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_patient_in_comm_cold_flu",
          name: "thlmmu_no_of_patient_in_comm_cold_flu",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_patient_in_gyno",
          name: "thlmmu_no_of_patient_in_gyno",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_patient_in_pedeatrics",
          name: "thlmmu_no_of_patient_in_pedeatrics",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_patient_in_referred",
          name: "thlmmu_no_of_patient_in_referred",
          searchable: "true",
        },
        {
          data: "thlmmu_no_of_patient_in_telemedicines",
          name: "thlmmu_no_of_patient_in_telemedicines",
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
  const fetchMMUOrganizedList = useCallback(async () => {
    try {
      setLoading(true);

      const res = await privateHttpClient.post(
        "dash/mmu-organized-dt",
        buildPayload,
      );

      setRecords(res?.data?.data || []);
      setTotalRecords(res?.data?.recordsTotal || 0);
    } catch (err) {
      message.error("Failed to load MMU organized list");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (open) fetchMMUOrganizedList();
  }, [fetchMMUOrganizedList, open]);

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
          <h4>Total MMU Organized</h4>
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
              <th className="border px-2">Date</th>
              <th className="border px-2">Village</th>
              <th className="border px-2">No. of Male Patients</th>
              <th className="border px-2">No. of Female Patients</th>
              <th className="border px-2">No. of Child</th>
              <th className="border px-2">No of Patient in General Medicine</th>
              <th className="border px-2">No of Patient in Ortho</th>
              <th className="border px-2">
                No of Patient in Common Cold & Flu
              </th>
              <th className="border px-2">No of Patient in Gyno</th>
              <th className="border px-2">No of Patient in Pedeatrics</th>
              <th className="border px-2">No of Patient Referred</th>
              <th className="border px-2">
                No of Patient Identified for Telemedicines
              </th>
              <th className="border px-2">Created By</th>
              <th className="border px-2">Created At</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={16} className="text-center py-6">
                  <Spin />
                </td>
              </tr>
            ) : records?.length === 0 ? (
              <tr>
                <td colSpan={16} className="text-center py-6">
                  No records found
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr key={row?.thlmmu_id}>
                  <td className="border px-2">
                    {row?.thlmmu_latitude && row?.thlmmu_longitude && (
                      <FaMapPin
                        className="text-amber-500 cursor-pointer"
                        size={20}
                        onClick={() => {
                          dispatch(
                            fetcheMonitoringGeojson({
                              type,
                              monitoring_id: row?.thlmmu_id,
                            }),
                          );
                        }}
                      />
                    )}
                  </td>
                  <td className="border px-2">{row?.tprjct_project_title}</td>
                  <td className="border px-2">
                    {row?.thlmmu_date
                      ? moment(row?.thlmmu_date).format("DD-MM-YYYY")
                      : ""}
                  </td>
                  <td className="border px-2">{row?.tvill_village_name}</td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_male_patients}
                  </td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_female_patients}
                  </td>
                  <td className="border px-2">{row?.thlmmu_no_of_child}</td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_patient_gen_med}
                  </td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_patient_in_ortho}
                  </td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_patient_in_comm_cold_flu}
                  </td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_patient_in_gyno}
                  </td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_patient_in_pedeatrics}
                  </td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_patient_in_referred}
                  </td>
                  <td className="border px-2">
                    {row?.thlmmu_no_of_patient_in_telemedicines}
                  </td>

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

export default MMUOrganizedDT;
