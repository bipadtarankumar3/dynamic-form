import { DownloadOutlined } from "@ant-design/icons";
import { Button, Drawer, Pagination, Spin, message } from "antd";
import { useEffect, useMemo, useState, useCallback } from "react";
import { privateHttpClient } from "@/services/api/httpClient";
import { useSelector } from "react-redux";

const NgoCardDrawer = ({ open, onClose }) => {
  const filterValues = useSelector((state) => state.dashboardFilterSlice);
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
          name: "tng_created_at",
        },
      ],
      search: {
        value: search || "",
        regex: false,
      },
      columns: [
        { data: "tng_name", name: "tng_name", searchable: "true" },
        { data: "tng_org_type", name: "tng_org_type", searchable: "true" },
        { data: "tng_category", name: "tng_category", searchable: "true" },
        { data: "tng_email", name: "tng_email", searchable: "true" },
        { data: "tng_phone", name: "tng_phone", searchable: "true" },
        { data: "tng_gst_no", name: "tng_gst_no", searchable: "true" },
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

      const res = await privateHttpClient.post("dash/ngo-dt", buildPayload);

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
    <Drawer
      title="NGO/Vendor List"
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
          onClick={handleExcelDownload}
        >
          Download
        </Button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2">NGO/Vendor Name</th>
              <th className="border px-2">Organization Type</th>
              <th className="border px-2">Category</th>
              <th className="border px-2">Email</th>
              <th className="border px-2">Mobile No</th>
              <th className="border px-2">Status</th>
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
                <tr key={row?.tng_id}>
                  <td className="border px-2">{row?.tng_name}</td>
                  <td className="border px-2">{row?.tng_org_type}</td>
                  <td className="border px-2">{row?.tng_category}</td>
                  <td className="border px-2">{row?.tng_email}</td>
                  <td className="border px-2">{row?.tng_phone}</td>
                  <td className="border px-2">
                    {row?.tng_is_active === true ? "Active" : "Inactive"}
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
    </Drawer>
  );
};

export default NgoCardDrawer;
