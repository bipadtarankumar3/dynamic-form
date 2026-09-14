import { privateHttpClient } from "@/api/httpClient";
import { Button, Input, Modal, Pagination, Spin } from "antd";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiFillCheckCircle, AiFillCloseCircle } from "react-icons/ai";
import { toast } from "react-toastify";

import { FaBloggerB } from "react-icons/fa6";
import { publicHttpClient } from "@/services/api/httpClient";
const PublicBlog = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const drawRef = useRef(1);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toogleLoading, setToogleLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    cln_name: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 8,
  });

  const [selectedData, setSelectedData] = useState({});
  //   const [isOpenUpsertModal, setIsOpenUpsertModal] = useState(false);
  const [isOpenAssignModal, setIsOpenAssignModal] = useState(false);

  const handleToggleActive = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };
  //   const handleUpdate = (data) => {
  //     setSelectedData(data);
  //     setIsOpenUpsertModal(true);
  //   };

  const handleAssign = (data) => {
    setSelectedData(data);
    setIsOpenAssignModal(true);
  };

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
      draw: drawRef.current,
      start: (pagination.page - 1) * pagination.pageSize,
      length: pagination.pageSize,
      order: [
        {
          column: 1,
          dir: "asc",
          name: "cln_name",
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
          data: "blg_title",
          name: "blg_title",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "ser_service_name",
          name: "ser_service_name",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
        {
          data: "blg_desc",
          name: "blg_desc",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
      ],
      filterParams: filters,
    };
  }, [pagination.page, pagination.pageSize, search, filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await privateHttpClient.post(
        "/blog/public-dt",
        buildPayload
      );
      const data = response?.data;
      setRecords(data?.data || []);
      setTotalRecords(data?.recordsTotal || 0);
      drawRef.current += 1;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  const handleExcelDownload = async () => {
    try {
      const response = await privateHttpClient.post(
        "blog/dt-file-dwn",
        buildPayload,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
        }
      );

      let fileName = "Blog List.xlsx";
      const contentDisposition = response.headers["Content-Disposition"];
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
      toast.error("Failed to download Excel file");
    }
  };

  const handleActiveInactive = async (selectedItem) => {
    setToogleLoading(true);
    try {
      const res = await privateHttpClient.post("/blog/active-inactive", {
        user_id: selectedItem?.user_id,
        blg_id: selectedItem?.blg_id,
        blg_is_active: selectedItem?.blg_is_active ? false : true,
      });
      fetchData();
      setModalVisible(false);
      toast.success(res?.data?.message);
    } catch (error) {
      toast.error(
        error?.response?.data?.originalError || error?.response?.data?.message
      );
    } finally {
      setToogleLoading(false);
    }
  };

  const handleBlogView = (blg_id) => {
    window.open(
      `${process.env.NEXT_PUBLIC_BASE_URL}/public/blog/view/${blg_id}`,
      "_blank"
    );
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="home-content p-3">
      <div className="card pb-3">
        <div className="card-header d-flex justify-between items-center py-2 px-3">
          <h5 className="mb-0">Your Blog List</h5>
          {/* {perms.includes("add") && (
            <Button
              shape="circle"
              title="Add Blog"
              icon={<PlusOutlined />}
              onClick={() => setIsOpenUpsertModal(true)}
            />
          )} */}
        </div>

        <div className="flex justify-end items-center p-2 gap-2">
          <>
            <Input
              placeholder="Search..."
              className="max-w-xs"
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
            />

            {/* <Button
                icon={<DownloadOutlined />}
                type="primary"
                onClick={handleExcelDownload}
              >
                Download
              </Button> */}
          </>
        </div>

        <>
          {loading ? (
            <div className="flex justify-center items-center h-60">
              <Spin size="large" />
            </div>
          ) : (
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {records?.map((item) => (
                <div
                  key={item?.blg_id}
                  className="bg-yellow-50 border rounded-xl shadow hover:shadow-lg transition p-4 flex flex-col relative h-100"
                >
                  <div className="mt-6 overflow-y-auto">
                    <div className="flex justify-center mb-2">
                      {item?.documents?.[0]?.file_path ? (
                        <img
                          src={item?.documents?.[0]?.file_path}
                          alt={item?.documents?.[0]?.doc_purpose}
                          className="h-50 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="h-[6rem] w-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl border">
                          <FaBloggerB />
                        </div>
                      )}
                    </div>
                    {/* Name - full width, one-line truncate */}
                    <div className="flex">
                      <div className="text-left font-semibold text-sm mb-1 truncate me-3">
                        {moment(item?.blg_created_at).format("D MMMM YYYY")}
                      </div>

                      <div className="text-left font-semibold text-sm mb-1 truncate">
                        {item?.ser_service_name}
                      </div>
                    </div>
                    <hr />
                    <div className="text-left font-semibold text-sm mb-1 truncate flex items-center gap-1">
                      {item?.blg_is_active ? (
                        <AiFillCheckCircle className="text-green-600 text-base" />
                      ) : (
                        <AiFillCloseCircle className="text-red-500 text-base" />
                      )}{" "}
                      {item?.blg_title}
                    </div>
                    <div className="text-left font-semibold text-sm mb-1 text-gray-500 line-clamp-3">
                      {item?.blg_desc}
                    </div>

                    <button
                      onClick={() => handleBlogView(item?.blg_id)}
                      className="bg-yellow-400 hover:bg-yellow-600 text-white py-1 px-4 mt-1 rounded"
                    >
                      Read More...
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      </div>
      <div className="flex justify-center pt-4">
        <Pagination
          current={pagination.page}
          pageSize={pagination.pageSize}
          total={totalRecords}
          onChange={(page, pageSize) => setPagination({ page, pageSize })}
        />
      </div>

      {modalVisible && (
        <Modal
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="confirm"
              type="primary"
              loading={toogleLoading}
              // danger={selectedItem?.is_active}
              onClick={() => handleActiveInactive(selectedItem)}
            >
              {/* {selectedItem?.is_active ? "Deactivate" : "Activate"} */}
              OK
            </Button>,
          ]}
        >
          <p>
            Are you sure you want to{" "}
            <b>{selectedItem?.blg_is_active ? "Deactivate" : "Activate"}</b>{" "}
            this Blog?
          </p>
        </Modal>
      )}
    </div>
  );
};

export default PublicBlog;
