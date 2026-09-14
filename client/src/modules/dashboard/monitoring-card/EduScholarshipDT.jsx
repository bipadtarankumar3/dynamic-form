import { Pagination, Spin, message } from "antd";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaMapPin } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { privateHttpClient } from "@/services/api/httpClient";
import { fetcheMonitoringGeojson } from "../../../store/slices/monitoringGeojsonSlice";
const EduScholarshipDT = ({ type, title, color_code }) => {
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
          name: "tedusp_id",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        {
          data: "tedusp_id",
          name: "tedusp_id",
          searchable: "true",
        },
        {
          data: "tprjct_project_title",
          name: "tprjct_project_title",
          searchable: "true",
        },
        {
          data: "tedusp_student_name",
          name: "tedusp_student_name",
          searchable: "true",
        },
        {
          data: "tedusp_father_name",
          name: "tedusp_father_name",
          searchable: "true",
        },
        {
          data: "tedusp_contact_no",
          name: "tedusp_contact_no",
          searchable: "true",
        },
        {
          data: "tedusp_aadhar_no",
          name: "tedusp_aadhar_no",
          searchable: "true",
        },
        {
          data: "tedusp_gender",
          name: "tedusp_gender",
          searchable: "true",
        },

        // School hierarchy
        {
          data: "tsch_name_of_school",
          name: "tsch_name_of_school",
          searchable: "true",
        },
        {
          data: "tvill_village_name",
          name: "tvill_village_name",
          searchable: "true",
        },
        {
          data: "tst_state_name",
          name: "tst_state_name",
          searchable: "true",
        },

        // Education details
        {
          data: "tedusp_stream",
          name: "tedusp_stream",
          searchable: "true",
        },
        {
          data: "tedusp_class",
          name: "tedusp_class",
          searchable: "true",
        },
        {
          data: "tedusp_marks_obtained",
          name: "tedusp_marks_obtained",
          searchable: "true",
        },
        {
          data: "tedusp_total_marks",
          name: "tedusp_total_marks",
          searchable: "true",
        },
        {
          data: "tedusp_percentage",
          name: "tedusp_percentage",
          searchable: "true",
        },

        // Scholarship
        {
          data: "tedusp_scholarship_amount",
          name: "tedusp_scholarship_amount",
          searchable: "true",
        },

        // Metadata
        {
          data: "name",
          name: "name",
          searchable: "true",
        },
        {
          data: "created_at",
          name: "created_at",
          searchable: "true",
        },
      ],
      filterParams: {
        ...filterValues,
      },
    }),
    [pagination, search, filterValues],
  );

  /* ================= FETCH NGO ================= */
  const fetchNgoList = useCallback(async () => {
    try {
      setLoading(true);

      const res = await privateHttpClient.post(
        "dash/edu-scholarship-dt",
        buildPayload,
      );

      setRecords(res?.data?.data || []);
      setTotalRecords(res?.data?.recordsTotal || 0);
    } catch (err) {
      message.error("Failed to load NGO list");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (open) fetchNgoList();
  }, [fetchNgoList, open]);

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
          <h4>{title}</h4>
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
                <th className="border px-2">Student Name</th>
                <th className="border px-2">Fathers Name</th>
                <th className="border px-2">Contact No.</th>
                <th className="border px-2">Aadhar No.</th>
                <th className="border px-2">Gender</th>
                <th className="border px-2">School Name</th>
                <th className="border px-2">Village</th>
                <th className="border px-2">State</th>
                <th className="border px-2">Stream</th>
                <th className="border px-2">Class</th>
                <th className="border px-2">Marks Obtained</th>
                <th className="border px-2">Total Marks</th>
                <th className="border px-2">Percentage</th>
                <th className="border px-2">Scholarship Amount</th>
                <th className="border px-2">Created By</th>
                <th className="border px-2">Created At</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={18} className="text-center py-6">
                    <Spin />
                  </td>
                </tr>
              ) : records?.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-6">
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row?.tedusp_id}>
                    <td className="border px-2">
                      {row?.tedusp_scholarship_latitude &&
                        row?.tedusp_scholarship_longitude && (
                          <FaMapPin
                            className="text-amber-500 cursor-pointer"
                            size={20}
                            onClick={() => {
                              dispatch(
                                fetcheMonitoringGeojson({
                                  type,
                                  monitoring_id: row?.tedusp_id,
                                }),
                              );
                            }}
                          />
                        )}
                    </td>
                    <td className="border px-2">{row?.tprjct_project_title}</td>
                    <td className="border px-2">{row?.tedusp_student_name}</td>
                    <td className="border px-2">{row?.tedusp_father_name}</td>
                    <td className="border px-2">{row?.tedusp_contact_no}</td>
                    <td className="border px-2">{row?.tedusp_aadhar_no}</td>
                    <td className="border px-2">{row?.tedusp_gender}</td>

                    <td className="border px-2">{row?.tsch_name_of_school}</td>
                    <td className="border px-2">{row?.tvill_village_name}</td>
                    <td className="border px-2">{row?.tst_state_name}</td>

                    <td className="border px-2">{row?.tedusp_stream}</td>
                    <td className="border px-2">{row?.tedusp_class}</td>
                    <td className="border px-2">
                      {row?.tedusp_marks_obtained}
                    </td>
                    <td className="border px-2">{row?.tedusp_total_marks}</td>
                    <td className="border px-2">{row?.tedusp_percentage}</td>

                    <td className="border px-2">
                      {row?.tedusp_scholarship_amount}
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

export default EduScholarshipDT;
