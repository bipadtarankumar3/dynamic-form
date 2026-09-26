import {
  EditOutlined,
  EllipsisOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Menu } from "antd";
import $ from "jquery";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { toast } from "react-toastify";
import { privateHttpClient } from "@/api/httpClient";
import authUtils from "@/utils/authUtils";
import { getTableShimmer } from "@/utils/common.utils";
import RoleUpsert from "./RoleUpsert";
import { hasModulePermissions } from "@/context/PermissionContext";

const RoleList = () => {
  const perms = hasModulePermissions("role");
  const [dataArray, setDataArray] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toBeFilterData, setToBeFilterData] = useState({
    rol_name: "",
  });
  const [data, setData] = useState({});
  const [isOpenUpsertModal, setIsOpenUpsertModal] = useState(false);

  const handleUpdate = (data) => {
    setData(data);
    setIsOpenUpsertModal(true);
  };

  const downloadExcelFile = async (filters) => {
    try {
      const response = await privateHttpClient.post(
        "rbac/rol/dt-file-dwn",
        filters,
        {
          headers: {
            "Content-Type": "application/json",
          },
          responseType: "blob", // Important for handling file downloads
        },
      );
      let fileName = "Role List.xlsx";
      const contentDisposition = response.headers["Content-Disposition"];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          fileName = match[1]; // Extract filename from response header
        }
      }
      // Create a blob URL for the downloaded file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error?.response?.data?.originalError || error?.response?.data?.message,
      );
    }
  };

  const maxBufferSize = 10;
  const initPlotListDatatable = (my_url) => {
    const authToken = authUtils.getToken();
    return $("#role_list_table").DataTable({
      order: [[1, "asc"]],
      dom:
        "<'d-flex justify-content-between align-items-center mb-2'<'d-flex align-items-center'Bl><'d-flex'f>>" +
        "<'row'<'col-sm-12 plot-list-table-container'tr>>" +
        "<'row mt-2'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7 d-flex justify-content-end'p>>",
      buttons: [
        {
          text: "Download",
          action: function (e, dt, node, config) {
            const tableFilters = dt.ajax.params();
            downloadExcelFile(tableFilters);
          },
        },
      ],
      ajax: {
        url: my_url,
        type: "POST",
        data: function (d) {
          d.filterParams = toBeFilterData; // Add your filter params here
        },
        beforeSend: function (request) {
          setLoading(true);
          setDataArray([]); // Clear data array before each request
          request.setRequestHeader("Authorization", `Bearer ${authToken}`);
        },
        complete: function (response) {
          setLoading(false);
          setDataArray(response.responseJSON.data); // Assuming the paginated data is in `response.responseJSON.data`
        },
        error: function name(error) {
          if (error?.status === 401) {
            authUtils.removeToken();
            navigate("/login");
          }
        },
      },
      paging: true,
      processing: true,
      serverSide: true,
      destroy: true,
      scrollX: true,
      scrollY: "300px",
      scrollCollapse: true,
      fixedHeader: true,
      fixedColumns: {
        leftColumns: 1,
      },
      language: {
        loadingRecords: getTableShimmer(5, 8),
        lengthMenu: "_MENU_",
      },
      initComplete: function (settings) {
        // setPlotListLoader(false); // Ensure loader is hidden after initialization
      },
      columns: [
        {
          data: "id",
          render: function (data, type, full, meta) {
            const page = meta.settings._iDisplayStart;
            const pageLength = meta.settings._iDisplayLength;
            return page + meta.row + 1;
          },
          searchable: false,
          orderable: false,
          className: "overflow-v",
        },
        {
          data: "rol_name",
          name: "rol_name",
          render: function (data) {
            return data && typeof data === "string"
              ? data.replace(
                  /\b\w+/g,
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
                )
              : data;
          },
          searchable: true,
          orderable: true,
          className: "text-center",
        },

        {
          data: "action",
          searchable: false,
          orderable: false,
          defaultContent: "",
        },
      ],
      columnDefs: [
        { width: "40px", targets: [0] },
        { targets: [0, 1], className: "dt-center1" },
        {
          targets: [2],
          createdCell: (td, celldata, rowdata) => {
            ReactDOM.createRoot(td).render(
              <Dropdown
                menu={{
                  items: [
                    perms.includes("edit") && {
                      key: "edit",
                      icon: <EditOutlined />,
                      label: "Edit",
                      onClick: () => handleUpdate(rowdata),
                    },
                  ].filter(Boolean),
                }}
                trigger={["click"]}
              >
                <Button
                  type="text"
                  icon={<EllipsisOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>,
            );
          },
        },
      ],
    });
  };

  useEffect(() => {
    if (perms.includes("list")) {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/rbac/rol/dt`;
      const dataTable = initPlotListDatatable(apiUrl);
      return () => {
        if (dataTable) dataTable.destroy();
      };
    }
  }, []);

  return (
    <div className="home-content p-3">
      <div className="card pb-3">
        <div className="card-header d-flex justify-content-between align-items-center py-2 px-3">
          <h5 className="mb-0">Role List</h5>
          {/* {perms.includes("add") && (
            <Button
              color="cyan"
              shape="circle"
              title="Add Role"
              icon={<PlusOutlined />}
              onClick={() => {
                setIsOpenUpsertModal(true);
              }}
            ></Button>
          )} */}
        </div>
        <div className="initiated-ProjectStage-table-container card-body">
          {perms.includes("list") ? (
            <table
              id="role_list_table"
              className="table table-bordered dataTable text-nowrap"
            >
              <thead>
                <tr>
                  <th>Sl No</th>
                  <th>Role Name</th>
                  <th className="w-10">Action</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          ) : (
            <div className="text-center py-4 text-danger">
              You don't have permission.
            </div>
          )}
        </div>
      </div>
      {isOpenUpsertModal && (
        <RoleUpsert
          visible={isOpenUpsertModal}
          onClose={() => {
            setIsOpenUpsertModal(false);
            setData({});
          }}
          data={data}
        />
      )}
    </div>
  );
};

export default RoleList;
