import { privateHttpClient } from "@/api/httpClient";
import {
  Button,
  Image,
  Input,
  Modal,
  Pagination,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import moment from "moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiFillCheckCircle, AiFillCloseCircle } from "react-icons/ai";
import { toast } from "react-toastify";

import { GrGallery } from "react-icons/gr";
import Select from "react-select";
import { publicHttpClient } from "@/services/api/httpClient";
import { MdOndemandVideo } from "react-icons/md";
const { Text } = Typography;
const PublicGallery = () => {
  // const perms = hasModulePermissions("blog");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const drawRef = useRef(1);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toogleLoading, setToogleLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [visibleModalItem, setVisibleModalItem] = useState(null); // store the clicked item
  const [filters, setFilters] = useState({
    cln_name: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 8,
  });

  const [visible, setVisible] = useState(false);
  const [selectedData, setSelectedData] = useState({});
  const [isOpenUpsertModal, setIsOpenUpsertModal] = useState(false);
  const [isOpenAssignModal, setIsOpenAssignModal] = useState(false);
  const typeOptions = [
    { value: "photo", label: "Photo" },
    { value: "video", label: "Video" },
  ];
  const [mediaTypeInput, setMediaTypeInput] = useState(null);
  const [mediaType, setMediaType] = useState(null);

  const handleToggleActive = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };
  const handleUpdate = (data) => {
    setSelectedData(data);
    setIsOpenUpsertModal(true);
  };

  const handleAssign = (data) => {
    setSelectedData(data);
    setIsOpenAssignModal(true);
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setMediaType(mediaTypeInput);
    }, 100);

    return () => clearTimeout(delay);
  }, [mediaTypeInput]);

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
      type: {
        value: mediaType,
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
          data: "glry_title",
          name: "glry_title",
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
          data: "glry_desc",
          name: "glry_desc",
          searchable: "true",
          orderable: "true",
          search: { value: "", regex: false },
        },
      ],
      filterParams: filters,
    };
  }, [pagination.page, pagination.pageSize, search, filters, mediaType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await privateHttpClient.post(
        "/gallery/public-dt",
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
        "gallery/dt-file-dwn",
        buildPayload,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
        }
      );

      let fileName = "Gallery List.xlsx";
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
      const res = await privateHttpClient.post("/gallery/active-inactive", {
        user_id: selectedItem?.user_id,
        glry_id: selectedItem?.glry_id,
        glry_is_active: selectedItem?.glry_is_active ? false : true,
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

  const handleBlogView = (glry_id) => {
    window.open(
      `${process.env.NEXT_PUBLIC_BASE_URL}/gallery/view/${glry_id}`,
      "_blank"
    );
  };

  useEffect(() => {
    // if (perms.includes("list")) {
    fetchData();
    // }
  }, [fetchData]);

  return (
    <div className="home-content p-3">
      <div className="card pb-3">
        <div className="card-header d-flex justify-between items-center py-2 px-3">
          <h5 className="mb-0">Your Gallery List</h5>
          {/* {perms.includes("add") && (
            <Button
              shape="circle"
              title="Add Gallery"
              icon={<PlusOutlined />}
              onClick={() => setIsOpenUpsertModal(true)}
            />
          )} */}
        </div>

        <div className="flex justify-end items-center p-2 gap-2">
          {/* <Row gutter={[12, 12]}> */}
          <>
            <div style={{ width: "200px" }}>
              <Select
                options={typeOptions}
                value={
                  typeOptions.find((opt) => opt.value === mediaTypeInput) ||
                  null
                }
                onChange={(selected) =>
                  setMediaTypeInput(selected?.value || null)
                }
                placeholder="Select media type"
                isClearable
                style={{ width: "100%" }}
              />
            </div>

            {/* <Button
              type="primary"
              onClick={() => {
                setSelectedTypeOption(null);
              }}
            >
              Reset
            </Button> */}
          </>
          {/* </Row> */}

          <>
            <Input
              placeholder="Search..."
              className="max-w-xs"
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
            />
            {/* 
              <Button
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
                  key={item?.glry_id}
                  className="bg-yellow-50 border rounded-xl shadow hover:shadow-lg transition p-4 flex flex-col relative h-100"
                >
                  <div className="mt-6 overflow-y-auto">
                    {/* <div className="flex justify-center mb-2">
                        {item?.documents?.[0]?.file_path ? (<img
                          src={item?.documents?.[0]?.file_path}
                          alt={item?.documents?.[0]?.doc_purpose}
                          className="h-50 object-contain rounded-lg"
                        />
                        ) : (
                          <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl border">
                            <EditOutlined />
                          </div>
                        )}
                      </div> */}

                    {/* <div className="min-w-[80px]">
                        {item?.documents?.[0] && (() => {
                          const firstDoc = item.documents[0];
                          const filePath = firstDoc.file_path;
                          const isVideo = /\.(mp4|webm|ogg)$/i.test(filePath);

                          return isVideo ? (
                            <video
                              width="100%"
                              height="120"
                              controls
                              className="rounded-lg object-contain"
                            >
                              <source src={filePath} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <Image.PreviewGroup>
                              <Image
                                width={200}
                                height={100}
                                src={filePath}
                                preview={{ visible: false }}
                                style={{ objectFit: "cover", borderRadius: 4 }}
                              />
                              {item.documents.map((doc, index) => (
                                <Image
                                  key={index}
                                  src={doc.file_path}
                                  style={{ display: "none" }}
                                />
                              ))}
                            </Image.PreviewGroup>
                          );
                        })()}
                      </div> */}

                    <div className="min-w-[80px]">
                      {item && item?.documents?.[0]?.file_path ? (
                        (() => {
                          const filePath = item?.documents[0].file_path;

                          if (item?.glry_type === "video") {
                            return (
                              <div className="h-[6rem] w-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl border mb-1">
                                <button
                                  onClick={() =>
                                    window.open(filePath, "_blank")
                                  }
                                  className="text-4xl text-gray-600 hover:text-gray-800"
                                >
                                  <MdOndemandVideo />
                                </button>
                              </div>
                            );
                          }

                          if (item?.glry_type === "photo") {
                            return (
                              <>
                                {/* Thumbnail Image */}
                                {/* <Image
                                  width={200}
                                  height={100}
                                  src={filePath}
                                  style={{
                                    objectFit: "cover",
                                    borderRadius: 4,
                                    cursor: "pointer",
                                  }}
                                  preview={false} // disables AntD default preview
                                  onClick={() => setVisible(true)}
                                />

                         
                                <Modal
                                  open={visible}
                                  onCancel={() => setVisible(false)}
                                  footer={null}
                                  centered
                                  width={900}
                                >
                                  <Image
                                    src={filePath}
                                    width="95%"
                                    preview={false} // make sure modal image also has preview disabled
                                    style={{
                                      borderRadius: 8,
                                      marginBottom: 12,
                                    }}
                                  />

                                  <div className="text-left font-semibold text-sm mb-1 truncate me-3">
                                    {moment(item?.glry_created_at).format(
                                      "D MMMM YYYY"
                                    )}
                                  </div>
                                  <div className="text-left font-semibold text-sm mb-1 truncate flex items-center gap-1">
                                    {item?.glry_is_active ? (
                                      <AiFillCheckCircle className="text-green-600 text-base" />
                                    ) : (
                                      <AiFillCloseCircle className="text-red-500 text-base" />
                                    )}{" "}
                                    {item?.glry_title}
                                  </div>
                                </Modal> */}
                                {item?.glry_type === "photo" &&
                                  item?.documents?.[0]?.file_path && (
                                    <>
                                      <Image
                                        width={200}
                                        height={100}
                                        src={item.documents[0].file_path}
                                        style={{
                                          objectFit: "cover",
                                          borderRadius: 4,
                                          cursor: "pointer",
                                        }}
                                        preview={false}
                                        onClick={() =>
                                          setVisibleModalItem(item)
                                        } // store the clicked item
                                      />

                                      <Modal
                                        open={
                                          visibleModalItem?.glry_id ===
                                          item.glry_id
                                        } // show only if this item was clicked
                                        onCancel={() =>
                                          setVisibleModalItem(null)
                                        }
                                        footer={null}
                                        centered
                                        width={900}
                                      >
                                        <Image
                                          src={item.documents[0].file_path}
                                          width="95%"
                                          preview={false}
                                          style={{
                                            borderRadius: 8,
                                            marginBottom: 12,
                                          }}
                                        />

                                        <div className="text-left font-semibold text-sm mb-1 truncate me-3">
                                          {moment(item?.glry_created_at).format(
                                            "D MMMM YYYY"
                                          )}
                                        </div>
                                        <div className="text-left font-semibold text-sm mb-1 truncate flex items-center gap-1">
                                          {item?.glry_is_active ? (
                                            <AiFillCheckCircle className="text-green-600 text-base" />
                                          ) : (
                                            <AiFillCloseCircle className="text-red-500 text-base" />
                                          )}{" "}
                                          {item?.glry_title}
                                        </div>
                                        <div className="text-left font-semibold text-[13px] mb-1 truncate me-3 mt-2">
                                          Author: {item?.doct_name}
                                        </div>
                                        <div className="text-left font-semibold text-[13px] mb-1 me-3 line-clamp-3">
                                          Disclaimer : The content shared
                                          through blogs, photos, and videos on
                                          PRANA is based on the professional
                                          expertise and knowledge of the
                                          respective doctors and therapists.
                                          PRANA does not verify, endorse, or
                                          assume responsibility for the
                                          accuracy, reliability, or
                                          applicability of the information
                                          provided.
                                        </div>
                                      </Modal>
                                    </>
                                  )}
                              </>
                            );
                          }

                          return (
                            <div className="h-[6rem] w-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl border mb-1">
                              <GrGallery />
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-[6rem] w-full bg-gray-200 flex items-center justify-center text-gray-500 text-4xl border mb-1">
                          <GrGallery />
                        </div>
                      )}
                    </div>

                    {/* Name - full width, one-line truncate */}
                    <div className="flex">
                      <div className="text-left font-semibold text-sm mb-1 truncate me-3">
                        {moment(item?.glry_created_at).format("D MMMM YYYY")}
                      </div>

                      <div className="text-left font-semibold text-sm mb-1 truncate">
                        {item?.ser_service_name}
                      </div>
                    </div>
                    <hr />
                    <div className="text-left font-semibold text-sm mb-1 truncate flex items-center gap-1">
                      {item?.glry_is_active ? (
                        <AiFillCheckCircle className="text-green-600 text-base" />
                      ) : (
                        <AiFillCloseCircle className="text-red-500 text-base" />
                      )}{" "}
                      {item?.glry_title}
                    </div>
                    <div className="text-left font-semibold text-sm mb-1 text-gray-500 line-clamp-3">
                      {item?.glry_desc}
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-sm text-gray-800 line-clamp-3">
                        {/* {item?.title} */}
                      </div>
                      <Tooltip title={`Author: ${item?.doct_name}`}>
                        <Text
                          italic
                          ellipsis={{ tooltip: true }} // disables built-in tooltip
                          className="text-sm text-gray-700 max-w-[200px]" // set width to trigger ellipsis
                        >
                          Author: {item?.doct_name}
                        </Text>
                      </Tooltip>
                    </div>

                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-sm text-gray-800 line-clamp-3">
                        {/* {item?.title} */}
                      </div>
                      <Tooltip title="Disclaimer: The content shared through blogs, photos, and videos on PRANA is based on the professional expertise and knowledge of the respective doctors and therapists. PRANA does not verify, endorse, or assume responsibility for the accuracy, reliability, or applicability of the information provided.">
                        <Text
                          italic
                          ellipsis={{ tooltip: true }}
                          className="text-sm text-gray-700 max-w-[250px]" // adjust width
                        >
                          Disclaimer:The content shared through blogs, photos,
                          and videos on PRANA is based on the professional
                          expertise and knowledge of the respective doctors and
                          therapists. PRANA does not verify, endorse, or assume
                          responsibility for the accuracy, reliability, or
                          applicability of the information provided.
                        </Text>
                      </Tooltip>
                    </div>

                    {/* <button
                        onClick={() => handleBlogView(item?.glry_id)}
                        className="bg-yellow-400 hover:bg-yellow-600 text-white py-1 px-4 mt-1 rounded">Read More...</button> */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>

        <div className="flex justify-center pt-4">
          <Pagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={totalRecords}
            onChange={(page, pageSize) => setPagination({ page, pageSize })}
          />
        </div>

        {/* {isOpenUpsertModal && (
          <GalleryUpsert
            visible={isOpenUpsertModal}
            onClose={() => {
              setIsOpenUpsertModal(false);
              setSelectedData({});
            }}
            data={selectedData}
            fetchData={fetchData}
          />
        )} */}
        {/* {isOpenAssignModal && (
          <AssignModal
            visible={isOpenAssignModal}
            onClose={() => {
              setIsOpenAssignModal(false);
              setSelectedData({});
            }}
            data={selectedData}
          />
        )} */}

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
              <b>{selectedItem?.glry_is_active ? "Deactivate" : "Activate"}</b>{" "}
              this Gallery?
            </p>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default PublicGallery;
